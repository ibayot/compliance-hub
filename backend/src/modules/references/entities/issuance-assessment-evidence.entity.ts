import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { IssuanceAssessment } from './issuance-assessment.entity';

@Entity('issuance_assessment_evidence')
export class IssuanceAssessmentEvidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assessment_id', type: 'varchar', length: 36 })
  assessmentId: string;

  @ManyToOne(() => IssuanceAssessment, (assessment) => assessment.evidence, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessment_id' })
  assessment: IssuanceAssessment;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url: string | null;

  @Column({ name: 'document_id', type: 'varchar', length: 36, nullable: true })
  documentId: string | null;

  @Column({ name: 'document_version_id', type: 'varchar', length: 36, nullable: true })
  documentVersionId: string | null;

  @Column({ name: 'original_file_name', type: 'varchar', length: 255, nullable: true })
  originalFileName: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 120, nullable: true })
  mimeType: string | null;

  @Column({ name: 'file_size', type: 'bigint', unsigned: true, nullable: true })
  fileSize: number | null;

  @Column({ type: 'char', length: 64, nullable: true })
  sha256: string | null;

  @Column({ name: 'file_blob', type: 'longblob', nullable: true, select: false })
  fileBlob?: Buffer | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
