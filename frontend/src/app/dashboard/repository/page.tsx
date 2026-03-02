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
  isSelected,
  onClick,
}: {
  bucket: RepositoryBucket;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <Paper
      elevation={isSelected ? 3 : 1}
      sx={{
        p: 1.5,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        bgcolor: isSelected ? 'primary.light' : 'background.paper',
        color: isSelected ? 'primary.contrastText' : 'text.primary',
        transition: 'all 0.15s',
        '&:hover': { bgcolor: isSelected ? 'primary.light' : 'action.hover' },
        borderRadius: 2,
      }}
      onClick={onClick}
    >
      {isSelected ? (
        <FolderOpenIcon fontSize="small" />
      ) : (
        <FolderIcon color="primary" fontSize="small" />
      )}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {bucket.label}
        </Typography>
      </Box>
      <Chip
        label={bucket.count}
        size="small"
        color={isSelected ? 'default' : 'primary'}
        sx={{ fontWeight: 700, flexShrink: 0 }}
      />
    </Paper>
  );
}

export default function RepositoryPage() {
  const [selectedBucketKey, setSelectedBucketKey] = useState<string | null>(null);

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
            <Grid container spacing={1.5}>
              {yearGroup.buckets.map((bucket) => (
                <Grid item xs={6} sm={4} md={3} key={bucket.key}>
                  <BucketFolder
                    bucket={bucket}
                    isSelected={selectedBucketKey === `${yearGroup.year}-${bucket.key}`}
                    onClick={() =>
                      setSelectedBucketKey((prev) =>
                        prev === `${yearGroup.year}-${bucket.key}`
                          ? null
                          : `${yearGroup.year}-${bucket.key}`,
                      )
                    }
                  />
                </Grid>
              ))}
            </Grid>
            {/* Document table rendered below the folder grid — uses available width */}
            {(() => {
              const activeBucketKeyStr = selectedBucketKey?.startsWith(`${yearGroup.year}-`)
                ? selectedBucketKey.slice(`${yearGroup.year}-`.length)
                : null;
              const activeBucket = activeBucketKeyStr
                ? yearGroup.buckets.find((b) => b.key === activeBucketKeyStr)
                : null;
              return activeBucket ? (
                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight={600} mb={1} color="primary.main">
                    {activeBucket.label} — {activeBucket.count} document{activeBucket.count !== 1 ? 's' : ''}
                  </Typography>
                  <DocumentTable documents={activeBucket.documents} />
                </Box>
              ) : null;
            })()}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
