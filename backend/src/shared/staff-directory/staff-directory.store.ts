import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { isEmail } from 'class-validator';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

export type PendingRequester = {
  id: number;
  staffId: string;
  pendingStaffId: string;
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  role: string;
  active: boolean;
  needsEmail: boolean;
  units: Array<{ id: number; name: string }>;
};

@Injectable()
export class StaffDirectoryStore {
  private readonly logger = new Logger(StaffDirectoryStore.name);

  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
  ) {}

  schema(): string {
    const database = String(
      this.config.get('USERS_DB_DATABASE') ||
        (String(this.db.options.database).includes('users') ? this.db.options.database : ''),
    );
    if (!/^[A-Za-z0-9_]+$/.test(database))
      throw new ServiceUnavailableException(
        'Users database is not configured for staff requester completion.',
      );
    return '`' + database + '`';
  }

  async options(actorId: number, role: string): Promise<PendingRequester[]> {
    let rows: any[];
    try {
      const s = this.schema();
      rows = await this.db.query(
        `SELECT p.*,u.name AS unit_name FROM ${s}.ums_staff_directory p
      JOIN ${s}.units u ON u.id=p.unit_id AND u.active=1 AND u.has_reportorial_requirements=0
      WHERE p.available=1 AND p.review_reason IS NULL
        AND NOT EXISTS (SELECT 1 FROM ${s}.users a WHERE BINARY a.staff_id=BINARY p.staff_id)
        AND NOT EXISTS (SELECT 1 FROM ${s}.users a WHERE (a.staff_id IS NULL OR TRIM(a.staff_id)='')
          AND BINARY LOWER(TRIM(a.first_name))=BINARY LOWER(TRIM(p.first_name))
          AND BINARY LOWER(TRIM(a.last_name))=BINARY LOWER(TRIM(p.last_name)))
        ${role === 'user' ? `AND EXISTS (SELECT 1 FROM ${s}.user_unit_access x WHERE x.user_id=? AND x.unit_id=p.unit_id)` : ''}
      ORDER BY p.last_name,p.first_name,p.staff_id`,
        role === 'user' ? [actorId] : [],
      );
    } catch (error: any) {
      // Pending identities supplement existing accounts; a missing migration,
      // directory grant, or unavailable database must not break proxy filing.
      // Do not expose SQL, staff data, credentials, or connection details.
      const code = String(error?.driverError?.code || error?.code || 'unavailable');
      const safeCode = /^[A-Z0-9_]+$/.test(code) ? code : 'unavailable';
      this.logger.warn(`Pending requester directory unavailable (${safeCode}); existing requester accounts remain available.`);
      return [];
    }
    return rows.map((p: any) => ({
      id: -Number(p.id),
      staffId: p.staff_id,
      pendingStaffId: p.staff_id,
      email: '',
      firstName: p.first_name,
      middleName: p.middle_name,
      lastName: p.last_name,
      suffix: p.suffix,
      role: 'user',
      active: true,
      needsEmail: true,
      units: p.unit_id && p.unit_name ? [{ id: Number(p.unit_id), name: String(p.unit_name) }] : [],
    }));
  }

  validateFields(requesterId?: number, pendingStaffId?: string, email?: string): void {
    if (pendingStaffId && requesterId != null)
      throw new BadRequestException(
        'Select either an existing requester or pending staff, not both.',
      );
    if (!pendingStaffId && email !== undefined)
      throw new BadRequestException(
        'Requester email can only complete pending staff; existing emails cannot be changed here.',
      );
    if (pendingStaffId && !/^\d{1,6}$/.test(pendingStaffId))
      throw new BadRequestException('Invalid pending staff ID.');
    if (pendingStaffId && (!email || !isEmail(email.trim()) || email.trim().length > 100))
      throw new BadRequestException('A valid requester email is required.');
  }

  async preview(
    staffId: string,
    email: string,
    actorId: number,
    purpose: 'create' | 'correct' = 'create',
  ): Promise<any> {
    return this.resolve(this.db.manager, staffId, email, actorId, false, purpose);
  }

  async complete(
    manager: EntityManager,
    staffId: string,
    email: string,
    actorId: number,
    purpose: 'create' | 'correct' = 'create',
  ): Promise<any> {
    return this.resolve(manager, staffId, email, actorId, true, purpose);
  }

  private async resolve(
    manager: EntityManager,
    staffId: string,
    suppliedEmail: string,
    actorId: number,
    persist: boolean,
    purpose: 'create' | 'correct',
  ): Promise<any> {
    this.validateFields(undefined, staffId, suppliedEmail);
    const email = suppliedEmail.trim().toLowerCase();
    const s = this.schema();
    const [actor] = await manager.query(
      `SELECT u.id,u.role,c.is_ticket_module_access can_create,c.is_ticket_requester_correction can_correct FROM ${s}.users u LEFT JOIN ${s}.role_capabilities c ON c.role_value=u.role WHERE u.id=? AND u.active=1`,
      [actorId],
    );
    if (!actor) throw new ForbiddenException('An active account is required.');
    if (!(purpose === 'correct' ? actor.can_correct : actor.can_create))
      throw new ForbiddenException(
        'Your current account capabilities do not allow this requester operation.',
      );
    const [p] = await manager.query(
      `SELECT p.*,u.active AS unit_active,u.has_reportorial_requirements AS reportorial
      FROM ${s}.ums_staff_directory p LEFT JOIN ${s}.units u ON u.id=p.unit_id WHERE p.staff_id=? ${persist ? 'FOR UPDATE' : ''}`,
      [staffId],
    );
    if (!p || !p.available || p.review_reason)
      throw new BadRequestException(
        'This staff record is unavailable or needs account reconciliation.',
      );
    if (!p.unit_id || !p.unit_active)
      throw new BadRequestException(
        'This staff member needs an active unit before filing a ticket.',
      );
    if (actor.role === 'user') {
      const access = await manager.query(
        `SELECT 1 FROM ${s}.user_unit_access WHERE user_id=? AND unit_id=?`,
        [actorId, p.unit_id],
      );
      if (!access.length)
        throw new ForbiddenException('You can only file requests for staff in your unit.');
    }
    const [existing] = await manager.query(
      `SELECT id,email,role,active,first_name,last_name,middle_name,suffix FROM ${s}.users WHERE staff_id=? ${persist ? 'FOR UPDATE' : ''}`,
      [staffId],
    );
    if (existing) {
      if (!existing.active || existing.role === 'super_admin')
        throw new BadRequestException('This account cannot be selected as requester.');
      if (existing.email.toLowerCase() !== email)
        throw new ConflictException(
          'This staff member already has an email. Reload the requester list; existing emails cannot be overwritten.',
        );
      const units = await manager.query(
        `SELECT unit_id AS id FROM ${s}.user_unit_access WHERE user_id=?`,
        [existing.id],
      );
      if (actor.role === 'user') {
        const shared = await manager.query(
          `SELECT 1 FROM ${s}.user_unit_access a JOIN ${s}.user_unit_access b ON a.unit_id=b.unit_id WHERE a.user_id=? AND b.user_id=?`,
          [actorId, existing.id],
        );
        if (!shared.length)
          throw new ForbiddenException('The requester is no longer in your unit.');
      }
      return { ...existing, units };
    }
    if (p.linked_user_id)
      throw new ConflictException(
        'This directory identity was already linked to an account. Contact account management before proceeding.',
      );
    if (p.reportorial)
      throw new BadRequestException(
        'Staff in a reportorial unit need authorized account setup before they can be selected.',
      );
    const [security] = await manager.query(
      `SELECT allowed_email_domains FROM ${s}.security_config WHERE id=1`,
    );
    let domains: string[];
    try {
      domains =
        typeof security?.allowed_email_domains === 'string'
          ? JSON.parse(security.allowed_email_domains)
          : security?.allowed_email_domains;
    } catch {
      domains = [];
    }
    if (
      !Array.isArray(domains) ||
      !domains.map((d) => String(d).toLowerCase().trim()).includes(email.split('@')[1])
    )
      throw new BadRequestException('Email domain is not allowed by Security Settings.');
    const collision = await manager.query(
      `SELECT id FROM ${s}.users WHERE LOWER(email)=? LIMIT 1`,
      [email],
    );
    if (collision.length)
      throw new ConflictException(
        'That email is already used by another account. Contact account management to reconcile the staff ID.',
      );
    const names = await manager.query(
      `SELECT first_name,middle_name,last_name,suffix FROM ${s}.users WHERE staff_id IS NULL OR TRIM(staff_id)=''`,
    );
    if (names.some((u: any) => staffNameKey(u) === staffNameKey(p)))
      throw new ConflictException(
        'A possible existing account needs staff ID reconciliation before proceeding.',
      );
    const result: any = {
      id: -Number(p.id),
      email,
      first_name: p.first_name,
      last_name: p.last_name,
      middle_name: p.middle_name,
      suffix: p.suffix,
      role: 'user',
      active: 1,
      units: [{ id: p.unit_id }],
    };
    if (!persist) return result;
    const passwordHash = await bcrypt.hash(randomBytes(48).toString('hex'), 10);
    try {
      const inserted = await manager.query(
        `INSERT INTO ${s}.users (email,passwordHash,first_name,middle_name,last_name,suffix,staff_id,position_full,role,active,auto_assignment_eligible) VALUES (?,?,?,?,?,?,?,?,'user',1,0)`,
        [
          email,
          passwordHash,
          p.first_name,
          p.middle_name,
          p.last_name,
          p.suffix,
          p.staff_id,
          p.position_full,
        ],
      );
      result.id = Number(inserted.insertId);
      await manager.query(`INSERT INTO ${s}.user_unit_access (user_id,unit_id) VALUES (?,?)`, [
        result.id,
        p.unit_id,
      ]);
      await manager.query(`UPDATE ${s}.ums_staff_directory SET linked_user_id=? WHERE id=?`, [
        result.id,
        p.id,
      ]);
      return result;
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY')
        throw new ConflictException(
          'This staff member or email was completed by another request. Reload and retry.',
        );
      throw error;
    }
  }
}

export function staffNameKey(person: any): string {
  // A missing middle name/suffix in a legacy account must not allow a second identity.
  return [person.last_name, person.first_name]
    .map((v) =>
      String(v ?? '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase(),
    )
    .join('|');
}
