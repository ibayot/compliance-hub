import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovArtifact } from './entities/mov-artifact.entity';
import { MovController } from './controllers/mov.controller';
import { MovService } from './services/mov.service';
import { Issuance } from '../references/entities/issuance.entity';
import { KpiMonitoring } from '../kpi/entities/kpi-monitoring.entity';
import { KpiMaster } from '../kpi/entities/kpi-master.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MovArtifact, Issuance, KpiMonitoring, KpiMaster])],
  controllers: [MovController],
  providers: [MovService],
  exports: [MovService],
})
export class MovModule {}
