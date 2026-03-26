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

@Entity('ticket_keyword_rules')
export class TicketKeywordRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Keyword / phrase to match in subject or description (case-insensitive) */
  @Column({ type: 'varchar', length: 100 })
  keyword: string;

  /** Target ticket type when keyword matches */
  @Column({ name: 'target_ticket_type', type: 'varchar', length: 30 })
  targetTicketType: string;

  /** Target category when keyword matches (optional) */
  @Column({ name: 'target_category_id', type: 'varchar', length: 36, nullable: true })
  targetCategoryId: string | null;

  @ManyToOne(() => TicketCategoryConfig, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'target_category_id' })
  targetCategory: TicketCategoryConfig | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
