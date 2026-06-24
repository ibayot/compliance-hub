import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface AuditLogQueryDto {
  page?: number;
  limit?: number;
  action?: string;
  tableName?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly dataSource: DataSource) {}

  async getAuditLogs(query: AuditLogQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        id, 
        user_email as "userEmail", 
        action, 
        database_name as "databaseName", 
        table_name as "tableName", 
        operation_type as "operationType", 
        row_id as "rowId", 
        description, 
        old_values as "oldValues", 
        new_values as "newValues", 
        ip_address as "ipAddress", 
        session_id as "sessionId", 
        timestamp as "createdAt"
      FROM 02_db_audit_stg.audit_log
      WHERE database_name = '02_db_stg_compliance_hub_ticketing'
    `;

    const countSqlBase = `
      SELECT COUNT(*) as total
      FROM 02_db_audit_stg.audit_log
      WHERE database_name = '02_db_stg_compliance_hub_ticketing'
    `;

    const params: any[] = [];
    const countParams: any[] = [];
    let whereClause = '';

    if (query.action) {
      whereClause += ` AND action = ?`;
      params.push(query.action);
      countParams.push(query.action);
    }
    
    if (query.tableName) {
      whereClause += ` AND table_name = ?`;
      params.push(query.tableName);
      countParams.push(query.tableName);
    }

    if (query.startDate) {
      whereClause += ` AND timestamp >= ?`;
      params.push(query.startDate + ' 00:00:00');
      countParams.push(query.startDate + ' 00:00:00');
    }

    if (query.endDate) {
      whereClause += ` AND timestamp <= ?`;
      params.push(query.endDate + ' 23:59:59');
      countParams.push(query.endDate + ' 23:59:59');
    }

    sql += whereClause + ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const countSql = countSqlBase + whereClause;

    const [logs, countResult] = await Promise.all([
      this.dataSource.query(sql, params),
      this.dataSource.query(countSql, countParams),
    ]);

    const total = Number(countResult[0]?.total || 0);

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAuditedTables() {
    const sql = `
      SELECT DISTINCT table_name as "tableName"
      FROM 02_db_audit_stg.audit_log
      WHERE database_name = '02_db_stg_compliance_hub_ticketing'
      ORDER BY table_name ASC
    `;
    const results = await this.dataSource.query(sql);
    return results.map((r: any) => r.tableName);
  }
}
