import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { ComparisonService, CompareVersionsDto } from '../services/comparison.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { DocumentActor } from '../../documents/services/document-access';

@ApiTags('reviews')
@Controller('comparisons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComparisonController {
  constructor(private readonly comparisonService: ComparisonService) {}

  /**
   * Compare two document versions
   * POST /comparisons
   */
  @Post()
  @UseGuards(CapabilityGuard)
  @RequireCapability('isReviewsManage')
  @HttpCode(HttpStatus.CREATED)
  async compareVersions(
    @Body() dto: CompareVersionsDto,
    @CurrentUser() actor: DocumentActor,
  ) {
    return this.comparisonService.compareVersions(dto, actor);
  }

  /**
   * Get a comparison by ID
   * GET /comparisons/:id
   */
  @Get(':id')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isReviewsAccess')
  async getComparison(@Param('id') id: string, @CurrentUser() actor: DocumentActor) {
    return this.comparisonService.getComparison(id, actor);
  }

  /**
   * Get all comparisons for a document
   * GET /comparisons/document/:documentId
   */
  @Get('document/:documentId')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isReviewsAccess')
  async getDocumentComparisons(@Param('documentId') documentId: string, @CurrentUser() actor: DocumentActor) {
    return this.comparisonService.getDocumentComparisons(documentId, actor);
  }
}
