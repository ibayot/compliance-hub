import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
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

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private configurationWarningLogged = false;

  constructor(
    @InjectRepository(WebPushSubscription)
    private readonly subscriptions: Repository<WebPushSubscription>,
    @InjectRepository(TicketNotification)
    private readonly notifications: Repository<TicketNotification>,
    private readonly config: ConfigService,
    private readonly usersClient: UsersHttpClient,
  ) {}

  private configuration(): { publicKey: string; privateKey: string; subject: string; encryptionKey: Buffer } | null {
    const publicKey = this.config.get<string>('WEB_PUSH_PUBLIC_KEY')?.trim();
    const privateKey = this.config.get<string>('WEB_PUSH_PRIVATE_KEY')?.trim();
    const subject = this.config.get<string>('WEB_PUSH_SUBJECT')?.trim();
    const encryptionKeyText = this.config.get<string>('WEB_PUSH_SUBSCRIPTION_ENCRYPTION_KEY')?.trim();
    if (!publicKey && !privateKey && !subject && !encryptionKeyText) return null;
    if (!publicKey || !privateKey || !subject || !encryptionKeyText) {
      if (!this.configurationWarningLogged) {
        this.logger.warn('Browser push is disabled because its server configuration is incomplete.');
        this.configurationWarningLogged = true;
      }
      return null;
    }

    const encryptionKey = Buffer.from(encryptionKeyText, 'base64');
    if (encryptionKey.length !== 32 || !/^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/i.test(subject)) {
      if (!this.configurationWarningLogged) {
        this.logger.error('Browser push is disabled because its encryption key or VAPID subject is invalid.');
        this.configurationWarningLogged = true;
      }
      return null;
    }
    try { webPush.setVapidDetails(subject, publicKey, privateKey); }
    catch {
      if (!this.configurationWarningLogged) {
        this.logger.error('Browser push is disabled because the VAPID key pair is invalid.');
        this.configurationWarningLogged = true;
      }
      return null;
    }
    return { publicKey, privateKey, subject, encryptionKey };
  }

  getPublicConfig(): { enabled: boolean; publicKey: string | null } {
    const config = this.configuration();
    return { enabled: !!config, publicKey: config?.publicKey ?? null };
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
    webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);

    await Promise.all(records.map(async (record) => {
      let subscription: BrowserPushSubscriptionInput;
      try { subscription = this.decryptSubscription(record.encryptedSubscription, config.encryptionKey); }
      catch {
        await this.subscriptions.delete({ id: record.id });
        this.logger.warn('Removed an unreadable browser push subscription.');
        return;
      }
      try {
        await webPush.sendNotification(subscription, JSON.stringify({
          title: 'RICTMS Compliance Hub',
          body: 'You have a new notification.',
          targetPath,
          unreadCount,
        }), { TTL: 60, urgency: 'normal' });
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await this.subscriptions.delete({ id: record.id });
          return;
        }
        this.logger.warn(`Browser push delivery failed with status ${Number(error?.statusCode) || 'unknown'}.`);
      }
    }));
  }
}
