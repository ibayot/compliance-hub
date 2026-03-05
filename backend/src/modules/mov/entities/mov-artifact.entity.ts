import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('mov_artifacts')
export class MovArtifact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 60 })
  artifact_type: string;

  @Column({ type: 'varchar', length: 30, default: 'regional' })
  scope: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'int' })
  period_year: number;

  @Column({ type: 'int', nullable: true })
  quarter: number | null;

  @Column({ type: 'int', nullable: true })
  unit_id: number | null;

  @Column({ type: 'varchar', length: 30, default: 'draft' })
  status: string;

  @Column({ type: 'longtext' })
  content_markdown: string;

  @Column({ type: 'json', nullable: true })
  metadata_json: Record<string, any> | null;

  @Column({ type: 'int', nullable: true })
  created_by: number | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
