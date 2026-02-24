import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { MetricsService } from '../services/metrics.service';

interface ComputeMetricsJob {
  versionId: string;
}

@Processor('document-processing')
export class MetricsProcessor {
  private readonly logger = new Logger(MetricsProcessor.name);

  constructor(private metricsService: MetricsService) {}

  @Process('compute-metrics')
  async handleMetricsComputation(job: Job<ComputeMetricsJob>) {
    const { versionId } = job.data;

    this.logger.log(`Computing metrics for version: ${versionId}`);

    try {
      const results = await this.metricsService.computeMetrics(versionId);
      const aggregate = this.metricsService.calculateAggregateScore(results);

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
