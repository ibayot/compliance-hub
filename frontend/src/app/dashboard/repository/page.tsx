'use client';

import React, { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  FolderOpen as FolderOpenIcon,
  Folder as FolderIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { documentsApi, type RepositoryBucket, type Document } from '@/lib/api/documents';

const STATUS_COLOR: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  pending: 'warning',
  processing: 'info',
  ready: 'success',
  failed: 'error',
};

const COMPLIANCE_COLOR: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  pending: 'warning',
  compliant: 'success',
  non_compliant: 'error',
  needs_revision: 'warning',
};

function DocumentTable({ documents }: { documents: Document[] }) {
  const navigate = useNavigate();

  const handleDownload = async (doc: Document) => {
    if (!doc.versions?.length) return;
    const latest = doc.versions.reduce(
      (a, b) => (a.version_number >= b.version_number ? a : b),
    );
    const { blob, fileName } = await documentsApi.downloadVersionBlob(doc.id, latest.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Unit</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Uploaded</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id} hover>
              <TableCell>{doc.title}</TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">
                  {doc.document_type}
                </Typography>
              </TableCell>
              <TableCell>{doc.unit?.name ?? '—'}</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  <Chip
                    label={(doc.status || 'pending').replace('_', ' ')}
                    color={STATUS_COLOR[doc.status] ?? 'default'}
                    size="small"
                  />
                  {doc.compliance_status && doc.compliance_status !== 'pending' && (
                    <Chip
                      label={doc.compliance_status.replace('_', ' ')}
                      color={COMPLIANCE_COLOR[doc.compliance_status] ?? 'default'}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="caption">
                  {new Date(doc.created_at).toLocaleDateString()}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Tooltip title="View details">
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/dashboard/documents/${doc.id}`)}
                  >
                    <ViewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {doc.versions?.length ? (
                  <Tooltip title="Download latest version">
                    <IconButton size="small" onClick={() => handleDownload(doc)}>
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function BucketFolder({
  bucket,
  yearLabel,
}: {
  bucket: RepositoryBucket;
  yearLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Box>
      <Paper
        elevation={open ? 3 : 1}
        sx={{
          p: 2,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          bgcolor: open ? 'primary.light' : 'background.paper',
          color: open ? 'primary.contrastText' : 'text.primary',
          transition: 'all 0.15s',
          '&:hover': { bgcolor: open ? 'primary.light' : 'action.hover' },
          borderRadius: 2,
        }}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <FolderOpenIcon color={open ? 'inherit' : 'primary'} />
        ) : (
          <FolderIcon color="primary" />
        )}
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {bucket.label}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            {yearLabel}
          </Typography>
        </Box>
        <Chip
          label={bucket.count}
          size="small"
          color={open ? 'default' : 'primary'}
          sx={{ fontWeight: 700 }}
        />
      </Paper>

      {open && (
        <Box sx={{ mt: 1, ml: 1, borderLeft: 2, borderColor: 'primary.light', pl: 2 }}>
          <DocumentTable documents={bucket.documents} />
        </Box>
      )}
    </Box>
  );
}

export default function RepositoryPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['repository'],
    queryFn: () => documentsApi.getRepository(),
  });

  const currentYear = String(new Date().getFullYear());

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box p={3}>
        <Typography color="error">Failed to load repository. Please try again.</Typography>
      </Box>
    );
  }

  const years = data?.years ?? [];

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Report Repository
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        All submitted documents organized by reporting period. Click a folder to browse documents.
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {years.length === 0 && (
        <Typography color="text.secondary">No documents found in the repository.</Typography>
      )}

      {years.map((yearGroup) => (
        <Accordion
          key={yearGroup.year}
          defaultExpanded={yearGroup.year === currentYear}
          sx={{ mb: 2, borderRadius: 2, '&:before': { display: 'none' } }}
          elevation={2}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" fontWeight={700}>
                {yearGroup.year}
              </Typography>
              <Chip
                label={`${yearGroup.buckets.reduce((s, b) => s + b.count, 0)} documents`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {yearGroup.buckets.map((bucket) => (
                <Grid item xs={12} sm={6} md={4} key={bucket.key}>
                  <BucketFolder bucket={bucket} yearLabel={yearGroup.year} />
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
