import { Controller, Get, Post, Put, Patch, Param, Body, UseGuards, Query, ParseIntPipe, ParseBoolPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { KnowledgeBaseService } from '../services/knowledge-base.service';
import { IsBoolean, IsHash, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RateKnowledgeArticleDto {
  @IsBoolean()
  isHelpful: boolean;
}

class SetKnowledgeArticleStatusDto {
  @IsBoolean()
  isEnabled: boolean;
}

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

class DraftVersionDto {
  @IsHash('sha256')
  draftVersion: string;
}

class EditKnowledgeArticleDto extends SaveKnowledgeArticleDto {
  @IsOptional()
  @IsHash('sha256')
  draftVersion?: string;
}

@ApiTags('knowledge-base')
@Controller('knowledge-base')
@UseGuards(JwtAuthGuard, CapabilityGuard)
export class KnowledgeBaseController {
  constructor(private readonly kbService: KnowledgeBaseService) {}

  @Get()
  @RequireCapability(['isTicketModuleAccess', 'isKnowledgeBaseManage'])
  async getArticles(@Query('q') query?: string) {
    const articles = query ? await this.kbService.searchKnowledgeBase(query) : await this.kbService.getKnowledgeBaseArticles();
    return articles.map((article) => this.kbService.presentArticle(article));
  }

  @Get('manage')
  @RequireCapability('isKnowledgeBaseManage')
  async getManagedArticles(
    @Query('enabled', new DefaultValuePipe(true), ParseBoolPipe) enabled: boolean,
    @Query('q') query?: string,
    @Query('drafts', new DefaultValuePipe(false), ParseBoolPipe) drafts = false,
  ) {
    const articles = await this.kbService.getManagedArticles(enabled, query, drafts);
    return articles.map((article) => this.kbService.presentArticle(article, drafts));
  }

  @Post()
  @RequireCapability('isKnowledgeBaseManage')
  async createArticle(@Body() dto: SaveKnowledgeArticleDto) {
    return this.kbService.presentArticle(await this.kbService.createArticle(dto));
  }

  @Post(':id/rate')
  @RequireCapability(['isTicketModuleAccess', 'isKnowledgeBaseManage'])
  @ApiBody({ schema: { type: 'object', properties: { isHelpful: { type: 'boolean' } }, required: ['isHelpful'] } })
  async rateArticle(@Param('id', ParseIntPipe) id: number, @Body() dto: RateKnowledgeArticleDto) {
    return this.kbService.presentArticle(await this.kbService.rateArticle(id, dto.isHelpful));
  }

  @Put(':id')
  @RequireCapability('isKnowledgeBaseManage')
  async updateArticle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditKnowledgeArticleDto,
  ) {
    return this.kbService.presentArticle(await this.kbService.updateArticle(id, dto, dto.draftVersion), true);
  }

  @Patch(':id/publish')
  @RequireCapability('isKnowledgeBaseManage')
  async publishArticle(@Param('id', ParseIntPipe) id: number, @Body() dto: DraftVersionDto) {
    return this.kbService.presentArticle(await this.kbService.publishDraft(id, dto.draftVersion));
  }

  @Patch(':id/status')
  @RequireCapability('isKnowledgeBaseManage')
  async setArticleStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: SetKnowledgeArticleStatusDto) {
    return this.kbService.presentArticle(await this.kbService.setArticleStatus(id, dto.isEnabled));
  }
}
