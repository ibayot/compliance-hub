import { AsyncLocalStorage } from 'async_hooks';

export interface AuditContext {
  email: string;
  ipAddress: string;
  sessionId: string;
}

export const auditContext = new AsyncLocalStorage<AuditContext>();
