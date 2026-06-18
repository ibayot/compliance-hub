import { Controller, Get, Post, Put, Param, Body, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { KnowledgeBaseService } from '../services/knowledge-base.service';

@Controller('knowledge-base')
@UseGuards(JwtAuthGuard)
export class KnowledgeBaseController {
  constructor(private readonly kbService: KnowledgeBaseService) {}

  @Get()
  async getArticles(@Query('q') query?: string) {
    if (query) {
      return this.kbService.searchKnowledgeBase(query);
    }
    return this.kbService.getKnowledgeBaseArticles();
  }

  @Post(':id/rate')
  async rateArticle(@Param('id') id: string, @Body('isHelpful') isHelpful: boolean) {
    return this.kbService.rateArticle(Number(id), isHelpful);
  }

  @Put(':id')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isTicketSettingsFocal')
  async updateArticle(
    @Param('id') id: string,
    @Body() dto: { title: string; tags: string; content: string },
  ) {
    return this.kbService.updateArticle(Number(id), dto);
  }
}
