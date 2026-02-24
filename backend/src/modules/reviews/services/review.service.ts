import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ManualReview, ReviewDecision } from '../entities/manual-review.entity';
import { Document } from '../../documents/entities/document.entity';
import { DocumentVersion } from '../../documents/entities/document-version.entity';
import { MetricsService } from '../../metrics/services/metrics.service';

export interface SubmitReviewDto {
  decision: ReviewDecision;
  remarks?: string;
  findings?: Array<{
    category: string;
    description: string;
    severity?: 'low' | 'medium' | 'high';
  }>;
  reviewer_id: number;
}

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    @InjectRepository(ManualReview)
    private reviewRepo: Repository<ManualReview>,
    @InjectRepository(Document)
    private documentRepo: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private versionRepo: Repository<DocumentVersion>,
    private metricsService: MetricsService,
  ) {}

  /**
   * Submit a manual review for a document
   */
  async submitReview(
    documentId: string,
    dto: SubmitReviewDto,
  ): Promise<ManualReview> {
    // Get document with current version
    const document = await this.documentRepo.findOne({
      where: { id: documentId, is_deleted: false },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Get the current version
    const version = await this.versionRepo.findOne({
      where: {
        document_id: documentId,
        version_number: document.current_version,
      },
    });

    if (!version) {
      throw new NotFoundException('Current version not found');
    }

    // Create review
    const review = this.reviewRepo.create({
      document_id: documentId,
      version_id: version.id,
      decision: dto.decision,
      remarks: dto.remarks,
      findings: dto.findings,
      reviewer_id: dto.reviewer_id,
    });

    await this.reviewRepo.save(review);

    this.logger.log(
      `Review submitted for document ${documentId}: ${dto.decision}`,
    );

    return review;
  }

  /**
   * Get the latest review for a document
   */
  async getLatestReview(documentId: string): Promise<ManualReview | null> {
    const review = await this.reviewRepo.findOne({
      where: { document_id: documentId },
      relations: ['reviewer', 'version'],
      order: { reviewed_at: 'DESC' },
    });

    return review;
  }

  /**
   * Get all reviews for a document
   */
  async getReviewHistory(documentId: string): Promise<ManualReview[]> {
    return this.reviewRepo.find({
      where: { document_id: documentId },
      relations: ['reviewer', 'version'],
      order: { reviewed_at: 'DESC' },
    });
  }

  /**
   * Get comprehensive evidence report data
   */
  async getEvidenceReport(documentId: string): Promise<{
    document: Document;
    version: DocumentVersion;
    metrics: any;
    review: ManualReview | null;
  }> {
    // Get document
    const document = await this.documentRepo.findOne({
      where: { id: documentId, is_deleted: false },
      relations: ['unit', 'uploader'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Get current version
    const version = await this.versionRepo.findOne({
      where: {
        document_id: documentId,
        version_number: document.current_version,
      },
      relations: ['uploader'],
    });

    if (!version) {
      throw new NotFoundException('Current version not found');
    }

    // Get metrics
    const metricResults = await this.metricsService.getMetricResults(
      version.id,
    );
    const aggregate = this.metricsService.calculateAggregateScore(metricResults);

    // Get latest review
    const review = await this.getLatestReview(documentId);

    return {
      document,
      version,
      metrics: {
        results: metricResults,
        aggregate,
      },
      review,
    };
  }
}
