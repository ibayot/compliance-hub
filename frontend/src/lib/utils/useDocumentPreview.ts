import { useEffect, useState } from 'react';
import { documentsApi } from '@/lib/api/documents';

type PreviewTarget = { documentId: string; versionId?: string; versionNumber?: number };
type PreviewState = { key: string; blob: Blob; mimeType: string } | { key: string; failed: true };

/** The visible blob always belongs to the current document/version selection. */
export function useDocumentPreview(target: PreviewTarget | null) {
  const documentId = target?.documentId;
  const versionId = target?.versionId;
  const versionNumber = target?.versionNumber;
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<PreviewState>();
  const key = JSON.stringify([documentId, versionId, versionNumber, attempt]);

  useEffect(() => {
    if (!documentId) return;
    const controller = new AbortController();
    const { signal } = controller;
    const load = async () => {
      try {
        let selectedVersion = versionId;
        if (!selectedVersion) {
          const [versions, current] = await Promise.all([
            documentsApi.getVersionHistory(documentId, { signal }),
            versionNumber === undefined ? documentsApi.getDocument(documentId, { signal }) : undefined,
          ]);
          selectedVersion = versions.find((version) => version.version_number === (versionNumber ?? current?.current_version))?.id;
          if (!selectedVersion) throw new Error('Current document version unavailable');
        }
        if (signal.aborted) return;
        const preview = await documentsApi.getPreviewBlob(documentId, selectedVersion, signal);
        if (!signal.aborted) setSettled({ key, ...preview });
      } catch {
        if (!signal.aborted) setSettled({ key, failed: true });
      }
    };
    void load();
    return () => {
      controller.abort();
      setSettled((previous) => previous?.key === key ? undefined : previous);
    };
  }, [documentId, key, versionId, versionNumber]);

  const current = documentId && settled?.key === key ? settled : undefined;
  return {
    loading: !!documentId && !current,
    error: !!current && 'failed' in current,
    preview: current && 'blob' in current ? current : undefined,
    retry: () => setAttempt((value) => value + 1),
  };
}
