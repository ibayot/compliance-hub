import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { KpiMaster } from './kpi-master.entity';
import { UnitRef } from '../../../shared/contracts/unit-ref';
import { UserRef } from '../../../shared/contracts/user-ref';

export enum KpiMonitoringStatus {
  DRAFT = 'draft',
  LOCKED = 'locked',
}

@Entity('kpi_monitoring')
@Index('idx_kpi_period_unit', ['kpiMasterCode', 'unitId', 'periodYear', 'periodMonth'], {
  unique: true,
})
export class KpiMonitoring {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'kpi_master_code', type: 'varchar', length: 80 })
  kpiMasterCode: string;

  @ManyToOne(() => KpiMaster, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kpi_master_code', referencedColumnName: 'code' })
  kpiMaster: KpiMaster;

  @Column({ name: 'unit_id', type: 'int' })
  unitId: number;

  // Virtual field populated via UnitsHttpClient
  unit?: UnitRef;

  @Column({ name: 'period_year', type: 'int' })
  periodYear: number;

  @Column({ name: 'period_month', type: 'int' })
  periodMonth: number;

  @Column({ name: 'actual_value', type: 'float' })
  actualValue: number;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @Column({ name: 'entered_by_user_id', type: 'int', nullable: true })
  enteredByUserId: number | null;

  // Virtual field populated via UsersHttpClient
  enteredByUser?: UserRef | null;

  @Column({ name: 'entered_by_staff_id', type: 'varchar', length: 120, nullable: true })
  enteredByStaffId: string | null;

  @Column({ name: 'entered_by_name', type: 'varchar', length: 255, nullable: true })
  enteredByName: string | null;

  @Column({ type: 'enum', enum: KpiMonitoringStatus, default: KpiMonitoringStatus.DRAFT })
  status: KpiMonitoringStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
