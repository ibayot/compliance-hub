import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Document } from './document.entity';
import { User } from '../../users/entities/user.entity';

@Entity('document_versions')
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  document_id: string;

  @ManyToOne(() => Document, (document) => document.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column({ type: 'int' })
  version_number: number;

  @Column({ type: 'varchar', length: 255 })
  file_name: string;

  @Column({ type: 'varchar', length: 255 })
  file_path: string;

  @Column({ type: 'longblob', nullable: true, select: false })
  file_blob?: Buffer;

  @Column({ type: 'varchar', length: 50 })
  mime_type: string;

  @Column({ type: 'bigint' })
  file_size: number;

  @Column({ type: 'varchar', length: 64 })
  checksum: string; // SHA-256 hash

  @Column({ type: 'varchar', length: 255, nullable: true })
  preview_path: string | null; // PDF/HTML preview path

  @Column({ type: 'longblob', nullable: true, select: false })
  preview_blob?: Buffer;

  @Column({ type: 'varchar', length: 50, nullable: true, default: null })
  preview_mime_type: string | null; // mime type of the preview blob (application/pdf or text/html)

  @Column({ type: 'text', nullable: true })
  extracted_text: string; // Extracted text content for compliance checking

  @Column({ type: 'text', nullable: true })
  change_notes: string;

  @Column({ type: 'int', nullable: true })
  uploaded_by: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;

  @CreateDateColumn()
  created_at: Date;
}
