'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  TextField,
  MenuItem,
  Grid,
} from '@mui/material';
import { Add as AddIcon, FilterList as FilterIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, ListDocumentsParams } from '@/lib/api/documents';
import { unitsApi } from '@/lib/api/units';
import DocumentList from '@/components/documents/DocumentList';

const documentTypes = ['Policy', 'Procedure', 'Guidelines', 'Manual', 'Report', 'Other'];
const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready', label: 'Ready' },
  { value: 'failed', label: 'Failed' },
];

export default function DocumentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<ListDocumentsParams>({
    page: 1,
    limit: 20,
    unit_id: '',
    document_type: '',
    period: '',
    year: '',
    status: undefined,
  });

  const [showFilters, setShowFilters] = useState(false);

  // Fetch documents
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['documents', filters],
    queryFn: () => {
      const cleanFilters = { ...filters };
      // Remove empty filters
      Object.keys(cleanFilters).forEach((key) => {
        if (cleanFilters[key as keyof ListDocumentsParams] === '') {
          delete cleanFilters[key as keyof ListDocumentsParams];
        }
      });
      return documentsApi.listDocuments(cleanFilters);
    },
  });

  // Fetch units for filter dropdown
  const { data: unitsResponse } = useQuery({
    queryKey: ['units'],
    queryFn: () => unitsApi.listUnits({ page: 1, limit: 100 }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const handleFilterChange = (field: string, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: number) => {
    setFilters((prev) => ({ ...prev, limit, page: 1 }));
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      unit_id: '',
      document_type: '',
      period: '',
      year: '',
      status: undefined,
    });
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Typography variant="h4">Documents</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/dashboard/documents/upload')}
            >
              Upload Document
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        {showFilters && (
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Filters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  label="Unit"
                  value={filters.unit_id || ''}
                  onChange={(e) => handleFilterChange('unit_id', e.target.value)}
                  fullWidth
                >
                  <MenuItem value="">All Units</MenuItem>
                  {unitsResponse?.data?.map((unit) => (
                    <MenuItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  label="Document Type"
                  value={filters.document_type || ''}
                  onChange={(e) => handleFilterChange('document_type', e.target.value)}
                  fullWidth
                >
                  <MenuItem value="">All Types</MenuItem>
                  {documentTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="Year"
                  type="number"
                  value={filters.year || ''}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                  fullWidth
                  placeholder="2024"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="Period"
                  value={filters.period || ''}
                  onChange={(e) => handleFilterChange('period', e.target.value)}
                  fullWidth
                  placeholder="Q1"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  select
                  label="Status"
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                  fullWidth
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </Box>
          </Paper>
        )}

        {/* Document List */}
        <DocumentList
          documents={data?.data || []}
          total={data?.total || 0}
          page={filters.page || 1}
          limit={filters.limit || 20}
          loading={isLoading}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          onDelete={handleDelete}
        />
      </Box>
    </Container>
  );
}
