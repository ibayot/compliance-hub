'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, CircularProgress,
  Rating, Tooltip, Alert, Autocomplete, ToggleButton, ToggleButtonGroup,
  Checkbox, FormControlLabel, InputAdornment, Tab, Tabs,
} from '@mui/material';
import {
  Add as AddIcon, Visibility as ViewIcon, AssignmentInd as AssignIcon,
  ThumbUp as SatisfactionIcon, Computer as DesktopIcon, Wifi as ITIcon, Assignment as PantawidIcon,
  SentimentVerySatisfied, SentimentSatisfied, SentimentNeutral, SentimentDissatisfied, SentimentVeryDissatisfied,
  FiberManualRecord,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ticketsApi, Ticket, CreateTicketDto, TicketStatus, TicketType, TicketPriority,
  TechnicianOption, TicketCategory, EscalationFocalConfig, ticketSettingsApi, attendanceApi, CsatFormData,
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



function getSlaStatus(ticket: Ticket): 'met' | 'on_track' | 'warning' | 'breached' | null {
  if (!ticket.slaDeadline) return null;
  const deadline = new Date(ticket.slaDeadline).getTime();
  const now = Date.now();
  const isTerminal = ['resolved', 'closed', 'duplicate'].includes(ticket.status);
  if (isTerminal) {
    const resolvedTime = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : now;
    return resolvedTime <= deadline ? 'met' : 'breached';
  }
  if (now > deadline) return 'breached';
  const createdAt = ticket.createdAt ? new Date(ticket.createdAt).getTime() : now;
  const total = deadline - createdAt;
  const remaining = deadline - now;
  return (total > 0 && remaining / total < 0.2) ? 'warning' : 'on_track';
}

const SLA_CHIP: Record<string, { label: string; color: 'success' | 'info' | 'warning' | 'error' }> = {
  met: { label: 'Met', color: 'success' },
  on_track: { label: 'On Track', color: 'info' },
  warning: { label: 'Warning', color: 'warning' },
  breached: { label: 'Breached', color: 'error' },
};

export default function TicketsPage() {
  const router = useRouter();
  const { user, myCap } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showMyTickets, setShowMyTickets] = useState(false);
  const [showEscalatedToMe, setShowEscalatedToMe] = useState(false);
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
  const [escalationStateByTicket, setEscalationStateByTicket] = useState<Record<string, 'none' | 'returned' | 'active'>>({});

  // Satisfaction dialog
  const [satDialogOpen, setSatDialogOpen] = useState(false);
  const [satTicket, setSatTicket] = useState<Ticket | null>(null);
  const [csatForm, setCsatForm] = useState<CsatFormData>({
    consentGiven: false, unitSection: '', dateOfTransaction: '', clientFirstName: '',
    clientMiddleInitial: '', clientLastName: '', suffix: '', religion: '', sex: '',
    contactNumber: '', technicianName: '', likert: [0, 0, 0, 'NA', 0, 'NA', 0, 0, 'NA'],
  });
  const [unitSuggestions, setUnitSuggestions] = useState<string[]>([]);
  const [csatSubmitting, setCsatSubmitting] = useState(false);

  // Pending satisfaction ratings — loaded once for USER role to show warning before new ticket
  const [pendingSatCount, setPendingSatCount] = useState(0);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('Pending Satisfaction Reminder');
  const [reminderMessage, setReminderMessage] = useState('');
  const [isEscalationRoleConfigured, setIsEscalationRoleConfigured] = useState(false);

  // DB-driven role capabilities (is_all_tickets, is_ticket_focal) — loaded from AuthContext
  // (also available: myCap?.isEscalationFocal, myCap?.isTicketSettingsFocal, myCap?.isFocal)

  const isSuperAdmin = user?.role === 'super_admin';
  const isFocalTech = ['desktop_sr', 'it_support_sr', 'pantawid_ict'].includes(user?.role ?? '');
  const isLowerLevelTech = ['desktop_jr', 'it_support_jr'].includes(user?.role ?? '');
  const isJuniorTech = isLowerLevelTech;
  // ITO staff roles: see only their own tickets (restricted view), same as junior techs
  const isItoRole = ['cybersec', 'infosec', 'lead_infra', 'server_admin', 'db_admin',
    'network_admin', 'project_mgr', 'dev_lead', 'sqa_lead', 'records_officer', 'hr_id_officer',
  ].includes(user?.role ?? '');
  const isTechnician = isFocalTech || isLowerLevelTech || isJuniorTech || isItoRole;
  const isFocal = user?.roleCode === 'focal';
  const isComplianceOfficer = user?.roleCode === 'compliance_officer';
  const isSectionHead = user?.roleCode === 'section_head';
  // DB-driven: is_all_tickets column — falls back to super_admin only until capabilities load
  const canManageAll = isSuperAdmin || !!myCap?.isAllTickets;
  // Escalated queue visibility is based on Ticket Settings escalation focal configuration.
  const canViewEscalatedQueue = isSuperAdmin || isEscalationRoleConfigured;
  // DB-driven: is_ticket_focal column — who can manually assign/reassign tickets
  const canAssign = isSuperAdmin || !!myCap?.isTicketFocal;
  // Matrix-driven escalation eligibility:
  // show action for technician tracks plus ticket admin/assign/all-ticket capabilities.
  const canEscalate = isSuperAdmin || !!(
    myCap?.isDesktop ||
    myCap?.isItSupport ||
    myCap?.isPantawidIct ||
    myCap?.isTicketFocal ||
    myCap?.isTicketSettingsFocal ||
    myCap?.isAllTickets
  );

  // Senior technician tab state (isFocalTech && !canManageAll view)
  const [ticketTab, setTicketTab] = useState(0);
  // Management tab state (canManageAll view: CO, SH, super_admin)
  const [mgmtTab, setMgmtTab] = useState(0);
  const activeTickets = tickets.filter(t => ['open', 'assigned', 'in_progress'].includes(t.status));
  const doneTickets = tickets.filter(t => ['resolved', 'closed'].includes(t.status));
  const frozenTickets = tickets.filter(t => t.status === 'freeze');
  const duplicateTickets = tickets.filter(t => t.status === 'duplicate');
  const tabFilteredTickets = canManageAll
    ? ([tickets, activeTickets, doneTickets, frozenTickets, duplicateTickets][mgmtTab] ?? tickets)
    : isTechnician
      ? ([activeTickets, doneTickets, frozenTickets, duplicateTickets][ticketTab] ?? tickets)
      : tickets;

  const refreshEscalationStates = useCallback(async (rows: Ticket[]) => {
    if (!canEscalate) return;
    const candidates = rows
      .filter((t) => !['duplicate', 'closed', 'resolved'].includes(t.status))
      .slice(0, 80);
    if (candidates.length === 0) return;

    const entries = await Promise.all(candidates.map(async (t) => {
      try {
        const escalations = await ticketsApi.getEscalations(t.id);
        const latest = escalations[0];
        const state: 'none' | 'returned' | 'active' = !latest
          ? 'none'
          : latest.status === 'returned'
            ? 'returned'
            : 'active';
        return [t.id, state] as const;
      } catch {
        return [t.id, 'none'] as const;
      }
    }));

    setEscalationStateByTicket((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
  }, [canEscalate]);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ticketsApi.getAll({
        status: filterStatus as TicketStatus || undefined,
        ticketType: filterType as TicketType || undefined,
        assignedToId: showMyTickets && isFocalTech && !showEscalatedToMe ? user?.id : undefined,
        escalatedToMe: showEscalatedToMe && canViewEscalatedQueue,
      });
      setTickets(data);
    } catch {
      enqueueSnackbar('Failed to load tickets', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, showMyTickets, showEscalatedToMe, canViewEscalatedQueue, isFocalTech, user?.id]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  useEffect(() => {
    const rows = canManageAll
      ? ([tickets, activeTickets, doneTickets, frozenTickets, duplicateTickets][mgmtTab] ?? tickets)
      : isTechnician
        ? ([activeTickets, doneTickets, frozenTickets, duplicateTickets][ticketTab] ?? tickets)
        : tickets;
    refreshEscalationStates(rows);
  }, [
    tickets,
    canManageAll,
    isTechnician,
    mgmtTab,
    ticketTab,
    refreshEscalationStates,
  ]);

  // For regular users: load pending satisfaction count to warn before new ticket
  useEffect(() => {
    if (!canManageAll) {
      ticketsApi.getDashboardStats().then(stats => {
        setPendingSatCount(stats.pendingSatisfactionTickets?.length ?? 0);
      }).catch(() => {});
    }
  }, [canManageAll]);

  // Check DB escalation_focal_configs to see if the current user's role is a configured focal
  // NOTE: isEscalationFocal is now read from myCap?.isEscalationFocal (AuthContext)
  // The escalation_focal_configs table is still used only for the assign dialog recipient list.

  // Silent auto-refresh — no loading spinner to avoid flicker on background polls
  const silentFetchTickets = useCallback(async () => {
    try {
      const data = await ticketsApi.getAll({
        status: filterStatus as TicketStatus || undefined,
        ticketType: filterType as TicketType || undefined,
        assignedToId: showMyTickets && isFocalTech && !showEscalatedToMe ? user?.id : undefined,
        escalatedToMe: showEscalatedToMe && canViewEscalatedQueue,
      });
      setTickets(data);
    } catch { /* silent */ }
  }, [filterStatus, filterType, showMyTickets, showEscalatedToMe, canViewEscalatedQueue, isFocalTech, user?.id]);
  useAutoRefresh(silentFetchTickets);

  useEffect(() => {
    if (canManageAll) {
      usersApi.list().then(users => setAllUsers(users.filter(u => u.active))).catch(() => {});
    }
  }, [canManageAll]);

  useEffect(() => {
    if (!user?.role) {
      setIsEscalationRoleConfigured(false);
      return;
    }

    ticketSettingsApi
      .getEscalationFocals()
      .then((rows: EscalationFocalConfig[]) => {
        setIsEscalationRoleConfigured(rows.some((r) => r.roleValue === user.role));
      })
      .catch(() => setIsEscalationRoleConfigured(false));
  }, [user?.role]);

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
    if (!canManageAll) {
      ticketsApi.getDashboardStats().then(stats => {
        const pendingCount = stats.pendingSatisfactionTickets?.length ?? 0;
        const unclosedCount = (stats.open ?? 0) + (stats.inProgress ?? 0) + (stats.resolved ?? 0);
        setPendingSatCount(pendingCount);

        if (pendingCount > 0) {
          setReminderTitle('Pending Satisfaction Reminder');
          setReminderMessage(
            `You still have ${pendingCount} unresolved satisfaction rating${pendingCount > 1 ? 's' : ''}. Please rate your resolved tickets before opening a new request.`,
          );
          setReminderOpen(true);
        }

        if (unclosedCount > 0) {
          setReminderTitle('Open Ticket Restriction');
          setReminderMessage(
            `You currently have ${unclosedCount} unclosed ticket${unclosedCount > 1 ? 's' : ''}. New ticket creation is disabled until your existing ticket is closed.`,
          );
          setReminderOpen(true);
          return;
        }

        setNewDialogOpen(true);
      }).catch(() => {
        setNewDialogOpen(true);
      });
      return;
    }

    setNewDialogOpen(true);
  };

  const openAssignDialog = async (ticket: Ticket, escalate = false) => {
    if (escalate) {
      try {
        const escalations = await ticketsApi.getEscalations(ticket.id);
        const latest = escalations[0];
        if (latest && latest.status !== 'returned') {
          setEscalationStateByTicket((prev) => ({ ...prev, [ticket.id]: 'active' }));
          enqueueSnackbar('This ticket already has an active escalation. You can escalate again only after it is returned.', { variant: 'warning' });
          return;
        }
        setEscalationStateByTicket((prev) => ({ ...prev, [ticket.id]: latest?.status === 'returned' ? 'returned' : 'none' }));
      } catch {
      }
    }

    setIsEscalateMode(escalate);
    setAssigningTicket(ticket);
    setSelectedTechId(escalate ? '' : String(ticket.assignedToId ?? ''));
    try {
      if (escalate) {
        const [focals, itoUsers, supportUsers] = await Promise.all([
          ticketSettingsApi.getEscalationFocals(ticket.ticketType),
          attendanceApi.getTechnicians('ito'),
          attendanceApi.getTechnicians(ticket.ticketType),
        ]);
        const mergedUsers = [...itoUsers, ...supportUsers]
          .filter((u, idx, arr) => arr.findIndex((x) => x.id === u.id) === idx);
        const allowedRoles = new Set(
          focals
            .filter((f) => f.ticketType === ticket.ticketType || f.ticketType === 'all')
            .map((f) => f.roleValue),
        );
        const roleFiltered = mergedUsers.filter(
          (t) => allowedRoles.size === 0 || allowedRoles.has(t.role),
        );
        const availableByAttendance = roleFiltered.filter(
          (t) => !t.isUnavailable && !['absent', 'out_of_office'].includes(t.attendanceStatus ?? ''),
        );
        setTechnicians(availableByAttendance);
      } else {
        const techs = await ticketsApi.getTechnicians();
        const roleFiltered = techs.filter((t) => {
          if (ticket.ticketType === 'desktop_support') {
            return ['technician_desktop', 'technician', 'technician_desktop_staff', 'desktop_sr', 'desktop_jr'].includes(t.role);
          }
          if (ticket.ticketType === 'pantawid_ict_support') {
            return ['technician', 'pantawid_ict'].includes(t.role);
          }
          return ['technician_it_support', 'technician', 'technician_it_staff', 'it_support_sr', 'it_support_jr'].includes(t.role);
        });
        const availableByAttendance = roleFiltered.filter(
          (t) => !t.isUnavailable && !['absent', 'out_of_office'].includes(t.attendanceStatus ?? ''),
        );
        // For normal assign: only show techs with no open tickets (same as ticket detail view)
        setTechnicians(availableByAttendance.filter((t) => t.openCount === 0));
      }
    } catch { setTechnicians([]); }
    setAssignDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!assigningTicket || !selectedTechId) return;
    try {
      if (isEscalateMode) {
        const formData = new FormData();
        formData.append('escalatedToId', String(Number(selectedTechId)));
        await ticketsApi.escalateTicket(assigningTicket.id, formData);
        enqueueSnackbar('Ticket escalated.', { variant: 'success' });
        setEscalationStateByTicket((prev) => ({ ...prev, [assigningTicket.id]: 'active' }));
      } else {
        await ticketsApi.assign(assigningTicket.id, Number(selectedTechId));
        enqueueSnackbar('Ticket assigned.', { variant: 'success' });
      }
      setAssignDialogOpen(false);
      fetchTickets();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || (isEscalateMode ? 'Failed to escalate' : 'Failed to assign'), { variant: 'error' });
    }
  };

  const openSatDialog = (ticket: Ticket) => {
    setSatTicket(ticket);
    const assignedName = ticket.assignedTo
      ? `${ticket.assignedTo.firstName ?? ''} ${ticket.assignedTo.lastName ?? ''}`.trim() || ticket.assignedTo.email
      : '';
    setCsatForm({
      consentGiven: false,
      unitSection: '',
      dateOfTransaction: ticket.resolvedAt
        ? new Date(ticket.resolvedAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      clientFirstName: '', clientMiddleInitial: '', clientLastName: '',
      suffix: '', religion: '', sex: '', contactNumber: '',
      technicianName: assignedName,
      likert: [0, 0, 0, 'NA', 0, 'NA', 0, 0, 'NA'],
    });
    ticketsApi.getUnitSuggestions().then(setUnitSuggestions).catch(() => {});
    setSatDialogOpen(true);
  };

  const handleSubmitSatisfaction = async () => {
    if (!satTicket) return;
    if (!csatForm.consentGiven) { enqueueSnackbar('Please provide consent before submitting.', { variant: 'warning' }); return; }
    if (!csatForm.unitSection.trim()) { enqueueSnackbar('Unit/Section is required.', { variant: 'warning' }); return; }
    if (!csatForm.clientFirstName.trim() || !csatForm.clientLastName.trim()) { enqueueSnackbar('Client name is required.', { variant: 'warning' }); return; }
    if (!csatForm.religion.trim()) { enqueueSnackbar('Religion is required.', { variant: 'warning' }); return; }
    if (!csatForm.age) { enqueueSnackbar('Age is required.', { variant: 'warning' }); return; }
    if (!csatForm.sex) { enqueueSnackbar('Sex is required.', { variant: 'warning' }); return; }
    const ratedItems = csatForm.likert.filter((_, i) => ![3, 5, 8].includes(i));
    if (ratedItems.some(v => v === 0)) { enqueueSnackbar('Please rate all applicable items.', { variant: 'warning' }); return; }
    try {
      setCsatSubmitting(true);
      await ticketsApi.submitSatisfaction(satTicket.id, { formData: csatForm });
      enqueueSnackbar('Thank you for your feedback!', { variant: 'success' });
      setSatDialogOpen(false);
      fetchTickets();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to submit', { variant: 'error' });
    } finally {
      setCsatSubmitting(false);
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
              {canViewEscalatedQueue && (
                <Button
                  size="small"
                  variant={showEscalatedToMe ? 'contained' : 'outlined'}
                  color="warning"
                  onClick={() => {
                    setShowEscalatedToMe(v => !v);
                    setShowMyTickets(false);
                  }}
                >
                  {showEscalatedToMe ? 'Escalated To Me ✓' : 'Escalated To Me'}
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
              {canViewEscalatedQueue && (
                <Button
                  size="small"
                  variant={showEscalatedToMe ? 'contained' : 'outlined'}
                  color="warning"
                  onClick={() => {
                    setShowEscalatedToMe(v => !v);
                    setShowMyTickets(false);
                  }}
                >
                  {showEscalatedToMe ? 'Escalated To Me ✓' : 'Escalated To Me'}
                </Button>
              )}
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
      {canManageAll && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ pb: '0 !important' }}>
            <Tabs value={mgmtTab} onChange={(_, v) => setMgmtTab(v)} variant="scrollable" scrollButtons="auto">
              <Tab label={`All (${tickets.length})`} />
              <Tab label={`Active (${activeTickets.length})`} />
              <Tab label={`Resolved / Closed (${doneTickets.length})`} />
              <Tab label={`Frozen (${frozenTickets.length})`} />
              <Tab label={`Duplicate (${duplicateTickets.length})`} />
            </Tabs>
          </CardContent>
        </Card>
      )}
      {isTechnician && !canManageAll && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ pb: '0 !important' }}>
            <Tabs value={ticketTab} onChange={(_, v) => setTicketTab(v)} variant="scrollable" scrollButtons="auto">
              <Tab label={`Active (${activeTickets.length})`} />
              <Tab label={`Resolved / Closed (${doneTickets.length})`} />
              <Tab label={`Frozen (${frozenTickets.length})`} />
              <Tab label={`Duplicate (${duplicateTickets.length})`} />
            </Tabs>
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
              <TableCell>SLA</TableCell>
              {canManageAll && <TableCell>Requester</TableCell>}
              {canManageAll && <TableCell>Assigned To</TableCell>}
              <TableCell>Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={11} align="center"><CircularProgress size={28} /></TableCell></TableRow>
            ) : tabFilteredTickets.length === 0 ? (
              <TableRow><TableCell colSpan={11} align="center">
                <Typography color="text.secondary" py={3}>No tickets found in this category.</Typography>
              </TableCell></TableRow>
            ) : tabFilteredTickets.map(ticket => {
              const hasPendingSatisfaction =
                (ticket.status === 'resolved' || ticket.status === 'closed') &&
                ticket.requesterId === user?.id &&
                !ticket.satisfactionSubmittedAt;

              return (
              <TableRow
                key={ticket.id}
                hover
                sx={hasPendingSatisfaction ? { backgroundColor: 'warning.50', '&:hover': { backgroundColor: 'warning.100' } } : undefined}
              >
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
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={ticket.status.replace('_', ' ')} color={STATUS_COLOR[ticket.status]} />
                    {hasPendingSatisfaction && (
                      <Chip size="small" label="Unrated" color="warning" variant="filled" />
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  {(() => { const s = getSlaStatus(ticket); return s ? <Chip size="small" label={SLA_CHIP[s].label} color={SLA_CHIP[s].color} /> : <Typography variant="body2" color="text.disabled">—</Typography>; })()}
                </TableCell>
                {canManageAll && (
                  <TableCell>{ticket.requester ? `${ticket.requester.firstName ?? ''} ${ticket.requester.lastName ?? ''}`.trim() || ticket.requester.email : '—'}</TableCell>
                )}
                {canManageAll && (
                  <TableCell>
                    {ticket.assignedTo ? (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <span>{`${ticket.assignedTo.firstName ?? ''} ${ticket.assignedTo.lastName ?? ''}`.trim() || ticket.assignedTo.email}</span>
                        {ticket.assignedTechAbsent && (isSuperAdmin || isComplianceOfficer || isSectionHead) && (
                          <Tooltip title="Technician is absent today">
                            <FiberManualRecord sx={{ color: 'error.main', fontSize: 10 }} />
                          </Tooltip>
                        )}
                      </Box>
                    ) : (
                      <Typography color="text.disabled" variant="body2">Unassigned</Typography>
                    )}
                  </TableCell>
                )}
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}><ViewIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    {canAssign && ticket.status !== 'duplicate' && (
                      <Tooltip title={['resolved', 'closed'].includes(ticket.status) ? 'Reassign disabled for resolved/closed tickets' : (ticket.assignedToId ? 'Reassign Ticket' : 'Assign Ticket')}>
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openAssignDialog(ticket, false)}
                            disabled={['resolved', 'closed'].includes(ticket.status)}
                          >
                            <AssignIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {canEscalate && escalationStateByTicket[ticket.id] !== 'active' && !['duplicate', 'closed', 'resolved'].includes(ticket.status) && (
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
            )})}
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
              Tickets are auto-assigned to available technicians. Email notifications are currently paused.
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

      <Dialog open={reminderOpen} onClose={() => setReminderOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{reminderTitle}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            {reminderMessage}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReminderOpen(false)}>Close</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => {
              setReminderOpen(false);
              router.push('/dashboard/tickets?filter=pending_satisfaction');
            }}
          >
            Go To Tickets
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
                    {t.firstName} {t.lastName}
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

      {/* Satisfaction Dialog — CLIENT SATISFACTION MEASUREMENT FORM */}
      <Dialog open={satDialogOpen} onClose={() => setSatDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 0 }}>
          CLIENT SATISFACTION MEASUREMENT FORM
          <Typography variant="body2" color="text.secondary" fontWeight={400} mt={0.5}>
            Ticket: <strong>{satTicket?.ticketNumber}</strong>
          </Typography>
        </DialogTitle>
        <DialogContent>
          {satTicket?.satisfactionSubmittedAt ? (
            <Alert severity="success" sx={{ mt: 2 }}>You have already submitted a satisfaction rating for this ticket. Thank you!</Alert>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={csatForm.consentGiven}
                    onChange={e => setCsatForm(f => ({ ...f, consentGiven: e.target.checked }))}
                  />
                }
                label={
                  <Typography variant="body2">
                    I voluntarily give my consent for the use of my personal information. I confirm that I have read the provided information, or it has been read to me. I have had the opportunity to ask questions about it, and any inquiries I made were answered to my satisfaction. I understand that any information collected will be utilized solely to enhance the basic social services provided by the DSWD.
                  </Typography>
                }
              />

              <Stack direction="row" spacing={2}>
                <Autocomplete
                  options={unitSuggestions}
                  freeSolo
                  fullWidth
                  value={csatForm.unitSection}
                  onInputChange={(_, v) => setCsatForm(f => ({ ...f, unitSection: v }))}
                  renderInput={params => <TextField {...params} label="Unit/Section *" />}
                />
                <TextField
                  label="Date of Transaction *"
                  type="date"
                  value={csatForm.dateOfTransaction}
                  InputProps={{ readOnly: true }}
                  disabled
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                <TextField label="First Name *" value={csatForm.clientFirstName} onChange={e => setCsatForm(f => ({ ...f, clientFirstName: e.target.value }))} fullWidth />
                <TextField label="M.I." value={csatForm.clientMiddleInitial ?? ''} onChange={e => setCsatForm(f => ({ ...f, clientMiddleInitial: e.target.value }))} inputProps={{ maxLength: 2 }} sx={{ maxWidth: 80 }} />
                <TextField label="Last Name *" value={csatForm.clientLastName} onChange={e => setCsatForm(f => ({ ...f, clientLastName: e.target.value }))} fullWidth />
                <TextField label="Suffix" value={csatForm.suffix ?? ''} onChange={e => setCsatForm(f => ({ ...f, suffix: e.target.value }))} sx={{ maxWidth: 100 }} />
              </Stack>

              <Stack direction="row" spacing={2} flexWrap="wrap">
                <TextField
                  label="Age *"
                  type="number"
                  inputProps={{ min: 1, max: 120 }}
                  value={csatForm.age ?? ''}
                  onChange={e => setCsatForm(f => ({ ...f, age: e.target.value ? Number(e.target.value) : undefined }))}
                  sx={{ maxWidth: 100 }}
                />
                <TextField
                  label="Religion *"
                  value={csatForm.religion}
                  onChange={e => setCsatForm(f => ({ ...f, religion: e.target.value }))}
                  sx={{ flex: 1 }}
                />
                <TextField
                  select label="Sex *"
                  value={csatForm.sex}
                  onChange={e => setCsatForm(f => ({ ...f, sex: e.target.value }))}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                </TextField>
                <TextField
                  label="Contact Number"
                  value={csatForm.contactNumber ?? ''}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setCsatForm(f => ({ ...f, contactNumber: digits }));
                  }}
                  InputProps={{ startAdornment: <InputAdornment position="start">+63</InputAdornment> }}
                  inputProps={{ inputMode: 'numeric' }}
                  sx={{ flex: 1 }}
                />
              </Stack>

              <TextField
                label="Technician Name"
                value={csatForm.technicianName}
                InputProps={{ readOnly: true }}
                disabled
                fullWidth
              />

              <Typography variant="subtitle2" fontWeight={700} mt={1}>
                INSTRUCTION:
              </Typography>
              <Typography variant="body2">
                For Service Quality Dimension 0-8, please select the number that best corresponds to your answer.
              </Typography>
              <Typography variant="caption" color="text.secondary">                5-Strongly Agree, 4-Agree, 3-Neither Agree nor Disagree, 2-Disagree, 1-Strongly Disagree, N/A-Not Applicable
              </Typography>

              {([
                'I am satisfied with the service that I availed.',
                'I spent a reasonable amount of time for my transaction.',
                "The office followed the transaction's requirements and steps based on the information provided",
                'The steps (including payment) I need to do for my transaction were easy and simple.',
                'I easily found information about my transaction from the office or its website.',
                "I paid a reasonable amount of fees for my transaction. (If services was free, mark the 'N/A' column) (You may skip this).",
                'I feel the office was fair to everyone, or "walang palakasan", during my transaction.',
                'I was treated courteously by the staff, and (if asked for help) the staff was helpful.',
                'I got what I needed from the government office, or (if denied) denial of request was sufficiently explained to me.',
              ] as string[]).map((item, idx) => {
                const isNA = [3, 5, 8].includes(idx);
                const val = csatForm.likert[idx];
                return (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                      {idx}. {item}
                    </Typography>
                    {isNA ? (
                      <Chip size="small" label="N/A" color="default" sx={{ minWidth: 64 }} />
                    ) : (
                      <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={val === 0 ? null : val}
                        onChange={(_, v) => {
                          if (v !== null) {
                            const updated = [...csatForm.likert] as Array<number | 'NA'>;
                            updated[idx] = v as number;
                            setCsatForm(f => ({ ...f, likert: updated }));
                          }
                        }}
                      >
                        <ToggleButton value={1} sx={{ px: 0.5, border: 'none', '&.Mui-selected': { bgcolor: 'transparent' } }}>
                          <SentimentVeryDissatisfied sx={{ color: val === 1 ? '#d32f2f' : 'action.disabled', fontSize: 28 }} />
                        </ToggleButton>
                        <ToggleButton value={2} sx={{ px: 0.5, border: 'none', '&.Mui-selected': { bgcolor: 'transparent' } }}>
                          <SentimentDissatisfied sx={{ color: val === 2 ? '#ed6c02' : 'action.disabled', fontSize: 28 }} />
                        </ToggleButton>
                        <ToggleButton value={3} sx={{ px: 0.5, border: 'none', '&.Mui-selected': { bgcolor: 'transparent' } }}>
                          <SentimentNeutral sx={{ color: val === 3 ? '#f5a623' : 'action.disabled', fontSize: 28 }} />
                        </ToggleButton>
                        <ToggleButton value={4} sx={{ px: 0.5, border: 'none', '&.Mui-selected': { bgcolor: 'transparent' } }}>
                          <SentimentSatisfied sx={{ color: val === 4 ? '#2e7d32' : 'action.disabled', fontSize: 28 }} />
                        </ToggleButton>
                        <ToggleButton value={5} sx={{ px: 0.5, border: 'none', '&.Mui-selected': { bgcolor: 'transparent' } }}>
                          <SentimentVerySatisfied sx={{ color: val === 5 ? '#1976d2' : 'action.disabled', fontSize: 28 }} />
                        </ToggleButton>
                      </ToggleButtonGroup>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSatDialogOpen(false)}>Close</Button>
          {!satTicket?.satisfactionSubmittedAt && (
            <Button onClick={handleSubmitSatisfaction} variant="contained" disabled={csatSubmitting || !csatForm.consentGiven}>
              {csatSubmitting ? 'Submitting…' : 'Submit Feedback'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
