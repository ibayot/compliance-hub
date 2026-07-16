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
import { UserRef } from '../../../shared/contracts/user-ref';
import { TicketComment } from './ticket-comment.entity';
import { TicketCategoryConfig } from './ticket-category.entity';
import { TicketIssueType } from './ticket-issue-type.entity';

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
  /** Ticket is temporarily put on hold for third party */
  FREEZE = 'freeze',
  /** Ticket is paused waiting for user reply */
  PAUSE = 'pause',
  /** Ticket is a duplicate of an existing open ticket — auto-closes */
  DUPLICATE = 'duplicate',
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

  @Column({ type: 'varchar', length: 10, nullable: true, default: null })
  priority: TicketPriority | null;

  // --- Category ---
  @Column({ name: 'category_id', type: 'varchar', length: 36, nullable: true })
  categoryId: string | null;

  @ManyToOne(() => TicketCategoryConfig, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: TicketCategoryConfig | null;

  // --- Issue Type ---
  @Column({ name: 'issue_type_id', type: 'varchar', length: 36, nullable: true })
  issueTypeId: string | null;

  @Column({ name: 'issue_type', type: 'varchar', length: 50, default: 'other' })
  issueType: string;

  @ManyToOne(() => TicketIssueType, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'issue_type_id' })
  issueTypeConfig: TicketIssueType | null;

  // --- Creator ---
  @Column({ name: 'created_by_id', type: 'int', nullable: true })
  createdById: number | null;

  createdBy?: UserRef | null;

  // --- Requester ---
  @Column({ name: 'requester_id', type: 'int' })
  requesterId: number;

  requester?: UserRef;

  // --- Assigned Technician ---
  @Column({ name: 'assigned_to_id', type: 'int', nullable: true })
  assignedToId: number | null;

  assignedTo?: UserRef | null;

  // --- Resolution ---
  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string | null;

  @Column({ name: 'resolution_steps', type: 'text', nullable: true })
  resolutionSteps: string | null;

  @Column({ name: 'resolution_date', type: 'datetime', nullable: true })
  resolutionDate: Date | null;

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  /** If status=duplicate, points to the original ticket that this duplicates */
  @Column({ name: 'duplicate_of_id', type: 'varchar', length: 36, nullable: true })
  duplicateOfId: string | null;

  /** SLA deadline — set at assignment time based on category.slaHours */
  @Column({ name: 'sla_deadline', type: 'datetime', nullable: true })
  slaDeadline: Date | null;

  @Column({ name: 'sla_paused_at', type: 'datetime', nullable: true })
  slaPausedAt: Date | null;

  @Column({ name: 'accumulated_pause_seconds', type: 'int', default: 0 })
  accumulatedPauseSeconds: number;

  @Column({ name: 'is_sla_waiting', type: 'boolean', default: false })
  isSlaWaiting: boolean;

  @Column({ name: 'last_assigned_at', type: 'datetime', nullable: true })
  lastAssignedAt: Date | null;

  // --- Client Satisfaction ---
  /** Overall satisfaction rating derived from CSAT form item 0 */
  @Column({ name: 'satisfaction_rating', type: 'tinyint', nullable: true })
  satisfactionRating: number | null;

  @Column({ name: 'satisfaction_comment', type: 'text', nullable: true })
  satisfactionComment: string | null;

  @Column({ name: 'satisfaction_submitted_at', type: 'datetime', nullable: true })
  satisfactionSubmittedAt: Date | null;

  /** Full CLIENT SATISFACTION MEASUREMENT FORM data stored as JSON */
  @Column({ name: 'satisfaction_form_data', type: 'text', nullable: true })
  satisfactionFormData: string | null;

  /**
   * Set to true when the ticket requester (role=USER) explicitly closes their own ticket.
   * User-closed tickets are excluded from operational statistics.
   */
  @Column({ name: 'user_closed', type: 'tinyint', default: 0 })
  userClosed: boolean;

  /** Indicates if this ticket is waiting for KB generation (used for background retries) */
  @Column({ name: 'is_kb_generation_pending', type: 'tinyint', default: 0 })
  isKbGenerationPending: boolean;

  // --- Relations ---
  @OneToMany(() => TicketComment, (c) => c.ticket, { cascade: true })
  comments: TicketComment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
