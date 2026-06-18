import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
} from 'typeorm';
import { auditContext } from './audit.context';

@EventSubscriber()
export class AuditVariableSubscriber implements EntitySubscriberInterface {
  async afterInsert(event: InsertEvent<any>) {
    await this.logAudit(event, 'INSERT');
  }

  async afterUpdate(event: UpdateEvent<any>) {
    await this.logAudit(event, 'UPDATE');
  }

  async afterRemove(event: RemoveEvent<any>) {
    await this.logAudit(event, 'DELETE');
  }

  private async logAudit(event: any, action: 'INSERT' | 'UPDATE' | 'DELETE') {
    if (!event.entity || !event.metadata) return;

    const ctx = auditContext.getStore();
    const userEmail = ctx?.email || 'system_fallback@domain.local';
    const ipAddress = ctx?.ipAddress || '127.0.0.1';
    const sessionId = ctx?.sessionId || 'system-session';

    const tableName = event.metadata.tableName;
    
    // Attempt to extract row ID.
    let rowId = null;
    if (event.entityId) {
        rowId = String(event.entityId);
    } else if (event.entity && event.entity.id) {
        rowId = String(event.entity.id);
    }

    let oldValues = null;
    let newValues = null;

    if (action === 'INSERT') {
      newValues = JSON.stringify(event.entity);
    } else if (action === 'UPDATE') {
      newValues = JSON.stringify(event.entity);
      oldValues = JSON.stringify(event.databaseEntity || {});
    } else if (action === 'DELETE') {
      oldValues = JSON.stringify(event.databaseEntity || event.entity);
    }

    const description = `Application layer ${action} on ${tableName}`;

    try {
      await event.manager.query(
        `INSERT INTO 02_db_audit_stg.audit_log 
          (user_email, action, database_name, table_name, operation_type, row_id, description, old_values, new_values, ip_address, session_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userEmail,
          action,
          '02_db_stg_compliance_hub_ticketing',
          tableName,
          `APP_${action}`,
          rowId,
          description,
          oldValues,
          newValues,
          ipAddress,
          sessionId,
        ]
      );
    } catch (err) {
      console.error(`AuditSubscriber failed to write audit log for ${tableName}:`, err);
    }
  }
}
