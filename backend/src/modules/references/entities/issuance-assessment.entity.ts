import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Issuance } from './issuance.entity';
import { IssuanceAssessmentEvidence } from './issuance-assessment-evidence.entity';
import { IssuanceRemediationAction } from './issuance-remediation-action.entity';

@Entity('issuance_compliance_assessments')
export class IssuanceAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'issuance_id', type: 'varchar', length: 36 })
  issuanceId: string;

  @ManyToOne(() => Issuance, (issuance) => issuance.assessments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'issuance_id' })
  issuance: Issuance;

  @OneToMany(() => IssuanceAssessmentEvidence, (evidence) => evidence.assessment)
  evidence: IssuanceAssessmentEvidence[];

  @OneToMany(() => IssuanceRemediationAction, (action) => action.assessment)
  remediationActions: IssuanceRemediationAction[];

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'tinyint', nullable: true })
  quarter: number | null;

  @Column({ type: 'varchar', length: 40, default: 'not_assessed' })
  status: string;

  @Column({ name: 'evidence_summary', type: 'text', nullable: true })
  evidenceSummary: string | null;

  @Column({ name: 'gap_summary', type: 'text', nullable: true })
  gapSummary: string | null;

  @Column({ name: 'readiness_status', type: 'varchar', length: 40, nullable: true })
  readinessStatus: string | null;

  @Column({ name: 'assessed_by', type: 'int', nullable: true })
  assessedBy: number | null;

  @Column({ name: 'assessed_at', type: 'datetime', nullable: true })
  assessedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
