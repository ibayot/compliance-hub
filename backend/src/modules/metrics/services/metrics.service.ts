import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricTemplate, MetricType } from '../entities/metric-template.entity';
import { MetricApplicability } from '../entities/metric-applicability.entity';
import { MetricResult, MetricStatus } from '../entities/metric-result.entity';
import { DocumentVersion } from '../../documents/entities/document-version.entity';
import { Document } from '../../documents/entities/document.entity';
import { SectionCheckEngine } from '../engines/section-check.engine';
import { KeywordCheckEngine } from '../engines/keyword-check.engine';
import { PropertyCheckEngine } from '../engines/property-check.engine';
import { DateCheckEngine } from '../engines/date-check.engine';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    @InjectRepository(MetricTemplate)
    private metricTemplateRepo: Repository<MetricTemplate>,
    @InjectRepository(MetricApplicability)
    private applicabilityRepo: Repository<MetricApplicability>,
    @InjectRepository(MetricResult)
    private metricResultRepo: Repository<MetricResult>,
    @InjectRepository(DocumentVersion)
    private versionRepo: Repository<DocumentVersion>,
    @InjectRepository(Document)
    private documentRepo: Repository<Document>,
    private sectionCheckEngine: SectionCheckEngine,
    private keywordCheckEngine: KeywordCheckEngine,
    private propertyCheckEngine: PropertyCheckEngine,
    private dateCheckEngine: DateCheckEngine,
  ) {}

  /**
   * Get applicable metrics for a specific unit and document type
   */
  async getApplicableMetrics(
    unitId: number,
    documentType: string,
  ): Promise<MetricTemplate[]> {
    const qb = this.applicabilityRepo.createQueryBuilder('app')
      .leftJoinAndSelect('app.metric_template', 'template')
      .where('(app.unit_id = :unitId AND app.document_type = :documentType)', { unitId, documentType })
      .orWhere('(app.unit_id = :unitId AND app.document_type IS NULL)', { unitId })
      .orWhere('(app.unit_id IS NULL AND app.document_type = :documentType)', { documentType })
      .orWhere('(app.unit_id IS NULL AND app.document_type IS NULL)');

    const applicabilities = await qb.getMany();

    const templates = applicabilities
      .map((app) => app.metric_template)
      .filter((template) => template.is_active);

    // Remove duplicates
    const uniqueTemplates = Array.from(
      new Map(templates.map((t) => [t.id, t])).values(),
    );

    return uniqueTemplates;
  }

  /**
   * Compute metrics for a document version
   */
  async computeMetrics(versionId: string): Promise<MetricResult[]> {
    this.logger.log(`Computing metrics for version: ${versionId}`);

    // Get version with document
    const version = await this.versionRepo.findOne({
      where: { id: versionId },
      relations: ['document', 'document.unit'],
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    const document = version.document;
    if (!document.extracted_text) {
      throw new Error('Document text has not been extracted yet');
    }

    // Get applicable metrics
    const applicableMetrics = await this.getApplicableMetrics(
      document.unit_id,
      document.document_type,
    );

    this.logger.log(
      `Found ${applicableMetrics.length} applicable metrics for version ${versionId}`,
    );

    // Delete existing results for this version
    await this.metricResultRepo.delete({ version_id: versionId });

    // Compute each metric
    const results: MetricResult[] = [];
    for (const metric of applicableMetrics) {
      try {
        const result = await this.computeSingleMetric(
          version,
          document,
          metric,
        );
        results.push(result);
      } catch (error) {
        this.logger.error(
          `Failed to compute metric ${metric.id}: ${error.message}`,
          error.stack,
        );
        // Create error result
        const errorResult = this.metricResultRepo.create({
          version_id: versionId,
          metric_template_id: metric.id,
          status: MetricStatus.ERROR,
          message: `Error computing metric: ${error.message}`,
          evidence: {},
          score: 0,
        });
        results.push(await this.metricResultRepo.save(errorResult));
      }
    }

    this.logger.log(`Computed ${results.length} metrics for version ${versionId}`);
    return results;
  }

  /**
   * Compute a single metric based on its type
   */
  private async computeSingleMetric(
    version: DocumentVersion,
    document: Document,
    metric: MetricTemplate,
  ): Promise<MetricResult> {
    let result: any;

    switch (metric.metric_type) {
      case MetricType.SECTION_CHECK:
        result = this.sectionCheckEngine.execute(
          document.extracted_text!,
          metric.rule_config as any,
          metric.pass_criteria as any,
        );
        break;

      case MetricType.KEYWORD_CHECK:
        result = this.keywordCheckEngine.execute(
          document.extracted_text!,
          metric.rule_config as any,
          metric.pass_criteria as any,
        );
        break;

      case MetricType.PROPERTY_CHECK:
        const metadata = {
          fileName: version.file_name,
          documentType: document.document_type,
          period: document.period,
          year: document.year,
          title: document.title,
        };
        result = this.propertyCheckEngine.execute(
          metadata,
          document.extracted_text || '',
          metric.rule_config as any,
          metric.pass_criteria as any,
        );
        break;

      case MetricType.DATE_CHECK:
        const submittedDate = new Date(version.created_at);
        const deadlineDate = this.calculateDeadline(
          document.period,
          document.year,
          metric.rule_config as Record<string, any>,
        );
        result = this.dateCheckEngine.execute(
          submittedDate,
          deadlineDate,
          metric.rule_config as any,
          metric.pass_criteria as any,
        );
        break;

      default:
        throw new Error(`Unknown metric type: ${metric.metric_type}`);
    }

    // Save result
    const metricResult = this.metricResultRepo.create({
      version_id: version.id,
      metric_template_id: metric.id,
      status: result.status,
      evidence: result.evidence,
      message: result.message,
      score: result.score,
    });

    return this.metricResultRepo.save(metricResult);
  }

  /**
   * Calculate deadline based on period
   * This is a simplified version - in production you'd have a more sophisticated deadline system
   */
  private calculateDeadline(
    period: string,
    year: string,
    ruleConfig?: Record<string, any>,
  ): Date {
    const yearNum = Number.parseInt(year, 10);
    const safeYear = Number.isFinite(yearNum) ? yearNum : new Date().getFullYear();

    if (ruleConfig?.deadline_date) {
      const configuredDate = new Date(ruleConfig.deadline_date);
      if (!Number.isNaN(configuredDate.getTime())) {
        return configuredDate;
      }
    }

    const deadlineDayRaw = Number(ruleConfig?.deadline_day);
    const deadlineDay = Number.isFinite(deadlineDayRaw)
      ? Math.min(Math.max(Math.floor(deadlineDayRaw), 1), 28)
      : 5;

    const monthOffsetRaw = Number(ruleConfig?.deadline_month_offset);
    const monthOffset = Number.isFinite(monthOffsetRaw)
      ? monthOffsetRaw
      : 1;

    const submissionFrequency =
      (ruleConfig?.submission_frequency as string | undefined)?.toLowerCase() ||
      this.inferSubmissionFrequency(period);

    const parsedPeriod = this.parsePeriod(period, safeYear, submissionFrequency, ruleConfig);
    if (parsedPeriod) {
      return new Date(parsedPeriod.baseYear, parsedPeriod.baseMonthIndex + monthOffset, deadlineDay);
    }

    const quarterMatch = /^Q([1-4])$/i.exec(period.trim());
    if (quarterMatch) {
      const quarter = Number.parseInt(quarterMatch[1], 10);
      const quarterEndMonthIndex = quarter * 3 - 1;
      return new Date(safeYear, quarterEndMonthIndex + monthOffset, deadlineDay);
    }

    const monthlyMatch = /^(\d{4})-(\d{1,2})$/.exec(period.trim());
    if (monthlyMatch) {
      const parsedYear = Number.parseInt(monthlyMatch[1], 10);
      const parsedMonth = Number.parseInt(monthlyMatch[2], 10) - 1;
      return new Date(parsedYear, parsedMonth + monthOffset, deadlineDay);
    }

    return new Date(safeYear + 1, 0, deadlineDay);
  }

  private inferSubmissionFrequency(period: string): string {
    const normalized = period.trim();

    if (/Q[1-4]/i.test(normalized)) {
      return 'quarterly';
    }

    if (/^\d{4}-\d{1,2}$/.test(normalized)) {
      return 'monthly';
    }

    return 'annual';
  }

  private parsePeriod(
    period: string,
    fallbackYear: number,
    submissionFrequency: string,
    ruleConfig?: Record<string, any>,
  ): { baseYear: number; baseMonthIndex: number } | null {
    const normalized = period.trim();

    if (submissionFrequency === 'quarterly') {
      const quarterlyWithYearMatch = /^(\d{4})-?Q([1-4])$/i.exec(normalized);
      if (quarterlyWithYearMatch) {
        const parsedYear = Number.parseInt(quarterlyWithYearMatch[1], 10);
        const quarter = Number.parseInt(quarterlyWithYearMatch[2], 10);
        return {
          baseYear: parsedYear,
          baseMonthIndex: quarter * 3 - 1,
        };
      }

      const quarterMatch = /^Q([1-4])$/i.exec(normalized);
      if (quarterMatch) {
        const quarter = Number.parseInt(quarterMatch[1], 10);
        return {
          baseYear: fallbackYear,
          baseMonthIndex: quarter * 3 - 1,
        };
      }
    }

    if (submissionFrequency === 'monthly') {
      const monthlyWithYearMatch = /^(\d{4})-(\d{1,2})$/.exec(normalized);
      if (monthlyWithYearMatch) {
        const parsedYear = Number.parseInt(monthlyWithYearMatch[1], 10);
        const parsedMonth = Number.parseInt(monthlyWithYearMatch[2], 10) - 1;
        return {
          baseYear: parsedYear,
          baseMonthIndex: Math.min(Math.max(parsedMonth, 0), 11),
        };
      }

      const monthOnlyMatch = /^(\d{1,2})$/.exec(normalized);
      if (monthOnlyMatch) {
        const parsedMonth = Number.parseInt(monthOnlyMatch[1], 10) - 1;
        return {
          baseYear: fallbackYear,
          baseMonthIndex: Math.min(Math.max(parsedMonth, 0), 11),
        };
      }
    }

    if (submissionFrequency === 'annual') {
      const configuredSubmissionMonthRaw = Number(ruleConfig?.submission_month);
      const configuredSubmissionMonth = Number.isFinite(configuredSubmissionMonthRaw)
        ? Math.min(Math.max(Math.floor(configuredSubmissionMonthRaw), 1), 12)
        : 12;

      const yearOnlyMatch = /^(\d{4})$/.exec(normalized);
      if (yearOnlyMatch) {
        const parsedYear = Number.parseInt(yearOnlyMatch[1], 10);
        return {
          baseYear: parsedYear,
          baseMonthIndex: configuredSubmissionMonth - 1,
        };
      }

      return {
        baseYear: fallbackYear,
        baseMonthIndex: configuredSubmissionMonth - 1,
      };
    }

    return null;
  }

  /**
   * Get metric results for a version
   */
  async getMetricResults(versionId: string): Promise<MetricResult[]> {
    return this.metricResultRepo.find({
      where: { version_id: versionId },
      relations: ['metric_template'],
      order: { computed_at: 'DESC' },
    });
  }

  /**
   * Calculate aggregate score from results
   */
  calculateAggregateScore(results: MetricResult[]): {
    total_score: number;
    passed: number;
    failed: number;
    warnings: number;
    errors: number;
  } {
    if (results.length === 0) {
      return { total_score: 0, passed: 0, failed: 0, warnings: 0, errors: 0 };
    }

    let totalWeightedScore = 0;
    let totalWeight = 0;
    let passed = 0;
    let failed = 0;
    let warnings = 0;
    let errors = 0;

    for (const result of results) {
      const weight = result.metric_template?.weight || 1;
      totalWeightedScore += (result.score || 0) * weight;
      totalWeight += weight;

      switch (result.status) {
        case MetricStatus.PASS:
          passed++;
          break;
        case MetricStatus.FAIL:
          failed++;
          break;
        case MetricStatus.WARNING:
          warnings++;
          break;
        case MetricStatus.ERROR:
          errors++;
          break;
      }
    }

    const total_score = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

    return {
      total_score: Math.round(total_score * 100) / 100,
      passed,
      failed,
      warnings,
      errors,
    };
  }
}
