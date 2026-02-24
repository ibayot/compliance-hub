import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Document } from '../../documents/entities/document.entity';
import { DocumentVersion } from '../../documents/entities/document-version.entity';
import { User } from '../../users/entities/user.entity';

export enum ReviewDecision {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  NEEDS_REVISION = 'needs_revision',
}

@Entity('manual_reviews')
export class ManualReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  document_id: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column({ type: 'uuid' })
  version_id: string;

  @ManyToOne(() => DocumentVersion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'version_id' })
  version: DocumentVersion;

  @Column({
    type: 'enum',
    enum: ReviewDecision,
  })
  decision: ReviewDecision;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ type: 'json', nullable: true })
  findings: Array<{
    category: string;
    description: string;
    severity?: 'low' | 'medium' | 'high';
  }>;

  @Column({ type: 'int', nullable: true })
  reviewer_id: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  @CreateDateColumn()
  reviewed_at: Date;
}
