import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MetricType {
  FIREWALL_STATUS = 'firewall_status',
  ANTIVIRUS_STATUS = 'antivirus_status',
  USER_TRAINING = 'user_training',
  BACKUP_STATUS = 'backup_status',
  PATCH_MANAGEMENT = 'patch_management',
  ACCESS_CONTROL = 'access_control',
  ENCRYPTION = 'encryption',
  INCIDENT_RESPONSE = 'incident_response',
}

export enum MetricStatus {
  COMPLIANT = 'compliant',
  WARNING = 'warning',
  NON_COMPLIANT = 'non_compliant',
  UNKNOWN = 'unknown',
}

@Entity('cybersecurity_metrics')
export class CybersecurityMetric {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: MetricType,
    unique: true,
  })
  metric_type: MetricType;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: MetricStatus,
    default: MetricStatus.UNKNOWN,
  })
  status: MetricStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  value: string; // e.g., "Active", "85% Complete", "Last scan: 2 days ago"

  @Column({ type: 'text', nullable: true })
  details: string; // Additional details or JSON data

  @Column({ type: 'timestamp', nullable: true })
  last_checked: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  api_endpoint: string; // Optional: API endpoint to fetch data

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
