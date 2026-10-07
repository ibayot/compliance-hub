import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Issuance } from './issuance.entity';

@Entity('issuance_register_decisions')
export class IssuanceRegisterDecision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'issuance_id', type: 'varchar', length: 36 })
  issuanceId: string;

  @ManyToOne(() => Issuance, (issuance) => issuance.registerDecisionHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'issuance_id' })
  issuance: Issuance;

  @Column({ type: 'varchar', length: 30 })
  decision: string;

  @Column({ name: 'applicability_status', type: 'varchar', length: 40 })
  applicabilityStatus: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'decided_by', type: 'int', nullable: true })
  decidedBy: number | null;

  @CreateDateColumn({ name: 'decided_at' })
  decidedAt: Date;
}
