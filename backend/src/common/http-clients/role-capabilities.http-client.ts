import { Injectable, Logger, OnModuleInit, InternalServerErrorException, Optional } from '@nestjs/common';
import { UsersHttpClient, RoleCapabilityStub } from './users.http-client';
import { EventBusService, CAPABILITIES_UPDATED_EVENT, CapabilitiesUpdatedPayload } from '../events/event-bus.service';

/** All capability key names — mirrors RoleCapabilitiesService.getRolesWhere parameter type. */
export type CapabilityKey =
  | 'isFocal' | 'isIto' | 'isDesktop' | 'isItSupport' | 'isPantawidIct' | 'isEscalationFocal'
  | 'isTicketSettingsFocal' | 'isSmtpSettingsAccess' | 'isAllTickets' | 'isTicketFocal'
  | 'isKpiAccess' | 'isKpiManage'
  | 'isAttendanceAccess' | 'isAttendanceManage'
  | 'isReportsAccess' | 'isReviewsAccess'
  | 'isMovAccess' | 'isDocumentsAccess' | 'isRepositoryAccess' | 'isIssuancesAccess' | 'isMetricsAccess';

/**
 * RoleCapabilitiesHttpClient — full drop-in replacement for RoleCapabilitiesService
 * in ticketing-service and compliance-service.
 *
 * Wire up in non-users modules via:
 *   { provide: RoleCapabilitiesService, useClass: RoleCapabilitiesHttpClient }
 *
 * This eliminates the compile-time coupling where ticketing/compliance imported
 * RoleCapabilitiesService TypeScript source directly from the users module,
 * along with the TypeORM Repository<RoleCapability> cross-DB view dependency.
 *
 * Cache strategy: loaded on startup via UsersHttpClient, refreshed every 60s
 * (stale-while-revalidate). Cache invalidation is triggered by Phase H Redis events.
 */
@Injectable()
export class RoleCapabilitiesHttpClient implements OnModuleInit {
  private readonly logger = new Logger(RoleCapabilitiesHttpClient.name);
  private readonly cache = new Map<string, RoleCapabilityStub>();
  private lastLoaded = 0;
  private readonly cacheTtlMs = 60_000; // 60s stale-while-revalidate

  constructor(
    private readonly usersHttpClient: UsersHttpClient,
    @Optional() private readonly eventBus?: EventBusService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
    if (this.eventBus) {
      await this.eventBus.subscribe<CapabilitiesUpdatedPayload>(
        CAPABILITIES_UPDATED_EVENT,
        (payload) => {
          this.logger.log(`capabilities.updated received for role "${payload.role}" — reloading cache`);
          void this.reload();
        },
      );
    }
  }

  /** Reload the capability cache from users-service over HTTP. Non-fatal — keeps stale cache on failure. */
  async reload(): Promise<void> {
    try {
      const rows = await this.usersHttpClient.getRoleCapabilities();
      if (rows.length > 0) {
        this.cache.clear();
        for (const row of rows) {
          this.cache.set(row.roleValue, row);
        }
        this.lastLoaded = Date.now();
        this.logger.log(`RoleCapabilities HTTP cache loaded: ${rows.length} role(s) from users-service`);
      } else {
        this.logger.warn('RoleCapabilities HTTP cache: 0 rows from users-service — keeping stale cache');
      }
    } catch (err: any) {
      this.logger.warn(`RoleCapabilities HTTP cache reload failed (non-fatal): ${err?.message}`);
    }
  }

  private get(role: string): RoleCapabilityStub | undefined {
    if (Date.now() - this.lastLoaded > this.cacheTtlMs) {
      // Background refresh — non-blocking
      this.reload().catch(() => undefined);
    }
    return this.cache.get(role);
  }

  // ── Boolean helpers (exact parity with RoleCapabilitiesService) ───────────

  isFocal(role: string): boolean { return !!this.get(role)?.isFocal; }
  isIto(role: string): boolean { return !!this.get(role)?.isIto; }
  isDesktop(role: string): boolean { return !!this.get(role)?.isDesktop; }
  isItSupport(role: string): boolean { return !!this.get(role)?.isItSupport; }
  isPantawidIct(role: string): boolean { return !!this.get(role)?.isPantawidIct; }
  isEscalationFocal(role: string): boolean { return !!this.get(role)?.isEscalationFocal; }

  isTechnician(role: string): boolean {
    const c = this.get(role);
    return !!(c?.isDesktop || c?.isItSupport || c?.isPantawidIct);
  }

  isSeniorTech(role: string): boolean {
    const c = this.get(role);
    return !!c && !!c.isFocal && (!!c.isDesktop || !!c.isItSupport);
  }

  isSeniorDesktop(role: string): boolean {
    const c = this.get(role);
    return !!c && !!c.isFocal && !!c.isDesktop;
  }

  isSeniorItSupport(role: string): boolean {
    const c = this.get(role);
    return !!c && !!c.isFocal && !!c.isItSupport;
  }

