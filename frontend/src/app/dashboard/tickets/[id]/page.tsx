'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  MenuItem,
  Grid,
  FormControlLabel,
  Switch,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Checkbox,
  Autocomplete,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/contexts/AuthContext';
import {
  ticketsApi,
  ticketSettingsApi,
  attendanceApi,
  Ticket,
  TechnicianOption,
  UpdateTicketDto,
  TicketEvent,
  CsatFormData,
  TicketEscalation,
  EscalationFocalConfig,
} from '@/app/api/references';
import { ArrowBack as BackIcon, Star as StarIcon, CloudUpload as UploadIcon, SentimentVerySatisfied, SentimentSatisfied, SentimentNeutral, SentimentDissatisfied, SentimentVeryDissatisfied, NavigateBefore, NavigateNext } from '@mui/icons-material';
import { apiClient } from '@/lib/api/client';

const STATUS_OPTS = [
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'freeze', label: 'Freeze (on hold)' },
  { value: 'duplicate', label: 'Duplicate' },
];

const PRIORITY_COLOR: Record<string, 'error' | 'warning' | 'info' | 'success' | 'default'> = {
  urgent: 'error',
  high: 'error',
  medium: 'warning',
  low: 'info',
};

const STATUS_COLOR: Record<string, 'error' | 'warning' | 'info' | 'success' | 'default' | 'secondary'> = {
  open: 'warning',
  assigned: 'info',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'default',
  freeze: 'secondary',
  duplicate: 'default',
};

