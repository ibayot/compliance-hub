import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { MetricTemplate } from './metric-template.entity';
import { Unit } from '../../units/entities/unit.entity';
import { ReportorialDocumentType } from '../../documents/entities/reportorial-document-type.entity';

@Entity('metric_applicability')
export class MetricApplicability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  metric_id: string;

  @ManyToOne(() => MetricTemplate, (template) => template.applicability, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'metric_id' })
  metric_template: MetricTemplate;

  @Column({ type: 'int', nullable: true })
  unit_id: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  document_type: string;

  /** FK to reportorial_document_types — preferred over unit_id+document_type for new metrics */
  @Column({ type: 'int', nullable: true })
  reportorial_doc_type_id: number;

  @ManyToOne(() => ReportorialDocumentType, { onDelete: 'SET NULL', nullable: true, eager: false })
  @JoinColumn({ name: 'reportorial_doc_type_id' })
  reportorialDocType: ReportorialDocumentType;

  // If both unit_id, document_type, and reportorial_doc_type_id are null, the metric applies globally
}
