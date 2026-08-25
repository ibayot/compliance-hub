import { Injectable, Logger } from '@nestjs/common';

export interface UserStub {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  role: string;
  staff_id?: string | null;

  units?: any[];
}

export interface RoleCapabilityStub {
  roleValue: string;
  label?: string;
  isFocal: boolean;
  isIto: boolean;
  isDesktop: boolean;
  isItSupport: boolean;
  isPantawidIct: boolean;
  isEscalationFocal: boolean;
  isTicketSettingsFocal: boolean;
  isSmtpSettingsAccess: boolean;
  isGlobalSettingsAccess: boolean;
  isSecuritySettingsAccess: boolean;
  isAllTickets: boolean;
  isTicketFocal: boolean;
  isTicketModuleAccess: boolean;
  isKpiAccess: boolean;
  isKpiManage: boolean;
  isAttendanceAccess: boolean;
  isAttendanceManage: boolean;
  isReportsAccess: boolean;
  isReviewsAccess: boolean;
  isMovAccess: boolean;
  isDocumentsAccess: boolean;
  isRepositoryAccess: boolean;
  isIssuancesAccess: boolean;
  isMetricsAccess: boolean;
  isDutyViewerAccess: boolean;
  isDutyAdminAccess: boolean;
  isAttendanceEligible: boolean;
  isAuditAccess: boolean;
  isUnitsAccess: boolean;
  isUnitsManage: boolean;
  isDocumentTypesManage: boolean;
  isMetricsManage: boolean;
  isUserManagementRolesManage: boolean;
  isDocumentsManage: boolean;
  isDocumentsDelete: boolean;
  isIssuancesManage: boolean;
  isMetricsDelete: boolean;
}

/** Circuit breaker states for inter-service calls. */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Lightweight circuit breaker per HTTP client instance.
 * - CLOSED  → calls pass through normally
 * - OPEN    → calls are short-circuited (return null immediately) after OPEN_THRESHOLD consecutive failures
 * - HALF_OPEN → one probe call is allowed after RESET_TIMEOUT_MS; resets state on success
 */
class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private openedAt = 0;
  private readonly openThreshold = 5;
  private readonly resetTimeoutMs = 30_000;

  isOpen(): boolean {
    if (this.state === 'OPEN') {
      if (Date.now() - this.openedAt >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        return false; // allow one probe
      }
      return true;
    }
    return false; // CLOSED or HALF_OPEN
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    if (this.state !== 'CLOSED') {
      this.state = 'CLOSED';
    }
  }

  recordFailure(logger: Logger, name: string): void {
    this.consecutiveFailures++;
    if (this.state === 'HALF_OPEN' || this.consecutiveFailures >= this.openThreshold) {
      if (this.state !== 'OPEN') {
        logger.warn(
          `[CircuitBreaker:${name}] Opening circuit after ${this.consecutiveFailures} failures`,
        );
      }
      this.state = 'OPEN';
      this.openedAt = Date.now();
    }
  }
}

/**
 * HTTP client for inter-service calls to the users-service.
 *
 * Replaces cross-DB view reads for non-JOIN scenarios (enrichment, display
 * name resolution, capability lookups from compliance/ticketing services).
 *
 * TypeORM entity JOINs via the cross-DB views are intentionally kept as-is;
 * use this client only for NEW application-level enrichment paths.
 *
 * Environment:
 *  USERS_SERVICE_URL         Base URL of users-service (default: http://localhost:4101)
 *  INTERNAL_SERVICE_SECRET   Shared token for X-Service-Token header (optional in dev)
 */
@Injectable()
export class UsersHttpClient {
  private readonly logger = new Logger(UsersHttpClient.name);
  private readonly baseUrl: string;
  private readonly serviceToken: string | undefined;
  private readonly serviceOrigin: string;
  private readonly circuit = new CircuitBreaker();

  constructor() {
    this.baseUrl = process.env.USERS_SERVICE_URL || 'http://localhost:4101';
    this.serviceToken = process.env.INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_SECRET;
    this.serviceOrigin = process.env.SERVICE_NAME || 'unknown-service';
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Service-Origin': this.serviceOrigin,
    };
    if (this.serviceToken) {
      headers['X-Service-Token'] = this.serviceToken;
    }
    return headers;
  }

  private async fetchOnce<T>(url: string, timeoutMs: number): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        headers: this.buildHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (err: any) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * GET with retry (up to maxRetries attempts) and exponential backoff.
   * Wrapped by a circuit breaker — if the circuit is OPEN, returns null immediately.
   */
  private async fetchWithRetry<T>(
    url: string,
    timeoutMs = 2000,
    maxRetries = 2,
  ): Promise<T | null> {
    if (this.circuit.isOpen()) {
      this.logger.warn(`[CircuitBreaker:users] Circuit OPEN — skipping ${url}`);
      return null;
    }

    let lastErr: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.fetchOnce<T>(url, timeoutMs);
        this.circuit.recordSuccess();
        return result;
      } catch (err: any) {
        lastErr = err;
        const isAbort = err?.name === 'AbortError';
        const isLastAttempt = attempt === maxRetries;

        if (!isLastAttempt) {
          const delayMs = 200 * Math.pow(2, attempt); // 200ms, 400ms
          this.logger.warn(
            `Inter-service GET ${url} failed (attempt ${attempt + 1}/${maxRetries + 1}): ${err?.message} — retrying in ${delayMs}ms`,
          );
          await new Promise((r) => setTimeout(r, delayMs));
        } else {
          const reason = isAbort ? `timed out after ${timeoutMs}ms` : err?.message;
          this.logger.warn(
            `Inter-service GET ${url} failed after ${maxRetries + 1} attempts: ${reason}`,
          );
          this.circuit.recordFailure(this.logger, 'users');
        }
      }
    }
    return null;
  }

  /**
   * Fetch a single user by ID from users-service.
   * Returns null on error or if the user does not exist.
   */
  async getUserById(id: number): Promise<UserStub | null> {
    return this.fetchWithRetry<UserStub>(`${this.baseUrl}/api/internal/users/${id}`);
  }

  /**
   * Fetch all users (basic stub fields only) from users-service.
   * Returns an empty array on error.
   */
  async getUsers(): Promise<UserStub[]> {
    const result = await this.fetchWithRetry<UserStub[]>(`${this.baseUrl}/api/internal/users`);
    return result ?? [];
  }

  /**
   * Fetch role capabilities matrix from users-service.
   * Returns an empty array on error (callers must handle empty cache gracefully).
   */
  async getRoleCapabilities(): Promise<RoleCapabilityStub[]> {
    const result = await this.fetchWithRetry<RoleCapabilityStub[]>(
      `${this.baseUrl}/api/internal/role-capabilities`,
    );
    return result ?? [];
  }
}
