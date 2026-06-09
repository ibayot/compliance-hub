import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRef } from '../../../shared/contracts/user-ref';

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum IncidentStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum IncidentCategory {
  SECURITY_BREACH = 'security_breach',
  SYSTEM_OUTAGE = 'system_outage',
  DATA_LOSS = 'data_loss',
  MALWARE = 'malware',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  PHISHING = 'phishing',
  DDOS = 'ddos',
  OTHER = 'other',
}

@Entity('incidents')
export class Incident {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: IncidentCategory,
    default: IncidentCategory.OTHER,
  })
  category: IncidentCategory;

  @Column({
    type: 'enum',
    enum: IncidentSeverity,
    default: IncidentSeverity.MEDIUM,
  })
  severity: IncidentSeverity;

  @Column({
    type: 'enum',
    enum: IncidentStatus,
    default: IncidentStatus.OPEN,
  })
  status: IncidentStatus;

  // Reported by
  @Column({ type: 'int' })
  reported_by_id: number;

  // Virtual enrichment field populated via UsersHttpClient.
  reported_by?: UserRef | null;

  // Assigned to (optional)
  @Column({ type: 'int', nullable: true })
  assigned_to_id: number;

  // Virtual enrichment field populated via UsersHttpClient.
  assigned_to?: UserRef | null;

  @Column({ type: 'text', nullable: true })
  resolution_notes: string;

  @Column({ type: 'timestamp', nullable: true })
  resolved_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
