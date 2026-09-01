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
import { ManualReview, ReviewDecision } from '../../reviews/entities/manual-review.entity';
import { IsNull } from 'typeorm';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  private toOperatorSymbol(operator?: string): string {
    switch (operator) {
      case 'gte':
        return '>=';
      case 'lte':
        return '<=';
      case 'gt':
        return '>';
      case 'lt':
        return '<';
      case 'eq':
        return '=';
      default:
        return operator || '=';
    }
  }

  private buildAutoReviewLine(result: MetricResult): string {
    if (result.metric_template?.metric_type !== 'property_check') {
      return result.message || 'Automated validation failed.';
    }

    const checks = Array.isArray(result.evidence?.checks) ? result.evidence.checks : [];

    const failedChecks = checks.filter(
      (check: any) =>
        check?.matches === false && check?.extracted !== null && check?.extracted !== undefined,
    );
    if (failedChecks.length === 0) {
      return result.message || 'Automated validation failed.';
    }

    return failedChecks
      .map(
        (check: any) =>
          `${check.keyword}: ${check.extracted} did not satisfy ${this.toOperatorSymbol(check.comparison)} ${check.expected}`,
      )
      .join('; ');
  }

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
    @InjectRepository(ManualReview)
    private reviewRepo: Repository<ManualReview>,
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
    reportorialDocTypeId?: number | null,
  ): Promise<MetricTemplate[]> {
    const qb = this.applicabilityRepo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.metric_template', 'template')
      // unit+doctype exact match (legacy style)
      .where(
        '(app.unit_id = :unitId AND app.document_type = :documentType AND app.reportorial_doc_type_id IS NULL)',
        { unitId, documentType },
      )
      .orWhere(
        '(app.unit_id = :unitId AND app.document_type IS NULL AND app.reportorial_doc_type_id IS NULL)',
        { unitId },
      )
      .orWhere(
        '(app.unit_id IS NULL AND app.document_type = :documentType AND app.reportorial_doc_type_id IS NULL)',
        { documentType },
      )
      // truly global (all three keys NULL)
      .orWhere(
        '(app.unit_id IS NULL AND app.document_type IS NULL AND app.reportorial_doc_type_id IS NULL)',
      );

    // Reportorial-doc-type specific: only for documents that declare a reportorial_doc_type_id
    if (reportorialDocTypeId) {
      qb.orWhere('app.reportorial_doc_type_id = :reportorialDocTypeId', { reportorialDocTypeId });
    }

    const applicabilities = await qb.getMany();

    const templates = applicabilities
      .map((app) => app.metric_template)
      .filter((template) => template.is_active);

    // Remove duplicates
    const uniqueTemplates = Array.from(new Map(templates.map((t) => [t.id, t])).values());

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
      relations: ['document'],
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    const document = version.document;

    // Get applicable metrics (include reportorial-doc-type-specific ones when present)
    const applicableMetrics = await this.getApplicableMetrics(
      document.unit_id,
      document.document_type,
      document.reportorial_doc_type_id ?? null,
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
        const result = await this.computeSingleMetric(version, document, metric);
        results.push(result);
      } catch (error) {
        this.logger.error('Failed to compute a metric.');
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

  async computeMetricsAndAutoReview(versionId: string): Promise<{
    results: MetricResult[];
    aggregate: ReturnType<MetricsService['calculateAggregateScore']>;
  }> {
    const results = await this.computeMetrics(versionId);
    const aggregate = this.calculateAggregateScore(results);

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
          .map((result) => `• ${this.buildAutoReviewLine(result)}`)
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

    return { results, aggregate };
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
    const extractedText = document.extracted_text || '';

    switch (metric.metric_type) {
      case MetricType.SECTION_CHECK:
        result = this.sectionCheckEngine.execute(
          extractedText,
          metric.rule_config as any,
          metric.pass_criteria as any,
        );
        break;

      case MetricType.KEYWORD_CHECK:
        result = this.keywordCheckEngine.execute(
          extractedText,
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
          extractedText,
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
  private calculateDeadline(period: string, year: string, ruleConfig?: Record<string, any>): Date {
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
    const monthOffset = Number.isFinite(monthOffsetRaw) ? monthOffsetRaw : 1;

    const submissionFrequency =
      (ruleConfig?.submission_frequency as string | undefined)?.toLowerCase() ||
      this.inferSubmissionFrequency(period);

    const parsedPeriod = this.parsePeriod(period, safeYear, submissionFrequency, ruleConfig);
    if (parsedPeriod) {
      return new Date(
        parsedPeriod.baseYear,
        parsedPeriod.baseMonthIndex + monthOffset,
        deadlineDay,
      );
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

    if (/^\d{6}-\d{2}$/.test(normalized)) {
      return 'quarterly';
    }

    if (/^\d{6}$/.test(normalized)) {
      return 'monthly';
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
      const compactQuarterRangeMatch = /^(\d{4})(\d{2})-(\d{2})$/.exec(normalized);
      if (compactQuarterRangeMatch) {
        const parsedYear = Number.parseInt(compactQuarterRangeMatch[1], 10);
        const endMonth = Number.parseInt(compactQuarterRangeMatch[3], 10) - 1;
        return {
          baseYear: parsedYear,
          baseMonthIndex: Math.min(Math.max(endMonth, 0), 11),
        };
      }

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
      const compactMonthlyMatch = /^(\d{4})(\d{2})$/.exec(normalized);
      if (compactMonthlyMatch) {
        const parsedYear = Number.parseInt(compactMonthlyMatch[1], 10);
        const parsedMonth = Number.parseInt(compactMonthlyMatch[2], 10) - 1;
        return {
          baseYear: parsedYear,
          baseMonthIndex: Math.min(Math.max(parsedMonth, 0), 11),
        };
      }

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

    if (submissionFrequency === 'custom') {
      const regexPattern = String(ruleConfig?.custom_period_regex || '').trim();
      const yearGroupRaw = Number(ruleConfig?.custom_period_year_group);
      const monthGroupRaw = Number(ruleConfig?.custom_period_month_group);
      const fallbackMonthRaw = Number(ruleConfig?.custom_period_fallback_month);

      const fallbackMonthIndex = Number.isFinite(fallbackMonthRaw)
        ? Math.min(Math.max(Math.floor(fallbackMonthRaw) - 1, 0), 11)
        : 11;

      if (regexPattern) {
        try {
          const periodRegex = new RegExp(regexPattern);
          const match = normalized.match(periodRegex);
          if (match) {
            const yearGroup = Number.isFinite(yearGroupRaw) ? Math.floor(yearGroupRaw) : 1;
            const monthGroup = Number.isFinite(monthGroupRaw) ? Math.floor(monthGroupRaw) : 2;

            const parsedYear = Number.parseInt(match[yearGroup] || String(fallbackYear), 10);
            const parsedMonth =
              Number.parseInt(match[monthGroup] || String(fallbackMonthIndex + 1), 10) - 1;

            return {
              baseYear: Number.isFinite(parsedYear) ? parsedYear : fallbackYear,
              baseMonthIndex: Math.min(Math.max(parsedMonth, 0), 11),
            };
          }
        } catch {
          // Ignore invalid regex and continue to fallback behavior
        }
      }

      return {
        baseYear: fallbackYear,
        baseMonthIndex: fallbackMonthIndex,
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
