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
  ThumbUp as SatisfactionIcon, Computer as DesktopIcon, Wifi as ITIcon, Assignment as PantawidIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ticketsApi, Ticket, CreateTicketDto, TicketStatus, TicketType, TicketPriority,
  TechnicianOption, SubmitSatisfactionDto, TicketCategory, ticketSettingsApi,
} from '@/app/api/references';
import { usersApi, UserRecord } from '@/lib/api/users';
import { useAutoRefresh } from '@/lib/utils/useAutoRefresh';

const PRIORITY_COLOR: Record<string, 'default' | 'info' | 'warning' | 'error' | 'success'> = {
  low: 'info', medium: 'warning', high: 'error', urgent: 'error',
};
const STATUS_COLOR: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  open: 'info', assigned: 'warning', in_progress: 'warning', resolved: 'success', closed: 'default',
};
const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  desktop_support: 'Desktop Support',
  it_support: 'IT Support',
  pantawid_ict_support: 'Pantawid ICT Support',
};

function ticketTypeIcon(t: TicketType) {
  if (t === 'desktop_support') return <DesktopIcon />;
  if (t === 'pantawid_ict_support') return <PantawidIcon />;
  return <ITIcon />;
}

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
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);

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
  const isTechnician = ['technician','technician_desktop','technician_it_support','technician_it_staff','technician_desktop_staff'].includes(user?.role ?? '');

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
  useAutoRefresh(fetchTickets);

  useEffect(() => {
    if (canManageAll) {
      usersApi.list().then(users => setAllUsers(users.filter(u => u.active))).catch(() => {});
    }
  }, [canManageAll]);

  // Fetch categories when the New Ticket dialog opens or support type changes
  // Pass activeOnly=true so only active categories appear in the creation dropdown
  useEffect(() => {
    if (newDialogOpen) {
      ticketSettingsApi.getCategories(form.ticketType, true).then(setCategories).catch(() => setCategories([]));
    }
  }, [newDialogOpen, form.ticketType]);

  const handleSubmitTicket = async () => {
    if (!form.subject.trim() || !form.description.trim()) {
      enqueueSnackbar('Subject and description are required.', { variant: 'warning' }); return;
    }
    try {
      setSubmitting(true);
      await ticketsApi.create(form);
      enqueueSnackbar('Ticket submitted successfully!', { variant: 'success' });
      setNewDialogOpen(false);
      setForm({ subject: '', description: '', ticketType: 'it_support', priority: 'medium', categoryId: undefined });
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
                <MenuItem value="pantawid_ict_support">Pantawid ICT Support</MenuItem>
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
              <TableCell>Category</TableCell>
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
              <TableRow><TableCell colSpan={10} align="center"><CircularProgress size={28} /></TableCell></TableRow>
            ) : tickets.length === 0 ? (
              <TableRow><TableCell colSpan={10} align="center">
                <Typography color="text.secondary" py={3}>No tickets found. Click "New Ticket" to submit your first request.</Typography>
              </TableCell></TableRow>
            ) : tickets.map(ticket => (
              <TableRow key={ticket.id} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{ticket.ticketNumber}</TableCell>
                <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.subject}</TableCell>
                <TableCell>
                  <Chip size="small"
                    icon={ticketTypeIcon(ticket.ticketType)}
                    label={TICKET_TYPE_LABELS[ticket.ticketType]} variant="outlined" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">{ticket.category?.name ?? '—'}</Typography>
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

      {/* New Ticket Dialog — Redesigned with highlighted support type cards + category dropdown */}
      <Dialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Submit a Help Desk Ticket</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">Choose Support Type</Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {([
                { value: 'it_support' as TicketType, label: 'IT Support', icon: '💻', color: '#1976d2', desc: 'Software, network, email, accounts' },
                { value: 'desktop_support' as TicketType, label: 'Desktop Support', icon: '🖥️', color: '#388e3c', desc: 'Hardware, printers, workstations' },
                { value: 'pantawid_ict_support' as TicketType, label: 'Pantawid ICT Support', icon: '📋', color: '#7b1fa2', desc: 'Pantawid Pamilyang Program ICT requests' },
              ]).map(opt => (
                <Card
                  key={opt.value}
                  onClick={() => setForm({ ...form, ticketType: opt.value, categoryId: undefined })}
                  sx={{
                    flex: 1, cursor: 'pointer', textAlign: 'center', py: 2, px: 1,
                    border: form.ticketType === opt.value ? `2.5px solid ${opt.color}` : '2px solid transparent',
                    bgcolor: form.ticketType === opt.value ? `${opt.color}10` : 'background.paper',
                    boxShadow: form.ticketType === opt.value ? 4 : 1,
                    transition: 'all 0.2s',
                    '&:hover': { boxShadow: 3, borderColor: opt.color },
                  }}
                >
                  <Typography variant="h5" sx={{ mb: 0.5 }}>{opt.icon}</Typography>
                  <Typography variant="subtitle1" fontWeight={700}>{opt.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                </Card>
              ))}
            </Stack>

            {categories.length > 0 && (
              <TextField
                select label="Category" value={form.categoryId ?? ''} fullWidth
                onChange={e => setForm({ ...form, categoryId: e.target.value || undefined })}
                helperText="Select a specific category for faster routing"
              >
                <MenuItem value="">— No specific category —</MenuItem>
                {categories.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </TextField>
            )}

            <TextField label="Subject *" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} fullWidth placeholder="Brief description of your issue" />
            <TextField label="Description *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={4} placeholder="Provide details: what happened, when, steps tried..." />
            {canManageAll && (
              <TextField select label="Requester (Walk-in / Phone call)" value={form.requesterId ?? ''} onChange={e => setForm({ ...form, requesterId: e.target.value ? Number(e.target.value) : undefined })} fullWidth helperText="Leave blank to record as your own submission">
                <MenuItem value="">— Self (logged-in user) —</MenuItem>
                {allUsers.filter(u => u.role === 'user').map(u => (
                  <MenuItem key={u.id} value={u.id}>
                    {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email} ({u.email})
                  </MenuItem>
                ))}
              </TextField>
            )}
            {canManageAll && (
              <TextField select label="Priority" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as TicketPriority })} fullWidth>
                <MenuItem value="low">Low — Not urgent</MenuItem>
                <MenuItem value="medium">Medium — Normal impact</MenuItem>
                <MenuItem value="high">High — Significant impact</MenuItem>
                <MenuItem value="urgent">Urgent — Critical / blocking work</MenuItem>
              </TextField>
            )}

            <Alert severity="info" sx={{ fontSize: '0.82rem' }}>
              Tickets are auto-assigned to available technicians. You&apos;ll receive an email confirmation with your ticket details.
            </Alert>
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
