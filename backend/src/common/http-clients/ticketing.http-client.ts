import { Injectable, ServiceUnavailableException } from '@nestjs/common';

/** Fresh, bounded authentication policy read; outages must never disable MFA. */
@Injectable()
export class TicketingHttpClient {
  async isAuthenticationEmailEnabled(): Promise<boolean> {
    const baseUrl = process.env.TICKETING_SERVICE_URL || 'http://localhost:4102';
    const token = process.env.INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_SECRET;
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/internal/auth-email-policy`, {
        headers: {
          'X-Service-Origin': process.env.SERVICE_NAME || 'users-service',
          ...(token ? { 'X-Service-Token': token } : {}),
        },
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error('Policy request failed');
      const policy = await response.json();
      if (typeof policy?.outboundEmailsEnabled !== 'boolean') throw new Error('Invalid policy');
      return policy.outboundEmailsEnabled;
    } catch {
      throw new ServiceUnavailableException('Unable to check MFA email settings. Please try signing in again.');
    }
  }
}
