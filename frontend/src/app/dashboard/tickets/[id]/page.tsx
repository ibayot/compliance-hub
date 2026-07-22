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
import { UserRole } from '@/lib/types/auth';
import {
  ticketsApi,
  ticketSettingsApi,
  attendanceApi,
  knowledgeBaseApi,
  Ticket,
  TechnicianOption,
  UpdateTicketDto,
  TicketEvent,
  CsatFormData,
  TicketEscalation,
  EscalationFocalConfig,
  TicketIssueType,
} from '@/app/api/references';
import { AuthImage } from '@/components/AuthImage';
import {
  ArrowBack as BackIcon,
  Star as StarIcon,
  CloudUpload as UploadIcon,
  SentimentVerySatisfied,
  SentimentSatisfied,
  SentimentNeutral,
  SentimentDissatisfied,
  SentimentVeryDissatisfied,
  NavigateBefore,
  NavigateNext,
} from '@mui/icons-material';
import { apiClient } from '@/lib/api/client';
import {
  PRIORITY_COLOR,
  STATUS_COLOR,
  TICKET_TYPE_LABELS as TYPE_LABELS,
} from '@/lib/utils/ticket-colors';

import { unitsApi } from '@/lib/api/units';

const STATUS_OPTS = [
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'freeze', label: 'On Hold' },
  { value: 'pause', label: 'Pause' },
  { value: 'duplicate', label: 'Duplicate' },
];

