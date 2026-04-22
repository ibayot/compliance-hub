import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Stores a boolean capability matrix for every role in the system.
 * One row per role_value. Read-only at runtime — modified only via SQL migrations.
 *
 * This table is the BASE TABLE in compliance_hub_users and exposed as a VIEW
 * in compliance_hub_ticketing and compliance_hub.
 */
@Entity('role_capabilities')
export class RoleCapability {
  @PrimaryGeneratedColumn()
  id: number;

  /** Matches role_definitions.value (e.g. 'desktop_sr', 'compliance_officer') */
  @Column({ name: 'role_value', type: 'varchar', length: 50, unique: true })
  roleValue: string;

  /**
   * True for roles with compliance document access and focal-equivalent permissions.
   * Covers: all named ITO staff, compliance_officer, cybersec, infosec, section_head,
   *         desktop_sr, it_support_sr, pantawid_ict (elevated via Sub-Q).
   */
  @Column({ name: 'is_focal', type: 'tinyint', width: 1, default: 0 })
  isFocal: boolean;

  /** True for roles that handle desktop/hardware support tickets. */
  @Column({ name: 'is_desktop', type: 'tinyint', width: 1, default: 0 })
  isDesktop: boolean;

  /** True for roles that handle IT/software support tickets. */
  @Column({ name: 'is_it_support', type: 'tinyint', width: 1, default: 0 })
  isItSupport: boolean;

  /** True for roles that handle Pantawid ICT support tickets. */
  @Column({ name: 'is_pantawid_ict', type: 'tinyint', width: 1, default: 0 })
  isPantawidIct: boolean;

  /**
   * True for non-technician ITO professional staff.
   * Used for attendance group segregation (the "ITO Staff" grid row group).
   * Does NOT include desktop_sr/it_support_sr/pantawid_ict — those have their own tech group.
   */
  @Column({ name: 'is_ito', type: 'tinyint', width: 1, default: 0 })
  isIto: boolean;

  /**
   * True for roles that may receive escalated tickets (shown as escalation focal options).
   * Includes: section_head, compliance_officer, cybersec, infosec, desktop_sr, it_support_sr.
   */
  @Column({ name: 'is_escalation_focal', type: 'tinyint', width: 1, default: 0 })
  isEscalationFocal: boolean;

  /**
   * True for roles that have full ticket-settings management access and full ticket-reports view.
   * Roles without this flag see only their own assigned tickets and simplified pie charts.
   * Includes: super_admin, section_head, compliance_officer, cybersec, infosec, desktop_sr, it_support_sr, pantawid_ict.
   */
  @Column({ name: 'is_ticket_settings_focal', type: 'tinyint', width: 1, default: 0 })
  isTicketSettingsFocal: boolean;

  /**
   * True for roles that can see ALL tickets in the system (not restricted to own-submitted/assigned).
   * Replaces the derived canSeeAllTickets() logic — now DB-configurable per role.
   * Includes: super_admin, section_head, compliance_officer, cybersec, infosec, desktop_sr, it_support_sr, pantawid_ict.
   */
  @Column({ name: 'is_all_tickets', type: 'tinyint', width: 1, default: 0 })
  isAllTickets: boolean;

  /**
   * True for roles that can manually assign/reassign tickets to any technician.
   * Replaces the derived canAssignTickets() logic — now DB-configurable per role.
   * Includes: super_admin, section_head, compliance_officer, cybersec, infosec, desktop_sr, it_support_sr, pantawid_ict.
   */
  @Column({ name: 'is_ticket_focal', type: 'tinyint', width: 1, default: 0 })
  isTicketFocal: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
