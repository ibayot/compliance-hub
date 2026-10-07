import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Issuance } from './issuance.entity';

@Entity('issuance_sources')
export class IssuanceSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'issuance_id', type: 'varchar', length: 36 })
  issuanceId: string;

  @ManyToOne(() => Issuance, (issuance) => issuance.sources, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'issuance_id' })
  issuance: Issuance;

  @Column({ name: 'source_type', type: 'varchar', length: 40 })
  sourceType: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url: string | null;

  @Column({ name: 'source_organization', type: 'varchar', length: 180, nullable: true })
  sourceOrganization: string | null;

  @Column({ name: 'external_document_id', type: 'varchar', length: 255, nullable: true })
  externalDocumentId: string | null;

  @Column({ name: 'original_file_name', type: 'varchar', length: 255, nullable: true })
  originalFileName: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 120, nullable: true })
  mimeType: string | null;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number | null;

  @Column({ type: 'char', length: 64, nullable: true })
  sha256: string | null;

  @Column({ name: 'file_blob', type: 'longblob', nullable: true, select: false })
  fileBlob: Buffer | null;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ name: 'verified_at', type: 'datetime', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'verified_by', type: 'int', nullable: true })
  verifiedBy: number | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
