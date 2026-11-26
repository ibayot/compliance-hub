import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { UsersHttpClient } from '../../common/http-clients/users.http-client';
import { DemoFileKey, DemoTicketFiles } from './demo-ticket-files';
import { DemoQueryTarget, DemoTicketStore } from './demo-ticket-store';
import { DemoActor, DemoRun, demoSupportTypes } from './demo.types';

type Ticket = {
  id: string; runId: string; ticketNumber: string; requesterId: number; technicianId: number;
  filedBy: number; subject: string; description: string; supportType: string;
  status: 'assigned' | 'in_progress' | 'resolved' | 'closed'; resolutionNotes: string | null;
  createdAt: string;
};
type Attachment = { id: string; fileName: string; mimeType: string };
const PAGE_SIZE = 25;
const manilaYear = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', year: 'numeric' });
const createdAtColumn = 'CAST(created_at AS CHAR) AS createdAt';
const ticketColumns = `id, run_id AS runId, ticket_number AS ticketNumber, requester_id AS requesterId,
  technician_id AS technicianId, filed_by AS filedBy, subject, description, support_type AS supportType,
  status, resolution_notes AS resolutionNotes, ${createdAtColumn}`;
const summaryColumns = `id, run_id AS runId, ticket_number AS ticketNumber, subject, support_type AS supportType, status, ${createdAtColumn}`;

@Injectable()
export class DemoTicketsService {
  private readonly logger = new Logger(DemoTicketsService.name);
  private cleaning = false;

  constructor(private readonly store: DemoTicketStore, private readonly files: DemoTicketFiles, private readonly users: UsersHttpClient) {}

  async list(page: number, actor?: DemoActor) {
    const offset = (page - 1) * PAGE_SIZE;
    const items = await this.store.rows<Ticket>(this.store.db, `
      SELECT ${summaryColumns} FROM demo_tickets ${actor ? 'WHERE run_id = ?' : ''}
      ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?
    `, [...(actor ? [actor.id] : []), PAGE_SIZE + 1, offset]);
    return { items: items.slice(0, PAGE_SIZE), hasMore: items.length > PAGE_SIZE };
  }

  private async ticket(db: DemoQueryTarget, id: string, actor?: DemoActor, lock = false) {
    const [ticket] = await this.store.rows<Ticket>(db, `
      SELECT ${ticketColumns} FROM demo_tickets WHERE id = ?
      ${actor ? 'AND run_id = ? AND (requester_id = ? OR technician_id = ?)' : ''}
      ${lock ? 'FOR UPDATE' : ''}
    `, actor ? [id, actor.id, actor.userId, actor.userId] : [id]);
    if (!ticket) throw new NotFoundException('Demo ticket not found.');
    return ticket;
  }

  async detail(id: string, actor?: DemoActor) {
    const db = this.store.db;
    const ticket = await this.ticket(db, id, actor);
    const [comments, events, ratings, attachments] = await Promise.all([
      this.store.rows(db, `SELECT id, author_id AS authorId, body, ${createdAtColumn} FROM demo_ticket_comments WHERE ticket_id = ? ORDER BY id`, [id]),
      this.store.rows(db, `SELECT id, actor_id AS actorId, action, ${createdAtColumn} FROM demo_ticket_events WHERE ticket_id = ? ORDER BY id`, [id]),
      this.store.rows(db, `SELECT rating, feedback, ${createdAtColumn} FROM demo_ticket_ratings WHERE ticket_id = ?`, [id]),
      this.store.rows(db, 'SELECT id, file_name AS fileName, mime_type AS mimeType FROM demo_ticket_attachments WHERE ticket_id = ? AND ready = TRUE ORDER BY created_at, id', [id]),
    ]);
    return { ...ticket, comments, events, rating: ratings[0] ?? null, attachments };
  }

