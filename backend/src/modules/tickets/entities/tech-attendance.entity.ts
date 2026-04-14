import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  HALF_DAY = 'half_day',
  OUT_OF_OFFICE = 'out_of_office',
}

@Entity('attendance')
@Unique(['userId', 'date'])
export class TechAttendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** YYYY-MM-DD */
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 20, default: AttendanceStatus.PRESENT })
  status: AttendanceStatus;

  @Column({ name: 'set_by_id', type: 'int', nullable: true })
  setById: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'set_by_id' })
  setBy: User | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
