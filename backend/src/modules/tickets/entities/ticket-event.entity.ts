import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Immutable audit log of every significant action taken on a ticket.
 * Used to power the timeline view in the ticket detail page.
 */
@Entity('ticket_events')
export class TicketEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ticket_id' })
  ticketId: string;

  /** The user who triggered the event (null for system-generated events) */
  @Column({ name: 'actor_id', nullable: true })
  actorId: number | null;

  /**
   * Type of event:
   * created | auto_assigned | manually_assigned | status_changed |
   * in_progress | resolved | closed | user_closed | comment_added |
   * escalated | satisfaction_submitted
   */
  @Column({ name: 'event_type' })
  eventType: string;

  /** Arbitrary metadata (JSON) — e.g. { from: 'open', to: 'assigned', technicianName: '...' } */
  @Column({ type: 'text', nullable: true })
  meta: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;
}
