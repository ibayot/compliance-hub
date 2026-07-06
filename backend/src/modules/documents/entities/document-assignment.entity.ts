import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { UnitRef } from '../../../shared/contracts/unit-ref';
import { UserRef } from '../../../shared/contracts/user-ref';

export enum SubmissionFrequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
  CUSTOM = 'custom',
}

@Entity('document_assignments')
@Unique('uq_assignment_user_unit_type', ['user_id', 'unit_id', 'document_type'])
export class DocumentAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  user_id: number;

  // Virtual enrichment field populated by UsersHttpClient.
  user?: UserRef | null;

  @Column({ type: 'int' })
  unit_id: number;

  // Virtual field populated via UnitsHttpClient
  unit?: UnitRef;

  @Column({ type: 'varchar', length: 100 })
  document_type: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  report_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  filename_prefix: string;

  @Column({
    type: 'enum',
    enum: SubmissionFrequency,
    default: SubmissionFrequency.MONTHLY,
  })
  submission_frequency: SubmissionFrequency;

  @Column({ type: 'tinyint', nullable: true })
  submission_month: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
