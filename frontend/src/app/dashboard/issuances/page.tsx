'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  LinkOff as UnlinkIcon,
  InfoOutlined as InfoOutlinedIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { issuancesApi, Issuance, CreateIssuanceDto } from '@/app/api/references';
import { documentsApi, Document } from '@/lib/api/documents';

export default function IssuancesPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [issuances, setIssuances] = useState<Issuance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIssuance, setEditingIssuance] = useState<Issuance | null>(null);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [relevanceOpen, setRelevanceOpen] = useState(false);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingSearch, setMappingSearch] = useState('');
  const [selectedIssuance, setSelectedIssuance] = useState<Issuance | null>(null);
  const [mappedDocuments, setMappedDocuments] = useState<Document[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [formData, setFormData] = useState<CreateIssuanceDto>({
    issuance_number: '',
    title: '',
    description: '',
    issuance_type: '',
    applicability_scope: '',
    relevance_notes: '',
    is_amendment: false,
    amended_issuance_number: '',
    ict_amendment_notes: '',
    issuing_authority: '',
    issue_date: '',
    effectivity_date: '',
    source_url: '',
    is_active: true,
  });
  const [filterAuthority, setFilterAuthority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const canManageIssuances = user?.role === 'super_admin' || user?.role === 'reviewer';

  useEffect(() => {
    fetchIssuances();
  }, [filterAuthority, filterCategory, filterStatus]);

  const fetchIssuances = async () => {
    try {
      setLoading(true);
      const data = await issuancesApi.getAll({
        authority: filterAuthority || undefined,
        category: filterCategory || undefined,
        is_active:
          filterStatus === 'all' ? undefined : filterStatus === 'active',
      });
      setIssuances(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch issuances');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (issuance?: Issuance) => {
    if (!canManageIssuances) {
      return;
    }

    if (issuance) {
      setEditingIssuance(issuance);
      setFormData({
        issuance_number: issuance.issuance_number,
        title: issuance.title,
        description: issuance.description || '',
          issuance_type: issuance.issuance_type || '',
          applicability_scope: issuance.applicability_scope || '',
          relevance_notes: issuance.relevance_notes || '',
        is_amendment: Boolean(issuance.is_amendment),
        amended_issuance_number: issuance.amended_issuance_number || '',
        ict_amendment_notes: issuance.ict_amendment_notes || '',
        issuing_authority: issuance.issuing_authority,
        issue_date: issuance.issue_date.split('T')[0],
        effectivity_date: issuance.effectivity_date
          ? issuance.effectivity_date.split('T')[0]
          : '',
        source_url: issuance.source_url || '',
        is_active: issuance.is_active,
      });
    } else {
      setEditingIssuance(null);
      setFormData({
        issuance_number: '',
        title: '',
        description: '',
        issuance_type: '',
        applicability_scope: '',
        relevance_notes: '',
        is_amendment: false,
        amended_issuance_number: '',
        ict_amendment_notes: '',
        issuing_authority: '',
        issue_date: '',
        effectivity_date: '',
        source_url: '',
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingIssuance(null);
  };

  const handleSubmit = async () => {
    if (!canManageIssuances) {
      return;
    }

    try {
      if (editingIssuance) {
        await issuancesApi.update(editingIssuance.id, formData);
      } else {
        await issuancesApi.create(formData);
      }
      handleCloseDialog();
      fetchIssuances();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save issuance', { variant: 'error' });
    }
  };

  const handleToggleActive = async (issuance: Issuance) => {
    if (!canManageIssuances) {
      return;
    }

    try {
      await issuancesApi.update(issuance.id, { is_active: !issuance.is_active });
      await fetchIssuances();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update issuance status', { variant: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManageIssuances) {
      return;
    }

    if (!confirm('Are you sure you want to delete this issuance?'))
      return;
    try {
      await issuancesApi.delete(id);
      fetchIssuances();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete issuance', { variant: 'error' });
    }
  };

  const authorityOptions = Array.from(
    new Set(
      issuances
        .map((item) => item.issuing_authority)
        .filter((item) => Boolean(item?.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const categoryOptions = Array.from(
    new Set(
      issuances
        .map((item) => item.issuance_type)
        .filter((item): item is string => Boolean(item?.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const openMappingDialog = async (issuance: Issuance) => {
    try {
      setMappingOpen(true);
      setMappingLoading(true);
      setMappingSearch('');
      setSelectedIssuance(issuance);

      const [issuanceDetails, docs] = await Promise.all([
        issuancesApi.getById(issuance.id),
        documentsApi.listDocuments({ page: 1, limit: 200 }),
      ]);

      const linkedDocs = (issuanceDetails.documents || []) as Document[];
      setMappedDocuments(linkedDocs);
      setAvailableDocuments((docs.data || []).filter((document) => document.status === 'ready'));
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to load mapping details', { variant: 'error' });
    } finally {
      setMappingLoading(false);
    }
  };

  const closeMappingDialog = () => {
    setMappingOpen(false);
    setMappingLoading(false);
    setMappingSearch('');
    setSelectedIssuance(null);
    setMappedDocuments([]);
    setAvailableDocuments([]);
  };

  const openRelevanceDialog = (issuance: Issuance) => {
    setSelectedIssuance(issuance);
    setRelevanceOpen(true);
  };

  const closeRelevanceDialog = () => {
    setRelevanceOpen(false);
    setSelectedIssuance(null);
  };

  const handleLinkDocument = async (documentId: string) => {
    if (!selectedIssuance || !canManageIssuances) {
      return;
    }

    try {
      await issuancesApi.linkDocument(selectedIssuance.id, documentId);
      await openMappingDialog(selectedIssuance);
      await fetchIssuances();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to link document', { variant: 'error' });
    }
  };

  const handleUnlinkDocument = async (documentId: string) => {
    if (!selectedIssuance || !canManageIssuances) {
      return;
    }

    try {
      await issuancesApi.unlinkDocument(selectedIssuance.id, documentId);
      await openMappingDialog(selectedIssuance);
      await fetchIssuances();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to unlink document', { variant: 'error' });
    }
  };

  const mappedDocumentIds = new Set(mappedDocuments.map((document) => document.id));
  const filteredDocuments = availableDocuments.filter((document) => {
    const normalizedSearch = mappingSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return true;
    }

    return (
      document.title.toLowerCase().includes(normalizedSearch) ||
      document.document_type.toLowerCase().includes(normalizedSearch) ||
      (document.unit?.name || '').toLowerCase().includes(normalizedSearch)
    );
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Reference Issuances</Typography>
        {canManageIssuances && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Issuance
          </Button>
        )}
      </Box>

      {!canManageIssuances && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Read-only view. Issuance CRUD and document mapping actions are available to compliance and super admin roles.
        </Typography>
      )}



      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} alignItems="flex-start" flexWrap="wrap">
            <TextField
              select
              label="Authority"
              value={filterAuthority}
              onChange={(e) => setFilterAuthority(e.target.value)}
              sx={{ minWidth: 260 }}
              size="small"
            >
              <MenuItem value="">All Authorities</MenuItem>
              {authorityOptions.map((authority) => (
                <MenuItem key={authority} value={authority}>
                  {authority}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              sx={{ minWidth: 220 }}
              size="small"
            >
              <MenuItem value="">All Categories</MenuItem>
              {categoryOptions.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              sx={{ minWidth: 180 }}
              size="small"
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Box>
        </CardContent>
      </Card>

      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Issuance Number</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Authority</TableCell>
              <TableCell>Issue Date</TableCell>
              <TableCell>Status</TableCell>
                  <TableCell>Mapped Documents</TableCell>
              <TableCell>ICT Related Amendments</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                    <TableCell colSpan={8} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : issuances.length === 0 ? (
              <TableRow>
                    <TableCell colSpan={8} align="center">
                  No issuances found
                </TableCell>
              </TableRow>
            ) : (
              issuances.map((issuance) => (
                <TableRow key={issuance.id}>
                  <TableCell>{issuance.issuance_number}</TableCell>
                  <TableCell>
                    {issuance.source_url ? (
                      <Link
                        href={issuance.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                      >
                        {issuance.title}
                      </Link>
                    ) : (
                      issuance.title
                    )}
                  </TableCell>
                  <TableCell>{issuance.issuing_authority}</TableCell>
                  <TableCell>
                    {new Date(issuance.issue_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={issuance.is_active ? 'Active' : 'Inactive'}
                      color={issuance.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${issuance.documents?.length || 0} linked`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {issuance.is_amendment ? (
                      <Box>
                        <Chip label={`Amends ${issuance.amended_issuance_number || 'N/A'}`} size="small" color="secondary" sx={{ mb: 0.5 }} />
                        <Typography variant="caption" color="text.secondary" display="block">
                          {issuance.ict_amendment_notes || 'Includes ICT-related amendment provisions.'}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">None</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="info"
                      onClick={() => openRelevanceDialog(issuance)}
                      title="View applicability and relevance"
                    >
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => openMappingDialog(issuance)}
                    >
                      <LinkIcon fontSize="small" />
                    </IconButton>
                    {canManageIssuances && (
                      <>
                        <Button
                          size="small"
                          color={issuance.is_active ? 'warning' : 'success'}
                          onClick={() => handleToggleActive(issuance)}
                          sx={{ mr: 1 }}
                        >
                          {issuance.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(issuance)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(issuance.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingIssuance ? 'Edit Issuance' : 'Add Issuance'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Issuance Number"
              value={formData.issuance_number}
              onChange={(e) =>
                setFormData({ ...formData, issuance_number: e.target.value })
              }
              required
              fullWidth
            />
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              select
              label="Issuance Type"
              value={formData.issuance_type || ''}
              onChange={(e) =>
                setFormData({ ...formData, issuance_type: e.target.value })
              }
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="law">Law</MenuItem>
              <MenuItem value="circular">Circular</MenuItem>
              <MenuItem value="memorandum">Memorandum</MenuItem>
              <MenuItem value="irr">IRR</MenuItem>
              <MenuItem value="standard">Standard</MenuItem>
              <MenuItem value="executive_order">Executive Order</MenuItem>
              <MenuItem value="plan">Plan</MenuItem>
              <MenuItem value="guideline">Guideline</MenuItem>
            </TextField>
            <TextField
              select
              label="Status"
              value={formData.is_active === false ? 'inactive' : 'active'}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.value === 'active' })
              }
              fullWidth
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
            <TextField
              label="Applicability Scope"
              value={formData.applicability_scope || ''}
              onChange={(e) =>
                setFormData({ ...formData, applicability_scope: e.target.value })
              }
              multiline
              rows={5}
              fullWidth
              placeholder="Describe detailed operational scope (who is covered, what processes/systems are affected, governance boundaries, lifecycle stages, and exceptions)."
            />
            <TextField
              label="Relevance Notes"
              value={formData.relevance_notes || ''}
              onChange={(e) =>
                setFormData({ ...formData, relevance_notes: e.target.value })
              }
              multiline
              rows={6}
              fullWidth
              placeholder="Provide in-depth rationale: legal/operational basis, control objectives, implementation implications, affected teams, compliance evidence expected, and replacement/supersession context if applicable."
            />
            <TextField
              select
              label="Is Amendment"
              value={formData.is_amendment ? 'yes' : 'no'}
              onChange={(e) =>
                setFormData({ ...formData, is_amendment: e.target.value === 'yes' })
              }
              fullWidth
            >
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="yes">Yes</MenuItem>
            </TextField>
            {formData.is_amendment ? (
              <>
                <TextField
                  label="Amended Issuance Number"
                  value={formData.amended_issuance_number || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, amended_issuance_number: e.target.value })
                  }
                  fullWidth
                  placeholder="e.g. RA-9184"
                />
                <TextField
                  label="ICT Related Amendment Notes"
                  value={formData.ict_amendment_notes || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, ict_amendment_notes: e.target.value })
                  }
                  multiline
                  rows={4}
                  fullWidth
                  placeholder="Describe which ICT provisions were introduced/expanded by this amendment."
                />
              </>
            ) : null}
            <TextField
              label="Issuing Authority"
              value={formData.issuing_authority}
              onChange={(e) =>
                setFormData({ ...formData, issuing_authority: e.target.value })
              }
              placeholder="e.g. CHED"
              required
              fullWidth
            />
            <TextField
              label="Issue Date"
              type="date"
              value={formData.issue_date}
              onChange={(e) =>
                setFormData({ ...formData, issue_date: e.target.value })
              }
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Effectivity Date"
              type="date"
              value={formData.effectivity_date}
              onChange={(e) =>
                setFormData({ ...formData, effectivity_date: e.target.value })
              }
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Source URL"
              value={formData.source_url}
              onChange={(e) =>
                setFormData({ ...formData, source_url: e.target.value })
              }
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingIssuance ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={mappingOpen} onClose={closeMappingDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          Document Mapping {selectedIssuance ? `• ${selectedIssuance.issuance_number}` : ''}
        </DialogTitle>
        <DialogContent>
          {mappingLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <Typography>Loading mapping data...</Typography>
            </Box>
          ) : (
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Search Documents"
                value={mappingSearch}
                onChange={(e) => setMappingSearch(e.target.value)}
                placeholder="Search by title, type, or unit"
                fullWidth
                size="small"
              />

              <Typography variant="subtitle1" fontWeight={600}>
                Linked Documents ({mappedDocuments.length})
              </Typography>
              {mappedDocuments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No documents currently linked.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {mappedDocuments.map((document) => (
                    <Box
                      key={`linked-${document.id}`}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Box>
                        <Typography fontWeight={600}>{document.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {document.document_type} • {document.year}-{document.period} • {document.unit?.name || 'No Unit'}
                        </Typography>
                      </Box>
                      {canManageIssuances && (
                        <Button
                          size="small"
                          color="warning"
                          startIcon={<UnlinkIcon />}
                          onClick={() => handleUnlinkDocument(document.id)}
                        >
                          Unlink
                        </Button>
                      )}
                    </Box>
                  ))}
                </Box>
              )}

              <Typography variant="subtitle1" fontWeight={600}>
                Available Ready/Compliant Documents
              </Typography>
              {filteredDocuments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No documents matched your search.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 320, overflowY: 'auto' }}>
                  {filteredDocuments.map((document) => {
                    const isLinked = mappedDocumentIds.has(document.id);
                    return (
                      <Box
                        key={`available-${document.id}`}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          bgcolor: isLinked ? 'action.hover' : 'inherit',
                        }}
                      >
                        <Box>
                          <Typography fontWeight={600}>{document.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {document.document_type} • {document.year}-{document.period} • {document.unit?.name || 'No Unit'}
                          </Typography>
                        </Box>
                        {isLinked ? (
                          <Chip label="Linked" size="small" color="success" />
                        ) : canManageIssuances ? (
                          <Button
                            size="small"
                            startIcon={<LinkIcon />}
                            onClick={() => handleLinkDocument(document.id)}
                          >
                            Link
                          </Button>
                        ) : (
                          <Chip label="Not Linked" size="small" variant="outlined" />
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeMappingDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={relevanceOpen} onClose={closeRelevanceDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Applicability and Relevance {selectedIssuance ? `• ${selectedIssuance.issuance_number}` : ''}
        </DialogTitle>
        <DialogContent>
          {selectedIssuance ? (
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Title</Typography>
                <Typography variant="body1" fontWeight={600}>{selectedIssuance.title}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Issuance Type</Typography>
                <Typography variant="body1">{selectedIssuance.issuance_type || 'Not specified'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Applicability Scope</Typography>
                <Typography variant="body1">{selectedIssuance.applicability_scope || 'No applicability scope provided.'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Relevance Notes</Typography>
                <Typography variant="body1">{selectedIssuance.relevance_notes || selectedIssuance.description || 'No relevance notes provided.'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Amendment</Typography>
                <Typography variant="body1">
                  {selectedIssuance.is_amendment
                    ? `Yes • Amends ${selectedIssuance.amended_issuance_number || 'N/A'}`
                    : 'No'}
                </Typography>
              </Box>
              {selectedIssuance.is_amendment ? (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">ICT Related Amendment Notes</Typography>
                  <Typography variant="body1">
                    {selectedIssuance.ict_amendment_notes || 'No ICT amendment notes provided.'}
                  </Typography>
                </Box>
              ) : null}
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Mapped Documents</Typography>
                <Typography variant="body1">{selectedIssuance.documents?.length || 0}</Typography>
              </Box>
            </Box>
          ) : (
            <Typography sx={{ pt: 1 }}>No issuance selected.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRelevanceDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
