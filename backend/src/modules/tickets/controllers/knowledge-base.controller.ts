import { Controller, Get, Post, Put, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { KnowledgeBaseService } from '../services/knowledge-base.service';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

class SaveKnowledgeArticleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tags?: string | null;
}

@ApiTags('knowledge-base')
@Controller('knowledge-base')
@UseGuards(JwtAuthGuard, CapabilityGuard)
export class KnowledgeBaseController {
  constructor(private readonly kbService: KnowledgeBaseService) {}

  @Get()
  @RequireCapability('isTicketModuleAccess')
  async getArticles(@Query('q') query?: string) {
    if (query) {
      return this.kbService.searchKnowledgeBase(query);
    }
    return this.kbService.getKnowledgeBaseArticles();
  }

  @Post()
  @RequireCapability('isKnowledgeBaseManage')
  async createArticle(@Body() dto: SaveKnowledgeArticleDto) {
    return this.kbService.createArticle(dto);
  }

  @Post(':id/rate')
  @RequireCapability('isTicketModuleAccess')
  @ApiBody({ schema: { type: 'object', properties: { isHelpful: { type: 'boolean' } }, required: ['isHelpful'] } })
  async rateArticle(@Param('id') id: string, @Body('isHelpful') isHelpful: boolean) {
    return this.kbService.rateArticle(Number(id), isHelpful);
  }

  @Put(':id')
  @RequireCapability('isKnowledgeBaseManage')
  @ApiBody({ schema: { type: 'object', properties: { title: { type: 'string' }, tags: { type: 'string' }, content: { type: 'string' } }, required: ['title', 'content'] } })
  async updateArticle(
    @Param('id') id: string,
    @Body() dto: SaveKnowledgeArticleDto,
  ) {
    return this.kbService.updateArticle(Number(id), dto);
  }
}
