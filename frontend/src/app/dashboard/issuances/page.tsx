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
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { issuancesApi, Issuance, CreateIssuanceDto } from '@/app/api/references';

export default function IssuancesPage() {
  const {} = useAuth();
  const [issuances, setIssuances] = useState<Issuance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIssuance, setEditingIssuance] = useState<Issuance | null>(null);
  const [formData, setFormData] = useState<CreateIssuanceDto>({
    issuance_number: '',
    title: '',
    description: '',
    issuing_authority: '',
    issue_date: '',
    effectivity_date: '',
    source_url: '',
  });
  const [filterAuthority, setFilterAuthority] = useState('');

  useEffect(() => {
    fetchIssuances();
  }, [filterAuthority]);

  const fetchIssuances = async () => {
    try {
      setLoading(true);
      const data = await issuancesApi.getAll({
        authority: filterAuthority || undefined,
        is_active: true,
      });
      setIssuances(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch issuances');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (issuance?: Issuance) => {
    if (issuance) {
      setEditingIssuance(issuance);
      setFormData({
        issuance_number: issuance.issuance_number,
        title: issuance.title,
        description: issuance.description || '',
        issuing_authority: issuance.issuing_authority,
        issue_date: issuance.issue_date.split('T')[0],
        effectivity_date: issuance.effectivity_date
          ? issuance.effectivity_date.split('T')[0]
          : '',
        source_url: issuance.source_url || '',
      });
    } else {
      setEditingIssuance(null);
      setFormData({
        issuance_number: '',
        title: '',
        description: '',
        issuing_authority: '',
        issue_date: '',
        effectivity_date: '',
        source_url: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingIssuance(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingIssuance) {
        await issuancesApi.update(editingIssuance.id, formData);
      } else {
        await issuancesApi.create(formData);
      }
      handleCloseDialog();
      fetchIssuances();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save issuance');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this issuance?'))
      return;
    try {
      await issuancesApi.delete(id);
      fetchIssuances();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete issuance');
    }
  };

  const authorities = ['CHED', 'DBM', 'CSC', 'COA', 'DOH', 'Other'];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Reference Issuances</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Issuance
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            select
            label="Filter by Authority"
            value={filterAuthority}
            onChange={(e) => setFilterAuthority(e.target.value)}
            sx={{ minWidth: 200 }}
            size="small"
          >
            <MenuItem value="">All</MenuItem>
            {authorities.map((auth) => (
              <MenuItem key={auth} value={auth}>
                {auth}
              </MenuItem>
            ))}
          </TextField>
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
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : issuances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No issuances found
                </TableCell>
              </TableRow>
            ) : (
              issuances.map((issuance) => (
                <TableRow key={issuance.id}>
                  <TableCell>{issuance.issuance_number}</TableCell>
                  <TableCell>{issuance.title}</TableCell>
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
                  <TableCell align="right">
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
              label="Issuing Authority"
              value={formData.issuing_authority}
              onChange={(e) =>
                setFormData({ ...formData, issuing_authority: e.target.value })
              }
              required
              fullWidth
            >
              {authorities.map((auth) => (
                <MenuItem key={auth} value={auth}>
                  {auth}
                </MenuItem>
              ))}
            </TextField>
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
    </Box>
  );
}
