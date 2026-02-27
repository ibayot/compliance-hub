'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
  Link as LinkIcon,
  LinkOff as UnlinkIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsApi, Document } from '@/lib/api/documents';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { format } from 'date-fns';
import VersionTimeline from '@/components/documents/VersionTimeline';
import DocumentViewer from '@/components/documents/DocumentViewer';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';

export default function DocumentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const documentId = params.id as string;

  const { setPageTitle } = usePageTitle();
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState<string>('application/pdf');
  const [referenceDialogOpen, setReferenceDialogOpen] = useState(false);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [referenceSearch, setReferenceSearch] = useState('');
  const [outgoingRefs, setOutgoingRefs] = useState<any[]>([]);
  const [incomingRefs, setIncomingRefs] = useState<any[]>([]);
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);

  // Fetch document details
  const { data: document, isLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => documentsApi.getDocument(documentId),
    enabled: !!documentId,
  });

  // Fetch version history
  const { data: versions } = useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: () => documentsApi.getVersionHistory(documentId),
    enabled: !!documentId,
  });

  // Set page title for breadcrumb when document loads
  useEffect(() => {
    if (document?.title) {
      setPageTitle(document.title);
    }
    return () => setPageTitle(null);
  }, [document?.title, setPageTitle]);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/dashboard/documents');
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] });
  };

  const handleViewVersion = (versionId: string) => {
    setSelectedVersionId(versionId);
  };

  const handleDownloadVersion = async (versionId: string) => {
    const { blob, fileName } = await documentsApi.downloadVersionBlob(
      documentId,
      versionId,
    );
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
      const currentVersion = versions.find(
        (v) => v.version_number === document.current_version,
      );
      if (currentVersion) {
        await handleDownloadVersion(currentVersion.id);
      }
    }
  };

  const openReferenceDialog = async () => {
    try {
      setReferenceDialogOpen(true);
      setReferenceLoading(true);
      const [refs, docs] = await Promise.all([
        documentsApi.getDocumentReferences(documentId),
        documentsApi.listDocuments({ page: 1, limit: 200 }),
      ]);
      setOutgoingRefs(refs.outgoing || []);
      setIncomingRefs(refs.incoming || []);
      setAllDocuments((docs.data || []).filter((doc) => doc.id !== documentId));
    } finally {
      setReferenceLoading(false);
    }
  };

  const closeReferenceDialog = () => {
    setReferenceDialogOpen(false);
    setReferenceSearch('');
  };

  const handleLinkReference = async (targetDocumentId: string) => {
    await documentsApi.linkDocumentReference(documentId, targetDocumentId);
    await openReferenceDialog();
    handleRefresh();
  };

  const handleUnlinkReference = async (targetDocumentId: string) => {
    await documentsApi.unlinkDocumentReference(documentId, targetDocumentId);
    await openReferenceDialog();
    handleRefresh();
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

  const currentVersion = versions?.find(
    (v) => v.version_number === document?.current_version,
  );

  useEffect(() => {
    const loadPreview = async () => {
      const targetVersionId = selectedVersionId || currentVersion?.id;
      if (!document || !targetVersionId || (document.status !== 'ready' && document.status !== 'pending')) {
        setPreviewBlobUrl(null);
        return;
      }

      try {
        const { blobUrl, mimeType } = await documentsApi.getPreviewBlobUrl(documentId, targetVersionId);
        setPreviewMimeType(mimeType);
        setPreviewBlobUrl((previousUrl) => {
          if (previousUrl && previousUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previousUrl);
          }
          return blobUrl;
        });
      } catch {
        setPreviewMimeType('application/pdf');
        setPreviewBlobUrl((previousUrl) => {
          if (previousUrl && previousUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previousUrl);
          }
          return null;
        });
      }
    };

    loadPreview();
  }, [document, documentId, currentVersion?.id, selectedVersionId]);

  useEffect(() => {
    return () => {
      if (previewBlobUrl && previewBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  if (isLoading) {
    return (
      <Container>
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  if (!document) {
    return (
      <Container>
        <Box sx={{ py: 4 }}>
          <Typography color="error">Document not found</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={handleBack}>
            <BackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ flex: 1 }}>
            {document.title}
          </Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadCurrent}
          >
            Download Current
          </Button>
          <Button variant="outlined" startIcon={<LinkIcon />} onClick={openReferenceDialog}>
            Map References
          </Button>
        </Box>

        {/* Document Info */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Unit
              </Typography>
              <Typography variant="body1" gutterBottom>
                {document.unit?.name} ({document.unit?.code})
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Document Type
              </Typography>
              <Typography variant="body1" gutterBottom>
                {document.document_type}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Period
              </Typography>
              <Typography variant="body1" gutterBottom>
                {document.year}-{document.period}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Status
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={document.status.toUpperCase()}
                  color={getStatusColor(document.status) as any}
                  size="small"
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Current Version
              </Typography>
              <Typography variant="body1" gutterBottom>
                Version {document.current_version}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Uploaded By
              </Typography>
              <Typography variant="body1" gutterBottom>
                {document.uploader?.username} on{' '}
                {format(new Date(document.created_at), 'MMM dd, yyyy')}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Main Content */}
        <Grid container spacing={3}>
          {/* Document Viewer */}
          <Grid item xs={12} lg={8}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Document Viewer
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
              {previewBlobUrl && (document.status === 'ready' || document.status === 'pending') ? (
                <DocumentViewer pdfUrl={previewBlobUrl} mimeType={previewMimeType} />
              ) : (
                <Box
                  sx={{
                    minHeight: 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                  }}
                >
                  <Typography color="text.secondary">
                    Preview not available
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Version Timeline */}
          <Grid item xs={12} lg={4}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Version History
              </Typography>
              <Divider sx={{ my: 2 }} />
              {versions && versions.length > 0 ? (
                <VersionTimeline
                  versions={versions}
                  currentVersionId={currentVersion?.id}
                  onViewVersion={handleViewVersion}
                  onDownloadVersion={handleDownloadVersion}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No versions available
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Dialog open={referenceDialogOpen} onClose={closeReferenceDialog} maxWidth="lg" fullWidth>
        <DialogTitle>Document-to-Document Mapping</DialogTitle>
        <DialogContent>
          {referenceLoading ? (
            <Box py={4} textAlign="center">
              <Typography>Loading references...</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Search ready documents"
                value={referenceSearch}
                onChange={(event) => setReferenceSearch(event.target.value)}
                fullWidth
                size="small"
              />

              <Typography variant="subtitle1" fontWeight={600}>Outgoing References</Typography>
              {outgoingRefs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No outgoing references.</Typography>
              ) : (
                outgoingRefs.map((ref) => (
                  <Box key={ref.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Box>
                      <Typography fontWeight={600}>{ref.target_document?.title || ref.target_document_id}</Typography>
                      <Typography variant="caption" color="text.secondary">{ref.relationship_type}</Typography>
                    </Box>
                    <Button size="small" color="warning" startIcon={<UnlinkIcon />} onClick={() => handleUnlinkReference(ref.target_document_id)}>
                      Unlink
                    </Button>
                  </Box>
                ))
              )}

              <Typography variant="subtitle1" fontWeight={600}>Incoming References</Typography>
              {incomingRefs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No incoming references.</Typography>
              ) : (
                incomingRefs.map((ref) => (
                  <Box key={ref.id} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Typography fontWeight={600}>{ref.source_document?.title || ref.source_document_id}</Typography>
                    <Typography variant="caption" color="text.secondary">{ref.relationship_type}</Typography>
                  </Box>
                ))
              )}

              <Typography variant="subtitle1" fontWeight={600}>Available Ready Documents</Typography>
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
                    <Box key={doc.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Box>
                        <Typography fontWeight={600}>{doc.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{doc.document_type} • {doc.year}-{doc.period}</Typography>
                      </Box>
                      {linked ? (
                        <Chip size="small" color="success" label="Linked" />
                      ) : (
                        <Button size="small" startIcon={<LinkIcon />} onClick={() => handleLinkReference(doc.id)}>
                          Link
                        </Button>
                      )}
                    </Box>
                  );
                })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeReferenceDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
