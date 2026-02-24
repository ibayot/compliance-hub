import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('incident_daily_snapshots')
export class IncidentDailySnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  snapshot_date: Date;

  @Column({ type: 'time' })
  snapshot_time: string; // '08:00:00' or '17:00:00'

  @Column({ type: 'varchar', length: 10 })
  snapshot_type: string; // 'start' or 'end'

  // Counts by severity
  @Column({ type: 'int', default: 0 })
  low_count: number;

  @Column({ type: 'int', default: 0 })
  medium_count: number;

  @Column({ type: 'int', default: 0 })
  high_count: number;

  @Column({ type: 'int', default: 0 })
  critical_count: number;

  @Column({ type: 'int', default: 0 })
  total_count: number;

  // Counts added since last snapshot (only for 'end' type)
  @Column({ type: 'int', default: 0, nullable: true })
  low_added: number;

  @Column({ type: 'int', default: 0, nullable: true })
  medium_added: number;

  @Column({ type: 'int', default: 0, nullable: true })
  high_added: number;

  @Column({ type: 'int', default: 0, nullable: true })
  critical_added: number;

  @Column({ type: 'int', default: 0, nullable: true })
  total_added: number;

  @CreateDateColumn()
  created_at: Date;
}
