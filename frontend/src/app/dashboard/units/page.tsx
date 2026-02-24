'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { unitsApi, Unit } from '@/lib/api/units';

export default function UnitsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [open, setOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

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
            Manage organizational units
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
          Add Unit
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {units.map((unit) => (
                  <TableRow key={unit.id} hover>
                    <TableCell>{unit.name}</TableCell>
                    <TableCell>{unit.description || '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleEdit(unit)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleDelete(unit)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {units.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      No units found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingUnit ? 'Edit Unit' : 'Add Unit'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Unit Name"
            fullWidth
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            minRows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
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