function OverdueTimer({ targetDate }: { targetDate: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    const tick = () => {
      const now = Date.now();
      const diff = now - target;
      if (diff <= 0) {
        setElapsed('0d 0h 0m 0s');
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setElapsed(`${d}d ${h}h ${m}m ${s}s`);
    };
    tick(); // Initial call
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return <>{elapsed}</>;
}

function getSlaStatus(ticket: Ticket): 'met' | 'on_track' | 'nearing_sla' | 'overdue' | null {
  if (!ticket.slaDeadline || ticket.isSlaWaiting) return null;
  const isTerminal = ['resolved', 'closed', 'duplicate'].includes(ticket.status);
  if (isTerminal) {
    const deadline = new Date(ticket.slaDeadline).getTime();
    const resolvedTime = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : Date.now();
    return resolvedTime <= deadline ? 'met' : 'overdue';
  }
  if (ticket.isOverdue) return 'overdue';
  if (ticket.isNearingSLA) return 'nearing_sla';
  return 'on_track';
}

const SLA_CHIP: Record<string, { label: string; color: 'success' | 'info' | 'warning' | 'error' }> =
{
  met: { label: 'Met', color: 'success' },
  on_track: { label: 'On Track', color: 'info' },
  nearing_sla: { label: 'Nearing SLA', color: 'warning' },
  overdue: { label: 'Overdue', color: 'error' },
};

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, myCap } = useAuth();
  const ticketId = params.id as string;
  const { enqueueSnackbar } = useSnackbar();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [issues, setIssues] = useState<TicketIssueType[]>([]);

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
  const [generateKb, setGenerateKb] = useState(false);

  // KB picker for resolution
  const [kbPickerOpen, setKbPickerOpen] = useState(false);
  const [kbArticles, setKbArticles] = useState<any[]>([]);
  const [kbSearch, setKbSearch] = useState('');
  const [kbLoading, setKbLoading] = useState(false);

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

  // Add notes/proof to existing pending escalation
  const [addProofDialogOpen, setAddProofDialogOpen] = useState(false);
  const [addProofEscalationId, setAddProofEscalationId] = useState('');
  const [addProofNotes, setAddProofNotes] = useState('');
  const [addProofFiles, setAddProofFiles] = useState<File[]>([]);
  const [addingProof, setAddingProof] = useState(false);

  // Proof photo blob URLs (authenticated loading) and lightbox modal
  const [proofBlobUrls, setProofBlobUrls] = useState<Record<string, string>>({});
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoModalSrcs, setPhotoModalSrcs] = useState<string[]>([]);
  const [photoModalIdx, setPhotoModalIdx] = useState(0);

  // Satisfaction dialog
  const [satDialogOpen, setSatDialogOpen] = useState(false);
  const [csatForm, setCsatForm] = useState<CsatFormData>({
    consentGiven: false,
    unitSection: '',
    dateOfTransaction: '',
    clientFirstName: '',
    clientMiddleInitial: '',
    clientLastName: '',
    suffix: '',
    religion: '',
    sex: '',
    contactNumber: '',
    technicianName: '',
    likert: [0, 0, 0, 'NA', 0, 'NA', 0, 0, 'NA'],
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
  const isFocalTech = !!myCap?.isFocal && (!!myCap?.isDesktop || !!myCap?.isItSupport || !!myCap?.isPantawidIct);
  const isLowerLevelTech = (!!myCap?.isDesktop || !!myCap?.isItSupport || !!myCap?.isPantawidIct) && !myCap?.isFocal;
  const isJuniorTech = isLowerLevelTech;
  const isTechnician = isFocalTech || isLowerLevelTech || !!myCap?.isIto;
  const isFocal = !!myCap?.isFocal;
  const isAdmin = !!myCap?.isTicketSettingsFocal || !!myCap?.isTicketFocal;
  const canAssignByCapability = !!myCap?.isTicketFocal || !!myCap?.isTicketSettingsFocal;
  const canStaff = isAdmin || isTechnician || canAssignByCapability || !!myCap?.isAllTickets;
  const canPriority = canStaff;
  const isComplianceOfficer = user?.roleCode === 'compliance_officer';
  const isSectionHead = user?.roleCode === 'section_head';
  const canEscalate =
    !!myCap?.isTicketSettingsFocal ||
    !!myCap?.isTicketFocal ||
    !!(
      myCap?.isDesktop ||
      myCap?.isItSupport ||
      myCap?.isPantawidIct ||
      myCap?.isAllTickets
    );
  const isEscalationAdmin = !!myCap?.isTicketSettingsFocal || isComplianceOfficer || isSectionHead;
  const latestEscalation = escalations.length > 0 ? escalations[0] : null;
  const hasPendingEscalation = latestEscalation?.status === 'pending';
  const hasAcceptedEscalation = latestEscalation?.status === 'accepted';
  const isAcceptedEscalationFocal =
    hasAcceptedEscalation &&
    (latestEscalation?.escalatedToId ||
      latestEscalation?.escalatedTo?.id ||
      (latestEscalation as any)?.escalated_to_id) === (user as any)?.id;
  // UI policy: if escalation is pending, no top action buttons are shown.
  // If escalation is accepted, only Update Status may appear.
  const hideTopActionButtons = !!hasPendingEscalation;
  const acceptedEscalationOnlyStatusAction = !!hasAcceptedEscalation;
  const canUpdateStatusNow =
    (canStaff && !hasAcceptedEscalation) || isEscalationAdmin || !!isAcceptedEscalationFocal;
  // Matrix-driven reassign privilege: ticket admin/assign capability, constrained after accepted escalations.
  const canReassign = canAssignByCapability && (!hasAcceptedEscalation || isEscalationAdmin);
  // Ticket can be escalated again if there is no pending escalation.
  const canEscalateNow =
    canEscalate && (!latestEscalation || latestEscalation.status !== 'pending');
  const isTypeLockedByEscalation = (hasPendingEscalation || hasAcceptedEscalation) && !myCap?.isTicketSettingsFocal && !isAcceptedEscalationFocal;
  const isRequester = ticket?.requesterId === (user as any)?.id;
  const canSatisfaction =
    isRequester &&
    (ticket?.status === 'resolved' || ticket?.status === 'closed') &&
    !ticket?.satisfactionSubmittedAt;
  // Duplicate is terminal — no further modifications allowed
  const isDuplicate = ticket?.status === 'duplicate';
  const sortedComments = useMemo(() => {
    const comments = [...(((ticket as any)?.comments ?? []) as any[])].filter(
      c => c.comment !== '[Initial Ticket Attachment]'
    );
    return comments.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [ticket]);
  const timelineEvents = useMemo(() => {
    const eventPriority = (eventType: string) => {
      if (eventType === 'created') return 2;
      if (eventType === 'auto_assigned') return 1;
      return 0;
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
    } catch {
      /* silent */
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchEscalations = async () => {
    if (!ticketId) return;
    try {
      setEscalationsLoading(true);
      const data = await ticketsApi.getEscalations(ticketId);
      setEscalations(data);
    } catch {
      /* silent */
    } finally {
      setEscalationsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [ticketId]);
  useEffect(() => {
    fetchEscalations();
  }, [ticketId]);
  useEffect(() => {
    if (ticket?.ticketType) {
      ticketSettingsApi.getCategories(ticket.ticketType, true)
        .then(setCategories)
        .catch(() => setCategories([]));
    }
  }, [ticket?.ticketType]);

  useEffect(() => {
    if (ticket?.categoryId) {
      ticketSettingsApi.getIssueTypes(ticket.categoryId)
        .then((data) => setIssues(data.filter((iss) => iss.isActive && !iss.isDeleted)))
        .catch(() => setIssues([]));
    } else {
      setIssues([]);
    }
  }, [ticket?.categoryId]);

  // Load proof photos as authenticated blob URLs
  useEffect(() => {
    if (!escalations.length) return;
    const urlMap: Record<string, string> = {};
    const loaders: Promise<void>[] = [];
    escalations.forEach((e) => {
      (e.proofFiles ?? []).forEach((filePath) => {
        const parts = filePath.replace('escalation-proofs/', '').split('/');
        const tid = parts[0] ?? ticketId;
        const fname = encodeURIComponent(parts[1] ?? filePath);
        const apiUrl = `/tickets/proof/${tid}/${fname}`;
        loaders.push(
          apiClient
            .get(apiUrl, { responseType: 'blob' })
            .then((r) => {
              urlMap[apiUrl] = URL.createObjectURL(r.data);
            })
            .catch(() => {
              urlMap[apiUrl] = 'error';
            }),
        );
      });
    });
    Promise.all(loaders).then(() =>
      setProofBlobUrls((prev) => {
        Object.values(prev).forEach((u) => URL.revokeObjectURL(u));
        return { ...urlMap };
      }),
    );
    return () => {
      Object.values(urlMap).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [escalations, ticketId]);

  // Live updates – poll every 30 s for all users (QA #7: ensures user-side sees status changes)
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const [ticketData, eventsData, escalationsData] = await Promise.all([
          ticketsApi.getById(ticketId),
          ticketsApi.getEvents(ticketId),
          ticketsApi.getEscalations(ticketId),
        ]);
        setTicket(ticketData);
        setEvents(eventsData);
        setEscalations(escalationsData);
      } catch {
        /* silent */
      }
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
        ticketsApi
          .markViewed(ticketId)
          .then((updated) => {
            if (updated) setTicket(updated);
          })
          .catch(() => { });
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to fetch ticket', {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const data = await ticketsApi.getTechnicians();
      const available = (data || []).filter(
        (t: any) => !['absent', 'out_of_office', 'half_day'].includes(t.attendanceStatus ?? ''),
      );
      setTechnicians(available);
    } catch {
      /* restricted */
    }
  };

  const [commentAttachment, setCommentAttachment] = useState<File | null>(null);

  const handleAddComment = async () => {
    if (!comment.trim() && !commentAttachment) return;
    try {
      setSubmittingComment(true);
      await ticketsApi.addComment(ticketId, comment, isInternal && canStaff, commentAttachment);
      setComment('');
      setCommentAttachment(null);
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
    if (!canUpdateStatusNow) {
      enqueueSnackbar('You cannot change status while this ticket has an accepted escalation.', {
        variant: 'warning',
      });
      return;
    }

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
      if (newStatus === 'resolved') payload.generateKb = generateKb;
      await ticketsApi.update(ticketId, payload);
      setEditingStatus(false);
      setDupDialogOpen(false);
      setDupConfirmOpen(false);
      setNewPriority('');
      fetchTicket();
      fetchEvents();
      enqueueSnackbar('Ticket updated.', { variant: 'success' });
      if (newStatus === 'resolved' && generateKb) {
        enqueueSnackbar('AI is generating a Knowledge Base article in the background. It will be available shortly.', {
          variant: 'info',
          autoHideDuration: 5000,
        });
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update ticket', {
        variant: 'error',
      });
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
      enqueueSnackbar(err.response?.data?.message || 'Failed to assign ticket', {
        variant: 'error',
      });
    }
  };

  const handleEscalate = async () => {
    if (!escalateToId) return;
    try {
      setEscalating(true);
      const formData = new FormData();
      formData.append('escalatedToId', String(escalateToId));
      const finalNotes = !escalateNotes.trim() && escalateFiles.length > 0 ? '[Attachment Only]' : escalateNotes;
      if (finalNotes) formData.append('notes', finalNotes);
      escalateFiles.forEach((f) => formData.append('proofFiles', f));
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
      enqueueSnackbar(err.response?.data?.message || 'Failed to escalate ticket', {
        variant: 'error',
      });
    } finally {
      setEscalating(false);
    }
  };

  const handleAcceptEscalation = async (escalationId: string) => {
    try {
      await ticketsApi.acceptEscalation(ticketId, escalationId);
      fetchEscalations();
      fetchTicket();
      enqueueSnackbar('Escalation accepted.', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to accept escalation', {
        variant: 'error',
      });
    }
  };

  const handleReturnEscalation = async () => {
    if (!returnReason.trim()) return;
    try {
      await ticketsApi.returnEscalation(ticketId, returnEscalationId, returnReason);
      setReturnDialogOpen(false);
      setReturnReason('');
      enqueueSnackbar('Ticket returned to escalating technician.', { variant: 'success' });
      // UX rule: after returning escalation, only the returner view should refresh and go back to list.
      router.push('/dashboard/tickets');
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to return escalation', {
        variant: 'error',
      });
    }
  };

  const handleAddProof = async () => {
    try {
      setAddingProof(true);
      const formData = new FormData();
      const finalNotes = !addProofNotes.trim() && addProofFiles.length > 0 ? '[Attachment Only]' : addProofNotes;
      if (finalNotes !== undefined) formData.append('notes', finalNotes);
      addProofFiles.forEach((f) => formData.append('proofFiles', f));
      await ticketsApi.updateEscalationProof(ticketId, addProofEscalationId, formData);
      setAddProofDialogOpen(false);
      setAddProofNotes('');
      setAddProofFiles([]);
      fetchEscalations();
      enqueueSnackbar('Escalation notes and proof updated.', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update escalation', {
        variant: 'error',
      });
    } finally {
      setAddingProof(false);
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
      const mergedUsers = [...itoUsers, ...supportUsers].filter(
        (u, idx, arr) => arr.findIndex((x) => x.id === u.id) === idx,
      );
      // From all techs, keep only those whose user ID or role matches the configured escalation focals
      const allowedValues = new Set(focals.map((f) => String(f.userId)));
      setEscalationFocalUsers(
        mergedUsers.filter(
          (t) => allowedValues.has(String(t.id)),
        ),
      );
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
      enqueueSnackbar(err.response?.data?.message || 'Failed to close ticket', {
        variant: 'error',
      });
    }
  };

  const handleSubmitSatisfaction = async () => {
    if (!csatForm.consentGiven) {
      enqueueSnackbar('Please provide consent before submitting.', { variant: 'warning' });
      return;
    }
    if (!csatForm.unitSection.trim()) {
      enqueueSnackbar('Unit/Section is required.', { variant: 'warning' });
      return;
    }
    if (!csatForm.clientFirstName.trim() || !csatForm.clientLastName.trim()) {
      enqueueSnackbar('Client name is required.', { variant: 'warning' });
      return;
    }
    if (!csatForm.sex) {
      enqueueSnackbar('Sex is required.', { variant: 'warning' });
      return;
    }
    const ratedItems = csatForm.likert.filter((_, i) => ![3, 5, 8].includes(i));
    if (ratedItems.some((v) => v === 0)) {
      enqueueSnackbar('Please rate all applicable items.', { variant: 'warning' });
      return;
    }
    try {
      setCsatSubmitting(true);
      await ticketsApi.submitSatisfaction(ticketId, { formData: csatForm });
      setSatDialogOpen(false);
      fetchTicket();
      enqueueSnackbar('Thank you for your feedback!', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to submit satisfaction', {
        variant: 'error',
      });
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
        <Button
          startIcon={<BackIcon />}
          onClick={() => router.push('/dashboard/tickets')}
          sx={{ mt: 2 }}
        >
          Back to Tickets
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        startIcon={<BackIcon />}
        onClick={() => router.push('/dashboard/tickets')}
        sx={{ mb: 2 }}
      >
        Back to Tickets
      </Button>

      {/* ── Ticket Header ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="flex-start"
            flexWrap="wrap"
            gap={2}
          >
            <Box flexGrow={1}>
              <Typography variant="overline" color="text.secondary">
                {ticket.ticketNumber}
              </Typography>
              <Typography variant="h5" gutterBottom>
                {ticket.subject}
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {!!myCap?.isTicketSettingsFocal || ticket.assignedToId === (user as any)?.id ? (
                  <TextField
                    select
                    size="small"
                    value={ticket.ticketType}
                    disabled={['resolved', 'closed'].includes(ticket.status) || isTypeLockedByEscalation}
                    onChange={async (e) => {
                      try {
                        await ticketsApi.update(ticketId, { ticketType: e.target.value as any });
                        fetchTicket();
                        enqueueSnackbar('Ticket type updated.', { variant: 'success' });
                      } catch (err: any) {
                        enqueueSnackbar(
                          err.response?.data?.message || 'Failed to update ticket type',
                          { variant: 'error' },
                        );
                      }
                    }}
                    sx={{
                      minWidth: 160,
                      '& .MuiInputBase-root': {
                        height: 26,
                        fontSize: '0.8125rem',
                        borderRadius: '16px',
                      },
                    }}
                  >
                    {Object.entries(TYPE_LABELS).map(([val, label]) => (
                      <MenuItem key={val} value={val} sx={{ fontSize: '0.8125rem' }}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <Chip
                    label={TYPE_LABELS[ticket.ticketType] ?? ticket.ticketType}
                    color="primary"
                    size="small"
                    variant="outlined"
                  />
                )}
                
                {/* Category Dropdown */}
                {!!myCap?.isTicketSettingsFocal || ticket.assignedToId === (user as any)?.id ? (
                  <TextField
                    select
                    size="small"
                    value={ticket.categoryId || ''}
                    disabled={['resolved', 'closed'].includes(ticket.status) || isTypeLockedByEscalation}
                    onChange={async (e) => {
                      try {
                        await ticketsApi.update(ticketId, { categoryId: e.target.value as string });
                        fetchTicket();
                        enqueueSnackbar('Ticket category updated.', { variant: 'success' });
                      } catch (err: any) {
                        enqueueSnackbar(
                          err.response?.data?.message || 'Failed to update ticket category',
                          { variant: 'error' },
                        );
                      }
                    }}
                    sx={{
                      minWidth: 160,
                      '& .MuiInputBase-root': {
                        height: 26,
                        fontSize: '0.8125rem',
                        borderRadius: '16px',
                      },
                    }}
                  >
                    <MenuItem value="" disabled sx={{ fontSize: '0.8125rem', fontStyle: 'italic' }}>
                      Select Category
                    </MenuItem>
                    {categories.map((cat: any) => (
                      <MenuItem key={cat.id} value={cat.id} sx={{ fontSize: '0.8125rem' }}>
                        {cat.name}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  ticket.category ? (
                    <Chip
                      label={ticket.category.name}
                      color="secondary"
                      size="small"
                      variant="outlined"
                    />
                  ) : null
                )}

                {/* Issue Dropdown */}
                {user?.role !== 'user' && issues.length > 0 && (
                  (!!myCap?.isTicketSettingsFocal || ticket.assignedToId === (user as any)?.id) ? (
                    <TextField
                      select
                      size="small"
                      value={ticket.issueTypeId || ''}
                      disabled={['resolved', 'closed'].includes(ticket.status) || isTypeLockedByEscalation}
                      onChange={async (e) => {
                        try {
                          await ticketsApi.update(ticketId, { issueTypeId: e.target.value as string });
                          fetchTicket();
                          enqueueSnackbar('Ticket issue updated.', { variant: 'success' });
                        } catch (err: any) {
                          enqueueSnackbar(
                            err.response?.data?.message || 'Failed to update ticket issue',
                            { variant: 'error' },
                          );
                        }
                      }}
                      sx={{
                        minWidth: 160,
                        '& .MuiInputBase-root': {
                          height: 26,
                          fontSize: '0.8125rem',
                          borderRadius: '16px',
                        },
                      }}
                    >
                      <MenuItem value="" disabled sx={{ fontSize: '0.8125rem', fontStyle: 'italic' }}>
                        Select Issue
                      </MenuItem>
                      {issues.map((iss) => (
                        <MenuItem key={iss.id} value={iss.id} sx={{ fontSize: '0.8125rem' }}>
                          {iss.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    ticket.issueTypeId ? (
                      <Chip
                        label={issues.find((i) => i.id === ticket.issueTypeId)?.name || 'Unknown Issue'}
                        color="secondary"
                        size="small"
                        variant="outlined"
                      />
                    ) : null
                  )
                )}
                <Chip
                  label={
                    ticket.priority
                      ? `Priority: ${ticket.priority.toUpperCase()}`
                      : 'Priority: Not Set'
                  }
                  color={
                    ticket.priority ? (PRIORITY_COLOR[ticket.priority] ?? 'default') : 'default'
                  }
                  size="small"
                />
                <Chip
                  label={ticket.status.replace('_', ' ').toUpperCase()}
                  color={STATUS_COLOR[ticket.status] ?? 'default'}
                  size="small"
                />
                {(() => {
                  const slaStatus = getSlaStatus(ticket);
                  if (!slaStatus) return null;
                  const chipData = SLA_CHIP[slaStatus];
                  return (
                    <Chip
                      label={chipData.label}
                      color={chipData.color as any}
                      size="small"
                    />
                  );
                })()}
              </Box>
            </Box>

            {/* Actions */}
            <Box display="flex" flexDirection="column" gap={1} minWidth={160}>
              {!hideTopActionButtons &&
                !editingStatus &&
                !isDuplicate &&
                !['resolved', 'closed'].includes(ticket.status) &&
                ((!hasAcceptedEscalation &&
                  canUpdateStatusNow &&
                  (isTechnician ||
                    isSectionHead ||
                    isComplianceOfficer ||
                    user?.role === 'super_admin')) ||
                  (hasAcceptedEscalation && isAcceptedEscalationFocal)) && (
                  <Button variant="outlined" size="small" onClick={() => setEditingStatus(true)}>
                    Update Status
                  </Button>
                )}
              {ticket.category?.name?.toLowerCase().includes('disposal') && (
                <>
                  <Button variant="contained" size="small" color="secondary" onClick={() => window.print()}>
                    Print Disposal Form
                  </Button>
                  {(isTechnician || !!myCap?.isTicketSettingsFocal) && (
                    <Button variant="outlined" size="small" color="secondary" onClick={() => window.print()}>
                      Print Inspection Form
                    </Button>
                  )}
                </>
              )}
              {!hideTopActionButtons && !acceptedEscalationOnlyStatusAction && isDuplicate && (
                <Chip label="Duplicate (Terminal)" color="default" size="small" />
              )}
              {!hideTopActionButtons &&
                (!hasAcceptedEscalation || isAcceptedEscalationFocal) &&
                canReassign &&
                !isDuplicate &&
                !['resolved', 'closed'].includes(ticket.status) && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={async () => {
                      setIsEscalateMode(false);
                      setAssignToId('');
                      await fetchTechnicians();
                      // Pre-select current assignee only if still available
                      setAssignDialogOpen(true);
                    }}
                  >
                    {ticket.assignedToId ? 'Reassign Ticket' : 'Assign Technician'}
                  </Button>
                )}
              {!hideTopActionButtons &&
                !isDuplicate &&
                !['closed', 'resolved'].includes(ticket.status) &&
                ((!hasAcceptedEscalation && canEscalateNow) ||
                  (hasAcceptedEscalation && isAcceptedEscalationFocal)) && (
                  <Button
                    variant="outlined"
                    size="small"
                    color="warning"
                    onClick={openEscalateDialog}
                  >
                    Escalate Ticket
                  </Button>
                )}
              {/* Self-close: requester can close their own ticket once it is Resolved */}
              {!hideTopActionButtons &&
                isRegularUser &&
                isRequester &&
                ticket.status === 'resolved' && (
                  <Button variant="outlined" size="small" color="error" onClick={handleSelfClose}>
                    Close Ticket
                  </Button>
                )}
              {!hideTopActionButtons && canSatisfaction && (
                <Button
                  variant="contained"
                  size="small"
                  color="warning"
                  startIcon={<StarIcon />}
                  onClick={() => {
                    const assignedName = ticket.assignedTo
                      ? `${ticket.assignedTo.firstName ?? ''} ${ticket.assignedTo.lastName ?? ''}`.trim() ||
                      ticket.assignedTo.email
                      : '';
                    setCsatForm({
                      consentGiven: false,
                      unitSection: user?.units?.[0]?.name || '',
                      clientFirstName: user?.firstName || '',
                      clientMiddleInitial: user?.middleName ? user.middleName.charAt(0).toUpperCase() : '',
                      clientLastName: user?.lastName || '',
                      suffix: user?.suffix || '',
                      religion: '',
                      sex: user?.sex || '',
                      contactNumber: user?.phoneNumber || '',
                      technicianName: assignedName,
                      dateOfTransaction: ticket.resolvedAt
                        ? new Date(ticket.resolvedAt).toISOString().split('T')[0]
                        : new Date().toISOString().split('T')[0],
                      likert: [0, 0, 0, 'NA', 0, 'NA', 0, 0, 'NA'],
                    });
                    // ticketsApi
                    //   .getUnitSuggestions()
                    //   .then(setUnitSuggestions)
                    //   .catch(() => { });
                    unitsApi
                      .listAll()
                      .then((units) => setUnitSuggestions(units.map(u => u.name)))
                      .catch(() => { });
                    setSatDialogOpen(true);
                  }}
                >
                  Rate Resolution
                </Button>
              )}
            </Box>
          </Box>

          {editingStatus && !hideTopActionButtons && canUpdateStatusNow && (
            <Box mt={3} p={2} bgcolor="action.hover" borderRadius={1}>
              <Typography variant="subtitle2" gutterBottom>
                Update Ticket
              </Typography>
              {(() => {
                // QA #3/#4/#6: Compute allowed next statuses based on current status and actor role
                let allowedValues: string[] = [];
                switch (ticket?.status) {
                  case 'open':
                    allowedValues = (myCap?.isTicketSettingsFocal || myCap?.isTicketFocal) ? ['freeze', 'duplicate'] : ['duplicate'];
                    break;
                  case 'assigned': {
                    const assignedValues = ['in_progress', 'duplicate'];
                    if (myCap?.isTicketSettingsFocal || myCap?.isTicketFocal) {
                      assignedValues.push('freeze');
                    }
                    if (myCap?.isTicketSettingsFocal) {
                      assignedValues.push('open');
                    }
                    allowedValues = assignedValues;
                    break;
                  }
                  case 'in_progress':
                    allowedValues = (myCap?.isTicketSettingsFocal || myCap?.isTicketFocal)
                      ? ['resolved', 'pause', 'freeze']
                      : ['resolved', 'pause'];
                    break;
                  case 'resolved':
                    allowedValues = ['closed'];
                    break;
                  case 'freeze': {
                    if (myCap?.isTicketSettingsFocal || myCap?.isTicketFocal) {
                      const freezeValues = ['assigned', 'in_progress', 'resolved'];
                      if (myCap?.isTicketSettingsFocal) {
                        freezeValues.push('open');
                      }
                      allowedValues = freezeValues;
                    } else {
                      allowedValues = [];
                    }
                    break;
                  }
                  case 'pause':
                    allowedValues = ['in_progress', 'resolved'];
                    break;
                  default:
                    allowedValues = [];
                }
                const allowedOpts = STATUS_OPTS.filter((s) => allowedValues.includes(s.value));
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
                          <MenuItem key={s.value} value={s.value}>
                            {s.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
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
                        helperText={
                          needsPriority
                            ? 'Priority is required before moving to In Progress'
                            : undefined
                        }
                      >
                        {['low', 'medium', 'high', 'urgent'].map((p) => (
                          <MenuItem key={p} value={p}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" color="text.secondary">Resolution Notes (optional)</Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={async () => {
                            setKbPickerOpen(true);
                            if (kbArticles.length === 0) {
                              setKbLoading(true);
                              try {
                                const data = await knowledgeBaseApi.getInsights();
                                setKbArticles(data ?? []);
                              } catch { /* ignore */ }
                              setKbLoading(false);
                            }
                          }}
                          sx={{ fontSize: 11, py: 0.25, px: 1 }}
                        >
                          Load from KB
                        </Button>
                      </Box>
                      <TextField
                        fullWidth
                        multiline
                        rows={6}
                        label="Resolution Notes"
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        size="small"
                        placeholder="Describe what was done to resolve this ticket..."
                      />
                    </Grid>
                    {newStatus === 'resolved' && (
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={generateKb}
                              onChange={(e) => setGenerateKb(e.target.checked)}
                              size="small"
                            />
                          }
                          label={
                            <Typography variant="body2">
                              Generate Knowledge Base Article
                            </Typography>
                          }
                        />
                        {generateKb && (
                          <Typography variant="caption" color="text.secondary" display="block" ml={3.5}>
                            Our AI will automatically scrub sensitive data and create/update an article based on your resolution.
                          </Typography>
                        )}
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <Box display="flex" gap={1}>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleUpdateStatus()}
                          disabled={needsPriority}
                        >
                          Save
                        </Button>
                        <Button size="small" onClick={() => setEditingStatus(false)}>
                          Cancel
                        </Button>
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
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Description
              </Typography>
              <Typography variant="body2" whiteSpace="pre-wrap">
                {ticket.description}
              </Typography>
              
              {(() => {
                const initialAttachmentComment = ticket.comments?.find(
                  (c) => c.comment === '[Initial Ticket Attachment]' && c.attachmentPath
                );
                if (!initialAttachmentComment) return null;
                const fileExt = initialAttachmentComment.attachmentPath!.split('.').pop()?.toLowerCase();
                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt ?? '');
                const url = `/tickets/comment-attachment/${ticket.id}/${initialAttachmentComment.attachmentPath!.split('/').pop()}`;
                
                return (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Attached Image
                    </Typography>
                    {isImage ? (
                      <AuthImage
                        url={url}
                        alt="Initial Attachment"
                        style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 4, border: '1px solid var(--mui-palette-divider)' }}
                      />
                    ) : (
                      <Button variant="outlined" size="small" href={url} target="_blank">
                        View Attachment
                      </Button>
                    )}
                  </Box>
                );
              })()}

              {ticket.resolutionNotes && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Resolution Notes
                  </Typography>
                  <Typography variant="body2" whiteSpace="pre-wrap">
                    {ticket.resolutionNotes}
                  </Typography>
                </>
              )}

              {ticket.satisfactionRating && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Client Satisfaction
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <StarIcon
                        key={i}
                        sx={{
                          fontSize: 20,
                          color:
                            i < (ticket.satisfactionRating ?? 0)
                              ? 'warning.main'
                              : 'action.disabled',
                        }}
                      />
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
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Details
              </Typography>
              <Box display="flex" flexDirection="column" gap={1.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Ticket Number
                  </Typography>
                  <Typography variant="body2">{ticket.ticketNumber}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {(ticket as any).createdById &&
                      (ticket as any).createdById !== ticket.requesterId
                      ? 'Requested For'
                      : 'Requested By'}
                  </Typography>
                  <Typography variant="body2">
                    {(ticket as any).requester
                      ? `${(ticket as any).requester.firstName} ${(ticket as any).requester.lastName}`
                      : `User #${ticket.requesterId}`}
                  </Typography>
                </Box>
                {(ticket as any).createdById &&
                  (ticket as any).createdById !== ticket.requesterId && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Filed By (Proxy)
                      </Typography>
                      <Typography variant="body2">
                        {(ticket as any).createdBy
                          ? `${(ticket as any).createdBy.firstName} ${(ticket as any).createdBy.lastName}`
                          : `Staff #${(ticket as any).createdById}`}
                      </Typography>
                    </Box>
                  )}
                {ticket.assignedToId && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Assigned To
                    </Typography>
                    <Typography variant="body2">
                      {(ticket as any).assignedTo
                        ? `${(ticket as any).assignedTo.firstName} ${(ticket as any).assignedTo.lastName}`
                        : `User #${ticket.assignedToId}`}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body2">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                {ticket.resolvedAt && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Resolved
                    </Typography>
                    <Typography variant="body2">
                      {new Date(ticket.resolvedAt).toLocaleString()}
                    </Typography>
                  </Box>
                )}
                {ticket.slaDeadline && !ticket.isSlaWaiting && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        SLA Deadline
                      </Typography>
                      <Typography
                        variant="body2"
                        color={
                          ticket.resolvedAt
                            ? new Date(ticket.resolvedAt) > new Date(ticket.slaDeadline)
                              ? 'error.main'
                              : 'success.main'
                            : new Date() > new Date(ticket.slaDeadline)
                              ? 'error.main'
                              : 'text.primary'
                        }
                        fontWeight={600}
                      >
                        {new Date(ticket.slaDeadline).toLocaleString()}
                      </Typography>
                    </Box>
                    {ticket.resolvedAt && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Resolution Time vs SLA
                        </Typography>
                        <Typography
                          variant="body2"
                          color={
                            new Date(ticket.resolvedAt) > new Date(ticket.slaDeadline)
                              ? 'error.main'
                              : 'success.main'
                          }
                          fontWeight={600}
                        >
                          {new Date(ticket.resolvedAt) > new Date(ticket.slaDeadline)
                            ? `Missed SLA by ${Math.round(
                              (new Date(ticket.resolvedAt).getTime() -
                                new Date(ticket.slaDeadline).getTime()) /
                              (1000 * 60 * 60)
                            )} hr(s)`
                            : 'Met SLA'}
                        </Typography>
                      </Box>
                    )}
                    {!ticket.resolvedAt && new Date() > new Date(ticket.slaDeadline) && (
                      <Box mt={1}>
                        <Typography variant="caption" color="text.secondary">
                          Elapsed time after SLA Deadline
                        </Typography>
                        <Typography variant="body2" color="error.main" fontWeight={600}>
                          <OverdueTimer targetDate={ticket.slaDeadline} />
                        </Typography>
                      </Box>
                    )}
                  </>
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
            <Box textAlign="center" py={2}>
              <CircularProgress size={24} />
            </Box>
          ) : escalations.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No escalations for this ticket.
            </Typography>
          ) : (
            escalations.map((e) => (
              <Box key={e.id} mb={2} p={1.5} bgcolor="action.hover" borderRadius={1}>
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <Chip
                    label={e.status.toUpperCase()}
                    size="small"
                    color={
                      e.status === 'accepted'
                        ? 'success'
                        : e.status === 'returned'
                          ? 'error'
                          : 'warning'
                    }
                  />
                  <Typography variant="body2">
                    <strong>
                      {e.escalatedBy?.firstName} {e.escalatedBy?.lastName}
                    </strong>
                    {' → '}
                    <strong>
                      {e.escalatedTo?.firstName} {e.escalatedTo?.lastName}
                    </strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(e.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                {e.notes ? (
                  <Typography variant="body2" mt={0.5}>
                    Reason: {e.notes}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary" mt={0.5} fontStyle="italic">
                    No reason provided.
                  </Typography>
                )}
                {e.returnReason && (
                  <Typography variant="body2" color="error.main" mt={0.5}>
                    Return reason: {e.returnReason}
                  </Typography>
                )}
                {e.proofFiles && e.proofFiles.length > 0 ? (
                  <Box mt={1} display="flex" flexWrap="wrap" gap={1}>
                    {e.proofFiles.map((filePath, idx) => {
                      const parts = filePath.replace('escalation-proofs/', '').split('/');
                      const tid = parts[0] ?? ticketId;
                      const fname = encodeURIComponent(parts[1] ?? filePath);
                      const apiUrl = `/tickets/proof/${tid}/${fname}`;
                      const blobUrl = proofBlobUrls[apiUrl];
                      const allBlobUrls = (e.proofFiles ?? [])
                        .map((fp) => {
                          const p = fp.replace('escalation-proofs/', '').split('/');
                          const t2 = p[0] ?? ticketId;
                          const f2 = encodeURIComponent(p[1] ?? fp);
                          return proofBlobUrls[`/tickets/proof/${t2}/${f2}`];
                        })
                        .filter((u): u is string => Boolean(u) && u !== 'error');
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
                            p: 0,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            cursor: 'pointer',
                            background: 'transparent',
                            overflow: 'hidden',
                            width: 80,
                            height: 80,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
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
                            <Box sx={{ color: 'text.disabled', fontSize: 32, lineHeight: 1 }}>
                              ✕
                            </Box>
                          ) : (
                            <CircularProgress size={20} />
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                    No proof photo attached.
                  </Typography>
                )}
                {e.status === 'pending' &&
                  String(e.escalatedToId || e.escalatedTo?.id || (e as any).escalated_to_id) ===
                  String((user as any)?.id) && (
                    <Box mt={1} display="flex" gap={1}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => handleAcceptEscalation(e.id)}
                      >
                        Accept
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => {
                          setReturnEscalationId(e.id);
                          setReturnReason('');
                          setReturnDialogOpen(true);
                        }}
                      >
                        Return
                      </Button>
                    </Box>
                  )}
                {e.status === 'pending' &&
                  (e.escalatedById || e.escalatedBy?.id || (e as any).escalated_by_id) ===
                  (user as any)?.id && (
                    <Box mt={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="info"
                        startIcon={<UploadIcon />}
                        onClick={() => {
                          setAddProofEscalationId(e.id);
                          setAddProofNotes(e.notes ?? '');
                          setAddProofFiles([]);
                          setAddProofDialogOpen(true);
                        }}
                      >
                        Add Notes / Proof
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
                          {(() => {
                            if (!c.user) return null;
                            const isAssignedTech = (ticket as any)?.assignedToId === c.user.id;
                            const isAdminOrFocal = c.user.role === UserRole.SUPER_ADMIN || c.user.ticketMainFocal;

                            if (isAdminOrFocal) {
                              return <Chip label={c.user.role === UserRole.SUPER_ADMIN ? "Admin" : "Focal"} size="small" color="error" />;
                            }
                            if (isAssignedTech) {
                              return <Chip label="Assigned Tech" size="small" color="primary" />;
                            }
                            return <Chip label="User" size="small" sx={{ bgcolor: 'grey.300', color: 'grey.800' }} />;
                          })()}
                          {c.isInternal && (
                            <Chip
                              label="Internal"
                              size="small"
                              color="default"
                              variant="outlined"
                            />
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {new Date(c.createdAt).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography
                            variant="body2"
                            color="text.primary"
                            whiteSpace="pre-wrap"
                            mt={0.5}
                          >
                            {c.comment}
                          </Typography>
                          {c.attachmentPath && (
                            <Box mt={1}>
                              <AuthImage
                                url={`/tickets/comment-attachment/${c.ticketId}/${c.attachmentPath.split('/').pop()}`}
                                alt="Comment Attachment"
                                style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px' }}
                              />
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {i < sortedComments.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No comments yet.
            </Typography>
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
                  control={
                    <Switch
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="caption">Internal note (hidden from requester)</Typography>
                  }
                  sx={{ mt: 1 }}
                />
              )}
              <Box mt={1} display="flex" alignItems="center" gap={2}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleAddComment}
                  disabled={submittingComment || (!comment.trim() && !commentAttachment)}
                >
                  {submittingComment ? 'Submitting…' : 'Add Comment'}
                </Button>

                <Button variant="outlined" component="label" size="small">
                  Attach Picture
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setCommentAttachment(e.target.files[0]);
                      }
                    }}
                  />
                </Button>

                {commentAttachment && (
                  <Chip
                    label={commentAttachment.name}
                    onDelete={() => setCommentAttachment(null)}
                    size="small"
                  />
                )}
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
            <Box textAlign="center" py={2}>
              <CircularProgress size={24} />
            </Box>
          ) : timelineEvents.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No events recorded yet.
            </Typography>
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
                  escalation_accepted: 'Escalation Accepted',
                  escalation_returned: 'Escalation Returned',
                  satisfaction_submitted: 'Satisfaction Submitted',
                  rated: 'Rated',
                };
                const label = EVENT_LABELS[ev.eventType] ?? ev.eventType.replace(/_/g, ' ');
                const actorLine = ev.actorName
                  ? `by ${ev.actorName}`
                  : ev.eventType === 'auto_assigned'
                    ? 'by System'
                    : '';
                return (
                  <Box key={ev.id} display="flex" gap={2} mb={isLast ? 0 : 2}>
                    <Box display="flex" flexDirection="column" alignItems="center">
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          mt: 0.5,
                          flexShrink: 0,
                        }}
                      />
                      {!isLast && (
                        <Box
                          sx={{ width: 2, flex: 1, bgcolor: 'divider', mt: 0.5, minHeight: 20 }}
                        />
                      )}
                    </Box>
                    <Box pb={isLast ? 0 : 1}>
                      <Typography variant="body2" fontWeight={600}>
                        {label}
                      </Typography>
                      {actorLine && (
                        <Typography variant="caption" color="text.secondary">
                          {actorLine}
                        </Typography>
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
      <Dialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{isEscalateMode ? 'Escalate Ticket' : 'Assign Technician'}</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={technicians}
            getOptionLabel={(t) => `${t.firstName} ${t.lastName} (${t.openCount} open)`}
            value={technicians.find((t) => t.id === assignToId) ?? null}
            onChange={(_, newValue) => setAssignToId(newValue ? Number(newValue.id) : '')}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Assign Technician"
                fullWidth
                size="small"
                sx={{ mt: 1 }}
                error={technicians.length === 0}
                helperText={technicians.length === 0 ? 'No eligible technicians found' : ''}
              />
            )}
            clearOnEscape
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={isEscalateMode ? 'warning' : 'primary'}
            onClick={handleAssign}
            disabled={!assignToId}
          >
            {isEscalateMode ? 'Escalate' : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dedicated Escalate Dialog ── */}
      <Dialog
        open={escalateDialogOpen}
        onClose={() => setEscalateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Escalate Ticket</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            Escalate this ticket to a designated focal technician or senior staff. You may attach
            photo proof of the issue.
          </Alert>
          <Autocomplete
            options={escalationFocalUsers}
            getOptionLabel={(t) => `${t.firstName} ${t.lastName}`}
            value={escalationFocalUsers.find((t) => t.id === escalateToId) ?? null}
            onChange={(_, newValue) => setEscalateToId(newValue ? Number(newValue.id) : '')}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Escalate To"
                fullWidth
                size="small"
                sx={{ mb: 2 }}
                error={escalationFocalUsers.length === 0}
                helperText={
                  escalationFocalUsers.length === 0
                    ? 'No escalation focals configured for this ticket type'
                    : ''
                }
              />
            )}
            clearOnEscape
            fullWidth
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for escalation (optional)"
            value={escalateNotes}
            onChange={(e) => setEscalateNotes(e.target.value)}
            size="small"
            sx={{ mb: 2 }}
          />
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Proof photos (optional, max 10 files, 10 MB each)
            </Typography>
            <Button component="label" variant="outlined" size="small" startIcon={<UploadIcon />}>
              Upload Proof Photo(s)
              <input
                type="file"
                hidden
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  const validFiles = files.filter((f) => f.type === 'image/jpeg' || f.type === 'image/png' || f.type === 'image/webp');
                  if (validFiles.length !== files.length) {
                    enqueueSnackbar('Only JPEG, PNG, and WebP image files are allowed.', {
                      variant: 'error',
                    });
                  }
                  setEscalateFiles(validFiles);
                }}
              />
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
          <Button
            variant="contained"
            color="warning"
            onClick={handleEscalate}
            disabled={!escalateToId || escalating}
          >
            {escalating ? 'Escalating…' : 'Escalate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Return Escalation Dialog ── */}
      <Dialog
        open={returnDialogOpen}
        onClose={() => setReturnDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Return Ticket</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for returning *"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            size="small"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReturnEscalation}
            disabled={!returnReason.trim()}
          >
            Return Ticket
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Notes / Proof to Pending Escalation Dialog ── */}
      <Dialog
        open={addProofDialogOpen}
        onClose={() => setAddProofDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Notes / Proof to Escalation</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            You can update the reason and attach additional proof photos to your pending escalation.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Updated reason / notes"
            value={addProofNotes}
            onChange={(e) => setAddProofNotes(e.target.value)}
            size="small"
            sx={{ mb: 2 }}
          />
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Additional proof photos (max 10 files, 10 MB each)
            </Typography>
            <Button component="label" variant="outlined" size="small" startIcon={<UploadIcon />}>
              Upload Photo(s)
              <input
                type="file"
                hidden
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  const validFiles = files.filter((f) => f.type === 'image/jpeg' || f.type === 'image/png' || f.type === 'image/webp');
                  if (validFiles.length !== files.length) {
                    enqueueSnackbar('Only JPEG, PNG, and WebP image files are allowed.', {
                      variant: 'error',
                    });
                  }
                  setAddProofFiles(validFiles);
                }}
              />
            </Button>
            {addProofFiles.length > 0 && (
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                {addProofFiles.length} new file(s) selected
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddProofDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddProof}
            disabled={addingProof || (!addProofNotes.trim() && addProofFiles.length === 0)}
          >
            {addingProof ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Duplicate Confirmation Dialog ── */}
      <Dialog
        open={dupConfirmOpen}
        onClose={() => setDupConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Mark Ticket as Duplicate?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            This action is <strong>permanent</strong>. Once a ticket is marked as Duplicate it
            cannot be updated or re-assigned. You will be prompted to select the original ticket in
            the next step.
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
            <Alert severity="info" sx={{ mt: 1 }}>
              No other open tickets found for this requester.
            </Alert>
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
            <Alert severity="success" sx={{ mt: 2 }}>
              You have already submitted a satisfaction rating for this ticket. Thank you!
            </Alert>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={csatForm.consentGiven}
                    onChange={(e) => setCsatForm((f) => ({ ...f, consentGiven: e.target.checked }))}
                  />
                }
                label={
                  <Typography variant="body2">
                    I voluntarily give my consent for the use of my personal information. I confirm
                    that I have read the provided information, or it has been read to me. I have had
                    the opportunity to ask questions about it, and any inquiries I made were
                    answered to my satisfaction. I understand that any information collected will be
                    utilized solely to enhance the basic social services provided by the DSWD.
                  </Typography>
                }
              />
              <Stack direction="row" spacing={2}>
                <Autocomplete
                  options={unitSuggestions}
                  freeSolo
                  fullWidth
                  disabled={!!user?.units?.[0]?.name}
                  value={csatForm.unitSection}
                  onInputChange={(_, v) => setCsatForm((f) => ({ ...f, unitSection: v }))}
                  renderInput={(params) => <TextField {...params} label="Unit/Section *" />}
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
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="First Name *"
                  disabled={!!user?.firstName}
                  value={csatForm.clientFirstName}
                  onChange={(e) => setCsatForm((f) => ({ ...f, clientFirstName: e.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Middle Initial"
                  disabled={!!user?.middleName}
                  value={csatForm.clientMiddleInitial}
                  onChange={(e) =>
                    setCsatForm((f) => ({ ...f, clientMiddleInitial: e.target.value.substring(0, 1) }))
                  }
                  sx={{ width: 100 }}
                />
                <TextField
                  label="Last Name *"
                  disabled={!!user?.lastName}
                  value={csatForm.clientLastName}
                  onChange={(e) => setCsatForm((f) => ({ ...f, clientLastName: e.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Suffix"
                  disabled={!!user?.suffix}
                  value={csatForm.suffix}
                  onChange={(e) => setCsatForm((f) => ({ ...f, suffix: e.target.value }))}
                  sx={{ width: 100 }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Age"
                  type="number"
                  inputProps={{ min: 20, max: 89 }}
                  value={csatForm.age ?? ''}
                  onChange={(e) => setCsatForm((f) => ({ ...f, age: Number(e.target.value) }))}
                  sx={{ maxWidth: 200 }}
                />
                <TextField
                  label="Religion"
                  value={csatForm.religion ?? ''}
                  onChange={(e) => setCsatForm((f) => ({ ...f, religion: e.target.value }))}
                  sx={{ flex: 1 }}
                />
                <TextField
                  select
                  label="Sex *"
                  disabled={!!user?.sex}
                  value={csatForm.sex}
                  onChange={(e) => setCsatForm((f) => ({ ...f, sex: e.target.value }))}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                  <MenuItem value="Prefer Not to Say">Prefer Not to Say</MenuItem>
                </TextField>
                <TextField
                  label="Contact Number"
                  disabled={!!user?.phoneNumber}
                  value={csatForm.contactNumber ?? ''}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setCsatForm((f) => ({ ...f, contactNumber: digits }));
                  }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">+63</InputAdornment>,
                  }}
                  inputProps={{ inputMode: 'numeric' }}
                  sx={{ flex: 1 }}
                />
              </Stack>
              <TextField
                label="Technician Name"
                value={csatForm.technicianName}
                InputProps={{ readOnly: true }}
                disabled
              // fullWidth
              />

              <Typography variant="subtitle2" fontWeight={700} mt={1}>
                INSTRUCTION:
              </Typography>
              <Typography variant="body2">
                For Service Quality Dimension 0-8, please select the number that best corresponds to
                your answer.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {' '}
                5-Strongly Agree, 4-Agree, 3-Neither Agree nor Disagree, 2-Disagree, 1-Strongly
                Disagree, N/A-Not Applicable
              </Typography>

              {(
                [
                  'I am satisfied with the service that I availed.',
                  'I spent a reasonable amount of time for my transaction.',
                  "The office followed the transaction's requirements and steps based on the information provided",
                  'The steps (including payment) I need to do for my transaction were easy and simple.',
                  'I easily found information about my transaction from the office or its website.',
                  "I paid a reasonable amount of fees for my transaction. (If services was free, mark the 'N/A' column) (You may skip this).",
                  'I feel the office was fair to everyone, or "walang palakasan", during my transaction.',
                  'I was treated courteously by the staff, and (if asked for help) the staff was helpful.',
                  'I got what I needed from the government office, or (if denied) denial of request was sufficiently explained to me.',
                ] as string[]
              ).map((item, idx) => {
                const isNA = [3, 5, 8].includes(idx);
                const val = csatForm.likert[idx];
                return (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: 1,
                    }}
                  >
                    <Typography variant="body2" sx={{ flex: 1, minWidth: 0, mb: { xs: 1, sm: 0 } }}>
                      {idx}. {item}
                    </Typography>
                    {isNA ? (
                      <Chip
                        size="small"
                        label="N/A"
                        color="default"
                        sx={{ minWidth: 64, alignSelf: { xs: 'flex-start', sm: 'auto' } }}
                      />
                    ) : (
                      <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={val === 0 ? null : val}
                        sx={{ alignSelf: { xs: 'center', sm: 'auto' } }}
                        onChange={(_, v) => {
                          if (v !== null) {
                            const updated = [...csatForm.likert] as Array<number | 'NA'>;
                            updated[idx] = v as number;
                            setCsatForm((f) => ({ ...f, likert: updated }));
                          }
                        }}
                      >
                        <ToggleButton
                          value={1}
                          sx={{
                            px: 0.5,
                            border: 'none',
                            '&.Mui-selected': { bgcolor: 'transparent' },
                          }}
                        >
                          <SentimentVeryDissatisfied
                            sx={{ color: val === 1 ? '#d32f2f' : 'action.disabled', fontSize: 28 }}
                          />
                        </ToggleButton>
                        <ToggleButton
                          value={2}
                          sx={{
                            px: 0.5,
                            border: 'none',
                            '&.Mui-selected': { bgcolor: 'transparent' },
                          }}
                        >
                          <SentimentDissatisfied
                            sx={{ color: val === 2 ? '#ed6c02' : 'action.disabled', fontSize: 28 }}
                          />
                        </ToggleButton>
                        <ToggleButton
                          value={3}
                          sx={{
                            px: 0.5,
                            border: 'none',
                            '&.Mui-selected': { bgcolor: 'transparent' },
                          }}
                        >
                          <SentimentNeutral
                            sx={{ color: val === 3 ? '#f5a623' : 'action.disabled', fontSize: 28 }}
                          />
                        </ToggleButton>
                        <ToggleButton
                          value={4}
                          sx={{
                            px: 0.5,
                            border: 'none',
                            '&.Mui-selected': { bgcolor: 'transparent' },
                          }}
                        >
                          <SentimentSatisfied
                            sx={{ color: val === 4 ? '#2e7d32' : 'action.disabled', fontSize: 28 }}
                          />
                        </ToggleButton>
                        <ToggleButton
                          value={5}
                          sx={{
                            px: 0.5,
                            border: 'none',
                            '&.Mui-selected': { bgcolor: 'transparent' },
                          }}
                        >
                          <SentimentVerySatisfied
                            sx={{ color: val === 5 ? '#1976d2' : 'action.disabled', fontSize: 28 }}
                          />
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
            <Button
              onClick={handleSubmitSatisfaction}
              variant="contained"
              color="warning"
              disabled={csatSubmitting || !csatForm.consentGiven}
            >
              {csatSubmitting ? 'Submitting…' : 'Submit Feedback'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      {/* ── Photo Lightbox Modal ── */}
      <Dialog
        open={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: 'black', borderRadius: 2, position: 'relative' } }}
      >
        <DialogContent
          sx={{
            p: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
            position: 'relative',
          }}
        >
          {photoModalSrcs.length > 0 && (
            <Box
              component="img"
              src={photoModalSrcs[photoModalIdx]}
              alt={`Proof photo ${photoModalIdx + 1}`}
              sx={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                display: 'block',
                mx: 'auto',
              }}
            />
          )}
          {photoModalSrcs.length > 1 && (
            <>
              <IconButton
                onClick={() =>
                  setPhotoModalIdx((i) => (i - 1 + photoModalSrcs.length) % photoModalSrcs.length)
                }
                sx={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'white',
                  bgcolor: 'rgba(0,0,0,0.4)',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                }}
              >
                <NavigateBefore />
              </IconButton>
              <IconButton
                onClick={() => setPhotoModalIdx((i) => (i + 1) % photoModalSrcs.length)}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'white',
                  bgcolor: 'rgba(0,0,0,0.4)',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                }}
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
          <Button onClick={() => setPhotoModalOpen(false)} sx={{ color: 'grey.300' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── KB Picker Dialog ── */}
      <Dialog open={kbPickerOpen} onClose={() => setKbPickerOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Load from Knowledge Base</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            size="small"
            placeholder="Search articles by title or content..."
            value={kbSearch}
            onChange={(e) => setKbSearch(e.target.value)}
            sx={{ mb: 2 }}
          />
          {kbLoading ? (
            <Box display="flex" justifyContent="center" py={3}><CircularProgress size={28} /></Box>
          ) : (
            <List disablePadding>
              {(kbSearch
                ? kbArticles.filter((a) =>
                    a.title?.toLowerCase().includes(kbSearch.toLowerCase()) ||
                    a.content?.toLowerCase().includes(kbSearch.toLowerCase()))
                : kbArticles
              ).length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={3} fontSize={14}>
                  {kbArticles.length === 0 ? 'No KB articles available yet.' : 'No articles match your search.'}
                </Typography>
              ) : (
                (kbSearch
                  ? kbArticles.filter((a) =>
                      a.title?.toLowerCase().includes(kbSearch.toLowerCase()) ||
                      a.content?.toLowerCase().includes(kbSearch.toLowerCase()))
                  : kbArticles
                ).map((article: any) => (
                  <React.Fragment key={article.id}>
                    <ListItem
                      alignItems="flex-start"
                      sx={{ cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => {
                        setResolutionNotes(article.content ?? '');
                        setKbPickerOpen(false);
                        setKbSearch('');
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography fontWeight={600} fontSize={14}>{article.title}</Typography>
                        }
                        secondary={
                          <Typography fontSize={12} color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                            {article.content?.slice(0, 200)}{(article.content?.length ?? 0) > 200 ? '…' : ''}
                          </Typography>
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setKbPickerOpen(false); setKbSearch(''); }}>Cancel</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
