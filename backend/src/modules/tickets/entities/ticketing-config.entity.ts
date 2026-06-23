import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('ticketing_configs')
export class TicketingConfig {
  @PrimaryColumn('int')
  id: number;

  @Column({ name: 'assignment_strategy', type: 'varchar', length: 50, default: 'CURRENT_AUTO' })
  assignmentStrategy: string;

  @Column({ name: 'round_robin_cap_hours', type: 'int', default: 80 })
  roundRobinCapHours: number;

  @Column({ name: 'auto_close_days', type: 'int', default: 3 })
  autoCloseDays: number;

  @Column({ name: 'smtp_host', type: 'varchar', length: 255, nullable: true })
  smtpHost: string | null;

  @Column({ name: 'smtp_port', type: 'int', nullable: true })
  smtpPort: number | null;

  @Column({ name: 'smtp_user', type: 'varchar', length: 255, nullable: true })
  smtpUser: string | null;

  @Column({ name: 'smtp_pass', type: 'varchar', length: 255, nullable: true })
  smtpPass: string | null;

  @Column({ name: 'smtp_from', type: 'varchar', length: 255, nullable: true })
  smtpFrom: string | null;

  @Column({ name: 'smtp_from_name', type: 'varchar', length: 255, nullable: true })
  smtpFromName: string | null;

  @Column({ name: 'primary_smtp_sent_today', type: 'int', default: 0 })
  primarySmtpSentToday: number;

  @Column({ name: 'primary_smtp_last_sent_date', type: 'date', nullable: true })
  primarySmtpLastSentDate: string | null;

  @Column({ name: 'primary_smtp_daily_limit', type: 'int', default: 500 })
  primarySmtpDailyLimit: number;
}
