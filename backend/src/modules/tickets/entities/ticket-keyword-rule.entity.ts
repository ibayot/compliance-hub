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
import { TicketIssueType } from './ticket-issue-type.entity';

@Entity('ticket_keyword_rules')
export class TicketKeywordRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Primary keyword (first of the group, kept for display/legacy) */
  @Column({ type: 'varchar', length: 50 })
  keyword: string;

  /** JSON array of all keywords/phrases in this rule (case-insensitive) */
  @Column({ name: 'keywords', type: 'text', nullable: true })
  keywords: string | null;

  /** Target ticket type when keyword matches */

  @Column({ name: 'target_ticket_type', type: 'varchar', length: 30 })
  targetTicketType: string;

  /** Target category when keyword matches (optional) */
  @Column({ name: 'target_category_id', type: 'varchar', length: 36, nullable: true })
  targetCategoryId: string | null;

  @ManyToOne(() => TicketCategoryConfig, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'target_category_id' })
  targetCategory: TicketCategoryConfig | null;

  /** Target issue type when keyword matches (optional) */
  @Column({ name: 'target_issue_type_id', type: 'varchar', length: 36, nullable: true })
  targetIssueTypeId: string | null;

  @ManyToOne(() => TicketIssueType, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'target_issue_type_id' })
  targetIssueType: TicketIssueType | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
