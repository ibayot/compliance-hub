import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface TicketEmailData {
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
  ticketNumber: string;
  subject: string;
  ticketType: string;
  priority: string | null;
  status: string;
  technicianName: string;
  technicianEmail: string;
}

export interface TicketResolvedEmailData {
  ticketNumber: string;
  subject: string;
  requesterName: string;
  requesterEmail: string;
  technicianName?: string;
}

export interface TicketClosedOrRatedEmailData {
  ticketNumber: string;
  subject: string;
  technicianName: string;
  technicianEmail: string;
  action: 'closed' | 'rated';
  rating?: number | null;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromAddress: string;
  private emailEnabled = true;
  /** When set, ALL outbound emails are redirected here instead of the real recipient */
  private testOverrideTo: string | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const rawFrom = this.configService.get<string>('SMTP_FROM') || 'noreply@rictms.gov.ph';
    const fromName = this.configService.get<string>('SMTP_FROM_NAME') || 'DSWD FO2 Compliance Hub';
    // Use "Display Name <email>" format so email clients show the friendly name
    this.fromAddress = `"${fromName}" <${rawFrom}>`;

    if (host) {
      const smtpPort = parseInt(String(port || '587'), 10);
      const useSSL = smtpPort === 465;
      this.transporter = nodemailer.createTransport({
        host,
        port: smtpPort,
        secure: useSSL,
        requireTLS: !useSSL,   // force STARTTLS upgrade on port 587
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        auth: user && pass ? { user, pass } : undefined,
        tls: { rejectUnauthorized: false },
      });
      this.logger.log(`Email service initialized (SMTP: ${host}:${smtpPort}, SSL=${useSSL})`);
    } else {
      this.logger.warn('SMTP not configured — emails will be logged but not sent. Set SMTP_HOST in .env to enable.');
    }

    const emailEnabledRaw = String(this.configService.get<string>('EMAIL_ENABLED') ?? 'true').toLowerCase();
    this.emailEnabled = !['0', 'false', 'no', 'off'].includes(emailEnabledRaw);
    if (!this.emailEnabled) {
      this.logger.warn('[EMAIL] Outbound email sending is disabled by EMAIL_ENABLED flag.');
    }

