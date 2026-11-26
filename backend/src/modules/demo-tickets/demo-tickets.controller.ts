import {
  Body, Controller, DefaultValuePipe, Delete, ForbiddenException, Get, Header, HttpCode,
  Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, Req, Res, StreamableFile,
  UploadedFile, UseGuards, UseInterceptors, BadRequestException, ServiceUnavailableException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Response } from 'express';
import { DemoTicketsService } from './demo-tickets.service';
import { DemoTicketStore } from './demo-ticket-store';
import { DemoActor, demoSupportTypes } from './demo.types';

class NewDemoTicket {
  @IsString() @MaxLength(255) subject: string;
  @IsString() @MaxLength(12000) description: string;
  @IsIn(demoSupportTypes) supportType: typeof demoSupportTypes[number];
}
class DemoComment { @IsString() @MaxLength(5000) body: string; }
class DemoStatus {
  @IsIn(['in_progress', 'resolved']) status: 'in_progress' | 'resolved';
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
}
class DemoRating {
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsOptional() @IsString() @MaxLength(4000) feedback?: string;
}

type Request = { user: (DemoActor & { kind: 'participant' }) | { kind: 'administrator'; userId: number } };

@Controller('demo-tickets')
@UseGuards(AuthGuard('demo-jwt'))
export class DemoTicketsController {
  constructor(private readonly tickets: DemoTicketsService, private readonly store: DemoTicketStore) {}

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
  list(@Req() request: Request, @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number) {
    if (page < 1 || page > 100000) throw new BadRequestException('Invalid demo ticket page.');
    return this.tickets.list(page, request.user.kind === 'participant' ? request.user : undefined);
  }

  @Post()
  create(@Req() request: Request, @Body() body: NewDemoTicket) {
    return this.tickets.create(this.actor(request), body);
  }

  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  detail(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.tickets.detail(id, this.actor(request));
  }

  @Post(':id/comments')
  comment(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string, @Body() body: DemoComment) {
    return this.tickets.comment(this.actor(request), id, body.body);
  }

  @Patch(':id/status')
  status(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string, @Body() body: DemoStatus) {
    return this.tickets.status(this.actor(request), id, body.status, body.notes);
  }

  @Post(':id/rating')
  rate(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string, @Body() body: DemoRating) {
    return this.tickets.rate(this.actor(request), id, body.rating, body.feedback);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0 } }))
  upload(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: Express.Multer.File) {
    return this.tickets.upload(this.actor(request), id, file);
  }

  @Get(':id/attachments/:attachmentId')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async download(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string, @Res({ passthrough: true }) response: Response) {
    const file = await this.tickets.download(this.actor(request), id, attachmentId);
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
