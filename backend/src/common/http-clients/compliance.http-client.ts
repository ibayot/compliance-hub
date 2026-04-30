import { Injectable, Logger } from '@nestjs/common';

export interface UnitStub {
  id: number;
  name: string;
  code?: string | null;
  parent_id?: number | null;
}

/**
 * HTTP client for inter-service calls to the compliance-service.
 *
 * Provides a clean HTTP API path for services that need compliance data
 * (e.g., issuance metadata, units) without using cross-DB SQL views.
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

  constructor() {
    this.baseUrl = process.env.COMPLIANCE_SERVICE_URL || 'http://localhost:4103';
    this.serviceToken = process.env.INTERNAL_SERVICE_SECRET;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Service-Origin': 'compliance-hub-internal',
    };
    if (this.serviceToken) {
      headers['X-Service-Token'] = this.serviceToken;
    }
    return headers;
  }

  private async fetchWithTimeout<T>(url: string, timeoutMs = 2000): Promise<T | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        headers: this.buildHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) {
        this.logger.warn(`Inter-service GET ${url} → HTTP ${response.status}`);
        return null;
      }
      return (await response.json()) as T;
    } catch (err: any) {
      clearTimeout(timer);
      if (err?.name === 'AbortError') {
        this.logger.warn(`Inter-service GET ${url} timed out after ${timeoutMs}ms`);
      } else {
        this.logger.warn(`Inter-service GET ${url} failed: ${err?.message}`);
      }
      return null;
    }
  }

  /**
   * Fetch all units from compliance-service's internal endpoint.
   * Returns an empty array on error.
   */
  async getUnits(): Promise<UnitStub[]> {
    const result = await this.fetchWithTimeout<UnitStub[]>(`${this.baseUrl}/api/internal/units`);
    return result ?? [];
  }

  /**
   * Fetch a single unit by ID from compliance-service.
   * Returns null on error.
   */
  async getUnitById(id: number): Promise<UnitStub | null> {
    return this.fetchWithTimeout<UnitStub>(`${this.baseUrl}/api/internal/units/${id}`);
  }
}
