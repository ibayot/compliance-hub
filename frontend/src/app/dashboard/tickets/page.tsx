'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, CircularProgress,
  Rating, Tooltip, Alert,
} from '@mui/material';
import {
  Add as AddIcon, Visibility as ViewIcon, AssignmentInd as AssignIcon,
  ThumbUp as SatisfactionIcon, Computer as DesktopIcon, Wifi as ITIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ticketsApi, Ticket, CreateTicketDto, TicketStatus, TicketType, TicketPriority,
  TechnicianOption, SubmitSatisfactionDto,
} from '@/app/api/references';

const PRIORITY_COLOR: Record<string, 'default' | 'info' | 'warning' | 'error' | 'success'> = {
  low: 'info', medium: 'warning', high: 'error', urgent: 'error',
};
const STATUS_COLOR: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  open: 'info', assigned: 'warning', in_progress: 'warning', resolved: 'success', closed: 'default',
};
const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  desktop_support: 'Desktop Support',
  it_support: 'IT Support',
};

function isStaffRole(role?: string) {
  return ['super_admin','reviewer','focal','technician','technician_desktop','technician_it_support','auditor'].includes(role ?? '');
}

export default function TicketsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  // New ticket dialog
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateTicketDto>({ subject: '', description: '', ticketType: 'it_support', priority: 'medium' });
  const [submitting, setSubmitting] = useState(false);

  // Assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningTicket, setAssigningTicket] = useState<Ticket | null>(null);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [selectedTechId, setSelectedTechId] = useState('');

  // Satisfaction dialog
  const [satDialogOpen, setSatDialogOpen] = useState(false);
  const [satTicket, setSatTicket] = useState<Ticket | null>(null);
  const [satRating, setSatRating] = useState<number | null>(null);
  const [satComment, setSatComment] = useState('');

  const canManageAll = isStaffRole(user?.role);
  const isSuperAdmin = user?.role === 'super_admin';
  const isTechnician = ['technician','technician_desktop','technician_it_support'].includes(user?.role ?? '');

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ticketsApi.getAll({
        status: filterStatus as TicketStatus || undefined,
        ticketType: filterType as TicketType || undefined,
      });
      setTickets(data);
    } catch {
      enqueueSnackbar('Failed to load tickets', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleSubmitTicket = async () => {
    if (!form.subject.trim() || !form.description.trim()) {
      enqueueSnackbar('Subject and description are required.', { variant: 'warning' }); return;
    }
    try {
      setSubmitting(true);
      await ticketsApi.create(form);
      enqueueSnackbar('Ticket submitted successfully!', { variant: 'success' });
      setNewDialogOpen(false);
      setForm({ subject: '', description: '', ticketType: 'it_support', priority: 'medium' });
      fetchTickets();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to submit ticket', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const openAssignDialog = async (ticket: Ticket) => {
    setAssigningTicket(ticket);
    setSelectedTechId(String(ticket.assignedToId ?? ''));
    try {
      const techs = await ticketsApi.getTechnicians();
      setTechnicians(techs.filter(t =>
        ticket.ticketType === 'desktop_support'
          ? ['technician_desktop','technician'].includes(t.role)
          : ['technician_it_support','technician'].includes(t.role)
      ));
    } catch { setTechnicians([]); }
    setAssignDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!assigningTicket || !selectedTechId) return;
    try {
      await ticketsApi.assign(assigningTicket.id, Number(selectedTechId));
      enqueueSnackbar('Ticket assigned.', { variant: 'success' });
      setAssignDialogOpen(false);
      fetchTickets();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to assign', { variant: 'error' });
    }
  };

  const openSatDialog = (ticket: Ticket) => {
    setSatTicket(ticket);
    setSatRating(ticket.satisfactionRating ?? null);
    setSatComment(ticket.satisfactionComment ?? '');
    setSatDialogOpen(true);
  };

  const handleSubmitSatisfaction = async () => {
    if (!satTicket || !satRating) { enqueueSnackbar('Please select a rating.', { variant: 'warning' }); return; }
    try {
      await ticketsApi.submitSatisfaction(satTicket.id, { rating: satRating, comment: satComment });
      enqueueSnackbar('Thank you for your feedback!', { variant: 'success' });
      setSatDialogOpen(false);
      fetchTickets();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to submit', { variant: 'error' });
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Help Desk Tickets</Typography>
          <Typography variant="body2" color="text.secondary">
            Submit and track assistance requests for Desktop &amp; IT Support
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewDialogOpen(true)}>
          New Ticket
        </Button>
      </Box>

      {canManageAll && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <TextField select label="Status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} size="small" sx={{ minWidth: 140 }}>
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="assigned">Assigned</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </TextField>
              <TextField select label="Type" value={filterType} onChange={e => setFilterType(e.target.value)} size="small" sx={{ minWidth: 160 }}>
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="desktop_support">Desktop Support</MenuItem>
                <MenuItem value="it_support">IT Support</MenuItem>
              </TextField>
              <Button size="small" variant="outlined" onClick={() => { setFilterStatus(''); setFilterType(''); }}>Reset</Button>
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
              <TableCell>Type</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              {canManageAll && <TableCell>Requester</TableCell>}
              {canManageAll && <TableCell>Assigned To</TableCell>}
              <TableCell>Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} align="center"><CircularProgress size={28} /></TableCell></TableRow>
            ) : tickets.length === 0 ? (
              <TableRow><TableCell colSpan={9} align="center">
                <Typography color="text.secondary" py={3}>No tickets found. Click "New Ticket" to submit your first request.</Typography>
              </TableCell></TableRow>
            ) : tickets.map(ticket => (
              <TableRow key={ticket.id} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{ticket.ticketNumber}</TableCell>
                <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.subject}</TableCell>
                <TableCell>
                  <Chip size="small"
                    icon={ticket.ticketType === 'desktop_support' ? <DesktopIcon /> : <ITIcon />}
                    label={TICKET_TYPE_LABELS[ticket.ticketType]} variant="outlined" />
                </TableCell>
                <TableCell><Chip size="small" label={ticket.priority.toUpperCase()} color={PRIORITY_COLOR[ticket.priority]} /></TableCell>
                <TableCell><Chip size="small" label={ticket.status.replace('_', ' ')} color={STATUS_COLOR[ticket.status]} /></TableCell>
                {canManageAll && (
                  <TableCell>{ticket.requester ? `${ticket.requester.firstName ?? ''} ${ticket.requester.lastName ?? ''}`.trim() || ticket.requester.email : '—'}</TableCell>
                )}
                {canManageAll && (
                  <TableCell>{ticket.assignedTo
                    ? `${ticket.assignedTo.firstName ?? ''} ${ticket.assignedTo.lastName ?? ''}`.trim() || ticket.assignedTo.email
                    : <Typography color="text.disabled" variant="body2">Unassigned</Typography>}
                  </TableCell>
                )}
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}><ViewIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    {(isSuperAdmin || isTechnician) && (
                      <Tooltip title="Assign Ticket">
                        <IconButton size="small" color="primary" onClick={() => openAssignDialog(ticket)}><AssignIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                    {(ticket.status === 'resolved' || ticket.status === 'closed') && ticket.requesterId === user?.id && !ticket.satisfactionSubmittedAt && (
                      <Tooltip title="Rate this resolution">
                        <IconButton size="small" color="success" onClick={() => openSatDialog(ticket)}><SatisfactionIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* New Ticket Dialog */}
      <Dialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Submit a Help Desk Ticket</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">
              Choose the support type that matches your issue. Desktop Support handles hardware/workstation problems; IT Support handles software/network issues.
            </Alert>
            <TextField select label="Support Type *" value={form.ticketType} onChange={e => setForm({ ...form, ticketType: e.target.value as TicketType })} fullWidth>
              <MenuItem value="desktop_support">🖥️  Desktop Support</MenuItem>
              <MenuItem value="it_support">💻  IT Support</MenuItem>
            </TextField>
            <TextField label="Subject *" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} fullWidth placeholder="Brief description of your issue" />
            <TextField label="Description *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={4} placeholder="Provide details: what happened, when, steps tried..." />
            <TextField select label="Priority" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as TicketPriority })} fullWidth>
              <MenuItem value="low">Low — Not urgent</MenuItem>
              <MenuItem value="medium">Medium — Normal impact</MenuItem>
              <MenuItem value="high">High — Significant impact</MenuItem>
              <MenuItem value="urgent">Urgent — Critical / blocking work</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmitTicket} variant="contained" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Ticket'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Assign Ticket</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Ticket: <strong>{assigningTicket?.ticketNumber}</strong> — {TICKET_TYPE_LABELS[assigningTicket?.ticketType ?? 'it_support']}
            </Typography>
            <TextField select label="Select Technician" value={selectedTechId} onChange={e => setSelectedTechId(e.target.value)} fullWidth>
              {technicians.length === 0
                ? <MenuItem disabled value="">No eligible technicians found</MenuItem>
                : technicians.map(t => (
                  <MenuItem key={t.id} value={String(t.id)}>
                    {t.firstName} {t.lastName} — {t.openCount} active tickets
                  </MenuItem>
                ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAssign} variant="contained" disabled={!selectedTechId}>Assign</Button>
        </DialogActions>
      </Dialog>

      {/* Satisfaction Dialog */}
      <Dialog open={satDialogOpen} onClose={() => setSatDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Rate Your Experience</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              How satisfied are you with the resolution of ticket <strong>{satTicket?.ticketNumber}</strong>?
            </Typography>
            {satTicket?.satisfactionSubmittedAt
              ? <Alert severity="success">You have already rated this ticket. Thank you!</Alert>
              : <>
                  <Rating value={satRating} onChange={(_, v) => setSatRating(v)} size="large" sx={{ fontSize: '3rem' }} />
                  <TextField label="Additional comments (optional)" value={satComment} onChange={e => setSatComment(e.target.value)} multiline rows={3} fullWidth />
                </>
            }
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSatDialogOpen(false)}>Close</Button>
          {!satTicket?.satisfactionSubmittedAt && (
            <Button onClick={handleSubmitSatisfaction} variant="contained" disabled={!satRating}>Submit Rating</Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
