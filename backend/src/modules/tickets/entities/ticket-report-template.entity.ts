import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { ReportConfiguration } from '../services/ticket-report-builder.contract';

@Entity('ticket_report_templates')
@Index('uq_ticket_report_template_owner_name', ['ownerId', 'name'], { unique: true })
export class TicketReportTemplate {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'owner_id', type: 'int' }) ownerId: number;
  @Column({ type: 'varchar', length: 80 }) name: string;
  @Column({ type: 'simple-json' }) configuration: ReportConfiguration;
  @Column({ type: 'int', default: 1 }) revision: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
