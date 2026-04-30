import { Injectable, Logger } from '@nestjs/common';

export interface UserStub {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  role: string;
  staff_id?: string | null;
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

  constructor() {
    this.baseUrl = process.env.USERS_SERVICE_URL || 'http://localhost:4101';
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
   * Fetch a single user by ID from users-service.
   * Returns null on error or if the user does not exist.
   */
  async getUserById(id: number): Promise<UserStub | null> {
    return this.fetchWithTimeout<UserStub>(`${this.baseUrl}/api/internal/users/${id}`);
  }

  /**
   * Fetch all users (basic stub fields only) from users-service.
   * Returns an empty array on error.
   */
  async getUsers(): Promise<UserStub[]> {
    const result = await this.fetchWithTimeout<UserStub[]>(`${this.baseUrl}/api/internal/users`);
    return result ?? [];
  }
}
