'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Undo as ReturnIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { Document } from '@/lib/api/documents';
import { format } from 'date-fns';
import { formatDocumentPeriod } from '@/lib/utils/documentPeriod';

interface DocumentListProps {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onReturn?: (document: Document) => void;
  onDelete?: (document: Document) => void;
  onArchive?: (document: Document) => void;
  statusFormatter?: (document: Document) => {
    label: string;
    color: 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  };
  canReturnDocument?: (document: Document) => { allowed: boolean; reason?: string };
  canDeleteDocument?: (document: Document) => { allowed: boolean; reason?: string };
  canArchiveDocument?: (document: Document) => { allowed: boolean; reason?: string };
  hideUnitColumn?: boolean;
  hideUploaderColumn?: boolean;
  archivedMode?: boolean;
}

const getStatusColor = (
  status: string,
): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
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

export default function DocumentList({
  documents,
  total,
  page,
  limit,
  loading = false,
  onPageChange,
  onLimitChange,
  onReturn,
  onDelete,
  onArchive,
  statusFormatter,
  canReturnDocument,
  canDeleteDocument,
  canArchiveDocument,
  hideUnitColumn = false,
  hideUploaderColumn = false,
  archivedMode = false,
}: DocumentListProps) {
  const router = useRouter();

  const handleChangePage = (event: unknown, newPage: number) => {
    onPageChange(newPage + 1);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    onLimitChange(parseInt(event.target.value, 10));
  };

  const handleViewDocument = (id: string) => {
    router.push(`/dashboard/documents/${id}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (documents.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Typography variant="h6" color="text.secondary">
          {archivedMode ? 'No archived documents found' : 'No documents found'}
        </Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={2}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              {!archivedMode && !hideUnitColumn && <TableCell>Unit</TableCell>}
              <TableCell>Type</TableCell>
              <TableCell>Period</TableCell>
              <TableCell>Status</TableCell>
              {!archivedMode && !hideUploaderColumn && <TableCell>Uploaded By</TableCell>}
              {archivedMode ? <TableCell>Return Remarks</TableCell> : null}
              <TableCell>{archivedMode ? 'Archived Date' : 'Date'}</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {doc.title}
                  </Typography>
                </TableCell>
                {!archivedMode && !hideUnitColumn && (
                  <TableCell>{doc.unit?.name || 'N/A'}</TableCell>
                )}
                <TableCell>{doc.document_type}</TableCell>
                <TableCell>{formatDocumentPeriod(doc.year, doc.period)}</TableCell>
                <TableCell>
                  {(() => {
                    const statusView = statusFormatter
                      ? statusFormatter(doc)
                      : { label: doc.status.toUpperCase(), color: getStatusColor(doc.status) };
                    return <Chip label={statusView.label} color={statusView.color} size="small" />;
                  })()}
                </TableCell>
                {!archivedMode && !hideUploaderColumn && (
                  <TableCell>{doc.uploader?.username || 'N/A'}</TableCell>
                )}
                {archivedMode ? (
                  <TableCell>
                    {doc.latest_review_remarks ? (
                      <Box sx={{ px: 1.25, py: 0.75, borderRadius: 1, bgcolor: 'action.hover' }}>
                        <Typography
                          variant="body2"
                          color="text.primary"
                          sx={{ maxWidth: 400, whiteSpace: 'pre-line' }}
                        >
                          {doc.latest_review_remarks}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.disabled">
                        No remarks recorded
                      </Typography>
                    )}
                  </TableCell>
                ) : null}
                <TableCell>
                  {format(
                    new Date(archivedMode ? doc.updated_at || doc.created_at : doc.created_at),
                    'MMM dd, yyyy',
                  )}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => handleViewDocument(doc.id)}
                      color="primary"
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  {!archivedMode &&
                    onReturn &&
                    (() => {
                      const permission = canReturnDocument
                        ? canReturnDocument(doc)
                        : { allowed: true };
                      return (
                        <Tooltip
                          title={
                            permission.allowed
                              ? 'Return to Focal'
                              : permission.reason || 'Return is not allowed'
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => permission.allowed && onReturn(doc)}
                              color="warning"
                              disabled={!permission.allowed}
                            >
                              <ReturnIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      );
                    })()}
                  {!archivedMode &&
                    onArchive &&
                    (() => {
                      const permission = canArchiveDocument
                        ? canArchiveDocument(doc)
                        : { allowed: true };
                      return (
                        <Tooltip
                          title={
                            permission.allowed
                              ? 'Archive Document'
                              : permission.reason || 'Archive not allowed'
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => permission.allowed && onArchive(doc)}
                              color="default"
                              disabled={!permission.allowed}
                            >
                              <ArchiveIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      );
                    })()}
                  {!archivedMode &&
                    onDelete &&
                    (() => {
                      const permission = canDeleteDocument
                        ? canDeleteDocument(doc)
                        : { allowed: true };
                      return (
                        <Tooltip
                          title={
                            permission.allowed
                              ? 'Hard Delete'
                              : permission.reason || 'Delete is not allowed'
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => permission.allowed && onDelete(doc)}
                              color="error"
                              disabled={!permission.allowed}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      );
                    })()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ px: 2, pt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Total Records: {total}
        </Typography>
      </Box>
      <TablePagination
        rowsPerPageOptions={[10, 20, 50, 100]}
        component="div"
        count={total}
        rowsPerPage={limit}
        page={page - 1}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelDisplayedRows={() => {
          const totalPages = Math.max(Math.ceil(total / limit), 1);
          return `Page ${page} of ${totalPages}`;
        }}
      />
    </Paper>
  );
}
