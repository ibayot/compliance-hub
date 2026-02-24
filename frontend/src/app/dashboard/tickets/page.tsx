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
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ticketsApi, Ticket, CreateTicketDto } from '@/app/api/references';

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
  const {} = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateTicketDto>({
    subject: '',
    description: '',
    issue_type: 'other',
    category: 'other',
    priority: 'medium',
  });
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [filterStatus, filterPriority]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await ticketsApi.getAll({
        status: filterStatus as any,
        priority: filterPriority as any,
      });
      setTickets(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      subject: '',
      description: '',
      issue_type: 'other',
      category: 'other',
      priority: 'medium',
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSubmit = async () => {
    try {
      await ticketsApi.create(formData);
      handleCloseDialog();
      fetchTickets();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create ticket');
    }
  };

  const handleViewTicket = (id: string) => {
    router.push(`/dashboard/tickets/${id}`);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Support Tickets</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Create Ticket
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

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
                  <TableCell>{(ticket.issue_type || 'other').replace('_', ' ')}</TableCell>
                  <TableCell>
                    {ticket.category.replace('_', ' ')}
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
        <DialogTitle>Create Support Ticket</DialogTitle>
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
              value={formData.issue_type || 'other'}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  issue_type: e.target.value as any,
                })
              }
              required
              fullWidth
            >
              <MenuItem value="policy_gap">Policy Gap</MenuItem>
              <MenuItem value="missing_evidence">Missing Evidence</MenuItem>
              <MenuItem value="data_inconsistency">Data Inconsistency</MenuItem>
              <MenuItem value="late_submission">Late Submission</MenuItem>
              <MenuItem value="security_incident">Security Incident</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
            <TextField
              select
              label="Category"
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as any,
                })
              }
              required
              fullWidth
            >
              <MenuItem value="document_related">Document Related</MenuItem>
              <MenuItem value="system_issue">System Issue</MenuItem>
              <MenuItem value="compliance_query">Compliance Query</MenuItem>
              <MenuItem value="training_request">Training Request</MenuItem>
              <MenuItem value="other">Other</MenuItem>
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
    </Box>
  );
}
