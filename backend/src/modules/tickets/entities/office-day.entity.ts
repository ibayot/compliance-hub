import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../shared/entities';

@Entity('office_days')
export class OfficeDay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** YYYY-MM-DD */
  @Column({ type: 'date', unique: true })
  date: string;

  @Column({ name: 'is_office_day', type: 'boolean', default: true })
  isOfficeDay: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'set_by_id', type: 'int', nullable: true })
  setById: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'set_by_id' })
  setBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