  async create(actor: DemoRun & { userId: number }, data: { subject: string; description: string; supportType: typeof demoSupportTypes[number] }) {
    const id = randomUUID();
    await this.store.transaction(async db => {
      const year = Number(manilaYear.format(new Date()));
      await this.store.write(db, `
        INSERT INTO demo_ticket_sequences (ticket_year, last_number) VALUES (?, 1)
        ON DUPLICATE KEY UPDATE last_number = last_number + 1
      `, [year]);
      const [{ count }] = await this.store.rows<{ count: number }>(db, 'SELECT last_number AS count FROM demo_ticket_sequences WHERE ticket_year = ?', [year]);
      const number = `DEMO-TKT-${year}-${String(count).padStart(4, '0')}`;
      await this.store.write(db, `
        INSERT INTO demo_tickets (id, run_id, ticket_number, requester_id, technician_id, filed_by, subject, description, support_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
      `, [id, actor.id, number, actor.requesterId, actor.technicianId, actor.userId, this.required(data.subject), this.required(data.description), data.supportType]);
      await this.event(db, id, actor.userId, 'assigned');
    });
    return this.detail(id);
  }

  private required(value?: string) {
    if (!value?.trim()) throw new BadRequestException('Enter the required text.');
    return value.trim();
  }

  private event(db: DemoQueryTarget, id: string, actorId: number, action: Ticket['status']) {
    return this.store.write(db, 'INSERT INTO demo_ticket_events (ticket_id, actor_id, action, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP(3))', [id, actorId, action]);
  }

  async comment(actor: DemoActor, id: string, body: string) {
    await this.store.transaction(async db => {
      const ticket = await this.ticket(db, id, actor, true);
      if (ticket.status === 'closed') throw new ConflictException('This demo ticket is closed.');
      await this.store.write(db, 'INSERT INTO demo_ticket_comments (ticket_id, author_id, body, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP(3))', [id, actor.userId, this.required(body)]);
    });
    return this.detail(id, actor);
  }

  async status(actor: DemoActor, id: string, status: 'in_progress' | 'resolved', notes?: string) {
    if (actor.role !== 'technician') throw new ForbiddenException();
    await this.store.transaction(async db => {
      const ticket = await this.ticket(db, id, actor, true);
      const expected = status === 'in_progress' ? 'assigned' : 'in_progress';
      if (ticket.status !== expected) throw new ConflictException('Refresh the ticket before updating its status.');
      const resolution = status === 'resolved' ? this.required(notes) : null;
      await this.store.write(db, 'UPDATE demo_tickets SET status = ?, resolution_notes = ? WHERE id = ?', [status, resolution, id]);
      await this.event(db, id, actor.userId, status);
    });
    return this.detail(id, actor);
  }

  async rate(actor: DemoActor, id: string, rating: number, feedback?: string) {
    if (actor.role !== 'user') throw new ForbiddenException();
    await this.store.transaction(async db => {
      const ticket = await this.ticket(db, id, actor, true);
      if (ticket.status !== 'resolved') throw new ConflictException('Only a resolved demo ticket can be rated.');
      await this.store.write(db, 'INSERT INTO demo_ticket_ratings (ticket_id, rating, feedback, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP(3))', [id, rating, feedback?.trim() || null]);
      await this.store.write(db, "UPDATE demo_tickets SET status = 'closed' WHERE id = ?", [id]);
      await this.event(db, id, actor.userId, 'closed');
    });
    return this.detail(id, actor);
  }

  async upload(actor: DemoActor, id: string, file?: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('Choose a file to attach.');
    const attachmentId = randomUUID();
    const mimeType = this.files.fileType(file.buffer);
    const fileName = file.originalname.replace(/[^\p{L}\p{N}_.() -]/gu, '_').slice(-230) || 'Attachment';
    await this.store.transaction(async db => {
      const ticket = await this.ticket(db, id, actor, true);
      if (ticket.status === 'closed') throw new ConflictException('This demo ticket is closed.');
      await this.store.write(db, `
        INSERT INTO demo_ticket_attachments (id, ticket_id, file_name, mime_type, created_at)
        VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3))
      `, [attachmentId, id, fileName, mimeType]);
    });

    // Keep the file key durable before writing so a crash leaves it eligible for ticket cleanup.
    await this.store.transaction(async db => {
      const ticket = await this.ticket(db, id, actor, true);
      if (ticket.status === 'closed') throw new ConflictException('This demo ticket is closed.');
      await this.files.write({ runId: ticket.runId, ticketId: id, attachmentId }, file.buffer);
      await this.store.write(db, 'UPDATE demo_ticket_attachments SET ready = TRUE WHERE id = ? AND ticket_id = ?', [attachmentId, id]);
    });
    return this.detail(id, actor);
  }

