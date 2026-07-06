import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

export enum MetricType {
  SECTION_CHECK = 'section_check',
  KEYWORD_CHECK = 'keyword_check',
  PROPERTY_CHECK = 'property_check',
  DATE_CHECK = 'date_check',
}

@Entity('metric_templates')
export class MetricTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: MetricType,
  })
  metric_type: MetricType;

  @Column({ type: 'json' })
  rule_config: Record<string, any>;
  // Examples:
  // section_check: { required_sections: ["Introduction", "Methodology"] }
  // keyword_check: { keywords: ["compliance", "RICTMS"], min_count: 2 }
  // property_check: { field: "fileName", pattern: "^POLICY_.*\\.docx$" }
  // date_check: { max_days_late: 5 }

  @Column({ type: 'json' })
  pass_criteria: Record<string, any>;
  // Examples:
  // section_check: { all_present: true }
  // keyword_check: { min_matches: 2 }
  // property_check: { matches_pattern: true }
  // date_check: { within_deadline: true }

  @Column({ type: 'int', default: 1 })
  weight: number; // For weighted scoring

  @OneToMany('MetricApplicability', (applicability: any) => applicability.metric_template, {
    cascade: true,
  })
  applicability: any[];

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
