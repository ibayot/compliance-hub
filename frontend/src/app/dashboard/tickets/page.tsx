'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
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
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  CircularProgress,
  Rating,
  Tooltip,
  Alert,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  Tab,
  Tabs,
  useMediaQuery,
  useTheme,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  AssignmentInd as AssignIcon,
  ThumbUp as SatisfactionIcon,
  Computer as DesktopIcon,
  Wifi as ITIcon,
  Assignment as PantawidIcon,
  SentimentVerySatisfied,
  SentimentSatisfied,
  SentimentNeutral,
  SentimentDissatisfied,
  SentimentVeryDissatisfied,
  FiberManualRecord,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ticketsApi,
  Ticket,
  CreateTicketDto,
  TicketStatus,
  TicketType,
  TicketPriority,
  TechnicianOption,
  TicketCategory,
  ticketSettingsApi,
  attendanceApi,
  knowledgeBaseApi,
  CsatFormData,
  TicketEscalation,
} from '@/app/api/references';
import { usersApi, UserRecord } from '@/lib/api/users';
import { useAutoRefresh } from '@/lib/utils/useAutoRefresh';

import { PRIORITY_COLOR, STATUS_COLOR, TICKET_TYPE_LABELS } from '@/lib/utils/ticket-colors';

import { unitsApi } from '@/lib/api/units';

