import { Controller, Get, Post, Param, Body, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
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
}
