import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { MetricsService } from '../services/metrics.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricTemplate } from '../entities/metric-template.entity';
import { MetricApplicability } from '../entities/metric-applicability.entity';
import { Document } from '../../documents/entities/document.entity';
import { DocumentVersion } from '../../documents/entities/document-version.entity';

@ApiTags('metrics')
@Controller('metrics')
@UseGuards(JwtAuthGuard, RolesGuard, CapabilityGuard)
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  constructor(
    private metricsService: MetricsService,
    @InjectRepository(MetricTemplate)
    private metricTemplateRepo: Repository<MetricTemplate>,
    @InjectRepository(MetricApplicability)
    private applicabilityRepo: Repository<MetricApplicability>,
  ) {}

  /**
   * Get all metric templates
   * GET /metrics
   */
  @Get()
  @RequireCapability('isMetricsAccess')
  async listMetricTemplates() {
    return this.metricTemplateRepo.find({
      relations: ['applicability'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Create metric template
   * POST /metrics
   */
  @Post()
  @RequireCapability('isMetricsManage')
  async createMetricTemplate(
    @Body()
    body: {
      name: string;
      description?: string;
      metric_type: string;
      rule_config: Record<string, any>;
      pass_criteria: Record<string, any>;
      weight?: number;
      applicability: Array<{
        unit_id?: number;
        document_type?: string;
      }>;
    },
    @Request() req: any,
  ) {
    const { applicability, ...templateData } = body;

    // Create template
    const template = this.metricTemplateRepo.create({
      ...templateData,
      metric_type: templateData.metric_type as any,
    });
    await this.metricTemplateRepo.save(template);

    // Create applicability rules
    if (applicability && applicability.length > 0) {
      for (const app of applicability) {
        // Convert unit_id to number if present
        const appData = {
          metric_id: template.id,
          unit_id: app.unit_id ? Number(app.unit_id) : undefined,
          document_type: app.document_type,
          reportorial_doc_type_id: (app as any).reportorial_doc_type_id
            ? Number((app as any).reportorial_doc_type_id)
            : undefined,
        };
        const appEntity = this.applicabilityRepo.create(appData);
        await this.applicabilityRepo.save(appEntity);
      }
    }

    this.logger.log(
      JSON.stringify({
        action: 'metrics.template.create',
        actorId: req.user?.id ?? req.user?.userId,
        templateId: template.id,
        metricType: template.metric_type,
      }),
    );

    return this.metricTemplateRepo.findOne({
      where: { id: template.id },
      relations: ['applicability'],
    });
  }

  /**
   * Get metric template by ID
   * GET /metrics/:id
   */
  @Get(':id')
  @RequireCapability('isMetricsAccess')
  async getMetricTemplate(@Param('id') id: string) {
    return this.metricTemplateRepo.findOne({
      where: { id },
      relations: ['applicability'],
    });
  }

  /**
   * Update metric template
   * PATCH /metrics/:id
   */
  @Patch(':id')
  @RequireCapability('isMetricsManage')
  async updateMetricTemplate(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      metric_type?: string;
      rule_config?: Record<string, any>;
      pass_criteria?: Record<string, any>;
      weight?: number;
      is_active?: boolean;
      applicability?: Array<{
        unit_id?: number;
        document_type?: string;
      }>;
    },
    @Request() req: any,
  ) {
    const { applicability, ...updateData } = body;

    // Update template
    const updatePayload: any = { ...updateData };
    if (updateData.metric_type) {
      updatePayload.metric_type = updateData.metric_type as any;
    }
    await this.metricTemplateRepo.update(id, updatePayload);

    // Update applicability if provided
    if (applicability) {
      // Delete existing applicability
      await this.applicabilityRepo.delete({ metric_id: id });

      // Create new applicability rules
      for (const app of applicability) {
        // Convert unit_id to number if present
        const appData = {
          metric_id: id,
          unit_id: app.unit_id ? Number(app.unit_id) : undefined,
          document_type: app.document_type,
          reportorial_doc_type_id: (app as any).reportorial_doc_type_id
            ? Number((app as any).reportorial_doc_type_id)
            : undefined,
        };
        const appEntity = this.applicabilityRepo.create(appData);
        await this.applicabilityRepo.save(appEntity);
      }
    }

    this.logger.log(
      JSON.stringify({
        action: 'metrics.template.update',
        actorId: req.user?.id ?? req.user?.userId,
        templateId: id,
      }),
    );

    return this.metricTemplateRepo.findOne({
      where: { id },
      relations: ['applicability'],
    });
  }

  /**
   * Delete metric template
   * DELETE /metrics/:id
   */
  @Delete(':id')
  @RequireCapability('isMetricsDelete')
  async deleteMetricTemplate(@Param('id') id: string, @Request() req: any) {
    await this.metricTemplateRepo.delete(id);
    this.logger.log(
      JSON.stringify({
        action: 'metrics.template.delete',
        actorId: req.user?.id ?? req.user?.userId,
        templateId: id,
      }),
    );
    return { message: 'Metric template deleted successfully' };
  }
}

@ApiTags('metrics')
@Controller('documents/:id/metrics')
@UseGuards(JwtAuthGuard, CapabilityGuard)
@RequireCapability('isMetricsAccess')
export class DocumentMetricsController {
  constructor(
    private metricsService: MetricsService,
    @InjectRepository(Document)
    private documentRepo: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private versionRepo: Repository<DocumentVersion>,
  ) {}

  /**
   * Get metric results for a document
   * GET /documents/:id/metrics
   */
  @Get()
  async getDocumentMetrics(@Param('id') documentId: string) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId, is_deleted: false },
    });

    if (!document) {
      return {
        results: [],
        aggregate: this.metricsService.calculateAggregateScore([]),
      };
    }

    const currentVersion = await this.versionRepo.findOne({
      where: {
        document_id: documentId,
        version_number: document.current_version,
      },
    });

    if (!currentVersion) {
      return {
        results: [],
        aggregate: this.metricsService.calculateAggregateScore([]),
      };
    }

    const results = await this.metricsService.getMetricResults(currentVersion.id);
    const aggregate = this.metricsService.calculateAggregateScore(results);

    return {
      results,
      aggregate,
    };
  }
}
