import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManualReview } from './entities/manual-review.entity';
import { VersionComparison } from './entities/version-comparison.entity';
import { ReviewService } from './services/review.service';
import { ComparisonService } from './services/comparison.service';
import { ReviewController } from './controllers/review.controller';
import { ComparisonController } from './controllers/comparison.controller';
import { DocumentsModule } from '../documents/documents.module';
import { MetricsModule } from '../metrics/metrics.module';
import { RoleCapability } from '../users/entities/role-capability.entity';
import { RoleCapabilitiesService } from '../users/role-capabilities.service';
import { CapabilityGuard } from '../../common/guards/capability.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([ManualReview, VersionComparison, RoleCapability]),
    DocumentsModule,
    MetricsModule,
  ],
  controllers: [ReviewController, ComparisonController],
  providers: [ReviewService, ComparisonService, RoleCapabilitiesService, CapabilityGuard],
  exports: [ReviewService, ComparisonService],
})
export class ReviewsModule {}
