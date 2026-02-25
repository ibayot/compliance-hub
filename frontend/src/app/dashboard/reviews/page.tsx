'use client';

import { useEffect, useMemo, useState } from 'react';
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
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { documentsApi, Document } from '@/lib/api/documents';
import { reviewsApi, ReviewDecision } from '@/lib/api/reviews';
import DocumentViewer from '@/components/documents/DocumentViewer';

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [latestReviewByDoc, setLatestReviewByDoc] = useState<Record<string, string>>({});

  const [open, setOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [decision, setDecision] = useState<ReviewDecision>('needs_revision');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState<string>('application/pdf');
  const [previewError, setPreviewError] = useState<string>('');
  const [submitError, setSubmitError] = useState<string>('');

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId) || null,
    [documents, selectedDocumentId],
  );

  const selectedDocumentReviewStatus = selectedDocumentId
    ? latestReviewByDoc[selectedDocumentId] || 'not_reviewed'
    : 'not_reviewed';
  const isSelectedDocumentAlreadyCompliant = selectedDocumentReviewStatus === 'compliant';

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await documentsApi.listDocuments({ limit: 50 });
      const docs = response.data || [];
      setDocuments(docs);

      const reviewPairs = await Promise.all(
        docs.map(async (doc) => {
          const latest = await reviewsApi.getLatestReview(doc.id);
          return [doc.id, latest?.decision || 'not_reviewed'] as const;
        }),
      );

      const map: Record<string, string> = {};
      reviewPairs.forEach(([docId, latestDecision]) => {
        map[docId] = latestDecision;
      });
      setLatestReviewByDoc(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingCount = useMemo(() => {
    return documents.filter((document) => {
      const reviewStatus = latestReviewByDoc[document.id];
      return reviewStatus !== 'compliant';
    }).length;
  }, [documents, latestReviewByDoc]);

  const releasePreviewBlob = () => {
    setPreviewBlobUrl((previousUrl) => {
      if (previousUrl && previousUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previousUrl);
      }
      return null;
    });
  };

  const openReviewDialog = async (documentId: string) => {
    setSelectedDocumentId(documentId);
    setDecision('needs_revision');
    setRemarks('');
    setPreviewError('');
    setSubmitError('');
    setOpen(true);

    const document = documents.find((item) => item.id === documentId);
    if (!document || (document.status !== 'ready' && document.status !== 'pending')) {
      releasePreviewBlob();
      setPreviewError('Preview is not available yet. The document may still be processing.');
      return;
    }

    try {
      setPreviewLoading(true);
      const versions = await documentsApi.getVersionHistory(documentId);
      const currentVersion = versions.find((version) => version.version_number === document.current_version);

      if (!currentVersion) {
        releasePreviewBlob();
        setPreviewError('Current document version was not found.');
        return;
      }

      const { blobUrl, mimeType } = await documentsApi.getPreviewBlobUrl(documentId, currentVersion.id);
      setPreviewMimeType(mimeType);
      setPreviewBlobUrl((previousUrl) => {
        if (previousUrl && previousUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previousUrl);
        }
        return blobUrl;
      });
    } catch {
      releasePreviewBlob();
      setPreviewError('Unable to load digital preview for this document.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closeDialog = () => {
    setOpen(false);
    releasePreviewBlob();
    setPreviewError('');
    setSubmitError('');
  };

  useEffect(() => {
    return () => {
      releasePreviewBlob();
    };
  }, []);

  const submitReview = async () => {
    if (!selectedDocumentId) {
      return;
    }

    if (isSelectedDocumentAlreadyCompliant) {
      setSubmitError('This document is already compliant and does not require a new review tag.');
      return;
    }

    if (
      (decision === 'needs_revision' || decision === 'non_compliant') &&
      !remarks.trim()
    ) {
      setSubmitError('Remarks are required when tagging a document as needs revision or non-compliant.');
      return;
    }

    try {
      setSaving(true);
      setSubmitError('');
      await reviewsApi.submitReview(selectedDocumentId, {
        decision,
        remarks,
      });
      closeDialog();
      await loadData();
    } catch (error: any) {
      setSubmitError(error?.response?.data?.message || 'Failed to submit review tag.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Manual Compliance Reviews
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Open each document digitally and tag compliance decision directly in the review workspace
          </Typography>
        </Box>
        <Chip label={`${pendingCount} Pending Reviews`} color="primary" />
      </Box>

      <Paper sx={{ p: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
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
                {documents.map((document) => {
                  const reviewStatus = latestReviewByDoc[document.id] || 'not_reviewed';
                  return (
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
                        <Chip
                          size="small"
                          color={
                            reviewStatus === 'compliant'
                              ? 'success'
                              : reviewStatus === 'non_compliant'
                                ? 'error'
                                : reviewStatus === 'needs_revision'
                                  ? 'warning'
                                  : 'default'
                          }
                          label={reviewStatus.replace('_', ' ')}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button variant="outlined" size="small" onClick={() => openReviewDialog(document.id)}>
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {documents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No documents available for review
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="xl">
        <DialogTitle>Submit Manual Review</DialogTitle>
        <DialogContent>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '2fr 1fr' }} gap={2}>
            <Paper variant="outlined" sx={{ p: 2, minHeight: 600 }}>
              <Typography variant="subtitle1" gutterBottom>
                Digital Document Viewer
              </Typography>
              {selectedDocument && (
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {selectedDocument.title} • {selectedDocument.document_type} • {selectedDocument.period} {selectedDocument.year}
                </Typography>
              )}

              {previewLoading && (
                <Box display="flex" justifyContent="center" py={8}>
                  <CircularProgress />
                </Box>
              )}

              {!previewLoading && previewError && <Alert severity="warning">{previewError}</Alert>}

              {!previewLoading && !previewError && previewBlobUrl && <DocumentViewer pdfUrl={previewBlobUrl} mimeType={previewMimeType} />}
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Compliance Tagging
              </Typography>

              {isSelectedDocumentAlreadyCompliant ? (
                <Alert severity="success">
                  This document is already tagged as compliant. No additional review tagging is required.
                </Alert>
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
          {submitError && <Alert severity="error" sx={{ mt: 2 }}>{submitError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          {!isSelectedDocumentAlreadyCompliant && (
            <Button variant="contained" onClick={submitReview} disabled={saving || !selectedDocumentId}>
              {saving ? 'Submitting...' : 'Submit Review'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
