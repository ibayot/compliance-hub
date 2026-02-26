import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('kpi_scoring_rules')
export class KpiScoringRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 80, default: 'default' })
  name: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ name: 'cap_score', type: 'float', default: 100 })
  capScore: number;

  @Column({ name: 'floor_score', type: 'float', default: 0 })
  floorScore: number;

  @Column({ name: 'yes_score', type: 'float', default: 100 })
  yesScore: number;

  @Column({ name: 'no_score', type: 'float', default: 0 })
  noScore: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
