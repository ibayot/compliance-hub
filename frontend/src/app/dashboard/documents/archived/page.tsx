'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api/documents';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export default function ArchivedDocumentsPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Only focal users should access this page
  const isFocal = user?.roleCode === 'focal';

  const { data, isLoading } = useQuery({
    queryKey: ['documents', 'archived'],
    queryFn: () => documentsApi.listDocuments({ archived: true, limit: 50, page: 1 }),
    enabled: isFocal,
    staleTime: 30_000,
  });

  const getStatusChip = (doc: any) => {
    const cs = doc.compliance_status;
    if (cs === 'non_compliant') return <Chip label="Non-Compliant" color="error" size="small" />;
    if (cs === 'needs_revision') return <Chip label="Returned" color="warning" size="small" />;
    return <Chip label="Archived" color="default" size="small" />;
  };

  if (!isFocal) {
    return (
      <Container>
        <Box sx={{ py: 4 }}>
          <Typography color="error">Access denied. This page is for focal users only.</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => router.push('/dashboard/documents')}>
            <BackIcon />
          </IconButton>
          <Typography variant="h4">Archived Documents</Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Documents you archived after they were returned. Review the remarks to understand why each
          was returned.
        </Typography>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper elevation={2}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Return Remarks</TableCell>
                    <TableCell>Archived Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.data || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                          No archived documents found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    (data?.data || []).map((doc) => (
                      <TableRow
                        key={doc.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/dashboard/documents/${doc.id}`)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {doc.title}
                          </Typography>
                        </TableCell>
                        <TableCell>{doc.document_type}</TableCell>
                        <TableCell>
                          {doc.year}-{doc.period}
                        </TableCell>
                        <TableCell>{getStatusChip(doc)}</TableCell>
                        <TableCell>
                          {doc.latest_review_remarks ? (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ maxWidth: 400 }}
                            >
                              {doc.latest_review_remarks}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.disabled">
                              No remarks recorded
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(doc.updated_at || doc.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        <Box sx={{ mt: 3 }}>
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={() => router.push('/dashboard/documents')}
          >
            Back to Documents
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
