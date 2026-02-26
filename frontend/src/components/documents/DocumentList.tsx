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
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { Document } from '@/lib/api/documents';
import { format } from 'date-fns';

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
  statusFormatter?: (document: Document) => { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' };
  canReturnDocument?: (document: Document) => { allowed: boolean; reason?: string };
  canDeleteDocument?: (document: Document) => { allowed: boolean; reason?: string };
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
  statusFormatter,
  canReturnDocument,
  canDeleteDocument,
}: DocumentListProps) {
  const router = useRouter();

  const handleChangePage = (event: unknown, newPage: number) => {
    onPageChange(newPage + 1); // MUI uses 0-based, our API uses 1-based
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    onLimitChange(parseInt(event.target.value, 10));
  };

  const handleViewDocument = (id: string) => {
    router.push(`/dashboard/documents/${id}`);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 300,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (documents.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 300,
        }}
      >
        <Typography variant="h6" color="text.secondary">
          No documents found
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
              <TableCell>Unit</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Period</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Uploaded By</TableCell>
              <TableCell>Date</TableCell>
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
                <TableCell>{doc.unit?.name || 'N/A'}</TableCell>
                <TableCell>{doc.document_type}</TableCell>
                <TableCell>
                  {doc.year}-{doc.period}
                </TableCell>
                <TableCell>
                  {(() => {
                    const statusView = statusFormatter
                      ? statusFormatter(doc)
                      : { label: doc.status.toUpperCase(), color: getStatusColor(doc.status) };

                    return (
                      <Chip
                        label={statusView.label}
                        color={statusView.color}
                        size="small"
                      />
                    );
                  })()}
                </TableCell>
                <TableCell>{doc.uploader?.username || 'N/A'}</TableCell>
                <TableCell>
                  {format(new Date(doc.created_at), 'MMM dd, yyyy')}
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
                  {onReturn && (
                    (() => {
                      const permission = canReturnDocument
                        ? canReturnDocument(doc)
                        : { allowed: true };

                      return (
                        <Tooltip title={permission.allowed ? 'Return to Focal' : permission.reason || 'Return is not allowed'}>
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
                    })()
                  )}
                  {onDelete && (
                    (() => {
                      const permission = canDeleteDocument
                        ? canDeleteDocument(doc)
                        : { allowed: true };

                      return (
                        <Tooltip title={permission.allowed ? 'Hard Delete' : permission.reason || 'Delete is not allowed'}>
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
                    })()
                  )}
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
        page={page - 1} // MUI uses 0-based, our API uses 1-based
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
