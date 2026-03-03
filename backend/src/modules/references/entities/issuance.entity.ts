import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Document } from '../../documents/entities/document.entity';

@Entity('issuances')
export class Issuance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  issuance_number: string; // e.g., "CMO-2023-001"

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  issuance_type: string; // law, circular, memorandum, irr, standard, guideline

  @Column({ type: 'text', nullable: true })
  applicability_scope: string;

  @Column({ type: 'text', nullable: true })
  relevance_notes: string;

  @Column({ type: 'boolean', default: false })
  is_amendment: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  amended_issuance_number: string;

  @Column({ type: 'text', nullable: true })
  ict_amendment_notes: string;

  @Column({ type: 'varchar', length: 100 })
  issuing_authority: string; // e.g., "CHED", "DBM", "CSC"

  @Column({ type: 'date' })
  issue_date: Date;

  @Column({ type: 'date', nullable: true })
  effectivity_date: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  source_url: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // Many-to-many relationship with documents
  @ManyToMany(() => Document, (document) => document.issuances)
  @JoinTable({
    name: 'document_issuances',
    joinColumn: { name: 'issuance_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'document_id', referencedColumnName: 'id' },
  })
  documents: Document[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
