import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UsersHttpClient, RoleCapabilityStub } from './users.http-client';

/**
 * RoleCapabilitiesHttpClient — HTTP-sourced role capability cache.
 *
 * This is the Phase B replacement for the in-process RoleCapabilitiesService
 * that is currently duplicated across ticketing and compliance services by
 * importing it directly from the users TypeScript source.
 *
 * Usage:
 *  - Inject this service instead of RoleCapabilitiesService in ticketing and compliance modules.
 *  - The cache is seeded from users-service on startup via UsersHttpClient.
 *  - TTL: 30s stale-while-revalidate. On cache miss or expired, returns the last known value
 *    rather than failing outright (graceful degradation).
 *  - When users-service publishes a Redis pub/sub 'capabilities.updated' event (Phase H),
 *    call reload() to flush the cache.
 *
 * Why this exists:
 *  The old pattern imports RoleCapabilitiesService TypeScript class and the RoleCapability
 *  TypeORM entity across service boundaries — this means both services compile against
 *  the same entity class, and ticketing/compliance query the role_capabilities cross-DB view
 *  directly at SQL level. This new client queries the users-service HTTP API instead,
 *  removing the TypeORM view dependency and the shared TypeScript class compilation.
 *
 * Migration status: READY FOR USE — not yet wired into ticketing/compliance modules.
 *  This is Phase B of ARCHITECTURE-AUDIT-v2.md.
 */
@Injectable()
export class RoleCapabilitiesHttpClient implements OnModuleInit {
  private readonly logger = new Logger(RoleCapabilitiesHttpClient.name);
  private readonly cache = new Map<string, RoleCapabilityStub>();
  private lastLoaded = 0;
  private readonly cacheTtlMs = 30_000; // 30s stale-while-revalidate

  constructor(private readonly usersHttpClient: UsersHttpClient) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  /**
   * (Re)load the capability cache from users-service.
   * Non-fatal: if the request fails, the previous cache is kept (stale-while-revalidate).
   */
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
        this.logger.warn('RoleCapabilities HTTP cache: users-service returned 0 rows or is unreachable — keeping stale cache');
      }
    } catch (err: any) {
      this.logger.warn(`RoleCapabilities HTTP cache reload failed (non-fatal): ${err?.message}`);
    }
  }

  private get(role: string): RoleCapabilityStub | undefined {
    // Background refresh if cache is stale (non-blocking — returns current value immediately)
    if (Date.now() - this.lastLoaded > this.cacheTtlMs) {
      this.reload().catch(() => undefined);
    }
    return this.cache.get(role);
  }

  // ── Boolean helpers — same surface as RoleCapabilitiesService ─────────────

  isFocal(role: string): boolean {
    return !!this.get(role)?.isFocal;
  }

  isIto(role: string): boolean {
    return !!this.get(role)?.isIto;
  }

  isDesktop(role: string): boolean {
    return !!this.get(role)?.isDesktop;
  }

  isItSupport(role: string): boolean {
    return !!this.get(role)?.isItSupport;
  }

  isPantawidIct(role: string): boolean {
    return !!this.get(role)?.isPantawidIct;
  }

  isEscalationFocal(role: string): boolean {
    return !!this.get(role)?.isEscalationFocal;
  }

  isTechnician(role: string): boolean {
    const c = this.get(role);
    return !!(c?.isDesktop || c?.isItSupport || c?.isPantawidIct);
  }

  isSeniorTech(role: string): boolean {
    const c = this.get(role);
    return !!c && !!c.isFocal && (!!c.isDesktop || !!c.isItSupport);
  }
}
