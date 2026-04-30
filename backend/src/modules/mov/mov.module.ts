import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovArtifact } from './entities/mov-artifact.entity';
import { MovController } from './controllers/mov.controller';
import { MovService } from './services/mov.service';
import { Issuance } from '../references/entities/issuance.entity';
import { KpiMonitoring } from '../kpi/entities/kpi-monitoring.entity';
import { KpiMaster } from '../kpi/entities/kpi-master.entity';
import { RoleCapabilitiesService } from '../users/role-capabilities.service';
import { RoleCapabilitiesHttpClient } from '../../common/http-clients/role-capabilities.http-client';
import { HttpClientsModule } from '../../common/http-clients/http-clients.module';
import { CapabilityGuard } from '../../common/guards/capability.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([MovArtifact, Issuance, KpiMonitoring, KpiMaster]),
    // RoleCapability removed: now loaded via RoleCapabilitiesHttpClient → users-service HTTP API
    HttpClientsModule,
  ],
  controllers: [MovController],
  providers: [
    MovService,
    { provide: RoleCapabilitiesService, useClass: RoleCapabilitiesHttpClient },
    CapabilityGuard,
  ],
  exports: [MovService],
})
export class MovModule {}
