import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { ReviewService, SubmitReviewDto } from '../services/review.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { DocumentActor } from '../../documents/services/document-access';

@ApiTags('reviews')
@Controller('documents/:documentId/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewController {
  private readonly logger = new Logger(ReviewController.name);

  constructor(private readonly reviewService: ReviewService) {}

  /**
   * Submit a manual review for a document
   * POST /documents/:documentId/reviews
   */
  @Post()
  @UseGuards(CapabilityGuard)
  @RequireCapability('isReviewsManage')
  @HttpCode(HttpStatus.CREATED)
  async submitReview(
    @Param('documentId') documentId: string,
    @Body() dto: SubmitReviewDto,
    @CurrentUser() actor: DocumentActor,
  ) {
    const review = await this.reviewService.submitReview(documentId, dto, actor);
    this.logger.log(
      JSON.stringify({
        action: 'review.submit',
        actorId: actor.id,
        documentId,
        reviewId: review.id,
        decision: review.decision,
      }),
    );

    return review;
  }

  /**
   * Get the latest review for a document
   * GET /documents/:documentId/reviews/latest
   */
  @Get('latest')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isReviewsAccess')
  async getLatestReview(@Param('documentId') documentId: string, @CurrentUser() actor: DocumentActor) {
    return this.reviewService.getLatestReview(documentId, actor);
  }

  /**
   * Get all reviews for a document (history)
   * GET /documents/:documentId/reviews
   */
  @Get()
  @UseGuards(CapabilityGuard)
  @RequireCapability('isReviewsAccess')
  async getReviewHistory(@Param('documentId') documentId: string, @CurrentUser() actor: DocumentActor) {
    return this.reviewService.getReviewHistory(documentId, actor);
  }

  /**
   * Get comprehensive evidence report
   * GET /documents/:documentId/reviews/evidence-report
   */
  @Get('evidence-report')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isReviewsAccess')
  async getEvidenceReport(@Param('documentId') documentId: string, @CurrentUser() actor: DocumentActor) {
    return this.reviewService.getEvidenceReport(documentId, actor);
  }
}
