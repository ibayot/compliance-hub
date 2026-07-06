import { Injectable, Logger } from '@nestjs/common';

export interface UnitStub {
  id: number;
  name: string;
  code?: string | null;
  parent_id?: number | null;
}

/** Circuit breaker states for inter-service calls. */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

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
        return false;
      }
      return true;
    }
    return false;
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
 * HTTP client for inter-service calls to the compliance-service.
 *
 * Provides a clean HTTP API path for services that need compliance data
 * (e.g., issuance metadata, units) without using cross-DB SQL views.
 *
 * Includes circuit breaker (opens after 5 consecutive failures, half-opens after 30s)
 * and retry with exponential backoff (up to 2 retries, 200ms/400ms delays).
 *
 * Environment:
 *  COMPLIANCE_SERVICE_URL    Base URL of compliance-service (default: http://localhost:4103)
 *  INTERNAL_SERVICE_SECRET   Shared token for X-Service-Token header (optional in dev)
 */
@Injectable()
export class ComplianceHttpClient {
  private readonly logger = new Logger(ComplianceHttpClient.name);
  private readonly baseUrl: string;
  private readonly serviceToken: string | undefined;
  private readonly serviceOrigin: string;
  private readonly circuit = new CircuitBreaker();

  constructor() {
    this.baseUrl = process.env.COMPLIANCE_SERVICE_URL || 'http://localhost:4103';
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

  private async fetchWithRetry<T>(
    url: string,
    timeoutMs = 2000,
    maxRetries = 2,
  ): Promise<T | null> {
    if (this.circuit.isOpen()) {
      this.logger.warn(`[CircuitBreaker:compliance] Circuit OPEN — skipping ${url}`);
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
          const delayMs = 200 * Math.pow(2, attempt);
          this.logger.warn(
            `Inter-service GET ${url} failed (attempt ${attempt + 1}/${maxRetries + 1}): ${err?.message} — retrying in ${delayMs}ms`,
          );
          await new Promise((r) => setTimeout(r, delayMs));
        } else {
          const reason = isAbort ? `timed out after ${timeoutMs}ms` : err?.message;
          this.logger.warn(
            `Inter-service GET ${url} failed after ${maxRetries + 1} attempts: ${reason}`,
          );
          this.circuit.recordFailure(this.logger, 'compliance');
        }
      }
    }
    return null;
  }

  /**
   * Fetch all units from compliance-service's internal endpoint.
   * Returns an empty array on error.
   */
  async getUnits(): Promise<UnitStub[]> {
    const result = await this.fetchWithRetry<UnitStub[]>(`${this.baseUrl}/api/internal/units`);
    return result ?? [];
  }

  /**
   * Fetch a single unit by ID from compliance-service.
   * Returns null on error.
   */
  async getUnitById(id: number): Promise<UnitStub | null> {
    return this.fetchWithRetry<UnitStub>(`${this.baseUrl}/api/internal/units/${id}`);
  }
}
