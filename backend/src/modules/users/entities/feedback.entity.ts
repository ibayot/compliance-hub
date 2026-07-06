import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  suggestion: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: 'pending' | 'accepted' | 'rejected';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'submitter_id' })
  submitter: User;

  @Column({ name: 'submitter_id', nullable: true })
  submitterId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'acted_by_id' })
  actedBy: User;

  @Column({ name: 'acted_by_id', nullable: true })
  actedById: number | null;
}
