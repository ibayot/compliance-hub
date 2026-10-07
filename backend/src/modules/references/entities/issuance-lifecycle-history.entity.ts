import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Issuance } from './issuance.entity';

@Entity('issuance_lifecycle_history')
export class IssuanceLifecycleHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'issuance_id', type: 'varchar', length: 36 })
  issuanceId: string;

  @ManyToOne(() => Issuance, (issuance) => issuance.lifecycleHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'issuance_id' })
  issuance: Issuance;

  @Column({ name: 'from_status', type: 'varchar', length: 40, nullable: true })
  fromStatus: string | null;

  @Column({ name: 'to_status', type: 'varchar', length: 40 })
  toStatus: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'changed_by', type: 'int', nullable: true })
  changedBy: number | null;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;
}
