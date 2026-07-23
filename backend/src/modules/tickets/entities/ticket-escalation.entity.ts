import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../shared/entities';
import { Ticket } from './ticket.entity';

export enum EscalationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  RETURNED = 'returned',
}

/**
 * Records every escalation event for a ticket.
 * Proof photos are stored on-disk at storage/escalation-proofs/{ticketId}/
 * and the relative paths are serialised as a JSON array in proof_files.
 */
@Entity('ticket_escalations')
export class TicketEscalation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ticket_id', type: 'varchar', length: 36 })
  ticketId: string;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  /** The technician who initiated the escalation */
  @Column({ name: 'escalated_by_id', type: 'int' })
  escalatedById: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'escalated_by_id' })
  escalatedBy: User;

  /** The focal/senior who receives the escalated ticket */
  @Column({ name: 'escalated_to_id', type: 'int' })
  escalatedToId: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'escalated_to_id' })
  escalatedTo: User;

  @Column({ type: 'varchar', length: 20, default: EscalationStatus.PENDING })
  status: EscalationStatus;

  /** Reason given by the escalating tech */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Reason given by the focal when returning the ticket */
  @Column({ name: 'return_reason', type: 'text', nullable: true })
  returnReason: string | null;

  /**
   * Relative file paths for proof attachments (stored under
   * backend/storage/escalation-proofs/{ticketId}/).
   * JSON-serialised array, e.g. ["escalation-proofs/abc123/photo1.jpg"]
   */
  @Column({ name: 'proof_files', type: 'simple-json', nullable: true })
  proofFiles: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
