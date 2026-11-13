'use client';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  Divider,
  IconButton,
  Tooltip,
  Alert,
  Stack,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Download as DownloadIcon,
  Link as LinkIcon,
  LinkOff as UnlinkIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsApi, Document, DocumentReference } from '@/lib/api/documents';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import DocumentViewer from '@/components/documents/DocumentViewer';
import { formatDocumentPeriod } from '@/lib/utils/documentPeriod';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { useMobileNavigation } from '@/contexts/MobileNavigationContext';
import { useDocumentPreview } from '@/lib/utils/useDocumentPreview';

export default function DocumentDetailsPage() {
  const params = useParams();
  const { goBack } = useMobileNavigation();
  const queryClient = useQueryClient();
  const { myCap } = useAuth();
  const isFocal = !!myCap?.isFocal;
  const documentId = params.id ?? '';
  const validId = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(documentId);

  const { setPageTitle } = usePageTitle();
  const [referenceDialogOpen, setReferenceDialogOpen] = useState(false);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [referenceError, setReferenceError] = useState('');
  const [downloadError, setDownloadError] = useState(false);
  const [referenceSearch, setReferenceSearch] = useState('');
  const [outgoingRefs, setOutgoingRefs] = useState<DocumentReference[]>([]);
  const [incomingRefs, setIncomingRefs] = useState<DocumentReference[]>([]);
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);

  // Fetch document details
  const documentQuery = useQuery({
    queryKey: ['document', documentId],
    queryFn: ({ signal }) => documentsApi.getDocument(documentId, { signal }),
    enabled: validId,
    retry: false,
  });
  const document = documentQuery.isError ? undefined : documentQuery.data;

  // Fetch version history
  const versionQuery = useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: ({ signal }) => documentsApi.getVersionHistory(documentId, { signal }),
    enabled: !!document,
    retry: false,
  });
  const versions = versionQuery.isError ? undefined : versionQuery.data;
  const canEditReferences = !isFocal && !!myCap?.isDocumentsManage && document?.status === 'ready' && !document.is_deleted;

  // Set page title for breadcrumb when document loads
  useEffect(() => {
    if (document?.title) {
      setPageTitle(document.title);
    }
    return () => setPageTitle(null);
  }, [document?.title, setPageTitle]);

  const handleDownloadVersion = async (versionId: string) => {
    const { blob, fileName } = await documentsApi.downloadVersionBlob(documentId, versionId);
    const blobUrl = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = fileName;
    window.document.body.appendChild(anchor);
    anchor.click();
    window.document.body.removeChild(anchor);
    URL.revokeObjectURL(blobUrl);
  };

  const handleDownloadCurrent = async () => {
    if (document && versions && versions.length > 0) {
      const currentVersion = versions.find((v) => v.version_number === document.current_version);
      if (currentVersion) {
        setDownloadError(false);
        try { await handleDownloadVersion(currentVersion.id); }
        catch { setDownloadError(true); }
      }
    }
  };

  const openReferenceDialog = async () => {
    try {
      setReferenceDialogOpen(true);
      setReferenceLoading(true);
      setReferenceError('');
      const [refs, docs] = await Promise.all([
        documentsApi.getDocumentReferences(documentId),
        canEditReferences ? documentsApi.listDocuments({ page: 1, limit: 200, status: 'ready' }) : null,
      ]);
      setOutgoingRefs(refs.outgoing || []);
      setIncomingRefs(refs.incoming || []);
      setAllDocuments((docs?.data || []).filter((doc) => doc.id !== documentId));
    } catch {
      setReferenceError('Could not load the document references.');
    } finally {
      setReferenceLoading(false);
    }
  };

  const closeReferenceDialog = () => {
    setReferenceDialogOpen(false);
    setReferenceSearch('');
  };

  const handleLinkReference = async (targetDocumentId: string) => {
    if (!canEditReferences || referenceLoading) return;
    setReferenceLoading(true);
    setReferenceError('');
    try {
      await documentsApi.linkDocumentReference(documentId, targetDocumentId);
      await openReferenceDialog();
      void queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    } catch {
      setReferenceError('Could not link these documents. Refresh the references before trying again.');
    } finally {
      setReferenceLoading(false);
    }
  };

  const handleUnlinkReference = async (targetDocumentId: string) => {
    if (!canEditReferences || referenceLoading) return;
    setReferenceLoading(true);
    setReferenceError('');
    try {
      await documentsApi.unlinkDocumentReference(documentId, targetDocumentId);
      await openReferenceDialog();
      void queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    } catch {
      setReferenceError('Could not unlink these documents. Refresh the references before trying again.');
    } finally {
      setReferenceLoading(false);
    }
  };

  const getWorkflowStatus = (doc: Document) => {
    const cs = doc.compliance_status;
    const isSuperOrCompliance = !!myCap?.isDocumentsDelete;
    if (cs === 'compliant') {
      return { label: isSuperOrCompliance ? 'COMPLIANT' : 'Approved', color: 'success' as const };
    }
    if (cs === 'non_compliant' || cs === 'needs_revision') {
      return { label: 'Returned', color: 'error' as const };
    }
    if (doc.status === 'processing') return { label: 'PROCESSING', color: 'info' as const };
    if (doc.status === 'failed') return { label: 'FAILED', color: 'error' as const };
    return {
      label: isSuperOrCompliance ? 'PENDING REVIEW' : 'Pending Review',
      color: 'warning' as const,
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'processing':
        return 'info';
      case 'ready':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const currentVersion = versions?.find((v) => v.version_number === document?.current_version);

  const canDownloadCurrent = isFocal && !!currentVersion;

  const previewEligible = document?.status === 'ready' || document?.status === 'pending';
  const { preview, loading: previewLoading, error: previewError, retry: retryPreview } = useDocumentPreview(
    previewEligible && currentVersion ? { documentId, versionId: currentVersion.id } : null,
  );

  if (documentQuery.isLoading) {
    return (
      <Container>
        <Box role="status" sx={{ py: 4, textAlign: 'center' }}>
          <Typography>Loading document…</Typography>
        </Box>
      </Container>
    );
  }

  if (!document) {
    const status = (documentQuery.error as { response?: { status?: number } })?.response?.status;
    const unavailable = !validId || status === 403 || status === 404;
    return (
      <Container>
        <Stack spacing={2} py={4} alignItems="flex-start">
          <Typography component="h1" variant="h5">{unavailable ? 'Document unavailable' : 'Could not load the document'}</Typography>
          <Typography color="text.secondary">{unavailable ? 'This document may have moved or may not be available to your account.' : 'Try again or return to the document list.'}</Typography>
          <Stack direction="row" spacing={1}>
            {!unavailable && <Button variant="contained" onClick={() => void documentQuery.refetch()}>Retry</Button>}
            <Button component={Link} to="/governance/documents" startIcon={<BackIcon />}>Back to Documents</Button>
          </Stack>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
<Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton aria-label="Back to documents" onClick={goBack} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
            <BackIcon />
          </IconButton>
          <Typography component="h1" variant="h4" sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
            {document.title}
          </Typography>
          {canDownloadCurrent && (
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadCurrent}>
              Download
            </Button>
          )}
          {!isFocal && !document.is_deleted && (
            <Button variant="outlined" startIcon={<LinkIcon />} onClick={openReferenceDialog}>
              {canEditReferences ? 'Map References' : 'View References'}
            </Button>
          )}
        </Box>
<WorkspaceLayout kind="standard">
{downloadError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDownloadError(false)}>Could not download this version. Try Download again.</Alert>}
{/* Header */}
{/* Archived banner */}
{document.is_deleted && (
          <Alert severity="info" sx={{ mb: 3 }}>
            This document has been archived and is no longer in the active submission queue.
          </Alert>
        )}
{/* Return Remarks banner */}
{document.latest_review_remarks && (
          <Alert
            severity="error"
            variant="filled"
            sx={{ mb: 3, '& .MuiAlert-message': { color: 'common.white' } }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Return Remarks
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
              {document.latest_review_remarks}
            </Typography>
          </Alert>
        )}
{/* Main Content */}
<WorkspaceLayout kind="detail" contextPosition="end" context={<>
            <Paper
              component="aside"
              aria-label="Document information"
              elevation={1}
              sx={{ p: { xs: 2, sm: 2.5 }, width: '100%', height: '100%' }}
            >
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Document Information
              </Typography>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Unit</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {document.unit?.name || '—'}{document.unit?.code ? ` (${document.unit.code})` : ''}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Document Type</Typography>
                  <Typography variant="body2" fontWeight={600}>{document.document_type || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Period</Typography>
                  <Typography variant="body2" fontWeight={600}>{formatDocumentPeriod(document.year, document.period)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {(() => {
                      const wf = getWorkflowStatus(document);
                      return <Chip label={wf.label} color={wf.color} size="small" />;
                    })()}
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Current Version</Typography>
                  <Typography variant="body2" fontWeight={600}>Version {document.current_version}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Uploaded By</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {document.uploader?.username || '—'} on {format(new Date(document.created_at), 'MMM dd, yyyy')}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </>}>
            <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2 }, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Document Viewer — {document.title}
              </Typography>
              {document.status === 'processing' && (
                <Typography color="info.main" sx={{ mb: 2 }}>
                  Document is being processed. Preview will be available soon.
                </Typography>
              )}
              {document.status === 'failed' && (
                <Typography color="error.main" sx={{ mb: 2 }}>
                  Document processing failed. Please try uploading again.
                </Typography>
              )}
              {previewEligible && versionQuery.isError ? (
                <Alert severity="warning" action={<Button color="inherit" onClick={() => void versionQuery.refetch()}>Retry</Button>}>
                  Could not load the document version.
                </Alert>
              ) : previewError ? (
                <Alert severity="warning" action={<Button color="inherit" onClick={retryPreview}>Retry</Button>}>
                  Could not load the preview for this version.
                </Alert>
              ) : previewEligible && (versionQuery.isLoading || previewLoading) ? (
                <Typography role="status" color="text.secondary">Loading preview…</Typography>
              ) : preview ? (
                <DocumentViewer
                  previewBlob={preview.blob}
                  mimeType={preview.mimeType}
                  viewerTitle={document.title}
                />
              ) : previewEligible && (
                <Box
                  sx={{
                    minHeight: 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                  }}
                >
                  <Typography color="text.secondary">Preview not available</Typography>
                </Box>
              )}
            </Paper>
          </WorkspaceLayout>
</WorkspaceLayout>

</Box>

      <Dialog open={referenceDialogOpen} onClose={referenceLoading ? undefined : closeReferenceDialog} maxWidth="lg" fullWidth>
        <DialogTitle>Document-to-Document Mapping</DialogTitle>
        <DialogContent>
          {referenceLoading ? (
            <Box py={4} textAlign="center">
              <Typography>Loading references...</Typography>
            </Box>
          ) : referenceError ? (
            <Alert severity="error" action={<Button color="inherit" onClick={openReferenceDialog}>Refresh</Button>}>{referenceError}</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              {canEditReferences && <TextField
                label="Search ready documents"
                value={referenceSearch}
                onChange={(event) => setReferenceSearch(event.target.value)}
                fullWidth
                size="small"
              />}

              <Typography variant="subtitle1" fontWeight={600}>
                Outgoing References
              </Typography>
              {outgoingRefs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No outgoing references.
                </Typography>
              ) : (
                outgoingRefs.map((ref) => (
                  <Box
                    key={ref.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Box>
                      <Typography fontWeight={600}>
                        {ref.target_document?.title || ref.target_document_id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ref.relationship_type}
                      </Typography>
                    </Box>
                    {canEditReferences && <Button
                      size="small"
                      color="warning"
                      startIcon={<UnlinkIcon />}
                      onClick={() => handleUnlinkReference(ref.target_document_id)}
                    >
                      Unlink
                    </Button>}
                  </Box>
                ))
              )}

              <Typography variant="subtitle1" fontWeight={600}>
                Incoming References
              </Typography>
              {incomingRefs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No incoming references.
                </Typography>
              ) : (
                incomingRefs.map((ref) => (
                  <Box
                    key={ref.id}
                    sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                  >
                    <Typography fontWeight={600}>
                      {ref.source_document?.title || ref.source_document_id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {ref.relationship_type}
                    </Typography>
                  </Box>
                ))
              )}

              {canEditReferences && <><Typography variant="subtitle1" fontWeight={600}>
                Available Ready Documents
              </Typography>
              {allDocuments
                .filter((doc) => doc.status === 'ready')
                .filter((doc) => {
                  const searchValue = referenceSearch.trim().toLowerCase();
                  if (!searchValue) {
                    return true;
                  }
                  return (
                    doc.title.toLowerCase().includes(searchValue) ||
                    doc.document_type.toLowerCase().includes(searchValue) ||
                    (doc.unit?.name || '').toLowerCase().includes(searchValue)
                  );
                })
                .map((doc) => {
                  const linked = outgoingRefs.some((ref) => ref.target_document_id === doc.id);
                  return (
                    <Box
                      key={doc.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Box>
                        <Typography fontWeight={600}>{doc.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {doc.document_type} • {formatDocumentPeriod(doc.year, doc.period)}
                        </Typography>
                      </Box>
                      {linked ? (
                        <Chip size="small" color="success" label="Linked" />
                      ) : (
                        <Button
                          size="small"
                          startIcon={<LinkIcon />}
                          onClick={() => handleLinkReference(doc.id)}
                        >
                          Link
                        </Button>
                      )}
                    </Box>
                  );
                })}</>}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={referenceLoading} onClick={closeReferenceDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
