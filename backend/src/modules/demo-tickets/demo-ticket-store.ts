import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

export type DemoQueryTarget = Pick<EntityManager, 'query'>;
type Parameters = Array<string | number | null>;

const demoTables = new Set([
  'demo_tickets',
  'demo_ticket_sequences',
  'demo_ticket_events',
  'demo_ticket_comments',
  'demo_ticket_ratings',
  'demo_ticket_attachments',
  'demo_file_cleanup',
]);

function checkTableReferences(sql: string) {
  // This store accepts only its static Ticketing queries and bound values.
  if (/;|--|\/\*|#|\x60/.test(sql)) throw new Error('Unsupported demo SQL.');
  for (const reference of sql.matchAll(/\b(?:FROM|JOIN|INTO)\s+([^\s(]+)/gi)) {
    const [match, table] = reference;
    const tail = sql.slice(reference.index + match.length).trimStart();
    if (!demoTables.has(table) || (tail && !/^(?:\(|WHERE\b|ORDER\s+BY\b|LIMIT\b|FOR\s+UPDATE\b)/i.test(tail))) {
      throw new Error('Only demo tables may be accessed by the demo store.');
    }
  }
}

@Injectable()
export class DemoTicketStore {
  constructor(private readonly dataSource: DataSource) {}

  get db(): DemoQueryTarget {
    return this.dataSource.manager;
  }

  async rows<T>(db: DemoQueryTarget, sql: string, params: Parameters = []): Promise<T[]> {
    const statement = sql.trimStart();
    if (!/^SELECT\b/i.test(statement) || !/\bFROM\s/i.test(statement) || /\bINTO\b/i.test(statement)) {
      throw new Error('A demo read must select rows from the demo tables.');
    }
    checkTableReferences(statement);
    return db.query<T[]>(statement, params);
  }

  async write(db: DemoQueryTarget, sql: string, params: Parameters = []) {
    const statement = sql.trimStart();
    const [, insertTable, updateTable] = /^(?:INSERT\s+INTO\s+(\w+)\s*\(|UPDATE\s+(\w+)\s+SET\b)/i.exec(statement) ?? [];
    if (!demoTables.has(insertTable || updateTable)) {
      throw new Error('Only the supported demo tables may be changed by the demo store.');
    }
    checkTableReferences(statement);
    return db.query(statement, params);
  }

  deleteTicket(db: DemoQueryTarget, id: string, runId: string) {
    return db.query('DELETE FROM demo_tickets WHERE id = ? AND run_id = ?', [id, runId]);
  }

  deleteFileCleanup(db: DemoQueryTarget, attachmentId: string) {
    return db.query('DELETE FROM demo_file_cleanup WHERE attachment_id = ?', [attachmentId]);
  }

  transaction<T>(callback: (db: DemoQueryTarget) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(callback);
  }
}
