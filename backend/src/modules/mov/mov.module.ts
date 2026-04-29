import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovArtifact } from './entities/mov-artifact.entity';
import { MovController } from './controllers/mov.controller';
import { MovService } from './services/mov.service';
import { Issuance } from '../references/entities/issuance.entity';
import { KpiMonitoring } from '../kpi/entities/kpi-monitoring.entity';
import { KpiMaster } from '../kpi/entities/kpi-master.entity';
import { RoleCapability } from '../users/entities/role-capability.entity';
import { RoleCapabilitiesService } from '../users/role-capabilities.service';
import { CapabilityGuard } from '../../common/guards/capability.guard';

@Module({
  imports: [TypeOrmModule.forFeature([MovArtifact, Issuance, KpiMonitoring, KpiMaster, RoleCapability])],
  controllers: [MovController],
  providers: [MovService, RoleCapabilitiesService, CapabilityGuard],
  exports: [MovService],
})
export class MovModule {}
