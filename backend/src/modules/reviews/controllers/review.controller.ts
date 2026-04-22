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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { ReviewService, SubmitReviewDto } from '../services/review.service';

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
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC)
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
  @Roles('focal', 'technician', UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC,
    UserRole.PANTAWID_ICT, UserRole.DESKTOP_SR, UserRole.IT_SUPPORT_SR, UserRole.DESKTOP_JR, UserRole.IT_SUPPORT_JR)
  async getLatestReview(@Param('documentId') documentId: string) {
    return this.reviewService.getLatestReview(documentId);
  }

  /**
   * Get all reviews for a document (history)
   * GET /documents/:documentId/reviews
   */
  @Get()
  @Roles('focal', 'technician', UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC,
    UserRole.PANTAWID_ICT, UserRole.DESKTOP_SR, UserRole.IT_SUPPORT_SR, UserRole.DESKTOP_JR, UserRole.IT_SUPPORT_JR)
  async getReviewHistory(@Param('documentId') documentId: string) {
    return this.reviewService.getReviewHistory(documentId);
  }

  /**
   * Get comprehensive evidence report
   * GET /documents/:documentId/reviews/evidence-report
   */
  @Get('evidence-report')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.CYBERSEC, UserRole.INFOSEC)
  async getEvidenceReport(@Param('documentId') documentId: string) {
    return this.reviewService.getEvidenceReport(documentId);
  }
}
