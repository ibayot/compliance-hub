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
import { Unit } from '../../units/entities/unit.entity';
import { TicketComment } from './ticket-comment.entity';

export enum TicketCategory {
  DOCUMENT_RELATED = 'document_related',
  SYSTEM_ISSUE = 'system_issue',
  COMPLIANCE_QUERY = 'compliance_query',
  TRAINING_REQUEST = 'training_request',
  OTHER = 'other',
}

export enum TicketStatus {
  OPEN = 'open',
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

export enum IssueType {
  POLICY_GAP = 'policy_gap',
  MISSING_EVIDENCE = 'missing_evidence',
  DATA_INCONSISTENCY = 'data_inconsistency',
  LATE_SUBMISSION = 'late_submission',
  SECURITY_INCIDENT = 'security_incident',
  OTHER = 'other',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  ticket_number: string; // Auto-generated: TICK-2024-0001

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: IssueType,
    default: IssueType.OTHER,
  })
  issue_type: IssueType;

  @Column({
    type: 'enum',
    enum: TicketCategory,
    default: TicketCategory.OTHER,
  })
  category: TicketCategory;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.OPEN,
  })
  status: TicketStatus;

  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
  })
  priority: TicketPriority;

  // Reporter
  @Column({ type: 'int' })
  reported_by_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reported_by_id' })
  reported_by: User;

  // Assigned to (optional)
  @Column({ type: 'int', nullable: true })
  assigned_to_id: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_id' })
  assigned_to: User;

  // Related unit (optional)
  @Column({ type: 'int', nullable: true })
  unit_id: number;

  @ManyToOne(() => Unit, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  // Comments
  @OneToMany(() => TicketComment, (comment) => comment.ticket)
  comments: TicketComment[];

  @Column({ type: 'timestamp', nullable: true })
  resolved_at: Date;

  @Column({ type: 'text', nullable: true })
  resolution_steps: string;

  @Column({ type: 'timestamp', nullable: true })
  resolution_date: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
