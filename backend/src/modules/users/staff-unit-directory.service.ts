import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StaffDirectoryStore } from '../../shared/staff-directory/staff-directory.store';
import { formatPersonName } from '../../shared/utils/person-name';

export function directoryInteger(value: string | undefined, fallback: number | undefined, max: number): number | undefined {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > max)
    throw new BadRequestException('Invalid directory page, limit or unit.');
  return Number(value);
}

@Injectable()
export class StaffUnitDirectoryService {
  constructor(private readonly db: DataSource, private readonly store: StaffDirectoryStore) {}

  async list(query: { page?: string; limit?: string; unitId?: string; search?: string }) {
    const page = directoryInteger(query.page, 1, 100000)!;
    const limit = directoryInteger(query.limit, 25, 100)!;
    const unitId = directoryInteger(query.unitId, undefined, 2147483647);
    if (query.search !== undefined && (typeof query.search !== 'string' || query.search.length > 100))
      throw new BadRequestException('Directory search must not exceed 100 characters.');
    const search = query.search?.trim();
    const schema = this.store.schema();
    // Normalize UNION text across legacy collations; never fetch account credentials or private profile fields.
    const text = (value: string) => `CONVERT(${value} USING utf8mb4) COLLATE utf8mb4_unicode_ci`;
    const fields = (alias: string) => ['first_name', 'middle_name', 'last_name', 'suffix', 'position_full']
      .map(field => `${text(`${alias}.${field}`)} AS ${field}`).join(',');
    const base = `SELECT ${text("CONCAT('account:',a.id)")} entry_key,1 has_account,${fields('a')},
        COALESCE((SELECT GROUP_CONCAT(DISTINCT u.id ORDER BY u.id) FROM ${schema}.user_unit_access x
          JOIN ${schema}.units u ON u.id=x.unit_id AND u.active=1 WHERE x.user_id=a.id),'') unit_ids
      FROM ${schema}.users a WHERE a.active=1
      UNION ALL
      SELECT ${text("CONCAT('directory:',p.id)")} entry_key,0 has_account,${fields('p')},CAST(p.unit_id AS CHAR) unit_ids
      FROM ${schema}.ums_staff_directory p JOIN ${schema}.units pu ON pu.id=p.unit_id AND pu.active=1
      WHERE p.available=1 AND p.review_reason IS NULL AND p.linked_user_id IS NULL
        AND NOT EXISTS(SELECT 1 FROM ${schema}.users a WHERE BINARY a.staff_id=BINARY p.staff_id)
        AND NOT EXISTS(SELECT 1 FROM ${schema}.users a WHERE (a.staff_id IS NULL OR TRIM(a.staff_id)='')
          AND BINARY LOWER(TRIM(a.first_name))=BINARY LOWER(TRIM(p.first_name))
          AND BINARY LOWER(TRIM(a.last_name))=BINARY LOWER(TRIM(p.last_name)))`;
    const units = await this.db.query(`SELECT u.id,u.name,COUNT(d.entry_key) staffCount FROM ${schema}.units u
      LEFT JOIN (${base}) d ON FIND_IN_SET(CAST(u.id AS CHAR),d.unit_ids)>0
      WHERE u.active=1 GROUP BY u.id,u.name ORDER BY u.name`);
    if (unitId !== undefined && !units.some((u: any) => Number(u.id) === unitId))
      throw new BadRequestException('Select an active unit.');
    const conditions: string[] = [];
    const params: any[] = [];
    if (unitId !== undefined) { conditions.push('FIND_IN_SET(?,d.unit_ids)>0'); params.push(String(unitId)); }
    if (search) {
      for (const word of new Set(search.split(/[,\s]+/).filter(Boolean))) {
        conditions.push("CONCAT_WS(' ',d.first_name,d.middle_name,d.last_name,d.suffix,d.position_full) LIKE ? ESCAPE '!'");
        params.push(`%${word.replace(/[!%_]/g, '!$&')}%`);
      }
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [count] = await this.db.query(`SELECT COUNT(*) total FROM (${base}) d ${where}`, params);
    const rows = await this.db.query(`SELECT d.* FROM (${base}) d ${where}
      ORDER BY d.last_name,d.first_name,d.middle_name,d.suffix,d.entry_key LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
    const safeUnits = units.map((u: any) => ({ id: Number(u.id), name: String(u.name), staffCount: Number(u.staffCount) }));
    const byUnit = new Map<number, { id: number; name: string }>(safeUnits.map((u: any) => [u.id, { id: u.id, name: u.name }]));
    return { page, limit, total: Number(count.total), units: safeUnits,
      data: rows.map((r: any) => ({ key: String(r.entry_key),
        name: formatPersonName({ firstName: r.first_name, middleName: r.middle_name, lastName: r.last_name, suffix: r.suffix }, 'Unnamed staff'),
        position: r.position_full || null, hasAccount: !!Number(r.has_account),
        units: String(r.unit_ids || '').split(',').map(Number).map(id => byUnit.get(id)).filter(Boolean),
      })),
    };
  }
}
