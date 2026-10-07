import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Request,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CapabilityGuard } from '../../common/guards/capability.guard';
import { RequireCapability } from '../../common/decorators/require-capability.decorator';

@ApiTags('users')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@CurrentUser() user: any, @Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/attachments')
  @UseInterceptors(FilesInterceptor('files', 5, { limits: { fileSize: 5 * 1024 * 1024 } }))
  addAttachments(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.feedbackService.addAttachments(id, user.id, files);
  }

  @UseGuards(JwtAuthGuard)
  @Get('attachments/:attachmentId/view')
  async viewAttachment(
    @Param('attachmentId') attachmentId: string,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.feedbackService.getAttachment(
      attachmentId,
      req.user?.id ?? req.user?.userId,
      req.user?.role,
    );
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      'Content-Length': file.buffer.length,
      'Cache-Control': 'private, max-age=300',
    });
    return new StreamableFile(file.buffer);
  }

  @UseGuards(JwtAuthGuard, CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Get()
  async findAll(
    @Query('status') status?: 'all' | 'pending' | 'accepted' | 'rejected',
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.feedbackService.findAll(status, page, limit);
  }

  @UseGuards(JwtAuthGuard, CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: UpdateFeedbackStatusDto,
  ) {
    return this.feedbackService.updateStatus(id, user.id, dto);
  }
}
