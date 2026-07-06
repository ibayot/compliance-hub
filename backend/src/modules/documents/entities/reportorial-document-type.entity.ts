import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UnitRef } from '../../../shared/contracts/unit-ref';

export enum SubmissionFrequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
}

@Entity('reportorial_document_types')
export class ReportorialDocumentType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  unit_id: number;

  // Virtual field populated via UnitsHttpClient
  unit?: UnitRef;

  /**
   * The base filename prefix, e.g. "Incident_Report".
   * Period suffix is appended automatically: Incident_Report_202602
   */
  @Column({ type: 'varchar', length: 100 })
  base_name: string;

  /**
   * Human-readable label, e.g. "Incident Report"
   */
  @Column({ type: 'varchar', length: 255 })
  display_name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: SubmissionFrequency,
    default: SubmissionFrequency.MONTHLY,
  })
  submission_frequency: SubmissionFrequency;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
