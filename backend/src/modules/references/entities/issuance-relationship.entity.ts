import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Issuance } from './issuance.entity';

@Entity('issuance_relationships')
export class IssuanceRelationship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'source_issuance_id', type: 'varchar', length: 36 })
  sourceIssuanceId: string;

  @ManyToOne(() => Issuance, (issuance) => issuance.outgoingRelationships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_issuance_id' })
  sourceIssuance: Issuance;

  @Column({ name: 'target_issuance_id', type: 'varchar', length: 36 })
  targetIssuanceId: string;

  @ManyToOne(() => Issuance, (issuance) => issuance.incomingRelationships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_issuance_id' })
  targetIssuance: Issuance;

  @Column({ name: 'relationship_type', type: 'varchar', length: 40 })
  relationshipType: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
