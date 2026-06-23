import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { TicketingConfig } from '../entities/ticketing-config.entity';

export interface TicketEmailData {
  ticketId: string;
  ticketNumber: string;
  subject: string;
  description: string;
  ticketType: string;
  categoryName?: string;
  priority: string | null;
  status: string;
  requesterName: string;
  requesterEmail: string;
  assignedToName?: string;
  assignedToEmail?: string;
  createdAt: string;
  noTechAvailable?: boolean;
}

export interface TicketAssignedEmailData {
  ticketId: string;
  ticketNumber: string;
  subject: string;
  ticketType: string;
  priority: string | null;
  status: string;
  technicianName: string;
  technicianEmail: string;
}

export interface TicketResolvedEmailData {
  ticketId: string;
  ticketNumber: string;
  subject: string;
  requesterName: string;
  requesterEmail: string;
  technicianName?: string;
}

export interface TicketClosedOrRatedEmailData {
  ticketId: string;
  ticketNumber: string;
  subject: string;
  technicianName: string;
  technicianEmail: string;
  action: 'closed' | 'rated';
  rating?: number | null;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private primaryTransporter: nodemailer.Transporter | null = null;
  private fallbackTransporter: nodemailer.Transporter | null = null;
  private primaryFromAddress: string;
  private fallbackFromAddress: string;
  private frontendUrl: string;
  private emailEnabled = true;
  private testOverrideTo: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(TicketingConfig)
    private readonly configRepo: Repository<TicketingConfig>,
  ) {
    this.frontendUrl = (this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000').replace(/\/$/, '');
    this.primaryFromAddress = '"DSWD FO2 Compliance Hub" <noreply@rictms.gov.ph>';
    this.fallbackFromAddress = '"DSWD FO2 Compliance Hub" <noreply@rictms.gov.ph>';

    const emailEnabledRaw = String(this.configService.get<string>('EMAIL_ENABLED') ?? 'true').toLowerCase();
    this.emailEnabled = !['0', 'false', 'no', 'off'].includes(emailEnabledRaw);
    if (!this.emailEnabled) {
      this.logger.warn('[EMAIL] Outbound email sending is disabled by EMAIL_ENABLED flag.');
    }

    const override = this.configService.get<string>('EMAIL_TEST_OVERRIDE') ?? '';
    this.testOverrideTo = override || null;
  }

  async onModuleInit() {
    await this.reloadSmtpConfig();
  }

  public async reloadSmtpConfig() {
    try {
      const dbConfig = await this.configRepo.findOne({ where: { id: 1 } });
      
      // Primary: Environment Variables
      const pHost = this.configService.get<string>('SMTP_HOST');
      const pPort = this.configService.get<number>('SMTP_PORT');
      const pUser = this.configService.get<string>('SMTP_USER');
      const pPass = this.configService.get<string>('SMTP_PASS');
      const pFrom = this.configService.get<string>('SMTP_FROM') || 'noreply@rictms.gov.ph';
      const pFromName = this.configService.get<string>('SMTP_FROM_NAME') || 'DSWD FO2 Compliance Hub';
      this.primaryFromAddress = `"${pFromName}" <${pFrom}>`;

      if (pHost) {
        const smtpPort = parseInt(String(pPort || '587'), 10);
        const useSSL = smtpPort === 465;
        this.primaryTransporter = nodemailer.createTransport({
          host: pHost,
          port: smtpPort,
          secure: useSSL,
          requireTLS: !useSSL,
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          auth: pUser && pPass ? { user: pUser, pass: pPass } : undefined,
          tls: { rejectUnauthorized: false },
        });
        this.logger.log(`Primary Email service initialized (SMTP: ${pHost}:${smtpPort})`);
      } else {
        this.primaryTransporter = null;
      }

      // Fallback: Database Configuration
      const fHost = dbConfig?.smtpHost;
      const fPort = dbConfig?.smtpPort;
      const fUser = dbConfig?.smtpUser;
      const fPass = dbConfig?.smtpPass;
      const fFrom = dbConfig?.smtpFrom || 'noreply@rictms.gov.ph';
      const fFromName = dbConfig?.smtpFromName || 'DSWD FO2 Compliance Hub (Alternate)';
      this.fallbackFromAddress = `"${fFromName} (Fallback)" <${fFrom}>`;

      if (fHost) {
        const smtpPort = parseInt(String(fPort || '587'), 10);
        const useSSL = smtpPort === 465;
        this.fallbackTransporter = nodemailer.createTransport({
          host: fHost,
          port: smtpPort,
          secure: useSSL,
          requireTLS: !useSSL,
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          auth: fUser && fPass ? { user: fUser, pass: fPass } : undefined,
          tls: { rejectUnauthorized: false },
        });
        this.logger.log(`Fallback Email service initialized (SMTP: ${fHost}:${smtpPort})`);
      } else {
        this.fallbackTransporter = null;
      }

    } catch (err: any) {
      this.logger.error(`Failed to load SMTP config: ${err.message}`);
    }
  }

  async sendTicketCreatedEmail(data: TicketEmailData): Promise<void> {
    const typeLabel = data.ticketType === 'desktop_support' ? 'Desktop Support' : 'IT Support';
    const subject = `Compliance Hub - Ticketing #${data.ticketNumber} — ${data.subject}`;
    const ticketUrl = `${this.frontendUrl}/dashboard/tickets/${data.ticketId}`;

    let assignedLine = '';
    if (data.assignedToName) {
      assignedLine = `<tr><td style="padding:6px 12px;font-weight:600;color:#555;">Assigned To</td><td style="padding:6px 12px;">${data.assignedToName}</td></tr>`;
    } else if (data.noTechAvailable) {
      assignedLine = `<tr><td style="padding:6px 12px;font-weight:600;color:#555;">Assigned To</td><td style="padding:6px 12px;color:#e65100;">Your request will be handled once a technician is available.</td></tr>`;
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;background:#f5f5f5;padding:20px;">
  <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#1976d2;padding:20px 24px;">
      <h1 style="margin:0;color:#fff;font-size:18px;">RICTMS IT Help Desk</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Ticket Created Successfully</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;">Hello <strong>${data.requesterName}</strong>,</p>
      <p style="margin:0 0 16px;">Your help desk ticket has been created. Here are the details:</p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;width:140px;">Ticket Number</td><td style="padding:6px 12px;"><a href="${ticketUrl}" style="font-weight:700;font-family:monospace;font-size:15px;color:#1976d2;text-decoration:none;">${data.ticketNumber}</a></td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;color:#555;">Subject</td><td style="padding:6px 12px;">${data.subject}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;">Support Type</td><td style="padding:6px 12px;">${typeLabel}</td></tr>
        ${data.categoryName ? `<tr><td style="padding:6px 12px;font-weight:600;color:#555;">Category</td><td style="padding:6px 12px;">${data.categoryName}</td></tr>` : ''}
        <tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;">Priority</td><td style="padding:6px 12px;">${data.priority ? data.priority.toUpperCase() : 'N/A'}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;color:#555;">Status</td><td style="padding:6px 12px;">${data.status.replace('_', ' ').toUpperCase()}</td></tr>
        ${assignedLine}
        <tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;">Date Created</td><td style="padding:6px 12px;">${data.createdAt}</td></tr>
      </table>

      <div style="background:#f5f5f5;padding:12px;border-radius:4px;margin:16px 0;">
        <p style="margin:0 0 4px;font-weight:600;color:#555;font-size:13px;">Description:</p>
        <p style="margin:0;white-space:pre-wrap;font-size:14px;">${data.description}</p>
      </div>

      <div style="margin:20px 0;text-align:center;">
        <a href="${ticketUrl}" style="background:#1976d2;color:#fff;padding:10px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">View Ticket</a>
      </div>
      <p style="margin:0;font-size:12px;color:#aaa;text-align:center;">If your session has expired, you will be prompted to log in and then redirected to the ticket.</p>
    </div>
    <div style="background:#f5f5f5;padding:12px 24px;text-align:center;font-size:12px;color:#999;">
      RICTMS Compliance Hub — IT Help Desk
    </div>
  </div>
</body>
</html>`;

    await this.send(data.requesterEmail, subject, html);

    // Also notify the assigned tech if one was auto-assigned
    if (data.assignedToEmail) {
      const techSubject = `Compliance Hub - Ticketing #${data.ticketNumber} — Assigned to You — ${data.subject}`;
      const techHtml = html
        .replace('Ticket Created Successfully', 'New Ticket Assigned to You')
        .replace(`Hello <strong>${data.requesterName}</strong>`, `Hello <strong>${data.assignedToName}</strong>`)
        .replace('Your help desk ticket has been created.', `A new ticket has been assigned to you from <strong>${data.requesterName}</strong>.`);
      await this.send(data.assignedToEmail, techSubject, techHtml);
    }
  }

  async sendTicketAssignedEmail(data: TicketAssignedEmailData): Promise<void> {
    const typeLabel =
      data.ticketType === 'desktop_support' ? 'Desktop Support' :
      data.ticketType === 'pantawid_ict_support' ? 'Pantawid ICT Support' : 'IT Support';

    const subject = `Compliance Hub - Ticketing #${data.ticketNumber} — Assigned to You — ${data.subject}`;
    const ticketUrl = `${this.frontendUrl}/dashboard/tickets/${data.ticketId}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;background:#f5f5f5;padding:20px;">
  <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#e65100;padding:20px 24px;">
      <h1 style="margin:0;color:#fff;font-size:18px;">RICTMS IT Help Desk</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Ticket Assigned to You</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;">Hello <strong>${data.technicianName}</strong>,</p>
      <p style="margin:0 0 16px;">A ticket has been assigned to you. Please action it as soon as possible.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;width:140px;">Ticket Number</td><td style="padding:6px 12px;"><a href="${ticketUrl}" style="font-weight:700;font-family:monospace;font-size:15px;color:#e65100;text-decoration:none;">${data.ticketNumber}</a></td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;color:#555;">Subject</td><td style="padding:6px 12px;">${data.subject}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;">Support Type</td><td style="padding:6px 12px;">${typeLabel}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;color:#555;">Priority</td><td style="padding:6px 12px;">${data.priority ? data.priority.toUpperCase() : 'N/A'}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;">Status</td><td style="padding:6px 12px;">${data.status.replace('_', ' ').toUpperCase()}</td></tr>
      </table>
      <div style="margin:20px 0;text-align:center;">
        <a href="${ticketUrl}" style="background:#e65100;color:#fff;padding:10px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">View Ticket</a>
      </div>
      <p style="margin:0;font-size:12px;color:#aaa;text-align:center;">If your session has expired, you will be prompted to log in and then redirected to the ticket.</p>
    </div>
    <div style="background:#f5f5f5;padding:12px 24px;text-align:center;font-size:12px;color:#999;">
      RICTMS Compliance Hub — IT Help Desk
    </div>
  </div>
</body>
</html>`;

    await this.send(data.technicianEmail, subject, html);
  }

  async sendTicketResolvedEmailToRequester(data: TicketResolvedEmailData): Promise<void> {
    const subject = `Compliance Hub - Ticketing #${data.ticketNumber} — Ticket Resolved — Action Required`;
    const ticketUrl = `${this.frontendUrl}/dashboard/tickets/${data.ticketId}`;
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;background:#f5f5f5;padding:20px;">
  <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#2e7d32;padding:20px 24px;">
      <h1 style="margin:0;color:#fff;font-size:18px;">RICTMS IT Help Desk</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Ticket Marked as Resolved — Your Action Required</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;">Hello <strong>${data.requesterName}</strong>,</p>
      <p style="margin:0 0 16px;">Your ticket has been marked as resolved by the assigned technician. Please review and take one of the actions below.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;width:140px;">Ticket Number</td><td style="padding:6px 12px;"><a href="${ticketUrl}" style="font-weight:700;font-family:monospace;font-size:15px;color:#2e7d32;text-decoration:none;">${data.ticketNumber}</a></td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;color:#555;">Subject</td><td style="padding:6px 12px;">${data.subject}</td></tr>
        ${data.technicianName ? `<tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;">Resolved By</td><td style="padding:6px 12px;">${data.technicianName}</td></tr>` : ''}
      </table>

      <div style="background:#e8f5e9;border:1px solid #c8e6c9;padding:16px;border-radius:4px;margin:16px 0;">
        <p style="margin:0 0 8px;font-weight:600;color:#1b5e20;font-size:14px;">What would you like to do?</p>
        <p style="margin:0 0 12px;font-size:13px;color:#388e3c;">Log in to Compliance Hub to take action on this ticket:</p>
        <table style="width:100%;">
          <tr>
            <td style="padding:4px 8px 4px 0;width:50%;">
              <a href="${ticketUrl}" style="background:#2e7d32;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none;font-weight:600;font-size:13px;display:block;text-align:center;">Close Ticket</a>
            </td>
            <td style="padding:4px 0 4px 8px;width:50%;">
              <a href="${ticketUrl}" style="background:#1565c0;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none;font-weight:600;font-size:13px;display:block;text-align:center;">Rate Technician</a>
            </td>
          </tr>
        </table>
      </div>

      <p style="margin:0;font-size:12px;color:#aaa;text-align:center;">If your session has expired, you will be prompted to log in and then redirected to the ticket.</p>
    </div>
    <div style="background:#f5f5f5;padding:12px 24px;text-align:center;font-size:12px;color:#999;">
      RICTMS Compliance Hub — IT Help Desk
    </div>
  </div>
</body>
</html>`;

    await this.send(data.requesterEmail, subject, html);
  }

  async sendTicketClosedOrRatedEmailToTechnician(data: TicketClosedOrRatedEmailData): Promise<void> {
    const actionLabel = data.action === 'rated' ? 'Rated by Requester' : 'Closed by Requester';
    const subject = `Compliance Hub - Ticketing #${data.ticketNumber} — ${actionLabel}`;
    const ticketUrl = `${this.frontendUrl}/dashboard/tickets/${data.ticketId}`;
    const ratingLine = data.action === 'rated' && data.rating
      ? `<tr><td style="padding:6px 12px;font-weight:600;color:#555;">Rating</td><td style="padding:6px 12px;">${data.rating}/5</td></tr>`
      : '';
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;background:#f5f5f5;padding:20px;">
  <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#6a1b9a;padding:20px 24px;">
      <h1 style="margin:0;color:#fff;font-size:18px;">RICTMS IT Help Desk</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${actionLabel}</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;">Hello <strong>${data.technicianName}</strong>,</p>
      <p style="margin:0 0 16px;">Ticket lifecycle update from the requester has been recorded.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;width:140px;">Ticket Number</td><td style="padding:6px 12px;"><a href="${ticketUrl}" style="font-weight:700;font-family:monospace;font-size:15px;color:#6a1b9a;text-decoration:none;">${data.ticketNumber}</a></td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;color:#555;">Subject</td><td style="padding:6px 12px;">${data.subject}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;">Update</td><td style="padding:6px 12px;">${actionLabel}</td></tr>
        ${ratingLine}
      </table>
      <div style="margin:20px 0;text-align:center;">
        <a href="${ticketUrl}" style="background:#6a1b9a;color:#fff;padding:10px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">View Ticket</a>
      </div>
      <p style="margin:0;font-size:12px;color:#aaa;text-align:center;">If your session has expired, you will be prompted to log in and then redirected to the ticket.</p>
    </div>
    <div style="background:#f5f5f5;padding:12px 24px;text-align:center;font-size:12px;color:#999;">
      RICTMS Compliance Hub — IT Help Desk
    </div>
  </div>
</body>
</html>`;

    await this.send(data.technicianEmail, subject, html);
  }

  async sendNonAttendanceEmail(
    recipientEmail: string,
    recipientName: string,
    date: string,
    absentStaff: Array<{ name: string; email: string; role: string }>,
  ): Promise<void> {
    const subject = `[RICTMS] Non-Attendance Report — ${date}`;
    const rows = absentStaff
      .map(s => `<tr><td style="padding:4px 8px;">${s.name}</td><td style="padding:4px 8px;">${s.email}</td><td style="padding:4px 8px;">${s.role.replace(/_/g,' ')}</td></tr>`)
      .join('');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;">
  <h2>Non-Attendance Report — ${date}</h2>
  <p>Hello ${recipientName},</p>
  <p>The following RICTMS staff did not log in or were marked absent on <strong>${date}</strong>:</p>
  <table style="width:100%;border-collapse:collapse;margin:12px 0;">
    <thead><tr style="background:#eee;"><th style="padding:6px 8px;text-align:left;">Name</th><th style="padding:6px 8px;text-align:left;">Email</th><th style="padding:6px 8px;text-align:left;">Role</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="font-size:13px;color:#888;">This is an automated report from RICTMS Compliance Hub.</p>
</body>
</html>`;

    await this.send(recipientEmail, subject, html);
  }

  async sendTestEmail(to: string): Promise<{ sent: boolean; message: string }> {
    const subject = 'RICTMS Compliance Hub — SMTP Test Email';
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;background:#f5f5f5;padding:20px;">
  <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#1976d2;padding:20px 24px;">
      <h1 style="margin:0;color:#fff;font-size:18px;">RICTMS Compliance Hub</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">SMTP Configuration Test</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;">This is a test email sent from the RICTMS Compliance Hub system.</p>
      <p style="margin:0 0 16px;">If you received this message, your SMTP configuration is working correctly.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;width:140px;">From</td><td style="padding:6px 12px;">${this.primaryFromAddress}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;color:#555;">To</td><td style="padding:6px 12px;">${to}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;">Sent At</td><td style="padding:6px 12px;">${new Date().toISOString()}</td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:13px;color:#888;">No action required — this is an automated test message.</p>
    </div>
    <div style="background:#f5f5f5;padding:12px 24px;text-align:center;font-size:12px;color:#999;">
      RICTMS Compliance Hub — Email Test
    </div>
  </div>
</body>
</html>`;

    if (!this.primaryTransporter && !this.fallbackTransporter) {
      this.logger.warn('[EMAIL-TEST] SMTP not configured — test email was NOT sent.');
      return { sent: false, message: 'SMTP not configured. Please save SMTP credentials in Ticket Settings.' };
    }

    if (!this.emailEnabled) {
      this.logger.warn('[EMAIL-TEST] Outbound email is disabled by EMAIL_ENABLED flag.');
      return { sent: false, message: 'Email sending is currently disabled by EMAIL_ENABLED=false.' };
    }

    try {
      const transporter = this.primaryTransporter || this.fallbackTransporter;
      if (!transporter) throw new Error('No SMTP configured');
      const from = this.primaryTransporter ? this.primaryFromAddress : this.fallbackFromAddress;
      await transporter.sendMail({ from, to, subject, html });
      this.logger.log(`[EMAIL-TEST] Test email sent to ${to}`);
      return { sent: true, message: `Test email sent successfully to ${to}` };
    } catch (err: any) {
      this.logger.error(`[EMAIL-TEST] Failed: ${err?.message}`);
      return { sent: false, message: `SMTP error: ${err?.message}` };
    }
  }

  public async sendGenericEmail(to: string, subject: string, html: string): Promise<void> {
    await this.send(to, subject, html);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.emailEnabled) {
      this.logger.log(`[EMAIL-DISABLED] Suppressed email to ${to}: ${subject}`);
      return;
    }

    const effectiveTo = this.testOverrideTo ?? to;
    if (this.testOverrideTo && this.testOverrideTo !== to) {
      this.logger.log(`[EMAIL-OVERRIDE] Redirecting from ${to} to ${this.testOverrideTo}`);
    }

    if (!this.primaryTransporter && !this.fallbackTransporter) {
      this.logger.log(`[EMAIL-LOG] To: ${effectiveTo} | Subject: ${subject}`);
      return;
    }

    try {
      const dbConfig = await this.configRepo.findOne({ where: { id: 1 } });
      const today = new Date().toISOString().split('T')[0];
      let limit = dbConfig?.primarySmtpDailyLimit || 500;
      let sentToday = dbConfig?.primarySmtpSentToday || 0;
      let lastSentDate = dbConfig?.primarySmtpLastSentDate;

      if (lastSentDate !== today) {
        sentToday = 0;
      }

      let activeTransporter = this.primaryTransporter;
      let activeFrom = this.primaryFromAddress;
      let usedFallback = false;

      if (!activeTransporter || sentToday >= limit) {
        activeTransporter = this.fallbackTransporter;
        activeFrom = this.fallbackFromAddress;
        usedFallback = true;
      }

      if (!activeTransporter) {
        this.logger.error('No valid SMTP transporter available to send email.');
        return;
      }

      await activeTransporter.sendMail({
        from: activeFrom,
        to: effectiveTo,
        subject,
        html,
      });

      this.logger.log(`Email sent to ${effectiveTo}: ${subject} ${usedFallback ? '(Fallback)' : '(Primary)'}`);

      if (!usedFallback && dbConfig) {
        dbConfig.primarySmtpSentToday = sentToday + 1;
        dbConfig.primarySmtpLastSentDate = today;
        await this.configRepo.save(dbConfig);
      }
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${effectiveTo}: ${err?.message}`);
    }
  }
}
