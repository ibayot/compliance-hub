import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('kpi_thresholds')
export class KpiThreshold {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 40, unique: true })
  band: string;

  @Column({ name: 'min_score', type: 'float' })
  minScore: number;

  @Column({ name: 'max_score', type: 'float' })
  maxScore: number;

  @Column({ type: 'varchar', length: 40, nullable: true })
  color: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
