import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Append-only evidence for an approved correction to a ticket's effective
 * resolution time. The original tickets.resolved_at value remains unchanged.
 */
@Entity('ticket_resolution_time_overrides')
@Index('idx_ticket_resolution_override_ticket_created', ['ticketId', 'createdAt'])
export class TicketResolutionTimeOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ticket_id', type: 'varchar', length: 36 })
  ticketId: string;

  @Column({ name: 'recorded_resolved_at', type: 'datetime' })
  recordedResolvedAt: Date;

  @Column({ name: 'previous_effective_resolved_at', type: 'datetime', nullable: true })
  previousEffectiveResolvedAt: Date | null;

  @Column({ name: 'verified_resolved_at', type: 'datetime' })
  verifiedResolvedAt: Date;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'proof_files', type: 'simple-json' })
  proofFiles: string[];

  @Column({ name: 'created_by_id', type: 'int' })
  createdById: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  createdByName?: string;
}
