import {
  BadRequestException,
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createCipheriv, createDecipheriv, createECDH, createHash, randomBytes } from 'crypto';
import * as webPush from 'web-push';
import { Repository } from 'typeorm';
import { UsersHttpClient } from '../../../common/http-clients/users.http-client';
import { TicketNotification } from '../entities/ticket-notification.entity';
import { WebPushSubscription } from '../entities/web-push-subscription.entity';

export interface BrowserPushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const PUSH_SERVICE_HOSTS = new Set([
  'fcm.googleapis.com',
  'web.push.apple.com',
  'push.services.mozilla.com',
  'updates.push.services.mozilla.com',
]);
const MAX_SUBSCRIPTIONS_PER_USER = 8;
const TEST_ALERT_INTERVAL_MS = 30_000;
type PushFailure = 'authentication' | 'rate-limit' | 'provider-unavailable' | 'provider-request' | 'dns' | 'tls' | 'timeout' | 'connection';
type PushResult = { outcome: 'accepted' | 'expired' | 'not-enabled' }
  | { outcome: 'failed'; failure: PushFailure; providerStatus?: number };
type PushConfigurationIssue = 'missing-settings' | 'encryption-or-subject' | 'signing-key-pair' | 'proxy-url';
interface PushConfiguration {
  publicKey: string;
  privateKey: string;
  subject: string;
  encryptionKey: Buffer;
  proxy?: string;
}

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private configurationWarningLogged = false;
  private configurationIssue?: PushConfigurationIssue;
  private readonly nextTestAlertAt = new Map<number, number>();

  constructor(
    @InjectRepository(WebPushSubscription)
    private readonly subscriptions: Repository<WebPushSubscription>,
    @InjectRepository(TicketNotification)
    private readonly notifications: Repository<TicketNotification>,
    private readonly config: ConfigService,
    private readonly usersClient: UsersHttpClient,
  ) {}

  private invalidConfiguration(issue: PushConfigurationIssue): null {
    this.configurationIssue = issue;
    if (!this.configurationWarningLogged) {
      this.logger.warn(`Browser push configuration is invalid (${issue}).`);
      this.configurationWarningLogged = true;
    }
    return null;
  }

  private configuration(): PushConfiguration | null {
    const publicKey = this.config.get<string>('WEB_PUSH_PUBLIC_KEY')?.trim();
    const privateKey = this.config.get<string>('WEB_PUSH_PRIVATE_KEY')?.trim();
    const subject = this.config.get<string>('WEB_PUSH_SUBJECT')?.trim();
    const encryptionKeyText = this.config.get<string>('WEB_PUSH_SUBSCRIPTION_ENCRYPTION_KEY')?.trim();
    this.configurationIssue = undefined;
    if (!publicKey && !privateKey && !subject && !encryptionKeyText) return null;
    if (!publicKey || !privateKey || !subject || !encryptionKeyText) {
      return this.invalidConfiguration('missing-settings');
    }

    const encryptionKey = Buffer.from(encryptionKeyText, 'base64');
    if (encryptionKey.length !== 32 || !/^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/i.test(subject)) {
      return this.invalidConfiguration('encryption-or-subject');
    }
    try {
      const signingKey = createECDH('prime256v1');
      signingKey.setPrivateKey(Buffer.from(privateKey, 'base64url'));
      if (!signingKey.getPublicKey().equals(Buffer.from(publicKey, 'base64url'))) {
        return this.invalidConfiguration('signing-key-pair');
      }
      webPush.setVapidDetails(subject, publicKey, privateKey);
    } catch {
      return this.invalidConfiguration('signing-key-pair');
    }
    const proxy = this.config.get<string>('WEB_PUSH_PROXY_URL')?.trim() || undefined;
    if (proxy) {
      try {
        const parsed = new URL(proxy);
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.pathname !== '/' || parsed.search || parsed.hash) {
          return this.invalidConfiguration('proxy-url');
        }
      } catch {
        return this.invalidConfiguration('proxy-url');
      }
    }
    return { publicKey, privateKey, subject, encryptionKey, proxy };
  }

  getPublicConfig(): { enabled: boolean; publicKey: string | null; configurationIssue?: PushConfigurationIssue } {
    const config = this.configuration();
    return { enabled: !!config, publicKey: config?.publicKey ?? null, configurationIssue: this.configurationIssue };
  }

  private endpointHash(endpoint: string): string {
    return createHash('sha256').update(endpoint).digest('hex');
  }

  private validateSubscription(input: BrowserPushSubscriptionInput): void {
    if (!input || typeof input.endpoint !== 'string' || input.endpoint.length > 2048 ||
      typeof input.keys?.p256dh !== 'string' || typeof input.keys?.auth !== 'string' ||
      input.keys.p256dh.length > 256 || input.keys.auth.length > 128 ||
      !/^[A-Za-z0-9_-]+$/.test(input.keys.p256dh) || !/^[A-Za-z0-9_-]+$/.test(input.keys.auth)) {
      throw new BadRequestException('A valid browser push subscription is required.');
    }
    let endpoint: URL;
    try { endpoint = new URL(input.endpoint); }
    catch { throw new BadRequestException('The browser push endpoint is invalid.'); }
    const supportedHost = PUSH_SERVICE_HOSTS.has(endpoint.hostname.toLowerCase()) ||
      endpoint.hostname.toLowerCase().endsWith('.push.services.mozilla.com');
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || !supportedHost) {
      throw new BadRequestException('The browser push endpoint is not supported.');
    }
  }

  private encryptSubscription(input: BrowserPushSubscriptionInput, key: Buffer): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(input), 'utf8'), cipher.final()]);
    return JSON.stringify({
      version: 1,
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: ciphertext.toString('base64'),
    });
  }

  private decryptSubscription(encrypted: string, key: Buffer): BrowserPushSubscriptionInput {
    const record = JSON.parse(encrypted) as { version?: number; iv?: string; tag?: string; data?: string };
    if (record.version !== 1 || !record.iv || !record.tag || !record.data) throw new Error('Unsupported subscription record.');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(record.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(record.tag, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(record.data, 'base64')),
      decipher.final(),
    ]).toString('utf8');
    const subscription = JSON.parse(plaintext) as BrowserPushSubscriptionInput;
    this.validateSubscription(subscription);
    return subscription;
  }

  async saveSubscription(userId: number, input: BrowserPushSubscriptionInput): Promise<{ enabled: true }> {
    const config = this.configuration();
    if (!config) throw new ServiceUnavailableException('Browser notifications are not configured on this server.');
    this.validateSubscription(input);
    const endpointHash = this.endpointHash(input.endpoint);
    const existing = await this.subscriptions.findOne({ where: { endpointHash } });
    if (!existing && await this.subscriptions.count({ where: { userId } }) >= MAX_SUBSCRIPTIONS_PER_USER) {
      throw new BadRequestException('This account already has the maximum number of browser notification devices.');
    }
    const row = existing ?? this.subscriptions.create({ userId, endpointHash });
    row.userId = userId;
    row.endpointHash = endpointHash;
    row.encryptedSubscription = this.encryptSubscription(input, config.encryptionKey);
    await this.subscriptions.save(row);
    return { enabled: true };
  }

  async removeSubscription(userId: number, endpoint: string): Promise<{ removed: boolean }> {
    if (typeof endpoint !== 'string' || endpoint.length > 2048) {
      throw new BadRequestException('A valid browser push endpoint is required.');
    }
    const result = await this.subscriptions.delete({ userId, endpointHash: this.endpointHash(endpoint) });
    return { removed: (result.affected ?? 0) > 0 };
  }

  async sendTestAlert(userId: number, endpoint: string): Promise<PushResult> {
    const config = this.configuration();
    if (!config) throw new ServiceUnavailableException('Browser notifications are not configured on this server.');
    if (typeof endpoint !== 'string' || !endpoint || endpoint.length > 2048) {
      throw new BadRequestException('A valid browser push endpoint is required.');
    }
    const subscription = await this.subscriptions.findOne({ where: { userId, endpointHash: this.endpointHash(endpoint) } });
    if (!subscription) return { outcome: 'not-enabled' };

    const now = Date.now();
    for (const [id, nextAt] of this.nextTestAlertAt) {
      if (nextAt <= now) this.nextTestAlertAt.delete(id);
    }
    if (this.nextTestAlertAt.has(userId) || this.nextTestAlertAt.size >= 4096) {
      throw new HttpException('Please wait 30 seconds before sending another test alert.', HttpStatus.TOO_MANY_REQUESTS);
    }
    this.nextTestAlertAt.set(userId, now + TEST_ALERT_INTERVAL_MS);
    await this.usersClient.requireAccountAccess(userId);
    const unreadCount = await this.notifications.count({ where: { userId, isRead: false } });
    return this.deliver(subscription, config, { test: true, targetPath: '/dashboard', unreadCount });
  }

  private async deliver(record: WebPushSubscription, config: PushConfiguration, payload: object): Promise<PushResult> {
    let subscription: BrowserPushSubscriptionInput;
    try { subscription = this.decryptSubscription(record.encryptedSubscription, config.encryptionKey); }
    catch {
      await this.subscriptions.delete({ id: record.id });
      this.logger.warn('Removed an unreadable browser push subscription.');
      return { outcome: 'expired' };
    }
    try {
      await webPush.sendNotification(subscription, JSON.stringify(payload), {
        TTL: 60,
        urgency: 'normal',
        timeout: 8_000,
        proxy: config.proxy,
        vapidDetails: { subject: config.subject, publicKey: config.publicKey, privateKey: config.privateKey },
      });
      return { outcome: 'accepted' };
    } catch (error) {
      const { statusCode, code, message } = (error ?? {}) as { statusCode?: number; code?: string; message?: string };
      if (statusCode === 404 || statusCode === 410) {
        await this.subscriptions.delete({ id: record.id });
        return { outcome: 'expired' };
      }
      const providerStatus = typeof statusCode === 'number' && Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599
        ? statusCode : undefined;
      const failure = this.classifyFailure(providerStatus, code, message);
      this.logger.warn(`Browser push delivery failed (${failure}${providerStatus ? `, HTTP ${providerStatus}` : ''}).`);
      return { outcome: 'failed', failure, providerStatus };
    }
  }

  private classifyFailure(status?: number, code?: string, message?: string): PushFailure {
    if (status === 401 || status === 403) return 'authentication';
    if (status === 429) return 'rate-limit';
    if (status && status >= 500) return 'provider-unavailable';
    if (status) return 'provider-request';
    if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'dns';
    if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT' || /socket timeout/i.test(message ?? '')) return 'timeout';
    if (/^(?:ERR_TLS_|CERT_|SELF_SIGNED_|DEPTH_ZERO_SELF_SIGNED_|UNABLE_TO_(?:VERIFY|GET_ISSUER))/.test(code ?? '')) return 'tls';
    return 'connection';
  }

  async sendForNotification(notification: TicketNotification): Promise<void> {
    const config = this.configuration();
    if (!config) return;
    const records = await this.subscriptions.find({ where: { userId: notification.userId } });
    if (!records.length) return;

    try {
      // A push subscription can outlive a login session. Recheck the current account approval
      // before every delivery so revoked unit approval cannot continue receiving push alerts.
      await this.usersClient.requireAccountAccess(notification.userId);
    } catch {
      return;
    }

    const unreadCount = await this.notifications.count({ where: { userId: notification.userId, isRead: false } });
    const path = notification.targetPath;
    const targetPath = path && path.startsWith('/') && !path.startsWith('//') ? path : '/dashboard';
    await Promise.all(records.map(record => this.deliver(record, config, {
      title: 'FO2 iCare', body: 'You have a new notification.', targetPath, unreadCount,
    })));
  }
}
