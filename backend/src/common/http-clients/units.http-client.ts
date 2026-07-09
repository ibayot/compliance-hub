import { Injectable, Logger } from '@nestjs/common';

export interface UnitStub {
  id: number;
  name: string;
  code?: string | null;
}

@Injectable()
export class UnitsHttpClient {
  private readonly logger = new Logger(UnitsHttpClient.name);
  private readonly baseUrl: string;
  private readonly serviceToken: string | undefined;
  private readonly serviceOrigin: string;

  constructor() {
    const serviceUrl = process.env.USERS_SERVICE_URL || 'http://localhost:4101';
    this.baseUrl = `${serviceUrl}/api/internal`;
    this.serviceToken = process.env.INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_SECRET;
    this.serviceOrigin = process.env.SERVICE_NAME || 'compliance-service';
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.serviceToken) {
      headers['X-Service-Token'] = this.serviceToken;
    }
    headers['X-Service-Origin'] = this.serviceOrigin;
    return headers;
  }

  async getUnits(): Promise<UnitStub[]> {
    try {
      const response = await fetch(`${this.baseUrl}/units`, { headers: this.getHeaders() });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return (await response.json()) as UnitStub[];
    } catch (error) {
      this.logger.error(`Failed to fetch units: ${error}`);
      return [];
    }
  }

  async getUnitById(id: number): Promise<UnitStub | null> {
    try {
      const response = await fetch(`${this.baseUrl}/units/${id}`, { headers: this.getHeaders() });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP ${response.status}`);
      }
      return (await response.json()) as UnitStub;
    } catch (error) {
      this.logger.error(`Failed to fetch unit ${id}: ${error}`);
      return null;
    }
  }
}
