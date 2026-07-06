import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { DocumentVersion } from '../../documents/entities/document-version.entity';
import { Document } from '../../documents/entities/document.entity';
import { User } from '../../shared/entities';

@Entity('version_comparisons')
export class VersionComparison {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  document_id: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column({ type: 'uuid' })
  version_a_id: string;

  @ManyToOne(() => DocumentVersion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'version_a_id' })
  version_a: DocumentVersion;

  @Column({ type: 'uuid' })
  version_b_id: string;

  @ManyToOne(() => DocumentVersion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'version_b_id' })
  version_b: DocumentVersion;

  @Column({ type: 'int', nullable: true })
  compared_by_id: number | null;

  @Column({ type: 'json' })
  diff_output: any; // Store diffs and stats

  @CreateDateColumn()
  compared_at: Date;
}
