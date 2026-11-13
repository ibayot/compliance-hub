import type { Document } from '../entities/document.entity';

export interface DocumentActor {
  id: number;
  role: string;
  units?: Array<number | { id: number }>;
}

/** Role capabilities are checked by the caller. This is the document's record scope. */
export function isDocumentInScope(
  document: Pick<Document, 'uploaded_by' | 'is_deleted'> | null | undefined,
  actor: DocumentActor,
  isFocal: boolean,
): boolean {
  if (!document || !Number.isInteger(Number(actor?.id)) || Number(actor.id) <= 0) return false;
  return isFocal ? Number(document.uploaded_by) === Number(actor.id) : !document.is_deleted;
}
