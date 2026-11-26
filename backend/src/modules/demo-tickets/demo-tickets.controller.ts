import {
  Body, Controller, DefaultValuePipe, Delete, ForbiddenException, Get, Header, HttpCode,
  Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, Req, Res, StreamableFile,
  UploadedFile, UploadedFiles, UseGuards, UseInterceptors, BadRequestException, ConflictException, ServiceUnavailableException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ArrayMaxSize, ArrayMinSize, Equals, IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Response } from 'express';
import { UsersHttpClient } from '../../common/http-clients/users.http-client';
import { DemoTicketsService } from './demo-tickets.service';
import { DemoTicketStore } from './demo-ticket-store';
import { DemoActor, demoSupportTypes } from './demo.types';
import { demoRequesterCategories } from './demo-requester-catalog';

class NewDemoTicket {
  @IsString() @MaxLength(255) subject: string;
  @IsString() @MaxLength(12000) description: string;
  @IsIn(demoSupportTypes) supportType: typeof demoSupportTypes[number];
  @IsOptional() @IsString() @MaxLength(40) categoryKey?: string;
}
class NewDemoProxyTicket extends NewDemoTicket {
  @IsUUID() runId: string;
}
class DemoComment { @IsString() @MaxLength(5000) body: string; }
class DemoStatus {
  @IsIn(['in_progress', 'resolved']) status: 'in_progress' | 'resolved';
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
}
class DemoRating {
  @Equals(true, { message: 'Informed consent is required to submit the satisfaction form.' }) consentGiven: true;
  @IsArray() @ArrayMinSize(9) @ArrayMaxSize(9) likert: Array<number | 'NA'>;
}

type Request = { user: (DemoActor & { kind: 'participant' }) | { kind: 'administrator'; userId: number } };

@Controller('demo-tickets')
@UseGuards(AuthGuard('demo-jwt'))
export class DemoTicketsController {
  constructor(private readonly tickets: DemoTicketsService, private readonly store: DemoTicketStore, private readonly users: UsersHttpClient) {}

  private actor(request: Request): DemoActor {
    if (request.user.kind !== 'participant') throw new ForbiddenException('Sign in to a demo account for this action.');
    return request.user;
  }

  private admin(request: Request) {
    if (request.user.kind !== 'administrator') throw new ForbiddenException('Security Settings access is required.');
  }

  @Get('admin/readiness')
  async readiness(@Req() request: Request) {
    this.admin(request);
    try {
      await this.store.rows(this.store.db, 'SELECT id FROM demo_tickets LIMIT 0');
    } catch {
      throw new ServiceUnavailableException('Demo ticket storage is unavailable. Check its database setup.');
    }
    return { ready: true };
  }

  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(@Req() request: Request, @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('status') status?: string, @Query('search') search?: string) {
    if (page < 1 || page > 100000) throw new BadRequestException('Invalid demo ticket page.');
    if (status && !['assigned', 'in_progress', 'resolved', 'closed'].includes(status)) {
      throw new BadRequestException('Invalid demo ticket status.');
    }
    if (search !== undefined && (typeof search !== 'string' || search.length > 255)) {
      throw new BadRequestException('Invalid demo ticket search.');
    }
    return this.tickets.list(page, request.user.kind === 'participant' ? request.user : undefined, { status, search: search?.trim() });
  }

  @Get('dashboard')
  @Header('Cache-Control', 'private, no-store')
  dashboard(@Req() request: Request) {
    return this.tickets.requesterDashboard(this.actor(request));
  }

  @Get('requester-queue')
  @Header('Cache-Control', 'private, no-store')
  requesterQueue(@Req() request: Request, @Query() query: Record<string, unknown>) {
    return this.tickets.requesterQueue(this.actor(request), query);
  }

  @Get('requester-categories')
  requesterCategories(@Req() request: Request) {
    if (this.actor(request).role !== 'user') throw new ForbiddenException();
    return demoRequesterCategories;
  }

  @Post()
  @UseInterceptors(FilesInterceptor('attachments', 5, { limits: { fileSize: 10 * 1024 * 1024 } }))
  create(@Req() request: Request, @Body() body: NewDemoTicket, @UploadedFiles() files?: Express.Multer.File[]) {
    return this.tickets.create(this.actor(request), body, files);
  }

  @Post('admin/proxy')
  async createProxy(@Req() request: Request, @Body() body: NewDemoProxyTicket) {
    this.admin(request);
    const { active } = await this.users.getActiveDemoRun();
    if (!active || active.id !== body.runId) {
      throw new ConflictException('The active demo changed. Refresh Demo Mode and try again.');
    }
    return this.tickets.create({ ...active, userId: request.user.userId }, body);
  }

  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  detail(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.tickets.detail(id, request.user.kind === 'participant' ? request.user : undefined);
  }

  @Post(':id/comments')
  @UseInterceptors(FilesInterceptor('attachments', 5, { limits: { fileSize: 10 * 1024 * 1024 } }))
  comment(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string, @Body() body: DemoComment, @UploadedFiles() files?: Express.Multer.File[]) {
    return this.tickets.comment(this.actor(request), id, body.body, files);
  }

  @Post(':id/requester-close')
  requesterClose(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.tickets.requesterClose(this.actor(request), id);
  }

  @Patch(':id/status')
  status(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string, @Body() body: DemoStatus) {
    return this.tickets.status(this.actor(request), id, body.status, body.notes);
  }

  @Post(':id/rating')
  rate(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string, @Body() body: DemoRating) {
    return this.tickets.rate(this.actor(request), id, body.likert);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0 } }))
  upload(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: Express.Multer.File) {
    return this.tickets.upload(this.actor(request), id, file);
  }

  @Post(':id/attachments/:attachmentId/replacement')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0 } }))
  replaceImage(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string, @UploadedFile() file?: Express.Multer.File) {
    return this.tickets.replaceImage(this.actor(request), id, attachmentId, file);
  }

  @Get(':id/attachments/:attachmentId')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async download(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string, @Res({ passthrough: true }) response: Response) {
    const file = await this.tickets.download(id, attachmentId, request.user.kind === 'participant' ? request.user : undefined);
    response.attachment(file.fileName);
    return new StreamableFile(file.content, { type: file.mimeType });
  }

  @Delete(':id')
  @HttpCode(200)
  delete(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string) {
    this.admin(request);
    return this.tickets.deleteTicket(id);
  }
}