const TYPE_LABELS: Record<string, string> = {
  desktop_support: 'Desktop Support',
  it_support: 'IT Support',
  pantawid_ict_support: 'Pantawid ICT Support',
};

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const ticketId = params.id as string;
  const { enqueueSnackbar } = useSnackbar();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);

  // Guard: auto-view mark fires only once per ticket load
  const viewedRef = useRef(false);

  // Comment form
  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Status/resolution update (staff)
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignToId, setAssignToId] = useState<number | ''>('');
  const [isEscalateMode, setIsEscalateMode] = useState(false);

  // Dedicated Escalate dialog
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [escalateToId, setEscalateToId] = useState<number | ''>('');
  const [escalateNotes, setEscalateNotes] = useState('');
  const [escalateFiles, setEscalateFiles] = useState<File[]>([]);
  const [escalating, setEscalating] = useState(false);
  const [escalationFocals, setEscalationFocals] = useState<EscalationFocalConfig[]>([]);
  const [escalationFocalUsers, setEscalationFocalUsers] = useState<TechnicianOption[]>([]);
  const [escalations, setEscalations] = useState<TicketEscalation[]>([]);
  const [escalationsLoading, setEscalationsLoading] = useState(false);

  // Return escalation dialog
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnEscalationId, setReturnEscalationId] = useState('');
  const [returnReason, setReturnReason] = useState('');

  // Proof photo blob URLs (authenticated loading) and lightbox modal
  const [proofBlobUrls, setProofBlobUrls] = useState<Record<string, string>>({});
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoModalSrcs, setPhotoModalSrcs] = useState<string[]>([]);
  const [photoModalIdx, setPhotoModalIdx] = useState(0);

  // Satisfaction dialog
  const [satDialogOpen, setSatDialogOpen] = useState(false);
  const [csatForm, setCsatForm] = useState<CsatFormData>({
    consentGiven: false, unitSection: '', dateOfTransaction: '', clientFirstName: '',
    clientMiddleInitial: '', clientLastName: '', suffix: '', religion: '', sex: '',
    contactNumber: '', technicianName: '', likert: [0, 0, 0, 'NA', 0, 'NA', 0, 0, 'NA'],
  });
  const [unitSuggestions, setUnitSuggestions] = useState<string[]>([]);
  const [csatSubmitting, setCsatSubmitting] = useState(false);

  // Priority update
  const [newPriority, setNewPriority] = useState('');

  // Timeline events
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Duplicate picker + confirmation
  const [dupConfirmOpen, setDupConfirmOpen] = useState(false);
  const [dupDialogOpen, setDupDialogOpen] = useState(false);
  const [requesterOpenTickets, setRequesterOpenTickets] = useState<Ticket[]>([]);
  const [selectedDupOfId, setSelectedDupOfId] = useState('');

  const isRegularUser = user?.role === 'user';
  const isFocalTech = ['technician_desktop', 'technician_it_support', 'technician', 'desktop_sr', 'it_support_sr'].includes(user?.role ?? '');
  const isLowerLevelTech = ['technician_it_staff', 'technician_desktop_staff'].includes(user?.role ?? '');
  const isJuniorTech = ['it_support_jr', 'desktop_jr'].includes(user?.role ?? '');
  const isTechnician = isFocalTech || isLowerLevelTech || isJuniorTech;
  const isFocal = user?.role === 'focal';
  const isAdmin = user?.role === 'super_admin' || isFocal || user?.role === 'reviewer';
  const canStaff = isAdmin || isTechnician;
  const canPriority = canStaff;
  const isComplianceOfficer = user?.role === 'reviewer' || user?.roleCode === 'compliance_officer';
  const isSectionHead = user?.roleCode === 'section_head';
  // canReassign: focal techs (incl. desktop_sr/it_support_sr), CO, SH, super_admin can assign / reassign
  const canReassign = user?.role === 'super_admin' || user?.role === 'focal' || isFocalTech || isComplianceOfficer || isSectionHead;
  // canEscalate: any technician role can escalate
  const canEscalate = isLowerLevelTech || isFocalTech || isJuniorTech;
  const isRequester = ticket?.requesterId === (user as any)?.id;
  const canSatisfaction = isRequester && (ticket?.status === 'resolved' || ticket?.status === 'closed') && !ticket?.satisfactionSubmittedAt;
  // Duplicate is terminal — no further modifications allowed
  const isDuplicate = ticket?.status === 'duplicate';
  const sortedComments = useMemo(() => {
    const comments = [ ...(((ticket as any)?.comments ?? []) as any[]) ];
    return comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [ticket]);
  const timelineEvents = useMemo(() => {
    const eventPriority = (eventType: string) => {
      if (eventType === 'created') return 0;
      if (eventType === 'auto_assigned') return 1;
      return 2;
    };

    return [...events]
      .filter((ev) => ev.eventType !== 'comment_added')
      .sort((a, b) => {
        const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (timeDiff !== 0) return timeDiff;
        return eventPriority(a.eventType) - eventPriority(b.eventType);
      });
  }, [events]);

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  const fetchEvents = async () => {
    try {
      setEventsLoading(true);
      const data = await ticketsApi.getEvents(ticketId);
      setEvents(data);
    } catch { /* silent */ }
    finally { setEventsLoading(false); }
  };

  const fetchEscalations = async () => {
    if (!ticketId) return;
    try {
      setEscalationsLoading(true);
      const data = await ticketsApi.getEscalations(ticketId);
      setEscalations(data);
    } catch { /* silent */ }
    finally { setEscalationsLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, [ticketId]);
  useEffect(() => { fetchEscalations(); }, [ticketId]);

  // Load proof photos as authenticated blob URLs
  useEffect(() => {
    if (!escalations.length) return;
    const urlMap: Record<string, string> = {};
    const loaders: Promise<void>[] = [];
    escalations.forEach(e => {
      (e.proofFiles ?? []).forEach(filePath => {
        const parts = filePath.replace('escalation-proofs/', '').split('/');
        const tid = parts[0] ?? ticketId;
        const fname = encodeURIComponent(parts[1] ?? filePath);
        const apiUrl = `/api/tickets/proof/${tid}/${fname}`;
        loaders.push(
          apiClient.get(apiUrl, { responseType: 'blob' })
            .then(r => { urlMap[apiUrl] = URL.createObjectURL(r.data); })
            .catch(() => { urlMap[apiUrl] = 'error'; })
        );
      });
    });
    Promise.all(loaders).then(() => setProofBlobUrls(prev => {
      Object.values(prev).forEach(u => URL.revokeObjectURL(u));
      return { ...urlMap };
    }));
    return () => { Object.values(urlMap).forEach(u => URL.revokeObjectURL(u)); };
  }, [escalations, ticketId]);

  // Live updates – poll every 30 s for all users (QA #7: ensures user-side sees status changes)
  useEffect(() => {
    const id = setInterval(() => {
      ticketsApi.getById(ticketId).then(data => {
        setTicket(data);
      }).catch(() => {});
      ticketsApi.getEvents(ticketId).then(data => {
        setEvents(data);
      }).catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, [ticketId]);

  useEffect(() => {
    if (canStaff) fetchTechnicians();
  }, [canStaff]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const data = await ticketsApi.getById(ticketId);
      setTicket(data);
      setNewStatus(data.status);
      setResolutionNotes(data.resolutionNotes || '');

      // Auto-transition assigned → in_progress when the assigned technician opens the detail view
      if (
        !viewedRef.current &&
        data.status === 'assigned' &&
        data.assignedToId === (user as any)?.id &&
        isTechnician
      ) {
        viewedRef.current = true;
        ticketsApi.markViewed(ticketId).then(updated => {
          if (updated) setTicket(updated);
        }).catch(() => {});
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to fetch ticket', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const data = await ticketsApi.getTechnicians();
      setTechnicians(data || []);
    } catch { /* restricted */ }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    try {
      setSubmittingComment(true);
      await ticketsApi.addComment(ticketId, comment, isInternal && canStaff);
      setComment('');
      setIsInternal(false);
      fetchTicket();
      fetchEvents();
      enqueueSnackbar('Comment added.', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to add comment', { variant: 'error' });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUpdateStatus = async (overrideDupOfId?: string) => {
    // Step 1: If marking as duplicate, show a confirmation dialog first
    if (newStatus === 'duplicate' && !overrideDupOfId) {
      setDupConfirmOpen(true);
      return;
    }
    try {
      const payload: UpdateTicketDto = { status: newStatus as Ticket['status'] };
      if (resolutionNotes) payload.resolutionNotes = resolutionNotes;
      if (newPriority && newPriority !== ticket?.priority) payload.priority = newPriority as any;
      if (overrideDupOfId) payload.duplicateOfId = overrideDupOfId;
      await ticketsApi.update(ticketId, payload);
      setEditingStatus(false);
      setDupDialogOpen(false);
      setDupConfirmOpen(false);
      setNewPriority('');
      fetchTicket();
      fetchEvents();
      enqueueSnackbar('Ticket updated.', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update ticket', { variant: 'error' });
    }
  };

  const handleConfirmDuplicate = async () => {
    // Step 2: After confirmation, load the requester's open tickets for the picker
    try {
      const open = await ticketsApi.getOpenTicketsForRequester((ticket as any).requesterId);
      setRequesterOpenTickets(open.filter((t) => t.id !== ticketId));
    } catch {
      setRequesterOpenTickets([]);
    }
    setSelectedDupOfId('');
    setDupConfirmOpen(false);
    setDupDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!assignToId) return;
    try {
      await ticketsApi.assign(ticketId, Number(assignToId));
      setAssignDialogOpen(false);
      fetchTicket();
      fetchEvents();
      enqueueSnackbar('Ticket assigned.', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to assign ticket', { variant: 'error' });
    }
  };

  const handleEscalate = async () => {
    if (!escalateToId) return;
    try {
      setEscalating(true);
      const formData = new FormData();
      formData.append('escalatedToId', String(escalateToId));
      if (escalateNotes) formData.append('notes', escalateNotes);
      escalateFiles.forEach(f => formData.append('proofFiles', f));
      await ticketsApi.escalateTicket(ticketId, formData);
      setEscalateDialogOpen(false);
      setEscalateToId('');
      setEscalateNotes('');
      setEscalateFiles([]);
      fetchTicket();
      fetchEvents();
      fetchEscalations();
      enqueueSnackbar('Ticket escalated successfully.', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to escalate ticket', { variant: 'error' });
    } finally {
      setEscalating(false);
    }
  };

  const handleAcceptEscalation = async (escalationId: string) => {
    try {
      await ticketsApi.acceptEscalation(ticketId, escalationId);
      fetchEscalations();
      enqueueSnackbar('Escalation accepted.', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to accept escalation', { variant: 'error' });
    }
  };

  const handleReturnEscalation = async () => {
    if (!returnReason.trim()) return;
    try {
      await ticketsApi.returnEscalation(ticketId, returnEscalationId, returnReason);
      setReturnDialogOpen(false);
      setReturnReason('');
      fetchTicket();
      fetchEvents();
      fetchEscalations();
      enqueueSnackbar('Ticket returned to escalating technician.', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to return escalation', { variant: 'error' });
    }
  };

  const openEscalateDialog = async () => {
    try {
      const [focals, itoUsers, supportUsers] = await Promise.all([
        ticketSettingsApi.getEscalationFocals(ticket?.ticketType),
        attendanceApi.getTechnicians('ito'),
        attendanceApi.getTechnicians(ticket?.ticketType),
      ]);
      setEscalationFocals(focals);
      const mergedUsers = [...itoUsers, ...supportUsers]
        .filter((u, idx, arr) => arr.findIndex((x) => x.id === u.id) === idx);
      // From all techs, keep only those whose role matches the configured escalation focal roles
      const allowedRoles = new Set(focals.map(f => f.roleValue));
      setEscalationFocalUsers(mergedUsers.filter(t => allowedRoles.has(t.role) || allowedRoles.size === 0));
    } catch {
      setEscalationFocalUsers([]);
    }
    setEscalateToId('');
    setEscalateNotes('');
    setEscalateFiles([]);
    setEscalateDialogOpen(true);
  };

  const handleSelfClose = async () => {
    try {
      await ticketsApi.update(ticketId, { status: 'closed' as any });
      fetchTicket();
      enqueueSnackbar('Ticket closed successfully.', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to close ticket', { variant: 'error' });
    }
  };

  const handleSubmitSatisfaction = async () => {
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
      await ticketsApi.submitSatisfaction(ticketId, { formData: csatForm });
      setSatDialogOpen(false);
      fetchTicket();
      enqueueSnackbar('Thank you for your feedback!', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to submit satisfaction', { variant: 'error' });
    } finally {
      setCsatSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box>
        <Typography color="error">Ticket not found</Typography>
        <Button startIcon={<BackIcon />} onClick={() => router.push('/dashboard/tickets')} sx={{ mt: 2 }}>
          Back to Tickets
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<BackIcon />} onClick={() => router.push('/dashboard/tickets')} sx={{ mb: 2 }}>
        Back to Tickets
      </Button>

      {/* ── Ticket Header ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
            <Box flexGrow={1}>
              <Typography variant="overline" color="text.secondary">
                {ticket.ticketNumber}
              </Typography>
              <Typography variant="h5" gutterBottom>
                {ticket.subject}
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                <Chip
                  label={TYPE_LABELS[ticket.ticketType] ?? ticket.ticketType}
                  color="primary"
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={ticket.priority ? `Priority: ${ticket.priority.toUpperCase()}` : 'Priority: Not Set'}
                  color={ticket.priority ? (PRIORITY_COLOR[ticket.priority] ?? 'default') : 'default'}
                  size="small"
                />
                <Chip
                  label={ticket.status.replace('_', ' ').toUpperCase()}
                  color={STATUS_COLOR[ticket.status] ?? 'default'}
                  size="small"
                />
              </Box>
            </Box>

            {/* Actions */}
            <Box display="flex" flexDirection="column" gap={1} minWidth={160}>
              {canStaff && !editingStatus && !isDuplicate && !(
                ['resolved', 'closed'].includes(ticket.status) &&
                (isTechnician || isSectionHead || isComplianceOfficer || user?.role === 'super_admin')
              ) && (
                <Button variant="outlined" size="small" onClick={() => setEditingStatus(true)}>
                  Update Status
                </Button>
              )}
              {isDuplicate && (
                <Chip label="Duplicate (Terminal)" color="default" size="small" />
              )}
              {canReassign && !isDuplicate && !['resolved', 'closed'].includes(ticket.status) && (
                <Button variant="outlined" size="small" onClick={async () => {
                  setIsEscalateMode(false);
                  setAssignToId(ticket.assignedToId || '');
                  await fetchTechnicians();
                  setAssignDialogOpen(true);
                }}>
                  {ticket.assignedToId ? 'Reassign Ticket' : 'Assign Technician'}
                </Button>
              )}
              {canEscalate && !isDuplicate && !['closed', 'resolved'].includes(ticket.status) && (
                <Button variant="outlined" size="small" color="warning" onClick={openEscalateDialog}>
                  Escalate Ticket
                </Button>
              )}
              {/* Self-close: requester can close their own ticket once it is Resolved */}
              {isRegularUser && isRequester && ticket.status === 'resolved' && (
                <Button variant="outlined" size="small" color="error" onClick={handleSelfClose}>
                  Close Ticket
                </Button>
              )}
              {canSatisfaction && (
                <Button
                  variant="contained"
                  size="small"
                  color="warning"
                  startIcon={<StarIcon />}
                  onClick={() => {
                    const assignedName = ticket.assignedTo
                      ? `${ticket.assignedTo.firstName ?? ''} ${ticket.assignedTo.lastName ?? ''}`.trim() || ticket.assignedTo.email
                      : '';
                    setCsatForm({
                      consentGiven: false, unitSection: '', clientFirstName: '',
                      clientMiddleInitial: '', clientLastName: '', suffix: '', religion: '', sex: '',
                      contactNumber: '', technicianName: assignedName,
                      dateOfTransaction: ticket.resolvedAt
                        ? new Date(ticket.resolvedAt).toISOString().split('T')[0]
                        : new Date().toISOString().split('T')[0],
                      likert: [0, 0, 0, 'NA', 0, 'NA', 0, 0, 'NA'],
                    });
                    ticketsApi.getUnitSuggestions().then(setUnitSuggestions).catch(() => {});
                    setSatDialogOpen(true);
                  }}
                >
                  Rate Resolution
                </Button>
              )}
            </Box>
          </Box>

          {/* Inline status editor */}
          {editingStatus && canStaff && (
            <Box mt={3} p={2} bgcolor="action.hover" borderRadius={1}>
              <Typography variant="subtitle2" gutterBottom>Update Ticket</Typography>
              {(() => {
                // QA #3/#4/#6: Compute allowed next statuses based on current status and actor role
                const isSeniorAuthority = [
                  'super_admin', 'focal', 'reviewer', 'section_head', 'compliance_officer',
                  'technician_it_support', 'technician_desktop', 'it_support_sr', 'desktop_sr',
                ].includes(user?.role ?? '');
                let allowedValues: string[] = [];
                switch (ticket?.status) {
                  case 'open':       allowedValues = ['freeze', 'duplicate']; break;
                  case 'assigned':   allowedValues = isSeniorAuthority
                    ? ['in_progress', 'freeze', 'duplicate', 'open']
                    : ['in_progress', 'freeze', 'duplicate']; break;
                  case 'in_progress': allowedValues = ['resolved']; break;
                  case 'resolved':   allowedValues = ['closed']; break;
                  case 'freeze':     allowedValues = ['open', 'assigned', 'in_progress', 'resolved']; break;
                  default:           allowedValues = [];
                }
                const allowedOpts = STATUS_OPTS.filter(s => allowedValues.includes(s.value));
                // QA #5: Disable Save when transitioning to in_progress without a priority
                const effectivePriority = newPriority || ticket?.priority;
                const needsPriority = newStatus === 'in_progress' && !effectivePriority;
                return (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        fullWidth
                        label="Status"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        size="small"
                      >
                        {allowedOpts.map((s) => (
                          <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    {canStaff && (
                      <Grid item xs={12} sm={6}>
                        <TextField
                          select
                          fullWidth
                          label={newStatus === 'in_progress' ? 'Priority *' : 'Priority'}
                          value={newPriority || ticket?.priority || ''}
                          onChange={(e) => setNewPriority(e.target.value)}
                          size="small"
                          required={newStatus === 'in_progress'}
                          error={needsPriority}
                          helperText={needsPriority ? 'Priority is required before moving to In Progress' : undefined}
                        >
                          {['low', 'medium', 'high', 'urgent'].map((p) => (
                            <MenuItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Resolution Notes (optional)"
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Box display="flex" gap={1}>
                        <Button variant="contained" size="small" onClick={() => handleUpdateStatus()} disabled={needsPriority}>Save</Button>
                        <Button size="small" onClick={() => setEditingStatus(false)}>Cancel</Button>
                      </Box>
                    </Grid>
                  </Grid>
                );
              })()}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── Ticket Details ── */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Description</Typography>
              <Typography variant="body2" whiteSpace="pre-wrap">{ticket.description}</Typography>

              {ticket.resolutionNotes && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Resolution Notes</Typography>
                  <Typography variant="body2" whiteSpace="pre-wrap">{ticket.resolutionNotes}</Typography>
                </>
              )}

              {ticket.satisfactionRating && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Client Satisfaction</Typography>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <StarIcon key={i} sx={{ fontSize: 20, color: i < (ticket.satisfactionRating ?? 0) ? 'warning.main' : 'action.disabled' }} />
                    ))}
                    <Typography variant="body2" color="text.secondary" ml={0.5}>
                      {ticket.satisfactionRating}/5
                    </Typography>
                  </Box>
                  {ticket.satisfactionComment && (
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                      "{ticket.satisfactionComment}"
                    </Typography>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Details</Typography>
              <Box display="flex" flexDirection="column" gap={1.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Ticket Number</Typography>
                  <Typography variant="body2">{ticket.ticketNumber}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Requested By</Typography>
                  <Typography variant="body2">
                    {(ticket as any).requester
                      ? `${(ticket as any).requester.firstName} ${(ticket as any).requester.lastName}`
                      : `User #${ticket.requesterId}`}
                  </Typography>
                </Box>
                {ticket.assignedToId && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Assigned To</Typography>
                    <Typography variant="body2">
                      {(ticket as any).assignedTo
                        ? `${(ticket as any).assignedTo.firstName} ${(ticket as any).assignedTo.lastName}`
                        : `User #${ticket.assignedToId}`}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary">Created</Typography>
                  <Typography variant="body2">{new Date(ticket.createdAt).toLocaleString()}</Typography>
                </Box>
                {ticket.resolvedAt && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Resolved</Typography>
                    <Typography variant="body2">{new Date(ticket.resolvedAt).toLocaleString()}</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Escalation Details ── (always shown; placed before comments for at-a-glance access) */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Escalation Details {escalations.length > 0 ? `(${escalations.length})` : ''}
          </Typography>
          {escalationsLoading ? (
            <Box textAlign="center" py={2}><CircularProgress size={24} /></Box>
          ) : escalations.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No escalations for this ticket.</Typography>
          ) : (
            escalations.map((e) => (
              <Box key={e.id} mb={2} p={1.5} bgcolor="action.hover" borderRadius={1}>
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <Chip label={e.status.toUpperCase()} size="small"
                    color={e.status === 'accepted' ? 'success' : e.status === 'returned' ? 'error' : 'warning'} />
                  <Typography variant="body2">
                    <strong>{e.escalatedBy?.firstName} {e.escalatedBy?.lastName}</strong>
                    {' → '}
                    <strong>{e.escalatedTo?.firstName} {e.escalatedTo?.lastName}</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(e.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                {e.notes ? (
                  <Typography variant="body2" mt={0.5}>Reason: {e.notes}</Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary" mt={0.5} fontStyle="italic">No reason provided.</Typography>
                )}
                {e.returnReason && <Typography variant="body2" color="error.main" mt={0.5}>Return reason: {e.returnReason}</Typography>}
                {e.proofFiles && e.proofFiles.length > 0 ? (
                  <Box mt={1} display="flex" flexWrap="wrap" gap={1}>
                    {e.proofFiles.map((filePath, idx) => {
                      const parts = filePath.replace('escalation-proofs/', '').split('/');
                      const tid = parts[0] ?? ticketId;
                      const fname = encodeURIComponent(parts[1] ?? filePath);
                      const apiUrl = `/api/tickets/proof/${tid}/${fname}`;
                      const blobUrl = proofBlobUrls[apiUrl];
                      const allBlobUrls = (e.proofFiles ?? []).map(fp => {
                        const p = fp.replace('escalation-proofs/', '').split('/');
                        const t2 = p[0] ?? ticketId;
                        const f2 = encodeURIComponent(p[1] ?? fp);
                        return proofBlobUrls[`/api/tickets/proof/${t2}/${f2}`];
                      }).filter((u): u is string => Boolean(u) && u !== 'error');
                      return (
                        <Box
                          key={idx}
                          component="button"
                          onClick={() => {
                            if (!allBlobUrls.length) return;
                            setPhotoModalSrcs(allBlobUrls);
                            setPhotoModalIdx(idx < allBlobUrls.length ? idx : 0);
                            setPhotoModalOpen(true);
                          }}
                          sx={{
                            p: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1,
                            cursor: 'pointer', background: 'transparent', overflow: 'hidden',
                            width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {blobUrl && blobUrl !== 'error' ? (
                            <Box
                              component="img"
                              src={blobUrl}
                              alt={`Proof photo ${idx + 1}`}
                              sx={{ width: 80, height: 80, objectFit: 'cover' }}
                            />
                          ) : blobUrl === 'error' ? (
                            <Box sx={{ color: 'text.disabled', fontSize: 32, lineHeight: 1 }}>✕</Box>
                          ) : (
                            <CircularProgress size={20} />
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary" mt={0.5} display="block">No proof photo attached.</Typography>
                )}
                {e.status === 'pending' && e.escalatedToId === (user as any)?.id && (
                  <Box mt={1} display="flex" gap={1}>
                    <Button size="small" variant="contained" color="success"
                      onClick={() => handleAcceptEscalation(e.id)}>Accept</Button>
                    <Button size="small" variant="outlined" color="error"
                      onClick={() => { setReturnEscalationId(e.id); setReturnReason(''); setReturnDialogOpen(true); }}>
                      Return
                    </Button>
                  </Box>
                )}
              </Box>
            ))
          )}
        </CardContent>
      </Card>

      {/* ── Comments ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Comments ({sortedComments.length})
          </Typography>

          {sortedComments.length > 0 ? (
            <List disablePadding>
              {sortedComments.map((c: any, i: number) => (
                <React.Fragment key={c.id ?? i}>
                  <ListItem alignItems="flex-start" disableGutters>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight={600}>
                            {c.user
                              ? `${c.user.firstName} ${c.user.lastName}`
                              : `User #${c.userId}`}
                          </Typography>
                          {c.isInternal && (
                            <Chip label="Internal" size="small" color="default" variant="outlined" />
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {new Date(c.createdAt).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.primary" whiteSpace="pre-wrap" mt={0.5}>
                          {c.comment}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {i < sortedComments.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">No comments yet.</Typography>
          )}

          {/* Add comment */}
          {ticket.status !== 'closed' && ticket.status !== 'duplicate' && (
            <Box mt={3}>
              <Divider sx={{ mb: 2 }} />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Add a comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                size="small"
              />
              {canStaff && (
                <FormControlLabel
                  control={<Switch checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} size="small" />}
                  label={<Typography variant="caption">Internal note (hidden from requester)</Typography>}
                  sx={{ mt: 1 }}
                />
              )}
              <Box mt={1}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleAddComment}
                  disabled={submittingComment || !comment.trim()}
                >
                  {submittingComment ? 'Submitting…' : 'Add Comment'}
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── Ticket Timeline ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Timeline
          </Typography>
          {eventsLoading ? (
            <Box textAlign="center" py={2}><CircularProgress size={24} /></Box>
          ) : timelineEvents.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No events recorded yet.</Typography>
          ) : (
            <Box>
              {timelineEvents.map((ev, idx) => {
                const isLast = idx === timelineEvents.length - 1;
                const EVENT_LABELS: Record<string, string> = {
                  created: 'Ticket Created',
                  auto_assigned: 'Auto-Assigned',
                  manually_assigned: 'Manually Assigned',
                  status_changed: 'Status Changed',
                  in_progress: 'Marked In Progress',
                  resolved: 'Resolved',
                  closed: 'Closed',
                  user_closed: 'Closed by Requester',
                  escalated: 'Escalated',
                  satisfaction_submitted: 'Satisfaction Submitted',
                };
                const label = EVENT_LABELS[ev.eventType] ?? ev.eventType.replace(/_/g, ' ');
                const actorLine = ev.actorName
                  ? `by ${ev.actorName}`
                  : (ev.eventType === 'auto_assigned' ? 'by System' : '');
                return (
                  <Box key={ev.id} display="flex" gap={2} mb={isLast ? 0 : 2}>
                    <Box display="flex" flexDirection="column" alignItems="center">
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.5, flexShrink: 0 }} />
                      {!isLast && <Box sx={{ width: 2, flex: 1, bgcolor: 'divider', mt: 0.5, minHeight: 20 }} />}
                    </Box>
                    <Box pb={isLast ? 0 : 1}>
                      <Typography variant="body2" fontWeight={600}>{label}</Typography>
                      {actorLine && (
                        <Typography variant="caption" color="text.secondary">{actorLine}</Typography>
                      )}
                      {ev.meta?.technicianName && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          → {ev.meta.technicianName}
                        </Typography>
                      )}
                      {ev.meta?.to && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Status: {String(ev.meta.to).replace('_', ' ')}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.disabled" display="block">
                        {new Date(ev.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── Assign / Escalate Dialog ── */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{isEscalateMode ? 'Escalate Ticket' : 'Assign Technician'}</DialogTitle>
        <DialogContent>
          {isEscalateMode && (
            <Alert severity="warning" sx={{ mb: 1, mt: 1 }}>
              Only focal technicians are shown. Escalating will re-assign this ticket to the selected focal tech.
            </Alert>
          )}
          <TextField
            select
            fullWidth
            label={isEscalateMode ? 'Focal Technician' : 'Technician'}
            value={assignToId}
            onChange={(e) => setAssignToId(Number(e.target.value))}
            size="small"
            sx={{ mt: 1 }}
          >
            {technicians
              .filter((t) => {
                if (isEscalateMode) {
                  // Escalation: only focal-level techs
                  if (ticket.ticketType === 'desktop_support') return ['technician_desktop', 'technician', 'desktop_sr'].includes(t.role);
                  if (ticket.ticketType === 'pantawid_ict_support') return ['technician', 'pantawid_ict'].includes(t.role);
                  return ['technician_it_support', 'technician', 'it_support_sr'].includes(t.role);
                }
                // Normal assign: show all relevant technicians for the ticket type.
                // Do NOT pre-filter by openCount — backend enforces the busy guard on submit.
                if (ticket.ticketType === 'desktop_support')
                  return ['technician_desktop', 'technician', 'technician_desktop_staff', 'desktop_sr', 'desktop_jr'].includes(t.role);
                if (ticket.ticketType === 'pantawid_ict_support')
                  return ['technician', 'pantawid_ict'].includes(t.role);
                return ['technician_it_support', 'technician', 'technician_it_staff', 'it_support_sr', 'it_support_jr'].includes(t.role);
              })
              .filter((t) => !isEscalateMode && t.openCount === 0 || isEscalateMode)
              .map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </MenuItem>
              ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color={isEscalateMode ? 'warning' : 'primary'} onClick={handleAssign} disabled={!assignToId}>
            {isEscalateMode ? 'Escalate' : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dedicated Escalate Dialog ── */}
      <Dialog open={escalateDialogOpen} onClose={() => setEscalateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Escalate Ticket</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            Escalate this ticket to a designated focal technician or senior staff.
            You may attach photo proof of the issue.
          </Alert>
          <TextField
            select fullWidth label="Escalate To" value={escalateToId}
            onChange={(e) => setEscalateToId(Number(e.target.value))}
            size="small" sx={{ mb: 2 }}
          >
            {escalationFocalUsers.length === 0 ? (
              <MenuItem disabled value="">No escalation focals configured for this ticket type</MenuItem>
            ) : escalationFocalUsers.map((t) => (
              <MenuItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth multiline rows={3} label="Reason for escalation (optional)"
            value={escalateNotes} onChange={(e) => setEscalateNotes(e.target.value)}
            size="small" sx={{ mb: 2 }}
          />
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Proof photos (optional, max 10 files, 10 MB each)
            </Typography>
            <Button component="label" variant="outlined" size="small" startIcon={<UploadIcon />}>
              Upload Proof Photo(s)
              <input type="file" hidden multiple accept="image/*"
                onChange={(e) => setEscalateFiles(Array.from(e.target.files ?? []))} />
            </Button>
            {escalateFiles.length > 0 && (
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                {escalateFiles.length} file(s) selected
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEscalateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleEscalate}
            disabled={!escalateToId || escalating}>
            {escalating ? 'Escalating…' : 'Escalate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Return Escalation Dialog ── */}
      <Dialog open={returnDialogOpen} onClose={() => setReturnDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Return Ticket</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth multiline rows={3} label="Reason for returning *"
            value={returnReason} onChange={(e) => setReturnReason(e.target.value)}
            size="small" sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleReturnEscalation}
            disabled={!returnReason.trim()}>
            Return Ticket
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Duplicate Confirmation Dialog ── */}
      <Dialog open={dupConfirmOpen} onClose={() => setDupConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Mark Ticket as Duplicate?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            This action is <strong>permanent</strong>. Once a ticket is marked as Duplicate it cannot be updated or re-assigned.
            You will be prompted to select the original ticket in the next step.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDupConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleConfirmDuplicate}>
            Yes, Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Duplicate Picker Dialog ── */}
      <Dialog open={dupDialogOpen} onClose={() => setDupDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Mark as Duplicate Of…</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Select the original ticket that this is a duplicate of.
          </Typography>
          {requesterOpenTickets.length === 0 ? (
            <Alert severity="info" sx={{ mt: 1 }}>No other open tickets found for this requester.</Alert>
          ) : (
            <TextField
              select
              fullWidth
              label="Original Ticket"
              value={selectedDupOfId}
              onChange={(e) => setSelectedDupOfId(e.target.value)}
              size="small"
              sx={{ mt: 2 }}
            >
              {requesterOpenTickets.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.ticketNumber} — {t.subject}
                </MenuItem>
              ))}
            </TextField>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDupDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => handleUpdateStatus(selectedDupOfId)}
            disabled={!selectedDupOfId}
          >
            Confirm Duplicate
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Satisfaction Dialog — CLIENT SATISFACTION MEASUREMENT FORM ── */}
      <Dialog open={satDialogOpen} onClose={() => setSatDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 0 }}>
          CLIENT SATISFACTION MEASUREMENT FORM
          <Typography variant="body2" color="text.secondary" fontWeight={400} mt={0.5}>
            Ticket: <strong>{ticket.ticketNumber}</strong>
          </Typography>
        </DialogTitle>
        <DialogContent>
          {ticket.satisfactionSubmittedAt ? (
            <Alert severity="success" sx={{ mt: 2 }}>You have already submitted a satisfaction rating for this ticket. Thank you!</Alert>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <FormControlLabel
                control={<Checkbox checked={csatForm.consentGiven} onChange={e => setCsatForm(f => ({ ...f, consentGiven: e.target.checked }))} />}
                label={
                  <Typography variant="body2">
                    I voluntarily give my consent for the use of my personal information. I confirm that I have read the provided information, or it has been read to me. I have had the opportunity to ask questions about it, and any inquiries I made were answered to my satisfaction. I understand that any information collected will be utilized solely to enhance the basic social services provided by the DSWD.
                  </Typography>
                }
              />
              <Stack direction="row" spacing={2}>
                <Autocomplete
                  options={unitSuggestions} freeSolo fullWidth value={csatForm.unitSection}
                  onInputChange={(_, v) => setCsatForm(f => ({ ...f, unitSection: v }))}
                  renderInput={params => <TextField {...params} label="Unit/Section *" />}
                />
                <TextField label="Date of Transaction *" type="date" value={csatForm.dateOfTransaction}
                  InputProps={{ readOnly: true }} disabled fullWidth InputLabelProps={{ shrink: true }} />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField label="First Name *" value={csatForm.clientFirstName} onChange={e => setCsatForm(f => ({ ...f, clientFirstName: e.target.value }))} fullWidth />
                <TextField label="M.I." value={csatForm.clientMiddleInitial ?? ''} onChange={e => setCsatForm(f => ({ ...f, clientMiddleInitial: e.target.value }))} inputProps={{ maxLength: 2 }} sx={{ maxWidth: 80 }} />
                <TextField label="Last Name *" value={csatForm.clientLastName} onChange={e => setCsatForm(f => ({ ...f, clientLastName: e.target.value }))} fullWidth />
                <TextField label="Suffix" value={csatForm.suffix ?? ''} onChange={e => setCsatForm(f => ({ ...f, suffix: e.target.value }))} sx={{ maxWidth: 100 }} />
              </Stack>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <TextField label="Age *" type="number" inputProps={{ min: 1, max: 120 }} value={csatForm.age ?? ''}
                  onChange={e => setCsatForm(f => ({ ...f, age: e.target.value ? Number(e.target.value) : undefined }))} sx={{ maxWidth: 100 }} />
                <TextField label="Religion *" value={csatForm.religion} onChange={e => setCsatForm(f => ({ ...f, religion: e.target.value }))} sx={{ flex: 1 }} />
                <TextField select label="Sex *" value={csatForm.sex} onChange={e => setCsatForm(f => ({ ...f, sex: e.target.value }))} sx={{ minWidth: 120 }}>
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
              <TextField label="Technician Name" value={csatForm.technicianName} InputProps={{ readOnly: true }} disabled fullWidth />

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
                    <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>{idx}. {item}</Typography>
                    {isNA ? (
                      <Chip size="small" label="N/A" color="default" sx={{ minWidth: 64 }} />
                    ) : (
                      <ToggleButtonGroup exclusive size="small" value={val === 0 ? null : val}
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
          {!ticket.satisfactionSubmittedAt && (
            <Button onClick={handleSubmitSatisfaction} variant="contained" color="warning" disabled={csatSubmitting || !csatForm.consentGiven}>
              {csatSubmitting ? 'Submitting…' : 'Submit Feedback'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      {/* ── Photo Lightbox Modal ── */}
      <Dialog open={photoModalOpen} onClose={() => setPhotoModalOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { bgcolor: 'black', borderRadius: 2, position: 'relative' } }}>
        <DialogContent sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, position: 'relative' }}>
          {photoModalSrcs.length > 0 && (
            <Box
              component="img"
              src={photoModalSrcs[photoModalIdx]}
              alt={`Proof photo ${photoModalIdx + 1}`}
              sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block', mx: 'auto' }}
            />
          )}
          {photoModalSrcs.length > 1 && (
            <>
              <IconButton
                onClick={() => setPhotoModalIdx(i => (i - 1 + photoModalSrcs.length) % photoModalSrcs.length)}
                sx={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'white', bgcolor: 'rgba(0,0,0,0.4)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
              >
                <NavigateBefore />
              </IconButton>
              <IconButton
                onClick={() => setPhotoModalIdx(i => (i + 1) % photoModalSrcs.length)}
                sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'white', bgcolor: 'rgba(0,0,0,0.4)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
              >
                <NavigateNext />
              </IconButton>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'black', justifyContent: 'space-between', px: 2 }}>
          <Typography variant="caption" color="grey.400">
            {photoModalSrcs.length > 1 ? `${photoModalIdx + 1} / ${photoModalSrcs.length}` : ''}
          </Typography>
          <Button onClick={() => setPhotoModalOpen(false)} sx={{ color: 'grey.300' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
