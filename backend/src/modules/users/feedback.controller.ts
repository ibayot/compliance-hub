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
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CapabilityGuard } from '../../common/guards/capability.guard';
import { RequireCapability } from '../../common/decorators/require-capability.decorator';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@CurrentUser() user: any, @Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(user.id, dto);
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
