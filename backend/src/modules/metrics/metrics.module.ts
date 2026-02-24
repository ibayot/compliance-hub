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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MetricTemplate,
      MetricApplicability,
      MetricResult,
      DocumentVersion,
      Document,
    ]),
    BullModule.registerQueue({
      name: 'document-processing',
    }),
  ],
  controllers: [MetricsController, DocumentMetricsController],
  providers: [
    MetricsService,
    SectionCheckEngine,
    KeywordCheckEngine,
    PropertyCheckEngine,
    DateCheckEngine,
    MetricsProcessor,
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
