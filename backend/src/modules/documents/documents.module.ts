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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      DocumentVersion,
      DocumentAssignment,
      DocumentReference,
      ManualReview,
    ]),
    BullModule.registerQueue({
      name: 'document-processing',
    }),
  ],
  controllers: [DocumentController],
  providers: [
    DocumentService,
    VersionService,
    StorageService,
    DocumentProcessor,
    PreviewGenerator,
  ],
  exports: [
    DocumentService,
    VersionService,
    StorageService,
    TypeOrmModule,
  ],
})
export class DocumentsModule {}
