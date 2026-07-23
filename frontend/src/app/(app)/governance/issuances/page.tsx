'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  ListItemText,
  OutlinedInput,
  Typography,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  TextField,
  MenuItem,
  Menu,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
  SelectChangeEvent,
  FormControlLabel,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  LinkOff as UnlinkIcon,
  InfoOutlined as InfoOutlinedIcon,
  Visibility as VisibilityIcon,
  MoreHoriz as MoreHorizIcon,
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { issuancesApi, Issuance, CreateIssuanceDto } from '@/app/api/references';
import { documentsApi, Document } from '@/lib/api/documents';
import { usersApi, UserRecord } from '@/lib/api/users';

const ISSUANCE_ALLOWED_KEYS = [
  'issuance_number',
  'title',
  'description',
  'issuance_type',
  'applicability_scope',
  'relevance_notes',
  'binding_nature',
  'adoption_basis',
  'applicable_provisions',
  'compliance_obligations',
  'required_evidence',
  'evidence_location',
  'process_owner',
  'frequency_cadence',
  'compliance_status',
  'gap_summary',
  'action_required',
  'target_date',
  'last_review_date',
  'quarterly_readiness',
  'q1_compliance_status',
  'q2_compliance_status',
  'q3_compliance_status',
  'q4_compliance_status',
  'register_added_at',
  'is_amendment',
  'amended_issuance_number',
  'ict_amendment_notes',
  'issuing_authority',
  'issue_date',
  'effectivity_date',
  'source_url',
  'attachment_file_name',
  'attachment_mime_type',
  'attachment_uploaded_at',
  'is_active',
] as const;

type IssuanceAllowedKey = (typeof ISSUANCE_ALLOWED_KEYS)[number];

const sanitizeIssuancePayload = (
  payload: Partial<CreateIssuanceDto>,
): Partial<CreateIssuanceDto> => {
  const sanitized: Partial<CreateIssuanceDto> = {};
  ISSUANCE_ALLOWED_KEYS.forEach((key) => {
    const typedKey = key as IssuanceAllowedKey;
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      (sanitized as Record<string, unknown>)[typedKey] = payload[typedKey] as unknown;
    }
  });
  return sanitized;
};

