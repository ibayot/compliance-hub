import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Unit } from '../../units/entities/unit.entity';
import { KpiMonitoring } from './kpi-monitoring.entity';

export enum KpiType {
  MEASUREMENT = 'measurement',
  YES_NO = 'yes_no',
}

export enum KpiDirection {
  HIGHER_IS_BETTER = 'higher_is_better',
  LOWER_IS_BETTER = 'lower_is_better',
}

export enum KpiFrequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
}

@Entity('kpi_master')
export class KpiMaster {
  @PrimaryColumn({ type: 'varchar', length: 80 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'unit_id', type: 'int' })
  unitId: number;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @Column({ type: 'enum', enum: KpiType, default: KpiType.MEASUREMENT })
  type: KpiType;

  @Column({ name: 'unit_of_measure', type: 'varchar', length: 80, nullable: true })
  unitOfMeasure: string;

  @Column({ type: 'enum', enum: KpiDirection })
  direction: KpiDirection;

  @Column({ name: 'target_value', type: 'float' })
  targetValue: number;

  @Column({ type: 'float', default: 1 })
  weight: number;

  @Column({ type: 'enum', enum: KpiFrequency, default: KpiFrequency.MONTHLY })
  frequency: KpiFrequency;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @OneToMany(() => KpiMonitoring, (monitoring) => monitoring.kpiMaster)
  monitoringRows: KpiMonitoring[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
