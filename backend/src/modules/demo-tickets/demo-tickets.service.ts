import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { UsersHttpClient } from '../../common/http-clients/users.http-client';
import { deriveSatisfactionRating } from '../tickets/services/ticket-satisfaction-rating';
import { demoRequesterCategories } from './demo-requester-catalog';
import { DemoFileKey, DemoTicketFiles } from './demo-ticket-files';
import { DemoQueryTarget, DemoTicketStore } from './demo-ticket-store';
import { DemoActor, DemoRun, demoSupportTypes } from './demo.types';

type Ticket = {
  id: string; runId: string; ticketNumber: string; requesterId: number; technicianId: number;
  filedBy: number; subject: string; description: string; supportType: string;
  status: 'assigned' | 'in_progress' | 'resolved' | 'closed'; resolutionNotes: string | null;
  createdAt: string; categoryKey: string | null;
};
type Attachment = { id: string; fileName: string; mimeType: string; commentId: number | null; replacesId: string | null; uploadedBy: number | null; createdAt: string };
type DemoFile = { attachmentId: string; fileName: string; mimeType: string; buffer: Buffer };
type DemoCreate = { subject: string; description: string; supportType: typeof demoSupportTypes[number]; categoryKey?: string };
const PAGE_SIZE = 25;
const manilaYear = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', year: 'numeric' });
const createdAtColumn = 'CAST(created_at AS CHAR) AS createdAt';
const ticketColumns = `id, run_id AS runId, ticket_number AS ticketNumber, requester_id AS requesterId,
  technician_id AS technicianId, filed_by AS filedBy, subject, description, support_type AS supportType, category_key AS categoryKey,
  status, resolution_notes AS resolutionNotes, ${createdAtColumn}`;
const summaryColumns = `id, run_id AS runId, ticket_number AS ticketNumber, subject, support_type AS supportType, status, ${createdAtColumn}`;
const withCategory = <T extends Ticket>(ticket: T) => ({ ...ticket,
  categoryName: demoRequesterCategories.find(category => category.id === ticket.categoryKey)?.name ?? null,
});

@Injectable()
export class DemoTicketsService {
  private readonly logger = new Logger(DemoTicketsService.name);
  private cleaning = false;

  constructor(private readonly store: DemoTicketStore, private readonly files: DemoTicketFiles, private readonly users: UsersHttpClient) {}

  async list(page: number, actor?: DemoActor, filters: { status?: string; search?: string } = {}) {
    const offset = (page - 1) * PAGE_SIZE;
    const conditions: string[] = [];
    const params: Array<string | number> = [];
    if (actor) { conditions.push('run_id = ?'); params.push(actor.id); }
    if (filters.status) { conditions.push('status = ?'); params.push(filters.status); }
    if (filters.search) {
      conditions.push('(LOCATE(?, ticket_number) > 0 OR LOCATE(?, subject) > 0)');
      params.push(filters.search, filters.search);
    }
    const items = await this.store.rows<Ticket>(this.store.db, `
      SELECT ${summaryColumns} FROM demo_tickets ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
      ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?
    `, [...params, PAGE_SIZE + 1, offset]);
    return { items: items.slice(0, PAGE_SIZE), hasMore: items.length > PAGE_SIZE };
  }

  async requesterDashboard(actor: DemoActor) {
    if (actor.role !== 'user') throw new ForbiddenException();
    const counts = await this.store.rows<{ status: Ticket['status']; total: number | string; pending: number | string }>(this.store.db, `
      SELECT status, COUNT(*) AS total,
        SUM(status IN ('resolved', 'closed') AND NOT EXISTS (SELECT 1 FROM demo_ticket_ratings WHERE ticket_id = demo_tickets.id)) AS pending
      FROM demo_tickets WHERE run_id = ? AND requester_id = ?
      GROUP BY status
    `, [actor.id, actor.userId]);
    const totals = Object.fromEntries(counts.map(row => [row.status, Number(row.total)]));
    const resolved = totals.resolved ?? 0;
    const closed = totals.closed ?? 0;
    const pendingCount = counts.reduce((sum, row) => sum + Number(row.pending), 0);
    return { open: totals.assigned ?? 0, inProgress: totals.in_progress ?? 0, resolved, closed, pendingCount,
      satisfactionFillRate: resolved + closed ? 100 * (resolved + closed - pendingCount) / (resolved + closed) : 0 };
  }