    // Keep a single override target for QA routing when email is enabled.
    const override = this.configService.get<string>('EMAIL_TEST_OVERRIDE') ?? '';
    this.testOverrideTo = override;
  }

  /** Send a ticket creation confirmation email to the requester */
  async sendTicketCreatedEmail(data: TicketEmailData): Promise<void> {
    const typeLabel = data.ticketType === 'desktop_support' ? 'Desktop Support' : 'IT Support';
    const subject = `Compliance Hub - Ticketing #${data.ticketNumber} — ${data.subject}`;

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
        <tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;width:140px;">Ticket Number</td><td style="padding:6px 12px;font-weight:700;font-family:monospace;font-size:15px;">${data.ticketNumber}</td></tr>
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

      <p style="margin:16px 0 0;font-size:13px;color:#888;">You can track your ticket status by logging in to the Compliance Hub portal.</p>
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

  /** Send an assignment notification to the technician when a ticket is manually assigned/reassigned */
  async sendTicketAssignedEmail(data: TicketAssignedEmailData): Promise<void> {
    const typeLabel =
      data.ticketType === 'desktop_support' ? 'Desktop Support' :
      data.ticketType === 'pantawid_ict_support' ? 'Pantawid ICT Support' : 'IT Support';

    const subject = `Compliance Hub - Ticketing #${data.ticketNumber} — Assigned to You — ${data.subject}`;

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
        <tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;width:140px;">Ticket Number</td><td style="padding:6px 12px;font-weight:700;font-family:monospace;font-size:15px;">${data.ticketNumber}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;color:#555;">Subject</td><td style="padding:6px 12px;">${data.subject}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;">Support Type</td><td style="padding:6px 12px;">${typeLabel}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;color:#555;">Priority</td><td style="padding:6px 12px;">${data.priority ? data.priority.toUpperCase() : 'N/A'}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;">Status</td><td style="padding:6px 12px;">${data.status.replace('_', ' ').toUpperCase()}</td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:13px;color:#888;">Please log in to the Compliance Hub portal to view the full ticket details and take action.</p>
    </div>
    <div style="background:#f5f5f5;padding:12px 24px;text-align:center;font-size:12px;color:#999;">
      RICTMS Compliance Hub — IT Help Desk
    </div>
  </div>
</body>
</html>`;

    await this.send(data.technicianEmail, subject, html);
  }

  /** Notify requester that the ticket was resolved and ask for technician rating */
  async sendTicketResolvedEmailToRequester(data: TicketResolvedEmailData): Promise<void> {
    const subject = `Compliance Hub - Ticketing #${data.ticketNumber} — Ticket Resolved — Please Rate Technician`;
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;background:#f5f5f5;padding:20px;">
  <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#2e7d32;padding:20px 24px;">
      <h1 style="margin:0;color:#fff;font-size:18px;">RICTMS IT Help Desk</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Ticket Marked as Resolved</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;">Hello <strong>${data.requesterName}</strong>,</p>
      <p style="margin:0 0 16px;">Your ticket has been marked as resolved.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;width:140px;">Ticket Number</td><td style="padding:6px 12px;font-weight:700;font-family:monospace;font-size:15px;">${data.ticketNumber}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;color:#555;">Subject</td><td style="padding:6px 12px;">${data.subject}</td></tr>
        ${data.technicianName ? `<tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;">Technician</td><td style="padding:6px 12px;">${data.technicianName}</td></tr>` : ''}
      </table>
      <div style="background:#fff3e0;border:1px solid #ffe0b2;color:#e65100;padding:12px;border-radius:4px;">
        Please log in to Compliance Hub and rate the technician for this resolved ticket.
      </div>
    </div>
    <div style="background:#f5f5f5;padding:12px 24px;text-align:center;font-size:12px;color:#999;">
      RICTMS Compliance Hub — IT Help Desk
    </div>
  </div>
</body>
</html>`;

    await this.send(data.requesterEmail, subject, html);
  }

  /** Notify technician when ticket is closed by requester or when rating is submitted */
  async sendTicketClosedOrRatedEmailToTechnician(data: TicketClosedOrRatedEmailData): Promise<void> {
    const actionLabel = data.action === 'rated' ? 'Rated by Requester' : 'Closed by Requester';
    const subject = `Compliance Hub - Ticketing #${data.ticketNumber} — ${actionLabel}`;
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
        <tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;width:140px;">Ticket Number</td><td style="padding:6px 12px;font-weight:700;font-family:monospace;font-size:15px;">${data.ticketNumber}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:600;color:#555;">Subject</td><td style="padding:6px 12px;">${data.subject}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;">Update</td><td style="padding:6px 12px;">${actionLabel}</td></tr>
        ${ratingLine}
      </table>
    </div>
    <div style="background:#f5f5f5;padding:12px 24px;text-align:center;font-size:12px;color:#999;">
      RICTMS Compliance Hub — IT Help Desk
    </div>
  </div>
</body>
</html>`;

    await this.send(data.technicianEmail, subject, html);
  }

  /** Send non-attendance consolidated email to section head */
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

  /** Send a test email to verify SMTP connectivity */
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
        <tr style="background:#f9f9f9;"><td style="padding:6px 12px;font-weight:600;color:#555;width:140px;">From</td><td style="padding:6px 12px;">${this.fromAddress}</td></tr>
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

    if (!this.transporter) {
      this.logger.warn('[EMAIL-TEST] SMTP not configured — test email was NOT sent.');
      return { sent: false, message: 'SMTP not configured. Set SMTP_HOST in .env to enable email sending.' };
    }

    if (!this.emailEnabled) {
      this.logger.warn('[EMAIL-TEST] Outbound email is disabled by EMAIL_ENABLED flag.');
      return { sent: false, message: 'Email sending is currently disabled by EMAIL_ENABLED=false.' };
    }

    try {
      await this.transporter.sendMail({ from: this.fromAddress, to, subject, html });
      this.logger.log(`[EMAIL-TEST] Test email sent to ${to}`);
      return { sent: true, message: `Test email sent successfully to ${to}` };
    } catch (err: any) {
      this.logger.error(`[EMAIL-TEST] Failed: ${err?.message}`);
      return { sent: false, message: `SMTP error: ${err?.message}` };
    }
  }

  // ── Core send ───────────────────────────────────────────────────────────

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.emailEnabled) {
      this.logger.log(`[EMAIL-DISABLED] Suppressed email to ${to}: ${subject}`);
      return;
    }

    // Redirect to test override if configured (testing mode — all emails go to override address)
    const effectiveTo = this.testOverrideTo ?? to;
    if (this.testOverrideTo && this.testOverrideTo !== to) {
      this.logger.log(`[EMAIL-OVERRIDE] Redirecting from ${to} to ${this.testOverrideTo}`);
    }

    if (!this.transporter) {
      this.logger.log(`[EMAIL-LOG] To: ${effectiveTo} | Subject: ${subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: effectiveTo,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${effectiveTo}: ${subject}`);
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${effectiveTo}: ${err?.message}`);
    }
  }
}
