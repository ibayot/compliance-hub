import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { MetricTemplate } from './entities/metric-template.entity';
import { MetricApplicability } from './entities/metric-applicability.entity';
import { MetricResult } from './entities/metric-result.entity';
import { DocumentVersion } from '../documents/entities/document-version.entity';
import { Document } from '../documents/entities/document.entity';
import { MetricsController, DocumentMetricsController } from './controllers/metrics.controller';
import { MetricsService } from './services/metrics.service';
import { SectionCheckEngine } from './engines/section-check.engine';
import { KeywordCheckEngine } from './engines/keyword-check.engine';
import { PropertyCheckEngine } from './engines/property-check.engine';
import { DateCheckEngine } from './engines/date-check.engine';
import { MetricsProcessor } from './processors/metrics.processor';
import { ManualReview } from '../reviews/entities/manual-review.entity';
import { ReportorialDocumentType } from '../documents/entities/reportorial-document-type.entity';
import { RoleCapabilitiesService } from '../users/role-capabilities.service';
import { RoleCapabilitiesHttpClient } from '../../common/http-clients/role-capabilities.http-client';
import { HttpClientsModule } from '../../common/http-clients/http-clients.module';
import { CapabilityGuard } from '../../common/guards/capability.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MetricTemplate,
      MetricApplicability,
      MetricResult,
      DocumentVersion,
      Document,
      ManualReview,
      ReportorialDocumentType,
    ]),
    BullModule.registerQueue({
      name: 'document-processing',
    }),
    HttpClientsModule,
  ],
  controllers: [MetricsController, DocumentMetricsController],
  providers: [
    MetricsService,
    SectionCheckEngine,
    KeywordCheckEngine,
    PropertyCheckEngine,
    DateCheckEngine,
    MetricsProcessor,
    { provide: RoleCapabilitiesService, useClass: RoleCapabilitiesHttpClient },
    CapabilityGuard,
  ],
  exports: [MetricsService],
})
export class MetricsModule {}