  async requesterQueue(actor: DemoActor, query: Record<string, unknown>) {
    if (actor.role !== 'user') throw new ForbiddenException();
    const read = (key: string, format: RegExp = /^.{1,255}$/u) => {
      const value = query[key];
      if (value == null || value === '') return undefined;
      if (typeof value !== 'string' || !format.test(value)) throw new BadRequestException(`Invalid demo queue ${key}.`);
      return value;
    };
    const page = Number(read('page', /^[1-9]\d{0,4}$/) ?? 1);
    const limit = Number(read('limit', /^[1-9]\d?$/) ?? PAGE_SIZE);
    const filters = ['run_id = ?', 'requester_id = ?'];
    const values: Array<string | number> = [actor.id, actor.userId];
    const add = (clause: string, value?: string | number) => {
      filters.push(clause);
      if (value !== undefined) values.push(value);
    };
    if (read('proxyCreatedByMe') === 'true' || read('priority') || read('slaState')) add('1 = 0');
    const supportType = read('supportType');
    if (supportType) add('support_type = ?', supportType);
    const search = read('search');
    if (search) {
      const term = search.toLowerCase();
      if (!['demo user', 'demo technician'].some(name => name.includes(term))) {
        add(`(LOCATE(?, ticket_number) > 0 OR LOCATE(?, subject) > 0 OR category_key IN (${demoRequesterCategories.map(() => '?').join(', ')}))`, search);
        values.push(search, ...demoRequesterCategories.map(category => category.name.toLowerCase().includes(term) ? category.id : ''));
      }
    }
    const date = read('date', /^\d{4}-\d{2}-\d{2}$/);
    const createdLocal = 'DATE_ADD(created_at, INTERVAL 8 HOUR)';
    if (date) {
      add(read('includeCarryover') === 'true'
        ? `(DATE(${createdLocal}) = ? OR (DATE(${createdLocal}) < ? AND status IN ('assigned', 'in_progress')))`
        : `DATE(${createdLocal}) = ?`, date);
      if (read('includeCarryover') === 'true') values.push(date);
    } else {
      const year = read('year', /^\d{4}$/);
      const month = read('month', /^(?:[1-9]|1[0-2])$/);
      const quarter = read('quarter', /^[1-4]$/);
      const semester = read('semester', /^[12]$/);
      if (year) add(`YEAR(${createdLocal}) = ?`, Number(year));
      if (month) add(`MONTH(${createdLocal}) = ?`, Number(month));
      if (quarter) add(`QUARTER(${createdLocal}) = ?`, Number(quarter));
      if (semester) add(`CEIL(MONTH(${createdLocal}) / 6) = ?`, Number(semester));
    }
    const statusFilter = read('status');
    const pending = read('pendingSatisfaction') === 'true';
    const pendingSql = "status IN ('resolved', 'closed') AND NOT EXISTS (SELECT 1 FROM demo_ticket_ratings WHERE ticket_id = demo_tickets.id)";
    const scopeSql = filters.join(' AND ');
    const rowSql = [scopeSql, ...(statusFilter ? ['status = ?'] : []), ...(pending ? [pendingSql] : [])].join(' AND ');
    const rowValues = statusFilter ? [...values, statusFilter] : values;
    const db = this.store.db;
    const anchorId = read('aroundTicketId', /^[0-9a-f-]{36}$/i);
    if (anchorId) {
      const [anchor] = await this.store.rows<{ createdAt: string }>(db, `SELECT ${createdAtColumn} FROM demo_tickets WHERE ${rowSql} AND id = ?`, [...rowValues, anchorId]);
      const findNeighbor = (newer: boolean) => {
        const comparison = newer ? '>' : '<';
        const order = newer ? 'ASC' : 'DESC';
        return this.store.rows<{ id: string }>(db, `SELECT id FROM demo_tickets WHERE ${rowSql}
          AND (created_at, id) ${comparison} (?, ?) ORDER BY created_at ${order}, id ${order} LIMIT 1`, [...rowValues, anchor.createdAt, anchorId]);
      };
      const [older, newer] = anchor ? await Promise.all([findNeighbor(false), findNeighbor(true)]) : [[], []];
      return { neighbors: { olderId: older[0]?.id ?? null, newerId: newer[0]?.id ?? null } };
    }
    const [counts, rows] = await Promise.all([
      this.store.rows<{ status: string; total: number | string; pending: number | string }>(db, `
        SELECT status, COUNT(*) AS total, SUM(${pendingSql}) AS pending FROM demo_tickets WHERE ${scopeSql} GROUP BY status`, values),
      this.store.rows<Ticket & { satisfactionSubmittedAt: string | null }>(db, `
        SELECT ${ticketColumns},
          (SELECT CAST(created_at AS CHAR) FROM demo_ticket_ratings WHERE ticket_id = demo_tickets.id) AS satisfactionSubmittedAt
        FROM demo_tickets WHERE ${rowSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [...rowValues, limit, (page - 1) * limit]),
    ]);
    const statusCounts = Object.fromEntries(counts.map(row => [row.status, Number(row.total)]));
    const total = counts.filter(row => !statusFilter || row.status === statusFilter).reduce((sum, row) => sum + Number(pending ? row.pending : row.total), 0);
    return { items: rows.map(withCategory), statusCounts, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
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
      this.store.rows<{ rating: string | number; createdAt: string }>(db, `SELECT rating, ${createdAtColumn} FROM demo_ticket_ratings WHERE ticket_id = ?`, [id]),
      this.store.rows<Attachment>(db, `SELECT id, file_name AS fileName, mime_type AS mimeType, comment_id AS commentId,
        replaces_id AS replacesId, uploaded_by AS uploadedBy, ${createdAtColumn}
        FROM demo_ticket_attachments WHERE ticket_id = ? AND ready = TRUE ORDER BY created_at, id`, [id]),
    ]);
    const submitted = ratings[0];
    return {
      ...withCategory(ticket), comments, events, attachments,
      rating: submitted ? { rating: Number(submitted.rating), createdAt: submitted.createdAt } : null,
    };
  }

  async create(actor: DemoRun & { userId: number }, data: DemoCreate, files: Express.Multer.File[] = []) {
    const id = randomUUID();
    const category = demoRequesterCategories.find(item => item.id === data.categoryKey && item.supportType === data.supportType);
    if (data.categoryKey && !category) throw new BadRequestException('Select a category for the chosen support type.');
    await this.withImages(actor.id, id, files, async (db, images) => {
      const year = Number(manilaYear.format(new Date()));
      await this.store.write(db, `
        INSERT INTO demo_ticket_sequences (ticket_year, last_number) VALUES (?, 1)
        ON DUPLICATE KEY UPDATE last_number = last_number + 1
      `, [year]);
      const [{ count }] = await this.store.rows<{ count: number }>(db, 'SELECT last_number AS count FROM demo_ticket_sequences WHERE ticket_year = ?', [year]);
      const number = `DEMO-TKT-${year}-${String(count).padStart(4, '0')}`;
      await this.store.write(db, `
        INSERT INTO demo_tickets (id, run_id, ticket_number, requester_id, technician_id, filed_by, subject, description, support_type, category_key, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
      `, [id, actor.id, number, actor.requesterId, actor.technicianId, actor.userId, this.required(data.subject), this.required(data.description), data.supportType, category?.id ?? null]);
      await this.event(db, id, actor.userId, 'assigned');
      for (const image of images) await this.saveImage(db, actor.id, id, image, null);
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

  async comment(actor: DemoActor, id: string, body: string, files: Express.Multer.File[] = []) {
    const addedCommentId = await this.withImages(actor.id, id, files, async (db, images) => {
      const ticket = await this.ticket(db, id, actor, true);
      if (ticket.status === 'closed') throw new ConflictException('This demo ticket is closed.');
      const result = await this.store.write(db, 'INSERT INTO demo_ticket_comments (ticket_id, author_id, body, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP(3))', [id, actor.userId, images.length ? body.trim() : this.required(body)]);
      for (const image of images) await this.saveImage(db, actor.id, id, image, Number(result.insertId));
      return Number(result.insertId);
    });
    return { ...await this.detail(id, actor), addedCommentId };
  }

  private async withImages<T>(runId: string, ticketId: string, files: Express.Multer.File[], write: (db: DemoQueryTarget, images: DemoFile[]) => Promise<T>) {
    const images = files.map(file => {
      const mimeType = this.files.fileType(file.buffer);
      if (!mimeType.startsWith('image/')) throw new BadRequestException('Attach a JPG, PNG or WebP image.');
      return { attachmentId: randomUUID(), buffer: file.buffer, mimeType,
        fileName: file.originalname.replace(/[^\p{L}\p{N}_.() -]/gu, '_').slice(-230) || 'Attachment' };
    });
    try {
      return await this.store.transaction(db => write(db, images));
    } catch (error) {
      for (const { attachmentId } of images) {
        await this.files.remove({ runId, ticketId, attachmentId }).catch(() => this.logger.warn('Could not remove an incomplete demo image.'));
      }
      throw error;
    }
  }

  private async saveImage(db: DemoQueryTarget, runId: string, ticketId: string, image: DemoFile, commentId: number | null, replacesId: string | null = null, uploadedBy: number | null = null) {
    await this.store.write(db, `INSERT INTO demo_ticket_attachments (id, ticket_id, file_name, mime_type, comment_id, replaces_id, uploaded_by, ready, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, UTC_TIMESTAMP(3))`, [image.attachmentId, ticketId, image.fileName, image.mimeType, commentId, replacesId, uploadedBy]);
    await this.files.write({ runId, ticketId, attachmentId: image.attachmentId }, image.buffer);
  }

  async replaceImage(actor: DemoActor, id: string, attachmentId: string, file?: Express.Multer.File) {
    if (actor.role !== 'user' || !file?.buffer?.length) throw new BadRequestException('Choose an image to replace.');
    await this.withImages(actor.id, id, [file], async (db, [image]) => {
      const ticket = await this.ticket(db, id, actor, true);
      if (!['assigned', 'in_progress'].includes(ticket.status)) throw new ConflictException('Images cannot be replaced at this ticket status.');
      const [current] = await this.store.rows<{ commentId: number | null; mimeType: string }>(db, `
        SELECT comment_id AS commentId, mime_type AS mimeType FROM demo_ticket_attachments
        WHERE id = ? AND ticket_id = ? AND ready = TRUE AND NOT EXISTS
          (SELECT 1 FROM demo_ticket_attachments WHERE ticket_id = ? AND replaces_id = ? AND ready = TRUE)`, [attachmentId, id, id, attachmentId]);
      if (!current?.mimeType.startsWith('image/')) throw new NotFoundException('Current demo image not found.');
      if (current.commentId != null) {
        const [comment] = await this.store.rows(db, 'SELECT id FROM demo_ticket_comments WHERE id = ? AND ticket_id = ? AND author_id = ?', [current.commentId, id, actor.userId]);
        if (!comment) throw new ForbiddenException('You can only replace your own comment images.');
      }
      await this.saveImage(db, actor.id, id, image, current.commentId, attachmentId, actor.userId);
    });
    return this.detail(id, actor);
  }

  async requesterClose(actor: DemoActor, id: string) {
    if (actor.role !== 'user') throw new ForbiddenException();
    await this.store.transaction(async db => {
      const ticket = await this.ticket(db, id, actor, true);
      if (ticket.status !== 'resolved') throw new ConflictException('Only a resolved ticket can be closed.');
      await this.store.write(db, "UPDATE demo_tickets SET status = 'closed' WHERE id = ?", [id]);
      await this.event(db, id, actor.userId, 'closed');
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

  async rate(actor: DemoActor, id: string, likert: Array<number | 'NA'>) {
    if (actor.role !== 'user') throw new ForbiddenException();
    if (likert.length !== 9 || likert.some((answer, index) => [3, 5, 8].includes(index)
      ? answer !== 'NA'
      : typeof answer !== 'number' || !Number.isInteger(answer) || answer < 1 || answer > 5)) {
      throw new BadRequestException('Rate all six applicable service quality questions from 1 to 5.');
    }
    const rating = deriveSatisfactionRating(likert);
    if (rating === null) throw new BadRequestException('At least one service quality score is required.');
    await this.store.transaction(async db => {
      const ticket = await this.ticket(db, id, actor, true);
      const [existing] = await this.store.rows(db, 'SELECT ticket_id FROM demo_ticket_ratings WHERE ticket_id = ?', [id]);
      if (existing || !['resolved', 'closed'].includes(ticket.status)) throw new ConflictException('Only an unrated resolved or closed demo ticket can be rated.');
      await this.store.write(db, 'INSERT INTO demo_ticket_ratings (ticket_id, rating, created_at) VALUES (?, ?, UTC_TIMESTAMP(3))', [id, rating]);
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
