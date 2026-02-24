import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { MetricsService } from '../services/metrics.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ManualReview, ReviewDecision } from '../../reviews/entities/manual-review.entity';
import { DocumentVersion } from '../../documents/entities/document-version.entity';
import { IsNull } from 'typeorm';

interface ComputeMetricsJob {
  versionId: string;
}

@Processor('document-processing')
export class MetricsProcessor {
  private readonly logger = new Logger(MetricsProcessor.name);

  constructor(
    private metricsService: MetricsService,
    @InjectRepository(ManualReview)
    private reviewRepo: Repository<ManualReview>,
    @InjectRepository(DocumentVersion)
    private versionRepo: Repository<DocumentVersion>,
  ) {}

  @Process('compute-metrics')
  async handleMetricsComputation(job: Job<ComputeMetricsJob>) {
    const { versionId } = job.data;

    this.logger.log(`Computing metrics for version: ${versionId}`);

    try {
      const results = await this.metricsService.computeMetrics(versionId);
      const aggregate = this.metricsService.calculateAggregateScore(results);

      if (aggregate.failed > 0 || aggregate.errors > 0) {
        const failedResults = results.filter(
          (result) => result.status === 'fail' || result.status === 'error',
        );

        const findings = failedResults.map((result) => ({
          category: result.metric_template?.name || 'Automated Check',
          description: result.message || 'Automated validation failed.',
          severity: 'medium' as const,
        }));

        const version = await this.versionRepo.findOne({
          where: { id: versionId },
          relations: ['document'],
        });

        if (version?.document) {
          const existingAutoReview = await this.reviewRepo.findOne({
            where: {
              document_id: version.document.id,
              version_id: versionId,
              reviewer_id: IsNull(),
            },
          });

          const remarks = failedResults
            .map((result) => `- ${result.message}`)
            .join('\n');

          if (existingAutoReview) {
            existingAutoReview.decision = ReviewDecision.NEEDS_REVISION;
            existingAutoReview.remarks = `Automated checks flagged this submission for revision:\n${remarks}`;
            existingAutoReview.findings = findings;
            await this.reviewRepo.save(existingAutoReview);
          } else {
            const autoReview = this.reviewRepo.create({
              document_id: version.document.id,
              version_id: versionId,
              decision: ReviewDecision.NEEDS_REVISION,
              remarks: `Automated checks flagged this submission for revision:\n${remarks}`,
              findings,
              reviewer_id: null,
            });
            await this.reviewRepo.save(autoReview);
          }
        }
      }

      this.logger.log(
        `Metrics computed for version ${versionId}: Score=${aggregate.total_score}, Passed=${aggregate.passed}, Failed=${aggregate.failed}`,
      );

      return { results, aggregate };
    } catch (error) {
      this.logger.error(
        `Failed to compute metrics for version ${versionId}`,
        error.stack,
      );
      throw error;
    }
  }
}
