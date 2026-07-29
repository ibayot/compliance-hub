import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { ComparisonService, CompareVersionsDto } from '../services/comparison.service';

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
  @RequireCapability('isReviewsAccess')
  @HttpCode(HttpStatus.CREATED)
  async compareVersions(
    @Body() dto: Omit<CompareVersionsDto, 'compared_by_id'>,
    @Request() req: any,
  ) {
    const compareDto: CompareVersionsDto = {
      ...dto,
      compared_by_id: req.user.userId,
    };

    return this.comparisonService.compareVersions(compareDto);
  }

  /**
   * Get a comparison by ID
   * GET /comparisons/:id
   */
  @Get(':id')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isReviewsAccess')
  async getComparison(@Param('id') id: string) {
    return this.comparisonService.getComparison(id);
  }

  /**
   * Get all comparisons for a document
   * GET /comparisons/document/:documentId
   */
  @Get('document/:documentId')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isReviewsAccess')
  async getDocumentComparisons(@Param('documentId') documentId: string) {
    return this.comparisonService.getDocumentComparisons(documentId);
  }
}
