'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  TablePagination,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Description as DocTypeIcon,
} from '@mui/icons-material';
import { unitsApi, Unit } from '@/lib/api/units';
import {
  docTypesApi,
  ReportorialDocType,
  SubmissionFrequency,
  computeExpectedFilename,
} from '@/lib/api/document-types';
import { useAuth } from '@/contexts/AuthContext';
import ResponsiveTable from '@/components/layout/ResponsiveTable';

const apiErrorMessage = (error: any, fallback: string) => {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join(', ') : message || fallback;
};

const FREQ_LABELS: Record<SubmissionFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};

// ---------- Reportorial Doc Types panel per unit ----------
function DocTypesPanel({ unit, canView, canManage }: { unit: Unit; canView: boolean; canManage: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const [docTypes, setDocTypes] = useState<ReportorialDocType[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReportorialDocType | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deleteConfirmDt, setDeleteConfirmDt] = useState<ReportorialDocType | null>(null);
  const [form, setForm] = useState({
    base_name: '',
    display_name: '',
    description: '',
    submission_frequency: 'monthly' as SubmissionFrequency,
  });

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const data = await docTypesApi.byUnit(unit.id);
      setDocTypes(data);
    } finally {
      setLoading(false);
    }
  }, [canView, unit.id]);

  // Load document types automatically when the accordion panel mounts (expands).
  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ base_name: '', display_name: '', description: '', submission_frequency: 'monthly' });
    setErr(null);
    setOpen(true);
  };

  const openEdit = (dt: ReportorialDocType) => {
    setEditing(dt);
    setForm({
      base_name: dt.base_name,
      display_name: dt.display_name,
      description: dt.description ?? '',
      submission_frequency: dt.submission_frequency,
    });
    setErr(null);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.base_name.trim() || !form.display_name.trim()) {
      enqueueSnackbar('Base name and display name are required.', { variant: 'error' });
      setErr('Base name and display name are required.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await docTypesApi.update(editing.id, form);
      } else {
        await docTypesApi.create({ ...form, unit_id: unit.id });
      }
      setOpen(false);
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to save.';
      setErr(msg);
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dt: ReportorialDocType) => {
    setDeleteConfirmDt(dt);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmDt) return;
    await docTypesApi.remove(deleteConfirmDt.id);
    setDeleteConfirmDt(null);
    await load();
  };

  const handleToggleActive = async (dt: ReportorialDocType) => {
    await docTypesApi.update(dt.id, { active: !dt.active });
    await load();
  };

  return (
    <>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle2" color="text.secondary">
          Reportorial Document Types
        </Typography>
        {canManage && <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={(e) => {
            e.stopPropagation();
            load();
            openCreate();
          }}
        >
          Add
        </Button>}
      </Box>

      {loading ? (
        <Box py={2} display="flex" justifyContent="center">
          <CircularProgress size={20} />
        </Box>
      ) : docTypes.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          None yet.
        </Typography>
      ) : (
        <ResponsiveTable minWidth={720} testId={`unit-${unit.id}-document-types`}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Display Name</TableCell>
              <TableCell>Base Name</TableCell>
              <TableCell>Frequency</TableCell>
              <TableCell>Sample Filename</TableCell>
              <TableCell>Status</TableCell>
              {canManage && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {docTypes.map((dt) => (
              <TableRow key={dt.id} hover>
                <TableCell>{dt.display_name}</TableCell>
                <TableCell>
                  <code>{dt.base_name}</code>
                </TableCell>
                <TableCell>{FREQ_LABELS[dt.submission_frequency]}</TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {computeExpectedFilename(dt)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={dt.active ? 'Active' : 'Inactive'}
                    size="small"
                    color={dt.active ? 'success' : 'default'}
                    onClick={canManage ? () => handleToggleActive(dt) : undefined}
                    sx={{ cursor: canManage ? 'pointer' : 'default' }}
                  />
                </TableCell>
                {canManage && <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openEdit(dt)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => handleDelete(dt)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </ResponsiveTable>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Document Type' : 'Add Document Type'}</DialogTitle>
        <DialogContent>
          {err && (
            <Typography color="error" sx={{ mb: 2 }}>
              {err}
            </Typography>
          )}
          <TextField
            margin="dense"
            label="Display Name"
            fullWidth
            required
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            helperText="Human-readable label (e.g. Monthly Incident Report)"
          />
          <TextField
            margin="dense"
            label="Base File Name"
            fullWidth
            required
            value={form.base_name}
            onChange={(e) => setForm({ ...form, base_name: e.target.value.replace(/\s+/g, '_') })}
            helperText="Underscore-separated, no spaces (e.g. Incident_Report)"
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Submission Frequency</InputLabel>
            <Select
              value={form.submission_frequency}
              label="Submission Frequency"
              onChange={(e) =>
                setForm({ ...form, submission_frequency: e.target.value as SubmissionFrequency })
              }
            >
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
              <MenuItem value="annual">Annual</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            minRows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          {form.base_name && (
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Sample filename:{' '}
              <strong>
                {computeExpectedFilename({
                  base_name: form.base_name,
                  submission_frequency: form.submission_frequency,
                } as ReportorialDocType)}
              </strong>
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.base_name.trim() || !form.display_name.trim()}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Dialog open={!!deleteConfirmDt} onClose={() => setDeleteConfirmDt(null)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteConfirmDt?.display_name}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmDt(null)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ---------- Main Units Page ----------
export default function UnitsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { myCap } = useAuth();
  const canManageUnits = !!myCap?.isUnitsManage;
  const canViewDocumentTypes = !!myCap?.isDocumentsAccess || !!myCap?.isDocumentTypesManage;
  const canManageDocumentTypes = !!myCap?.isDocumentTypesManage;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUnits, setTotalUnits] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hasReportorialRequirements, setHasReportorialRequirements] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [deleteConfirmUnit, setDeleteConfirmUnit] = useState<Unit | null>(null);
  const [deleteUnitConfirmed, setDeleteUnitConfirmed] = useState(false);

  const loadUnits = useCallback(async (targetPage = page, targetRowsPerPage = rowsPerPage) => {
    try {
      setLoading(true);
      const response = await unitsApi.listUnits({
        page: targetPage + 1,
        limit: targetRowsPerPage,
        search: search || undefined,
      });
      if (response.data.length === 0 && targetPage > 0) {
        setPage(targetPage - 1);
        return;
      }
      setUnits(response.data);
      setTotalUnits(response.total);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search]);

  useEffect(() => {
    loadUnits(page, rowsPerPage);
  }, [loadUnits, page, rowsPerPage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(0);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const handleCreate = () => {
    setEditingUnit(null);
    setName('');
    setDescription('');
    setHasReportorialRequirements(false);
    setOpen(true);
  };

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setName(unit.name);
    setDescription(unit.description || '');
    setHasReportorialRequirements(Boolean(unit.hasReportorialRequirements));
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      enqueueSnackbar('Unit name is required.', { variant: 'warning' });
      return;
    }
    try {
      setSaving(true);
      if (editingUnit) {
        await unitsApi.updateUnit(editingUnit.id, { name, description, hasReportorialRequirements });
        enqueueSnackbar('Unit updated successfully.', { variant: 'success' });
      } else {
        await unitsApi.createUnit({ name, description, hasReportorialRequirements });
        enqueueSnackbar('Unit created successfully.', { variant: 'success' });
      }
      setOpen(false);
      await loadUnits();
    } catch (err: any) {
      enqueueSnackbar(apiErrorMessage(err, 'Failed to save unit.'), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (unit: Unit) => {
    setDeleteConfirmUnit(unit);
    setDeleteUnitConfirmed(false);
  };

  const confirmDeleteUnit = async () => {
    if (!deleteConfirmUnit) return;
    try {
      await unitsApi.deleteUnit(deleteConfirmUnit.id);
      enqueueSnackbar('Unit deleted successfully.', { variant: 'success' });
      setDeleteConfirmUnit(null);
      setDeleteUnitConfirmed(false);
      await loadUnits();
    } catch (err: any) {
      enqueueSnackbar(apiErrorMessage(err, 'Failed to delete unit.'), { variant: 'error' });
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Units Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage organizational units and their reportorial document types
          </Typography>
        </Box>
        {canManageUnits && <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
          Add Unit
        </Button>}
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          <TextField
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            label="Search units"
            placeholder="Search by unit name or description"
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          />
          {units.map((unit) => (
            <Accordion
              key={unit.id}
              expanded={expanded === unit.id}
              onChange={(_, isExpanded) => {
                setExpanded(isExpanded ? unit.id : null);
              }}
              sx={{ mb: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" gap={2} width="100%">
                  <DocTypeIcon color="action" fontSize="small" />
                  <Box flex={1}>
                    <Typography fontWeight={600}>{unit.name}</Typography>
                    {unit.description && (
                      <Typography variant="caption" color="text.secondary">
                        {unit.description}
                      </Typography>
                    )}
                    <Chip
                      size="small"
                      color={unit.hasReportorialRequirements ? 'primary' : 'default'}
                      label={unit.hasReportorialRequirements ? 'RICTMS / Reportorial' : 'Regular / Requester'}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                  {canManageUnits && <Box onClick={(e) => e.stopPropagation()} display="flex" gap={1}>
                    <Tooltip title="Edit unit">
                      <IconButton size="small" onClick={() => handleEdit(unit)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete unit">
                      <IconButton size="small" color="error" onClick={() => handleDelete(unit)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>}
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ overflow: 'hidden' }}>
                {canViewDocumentTypes ? (
                  <DocTypesPanel unit={unit} canView={canViewDocumentTypes} canManage={canManageDocumentTypes} />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    You do not have access to reportorial document types.
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
          {units.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No units found. Add your first unit.</Typography>
            </Paper>
          )}
          <TablePagination
            component="div"
            count={totalUnits}
            page={page}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(Number(event.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50]}
          />
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingUnit ? 'Edit Unit' : 'Add Unit'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Unit Name"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            inputProps={{ maxLength: 255 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            minRows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            inputProps={{ maxLength: 255 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={hasReportorialRequirements}
                onChange={(e) => setHasReportorialRequirements(e.target.checked)}
              />
            }
            label="RICTMS/reportorial unit (visible only to RICTMS users)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving || !name.trim()}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteConfirmUnit} onClose={() => { setDeleteConfirmUnit(null); setDeleteUnitConfirmed(false); }} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Unit Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Deleting <strong>{deleteConfirmUnit?.name}</strong> also removes its document-type configuration. This action cannot be undone.
          </Typography>
          <Box display="flex" alignItems="center" mt={2}>
            <Checkbox
              inputProps={{ 'aria-label': 'Confirm unit deletion' }}
              checked={deleteUnitConfirmed}
              onChange={(event) => setDeleteUnitConfirmed(event.target.checked)}
            />
            <Typography variant="body2">I confirm that I want to permanently delete this unit.</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmUnit(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={!deleteConfirmUnit || !deleteUnitConfirmed}
            onClick={confirmDeleteUnit}
          >
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
