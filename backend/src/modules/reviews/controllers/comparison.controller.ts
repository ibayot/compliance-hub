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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { ComparisonService, CompareVersionsDto } from '../services/comparison.service';

@Controller('comparisons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComparisonController {
  constructor(private readonly comparisonService: ComparisonService) {}

  /**
   * Compare two document versions
   * POST /comparisons
   */
  @Post()
  @Roles(UserRole.FOCAL, UserRole.TECHNICIAN, UserRole.REVIEWER, UserRole.AUDITOR, UserRole.SUPER_ADMIN)
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
  @Roles(UserRole.FOCAL, UserRole.TECHNICIAN, UserRole.REVIEWER, UserRole.AUDITOR, UserRole.SUPER_ADMIN)
  async getComparison(@Param('id') id: string) {
    return this.comparisonService.getComparison(id);
  }

  /**
   * Get all comparisons for a document
   * GET /comparisons/document/:documentId
   */
  @Get('document/:documentId')
  @Roles(UserRole.FOCAL, UserRole.TECHNICIAN, UserRole.REVIEWER, UserRole.AUDITOR, UserRole.SUPER_ADMIN)
  async getDocumentComparisons(@Param('documentId') documentId: string) {
    return this.comparisonService.getDocumentComparisons(documentId);
  }
}
