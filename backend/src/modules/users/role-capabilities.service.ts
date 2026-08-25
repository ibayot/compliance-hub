import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleCapability } from './entities/role-capability.entity';
import { RoleDefinitionEntity } from './entities/role-definition.entity';

/**
 * Startup-cached service for role capability lookups.
 * Loads all role_capabilities rows into memory on module init.
 * Replaces every hardcoded role-array constant scattered across services.
 *
 * Usage: inject RoleCapabilitiesService and call boolean helpers like
 *   isFocal(role), isIto(role), isTechnician(role), isSeniorTech(role)
 *
 * The underlying table lives in compliance_hub_users; other DBs expose it as a VIEW.
 * If the VIEW/table is not yet created (first deploy before migration), the cache
 * stays empty and all checks return false — non-fatal.
 */
@Injectable()
export class RoleCapabilitiesService implements OnModuleInit {
  private readonly logger = new Logger(RoleCapabilitiesService.name);
  private readonly cache = new Map<string, RoleCapability>();
  private readonly roleOrder = new Map<string, number>();

  constructor(
    @InjectRepository(RoleCapability)
    private readonly repo: Repository<RoleCapability>,
    @InjectRepository(RoleDefinitionEntity)
    private readonly roleDefinitionsRepo: Repository<RoleDefinitionEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  /** Reload the in-memory cache from DB. Call after any write to role_capabilities. */
  async reload(): Promise<void> {
    try {
      // role_definitions is the source of truth for which roles exist. A role
      // added directly to the database receives a default-disabled capability
      // row on reload without changing existing capability values.
      let roleDefinitions: RoleDefinitionEntity[] = [];
      try {
        roleDefinitions = await this.roleDefinitionsRepo.find({ order: { label: 'ASC', value: 'ASC' } });
        roleDefinitions.sort((a, b) =>
          String(a.label || a.value).localeCompare(String(b.label || b.value)) ||
          String(a.value).localeCompare(String(b.value)),
        );
        await this.ensureRowsForRoleDefinitions(roleDefinitions);
      } catch (err: any) {
        // Keep startup non-fatal if an older staging database has not exposed
        // role_definitions to this service yet.
        this.logger.warn(`Role definition synchronization skipped: ${err?.message}`);
      }

      const rows = await this.repo.find();
      this.cache.clear();
      this.roleOrder.clear();
      roleDefinitions.forEach((role, index) => this.roleOrder.set(role.value, index));
      for (const row of rows) {
        this.cache.set(row.roleValue, row);
      }
      this.logger.log(`RoleCapabilities cache loaded: ${rows.length} role(s)`);
    } catch (err: any) {
      this.logger.warn(
        `RoleCapabilities cache load failed (non-fatal — run v0.0.31 migration): ${err?.message}`,
      );
    }
  }

  private async ensureRowsForRoleDefinitions(roleDefinitions: RoleDefinitionEntity[]): Promise<void> {
    if (roleDefinitions.length === 0) return;

    const existingRows = await this.repo.find();
    const existingValues = new Set(existingRows.map((row) => row.roleValue));
    const missingRows = roleDefinitions
      .filter((role) => !existingValues.has(role.value))
      .map((role) => this.repo.create({ roleValue: role.value }));

    if (missingRows.length > 0) {
      await this.repo.save(missingRows);
      this.logger.log(`RoleCapabilities rows synchronized: added ${missingRows.length} role(s)`);
    }
  }

  private get(role: string): RoleCapability | undefined {
    return this.cache.get(role);
  }

  // ── Boolean helpers ──────────────────────────────────────────────────────

  /** True for all focal-equivalent roles (compliance access, document access). */
  isFocal(role: string): boolean {
    return !!this.get(role)?.isFocal;
  }

  /**
   * True for non-technician ITO professional staff.
   * Used specifically for attendance ITO-group segregation.
   */
  isIto(role: string): boolean {
    return !!this.get(role)?.isIto;
  }

  /** True for roles handling desktop/hardware support tickets. */
  isDesktop(role: string): boolean {
    return !!this.get(role)?.isDesktop;
  }

  /** True for roles handling IT/software support tickets. */
  isItSupport(role: string): boolean {
    return !!this.get(role)?.isItSupport;
  }

  /** True for the Pantawid ICT specialization role. */
  isPantawidIct(role: string): boolean {
    return !!this.get(role)?.isPantawidIct;
  }

  /** True for roles that may receive escalated tickets. */
  isEscalationFocal(role: string): boolean {
    return !!this.get(role)?.isEscalationFocal;
  }

  /**
   * True for any technician role (desktop, IT support, or Pantawid ICT).
   * Junior and senior variants both return true.
   */
  isTechnician(role: string): boolean {
    const c = this.get(role);
    return !!(c?.isDesktop || c?.isItSupport || c?.isPantawidIct);
  }

  /**
   * True for SENIOR technicians only (desktop_sr, it_support_sr).
   * Derived: isFocal AND (isDesktop OR isItSupport).
   * These roles are excluded from auto-ticket-assignment (they self-assign via admin UI).
   */
  isSeniorTech(role: string): boolean {
    const c = this.get(role);
    return !!c && !!c.isFocal && (!!c.isDesktop || !!c.isItSupport);
  }

  /**
   * True for desktop SENIOR technician specifically.
   * Used for attendance scope restriction checks.
   */
  isSeniorDesktop(role: string): boolean {
    const c = this.get(role);
    return !!c && !!c.isFocal && !!c.isDesktop;
  }

  /**
   * True for IT support SENIOR technician specifically.
   * Used for attendance scope restriction checks.
   */
  isSeniorItSupport(role: string): boolean {
    const c = this.get(role);
    return !!c && !!c.isFocal && !!c.isItSupport;
  }

  // ── Bulk query helpers ───────────────────────────────────────────────────

  /** True for roles with full ticket settings / ticket reports management access. */
  isTicketSettingsFocal(role: string): boolean {
    return !!this.get(role)?.isTicketSettingsFocal;
  }

  isSmtpSettingsAccess(role: string): boolean {
    return !!this.get(role)?.isSmtpSettingsAccess;
  }

  isGlobalSettingsAccess(role: string): boolean {
    return !!this.get(role)?.isGlobalSettingsAccess;
  }

  isSecuritySettingsAccess(role: string): boolean {
    return !!this.get(role)?.isSecuritySettingsAccess;
  }

  /**
   * True if the role can see all tickets in the system (not just own-submitted/assigned).
   * DB-driven via is_all_tickets column (replaces previous derived logic).
   */
  isAllTickets(role: string): boolean {
    return !!this.get(role)?.isAllTickets;
  }

  /**
   * True if the role can manually assign/reassign tickets.
   * DB-driven via is_ticket_focal column (replaces previous derived logic).
   */
  isTicketFocal(role: string): boolean {
    return !!this.get(role)?.isTicketFocal;
  }
  isTicketModuleAccess(role: string): boolean { return !!this.get(role)?.isTicketModuleAccess; }

  isKpiAccess(role: string): boolean {
    return !!this.get(role)?.isKpiAccess;
  }

  isKpiManage(role: string): boolean {
    return !!this.get(role)?.isKpiManage;
  }

  isAttendanceAccess(role: string): boolean {
    return !!this.get(role)?.isAttendanceAccess;
  }

  isAttendanceManage(role: string): boolean {
    return !!this.get(role)?.isAttendanceManage;
  }

  isReportsAccess(role: string): boolean {
    return !!this.get(role)?.isReportsAccess;
  }

  isReviewsAccess(role: string): boolean {
    return !!this.get(role)?.isReviewsAccess;
  }

  isMovAccess(role: string): boolean {
    return !!this.get(role)?.isMovAccess;
  }

  isDocumentsAccess(role: string): boolean {
    return !!this.get(role)?.isDocumentsAccess;
  }

  isRepositoryAccess(role: string): boolean {
    return !!this.get(role)?.isRepositoryAccess;
  }

  isIssuancesAccess(role: string): boolean {
    return !!this.get(role)?.isIssuancesAccess;
  }

  isMetricsAccess(role: string): boolean {
    return !!this.get(role)?.isMetricsAccess;
  }

  isRoleCapabilitiesAccess(role: string): boolean {
    return !!this.get(role)?.isRoleCapabilitiesAccess;
  }

  isSystemRolesAccess(role: string): boolean {
    return !!this.get(role)?.isSystemRolesAccess;
  }

  isUserManagementAdmin(role: string): boolean {
    return !!this.get(role)?.isUserManagementAdmin;
  }

  isUserManagementView(role: string): boolean {
    return !!this.get(role)?.isUserManagementView;
  }

  isDutyViewerAccess(role: string): boolean {
    return !!this.get(role)?.isDutyViewerAccess;
  }

  isDutyAdminAccess(role: string): boolean {
    return !!this.get(role)?.isDutyAdminAccess;
  }

  isAttendanceEligible(role: string): boolean {
    return !!this.get(role)?.isAttendanceEligible;
  }

  isAuditAccess(role: string): boolean { return !!this.get(role)?.isAuditAccess; }
  isUnitsAccess(role: string): boolean { return !!this.get(role)?.isUnitsAccess; }
  isUnitsManage(role: string): boolean { return !!this.get(role)?.isUnitsManage; }
  isDocumentTypesManage(role: string): boolean { return !!this.get(role)?.isDocumentTypesManage; }
  isMetricsManage(role: string): boolean { return !!this.get(role)?.isMetricsManage; }
  isUserManagementRolesManage(role: string): boolean {
    return !!this.get(role)?.isUserManagementRolesManage;
  }
  isDocumentsManage(role: string): boolean { return !!this.get(role)?.isDocumentsManage; }
  isDocumentsDelete(role: string): boolean { return !!this.get(role)?.isDocumentsDelete; }
  isIssuancesManage(role: string): boolean { return !!this.get(role)?.isIssuancesManage; }
  isMetricsDelete(role: string): boolean { return !!this.get(role)?.isMetricsDelete; }

  /** Return all role values that have a given capability set to true. */
  getRolesWhere(
    capability:
      | 'isFocal'
      | 'isIto'
      | 'isDesktop'
      | 'isItSupport'
      | 'isPantawidIct'
      | 'isEscalationFocal'
      | 'isTicketSettingsFocal'
      | 'isSmtpSettingsAccess'
      | 'isGlobalSettingsAccess'
      | 'isSecuritySettingsAccess'
      | 'isAllTickets'
      | 'isTicketFocal'
      | 'isTicketModuleAccess'
      | 'isKpiAccess'
      | 'isKpiManage'
      | 'isAttendanceAccess'
      | 'isAttendanceManage'
      | 'isReportsAccess'
      | 'isReviewsAccess'
      | 'isMovAccess'
      | 'isDocumentsAccess'
      | 'isRepositoryAccess'
      | 'isIssuancesAccess'
      | 'isMetricsAccess'
      | 'isRoleCapabilitiesAccess'
      | 'isSystemRolesAccess'
      | 'isUserManagementAdmin'
      | 'isUserManagementView'
      | 'isDutyViewerAccess'
      | 'isDutyAdminAccess'
      | 'isAttendanceEligible'
      | 'isAuditAccess'
      | 'isUnitsAccess'
      | 'isUnitsManage'
      | 'isDocumentTypesManage'
      | 'isMetricsManage'
      | 'isUserManagementRolesManage'
      | 'isDocumentsManage'
      | 'isDocumentsDelete'
      | 'isIssuancesManage'
      | 'isMetricsDelete',
  ): string[] {
    return [...this.cache.values()].filter((r) => r[capability]).map((r) => r.roleValue);
  }

  /** Return all senior tech role values (isFocal + isDesktop or isItSupport). */
  getSeniorTechRoles(): string[] {
    return [...this.cache.values()]
      .filter((r) => r.isFocal && (r.isDesktop || r.isItSupport))
      .map((r) => r.roleValue);
  }

  /** Return all technician role values (any of isDesktop, isItSupport, isPantawidIct). */
  getTechnicianRoles(): string[] {
    return [...this.cache.values()]
      .filter((r) => r.isDesktop || r.isItSupport || r.isPantawidIct)
      .map((r) => r.roleValue);
  }

  // ── Admin CRUD ─────────────────────────────────────────────────────────────

  /** Return all capability rows in role-definition order, served from cache. */
  findAll(): RoleCapability[] {
    return [...this.cache.values()].sort((a, b) => {
      const aOrder = this.roleOrder.get(a.roleValue) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = this.roleOrder.get(b.roleValue) ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder || a.roleValue.localeCompare(b.roleValue);
    });
  }

  /** Return the capability row for a single role from cache (undefined if not found). */
  findOne(roleValue: string): RoleCapability | undefined {
    return this.cache.get(roleValue);
  }

  /**
   * Persist updated capability flags for a role and reload the cache.
   * Only the fields present in dto are updated (partial update).
   */
  async updateOne(roleValue: string, dto: Partial<RoleCapability>): Promise<RoleCapability> {
    if (!this.cache.has(roleValue)) {
      throw new NotFoundException(`Role capability row not found for role "${roleValue}"`);
    }
    await this.repo.update({ roleValue }, dto);
    await this.reload();
    return this.cache.get(roleValue)!;
  }
}
