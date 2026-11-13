'use client';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDocumentPreview } from '@/lib/utils/useDocumentPreview';
import { documentsApi, type Document } from '@/lib/api/documents';
import { reviewsApi, ReviewDecision } from '@/lib/api/reviews';
import DocumentViewer from '@/components/documents/DocumentViewer';
import { useAuth } from '@/contexts/AuthContext';

const REVIEW_PAGE_SIZE = 20;
const REVIEW_LABELS: Record<NonNullable<Document['compliance_status']>, string> = {
  pending: 'Not reviewed',
  compliant: 'Compliant',
  non_compliant: 'Non-compliant',
  needs_revision: 'Needs revision',
};

function ReviewStatus({ document }: { document: Document }) {
  const status = document.compliance_status ?? 'pending';
  return <Chip size="small" label={REVIEW_LABELS[status]}
    color={status === 'compliant' ? 'success' : status === 'non_compliant' ? 'error' : status === 'needs_revision' ? 'warning' : 'default'} />;
}

export default function ReviewsPage() {
  const { user, myCap } = useAuth();
  const isSuperOrReviewer = !!myCap?.isReviewsAccess;
  const canManageReviews = !!myCap?.isReviewsManage;
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const [page, setPage] = useState(0);
  const [reviewTab, setReviewTab] = useState<'preview' | 'decision'>('preview');

  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [decision, setDecision] = useState<ReviewDecision>('needs_revision');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const reviewsQuery = useQuery({
    queryKey: ['documents', 'review-queue', user?.id, page],
    queryFn: ({ signal }) => documentsApi.listDocuments({ review_queue: true, page: page + 1, limit: REVIEW_PAGE_SIZE }, { signal }),
    enabled: isSuperOrReviewer,
    retry: false,
  });
  const documents = reviewsQuery.data?.data ?? [];
  const total = reviewsQuery.data?.total ?? 0;
  const lastPage = Math.max(0, Math.ceil(total / REVIEW_PAGE_SIZE) - 1);
  useEffect(() => {
    if (reviewsQuery.isSuccess && page > lastPage) setPage(lastPage);
  }, [lastPage, page, reviewsQuery.isSuccess]);
  const refreshedSelection = documents.find((document) => document.id === selectedDocument?.id);
  const isSelectedDocumentAlreadyCompliant = refreshedSelection?.compliance_status === 'compliant';
  const [submitError, setSubmitError] = useState('');
  const [versionConflict, setVersionConflict] = useState(false);
  const { preview, loading: previewLoading, error: previewError, retry: retryPreview } = useDocumentPreview(
    selectedDocument ? { documentId: selectedDocument.id, versionNumber: selectedDocument.current_version } : null,
  );

  const openReviewDialog = (document: Document) => {
    setSelectedDocument(document);
    setDecision('needs_revision');
    setRemarks('');
    setSubmitError('');
    setVersionConflict(false);
    setReviewTab('preview');
  };

  const closeDialog = () => {
    setSelectedDocument(null);
  };

  const submitReview = async () => {
    if (!canManageReviews || !selectedDocument || saving || versionConflict) {
      return;
    }

    if (isSelectedDocumentAlreadyCompliant) {
      enqueueSnackbar('This document is already compliant and does not require a new review tag.', {
        variant: 'warning',
      });
      return;
    }

    if ((decision === 'needs_revision' || decision === 'non_compliant') && !remarks.trim()) {
      setSubmitError('Enter review remarks before submitting this decision.');
      return;
    }

    try {
      setSaving(true);
      setSubmitError('');
      await reviewsApi.submitReview(selectedDocument.id, {
        decision,
        remarks,
        expectedVersionNumber: selectedDocument.current_version,
      });
      enqueueSnackbar('Review submitted successfully.', { variant: 'success' });
      closeDialog();
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
      void queryClient.invalidateQueries({ queryKey: ['document', selectedDocument.id] });
    } catch (error: any) {
      if (error?.response?.status === 409) {
        setVersionConflict(true);
        setSubmitError('A newer version is available. Copy any remarks you want to keep, then close and reopen the document to review the new version.');
        void reviewsQuery.refetch();
      } else {
        setSubmitError(error?.response?.data?.message || 'Could not submit the review. Check the review queue before trying again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperOrReviewer) {
    return (
      <Box p={4}>
        <Typography color="error">You do not have access to this feature.</Typography>
      </Box>
    );
  }

  return (
    <Box>
<WorkspaceLayout kind="standard" context={<><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Manual Compliance Reviews
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Open the current document version and record a compliance decision.
          </Typography>
        </Box>
        {reviewsQuery.isSuccess && <Chip label={`${total} ready for review`} color="primary" />}
      </Stack></>}>
<Paper sx={{ p: 2 }}>
        {reviewsQuery.isError ? <Alert severity="error" action={<Button color="inherit" onClick={() => void reviewsQuery.refetch()}>Retry</Button>}>Could not load the review queue.</Alert> : reviewsQuery.isLoading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress aria-label="Loading review queue" />
          </Box>
        ) : total === 0 ? (
          <Typography role="status" textAlign="center" color="text.secondary" py={3}>No documents available for review</Typography>
        ) : (
          <>
          {compact ? (
            <Stack component="ul" spacing={1.25} sx={{ listStyle: 'none', m: 0, p: 0 }}>
              {documents.map((document) => (
                <Paper component="li" variant="outlined" key={document.id} sx={{ p: 1.5, minWidth: 0 }}>
                  <Typography fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>{document.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                    {[document.document_type, document.period, document.year].filter(Boolean).join(' • ')} · Version {document.current_version}
                  </Typography>
                  <Stack direction="row" gap={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" mt={1}>
                    <ReviewStatus document={document} />
                    <Button variant="outlined" onClick={() => openReviewDialog(document)} sx={{ minHeight: 44 }}>
                      {canManageReviews ? 'Review' : 'View'}
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Document</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Latest Review</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.map((document) => (
                      <TableRow key={document.id} hover>
                        <TableCell>
                          <Typography fontWeight={600}>{document.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {document.period} {document.year}
                          </Typography>
                        </TableCell>
                        <TableCell>{document.document_type}</TableCell>
                        <TableCell>{document.status}</TableCell>
                        <TableCell>
                          <ReviewStatus document={document} />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => openReviewDialog(document)}
                          >
                            {canManageReviews ? 'Review' : 'View'}
                          </Button>
                        </TableCell>
                      </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          )}
          {total > REVIEW_PAGE_SIZE && <TablePagination component="div" count={total} page={Math.min(page, lastPage)}
            rowsPerPage={REVIEW_PAGE_SIZE} rowsPerPageOptions={[]} onPageChange={(_, next) => setPage(next)} />}
          </>
        )}
      </Paper>
</WorkspaceLayout>
<Dialog open={!!selectedDocument} onClose={saving ? undefined : closeDialog} fullScreen={compact} fullWidth maxWidth="xl">
        <DialogTitle>{canManageReviews ? 'Manual Review' : 'View Document Review'}</DialogTitle>
        {compact && canManageReviews && <Tabs value={reviewTab} onChange={(_, next) => setReviewTab(next)} variant="fullWidth" aria-label="Review steps">
          <Tab value="preview" label="Document" id="review-preview-tab" aria-controls="review-preview" />
          <Tab value="decision" label="Decision" id="review-decision-tab" aria-controls="review-decision" />
        </Tabs>}
        <DialogContent>
          <Box display="grid" gridTemplateColumns={{ xs: 'minmax(0, 1fr)', md: 'minmax(0, 2fr) minmax(0, 1fr)' }} gap={2}>
            <Paper variant="outlined" id="review-preview" role={compact && canManageReviews ? 'tabpanel' : undefined}
              aria-labelledby={compact && canManageReviews ? 'review-preview-tab' : undefined}
              hidden={compact && canManageReviews && reviewTab !== 'preview'} sx={{ p: { xs: 1, sm: 2 }, minHeight: { sm: 600 }, minWidth: 0 }}>
              <Typography variant="subtitle1" gutterBottom>
                Digital Document Viewer
              </Typography>
              {selectedDocument && (
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {selectedDocument.title} • {selectedDocument.document_type} •{' '}
                  {selectedDocument.period} {selectedDocument.year} • Version {selectedDocument.current_version}
                </Typography>
              )}

              {previewLoading && (
                <Box display="flex" justifyContent="center" py={8}>
                  <CircularProgress />
                </Box>
              )}

              {!previewLoading && previewError && (
                <Alert severity="warning" action={<Button color="inherit" onClick={retryPreview}>Retry</Button>}>Could not load the document preview.</Alert>
              )}

              {preview && (
                <DocumentViewer
                  previewBlob={preview.blob}
                  mimeType={preview.mimeType}
                  viewerTitle={selectedDocument?.title || 'Document Viewer'}
                />
              )}
            </Paper>

            <Paper variant="outlined" id="review-decision" role={compact && canManageReviews ? 'tabpanel' : undefined}
              aria-labelledby={compact && canManageReviews ? 'review-decision-tab' : undefined}
              hidden={compact && canManageReviews && reviewTab !== 'decision'} sx={{ p: 2, minWidth: 0 }}>
              <Typography variant="subtitle1" gutterBottom>
                Compliance Tagging
              </Typography>
              {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}

              {!canManageReviews ? (
                <Typography color="text.secondary">
                  You can inspect this document and its latest review, but you do not have permission
                  to submit a review decision.
                </Typography>
              ) : isSelectedDocumentAlreadyCompliant ? (
                <Typography color="success.main">
                  This document is already tagged as compliant. No additional review tagging is
                  required.
                </Typography>
              ) : (
                <>
                  <Stack direction="column" spacing={1} mb={2}>
                    <Button
                      variant={decision === 'compliant' ? 'contained' : 'outlined'}
                      color="success"
                      onClick={() => setDecision('compliant')}
                    >
                      Mark Compliant
                    </Button>
                    <Button
                      variant={decision === 'non_compliant' ? 'contained' : 'outlined'}
                      color="error"
                      onClick={() => setDecision('non_compliant')}
                    >
                      Mark Non-Compliant
                    </Button>
                    <Button
                      variant={decision === 'needs_revision' ? 'contained' : 'outlined'}
                      color="warning"
                      onClick={() => setDecision('needs_revision')}
                    >
                      Mark Needs Revision
                    </Button>
                  </Stack>

                  <TextField
                    margin="dense"
                    fullWidth
                    multiline
                    minRows={8}
                    label="Review Remarks"
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    helperText={
                      decision === 'non_compliant' || decision === 'needs_revision'
                        ? 'Remarks are required for non-compliant and needs revision tags.'
                        : undefined
                    }
                  />
                </>
              )}
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Close</Button>
          {canManageReviews && !isSelectedDocumentAlreadyCompliant && (!compact || reviewTab === 'decision') && (
            <Button
              variant="contained"
              onClick={submitReview}
              disabled={saving || !selectedDocument || versionConflict || previewLoading}
            >
              {saving ? 'Submitting...' : 'Submit Review'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
</Box>
  );
}
