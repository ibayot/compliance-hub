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
  Stack,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ticketsApi,
  Ticket,
  CreateTicketDto,
  TicketConfigOption,
} from '@/app/api/references';

const priorityColors = {
  low: 'info',
  medium: 'warning',
  high: 'error',
  urgent: 'error',
} as const;

const statusColors = {
  open: 'info',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'default',
} as const;

export default function TicketsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [issueTypes, setIssueTypes] = useState<TicketConfigOption[]>([]);
  const [categories, setCategories] = useState<TicketConfigOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configType, setConfigType] = useState<'issue_type' | 'category'>('issue_type');
  const [editingConfig, setEditingConfig] = useState<TicketConfigOption | null>(null);
  const [configName, setConfigName] = useState('');
  const [configKey, setConfigKey] = useState('');
  const [configDescription, setConfigDescription] = useState('');
  const [configActive, setConfigActive] = useState(true);
  const [configCategoryId, setConfigCategoryId] = useState('');
  const [formData, setFormData] = useState<CreateTicketDto>({
    subject: '',
    description: '',
    issue_type: 'other',
    category: 'other',
    priority: 'medium',
  });
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    fetchTickets();
  }, [filterStatus, filterPriority]);

  useEffect(() => {
    fetchConfigs();
  }, [isSuperAdmin]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await ticketsApi.getAll({
        status: filterStatus as any,
        priority: filterPriority as any,
      });
      setTickets(data);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to fetch tickets', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigs = async () => {
    try {
      const [issueTypeData, categoryData] = await Promise.all([
        ticketsApi.listIssueTypes(!isSuperAdmin),
        ticketsApi.listCategories(!isSuperAdmin),
      ]);

      setIssueTypes(issueTypeData || []);
      setCategories(categoryData || []);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to load issue metadata', { variant: 'error' });
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      subject: '',
      description: '',
      issue_type: 'other',
      category: 'other',
      priority: 'medium',
      issue_type_id: undefined,
      category_id: undefined,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSubmit = async () => {
    try {
      const payload: CreateTicketDto = {
        ...formData,
        issue_type: formData.issue_type_id ? 'other' : formData.issue_type,
        category: formData.category_id ? 'other' : formData.category,
      };
      await ticketsApi.create(payload);
      handleCloseDialog();
      fetchTickets();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create ticket', { variant: 'error' });
    }
  };

  const handleViewTicket = (id: string) => {
    router.push(`/dashboard/tickets/${id}`);
  };

  const openConfigDialog = (
    type: 'issue_type' | 'category',
    item?: TicketConfigOption,
  ) => {
    setConfigType(type);
    setEditingConfig(item || null);
    setConfigName(item?.name || '');
    setConfigKey(item?.key || '');
    setConfigDescription(item?.description || '');
    setConfigActive(item?.is_active ?? true);
    setConfigCategoryId((item as any)?.category_id || '');
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = async () => {
    try {
      const payload = {
        key: configKey,
        name: configName,
        description: configDescription,
        is_active: configActive,
        category_id: configType === 'issue_type' ? configCategoryId || undefined : undefined,
      };

      if (configType === 'issue_type') {
        if (editingConfig) {
          await ticketsApi.updateIssueType(editingConfig.id, payload);
        } else {
          await ticketsApi.createIssueType(payload);
        }
      } else {
        if (editingConfig) {
          await ticketsApi.updateCategory(editingConfig.id, payload);
        } else {
          await ticketsApi.createCategory(payload);
        }
      }

      setConfigDialogOpen(false);
      setEditingConfig(null);
      fetchConfigs();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save metadata configuration', { variant: 'error' });
    }
  };

  const handleToggleConfig = async (
    type: 'issue_type' | 'category',
    item: TicketConfigOption,
  ) => {
    try {
      if (type === 'issue_type') {
        await ticketsApi.updateIssueType(item.id, { is_active: !item.is_active });
      } else {
        await ticketsApi.updateCategory(item.id, { is_active: !item.is_active });
      }
      fetchConfigs();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to toggle metadata status', { variant: 'error' });
    }
  };

  const handleDeleteConfig = async (
    type: 'issue_type' | 'category',
    item: TicketConfigOption,
  ) => {
    if (!confirm(`Delete ${item.name}? This performs a soft delete and is blocked when in use.`)) {
      return;
    }

    try {
      if (type === 'issue_type') {
        await ticketsApi.deleteIssueType(item.id);
      } else {
        await ticketsApi.deleteCategory(item.id);
      }
      fetchConfigs();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete metadata option', { variant: 'error' });
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Issues</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Create Ticket
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2}>
            <TextField
              select
              label="Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              sx={{ minWidth: 150 }}
              size="small"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </TextField>
            <TextField
              select
              label="Priority"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              sx={{ minWidth: 150 }}
              size="small"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </TextField>
          </Box>
        </CardContent>
      </Card>

      {isSuperAdmin && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Issue Metadata Management
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle1">Issue Types</Typography>
                  <Button size="small" variant="outlined" onClick={() => openConfigDialog('issue_type')}>
                    Add Issue Type
                  </Button>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {issueTypes.map((item) => (
                    <Chip
                      key={item.id}
                      label={`${item.name}${item.is_active ? '' : ' (inactive)'}`}
                      onClick={() => openConfigDialog('issue_type', item)}
                      onDelete={() => handleDeleteConfig('issue_type', item)}
                      color={item.is_active ? 'default' : 'warning'}
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle1">Categories</Typography>
                  <Button size="small" variant="outlined" onClick={() => openConfigDialog('category')}>
                    Add Category
                  </Button>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {categories.map((item) => (
                    <Chip
                      key={item.id}
                      label={`${item.name}${item.is_active ? '' : ' (inactive)'}`}
                      onClick={() => openConfigDialog('category', item)}
                      onDelete={() => handleDeleteConfig('category', item)}
                      color={item.is_active ? 'default' : 'warning'}
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Ticket #</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Issue Type</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
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
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No tickets found
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket.id} hover>
                  <TableCell>{ticket.ticket_number}</TableCell>
                  <TableCell>{ticket.subject}</TableCell>
                  <TableCell>
                    {(ticket.issue_type_config?.name || ticket.issue_type || 'other').replace('_', ' ')}
                  </TableCell>
                  <TableCell>
                    {(ticket.category_config?.name || ticket.category).replace('_', ' ')}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ticket.priority.toUpperCase()}
                      color={priorityColors[ticket.priority]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ticket.status.replace('_', ' ')}
                      color={statusColors[ticket.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleViewTicket(ticket.id)}
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Create Issue</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Subject"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
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
              rows={4}
              required
              fullWidth
            />
            <TextField
              select
              label="Issue Type"
              value={formData.issue_type_id || formData.issue_type || 'other'}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  issue_type_id: e.target.value,
                  issue_type: 'other',
                })
              }
              required
              fullWidth
            >
              {issueTypes
                .filter((item) => !formData.category_id || (item as any).category_id === formData.category_id)
                .filter((item) => item.is_active)
                .map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              select
              label="Category"
              value={formData.category_id || formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category_id: e.target.value,
                  category: 'other',
                  issue_type_id: undefined,
                })
              }
              required
              fullWidth
            >
              {categories
                .filter((item) => item.is_active)
                .map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              select
              label="Priority"
              value={formData.priority}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  priority: e.target.value as any,
                })
              }
              required
              fullWidth
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </TextField>
            <TextField
              label="Resolution Steps (optional)"
              value={formData.resolution_steps || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  resolution_steps: e.target.value,
                })
              }
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Create Ticket
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingConfig ? 'Edit' : 'Create'} {configType === 'issue_type' ? 'Issue Type' : 'Category'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Key"
              value={configKey}
              onChange={(e) => setConfigKey(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Name"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              required
              fullWidth
            />
            {configType === 'issue_type' && (
              <TextField
                select
                label="Category"
                value={configCategoryId}
                onChange={(event) => setConfigCategoryId(event.target.value)}
                fullWidth
              >
                <MenuItem value="">No Category</MenuItem>
                {categories
                  .filter((item) => item.is_active)
                  .map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name}
                    </MenuItem>
                  ))}
              </TextField>
            )}
            <TextField
              label="Description"
              value={configDescription}
              onChange={(e) => setConfigDescription(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
            {editingConfig && (
              <Button
                variant="outlined"
                color={configActive ? 'warning' : 'success'}
                onClick={() => {
                  handleToggleConfig(configType, editingConfig);
                  setConfigActive(!configActive);
                }}
              >
                {configActive ? 'Deactivate' : 'Activate'}
              </Button>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveConfig}
            variant="contained"
            disabled={!configName.trim() || !configKey.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
