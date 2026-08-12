import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TicketCategoryConfig } from './ticket-category.entity';

@Entity('ticket_issue_types')
export class TicketIssueType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  key: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  /** SLA time limit in hours from assignment to resolved — null = no SLA */
  @Column({ name: 'sla_hours', type: 'int', nullable: true })
  slaHours: number | null;

  @Column({ name: 'allowable_pause_hours', type: 'int', default: 48 })
  allowablePauseHours: number;

  /** Maximum time limit in hours a ticket can stay on hold (frozen) — null = unlimited */
  @Column({ name: 'max_freeze_hours', type: 'int', nullable: true })
  maxFreezeHours: number | null;

  @Column({ type: 'int', nullable: true })
  created_by: number | null;

  @Column({ type: 'int', nullable: true })
  updated_by: number | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  category_id: string | null;

  @ManyToOne(() => TicketCategoryConfig, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: TicketCategoryConfig;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