function ticketTypeIcon(t: TicketType) {
  if (t === 'desktop_support') return <DesktopIcon />;
  if (t === 'pantawid_ict_support') return <PantawidIcon />;
  return <ITIcon />;
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

export default function TicketsPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, myCap } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showMyTickets, setShowMyTickets] = useState(false);
  const [showEscalatedToMe, setShowEscalatedToMe] = useState(false);
  const [myTicketsCount, setMyTicketsCount] = useState(0);
  const [escalatedToMeCount, setEscalatedToMeCount] = useState(0);
  const [globalConfig, setGlobalConfig] = useState<any>(null);

  useEffect(() => {
    ticketSettingsApi.getGlobalConfig().then(setGlobalConfig).catch(console.error);
  }, []);

  // Pagination for non-admin active tabs
  const [page, setPage] = useState(1);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateTicketDto>({
    subject: '',
    description: '',
    ticketType: 'it_support',
    priority: undefined,
  });
  const [disposalDetails, setDisposalDetails] = useState({
    equipmentType: '',
    serialNumber: '',
    propertyNumber: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [kbSuggestions, setKbSuggestions] = useState<any[]>([]);
  const [loadingKb, setLoadingKb] = useState(false);
  const [expandedKbId, setExpandedKbId] = useState<number | null>(null);

  // Assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningTicket, setAssigningTicket] = useState<Ticket | null>(null);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [isEscalateMode, setIsEscalateMode] = useState(false);
  const [escalationStateByTicket, setEscalationStateByTicket] = useState<
    Record<string, 'none' | 'returned' | 'active'>
  >({});

  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [escalationFocalUsers, setEscalationFocalUsers] = useState<TechnicianOption[]>([]);
  const [escalateToId, setEscalateToId] = useState<string>('');
  const [escalateNotes, setEscalateNotes] = useState('');
  const [escalateFiles, setEscalateFiles] = useState<File[]>([]);
  const [escalating, setEscalating] = useState(false);
  const [allEscalations, setAllEscalations] = useState<TicketEscalation[]>([]);

  // Satisfaction dialog
  const [satDialogOpen, setSatDialogOpen] = useState(false);
  const [satTicket, setSatTicket] = useState<Ticket | null>(null);
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

  // Pending satisfaction ratings — loaded once for USER role to show warning before new ticket
  const [pendingSatCount, setPendingSatCount] = useState(0);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('Pending Satisfaction Reminder');
  const [reminderMessage, setReminderMessage] = useState('');

  // DB-driven role capabilities (is_all_tickets, is_ticket_focal) — loaded from AuthContext
  // (also available: myCap?.isEscalationFocal, myCap?.isTicketSettingsFocal, myCap?.isFocal)

  const isFocalTech = !!myCap?.isFocal && (!!myCap?.isDesktop || !!myCap?.isItSupport || !!myCap?.isPantawidIct);
  const isLowerLevelTech = (!!myCap?.isDesktop || !!myCap?.isItSupport || !!myCap?.isPantawidIct) && !myCap?.isFocal;
  const isJuniorTech = isLowerLevelTech;
  // ITO staff roles: see only their own tickets (restricted view), same as junior techs
  const isItoRole = !!myCap?.isIto;
  const isTechnician = isFocalTech || isLowerLevelTech || isJuniorTech || isItoRole;
  const isFocal = !!myCap?.isFocal;
  // DB-driven: is_all_tickets column
  const canManageAll = !!myCap?.isAllTickets;
  // Matrix-driven: Escalated To Me tab is visible when Escalation capability is ticked.
  const canViewEscalatedQueue = !!myCap?.isEscalationFocal;
  // DB-driven: is_ticket_focal column — who can manually assign/reassign tickets
  const canAssign = !!myCap?.isTicketFocal || !!myCap?.isTicketSettingsFocal;
  // Matrix-driven escalation eligibility:
  // show action for technician tracks plus ticket admin/assign/all-ticket capabilities.
  const canEscalate =
    !!myCap?.isTicketSettingsFocal ||
    !!myCap?.isTicketFocal ||
    !!(
      myCap?.isDesktop ||
      myCap?.isItSupport ||
      myCap?.isPantawidIct ||
      myCap?.isAllTickets
    );

  // Senior technician tab state (isFocalTech && !canManageAll view)
  const [ticketTab, setTicketTab] = useState(0);
  // Management tab state (canManageAll view: CO, SH, super_admin)
  // 0=All, 1=Active, 2=Resolved/Closed, 3=Frozen, 4=Duplicate, 5=Proxy Requests
  const [mgmtTab, setMgmtTab] = useState(0);
  // User tab state (!isTechnician && !canManageAll view)
  // 0 = All, 1 = Active, 2 = To Rate, 3 = Closed, 4 = Requested For
  const [userTab, setUserTab] = useState(0);

  const activeTickets = tickets.filter((t) =>
    ['open', 'assigned', 'in_progress'].includes(t.status),
  );
  const doneTickets = tickets.filter((t) => ['resolved', 'closed'].includes(t.status));
  const frozenTickets = tickets.filter((t) => t.status === 'freeze');
  const duplicateTickets = tickets.filter((t) => t.status === 'duplicate');

  const toRateTickets = tickets.filter(
    (t) =>
      (t.status === 'resolved' || t.status === 'closed') &&
      t.requesterId === user?.id &&
      !t.satisfactionSubmittedAt,
  );

  // Tickets that were requested FOR this user (someone else filed on their behalf)
  const requestedForTickets = tickets.filter(
    (t) => t.requesterId === user?.id && t.createdById != null && t.createdById !== user?.id,
  );

  // For management/RICTMS: tickets this user created on behalf of someone else
  const proxyCreatedTickets = tickets.filter(
    (t) => t.createdById === user?.id && t.requesterId !== user?.id,
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('filter') === 'pending_satisfaction') {
        setUserTab(2);
      }
    }
  }, []);

  const tabFilteredTickets = canManageAll
    ? ([tickets, activeTickets, doneTickets, frozenTickets, duplicateTickets, proxyCreatedTickets][
      mgmtTab
    ] ?? tickets)
    : isTechnician
      ? ([activeTickets, doneTickets, frozenTickets, duplicateTickets][ticketTab] ?? tickets)
      : ([tickets, activeTickets, toRateTickets, doneTickets, proxyCreatedTickets][userTab] ??
        tickets);

  const refreshEscalationStates = useCallback(
    async (rows: Ticket[]) => {
      if (!canEscalate) return;
      const candidates = rows
        .filter((t) => !['duplicate', 'closed', 'resolved'].includes(t.status))
        .slice(0, 80);
      if (candidates.length === 0) return;

      const entries = await Promise.all(
        candidates.map(async (t) => {
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
        }),
      );

      setEscalationStateByTicket((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    },
    [canEscalate],
  );

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ticketsApi.getAll({
        status: (filterStatus as TicketStatus) || undefined,
        ticketType: (filterType as TicketType) || undefined,
        // assignedToId: showMyTickets && isFocalTech && !showEscalatedToMe ? user?.id : undefined,
        assignedToId: showMyTickets && !showEscalatedToMe ? user?.id : undefined,
        escalatedToMe: showEscalatedToMe && canViewEscalatedQueue,
      });
      setTickets(data);

      const stats = await ticketsApi.getDashboardStats();
      setPendingSatCount(stats.pendingSatisfactionTickets?.length ?? 0);
      setMyTicketsCount(stats.myTicketsCount ?? 0);
      setEscalatedToMeCount(stats.escalatedToMeCount ?? 0);

      if (canManageAll) {
        const escalations = await ticketsApi.getAllEscalations();
        setAllEscalations(escalations);
      }
    } catch {
      enqueueSnackbar('Failed to load tickets', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [
    filterStatus,
    filterType,
    showMyTickets,
    showEscalatedToMe,
    canViewEscalatedQueue,
    isFocalTech,
    user?.id,
    canManageAll,
  ]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    const rows = canManageAll
      ? ([tickets, activeTickets, doneTickets, frozenTickets, duplicateTickets][mgmtTab] ?? tickets)
      : isTechnician
        ? ([activeTickets, doneTickets, frozenTickets, duplicateTickets][ticketTab] ?? tickets)
        : tickets;
    refreshEscalationStates(rows);
  }, [tickets, canManageAll, isTechnician, mgmtTab, ticketTab, refreshEscalationStates]);

  // For non-super admins: load pending satisfaction count and badge counts
  // useEffect(() => {
  //   if (!canManageAll) {
  //     ticketsApi
  //       .getDashboardStats()
  //       .then((stats) => {
  //         setPendingSatCount(stats.pendingSatisfactionTickets?.length ?? 0);
  //         setMyTicketsCount(stats.myTicketsCount ?? 0);
  //         setEscalatedToMeCount(stats.escalatedToMeCount ?? 0);
  //       })
  //       .catch(() => { });
  //   }
  // }, [canManageAll]);

  // Check DB escalation_focal_configs to see if the current user's role is a configured focal
  // NOTE: isEscalationFocal is now read from myCap?.isEscalationFocal (AuthContext)
  // The escalation_focal_configs table is still used only for the assign dialog recipient list.

  // Silent auto-refresh — no loading spinner to avoid flicker on background polls
  const silentFetchTickets = useCallback(async () => {
    try {
      const data = await ticketsApi.getAll({
        status: (filterStatus as TicketStatus) || undefined,
        ticketType: (filterType as TicketType) || undefined,
        // assignedToId: showMyTickets && isFocalTech && !showEscalatedToMe ? user?.id : undefined,
        assignedToId: showMyTickets && !showEscalatedToMe ? user?.id : undefined,
        escalatedToMe: showEscalatedToMe && canViewEscalatedQueue,
      });
      setTickets(data);

      const stats = await ticketsApi.getDashboardStats();
      setPendingSatCount(stats.pendingSatisfactionTickets?.length ?? 0);
      setMyTicketsCount(stats.myTicketsCount ?? 0);
      setEscalatedToMeCount(stats.escalatedToMeCount ?? 0);
    } catch {
      /* silent */
    }
  }, [
    filterStatus,
    filterType,
    showMyTickets,
    showEscalatedToMe,
    canViewEscalatedQueue,
    isFocalTech,
    user?.id,
  ]);
  useAutoRefresh(silentFetchTickets);

  useEffect(() => {
    // Load users for everyone so they can request tickets for others (Proxy Creation)
    usersApi
      .list()
      .then((users) => setAllUsers(users.filter((u) => u.active)))
      .catch(() => { });
  }, []);

  // Fetch categories when the New Ticket dialog opens or support type changes
  // Pass activeOnly=true so only active categories appear in the creation dropdown
  useEffect(() => {
    if (newDialogOpen) {
      ticketSettingsApi
        .getCategories(form.ticketType, true)
        .then(setCategories)
        .catch(() => setCategories([]));
    }
  }, [newDialogOpen, form.ticketType]);

  // Poll categories every 10s while dialog is open so admin changes (activate/deactivate)
  // are reflected without requiring the user to close and re-open the dialog.
  useEffect(() => {
    if (!newDialogOpen) return;
    const id = setInterval(() => {
      ticketSettingsApi
        .getCategories(form.ticketType, true)
        .then(setCategories)
        .catch(() => { }); // silent — don't show errors on background polls
    }, 10_000);
    return () => clearInterval(id);
  }, [newDialogOpen, form.ticketType]);

  useEffect(() => {
    if (!form.subject || form.subject.length < 5) {
      setKbSuggestions([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      try {
        setLoadingKb(true);
        const results = await knowledgeBaseApi.search(form.subject);
        setKbSuggestions(results);
      } catch (err) {
        setKbSuggestions([]);
      } finally {
        setLoadingKb(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [form.subject]);

  const handleRateKb = async (id: number, isHelpful: boolean) => {
    try {
      await knowledgeBaseApi.rateArticle(id, isHelpful);
      enqueueSnackbar('Thank you for your feedback!', { variant: 'success' });
      if (isHelpful) {
        // Abandon ticket
        setNewDialogOpen(false);
        setForm({
          subject: '',
          description: '',
          ticketType: 'it_support',
          priority: undefined,
          categoryId: undefined,
        });
      } else {
        setKbSuggestions([]);
      }
    } catch {
      enqueueSnackbar('Failed to submit rating.', { variant: 'error' });
    }
  };

  const handleSubmitTicket = async () => {
    if (!form.subject.trim() || !form.description.trim()) {
      enqueueSnackbar('Subject and description are required.', { variant: 'warning' });
      return;
    }

    let finalDescription = form.description;
    const selectedCat = categories.find((c) => c.id === form.categoryId);
    if (selectedCat && selectedCat.name.toLowerCase().includes('disposal')) {
      finalDescription += `\n\n--- Disposal Details ---\nEquipment Type: ${disposalDetails.equipmentType}\nSerial Number: ${disposalDetails.serialNumber}\nProperty Number: ${disposalDetails.propertyNumber}\nReason: ${disposalDetails.reason}`;
    }

    try {
      setSubmitting(true);
      
      let payload: CreateTicketDto | FormData;
      if (selectedImage) {
        const formData = new FormData();
        formData.append('subject', form.subject);
        formData.append('description', finalDescription);
        formData.append('ticketType', form.ticketType);
        if (form.priority) formData.append('priority', form.priority);
        if (form.categoryId) formData.append('categoryId', form.categoryId);
        if (form.issueType) formData.append('issueType', form.issueType);
        if (form.issueTypeId) formData.append('issueTypeId', form.issueTypeId);
        if (form.requesterId) formData.append('requesterId', form.requesterId.toString());
        formData.append('image', selectedImage);
        payload = formData;
      } else {
        payload = { ...form, description: finalDescription };
      }

      await ticketsApi.create(payload);
      enqueueSnackbar('Ticket submitted successfully!', { variant: 'success' });
      setNewDialogOpen(false);
      setForm({
        subject: '',
        description: '',
        ticketType: 'it_support',
        priority: undefined,
        categoryId: undefined,
      });
      setSelectedImage(null);
      setDisposalDetails({
        equipmentType: '',
        serialNumber: '',
        propertyNumber: '',
        reason: '',
      });
      setPendingSatCount(0);
      fetchTickets();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to submit ticket', {
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenNewTicket = () => {
    if (!canManageAll) {
      ticketsApi
        .getDashboardStats()
        .then((stats) => {
          const pendingCount = stats.pendingSatisfactionTickets?.length ?? 0;
          setPendingSatCount(pendingCount);

          if (pendingCount > 0) {
            setReminderTitle('Pending Satisfaction Reminder');
            setReminderMessage(
              `You still have ${pendingCount} unresolved satisfaction rating${pendingCount > 1 ? 's' : ''}. We recommend rating your resolved tickets, but you may proceed to open a new request.`,
            );
            setReminderOpen(true);
            return;
          }

          setNewDialogOpen(true);
        })
        .catch(() => {
          setNewDialogOpen(true);
        });
      return;
    }

    setNewDialogOpen(true);
  };

  const openAssignDialog = async (ticket: Ticket) => {
    setAssigningTicket(ticket);
    setSelectedTechId('');
    try {
      const techs = await ticketsApi.getTechnicians();
      const availableByAttendance = techs.filter(
        (t) => !t.isUnavailable && !['absent', 'out_of_office', 'half_day'].includes(t.attendanceStatus ?? ''),
      );
      setTechnicians(availableByAttendance);
      // Only pre-select current assignee if they're still in the available list
      const isCurrentAssigneeAvailable = availableByAttendance.some(
        (t) => t.id === ticket.assignedToId,
      );
      if (isCurrentAssigneeAvailable && ticket.assignedToId) {
        setSelectedTechId(String(ticket.assignedToId));
      }
    } catch {
      setTechnicians([]);
    }
    setAssignDialogOpen(true);
  };

  const openEscalateDialog = async (ticket: Ticket) => {
    try {
      const escalations = await ticketsApi.getEscalations(ticket.id);
      const latest = escalations[0];
      if (latest && latest.status !== 'returned') {
        setEscalationStateByTicket((prev) => ({ ...prev, [ticket.id]: 'active' }));
        enqueueSnackbar(
          'This ticket already has an active escalation. You can escalate again only after it is returned.',
          { variant: 'warning' },
        );
        return;
      }
      setEscalationStateByTicket((prev) => ({
        ...prev,
        [ticket.id]: latest?.status === 'returned' ? 'returned' : 'none',
      }));
    } catch {
      // ignore
    }

    setAssigningTicket(ticket);
    try {
      const [focals, itoUsers, supportUsers] = await Promise.all([
        ticketSettingsApi.getEscalationFocals(ticket.ticketType),
        attendanceApi.getTechnicians('ito'),
        attendanceApi.getTechnicians(ticket.ticketType),
      ]);
      const mergedUsers = [...itoUsers, ...supportUsers].filter(
        (u, idx, arr) => arr.findIndex((x) => x.id === u.id) === idx,
      );

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

  const handleEscalate = async () => {
    if (!assigningTicket || !escalateToId) return;
    try {
      setEscalating(true);
      const formData = new FormData();
      formData.append('escalatedToId', escalateToId);
      if (escalateNotes.trim()) formData.append('reason', escalateNotes.trim());
      escalateFiles.forEach((f) => formData.append('files', f));

      await ticketsApi.escalateTicket(assigningTicket.id, formData);
      enqueueSnackbar('Ticket escalated.', { variant: 'success' });
      setEscalationStateByTicket((prev) => ({ ...prev, [assigningTicket.id]: 'active' }));
      setEscalateDialogOpen(false);
      fetchTickets();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to escalate ticket', {
        variant: 'error',
      });
    } finally {
      setEscalating(false);
    }
  };

  const openSatDialog = (ticket: Ticket) => {
    setSatTicket(ticket);
    const assignedName = ticket.assignedTo
      ? `${ticket.assignedTo.firstName ?? ''} ${ticket.assignedTo.lastName ?? ''}`.trim() ||
      ticket.assignedTo.email
      : '';
    setCsatForm({
      consentGiven: false,
      unitSection: user?.units?.[0]?.name || '',
      dateOfTransaction: ticket.resolvedAt
        ? new Date(ticket.resolvedAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      clientFirstName: user?.firstName || '',
      clientMiddleInitial: user?.middleName ? user.middleName.charAt(0).toUpperCase() : '',
      clientLastName: user?.lastName || '',
      suffix: user?.suffix || '',
      religion: '',
      sex: user?.sex || '',
      contactNumber: user?.phoneNumber || '',
      technicianName: assignedName,
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
  };

  const handleSubmitSatisfaction = async () => {
    if (!satTicket) return;
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
      <Box
        display="flex"
        flexDirection={{ xs: 'column', sm: 'row' }}
        gap={{ xs: 2, sm: 0 }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Help Desk Tickets
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Submit and track assistance requests for Desktop &amp; IT Support
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNewTicket}>
            New Ticket
          </Button>
        </Stack>
      </Box>

      {canManageAll && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <TextField
                select
                label="Status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                size="small"
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="assigned">Assigned</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
                <MenuItem value="freeze">On Hold</MenuItem>
                <MenuItem value="duplicate">Duplicate</MenuItem>
              </TextField>
              <TextField
                select
                label="Type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                size="small"
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="desktop_support">Desktop Support</MenuItem>
                <MenuItem value="it_support">IT Support</MenuItem>
                <MenuItem value="pantawid_ict_support">Pantawid ICT Support</MenuItem>
              </TextField>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setFilterStatus('');
                  setFilterType('');
                }}
              >
                Reset
              </Button>
              {/* {isTechnician && !isLowerLevelTech && ( */}
              {(isFocalTech || canManageAll) && (
                <Badge badgeContent={myTicketsCount} color="error" overlap="circular">
                  <Button
                    size="small"
                    variant={showMyTickets ? 'contained' : 'outlined'}
                    color="primary"
                    onClick={() => {
                      setShowMyTickets((v) => !v);
                      setShowEscalatedToMe(false);
                    }}
                  >
                    {showMyTickets ? 'My Tickets ✓' : 'My Tickets'}
                  </Button>
                </Badge>
              )}
              {canViewEscalatedQueue && (
                <Badge badgeContent={escalatedToMeCount} color="error" overlap="circular">
                  <Button
                    size="small"
                    variant={showEscalatedToMe ? 'contained' : 'outlined'}
                    color="warning"
                    onClick={() => {
                      setShowEscalatedToMe((v) => !v);
                      setShowMyTickets(false);
                    }}
                  >
                    {showEscalatedToMe ? 'Escalated To Me ✓' : 'Escalated To Me'}
                  </Button>
                </Badge>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}
      {!canManageAll && (isFocalTech || canViewEscalatedQueue) && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" spacing={2}>
              {(isFocalTech || canManageAll) && (
                <Badge badgeContent={myTicketsCount} color="error" overlap="circular">
                  <Button
                    size="small"
                    variant={showMyTickets ? 'contained' : 'outlined'}
                    color="primary"
                    onClick={() => {
                      setShowMyTickets((v) => !v);
                      setShowEscalatedToMe(false);
                    }}
                  >
                    {showMyTickets ? 'My Assigned Tickets ✓' : 'All Tickets'}
                  </Button>
                </Badge>
              )}
              {canViewEscalatedQueue && (
                <Badge badgeContent={escalatedToMeCount} color="error" overlap="circular">
                  <Button
                    size="small"
                    variant={showEscalatedToMe ? 'contained' : 'outlined'}
                    color="warning"
                    onClick={() => {
                      setShowEscalatedToMe((v) => !v);
                      setShowMyTickets(false);
                    }}
                  >
                    {showEscalatedToMe ? 'Escalated To Me ✓' : 'Escalated To Me'}
                  </Button>
                </Badge>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}
      {isLowerLevelTech && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Showing your assigned tickets. Use the Escalate button to forward a ticket to a focal
              technician.
            </Typography>
          </CardContent>
        </Card>
      )}
      {canManageAll && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ pb: '0 !important' }}>
            <Tabs
              value={mgmtTab}
              onChange={(_, v) => setMgmtTab(v)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label={`All (${tickets.length})`} />
              <Tab label={`Active (${activeTickets.length})`} />
              <Tab label={`Resolved / Closed (${doneTickets.length})`} />
              <Tab label={`Frozen (${frozenTickets.length})`} />
              <Tab label={`Duplicate (${duplicateTickets.length})`} />
              <Tab
                label={
                  <Badge color="info" variant="dot" invisible={proxyCreatedTickets.length === 0}>
                    Proxy Requests ({proxyCreatedTickets.length})
                  </Badge>
                }
              />
              <Tab label={`Escalations (${allEscalations.length})`} />
            </Tabs>
          </CardContent>
        </Card>
      )}
      {isTechnician && !canManageAll && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ pb: '0 !important' }}>
            <Tabs
              value={ticketTab}
              onChange={(_, v) => setTicketTab(v)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label={`Active (${activeTickets.length})`} />
              <Tab label={`Resolved / Closed (${doneTickets.length})`} />
              <Tab label={`Frozen (${frozenTickets.length})`} />
              <Tab label={`Duplicate (${duplicateTickets.length})`} />
            </Tabs>
          </CardContent>
        </Card>
      )}
      {!isTechnician && !canManageAll && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ pb: '0 !important' }}>
            <Tabs
              value={userTab}
              onChange={(_, v) => setUserTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 2 }}
            >
              <Tab label={`All (${tickets.length})`} />
              <Tab label={`Active (${activeTickets.length})`} />
              <Tab
                label={
                  <Badge color="warning" variant="dot" invisible={toRateTickets.length === 0}>
                    To Rate ({toRateTickets.length})
                  </Badge>
                }
              />
              <Tab label={`Closed / Resolved (${doneTickets.length})`} />
              <Tab
                label={
                  <Badge color="info" variant="dot" invisible={proxyCreatedTickets.length === 0}>
                    Requested For ({proxyCreatedTickets.length})
                  </Badge>
                }
              />
            </Tabs>
          </CardContent>
        </Card>
      )}

      {canManageAll && mgmtTab === 6 ? (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress size={28} />
              </Box>
            ) : allEscalations.length === 0 ? (
              <Box display="flex" justifyContent="center" p={3}>
                <Typography color="text.secondary">No escalations found.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Ticket ID</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Escalated By</TableCell>
                      <TableCell>Escalated To</TableCell>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allEscalations.map((e) => (
                      <TableRow key={e.id} hover onClick={() => router.push(`/dashboard/tickets/${e.ticketId}`)} sx={{ cursor: 'pointer' }}>
                        <TableCell>{new Date(e.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color="primary.main">
                            {e.ticket?.ticketNumber || e.ticketId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            size="small" 
                            label={e.status.toUpperCase()} 
                            color={e.status === 'pending' ? 'warning' : e.status === 'accepted' ? 'success' : 'default'} 
                          />
                        </TableCell>
                        <TableCell>{e.escalatedBy?.firstName} {e.escalatedBy?.lastName}</TableCell>
                        <TableCell>{e.escalatedTo?.firstName} {e.escalatedTo?.lastName}</TableCell>
                        <TableCell>{e.notes?.substring(0, 50)}{(e.notes?.length ?? 0) > 50 ? '...' : ''}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      ) : isMobile ? (
        <Stack spacing={2}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress size={28} />
            </Box>
          ) : tabFilteredTickets.length === 0 ? (
            <Box display="flex" justifyContent="center" p={3}>
              <Typography color="text.secondary">No tickets found in this category.</Typography>
            </Box>
          ) : (
            tabFilteredTickets.map((ticket) => {
              const hasPendingSatisfaction =
                (ticket.status === 'resolved' || ticket.status === 'closed') &&
                ticket.requesterId === user?.id &&
                !ticket.satisfactionSubmittedAt;

              return (
                <Card
                  key={ticket.id}
                  sx={hasPendingSatisfaction ? { backgroundColor: 'warning.50' } : {}}
                >
                  <CardContent>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      mb={1}
                    >
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {ticket.ticketNumber}
                      </Typography>
                      <Box>
                        {hasPendingSatisfaction && (
                          <Chip
                            size="small"
                            label="Unrated"
                            color="warning"
                            variant="filled"
                            sx={{ mr: 1 }}
                          />
                        )}
                        <Chip
                          size="small"
                          label={ticket.status.replace('_', ' ').toUpperCase()}
                          color={STATUS_COLOR[ticket.status] ?? 'default'}
                        />
                      </Box>
                    </Box>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 600,
                        mb: 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {ticket.subject}
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
                      {ticket.requesterId !== user?.id && (
                        <Chip
                          size="small"
                          label={`Requested for: ${ticket.requester?.firstName || ticket.requester?.email || 'Unknown'}`}
                          color="secondary"
                        />
                      )}
                      <Chip
                        size="small"
                        icon={ticketTypeIcon(ticket.ticketType)}
                        label={TICKET_TYPE_LABELS[ticket.ticketType]}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={(ticket.priority ?? 'not set').toUpperCase()}
                        color={PRIORITY_COLOR[ticket.priority ?? ''] ?? 'default'}
                      />
                      {(() => {
                        const s = getSlaStatus(ticket);
                        return s ? (
                          <Chip size="small" label={SLA_CHIP[s].label} color={SLA_CHIP[s].color} />
                        ) : null;
                      })()}
                    </Stack>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </Typography>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {canAssign && ticket.status !== 'duplicate' && (
                          <Tooltip
                            title={
                              ['resolved', 'closed'].includes(ticket.status)
                                ? 'Reassign disabled'
                                : 'Assign Ticket'
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => openAssignDialog(ticket)}
                                disabled={['resolved', 'closed'].includes(ticket.status)}
                              >
                                <AssignIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        {canEscalate &&
                          escalationStateByTicket[ticket.id] !== 'active' &&
                          !['duplicate', 'closed', 'resolved'].includes(ticket.status) && (
                            <Tooltip title="Escalate Ticket">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => openEscalateDialog(ticket)}
                              >
                                <AssignIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        {hasPendingSatisfaction && (
                          <Tooltip title="Rate this resolution">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => openSatDialog(ticket)}
                            >
                              <SatisfactionIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Stack>
      ) : (
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
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : tabFilteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    <Typography color="text.secondary" py={3}>
                      No tickets found in this category.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                tabFilteredTickets.map((ticket) => {
                  const hasPendingSatisfaction =
                    (ticket.status === 'resolved' || ticket.status === 'closed') &&
                    ticket.requesterId === user?.id &&
                    !ticket.satisfactionSubmittedAt;

                  return (
                    <TableRow
                      key={ticket.id}
                      hover
                      sx={
                        hasPendingSatisfaction
                          ? {
                            backgroundColor: 'warning.50',
                            '&:hover': { backgroundColor: 'warning.100' },
                          }
                          : undefined
                      }
                    >
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {ticket.ticketNumber}
                      </TableCell>
                      <TableCell
                        sx={{
                          maxWidth: 220,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {ticket.subject}
                      </TableCell>
                      <TableCell>
                        <Stack direction="column" spacing={0.5}>
                          {ticket.createdById && ticket.createdById !== ticket.requesterId && (
                            <Chip
                              size="small"
                              label="Proxy Request"
                              color="secondary"
                              sx={{ alignSelf: 'flex-start' }}
                            />
                          )}
                          <Chip
                            size="small"
                            icon={ticketTypeIcon(ticket.ticketType)}
                            label={TICKET_TYPE_LABELS[ticket.ticketType]}
                            variant="outlined"
                          />
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {ticket.category?.name ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={(ticket.priority ?? 'not set').toUpperCase()}
                          color={PRIORITY_COLOR[ticket.priority ?? ''] ?? 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            size="small"
                            label={ticket.status.replace('_', ' ').toUpperCase()}
                            color={STATUS_COLOR[ticket.status] ?? 'default'}
                          />
                          {hasPendingSatisfaction && (
                            <Chip size="small" label="Unrated" color="warning" variant="filled" />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="column" spacing={0.5}>
                          {(() => {
                            const s = getSlaStatus(ticket);
                            return s ? (
                              <Chip
                                size="small"
                                label={SLA_CHIP[s].label}
                                color={SLA_CHIP[s].color}
                              />
                            ) : (
                              <Typography variant="body2" color="text.disabled">
                                —
                              </Typography>
                            );
                          })()}
                        </Stack>
                      </TableCell>
                      {canManageAll && (
                        <TableCell>
                          {ticket.requester
                            ? `${ticket.requester.firstName ?? ''} ${ticket.requester.lastName ?? ''}`.trim() ||
                            ticket.requester.email
                            : '—'}
                        </TableCell>
                      )}
                      {canManageAll && (
                        <TableCell>
                          {ticket.assignedTo ? (
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <span>
                                {`${ticket.assignedTo.firstName ?? ''} ${ticket.assignedTo.lastName ?? ''}`.trim() ||
                                  ticket.assignedTo.email}
                              </span>
                              {ticket.assignedTechAbsent &&
                                (canAssign || canManageAll) && (
                                  <Tooltip title="Technician is absent today">
                                    <FiberManualRecord sx={{ color: 'error.main', fontSize: 10 }} />
                                  </Tooltip>
                                )}
                            </Box>
                          ) : (
                            <Typography color="text.disabled" variant="body2">
                              Unassigned
                            </Typography>
                          )}
                        </TableCell>
                      )}
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {canAssign && ticket.status !== 'duplicate' && (
                            <Tooltip
                              title={
                                ['resolved', 'closed'].includes(ticket.status)
                                  ? 'Reassign disabled for resolved/closed tickets'
                                  : ticket.assignedToId
                                    ? 'Reassign Ticket'
                                    : 'Assign Ticket'
                              }
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => openAssignDialog(ticket)}
                                  disabled={['resolved', 'closed'].includes(ticket.status)}
                                >
                                  <AssignIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                          {canEscalate &&
                            escalationStateByTicket[ticket.id] !== 'active' &&
                            !['duplicate', 'closed', 'resolved'].includes(ticket.status) && (
                              <Tooltip title="Escalate Ticket">
                                <IconButton
                                  size="small"
                                  color="warning"
                                  onClick={() => openEscalateDialog(ticket)}
                                >
                                  <AssignIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          {(ticket.status === 'resolved' || ticket.status === 'closed') &&
                            ticket.requesterId === user?.id &&
                            !ticket.satisfactionSubmittedAt && (
                              <Tooltip title="Rate this resolution">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => openSatDialog(ticket)}
                                >
                                  <SatisfactionIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* New Ticket Dialog — Redesigned with highlighted support type cards + category dropdown */}
      <Dialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Submit a Help Desk Ticket</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Choose Support Type
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              flexWrap={{ xs: 'nowrap', sm: 'wrap' }}
            >
              {[
                {
                  value: 'it_support' as TicketType,
                  label: 'IT Support',
                  icon: '💻',
                  color: '#1976d2',
                  desc: 'Software, network, email, accounts',
                },
                {
                  value: 'desktop_support' as TicketType,
                  label: 'Desktop Support',
                  icon: '🖥️',
                  color: '#388e3c',
                  desc: 'Hardware, printers, workstations',
                },
                {
                  value: 'pantawid_ict_support' as TicketType,
                  label: 'Pantawid ICT Support',
                  icon: '📋',
                  color: '#7b1fa2',
                  desc: 'Pantawid Pamilyang Program ICT requests',
                },
              ].map((opt) => (
                <Card
                  key={opt.value}
                  onClick={() => setForm({ ...form, ticketType: opt.value, categoryId: undefined })}
                  sx={{
                    flex: 1,
                    cursor: 'pointer',
                    textAlign: 'center',
                    py: 2,
                    px: 1,
                    border:
                      form.ticketType === opt.value
                        ? `2.5px solid ${opt.color}`
                        : '2px solid transparent',
                    bgcolor: form.ticketType === opt.value ? `${opt.color}10` : 'background.paper',
                    boxShadow: form.ticketType === opt.value ? 4 : 1,
                    transition: 'all 0.2s',
                    '&:hover': { boxShadow: 3, borderColor: opt.color },
                  }}
                >
                  <Typography variant="h5" sx={{ mb: 0.5 }}>
                    {opt.icon}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {opt.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {opt.desc}
                  </Typography>
                </Card>
              ))}
            </Stack>

            {categories.length > 0 && (
              <TextField
                select
                label="Category"
                value={form.categoryId ?? ''}
                fullWidth
                onChange={(e) => setForm({ ...form, categoryId: e.target.value || undefined })}
                helperText="Select a specific category for faster routing"
              >
                <MenuItem value="">— No specific category —</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              label="Subject *"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              fullWidth
              placeholder="Brief description of your issue"
            />
            {categories.find(c => c.id === form.categoryId)?.name.toLowerCase().includes('disposal') && (
              <Box p={2} mb={1} bgcolor="action.hover" borderRadius={1} border="1px solid" borderColor="divider">
                <Typography variant="subtitle2" gutterBottom>
                  Disposal Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Equipment Type *"
                      size="small"
                      fullWidth
                      value={disposalDetails.equipmentType}
                      onChange={(e) => setDisposalDetails({ ...disposalDetails, equipmentType: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Serial Number *"
                      size="small"
                      fullWidth
                      value={disposalDetails.serialNumber}
                      onChange={(e) => setDisposalDetails({ ...disposalDetails, serialNumber: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Property Number *"
                      size="small"
                      fullWidth
                      value={disposalDetails.propertyNumber}
                      onChange={(e) => setDisposalDetails({ ...disposalDetails, propertyNumber: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Reason for Disposal *"
                      size="small"
                      fullWidth
                      value={disposalDetails.reason}
                      onChange={(e) => setDisposalDetails({ ...disposalDetails, reason: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
            {loadingKb && (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">Searching Knowledge Base...</Typography>
              </Box>
            )}
            {kbSuggestions.length > 0 && (
              <Card variant="outlined" sx={{ bgcolor: 'info.50', borderColor: 'info.main' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="subtitle2" color="info.main" gutterBottom>
                    💡 Suggested Solutions
                  </Typography>
                  <Stack spacing={1}>
                    {kbSuggestions.map(kb => (
                      <Box key={kb.id} sx={{ bgcolor: 'background.paper', p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                          onClick={() => setExpandedKbId(expandedKbId === kb.id ? null : kb.id)}
                        >
                          {kb.title} {expandedKbId === kb.id ? '▲' : '▼'}
                        </Typography>
                        {expandedKbId === kb.id && (
                          <Box mt={1}>
                            <Box sx={{ maxHeight: 200, overflowY: 'auto', p: 1, bgcolor: 'action.hover', borderRadius: 1, typography: 'body2', color: 'text.secondary', '& p': { m: 0, mb: 1 }, '& ul, & ol': { m: 0, pl: 2 } }}>
                              <ReactMarkdown>{kb.content}</ReactMarkdown>
                            </Box>
                            <Box display="flex" alignItems="center" gap={2} mt={1.5} pt={1} borderTop="1px solid" borderColor="divider">
                              <Typography variant="caption" fontWeight={600}>Did this solve your issue?</Typography>
                              <Button size="small" color="success" variant="outlined" startIcon={<SatisfactionIcon />} onClick={() => handleRateKb(kb.id, true)}>
                                Yes, cancel ticket
                              </Button>
                              <Button size="small" color="error" variant="outlined" onClick={() => handleRateKb(kb.id, false)}>
                                No
                              </Button>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
            <TextField
              label="Description *"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              fullWidth
              multiline
              rows={4}
              placeholder="Provide details: what happened, when, steps tried..."
            />
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Attach Image (Optional)
              </Typography>
              <Button component="label" variant="outlined" size="small" startIcon={<UploadIcon />}>
                {selectedImage ? 'Change Image' : 'Select Image'}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    const validFiles = files.filter((f) => f.type.startsWith('image/'));
                    if (validFiles.length > 0) {
                      setSelectedImage(validFiles[0]);
                    }
                    e.target.value = '';
                  }}
                />
              </Button>
              {selectedImage && (
                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                  {selectedImage.name} ({(selectedImage.size / 1024 / 1024).toFixed(2)} MB)
                  <Button size="small" color="error" onClick={() => setSelectedImage(null)} sx={{ ml: 1, minWidth: 'auto', p: 0 }}>
                    Remove
                  </Button>
                </Typography>
              )}
            </Box>
            <Autocomplete
              options={allUsers.filter((u) => u.role !== 'super_admin')}
              getOptionLabel={(u) =>
                `${[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}`
              }
              value={allUsers.find((u) => u.id === form.requesterId) ?? null}
              onChange={(_, newValue) =>
                setForm({ ...form, requesterId: newValue?.id ?? undefined })
              }
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Requested For (Optional)"
                  helperText="Leave blank if you are requesting for yourself. Select a user to request on their behalf."
                  fullWidth
                />
              )}
              clearOnEscape
              fullWidth
            />
            {(canManageAll || isTechnician) && (
              <TextField
                select
                label="Priority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TicketPriority })}
                fullWidth
              >
                <MenuItem value="low">Low — Not urgent</MenuItem>
                <MenuItem value="medium">Medium — Normal impact</MenuItem>
                <MenuItem value="high">High — Significant impact</MenuItem>
                <MenuItem value="urgent">Urgent — Critical / blocking work</MenuItem>
              </TextField>
            )}

            <Alert severity="info" sx={{ fontSize: '0.82rem' }}>
              Tickets are auto-assigned to available technicians.
              {globalConfig && (
                globalConfig.isEmailNotificationsEnabled === false ? (
                  <strong style={{ display: 'block', marginTop: '4px', color: '#d32f2f' }}>
                    Email notifications are currently completely disabled globally.
                  </strong>
                ) : globalConfig.emailTestOverride ? (
                  <strong style={{ display: 'block', marginTop: '4px', color: '#ed6c02' }}>
                    Warning: All system emails are being rerouted to {globalConfig.emailTestOverride} for testing.
                  </strong>
                ) : null
              )}
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
            onClick={() => {
              setReminderOpen(false);
              setNewDialogOpen(true);
            }}
          >
            Proceed Anyway
          </Button>
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

      {/* Assign Dialog */}
      <Dialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {assigningTicket?.assignedToId ? 'Reassign Ticket' : 'Assign Ticket'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Ticket: <strong>{assigningTicket?.ticketNumber}</strong> —{' '}
              {TICKET_TYPE_LABELS[assigningTicket?.ticketType ?? 'it_support']}
            </Typography>
            <Autocomplete
              options={technicians}
              getOptionLabel={(t) => `${t.firstName} ${t.lastName} (${t.openCount} open)`}
              value={technicians.find((t) => String(t.id) === selectedTechId) ?? null}
              onChange={(_, newValue) => setSelectedTechId(newValue ? String(newValue.id) : '')}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Technician"
                  fullWidth
                  error={technicians.length === 0}
                  helperText={technicians.length === 0 ? 'No eligible technicians found' : ''}
                />
              )}
              clearOnEscape
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAssign}
            variant="contained"
            color="primary"
            disabled={!selectedTechId}
          >
            {assigningTicket?.assignedToId ? 'Reassign' : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dedicated Escalate Dialog */}
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
            value={escalationFocalUsers.find((t) => String(t.id) === escalateToId) ?? null}
            onChange={(_, newValue) => setEscalateToId(newValue ? String(newValue.id) : '')}
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
                accept="image/*"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  const validFiles = files.filter((f) => f.type.startsWith('image/'));
                  if (validFiles.length !== files.length) {
                    enqueueSnackbar('Only image files are allowed for proof photos.', {
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
            {escalating ? 'Escalating...' : 'Escalate'}
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
                  sx={{ width: 200 }}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Age"
                  type="number"
                  inputProps={{ min: 20, max: 89 }}
                  value={csatForm.age ?? ''}
                  onChange={(e) => setCsatForm((f) => ({ ...f, age: Number(e.target.value) }))}
                  sx={{ maxWidth: 100 }}
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
          {!satTicket?.satisfactionSubmittedAt && (
            <Button
              onClick={handleSubmitSatisfaction}
              variant="contained"
              disabled={csatSubmitting || !csatForm.consentGiven}
            >
              {csatSubmitting ? 'Submitting…' : 'Submit Feedback'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
