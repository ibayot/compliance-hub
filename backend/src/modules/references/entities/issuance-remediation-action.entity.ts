import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { IssuanceAssessment } from './issuance-assessment.entity';

@Entity('issuance_remediation_actions')
export class IssuanceRemediationAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assessment_id', type: 'varchar', length: 36 })
  assessmentId: string;

  @ManyToOne(() => IssuanceAssessment, (assessment) => assessment.remediationActions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessment_id' })
  assessment: IssuanceAssessment;

  @Column({ type: 'text' })
  action: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  owner: string | null;

  @Column({ name: 'target_date', type: 'date', nullable: true })
  targetDate: string | null;

  @Column({ type: 'varchar', length: 40, default: 'open' })
  status: string;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
