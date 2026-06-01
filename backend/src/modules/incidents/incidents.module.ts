import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Incident } from './entities/incident.entity';
import { IncidentDailySnapshot } from './entities/incident-daily-snapshot.entity';
import { IncidentsController } from './controllers/incidents.controller';
import { IncidentsService } from './services/incidents.service';
import { SnapshotService } from './services/snapshot.service';
import { HttpClientsModule } from '../../common/http-clients/http-clients.module';

@Module({
  imports: [TypeOrmModule.forFeature([Incident, IncidentDailySnapshot]), HttpClientsModule],
  controllers: [IncidentsController],
  providers: [IncidentsService, SnapshotService],
  exports: [IncidentsService, SnapshotService],
})
export class IncidentsModule {}