  async download(id: string, attachmentId: string, actor?: DemoActor) {
    const ticket = await this.ticket(this.store.db, id, actor);
    const [attachment] = await this.store.rows<Attachment>(this.store.db, `
      SELECT file_name AS fileName, mime_type AS mimeType FROM demo_ticket_attachments WHERE id = ? AND ticket_id = ? AND ready = TRUE
    `, [attachmentId, id]);
    if (!attachment) throw new NotFoundException('Demo attachment not found.');
    const content = await this.files.read({ runId: ticket.runId, ticketId: id, attachmentId }).catch(error => {
      if (error.code === 'ENOENT') throw new NotFoundException('Demo attachment not found.');
      throw error;
    });
    return { ...attachment, content };
  }

  private async remove(id: string, expectedRun?: string) {
    const runId = await this.store.transaction(async db => {
      const ticket = await this.ticket(db, id, undefined, true);
      if (expectedRun && expectedRun !== ticket.runId) throw new NotFoundException('Demo ticket not found.');
      await this.store.write(db, `
        INSERT INTO demo_file_cleanup (attachment_id, ticket_id, run_id, queued_at)
        SELECT id, ticket_id, ?, UTC_TIMESTAMP(3) FROM demo_ticket_attachments WHERE ticket_id = ?
      `, [ticket.runId, id]);
      await this.store.deleteTicket(db, id, ticket.runId);
      return ticket.runId;
    });
    return runId;
  }

  async deleteTicket(id: string) {
    const runId = await this.remove(id);
    await this.drainFiles({ runId, ticketId: id });
    const [pending] = await this.store.rows(this.store.db, 'SELECT attachment_id FROM demo_file_cleanup WHERE ticket_id = ? LIMIT 1', [id]);
    return { deleted: true, filesPending: Boolean(pending) };
  }

  private async drainFiles(scope?: { runId: string; ticketId: string }) {
    const db = this.store.db;
    const keys = await this.store.rows<DemoFileKey>(db, `
      SELECT attachment_id AS attachmentId, ticket_id AS ticketId, run_id AS runId FROM demo_file_cleanup
      ${scope ? 'WHERE run_id = ? AND ticket_id = ?' : ''}
      ORDER BY queued_at LIMIT 100
    `, scope ? [scope.runId, scope.ticketId] : []);
    for (const key of keys) {
      try {
        await this.files.remove(key);
        await this.store.deleteFileCleanup(db, key.attachmentId);
      } catch {
        this.logger.warn('A demo attachment could not be removed and will be retried.');
        await this.store.write(db, 'UPDATE demo_file_cleanup SET queued_at = UTC_TIMESTAMP(3) WHERE attachment_id = ?', [key.attachmentId]);
      }
    }
  }

  @Interval(60000)
  async pruneExpired() {
    if (this.cleaning) return;
    this.cleaning = true;
    try {
      const runs = await this.users.listExpiredDemoRuns();
      for (const { id } of runs) {
        const tickets = await this.store.rows<{ id: string }>(this.store.db, 'SELECT id FROM demo_tickets WHERE run_id = ? LIMIT 100', [id]);
        for (const ticket of tickets) {
          await this.remove(ticket.id, id).catch(error => { if (!(error instanceof NotFoundException)) throw error; });
        }
      }
      await this.drainFiles();
      for (const { id } of runs) {
        const [pending] = await this.store.rows(this.store.db, `
          SELECT 1 FROM demo_tickets WHERE run_id = ?
          UNION ALL SELECT 1 FROM demo_file_cleanup WHERE run_id = ? LIMIT 1
        `, [id, id]);
        if (!pending) await this.users.acknowledgeDemoPurge(id);
      }
    } catch {
      this.logger.warn('Demo retention cleanup will retry at the next interval.');
    } finally {
      this.cleaning = false;
    }
  }
}
