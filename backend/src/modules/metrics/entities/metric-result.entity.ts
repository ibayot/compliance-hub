import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { DocumentVersion } from '../../documents/entities/document-version.entity';
import { MetricTemplate } from './metric-template.entity';

export enum MetricStatus {
  PASS = 'pass',
  FAIL = 'fail',
  WARNING = 'warning',
  ERROR = 'error',
}

@Entity('metric_results')
export class MetricResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  version_id: string;

  @ManyToOne(() => DocumentVersion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'version_id' })
  version: DocumentVersion;

  @Column({ type: 'uuid' })
  metric_template_id: string;

  @ManyToOne(() => MetricTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'metric_template_id' })
  metric_template: MetricTemplate;

  @Column({
    type: 'enum',
    enum: MetricStatus,
  })
  status: MetricStatus;

  @Column({ type: 'json', nullable: true })
  evidence: Record<string, any>;
  // Examples:
  // section_check: { found_sections: ["Introduction"], missing_sections: ["Methodology"] }
  // keyword_check: { matches: [{ keyword: "compliance", count: 5, snippets: [...] }] }
  // property_check: { field_value: "POLICY_ABC.docx", matches: true }
  // date_check: { submitted_date: "2024-01-05", deadline: "2024-01-01", days_late: 4 }

  @Column({ type: 'text', nullable: true })
  message: string; // Human-readable result message

  @Column({ type: 'float', nullable: true })
  score: number; // Normalized score (0-1)

  @CreateDateColumn()
  computed_at: Date;
}
