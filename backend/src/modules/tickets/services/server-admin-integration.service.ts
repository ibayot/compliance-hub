import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserRole } from '../../users/entities/user.entity';
import { projectServerAdminTicket, ServerAdminTicketRow } from './server-admin-ticket-projection';

// Both list/count and detail use this exact scope. Pending escalations never grant eligibility:
// acceptance must first transfer the ticket's actual assignment to a server administrator.
const SCOPE = `FROM tickets t
  INNER JOIN users assignee ON assignee.id = t.assigned_to_id
  LEFT JOIN users requester ON requester.id = t.requester_id
  LEFT JOIN ticket_categories category ON category.id = t.category_id
  LEFT JOIN ticket_issue_types issue ON issue.id = t.issue_type_id
  WHERE assignee.role = ? AND assignee.active = 1 AND t.status IN (?, ?)`;
const scopeValues = () => [UserRole.SERVER_ADMIN, 'assigned', 'in_progress'];
const FIELDS = `SELECT t.id ticket_id, t.ticket_number, t.status, t.subject, t.description,
  requester.staff_id requester_staff_id, category.name category_name, issue.name issue_type_name `;

@Injectable()
export class ServerAdminIntegrationService {
  constructor(private readonly db: DataSource) {}

  async list(page: number, limit: number) {
    const [rows, count] = await Promise.all([
      this.db.query(`${FIELDS}${SCOPE} ORDER BY t.created_at ASC, t.id ASC LIMIT ? OFFSET ?`, [...scopeValues(), limit, (page - 1) * limit]),
      this.db.query(`SELECT COUNT(*) total ${SCOPE}`, scopeValues()),
    ]);
    return { data: (rows as ServerAdminTicketRow[]).map(projectServerAdminTicket), page, limit, total: Number(count[0].total) };
  }

  async get(id: string) {
    const rows: ServerAdminTicketRow[] = await this.db.query(`${FIELDS}${SCOPE} AND t.id = ? LIMIT 1`, [...scopeValues(), id]);
    if (!rows.length) throw new NotFoundException('Eligible ticket not found.');
    return projectServerAdminTicket(rows[0]);
  }
}
