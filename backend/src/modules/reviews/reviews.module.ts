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

import { RoleCapabilitiesService } from '../users/role-capabilities.service';
import { CapabilityGuard } from '../../common/guards/capability.guard';
import { HttpClientsModule } from '../../common/http-clients/http-clients.module';
import { RoleCapabilitiesHttpClient } from '../../common/http-clients/role-capabilities.http-client';

@Module({
  imports: [
    TypeOrmModule.forFeature([ManualReview, VersionComparison]),
    DocumentsModule,
    MetricsModule,
    HttpClientsModule,
  ],
  controllers: [ReviewController, ComparisonController],
  providers: [
    ReviewService,
    ComparisonService,
    { provide: RoleCapabilitiesService, useClass: RoleCapabilitiesHttpClient },
    CapabilityGuard,
  ],
  exports: [ReviewService, ComparisonService],
})
export class ReviewsModule {}