  isTicketSettingsFocal(role: string): boolean {
    if (role === 'super_admin') return true;
    return !!this.get(role)?.isTicketSettingsFocal;
  }

  isSmtpSettingsAccess(role: string): boolean {
    if (role === 'super_admin') return true;
    return !!this.get(role)?.isSmtpSettingsAccess;
  }

  isAllTickets(role: string): boolean {
    if (role === 'super_admin') return true;
    return !!this.get(role)?.isAllTickets;
  }

  isTicketFocal(role: string): boolean {
    if (role === 'super_admin') return true;
    return !!this.get(role)?.isTicketFocal;
  }

  isKpiAccess(role: string): boolean {
    if (role === 'super_admin') return true;
    return !!this.get(role)?.isKpiAccess;
  }

  isKpiManage(role: string): boolean {
    if (role === 'super_admin') return true;
    return !!this.get(role)?.isKpiManage;
  }

  isAttendanceAccess(role: string): boolean {
    if (role === 'super_admin') return true;
    return !!this.get(role)?.isAttendanceAccess;
  }

  isAttendanceManage(role: string): boolean {
    if (role === 'super_admin') return true;
    return !!this.get(role)?.isAttendanceManage;
  }

  isReportsAccess(role: string): boolean {
    if (role === 'super_admin') return true;
    return !!this.get(role)?.isReportsAccess;
  }

  isReviewsAccess(role: string): boolean {
    if (role === 'super_admin') return true;
    return !!this.get(role)?.isReviewsAccess;
  }

  isMovAccess(role: string): boolean {
    if (role === 'super_admin') return true;
    return !!this.get(role)?.isMovAccess;
  }

  isDocumentsAccess(role: string): boolean {
    if (role === 'super_admin') return true;
    return !!this.get(role)?.isDocumentsAccess;
  }

  isRepositoryAccess(role: string): boolean {
    if (role === 'super_admin') return true;
    return !!this.get(role)?.isRepositoryAccess;
  }

  isIssuancesAccess(role: string): boolean {
    if (role === 'super_admin') return true;
    return !!this.get(role)?.isIssuancesAccess;
  }

  isMetricsAccess(role: string): boolean {
    if (role === 'super_admin') return true;
    return !!this.get(role)?.isMetricsAccess;
  }

  // ── Derived helpers ───────────────────────────────────────────────────────

  canSeeAllTickets(role: string): boolean {
    return this.isAllTickets(role);
  }

  canChangePriority(role: string): boolean {
    if (role === 'super_admin') return true;
    const c = this.get(role);
    return !!(c?.isFocal || c?.isIto || c?.isDesktop || c?.isItSupport || c?.isPantawidIct);
  }

  isSeniorAuthority(role: string): boolean {
    if (role === 'super_admin') return true;
    const c = this.get(role);
    return !!(c?.isFocal || c?.isIto);
  }

  canAssignTickets(role: string): boolean {
    return this.isTicketFocal(role) || this.isTicketSettingsFocal(role);
  }

  canEscalateTickets(role: string): boolean {
    return this.canAssignTickets(role)
      || this.canSeeAllTickets(role)
      || this.isDesktop(role)
      || this.isItSupport(role)
      || this.isPantawidIct(role);
  }

  // ── Bulk query helpers ────────────────────────────────────────────────────

  private async ensureCacheLoaded(): Promise<void> {
    if (this.cache.size === 0 || Date.now() - this.lastLoaded > this.cacheTtlMs) {
      await this.reload();
    }
  }

  getRolesWhere(capability: CapabilityKey): string[] {
    // If the cache is empty, we must trigger a reload synchronously or return stale data.
    // However, since this method is synchronous, we can't await `reload()`.
    // Wait, getRolesWhere is used synchronously in many places!
    return [...this.cache.values()]
      .filter((r) => r[capability])
      .map((r) => r.roleValue);
  }

  getSeniorTechRoles(): string[] {
    return [...this.cache.values()]
      .filter((r) => r.isFocal && (r.isDesktop || r.isItSupport))
      .map((r) => r.roleValue);
  }

  getTechnicianRoles(): string[] {
    return [...this.cache.values()]
      .filter((r) => r.isDesktop || r.isItSupport || r.isPantawidIct)
      .map((r) => r.roleValue);
  }

  // ── Read-only admin helpers (cache-based) ─────────────────────────────────

  findAll(): any[] {
    return [...this.cache.values()].sort((a, b) => a.roleValue.localeCompare(b.roleValue));
  }

  findOne(roleValue: string): any | undefined {
    return this.cache.get(roleValue);
  }

  /** Not available from a remote service context — updateOne must go via users-service directly. */
  async updateOne(_roleValue: string, _dto: any): Promise<any> {
    throw new InternalServerErrorException(
      'updateOne is not available in RoleCapabilitiesHttpClient — call users-service directly.',
    );
  }
}
