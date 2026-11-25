import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type KnowledgeArticleState = 'queued' | 'generating' | 'retrying' | 'failed' | 'draft' | 'published';
export type KnowledgeBaseTicketStatus = KnowledgeArticleState | 'disabled';

@Entity('knowledge_base_articles')
@Index('uq_kb_article_source_ticket', ['sourceTicketId'], { unique: true })
export class KnowledgeArticle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  tags: string | null;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @Column({ name: 'publication_state', type: 'enum', enum: ['queued', 'generating', 'retrying', 'failed', 'draft', 'published'], default: 'published' })
  publicationState: KnowledgeArticleState;

  @Column({ name: 'source_ticket_id', type: 'varchar', length: 36, nullable: true })
  sourceTicketId: string | null;

  @Column({ name: 'generation_attempts', type: 'tinyint', unsigned: true, default: 0 })
  generationAttempts: number;

  @Column({ name: 'review_literals', type: 'simple-json', nullable: true })
  reviewLiterals: string[] | null;

  @Column({ name: 'helpful_count', type: 'int', default: 0 })
  helpfulCount: number;

  @Column({ name: 'unhelpful_count', type: 'int', default: 0 })
  unhelpfulCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
