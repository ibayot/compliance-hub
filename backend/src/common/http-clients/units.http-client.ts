import { Injectable, Logger } from '@nestjs/common';

export interface UnitStub {
  id: number;
  name: string;
  code?: string | null;
}

@Injectable()
export class UnitsHttpClient {
  private readonly logger = new Logger(UnitsHttpClient.name);
  private readonly baseUrl = 'http://localhost:3000/api/internal';

  async getUnits(): Promise<UnitStub[]> {
    try {
      const response = await fetch(`${this.baseUrl}/units`);
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
      const response = await fetch(`${this.baseUrl}/units/${id}`);
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
