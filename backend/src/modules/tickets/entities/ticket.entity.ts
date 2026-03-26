import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TicketComment } from './ticket-comment.entity';
import { TicketCategoryConfig } from './ticket-category.entity';

export enum TicketType {
  DESKTOP_SUPPORT = 'desktop_support',
  IT_SUPPORT = 'it_support',
  PANTAWID_ICT_SUPPORT = 'pantawid_ict_support',
}

export enum TicketStatus {
  OPEN = 'open',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Auto-generated: TKT-2026-0001 */
  @Column({ name: 'ticket_number', type: 'varchar', length: 50, unique: true })
  ticketNumber: string;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  /**
   * Which technician pool handles this ticket.
   * desktop_support -> technician_desktop role
   * it_support      -> technician_it_support role
   */
  @Column({ name: 'ticket_type', type: 'varchar', length: 30, default: TicketType.IT_SUPPORT })
  ticketType: TicketType;

  @Column({ type: 'varchar', length: 20, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Column({ type: 'varchar', length: 10, default: TicketPriority.MEDIUM })
  priority: TicketPriority;

  // --- Category ---
  @Column({ name: 'category_id', type: 'varchar', length: 36, nullable: true })
  categoryId: string | null;

  @ManyToOne(() => TicketCategoryConfig, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: TicketCategoryConfig | null;

  // --- Requester ---
  @Column({ name: 'requester_id', type: 'int' })
  requesterId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  // --- Assigned Technician ---
  @Column({ name: 'assigned_to_id', type: 'int', nullable: true })
  assignedToId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: User | null;

  // --- Resolution ---
  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string | null;

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  // --- Client Satisfaction ---
  /** 1-5 star rating submitted by the requester after resolution */
  @Column({ name: 'satisfaction_rating', type: 'tinyint', nullable: true })
  satisfactionRating: number | null;

  @Column({ name: 'satisfaction_comment', type: 'text', nullable: true })
  satisfactionComment: string | null;

  @Column({ name: 'satisfaction_submitted_at', type: 'datetime', nullable: true })
  satisfactionSubmittedAt: Date | null;

  // --- Relations ---
  @OneToMany(() => TicketComment, (c) => c.ticket, { cascade: true })
  comments: TicketComment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
