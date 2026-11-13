import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ManualReview, ReviewDecision } from '../entities/manual-review.entity';
import { Document, DocumentStatus } from '../../documents/entities/document.entity';
import { DocumentVersion } from '../../documents/entities/document-version.entity';
import { MetricsService } from '../../metrics/services/metrics.service';
import { DocumentActor, isDocumentInScope } from '../../documents/services/document-access';
import { RoleCapabilitiesService } from '../../users/role-capabilities.service';

export interface SubmitReviewDto {
  decision: ReviewDecision;
  expectedVersionNumber?: number;
  remarks?: string | null;
  findings?: Array<{
    category: string;
    description: string;
    severity?: 'low' | 'medium' | 'high';
  }>;
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
    private readonly capabilities: RoleCapabilitiesService,
  ) {}

  private async getVisibleDocument(documentId: string, actor: DocumentActor): Promise<Document> {
    const document = await this.documentRepo.findOneBy({ id: documentId });
    if (!document || !isDocumentInScope(document, actor, this.capabilities.isFocal(actor.role))) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  /**
   * Submit a manual review for a document
   */
  async submitReview(documentId: string, dto: SubmitReviewDto, actor: DocumentActor): Promise<ManualReview> {
    if (!dto || !Object.values(ReviewDecision).includes(dto.decision)) {
      throw new BadRequestException('Select a valid review decision.');
    }
    if (dto.expectedVersionNumber !== undefined &&
        (!Number.isSafeInteger(dto.expectedVersionNumber) || dto.expectedVersionNumber < 1)) {
      throw new BadRequestException('Select a valid document version.');
    }
    if (dto.remarks != null && typeof dto.remarks !== 'string') {
      throw new BadRequestException('Review remarks must be text.');
    }
    const returning = dto.decision === ReviewDecision.NEEDS_REVISION || dto.decision === ReviewDecision.NON_COMPLIANT;
    if (returning && !dto.remarks?.trim()) {
      throw new BadRequestException(
        'Remarks are required when returning or marking a document as non-compliant.',
      );
    }

    const review = await this.documentRepo.manager.transaction(async (manager) => {
      const documents = manager.getRepository(Document);
      const document = await documents.findOne({
        where: { id: documentId, is_deleted: false },
        lock: { mode: 'pessimistic_write' },
      });
      if (!document || !isDocumentInScope(document, actor, this.capabilities.isFocal(actor.role))) {
        throw new NotFoundException('Document not found');
      }
      if (dto.expectedVersionNumber !== undefined && dto.expectedVersionNumber !== document.current_version) {
        throw new ConflictException('The document version changed. Reopen the document before reviewing it.');
      }
      if (returning && ![DocumentStatus.PENDING, DocumentStatus.READY].includes(document.status)) {
        throw new BadRequestException(
          'Only processed documents that are ready or pending review can be returned for revision.',
        );
      }

      const version = await manager.getRepository(DocumentVersion).findOne({
        where: { document_id: documentId, version_number: document.current_version },
      });
      if (!version) throw new NotFoundException('Current version not found');

      const reviews = manager.getRepository(ManualReview);
      const saved = await reviews.save(reviews.create({
        document_id: documentId,
        version_id: version.id,
        decision: dto.decision,
        remarks: dto.remarks ?? undefined,
        findings: dto.findings,
        reviewer_id: actor.id,
      }));
      await documents.update(documentId, { status: returning ? DocumentStatus.PENDING : DocumentStatus.READY });
      return saved;
    });

    this.logger.log(`Review submitted for document ${documentId}: ${dto.decision}`);

    return review;
  }

  /**
   * Get the latest review for a document
   */
  async getLatestReview(documentId: string, actor: DocumentActor): Promise<ManualReview | null> {
    const document = await this.getVisibleDocument(documentId, actor);
    return this.reviewRepo.findOne({
      where: { document_id: document.id, version: { document_id: document.id, version_number: document.current_version } },
      relations: ['version'],
      order: { reviewed_at: 'DESC', id: 'DESC' },
    });
  }

  /**
   * Get all reviews for a document
   */
  async getReviewHistory(documentId: string, actor: DocumentActor): Promise<ManualReview[]> {
    const document = await this.getVisibleDocument(documentId, actor);
    return this.reviewRepo.find({
      where: { document_id: document.id, version: { document_id: document.id } },
      relations: ['version'],
      order: { reviewed_at: 'DESC' },
    });
  }

  /**
   * Get comprehensive evidence report data
   */
  async getEvidenceReport(documentId: string, actor: DocumentActor): Promise<{
    document: Document;
    version: DocumentVersion;
    metrics: any;
    review: ManualReview | null;
  }> {
    // Get document
    const document = await this.getVisibleDocument(documentId, actor);

    // Get current version
    const version = await this.versionRepo.findOne({
      where: {
        document_id: documentId,
        version_number: document.current_version,
      },
    });

    if (!version) {
      throw new NotFoundException('Current version not found');
    }

    // Get metrics
    const metricResults = await this.metricsService.getMetricResults(version.id);
    const aggregate = this.metricsService.calculateAggregateScore(metricResults);

    // Get latest review
    const review = await this.reviewRepo.findOne({
      where: { document_id: documentId, version_id: version.id },
      order: { reviewed_at: 'DESC', id: 'DESC' },
    });

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
