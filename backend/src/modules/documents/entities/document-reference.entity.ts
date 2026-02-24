import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Document } from './document.entity';
import { User } from '../../users/entities/user.entity';

@Entity('document_references')
@Unique('uq_document_reference_pair', ['source_document_id', 'target_document_id'])
export class DocumentReference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  source_document_id: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_document_id' })
  source_document: Document;

  @Column({ type: 'varchar', length: 36 })
  target_document_id: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_document_id' })
  target_document: Document;

  @Column({ type: 'varchar', length: 50, default: 'references' })
  relationship_type: string;

  @Column({ type: 'int', nullable: true })
  created_by: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn()
  created_at: Date;
}
