import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Document } from './entities/document.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { DocumentController } from './controllers/document.controller';
import { DocumentService } from './services/document.service';
import { VersionService } from './services/version.service';
import { StorageService } from './services/storage.service';
import { DocumentProcessor } from './processors/document.processor';
import { PreviewGenerator } from './processors/preview.processor';
import { DocumentAssignment } from './entities/document-assignment.entity';
import { DocumentReference } from './entities/document-reference.entity';
import { ManualReview } from '../reviews/entities/manual-review.entity';
import { ReportorialDocumentType } from './entities/reportorial-document-type.entity';
import { ReportorialDocTypeService } from './services/reportorial-doc-type.service';
import { ReportorialDocTypeController } from './controllers/reportorial-doc-type.controller';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      DocumentVersion,
      DocumentAssignment,
      DocumentReference,
      ManualReview,
      ReportorialDocumentType,
    ]),
    MetricsModule,
    BullModule.registerQueue({
      name: 'document-processing',
    }),
  ],
  controllers: [DocumentController, ReportorialDocTypeController],
  providers: [
    DocumentService,
    VersionService,
    StorageService,
    DocumentProcessor,
    PreviewGenerator,
    ReportorialDocTypeService,
  ],
  exports: [
    DocumentService,
    VersionService,
    StorageService,
    ReportorialDocTypeService,
    TypeOrmModule,
  ],
})
export class DocumentsModule {}
