import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Document } from '../../documents/entities/document.entity';
import { ComplianceDomain } from './compliance-domain.entity';
import { IssuanceSource } from './issuance-source.entity';
import { IssuanceRelationship } from './issuance-relationship.entity';
import { IssuanceLifecycleHistory } from './issuance-lifecycle-history.entity';
import { IssuanceAssessment } from './issuance-assessment.entity';
import { IssuanceRecommendation } from './issuance-recommendation.entity';
import { IssuanceRegisterDecision } from './issuance-register-decision.entity';

@Entity('issuances')
export class Issuance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  issuance_number: string; // e.g., "CMO-2023-001"

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  issuance_type: string; // law, circular, memorandum, irr, standard, guideline

  @Column({ type: 'varchar', length: 40, default: 'legal_regulatory' })
  primary_register: string;

  @Column({ type: 'varchar', length: 40, default: 'active' })
  lifecycle_status: string;

  @Column({ type: 'varchar', length: 40, default: 'applicable' })
  applicability_status: string;

  @Column({ type: 'varchar', length: 30, default: 'included' })
  register_decision: string;

  @Column({ type: 'varchar', length: 20, default: 'core' })
  scope_profile: string;

  @Column({ type: 'text', nullable: true })
  status_reason: string;

  @Column({ type: 'text', nullable: true })
  applicability_scope: string;

  @Column({ type: 'text', nullable: true })
  relevance_notes: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  binding_nature: string;

  @Column({ type: 'text', nullable: true })
  adoption_basis: string;

  @Column({ type: 'text', nullable: true })
  applicable_provisions: string;

  @Column({ type: 'text', nullable: true })
  compliance_obligations: string;

  @Column({ type: 'text', nullable: true })
  required_evidence: string;

  @Column({ type: 'text', nullable: true })
  evidence_location: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  process_owner: string;

  @Column({ name: 'accountable_user_id', type: 'int', nullable: true })
  accountable_user_id: number | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  frequency_cadence: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  compliance_status: string;

  @Column({ type: 'text', nullable: true })
  gap_summary: string;

  @Column({ type: 'text', nullable: true })
  action_required: string;

  @Column({ type: 'date', nullable: true })
  target_date: Date;

  @Column({ type: 'date', nullable: true })
  last_review_date: Date;

  @Column({ type: 'varchar', length: 40, nullable: true })
  quarterly_readiness: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  q1_compliance_status: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  q2_compliance_status: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  q3_compliance_status: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  q4_compliance_status: string;

  @Column({ type: 'date', nullable: true })
  register_added_at: Date;

  @Column({ type: 'boolean', default: false })
  is_amendment: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  amended_issuance_number: string | null;

  @Column({ type: 'text', nullable: true })
  ict_amendment_notes: string | null;

  @Column({ type: 'varchar', length: 100 })
  issuing_authority: string; // e.g., "CHED", "DBM", "CSC"

  @Column({ type: 'date', nullable: true })
  issue_date: Date;

  @Column({ type: 'varchar', length: 10, default: 'day' })
  issue_date_precision: string;

  @Column({ type: 'date', nullable: true })
  approval_date: Date;

  @Column({ type: 'date', nullable: true })
  effectivity_date: Date;

  @Column({ type: 'varchar', length: 10, default: 'day' })
  effectivity_date_precision: string;

  @Column({ type: 'date', nullable: true })
  end_date: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  source_url: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  attachment_file_name: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  attachment_mime_type: string | null;

  @Column({ type: 'longblob', nullable: true, select: false })
  attachment_blob: Buffer | null;

  @Column({ type: 'datetime', nullable: true })
  attachment_uploaded_at: Date | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ManyToMany(() => ComplianceDomain, (domain) => domain.issuances)
  @JoinTable({
    name: 'issuance_domains',
    joinColumn: { name: 'issuance_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'domain_id', referencedColumnName: 'id' },
  })
  domains: ComplianceDomain[];

  @OneToMany(() => IssuanceSource, (source) => source.issuance)
  sources: IssuanceSource[];

  @OneToMany(() => IssuanceRelationship, (relationship) => relationship.sourceIssuance)
  outgoingRelationships: IssuanceRelationship[];

  @OneToMany(() => IssuanceRelationship, (relationship) => relationship.targetIssuance)
  incomingRelationships: IssuanceRelationship[];

  @OneToMany(() => IssuanceLifecycleHistory, (history) => history.issuance)
  lifecycleHistory: IssuanceLifecycleHistory[];

  @OneToMany(() => IssuanceAssessment, (assessment) => assessment.issuance)
  assessments: IssuanceAssessment[];

  @OneToMany(() => IssuanceRecommendation, (recommendation) => recommendation.issuance)
  recommendations: IssuanceRecommendation[];

  @OneToMany(() => IssuanceRegisterDecision, (decision) => decision.issuance)
  registerDecisionHistory: IssuanceRegisterDecision[];

  // Many-to-many relationship with documents
  @ManyToMany(() => Document, (document) => document.issuances)
  @JoinTable({
    name: 'document_issuances',
    joinColumn: { name: 'issuance_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'document_id', referencedColumnName: 'id' },
  })
  documents: Document[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
