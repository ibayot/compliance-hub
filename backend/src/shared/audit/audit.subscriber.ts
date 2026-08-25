import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
  DataSource,
} from 'typeorm';
import { Injectable } from '@nestjs/common';
import { auditContext } from './audit.context';
import { redactAuditValue } from './audit-redaction';

@Injectable()
@EventSubscriber()
export class AuditVariableSubscriber implements EntitySubscriberInterface {
  constructor(private readonly dataSource: DataSource) {
    this.dataSource.subscribers.push(this);
  }
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
    if (['ticket_events', 'audit_log'].includes(tableName)) return;

    // Attempt to extract row ID.
    let rowId = null;
    if (event.entityId) {
      rowId = String(event.entityId);
    } else if (event.entity && event.entity.id) {
      rowId = String(event.entity.id);
    }

    const sanitizeEntity = (entity: any) => {
      if (!entity) return null;
      const sanitized = { ...entity };

      const relationKeys = [
        'createdBy',
        'requester',
        'assignedTo',
        'category',
        'issueTypeConfig',
        'escalatedBy',
        'escalatedTo',
        'ticket',
        'user',
        'unit',
        'focal',
        'events',
        'comments',
      ];
      for (const key of relationKeys) {
        if (sanitized[key] && typeof sanitized[key] === 'object') {
          // Keep identifiable properties if available
          const keepProps: any = {};
          if (sanitized[key].id !== undefined) keepProps.id = sanitized[key].id;
          if (sanitized[key].email !== undefined) keepProps.email = sanitized[key].email;
          if (sanitized[key].name !== undefined) keepProps.name = sanitized[key].name;
          if (sanitized[key].username !== undefined) keepProps.username = sanitized[key].username;
          if (sanitized[key].firstName !== undefined || sanitized[key].lastName !== undefined) {
            keepProps.name =
              `${sanitized[key].firstName || ''} ${sanitized[key].lastName || ''}`.trim();
          }

          sanitized[key] =
            Object.keys(keepProps).length > 0 ? keepProps : sanitized[key].id || '{Object}';
        }
      }

      // Remove "null" or undefined fields to save space
      for (const key in sanitized) {
        if (sanitized[key] === null || sanitized[key] === undefined) {
          delete sanitized[key];
        }
      }
      return redactAuditValue(sanitized);
    };

    let oldValues = null;
    let newValues = null;

    if (action === 'INSERT') {
      newValues = JSON.stringify(sanitizeEntity(event.entity));
    } else if (action === 'UPDATE') {
      const changesNew: any = {};
      const changesOld: any = {};
      const updatedColumns = event.updatedColumns;

      if (updatedColumns && updatedColumns.length > 0) {
        for (const col of updatedColumns) {
          const propName = col.propertyName;
          changesNew[propName] = event.entity[propName];
          changesOld[propName] = event.databaseEntity ? event.databaseEntity[propName] : null;
        }
      } else {
        // Fallback if updatedColumns is empty
        for (const key of Object.keys(event.entity)) {
          if (
            event.databaseEntity &&
            JSON.stringify(event.entity[key]) !== JSON.stringify(event.databaseEntity[key])
          ) {
            changesNew[key] = event.entity[key];
            changesOld[key] = event.databaseEntity[key];
          }
        }
      }

      const sanitizedNew = sanitizeEntity(changesNew);
      const sanitizedOld = sanitizeEntity(changesOld);

      if (
        Object.keys(sanitizedNew || {}).length === 0 &&
        Object.keys(sanitizedOld || {}).length === 0
      ) {
        return; // Nothing to log
      }

      newValues = Object.keys(sanitizedNew || {}).length > 0 ? JSON.stringify(sanitizedNew) : null;
      oldValues = Object.keys(sanitizedOld || {}).length > 0 ? JSON.stringify(sanitizedOld) : null;
    } else if (action === 'DELETE') {
      oldValues = JSON.stringify(sanitizeEntity(event.databaseEntity || event.entity));
    }

    const description = `Application layer ${action} on ${tableName}`;
    const databaseName = event.connection?.options?.database || 'unknown_db';

    try {
      await event.manager.query(
        `INSERT INTO 02_db_audit_stg.audit_log 
          (user_email, action, database_name, table_name, operation_type, row_id, description, old_values, new_values, ip_address, session_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userEmail,
          action,
          databaseName,
          tableName,
          `APP_${action}`,
          rowId,
          description,
          oldValues,
          newValues,
          ipAddress,
          sessionId,
        ],
      );
    } catch (err) {
      console.error(`AuditSubscriber failed to write audit log for ${tableName}:`, err);
    }
  }
}
