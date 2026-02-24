import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MetricTemplate } from './metric-template.entity';
import { Unit } from '../../units/entities/unit.entity';

@Entity('metric_applicability')
export class MetricApplicability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  metric_id: string;

  @ManyToOne(() => MetricTemplate, (template) => template.applicability, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'metric_id' })
  metric_template: MetricTemplate;

  @Column({ type: 'int', nullable: true })
  unit_id: number;

  @ManyToOne(() => Unit, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @Column({ type: 'varchar', length: 100, nullable: true })
  document_type: string;

  // If both unit_id and document_type are null, the metric applies globally
}
