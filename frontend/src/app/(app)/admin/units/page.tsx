'use client';

import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
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

const FREQ_LABELS: Record<SubmissionFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};

// ---------- Reportorial Doc Types panel per unit ----------
function DocTypesPanel({ unit }: { unit: Unit }) {
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

  const load = async () => {
    setLoading(true);
    try {
      const data = await docTypesApi.byUnit(unit.id);
      setDocTypes(data);
    } finally {
      setLoading(false);
    }
  };

  // Load document types automatically when the accordion panel mounts (expands).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, []);

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
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={(e) => {
            e.stopPropagation();
            load();
            openCreate();
          }}
        >
          Add
        </Button>
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
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Display Name</TableCell>
              <TableCell>Base Name</TableCell>
              <TableCell>Frequency</TableCell>
              <TableCell>Sample Filename</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
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
                    onClick={() => handleToggleActive(dt)}
                    sx={{ cursor: 'pointer' }}
                  />
                </TableCell>
                <TableCell align="right">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [open, setOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const loadUnits = async () => {
    try {
      setLoading(true);
      const data = await unitsApi.listAll();
      setUnits(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnits();
  }, []);

  const handleCreate = () => {
    setEditingUnit(null);
    setName('');
    setDescription('');
    setOpen(true);
  };

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setName(unit.name);
    setDescription(unit.description || '');
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editingUnit) {
        await unitsApi.updateUnit(editingUnit.id, { name, description });
      } else {
        await unitsApi.createUnit({ name, description });
      }
      setOpen(false);
      await loadUnits();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (unit: Unit) => {
    await unitsApi.deleteUnit(unit.id);
    await loadUnits();
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
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
          Add Unit
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
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
                  </Box>
                  <Box onClick={(e) => e.stopPropagation()} display="flex" gap={1}>
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
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <DocTypesPanel unit={unit} />
              </AccordionDetails>
            </Accordion>
          ))}
          {units.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No units found. Add your first unit.</Typography>
            </Paper>
          )}
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
            inputProps={{ maxLength: 100 }}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving || !name.trim()}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
