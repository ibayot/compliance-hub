import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KpiController } from './controllers/kpi.controller';
import { KpiService } from './services/kpi.service';
import { KpiMaster } from './entities/kpi-master.entity';
import { KpiMonitoring } from './entities/kpi-monitoring.entity';
import { KpiThreshold } from './entities/kpi-threshold.entity';
import { KpiScoringRule } from './entities/kpi-scoring-rule.entity';
import { Unit } from '../units/entities/unit.entity';
import { User } from '../users/entities/user.entity';
import { RoleCapability } from '../users/entities/role-capability.entity';
import { RoleCapabilitiesService } from '../users/role-capabilities.service';
import { CapabilityGuard } from '../../common/guards/capability.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KpiMaster,
      KpiMonitoring,
      KpiThreshold,
      KpiScoringRule,
      Unit,
      User,
      RoleCapability,
    ]),
  ],
  controllers: [KpiController],
  providers: [KpiService, RoleCapabilitiesService, CapabilityGuard],
  exports: [KpiService],
})
export class KpiModule {}
