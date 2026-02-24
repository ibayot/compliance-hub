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
  Alert,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api/documents';
import { format } from 'date-fns';
import VersionTimeline from '@/components/documents/VersionTimeline';
import DocumentViewer from '@/components/documents/DocumentViewer';

export default function DocumentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const documentId = params.id as string;

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

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

  const handleBack = () => {
    router.back();
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] });
  };

  const handleViewVersion = (versionId: string) => {
    setSelectedVersionId(versionId);
  };

  const handleDownloadVersion = (versionId: string) => {
    const url = documentsApi.getDownloadUrl(documentId, versionId);
    window.open(url, '_blank');
  };

  const handleDownloadCurrent = () => {
    if (document && versions && versions.length > 0) {
      const currentVersion = versions.find(
        (v) => v.version_number === document.current_version,
      );
      if (currentVersion) {
        handleDownloadVersion(currentVersion.id);
      }
    }
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
          <Alert severity="error">Document not found</Alert>
        </Box>
      </Container>
    );
  }

  const currentVersion = versions?.find(
    (v) => v.version_number === document.current_version,
  );

  useEffect(() => {
    const loadPreview = async () => {
      const targetVersionId = selectedVersionId || currentVersion?.id;
      if (!targetVersionId || document.status !== 'ready') {
        setPreviewBlobUrl(null);
        return;
      }

      try {
        const blobUrl = await documentsApi.getPreviewBlobUrl(documentId, targetVersionId);
        setPreviewBlobUrl((previousUrl) => {
          if (previousUrl && previousUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previousUrl);
          }
          return blobUrl;
        });
      } catch {
        setPreviewBlobUrl((previousUrl) => {
          if (previousUrl && previousUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previousUrl);
          }
          return null;
        });
      }
    };

    loadPreview();
  }, [document.status, documentId, currentVersion?.id, selectedVersionId]);

  useEffect(() => {
    return () => {
      if (previewBlobUrl && previewBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

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
                Document Preview
              </Typography>
              {document.status === 'processing' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Document is being processed. Preview will be available soon.
                </Alert>
              )}
              {document.status === 'failed' && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Document processing failed. Please try uploading again.
                </Alert>
              )}
              {previewBlobUrl && document.status === 'ready' ? (
                <DocumentViewer pdfUrl={previewBlobUrl} />
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
    </Container>
  );
}
