import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Issuance } from './issuance.entity';

@Entity('issuance_recommendations')
export class IssuanceRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'issuance_id', type: 'varchar', length: 36 })
  issuanceId: string;

  @ManyToOne(() => Issuance, (issuance) => issuance.recommendations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'issuance_id' })
  issuance: Issuance;

  @Column({ type: 'varchar', length: 30, default: 'pending' })
  status: string;

  @Column({ name: 'recommended_register', type: 'varchar', length: 40, nullable: true })
  recommendedRegister: string | null;

  @Column({ name: 'recommended_scope_profile', type: 'varchar', length: 20, nullable: true })
  recommendedScopeProfile: string | null;

  @Column({ name: 'recommended_applicability', type: 'varchar', length: 40, nullable: true })
  recommendedApplicability: string | null;

  @Column({ name: 'recommended_domains_json', type: 'json', nullable: true })
  recommendedDomains: string[] | null;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'text', nullable: true })
  rationale: string | null;

  @Column({ name: 'applicable_provisions', type: 'text', nullable: true })
  applicableProvisions: string | null;

  @Column({ type: 'text', nullable: true })
  uncertainties: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  provider: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  model: string | null;

  @Column({ name: 'source_sha256', type: 'char', length: 64, nullable: true })
  sourceSha256: string | null;

  @Column({ name: 'response_json', type: 'json', nullable: true })
  responseJson: Record<string, unknown> | null;

  @Column({ name: 'decided_by', type: 'int', nullable: true })
  decidedBy: number | null;

  @Column({ name: 'decided_at', type: 'datetime', nullable: true })
  decidedAt: Date | null;

  @Column({ name: 'decision_note', type: 'text', nullable: true })
  decisionNote: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