export default function IssuancesPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [allIssuances, setAllIssuances] = useState<Issuance[]>([]);
  const [processOwnerOptions, setProcessOwnerOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
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
    binding_nature: '',
    adoption_basis: '',
    applicable_provisions: '',
    compliance_obligations: '',
    required_evidence: '',
    evidence_location: '',
    process_owner: '',
    frequency_cadence: 'quarterly',
    compliance_status: 'compliant',
    gap_summary: '',
    action_required: '',
    target_date: '',
    last_review_date: '',
    quarterly_readiness: 'ready',
    q1_compliance_status: 'compliant',
    q2_compliance_status: 'compliant',
    q3_compliance_status: 'compliant',
    q4_compliance_status: 'compliant',
    register_added_at: new Date().toISOString().slice(0, 10),
    is_amendment: false,
    amended_issuance_number: '',
    ict_amendment_notes: '',
    issuing_authority: '',
    issue_date: '',
    effectivity_date: '',
    source_url: '',
    is_active: true,
  });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [removeExistingAttachment, setRemoveExistingAttachment] = useState(false);
  const [filterAuthorities, setFilterAuthorities] = useState<string[]>([]);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [actionsAnchorEl, setActionsAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteConfirmIssuance, setDeleteConfirmIssuance] = useState<string | null>(null);
  const [actionsIssuance, setActionsIssuance] = useState<Issuance | null>(null);
  const canManageIssuances =
    user?.role === 'super_admin' ||
    user?.role === 'compliance_officer' ||
    user?.roleCode === 'compliance_officer';

  useEffect(() => {
    fetchIssuances();
    fetchProcessOwners();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [filterAuthorities, filterCategories, filterStatus, allIssuances.length]);

  const fetchIssuances = async () => {
    try {
      setLoading(true);
      const data = await issuancesApi.getAll();
      setAllIssuances(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch issuances');
    } finally {
      setLoading(false);
    }
  };

  const fetchProcessOwners = async () => {
    try {
      const users = await usersApi.list();
      const options = users
        .filter((entry: UserRecord) => entry.active)
        .filter((entry: UserRecord) => {
          const role = String(entry.role);
          const rc = entry.roleCode;
          return (
            ['compliance_officer', 'section_head', 'super_admin'].includes(role) ||
            rc === 'focal' ||
            rc === 'section_head' ||
            rc === 'compliance_officer'
          );
        })
        .map((entry: UserRecord) => {
          const displayName = [entry.firstName, entry.middleName, entry.lastName, entry.suffix]
            .filter(Boolean)
            .join(' ')
            .trim();
          const label = displayName || entry.email;
          return {
            label,
            value: label,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label));

      const deduped = Array.from(new Map(options.map((option) => [option.value, option])).values());
      setProcessOwnerOptions(deduped);
    } catch {
      setProcessOwnerOptions([]);
    }
  };

  const handleOpenDialog = (issuance?: Issuance) => {
    if (!canManageIssuances) {
      return;
    }

    if (issuance) {
      setEditingIssuance(issuance);
      setAttachmentFile(null);
      setRemoveExistingAttachment(false);
      setFormData({
        issuance_number: issuance.issuance_number,
        title: issuance.title,
        description: issuance.description || '',
        issuance_type: issuance.issuance_type || '',
        applicability_scope: issuance.applicability_scope || '',
        relevance_notes: issuance.relevance_notes || '',
        binding_nature: issuance.binding_nature || '',
        adoption_basis: issuance.adoption_basis || '',
        applicable_provisions: issuance.applicable_provisions || '',
        compliance_obligations: issuance.compliance_obligations || '',
        required_evidence: issuance.required_evidence || '',
        evidence_location: issuance.evidence_location || '',
        process_owner: issuance.process_owner || '',
        frequency_cadence: issuance.frequency_cadence || 'quarterly',
        compliance_status: issuance.compliance_status || 'compliant',
        gap_summary: issuance.gap_summary || '',
        action_required: issuance.action_required || '',
        target_date: issuance.target_date ? issuance.target_date.split('T')[0] : '',
        last_review_date: issuance.last_review_date ? issuance.last_review_date.split('T')[0] : '',
        quarterly_readiness: issuance.quarterly_readiness || 'ready',
        q1_compliance_status: issuance.q1_compliance_status || 'compliant',
        q2_compliance_status: issuance.q2_compliance_status || 'compliant',
        q3_compliance_status: issuance.q3_compliance_status || 'compliant',
        q4_compliance_status: issuance.q4_compliance_status || 'compliant',
        register_added_at: issuance.register_added_at
          ? issuance.register_added_at.split('T')[0]
          : new Date().toISOString().slice(0, 10),
        is_amendment: Boolean(issuance.is_amendment),
        amended_issuance_number: issuance.amended_issuance_number || '',
        ict_amendment_notes: issuance.ict_amendment_notes || '',
        issuing_authority: issuance.issuing_authority,
        issue_date: issuance.issue_date.split('T')[0],
        effectivity_date: issuance.effectivity_date ? issuance.effectivity_date.split('T')[0] : '',
        source_url: issuance.source_url || '',
        is_active: issuance.is_active,
      });
    } else {
      setEditingIssuance(null);
      setAttachmentFile(null);
      setRemoveExistingAttachment(false);
      setFormData({
        issuance_number: '',
        title: '',
        description: '',
        issuance_type: '',
        applicability_scope: '',
        relevance_notes: '',
        binding_nature: '',
        adoption_basis: '',
        applicable_provisions: '',
        compliance_obligations: '',
        required_evidence: '',
        evidence_location: '',
        process_owner: '',
        frequency_cadence: 'quarterly',
        compliance_status: 'compliant',
        gap_summary: '',
        action_required: '',
        target_date: '',
        last_review_date: '',
        quarterly_readiness: 'ready',
        q1_compliance_status: 'compliant',
        q2_compliance_status: 'compliant',
        q3_compliance_status: 'compliant',
        q4_compliance_status: 'compliant',
        register_added_at: new Date().toISOString().slice(0, 10),
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
    setAttachmentFile(null);
    setRemoveExistingAttachment(false);
  };

  const handleSubmit = async () => {
    if (!canManageIssuances) {
      return;
    }

    try {
      const sanitizedPayload = sanitizeIssuancePayload(formData);
      let savedIssuance: Issuance;
      if (editingIssuance) {
        savedIssuance = await issuancesApi.update(editingIssuance.id, sanitizedPayload);
        if (removeExistingAttachment && editingIssuance.attachment_file_name) {
          await issuancesApi.deleteAttachment(editingIssuance.id);
        }
      } else {
        savedIssuance = await issuancesApi.create(sanitizedPayload as CreateIssuanceDto);
      }

      if (attachmentFile) {
        await issuancesApi.uploadAttachment(savedIssuance.id, attachmentFile);
      }

      handleCloseDialog();
      await fetchIssuances();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save issuance', {
        variant: 'error',
      });
    }
  };

  const handleToggleActive = async (issuance: Issuance) => {
    if (!canManageIssuances) {
      return;
    }

    try {
      await issuancesApi.update(
        issuance.id,
        sanitizeIssuancePayload({ is_active: !issuance.is_active }),
      );
      await fetchIssuances();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update issuance status', {
        variant: 'error',
      });
    }
  };

  const handleDelete = (id: string) => {
    if (!canManageIssuances) {
      return;
    }
    setDeleteConfirmIssuance(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmIssuance) return;
    try {
      await issuancesApi.delete(deleteConfirmIssuance);
      fetchIssuances();
      setDeleteConfirmIssuance(null);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete issuance', {
        variant: 'error',
      });
    }
  };

  const authorityOptions = Array.from(
    new Set(
      allIssuances.map((item) => item.issuing_authority).filter((item) => Boolean(item?.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const categoryOptions = Array.from(
    new Set(
      allIssuances
        .map((item) => item.issuance_type)
        .filter((item): item is string => Boolean(item?.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const formatCategoryLabel = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

  const filteredIssuances = allIssuances.filter((issuance) => {
    const authorityMatch =
      filterAuthorities.length === 0 || filterAuthorities.includes(issuance.issuing_authority);
    const categoryMatch =
      filterCategories.length === 0 || filterCategories.includes(issuance.issuance_type || '');
    const statusMatch =
      filterStatus === 'all' ||
      (filterStatus === 'active' && issuance.is_active) ||
      (filterStatus === 'inactive' && !issuance.is_active);

    return authorityMatch && categoryMatch && statusMatch;
  });

  const pagedIssuances = filteredIssuances.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const handleAuthorityFilterChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setFilterAuthorities(typeof value === 'string' ? value.split(',') : value);
  };

  const handleCategoryFilterChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setFilterCategories(typeof value === 'string' ? value.split(',') : value);
  };

  const openBlobInNewTab = (blob: Blob, fallbackFileName: string) => {
    const objectUrl = URL.createObjectURL(blob);
    const opened = window.open(objectUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fallbackFileName;
      anchor.click();
    }

    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 60000);
  };

  const handleViewAttachment = async (issuance: Issuance) => {
    try {
      const blob = await issuancesApi.viewAttachment(issuance.id);
      openBlobInNewTab(
        blob,
        issuance.attachment_file_name || `${issuance.issuance_number}-attachment`,
      );
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to open attachment', {
        variant: 'error',
      });
    }
  };

  const handleDownloadAttachment = async (issuance: Issuance) => {
    try {
      const blob = await issuancesApi.downloadAttachment(issuance.id);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = issuance.attachment_file_name || `${issuance.issuance_number}-attachment`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to download attachment', {
        variant: 'error',
      });
    }
  };

  const handleTitleClick = async (issuance: Issuance) => {
    if (issuance.source_url) {
      window.open(issuance.source_url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (issuance.attachment_file_name) {
      await handleViewAttachment(issuance);
    }
  };

  const openActionsMenu = (event: React.MouseEvent<HTMLElement>, issuance: Issuance) => {
    setActionsAnchorEl(event.currentTarget);
    setActionsIssuance(issuance);
  };

  const closeActionsMenu = () => {
    setActionsAnchorEl(null);
    setActionsIssuance(null);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

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
      enqueueSnackbar(err.response?.data?.message || 'Failed to load mapping details', {
        variant: 'error',
      });
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
      enqueueSnackbar(err.response?.data?.message || 'Failed to link document', {
        variant: 'error',
      });
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
      enqueueSnackbar(err.response?.data?.message || 'Failed to unlink document', {
        variant: 'error',
      });
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
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Add Issuance
          </Button>
        )}
      </Box>

      {!canManageIssuances && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Read-only view. Issuance CRUD and document mapping actions are available to compliance and
          super admin roles.
        </Typography>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} alignItems="flex-start" flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 300 }}>
              <InputLabel id="authority-filter-label">Authority</InputLabel>
              <Select
                labelId="authority-filter-label"
                multiple
                value={filterAuthorities}
                onChange={handleAuthorityFilterChange}
                input={<OutlinedInput label="Authority" />}
                renderValue={(selected) =>
                  (selected as string[]).length > 0
                    ? (selected as string[]).join(', ')
                    : 'All Authorities'
                }
              >
                {authorityOptions.map((authority) => (
                  <MenuItem key={authority} value={authority}>
                    <Checkbox checked={filterAuthorities.includes(authority)} />
                    <ListItemText primary={authority} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel id="category-filter-label">Category</InputLabel>
              <Select
                labelId="category-filter-label"
                multiple
                value={filterCategories}
                onChange={handleCategoryFilterChange}
                input={<OutlinedInput label="Category" />}
                renderValue={(selected) =>
                  (selected as string[]).length > 0
                    ? (selected as string[]).map((item) => formatCategoryLabel(item)).join(', ')
                    : 'All Categories'
                }
              >
                {categoryOptions.map((category) => (
                  <MenuItem key={category} value={category}>
                    <Checkbox checked={filterCategories.includes(category)} />
                    <ListItemText primary={formatCategoryLabel(category)} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
            ) : filteredIssuances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No issuances found
                </TableCell>
              </TableRow>
            ) : (
              pagedIssuances.map((issuance) => (
                <TableRow key={issuance.id}>
                  <TableCell>{issuance.issuance_number}</TableCell>
                  <TableCell>
                    {issuance.source_url || issuance.attachment_file_name ? (
                      <Link
                        component="button"
                        type="button"
                        underline="hover"
                        onClick={() => handleTitleClick(issuance)}
                      >
                        {issuance.title}
                      </Link>
                    ) : (
                      issuance.title
                    )}
                  </TableCell>
                  <TableCell>{issuance.issuing_authority}</TableCell>
                  <TableCell>{new Date(issuance.issue_date).toLocaleDateString()}</TableCell>
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
                        <Chip
                          label={`Amends ${issuance.amended_issuance_number || 'N/A'}`}
                          size="small"
                          color="secondary"
                          sx={{ mb: 0.5 }}
                        />
                        <Typography variant="caption" color="text.secondary" display="block">
                          {issuance.ict_amendment_notes ||
                            'Includes ICT-related amendment provisions.'}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        None
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={(event) => openActionsMenu(event, issuance)}>
                      <MoreHorizIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredIssuances.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 20, 50]}
        />
      </TableContainer>

      <Menu
        anchorEl={actionsAnchorEl}
        open={Boolean(actionsAnchorEl && actionsIssuance)}
        onClose={closeActionsMenu}
      >
        <MenuItem
          onClick={() => {
            if (actionsIssuance) {
              openRelevanceDialog(actionsIssuance);
            }
            closeActionsMenu();
          }}
        >
          <ListItemIcon>
            <InfoOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="View Applicability" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (actionsIssuance) {
              openMappingDialog(actionsIssuance);
            }
            closeActionsMenu();
          }}
        >
          <ListItemIcon>
            <LinkIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Map Documents" />
        </MenuItem>
        {actionsIssuance?.attachment_file_name && (
          <MenuItem
            onClick={() => {
              if (actionsIssuance) {
                handleViewAttachment(actionsIssuance);
              }
              closeActionsMenu();
            }}
          >
            <ListItemIcon>
              <VisibilityIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="View Attached File" />
          </MenuItem>
        )}
        {actionsIssuance?.attachment_file_name && (
          <MenuItem
            onClick={() => {
              if (actionsIssuance) {
                handleDownloadAttachment(actionsIssuance);
              }
              closeActionsMenu();
            }}
          >
            <ListItemIcon>
              <DownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Download Attachment" />
          </MenuItem>
        )}
        {canManageIssuances && actionsIssuance && (
          <MenuItem
            onClick={() => {
              handleToggleActive(actionsIssuance);
              closeActionsMenu();
            }}
          >
            <ListItemIcon>
              {actionsIssuance.is_active ? (
                <UnlinkIcon fontSize="small" />
              ) : (
                <LinkIcon fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText primary={actionsIssuance.is_active ? 'Deactivate' : 'Activate'} />
          </MenuItem>
        )}
        {canManageIssuances && actionsIssuance && (
          <MenuItem
            onClick={() => {
              handleOpenDialog(actionsIssuance);
              closeActionsMenu();
            }}
          >
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Edit" />
          </MenuItem>
        )}
        {canManageIssuances && actionsIssuance && (
          <MenuItem
            onClick={() => {
              handleDelete(actionsIssuance.id);
              closeActionsMenu();
            }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primary="Delete" />
          </MenuItem>
        )}
      </Menu>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingIssuance ? 'Edit Issuance' : 'Add Issuance'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Issuance Number"
              value={formData.issuance_number}
              onChange={(e) => setFormData({ ...formData, issuance_number: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              select
              label="Issuance Type"
              value={formData.issuance_type || ''}
              onChange={(e) => setFormData({ ...formData, issuance_type: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
              fullWidth
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
            <TextField
              label="Applicability Scope"
              value={formData.applicability_scope || ''}
              onChange={(e) => setFormData({ ...formData, applicability_scope: e.target.value })}
              multiline
              rows={5}
              fullWidth
              placeholder="Describe detailed operational scope (who is covered, what processes/systems are affected, governance boundaries, lifecycle stages, and exceptions)."
            />
            <TextField
              label="Relevance Notes"
              value={formData.relevance_notes || ''}
              onChange={(e) => setFormData({ ...formData, relevance_notes: e.target.value })}
              multiline
              rows={6}
              fullWidth
              placeholder="Provide in-depth rationale: legal/operational basis, control objectives, implementation implications, affected teams, compliance evidence expected, and replacement/supersession context if applicable."
            />
            <TextField
              select
              label="Binding Nature"
              value={formData.binding_nature || ''}
              onChange={(e) => setFormData({ ...formData, binding_nature: e.target.value })}
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="mandatory">Mandatory</MenuItem>
              <MenuItem value="adopted_policy_baseline">Adopted Policy Baseline</MenuItem>
              <MenuItem value="guidance_reference">Guidance / Reference</MenuItem>
            </TextField>
            <TextField
              label="Adoption Basis"
              value={formData.adoption_basis || ''}
              onChange={(e) => setFormData({ ...formData, adoption_basis: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Applicable Provisions"
              value={formData.applicable_provisions || ''}
              onChange={(e) => setFormData({ ...formData, applicable_provisions: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Compliance Obligations"
              value={formData.compliance_obligations || ''}
              onChange={(e) => setFormData({ ...formData, compliance_obligations: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Required Evidence (MoV)"
              value={formData.required_evidence || ''}
              onChange={(e) => setFormData({ ...formData, required_evidence: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Evidence Location / Link"
              value={formData.evidence_location || ''}
              onChange={(e) => setFormData({ ...formData, evidence_location: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              select
              label="Process Owner"
              value={formData.process_owner || ''}
              onChange={(e) => setFormData({ ...formData, process_owner: e.target.value })}
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              {processOwnerOptions.map((owner) => (
                <MenuItem key={owner.value} value={owner.value}>
                  {owner.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Frequency / Cadence"
              value={formData.frequency_cadence || 'quarterly'}
              onChange={(e) => setFormData({ ...formData, frequency_cadence: e.target.value })}
              fullWidth
            >
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
              <MenuItem value="semestral">Semestral</MenuItem>
              <MenuItem value="annual">Annual</MenuItem>
              <MenuItem value="event_driven">Event-driven</MenuItem>
            </TextField>
            <TextField
              select
              label="Compliance Status"
              value={formData.compliance_status || 'compliant'}
              onChange={(e) => setFormData({ ...formData, compliance_status: e.target.value })}
              fullWidth
            >
              <MenuItem value="compliant">Compliant</MenuItem>
              <MenuItem value="partial">Partial</MenuItem>
              <MenuItem value="gap">Gap</MenuItem>
            </TextField>
            <TextField
              label="Gap Summary"
              value={formData.gap_summary || ''}
              onChange={(e) => setFormData({ ...formData, gap_summary: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Action Required"
              value={formData.action_required || ''}
              onChange={(e) => setFormData({ ...formData, action_required: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Target Date"
              type="date"
              value={formData.target_date || ''}
              onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Last Review Date"
              type="date"
              value={formData.last_review_date || ''}
              onChange={(e) => setFormData({ ...formData, last_review_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              select
              label="Quarterly Readiness"
              value={formData.quarterly_readiness || 'ready'}
              onChange={(e) => setFormData({ ...formData, quarterly_readiness: e.target.value })}
              fullWidth
            >
              <MenuItem value="ready">Ready</MenuItem>
              <MenuItem value="needs_update">Needs Update</MenuItem>
              <MenuItem value="missing_evidence">Missing Evidence</MenuItem>
            </TextField>
            <TextField
              label="Register Added Date"
              type="date"
              value={formData.register_added_at || ''}
              onChange={(e) => setFormData({ ...formData, register_added_at: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              select
              label="Q1 Compliance"
              value={formData.q1_compliance_status || 'compliant'}
              onChange={(e) => setFormData({ ...formData, q1_compliance_status: e.target.value })}
              fullWidth
            >
              <MenuItem value="compliant">Compliant</MenuItem>
              <MenuItem value="partial">Partial</MenuItem>
              <MenuItem value="non_compliant">Non-Compliant</MenuItem>
              <MenuItem value="not_applicable">Not Applicable</MenuItem>
            </TextField>
            <TextField
              select
              label="Q2 Compliance"
              value={formData.q2_compliance_status || 'compliant'}
              onChange={(e) => setFormData({ ...formData, q2_compliance_status: e.target.value })}
              fullWidth
            >
              <MenuItem value="compliant">Compliant</MenuItem>
              <MenuItem value="partial">Partial</MenuItem>
              <MenuItem value="non_compliant">Non-Compliant</MenuItem>
              <MenuItem value="not_applicable">Not Applicable</MenuItem>
            </TextField>
            <TextField
              select
              label="Q3 Compliance"
              value={formData.q3_compliance_status || 'compliant'}
              onChange={(e) => setFormData({ ...formData, q3_compliance_status: e.target.value })}
              fullWidth
            >
              <MenuItem value="compliant">Compliant</MenuItem>
              <MenuItem value="partial">Partial</MenuItem>
              <MenuItem value="non_compliant">Non-Compliant</MenuItem>
              <MenuItem value="not_applicable">Not Applicable</MenuItem>
            </TextField>
            <TextField
              select
              label="Q4 Compliance"
              value={formData.q4_compliance_status || 'compliant'}
              onChange={(e) => setFormData({ ...formData, q4_compliance_status: e.target.value })}
              fullWidth
            >
              <MenuItem value="compliant">Compliant</MenuItem>
              <MenuItem value="partial">Partial</MenuItem>
              <MenuItem value="non_compliant">Non-Compliant</MenuItem>
              <MenuItem value="not_applicable">Not Applicable</MenuItem>
            </TextField>
            <TextField
              select
              label="Is Amendment"
              value={formData.is_amendment ? 'yes' : 'no'}
              onChange={(e) => setFormData({ ...formData, is_amendment: e.target.value === 'yes' })}
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
              onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })}
              placeholder="e.g. CHED"
              required
              fullWidth
            />
            <TextField
              label="Issue Date"
              type="date"
              value={formData.issue_date}
              onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Effectivity Date"
              type="date"
              value={formData.effectivity_date}
              onChange={(e) => setFormData({ ...formData, effectivity_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Source URL"
              value={formData.source_url}
              onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
              fullWidth
            />
            {editingIssuance?.attachment_file_name && (
              <Typography variant="body2" color="text.secondary">
                Current Attachment: {editingIssuance.attachment_file_name}
              </Typography>
            )}
            <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />}>
              {attachmentFile
                ? `Selected: ${attachmentFile.name}`
                : 'Upload Attachment (PDF/DOC/DOCX)'}
              <input
                hidden
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setAttachmentFile(file);
                }}
              />
            </Button>
            {editingIssuance?.attachment_file_name && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={removeExistingAttachment}
                    onChange={(event) => setRemoveExistingAttachment(event.target.checked)}
                    disabled={Boolean(attachmentFile)}
                  />
                }
                label="Remove current attachment"
              />
            )}
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
                          {document.document_type} • {document.year}-{document.period} •{' '}
                          {document.unit?.name || 'No Unit'}
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
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    maxHeight: 320,
                    overflowY: 'auto',
                  }}
                >
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
                            {document.document_type} • {document.year}-{document.period} •{' '}
                            {document.unit?.name || 'No Unit'}
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
          Applicability and Relevance{' '}
          {selectedIssuance ? `• ${selectedIssuance.issuance_number}` : ''}
        </DialogTitle>
        <DialogContent>
          {selectedIssuance ? (
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Title
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {selectedIssuance.title}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Issuance Type
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.issuance_type || 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Applicability Scope
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.applicability_scope || 'No applicability scope provided.'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Relevance Notes
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.relevance_notes ||
                    selectedIssuance.description ||
                    'No relevance notes provided.'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Binding Nature
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.binding_nature || 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Applicable Provisions
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.applicable_provisions || 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Compliance Obligations
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.compliance_obligations || 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Required Evidence (MoV)
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.required_evidence || 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Process Owner
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.process_owner || 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Compliance Status
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.compliance_status || 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Quarterly Readiness
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.quarterly_readiness || 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Register Added Date
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.register_added_at
                    ? selectedIssuance.register_added_at.split('T')[0]
                    : 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Quarterly Compliance Tags
                </Typography>
                <Typography variant="body1">
                  Q1: {selectedIssuance.q1_compliance_status || 'N/A'} · Q2:{' '}
                  {selectedIssuance.q2_compliance_status || 'N/A'} · Q3:{' '}
                  {selectedIssuance.q3_compliance_status || 'N/A'} · Q4:{' '}
                  {selectedIssuance.q4_compliance_status || 'N/A'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Amendment
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.is_amendment
                    ? `Yes • Amends ${selectedIssuance.amended_issuance_number || 'N/A'}`
                    : 'No'}
                </Typography>
              </Box>
              {selectedIssuance.is_amendment ? (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    ICT Related Amendment Notes
                  </Typography>
                  <Typography variant="body1">
                    {selectedIssuance.ict_amendment_notes || 'No ICT amendment notes provided.'}
                  </Typography>
                </Box>
              ) : null}
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Mapped Documents
                </Typography>
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

      <Dialog open={!!deleteConfirmIssuance} onClose={() => setDeleteConfirmIssuance(null)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this issuance? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmIssuance(null)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
