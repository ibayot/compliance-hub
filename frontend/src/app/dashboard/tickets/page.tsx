'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, CircularProgress,
  Rating, Tooltip, Alert, Autocomplete,
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
const STATUS_COLOR: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error' | 'secondary'> = {
  open: 'info', assigned: 'warning', in_progress: 'warning', resolved: 'success', closed: 'default',
  freeze: 'secondary', duplicate: 'default',
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
  return ['super_admin','reviewer','focal','technician','technician_desktop','technician_it_support','technician_it_staff','technician_desktop_staff','auditor'].includes(role ?? '');
}

export default function TicketsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showMyTickets, setShowMyTickets] = useState(false);

  // New ticket dialog
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateTicketDto>({ subject: '', description: '', ticketType: 'it_support', priority: undefined });
  const [submitting, setSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);

  // Assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningTicket, setAssigningTicket] = useState<Ticket | null>(null);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [isEscalateMode, setIsEscalateMode] = useState(false);

  // Satisfaction dialog
  const [satDialogOpen, setSatDialogOpen] = useState(false);
  const [satTicket, setSatTicket] = useState<Ticket | null>(null);
  const [satRating, setSatRating] = useState<number | null>(null);
  const [satComment, setSatComment] = useState('');

  // Pending satisfaction ratings — loaded once for USER role to show warning before new ticket
  const [pendingSatCount, setPendingSatCount] = useState(0);

  const canManageAll = isStaffRole(user?.role) && !(['technician_it_staff', 'technician_desktop_staff'].includes(user?.role ?? ''));
  const isSuperAdmin = user?.role === 'super_admin';
  const isFocalTech = ['technician', 'technician_desktop', 'technician_it_support'].includes(user?.role ?? '');
  const isLowerLevelTech = ['technician_it_staff', 'technician_desktop_staff'].includes(user?.role ?? '');
  const isTechnician = isFocalTech || isLowerLevelTech;
  const isFocal = user?.role === 'focal';
  const isComplianceOfficer = user?.role === 'reviewer' || user?.roleCode === 'compliance_officer';
  const isSectionHead = user?.roleCode === 'section_head';
  // canAssign: focal techs, CO, SH, super_admin can assign/reassign tickets
  const canAssign = isSuperAdmin || isFocal || isFocalTech || isComplianceOfficer || isSectionHead;
  // canEscalate: lower-level techs can escalate their assigned ticket to a focal technician
  const canEscalate = isLowerLevelTech;

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ticketsApi.getAll({
        status: filterStatus as TicketStatus || undefined,
        ticketType: filterType as TicketType || undefined,
        assignedToId: showMyTickets && isFocalTech ? user?.id : undefined,
      });
      setTickets(data);
    } catch {
      enqueueSnackbar('Failed to load tickets', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, showMyTickets, isFocalTech, user?.id]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // For regular users: load pending satisfaction count to warn before new ticket
  useEffect(() => {
    if (!canManageAll) {
      ticketsApi.getDashboardStats().then(stats => {
        setPendingSatCount(stats.pendingSatisfactionTickets?.length ?? 0);
      }).catch(() => {});
    }
  }, [canManageAll]);

  // Silent auto-refresh — no loading spinner to avoid flicker on background polls
  const silentFetchTickets = useCallback(async () => {
    try {
      const data = await ticketsApi.getAll({
        status: filterStatus as TicketStatus || undefined,
        ticketType: filterType as TicketType || undefined,
        assignedToId: showMyTickets && isFocalTech ? user?.id : undefined,
      });
      setTickets(data);
    } catch { /* silent */ }
  }, [filterStatus, filterType, showMyTickets, isFocalTech, user?.id]);
  useAutoRefresh(silentFetchTickets);

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

  // Poll categories every 10s while dialog is open so admin changes (activate/deactivate)
  // are reflected without requiring the user to close and re-open the dialog.
  useEffect(() => {
    if (!newDialogOpen) return;
    const id = setInterval(() => {
      ticketSettingsApi.getCategories(form.ticketType, true)
        .then(setCategories)
        .catch(() => {}); // silent — don't show errors on background polls
    }, 10_000);
    return () => clearInterval(id);
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
      setForm({ subject: '', description: '', ticketType: 'it_support', priority: undefined, categoryId: undefined });
      setPendingSatCount(0);
      fetchTickets();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to submit ticket', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenNewTicket = () => {
    if (!canManageAll && pendingSatCount > 0) {
      enqueueSnackbar(
        `You have ${pendingSatCount} closed ticket${pendingSatCount > 1 ? 's' : ''} with an unfilled satisfaction rating. Please rate them before submitting a new ticket.`,
        { variant: 'warning', autoHideDuration: 6000 }
      );
    }
    setNewDialogOpen(true);
  };

  const openAssignDialog = async (ticket: Ticket, escalate = false) => {
    setIsEscalateMode(escalate);
    setAssigningTicket(ticket);
    setSelectedTechId(String(ticket.assignedToId ?? ''));
    try {
      const techs = await ticketsApi.getTechnicians();
      setTechnicians(techs.filter(t => {
        // For escalation: only show focal-level technicians
        if (escalate) {
          if (ticket.ticketType === 'desktop_support')
            return ['technician_desktop', 'technician', 'desktop_sr'].includes(t.role);
          if (ticket.ticketType === 'pantawid_ict_support')
            return ['technician', 'pantawid_ict'].includes(t.role);
          return ['technician_it_support', 'technician', 'it_support_sr'].includes(t.role);
        }
        // Normal assign: show all relevant technicians for the ticket type.
        // Do NOT pre-filter by openCount — backend enforces the busy guard on submit.
        if (ticket.ticketType === 'desktop_support')
          return ['technician_desktop', 'technician', 'technician_desktop_staff', 'desktop_sr', 'desktop_jr'].includes(t.role);
        if (ticket.ticketType === 'pantawid_ict_support')
          return ['technician', 'pantawid_ict'].includes(t.role);
        return ['technician_it_support', 'technician', 'technician_it_staff', 'it_support_sr', 'it_support_jr'].includes(t.role);
      }));
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
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNewTicket}>
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
                <MenuItem value="freeze">Freeze</MenuItem>
                <MenuItem value="duplicate">Duplicate</MenuItem>
              </TextField>
              <TextField select label="Type" value={filterType} onChange={e => setFilterType(e.target.value)} size="small" sx={{ minWidth: 160 }}>
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="desktop_support">Desktop Support</MenuItem>
                <MenuItem value="it_support">IT Support</MenuItem>
                <MenuItem value="pantawid_ict_support">Pantawid ICT Support</MenuItem>
              </TextField>
              <Button size="small" variant="outlined" onClick={() => { setFilterStatus(''); setFilterType(''); }}>Reset</Button>
              {isTechnician && !isLowerLevelTech && (
                <Button
                  size="small"
                  variant={showMyTickets ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => setShowMyTickets(v => !v)}
                >
                  {showMyTickets ? 'My Tickets ✓' : 'My Tickets'}
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}
      {!canManageAll && isFocalTech && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" spacing={2}>
              <Button
                size="small"
                variant={showMyTickets ? 'contained' : 'outlined'}
                color="primary"
                onClick={() => setShowMyTickets(v => !v)}
              >
                {showMyTickets ? 'My Assigned Tickets ✓' : 'All Tickets'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
      {isLowerLevelTech && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Showing your assigned tickets. Use the Escalate button to forward a ticket to a focal technician.
            </Typography>
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
                <TableCell><Chip size="small" label={(ticket.priority ?? 'not set').toUpperCase()} color={PRIORITY_COLOR[ticket.priority ?? ''] ?? 'default'} /></TableCell>
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
                    {canAssign && ticket.status !== 'duplicate' && (
                      <Tooltip title={ticket.assignedToId ? 'Reassign Ticket' : 'Assign Ticket'}>
                        <IconButton size="small" color="primary" onClick={() => openAssignDialog(ticket, false)}><AssignIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                    {canEscalate && !['duplicate', 'closed', 'resolved'].includes(ticket.status) && (
                      <Tooltip title="Escalate Ticket">
                        <IconButton size="small" color="warning" onClick={() => openAssignDialog(ticket, true)}><AssignIcon fontSize="small" /></IconButton>
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
              <Autocomplete
                options={allUsers.filter(u => u.role === 'user')}
                getOptionLabel={u => `${[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email} (${u.email})`}
                value={allUsers.find(u => u.id === form.requesterId) ?? null}
                onChange={(_, newValue) => setForm({ ...form, requesterId: newValue?.id ?? undefined })}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Requester (Walk-in / Phone call)"
                    helperText="Leave blank — ticket is automatically recorded as your own submission"
                    fullWidth
                  />
                )}
                clearOnEscape
                fullWidth
              />
            )}
            {(canManageAll || isTechnician) && (
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

      {/* Assign / Escalate Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{isEscalateMode ? 'Escalate Ticket' : (assigningTicket?.assignedToId ? 'Reassign Ticket' : 'Assign Ticket')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Ticket: <strong>{assigningTicket?.ticketNumber}</strong> — {TICKET_TYPE_LABELS[assigningTicket?.ticketType ?? 'it_support']}
            </Typography>
            {isEscalateMode && (
              <Typography variant="caption" color="warning.main">
                Only focal technicians are shown. Escalating will re-assign this ticket.
              </Typography>
            )}
            <TextField select label={isEscalateMode ? 'Select Focal Technician' : 'Select Technician'} value={selectedTechId} onChange={e => setSelectedTechId(e.target.value)} fullWidth>
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
          <Button onClick={handleAssign} variant="contained" color={isEscalateMode ? 'warning' : 'primary'} disabled={!selectedTechId}>
            {isEscalateMode ? 'Escalate' : (assigningTicket?.assignedToId ? 'Reassign' : 'Assign')}
          </Button>
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
