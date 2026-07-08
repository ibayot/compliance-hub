// import {
//   Entity,
//   PrimaryGeneratedColumn,
//   Column,
//   CreateDateColumn,
//   ManyToOne,
//   JoinColumn,
//   Unique,
// } from 'typeorm';
// import { User } from '../../shared/entities';

// /**
//  * Configures which roles may RECEIVE escalated tickets for each ticket type.
//  * Managed via the Ticket Settings page by super_admin / section_head / compliance_officer.
//  * QA #13: role values come from the DB (role_definitions.value) rather than hardcoded enums.
//  */
// @Entity('escalation_focal_configs')
// @Unique(['ticketType', 'roleValue'])
// export class EscalationFocalConfig {
//   @PrimaryGeneratedColumn()
//   id: number;

//   /**
//    * The ticket type this config applies to, or 'all' for any type.
//    * Values: 'desktop_support' | 'it_support' | 'pantawid_ict_support' | 'all'
//    */
//   @Column({ name: 'ticket_type', type: 'varchar', length: 30 })
//   ticketType: string;

//   /** The role value (from role_definitions.value) that is allowed to receive escalations */
//   @Column({ name: 'role_value', type: 'varchar', length: 50 })
//   roleValue: string;

//   /** Human-readable label for display in the UI */
//   @Column({ type: 'varchar', length: 100 })
//   label: string;

//   @Column({ name: 'created_by_id', type: 'int', nullable: true })
//   createdById: number | null;

//   @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
//   @JoinColumn({ name: 'created_by_id' })
//   createdBy: User | null;

//   @CreateDateColumn({ name: 'created_at' })
//   createdAt: Date;
// }


import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../shared/entities';

/**
 * Configures which users may RECEIVE escalated tickets for each ticket type.
 * Managed via the Ticket Settings page by super_admin / section_head / compliance_officer.
 * The focal target stores users.id, not a role code.
 */
@Entity('escalation_focal_configs')
@Unique(['ticketType', 'userId'])
export class EscalationFocalConfig {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * The ticket type this config applies to, or 'all' for any type.
   * Values: 'desktop_support' | 'it_support' | 'pantawid_ict_support' | 'all'
   */
  @Column({ name: 'ticket_type', type: 'varchar', length: 30 })
  ticketType: string;

  /** The user id that is allowed to receive escalations */
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  /** Human-readable label for display in the UI */
  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({ name: 'created_by_id', type: 'int', nullable: true })
  createdById: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}