import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/entities/user.entity';
@Entity('app_releases')
@Index(['version'], { unique: true })
export class AppRelease {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 30 }) version: string;
  @Column({ length: 150 }) title: string;
  @Column({ name: 'end_user_title', length: 150, nullable: true }) endUserTitle: string | null;
  @Column({ name: 'display_days', type: 'int' }) displayDays: number;
  @Column({ length: 20, default: 'draft' }) status: string;
  @Column({ name: 'published_at', type: 'datetime', nullable: true }) publishedAt: Date | null;
  @Column({ name: 'automatic_end_at', type: 'datetime', nullable: true })
  automaticEndAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @OneToMany(() => AppReleaseNote, (n) => n.release, { cascade: true }) notes: AppReleaseNote[];
}
@Entity('app_release_notes')
export class AppReleaseNote {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'release_id', length: 36 }) releaseId: string;
  @ManyToOne(() => AppRelease, (r) => r.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'release_id' })
  release: AppRelease;
  @Column({ length: 30 }) category: string;
  @Column({ length: 20, default: 'capability' }) audience: string;
  @Column({ length: 150 }) title: string;
  @Column({ type: 'text' }) description: string;
  @Column({ name: 'capability_keys', type: 'simple-json' }) capabilityKeys: string[];
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder: number;
}
@Entity('app_release_deliveries')
@Index(['releaseId', 'userId'], { unique: true })
export class AppReleaseDelivery {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'release_id', length: 36 }) releaseId: string;
  @ManyToOne(() => AppRelease, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'release_id' })
  release: AppRelease;
  @Column({ name: 'user_id', type: 'int' }) userId: number;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'user_id' }) user: User;
  @Column({ name: 'first_displayed_at', type: 'datetime', nullable: true })
  firstDisplayedAt: Date | null;
  @Column({ name: 'acknowledged_at', type: 'datetime', nullable: true })
  acknowledgedAt: Date | null;
  @CreateDateColumn({ name: 'eligible_at' }) eligibleAt: Date;
}
