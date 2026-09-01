import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KpiController } from './controllers/kpi.controller';
import { ReportsController } from './controllers/reports.controller';
import { KpiService } from './services/kpi.service';
import { KpiMaster } from './entities/kpi-master.entity';
import { KpiMonitoring } from './entities/kpi-monitoring.entity';
import { KpiThreshold } from './entities/kpi-threshold.entity';
import { KpiScoringRule } from './entities/kpi-scoring-rule.entity';

import { RoleCapabilitiesService } from '../users/role-capabilities.service';
import { RoleCapabilitiesHttpClient } from '../../common/http-clients/role-capabilities.http-client';
import { HttpClientsModule } from '../../common/http-clients/http-clients.module';
import { CapabilityGuard } from '../../common/guards/capability.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KpiMaster,
      KpiMonitoring,
      KpiThreshold,
      KpiScoringRule,
      // RoleCapability removed: now loaded via RoleCapabilitiesHttpClient → users-service HTTP API
    ]),
    HttpClientsModule,
  ],
  controllers: [KpiController, ReportsController],
  providers: [
    KpiService,
    { provide: RoleCapabilitiesService, useClass: RoleCapabilitiesHttpClient },
    CapabilityGuard,
  ],
  exports: [KpiService],
})
export class KpiModule {}
