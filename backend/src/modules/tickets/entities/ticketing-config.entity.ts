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

  @Column({ name: 'schedule_mode', type: 'varchar', length: 20, default: 'OFFICE_HOURS' })
  scheduleMode: string;

  @Column({ name: 'office_clockin', type: 'time', default: '08:00:00' })
  officeClockin: string;

  @Column({ name: 'office_clockout', type: 'time', default: '17:00:00' })
  officeClockout: string;

  @Column({ name: 'cww_clockin_start', type: 'time', default: '07:00:00' })
  cwwClockinStart: string;

  @Column({ name: 'cww_clockin_end', type: 'time', default: '08:00:00' })
  cwwClockinEnd: string;

  @Column({ name: 'cww_clockout_start', type: 'time', default: '18:00:00' })
  cwwClockoutStart: string;

  @Column({ name: 'cww_clockout_end', type: 'time', default: '19:00:00' })
  cwwClockoutEnd: string;

  @Column({ name: 'is_flag_ceremony_paused', type: 'boolean', default: false })
  isFlagCeremonyPaused: boolean;
}
