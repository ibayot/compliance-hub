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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KpiMaster,
      KpiMonitoring,
      KpiThreshold,
      KpiScoringRule,
      Unit,
      User,
    ]),
  ],
  controllers: [KpiController],
  providers: [KpiService],
  exports: [KpiService],
})
export class KpiModule {}
