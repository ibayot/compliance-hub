import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum AuditAction {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'app_name', type: 'varchar', length: 100 })
  appName: string;

  @Column({ name: 'entity_name', type: 'varchar', length: 100 })
  entityName: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 100 })
  entityId: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ name: 'actor_id', type: 'int', nullable: true })
  actorId: number | null;

  @Column({ name: 'actor_email', type: 'varchar', length: 255, nullable: true })
  actorEmail: string | null;

  @Column({ name: 'old_values', type: 'json', nullable: true })
  oldValues: any;

  @Column({ name: 'new_values', type: 'json', nullable: true })
  newValues: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
