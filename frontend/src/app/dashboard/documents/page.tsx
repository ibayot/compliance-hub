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
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterIcon,
  Archive as ArchiveIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, Document, ListDocumentsParams } from '@/lib/api/documents';
import { unitsApi } from '@/lib/api/units';
import DocumentList from '@/components/documents/DocumentList';
import { useAuth } from '@/contexts/AuthContext';

const documentTypes = ['Policy', 'Procedure', 'Guidelines', 'Manual', 'Report', 'Other'];
const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready', label: 'Ready' },
  { value: 'failed', label: 'Failed' },
];

export default function DocumentsPage() {
  const { user, myCap } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const isFocal = user?.roleCode === 'focal';
  const canAccessDocuments = user?.role === 'super_admin' || !!myCap?.isDocumentsAccess;

  if (!canAccessDocuments) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" gutterBottom>
            Documents
          </Typography>
          <Typography color="error">You do not have access to this feature.</Typography>
        </Box>
      </Container>
    );
  }

  const [filters, setFilters] = useState<ListDocumentsParams>({
    page: 1,
    limit: 20,
    title: '',
    unit_id: '',
    document_type: '',
    period: '',
    year: '',
    status: undefined,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [documentsTab, setDocumentsTab] = useState<'active' | 'archived'>('active');
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnRemarks, setReturnRemarks] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [targetDocument, setTargetDocument] = useState<Document | null>(null);

  // Fetch documents
  const isArchivedTab = isFocal && documentsTab === 'archived';

  const { data, isLoading } = useQuery({
    queryKey: ['documents', filters, documentsTab],
    staleTime: isArchivedTab ? 30_000 : 0,
    placeholderData: (previousData) =>
      previousData ?? {
        data: [],
        total: 0,
        page: filters.page || 1,
        limit: filters.limit || 20,
      },
    queryFn: () => {
      const cleanFilters = { ...filters };
      // Remove empty filters
      Object.keys(cleanFilters).forEach((key) => {
        if (cleanFilters[key as keyof ListDocumentsParams] === '') {
          delete cleanFilters[key as keyof ListDocumentsParams];
        }
      });
      cleanFilters.archived = isArchivedTab;
      return documentsApi.listDocuments(cleanFilters);
    },
  });

  // Fetch units for filter dropdown
  const { data: unitsResponse } = useQuery({
    queryKey: ['units'],
    queryFn: () => unitsApi.listUnits({ page: 1, limit: 100 }),
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks: string }) =>
      documentsApi.returnDocument(id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setReturnDialogOpen(false);
      setReturnRemarks('');
      setTargetDocument(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setDeleteDialogOpen(false);
      setTargetDocument(null);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => documentsApi.archiveDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setArchiveDialogOpen(false);
      setTargetDocument(null);
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

  const openReturnDialog = (document: Document) => {
    setTargetDocument(document);
    setReturnRemarks('');
    setReturnDialogOpen(true);
  };

  const openDeleteDialog = (document: Document) => {
    setTargetDocument(document);
    setDeleteDialogOpen(true);
  };

  const openArchiveDialog = (document: Document) => {
    setTargetDocument(document);
    setArchiveDialogOpen(true);
  };

  const canArchiveDocument = (document: Document) => {
    const cs = document.compliance_status;
    if (cs === 'needs_revision' || cs === 'non_compliant') {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Only returned documents can be archived' };
  };

  const handleSubmitArchive = () => {
    if (!targetDocument) return;
    archiveMutation.mutate(targetDocument.id);
  };

  const handleSubmitReturn = () => {
    if (!targetDocument) {
      return;
    }

    const remarks = returnRemarks.trim();
    if (!remarks) {
      return;
    }

    returnMutation.mutate({
      id: targetDocument.id,
      remarks,
    });
  };

  const handleSubmitDelete = () => {
    if (!targetDocument) {
      return;
    }

    deleteMutation.mutate(targetDocument.id);
  };

  const getWorkflowStatus = (document: Document) => {
    const complianceStatus = document.compliance_status || 'pending';
    const isSuperOrCompliance =
      user?.role === 'super_admin' ||
      user?.role === 'compliance_officer' ||
      user?.roleCode === 'compliance_officer';

    if (isSuperOrCompliance) {
      if (complianceStatus === 'compliant') {
        return { label: 'COMPLIANT', color: 'success' as const };
      }
      return { label: 'PENDING', color: 'warning' as const };
    }

    if (complianceStatus === 'compliant') {
      return { label: 'Approved', color: 'success' as const };
    }

    if (complianceStatus === 'non_compliant' || complianceStatus === 'needs_revision') {
      return { label: 'Returned', color: 'error' as const };
    }

    return { label: 'Pending Review', color: 'warning' as const };
  };

  const canReturnDocument = (document: Document) => {
    const isSuperOrCompliance =
      user?.role === 'super_admin' ||
      user?.role === 'compliance_officer' ||
      user?.roleCode === 'compliance_officer';
    if (!isSuperOrCompliance) {
      return {
        allowed: false,
        reason: 'Only super admin and compliance roles can return documents.',
      };
    }

    const uploaderRole = document.uploader?.role;
    if (uploaderRole === 'super_admin' || uploaderRole === 'compliance_officer') {
      return {
        allowed: false,
        reason:
          'Documents uploaded by compliance/super admin require hard delete instead of return.',
      };
    }

    if (document.status === 'processing' || document.status === 'failed') {
      return {
        allowed: false,
        reason: 'Documents currently being processed or in failed state cannot be returned.',
      };
    }

    if (document.compliance_status === 'compliant') {
      return { allowed: false, reason: 'Compliant documents cannot be returned.' };
    }

    return { allowed: true };
  };

  const canDeleteDocument = (document: Document) => {
    const isSuperOrCompliance =
      user?.role === 'super_admin' ||
      user?.role === 'compliance_officer' ||
      user?.roleCode === 'compliance_officer';
    if (!isSuperOrCompliance) {
      return {
        allowed: false,
        reason: 'Only super admin and compliance roles can delete documents.',
      };
    }

    const uploaderRole = document.uploader?.role;
    if (uploaderRole !== 'super_admin' && uploaderRole !== 'compliance_officer') {
      return {
        allowed: false,
        reason: 'Hard delete is only enabled for documents uploaded by compliance/super admin.',
      };
    }

    return { allowed: true };
  };

  const handleClearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      title: '',
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

        {isFocal && (
          <Paper elevation={1} sx={{ mb: 3 }}>
            <Tabs
              value={documentsTab}
              onChange={(_, value) => setDocumentsTab(value)}
              aria-label="Documents tabs"
            >
              <Tab label="Active Documents" value="active" />
              <Tab label="Archived Documents" value="archived" />
            </Tabs>
          </Paper>
        )}

        {/* Filters */}
        {showFilters && !isArchivedTab && (
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Filters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Title"
                  value={filters.title || ''}
                  onChange={(e) => handleFilterChange('title', e.target.value)}
                  fullWidth
                  placeholder="Search by title"
                />
              </Grid>
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
          loading={isLoading && !isArchivedTab}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          onReturn={isFocal ? undefined : openReturnDialog}
          onDelete={isFocal ? undefined : openDeleteDialog}
          onArchive={isFocal && !isArchivedTab ? openArchiveDialog : undefined}
          statusFormatter={getWorkflowStatus}
          canReturnDocument={canReturnDocument}
          canDeleteDocument={canDeleteDocument}
          canArchiveDocument={isFocal && !isArchivedTab ? canArchiveDocument : undefined}
          hideUnitColumn={isFocal}
          hideUploaderColumn={isFocal}
          archivedMode={isArchivedTab}
        />
      </Box>

      <Dialog
        open={returnDialogOpen}
        onClose={() => setReturnDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Return Document to Focal</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Returning requires mandatory remarks. The document record is preserved for audit.
          </Typography>
          <TextField
            label="Return Remarks"
            value={returnRemarks}
            onChange={(event) => setReturnRemarks(event.target.value)}
            fullWidth
            multiline
            minRows={4}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            disabled={!returnRemarks.trim() || returnMutation.isPending}
            onClick={handleSubmitReturn}
          >
            Return to Focal
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Archive Document</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This will archive the returned document. It will move to the Archived Documents tab.
          </Typography>
          <Typography variant="body2">
            {targetDocument ? `Archive "${targetDocument.title}"?` : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<ArchiveIcon />}
            onClick={handleSubmitArchive}
            disabled={!targetDocument || archiveMutation.isPending}
          >
            {archiveMutation.isPending ? 'Archiving...' : 'Archive'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Hard Delete Document</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This action permanently removes the document and its versions. This cannot be undone.
          </Typography>
          <Typography variant="body2">
            {targetDocument ? `Delete "${targetDocument.title}"?` : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSubmitDelete}
            disabled={!targetDocument || deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Hard Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
