import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { UserRef } from '../../../shared/contracts/user-ref';
import { DocumentVersion } from './document-version.entity';
import { ReportorialDocumentType } from './reportorial-document-type.entity';

export enum DocumentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
}

import { UnitRef } from '../../../shared/contracts/unit-ref';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 100 })
  document_type: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  period: string; // e.g., "202602", "202601-03", "2026"

  @Column({ type: 'varchar', length: 4, nullable: true })
  year: string;

  /** FK to reportorial_document_types — null for legacy/seeded documents */
  @Column({ type: 'int', nullable: true })
  reportorial_doc_type_id: number;

  @ManyToOne(() => ReportorialDocumentType, { onDelete: 'SET NULL', nullable: true, eager: false })
  @JoinColumn({ name: 'reportorial_doc_type_id' })
  reportorialDocType: ReportorialDocumentType;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  status: DocumentStatus;

  @Column({ type: 'int', default: 1 })
  current_version: number;

  @Column({ type: 'text', nullable: true })
  extracted_text: string;

  @Column({ type: 'longblob', nullable: true, select: false })
  file_blob?: Buffer;

  @Column({ type: 'int' })
  unit_id: number;

  // Virtual field populated via UnitsHttpClient
  unit?: UnitRef;

  @Column({ type: 'int', nullable: true })
  uploaded_by: number;

  // Virtual field populated via UsersHttpClient
  uploader?: UserRef;

  @OneToMany(() => DocumentVersion, (version) => version.document, {
    cascade: true,
  })
  versions: DocumentVersion[];

  // Many-to-many with issuances (lazy load to avoid circular dependency)
  @ManyToMany('Issuance', 'documents')
  issuances: any[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;
}
