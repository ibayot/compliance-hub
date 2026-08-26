import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Incident } from './entities/incident.entity';
import { IncidentDailySnapshot } from './entities/incident-daily-snapshot.entity';
import { IncidentsController } from './controllers/incidents.controller';
import { IncidentsService } from './services/incidents.service';
import { SnapshotService } from './services/snapshot.service';
import { HttpClientsModule } from '../../common/http-clients/http-clients.module';
import { RealtimeModule } from '../../common/events/realtime.module';
import { RoleCapabilitiesService } from '../users/role-capabilities.service';
import { RoleCapabilitiesHttpClient } from '../../common/http-clients/role-capabilities.http-client';
import { CapabilityGuard } from '../../common/guards/capability.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Incident, IncidentDailySnapshot]), HttpClientsModule, RealtimeModule],
  controllers: [IncidentsController],
  providers: [
    IncidentsService,
    SnapshotService,
    { provide: RoleCapabilitiesService, useClass: RoleCapabilitiesHttpClient },
    CapabilityGuard,
  ],
  exports: [IncidentsService, SnapshotService],
})
export class IncidentsModule {}
