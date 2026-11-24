import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { GoogleAuth } from 'google-auth-library';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
} from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { Repository } from 'typeorm';
import { UsersHttpClient } from '../../../common/http-clients/users.http-client';
import { FcmDeviceRegistration } from '../entities/fcm-device-registration.entity';
import { TicketNotification } from '../entities/ticket-notification.entity';

export interface FcmDeviceInput {
  deviceId: string;
  fid: string;
}

export type FcmSendResult =
  | { outcome: 'accepted' | 'expired' | 'not-enabled' }
  | { outcome: 'failed'; failure: 'authentication' | 'provider-unavailable' | 'provider-request' | 'connection' | 'registration-storage' };

type FcmConfigurationIssue = 'missing-project-id' | 'missing-service-account' | 'invalid-service-account' | 'project-mismatch' | 'missing-encryption-key';
interface FcmConfiguration {
  projectId: string;
  auth: GoogleAuth;
  encryptionKey: Buffer;
}

const FID_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const DEVICE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_DEVICES_PER_USER = 8;
const TEST_ALERT_INTERVAL_MS = 30_000;
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const FCM_SEND_TIMEOUT_MS = 8_000;

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private readonly nextTestAlertAt = new Map<string, number>();
  private cachedConfiguration: FcmConfiguration | null | undefined;
  private cachedConfigurationKey = '';
  private configurationIssue?: FcmConfigurationIssue;

  constructor(
    @InjectRepository(FcmDeviceRegistration)
    private readonly registrations: Repository<FcmDeviceRegistration>,
    @InjectRepository(TicketNotification)
    private readonly notifications: Repository<TicketNotification>,
    private readonly config: ConfigService,
    private readonly usersClient: UsersHttpClient,
  ) {}

  private configuration(): FcmConfiguration | null {
    const projectId = this.config.get<string>('FCM_PROJECT_ID')?.trim() ?? '';
    const serviceAccountPath = this.config.get<string>('FCM_SERVICE_ACCOUNT_PATH')?.trim() ?? '';
    const encryptionKeyText = this.config.get<string>('WEB_PUSH_SUBSCRIPTION_ENCRYPTION_KEY')?.trim() ?? '';
    const cacheKey = `${projectId}\u0000${serviceAccountPath}\u0000${encryptionKeyText}`;
    if (this.cachedConfigurationKey === cacheKey && this.cachedConfiguration !== undefined) {
      return this.cachedConfiguration;
    }
    this.cachedConfigurationKey = cacheKey;
    this.cachedConfiguration = null;
    this.configurationIssue = undefined;

    if (!projectId) return this.invalidConfiguration('missing-project-id');
    if (!serviceAccountPath || !existsSync(serviceAccountPath)) return this.invalidConfiguration('missing-service-account');

    const sourceKey = Buffer.from(encryptionKeyText, 'base64');
    if (sourceKey.length !== 32) return this.invalidConfiguration('missing-encryption-key');

    try {
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8')) as {
        type?: string;
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (serviceAccount.type !== 'service_account' || !serviceAccount.client_email || !serviceAccount.private_key) {
        return this.invalidConfiguration('invalid-service-account');
      }
      if (serviceAccount.project_id !== projectId) return this.invalidConfiguration('project-mismatch');

      const auth = new GoogleAuth({ keyFile: serviceAccountPath, scopes: [FCM_SCOPE] });
      const encryptionKey = Buffer.from(hkdfSync(
        'sha256',
        sourceKey,
        Buffer.from('FO2 iCare Android FCM device data'),
        Buffer.from('fcm-device-registration-v1'),
        32,
      ));
      this.cachedConfiguration = { projectId, auth, encryptionKey };
      return this.cachedConfiguration;
    } catch {
      return this.invalidConfiguration('invalid-service-account');
    }
  }

  private invalidConfiguration(issue: FcmConfigurationIssue): null {
    this.configurationIssue = issue;
    if (issue !== 'missing-service-account') {
      this.logger.warn(`Android FCM configuration is unavailable (${issue}).`);
    }
    return null;
  }

  getPublicConfig(): { enabled: boolean; configurationIssue?: FcmConfigurationIssue } {
    const configuration = this.configuration();
    return { enabled: !!configuration, configurationIssue: this.configurationIssue };
  }

  private assertConfigured(): FcmConfiguration {
    const configuration = this.configuration();
    if (!configuration) {
      throw new ServiceUnavailableException('Android app alerts are not configured on this server.');
    }
    return configuration;
  }

  private validateDeviceInput(input: FcmDeviceInput): void {
    if (!input || typeof input.deviceId !== 'string' || !DEVICE_ID_PATTERN.test(input.deviceId) ||
        typeof input.fid !== 'string' || !FID_PATTERN.test(input.fid)) {
      throw new BadRequestException('A valid Android app device registration is required.');
    }
  }

  private fidHash(fid: string): string {
    return createHash('sha256').update(fid).digest('hex');
  }

  private encryptFid(fid: string, key: Buffer): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(fid, 'utf8'), cipher.final()]);
    return JSON.stringify({
      version: 1,
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: encrypted.toString('base64'),
    });
  }

  private decryptFid(encrypted: string, key: Buffer): string {
    const record = JSON.parse(encrypted) as { version?: number; iv?: string; tag?: string; data?: string };
    if (record.version !== 1 || !record.iv || !record.tag || !record.data) throw new Error('Invalid encrypted FID.');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(record.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(record.tag, 'base64'));
    const fid = Buffer.concat([
      decipher.update(Buffer.from(record.data, 'base64')),
      decipher.final(),
    ]).toString('utf8');
    if (!FID_PATTERN.test(fid)) throw new Error('Invalid decrypted FID.');
    return fid;
  }

  async getDeviceStatus(userId: number, deviceId: string): Promise<{ enabled: boolean; registered: boolean; configurationIssue?: FcmConfigurationIssue }> {
    if (!DEVICE_ID_PATTERN.test(deviceId ?? '')) throw new BadRequestException('A valid Android app device is required.');
    await this.usersClient.requireAccountAccess(userId);
    const configuration = this.configuration();
    const registration = await this.registrations.findOne({ where: { userId, deviceId } });
    return {
      enabled: !!configuration,
      registered: !!registration,
      configurationIssue: this.configurationIssue,
    };
  }

  async saveDevice(userId: number, input: FcmDeviceInput): Promise<{ enabled: true }> {
    this.validateDeviceInput(input);
    await this.usersClient.requireAccountAccess(userId);
    const configuration = this.assertConfigured();
    const fidHash = this.fidHash(input.fid);
    const matches = await this.registrations.find({
      where: [{ deviceId: input.deviceId }, { fidHash }],
    });
    const existingForDevice = matches.find(row => row.deviceId === input.deviceId);
    const row = existingForDevice ?? matches[0] ?? this.registrations.create();
    const duplicates = matches.filter(match => match.id !== row.id);
    if (duplicates.length) await this.registrations.remove(duplicates);
    if (!matches.length && await this.registrations.count({ where: { userId } }) >= MAX_DEVICES_PER_USER) {
      throw new BadRequestException('This account already has the maximum number of Android alert devices.');
    }

    row.userId = userId;
    row.deviceId = input.deviceId;
    row.fidHash = fidHash;
    row.encryptedFid = this.encryptFid(input.fid, configuration.encryptionKey);
    try {
      await this.registrations.save(row);
    } catch {
      throw new BadRequestException('This Android device could not be registered. Reopen FO2 iCare and try again.');
    }
    return { enabled: true };
  }

  async removeDevice(userId: number, deviceId: string): Promise<{ removed: boolean }> {
    if (!DEVICE_ID_PATTERN.test(deviceId ?? '')) throw new BadRequestException('A valid Android app device is required.');
    const result = await this.registrations.delete({ userId, deviceId });
    return { removed: (result.affected ?? 0) > 0 };
  }

  async sendTestAlert(userId: number, deviceId: string): Promise<FcmSendResult> {
    const configuration = this.assertConfigured();
    if (!DEVICE_ID_PATTERN.test(deviceId ?? '')) throw new BadRequestException('A valid Android app device is required.');
    await this.usersClient.requireAccountAccess(userId);
    const registration = await this.registrations.findOne({ where: { userId, deviceId } });
    if (!registration) return { outcome: 'not-enabled' };

    const rateLimitKey = `${userId}:${deviceId}`;
    const now = Date.now();
    for (const [key, nextAt] of this.nextTestAlertAt) if (nextAt <= now) this.nextTestAlertAt.delete(key);
    if (this.nextTestAlertAt.has(rateLimitKey) || this.nextTestAlertAt.size >= 4096) {
      throw new HttpException('Please wait 30 seconds before sending another test alert.', HttpStatus.TOO_MANY_REQUESTS);
    }
    this.nextTestAlertAt.set(rateLimitKey, now + TEST_ALERT_INTERVAL_MS);
    const unreadCount = await this.notifications.count({ where: { userId, isRead: false } });
    return this.sendToRegistration(configuration, registration, unreadCount, true);
  }

  async sendForNotification(notification: TicketNotification): Promise<Set<string>> {
    const configuration = this.configuration();
    if (!configuration) return new Set();
    const registrations = await this.registrations.find({ where: { userId: notification.userId } });
    if (!registrations.length) return new Set();

    try {
      await this.usersClient.requireAccountAccess(notification.userId);
    } catch {
      return new Set();
    }

    const unreadCount = await this.notifications.count({ where: { userId: notification.userId, isRead: false } });
    const results = await Promise.all(registrations.map(async registration => ({
      deviceId: registration.deviceId,
      result: await this.sendToRegistration(configuration, registration, unreadCount, false),
    })));
    return new Set(results.filter(item => item.result.outcome === 'accepted').map(item => item.deviceId));
  }

  private async sendToRegistration(
    configuration: FcmConfiguration,
    registration: FcmDeviceRegistration,
    unreadCount: number,
    test: boolean,
  ): Promise<FcmSendResult> {
    let fid: string;
    try {
      fid = this.decryptFid(registration.encryptedFid, configuration.encryptionKey);
    } catch {
      this.logger.warn('Android FCM could not read the saved device registration.');
      return { outcome: 'failed', failure: 'registration-storage' };
    }

    const result = await this.send(configuration, fid, unreadCount, test);
    if (result.outcome !== 'expired') return result;

    // A phone can refresh its registration while a send is pending. Delete only the rejected version.
    try {
      const removed = await this.registrations.delete({
        id: registration.id,
        encryptedFid: registration.encryptedFid,
      });
      if (removed.affected) return result;
      this.logger.debug('Android FCM registration changed while a send was pending.');
    } catch {
      this.logger.warn('Android FCM could not remove a rejected device registration.');
    }
    return { outcome: 'failed', failure: 'registration-storage' };
  }

  private async send(configuration: FcmConfiguration, fid: string, unreadCount: number, test: boolean): Promise<FcmSendResult> {
    let accessToken: string | null | undefined;
    try {
      const client = await configuration.auth.getClient();
      const accessTokenResponse = await client.getAccessToken();
      accessToken = accessTokenResponse?.token;
    } catch {
      this.logger.warn('Android FCM could not obtain a provider access token.');
      return { outcome: 'failed', failure: 'authentication' };
    }
    if (!accessToken) return { outcome: 'failed', failure: 'authentication' };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FCM_SEND_TIMEOUT_MS);
    try {
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(configuration.projectId)}/messages:send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: {
            fid,
            notification: {
              title: 'FO2 iCare',
              body: test ? 'This is a test notification.' : 'You have a new notification.',
            },
            data: { unreadCount: String(Math.max(0, unreadCount)), targetPath: '/dashboard' },
            android: {
              priority: 'HIGH',
              notification: {
                channel_id: 'fo2_icare_alerts',
                icon: 'hub_notification',
                color: '#147A76',
                sound: 'default',
                notification_count: Math.max(0, unreadCount),
              },
            },
          },
        }),
      });
      if (response.ok) return { outcome: 'accepted' };

      if (response.status === 404) {
        try {
          const body = await response.json() as { error?: { details?: Array<{ '@type'?: string; errorCode?: string }> } };
          const details = body?.error?.details;
          if (Array.isArray(details) && details.some(detail =>
            detail?.['@type'] === 'type.googleapis.com/google.firebase.fcm.v1.FcmError' &&
            detail.errorCode === 'UNREGISTERED',
          )) return { outcome: 'expired' };
        } catch {
          // A generic or unreadable 404 does not establish that Firebase rejected this installation ID.
        }
      }
      const failure = response.status === 401 || response.status === 403
        ? 'authentication'
        : response.status >= 500 ? 'provider-unavailable' : 'provider-request';
      this.logger.warn(`Android FCM send failed (${failure}, HTTP ${response.status}).`);
      return { outcome: 'failed', failure };
    } catch (error: any) {
      const failure = error?.name === 'AbortError' ? 'provider-unavailable' : 'connection';
      this.logger.warn(`Android FCM send failed (${failure}).`);
      return { outcome: 'failed', failure };
    } finally {
      clearTimeout(timeout);
    }
  }
}
