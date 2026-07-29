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
  Logger,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { ReviewService, SubmitReviewDto } from '../services/review.service';

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
  @RequireCapability('isReviewsAccess')
  @HttpCode(HttpStatus.CREATED)
  async submitReview(
    @Param('documentId') documentId: string,
    @Body() dto: Omit<SubmitReviewDto, 'reviewer_id'>,
    @Request() req: any,
  ) {
    const reviewDto: SubmitReviewDto = {
      ...dto,
      reviewer_id: req.user.id ?? req.user.userId,
    };

    const review = await this.reviewService.submitReview(documentId, reviewDto);
    this.logger.log(
      JSON.stringify({
        action: 'review.submit',
        actorId: req.user?.id ?? req.user?.userId,
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
  async getLatestReview(@Param('documentId') documentId: string) {
    return this.reviewService.getLatestReview(documentId);
  }

  /**
   * Get all reviews for a document (history)
   * GET /documents/:documentId/reviews
   */
  @Get()
  @UseGuards(CapabilityGuard)
  @RequireCapability('isReviewsAccess')
  async getReviewHistory(@Param('documentId') documentId: string) {
    return this.reviewService.getReviewHistory(documentId);
  }

  /**
   * Get comprehensive evidence report
   * GET /documents/:documentId/reviews/evidence-report
   */
  @Get('evidence-report')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isReviewsAccess')
  async getEvidenceReport(@Param('documentId') documentId: string) {
    return this.reviewService.getEvidenceReport(documentId);
  }
}
