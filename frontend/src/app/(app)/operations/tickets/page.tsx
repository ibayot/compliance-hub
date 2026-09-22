'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Pagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  AssignmentInd as AssignIcon,
  ThumbUp as SatisfactionIcon,
  Computer as DesktopIcon,
  Wifi as ITIcon,
  Assignment as PantawidIcon,
  AccountTree as SpecializedIcon,
  SentimentVerySatisfied,
  SentimentSatisfied,
  SentimentNeutral,
  SentimentDissatisfied,
  SentimentVeryDissatisfied,
  FiberManualRecord,
  Upload as UploadIcon,
  ChevronLeft,
  ChevronRight,
  EditCalendar as ResolutionTimeIcon,
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
  TicketIssueType,
  ticketSettingsApi,
  attendanceApi,
  knowledgeBaseApi,
  CsatFormData,
  TicketEscalation,
} from '@/app/api/references';
import TicketImageDropzone from '@/components/TicketImageDropzone';
import { usersApi, UserRecord } from '@/lib/api/users';
import { useSse } from '@/lib/utils/useSse';
import { formatPersonName } from '@/lib/utils/person-name';

import { PRIORITY_COLOR, STATUS_COLOR, TICKET_TYPE_LABELS } from '@/lib/utils/ticket-colors';

import { unitsApi } from '@/lib/api/units';

const ALLOWED_IMAGE_FILE_ACCEPT =
  '.jpg,.jpeg,.png,.heic,.heif,.webp,image/jpeg,image/png,image/heic,image/heif,image/webp';
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp']);
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']);
const isAllowedImageFile = (file: File) => {
  const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
  const mime = file.type.toLowerCase();
  return ALLOWED_IMAGE_EXTENSIONS.has(extension) && (!mime || ALLOWED_IMAGE_MIME_TYPES.has(mime));
};

const populatedFieldSx = (populated: boolean) =>
  populated
    ? {
        '& .MuiInputBase-input': { color: '#000', fontStyle: 'italic' },
        '& .MuiInputBase-input.Mui-disabled': {
          color: '#000',
          WebkitTextFillColor: '#000',
          fontStyle: 'italic',
        },
      }
    : undefined;
function ticketTypeIcon(t: TicketType) {
  if (t === 'desktop_support') return <DesktopIcon />;
  if (t === 'pantawid_ict_support') return <PantawidIcon />;
  if (t === 'specialized_concerns') return <SpecializedIcon />;
  return <ITIcon />;
}

const effectiveResolvedAt = (ticket: Ticket) =>
  ticket.effectiveResolvedAt || ticket.resolutionTimeOverride || ticket.resolvedAt || null;

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

function getSlaStatus(ticket: Ticket): 'met' | 'on_track' | 'nearing_sla' | 'overdue' | 'paused' | null {
  if (!ticket.slaDeadline) return null;
  const isTerminal = ['resolved', 'closed', 'duplicate'].includes(ticket.status);
  if (isTerminal) {
    const deadline = new Date(ticket.slaDeadline).getTime();
    const resolvedValue = effectiveResolvedAt(ticket);
    const resolvedTime = resolvedValue ? new Date(resolvedValue).getTime() : Date.now();
    return resolvedTime <= deadline ? 'met' : 'overdue';
  }
  if (ticket.slaPaused) return 'paused';
  if (ticket.isSlaWaiting && ticket.status !== 'in_progress') return null;
  // The API flags are calculated when the ticket is fetched. Re-check the
  // deadline locally so an open page cannot keep showing "Nearing SLA" after
  // the deadline has passed.
  if (Date.now() >= new Date(ticket.slaDeadline).getTime()) return 'overdue';
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
  paused: { label: 'SLA Paused', color: 'info' },
};

export default function TicketsPage({ restrictedAssignedOnly = false }: { restrictedAssignedOnly?: boolean }) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, myCap } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setSlaClock] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setSlaClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterSla, setFilterSla] = useState<'' | 'overdue' | 'nearing_sla' | 'on_track'>('');

  const now = new Date();
  const currentMonth = (now.getMonth() + 1).toString();
  const currentYear = now.getFullYear().toString();
  const yearOptions = Array.from({ length: 7 }, (_, index) => Number(currentYear) - 3 + index);

  const todayInManila = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const [filterDate, setFilterDate] = useState(todayInManila);
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterQuarter, setFilterQuarter] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [filterPeriodMode, setFilterPeriodMode] = useState<'day' | 'month' | 'quarter' | 'semester' | 'year'>('day');
  const [showMyTickets, setShowMyTickets] = useState(false);

  const initializedMyTickets = useRef(false);
  useEffect(() => {
    if (myCap && !initializedMyTickets.current) {
      initializedMyTickets.current = true;
      const isTech = !!myCap.isDesktop || !!myCap.isItSupport || !!myCap.isPantawidIct || !!myCap.isIto;
      const canManageAll = !!myCap.isAllTickets;
      if (isTech && !canManageAll) {
        setShowMyTickets(true);
      }
    }
  }, [myCap]);
  const [showEscalatedToMe, setShowEscalatedToMe] = useState(false);
  const [myTicketsCount, setMyTicketsCount] = useState(0);
  const [escalatedToMeCount, setEscalatedToMeCount] = useState(0);
  const [globalConfig, setGlobalConfig] = useState<any>(null);

  useEffect(() => {
    if (myCap?.isGlobalSettingsAccess) {
      ticketSettingsApi.getGlobalConfig().then(setGlobalConfig).catch(() => { });
    }
  }, [myCap?.isGlobalSettingsAccess]);

  // Pagination for non-admin active tabs
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const ticketRequestRef = useRef(0);
  const ticketSseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const TICKETS_PAGE_SIZE = 25;
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [requestedForConfirmOpen, setRequestedForConfirmOpen] = useState(false);
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
  const selectTicketImage = useCallback((file?: File) => {
    if (!file) return;
    if (!isAllowedImageFile(file)) {
      enqueueSnackbar('Only JPG, JPEG, PNG, HEIC/HEIF, and WebP images are allowed.', { variant: 'error' });
      return;
    }
    setSelectedImage(file);
  }, [enqueueSnackbar]);
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [issues, setIssues] = useState<TicketIssueType[]>([]);
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
  const [resolutionOverrideTicket, setResolutionOverrideTicket] = useState<Ticket | null>(null);
  const [resolutionOverrideTime, setResolutionOverrideTime] = useState('');
  const [resolutionOverrideReason, setResolutionOverrideReason] = useState('');
  const [resolutionOverrideFiles, setResolutionOverrideFiles] = useState<File[]>([]);
  const [resolutionOverrideConfirmed, setResolutionOverrideConfirmed] = useState(false);
  const [savingResolutionOverride, setSavingResolutionOverride] = useState(false);
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
  const canManageAll = !restrictedAssignedOnly && !!myCap?.isAllTickets;
  // Matrix-driven: Escalated To Me tab is visible when Escalation capability is ticked.
  const canViewEscalatedQueue = !restrictedAssignedOnly && !!myCap?.isEscalationFocal;
  // DB-driven: is_ticket_focal column — who can manually assign/reassign tickets
  const canAssign = !!myCap?.isTicketFocal || !!myCap?.isTicketSettingsFocal;
  const isTicketAdmin = !!myCap?.isTicketSettingsFocal;
  const canOverrideResolutionTime = !!myCap?.isTicketResolutionTimeOverride;
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

  const openResolutionOverrideDialog = (ticket: Ticket) => {
    setResolutionOverrideTicket(ticket);
    setResolutionOverrideTime(toDateTimeLocalValue(effectiveResolvedAt(ticket)));
    setResolutionOverrideReason('');
    setResolutionOverrideFiles([]);
    setResolutionOverrideConfirmed(false);
  };

  const closeResolutionOverrideDialog = () => {
    setResolutionOverrideTicket(null);
    setResolutionOverrideTime('');
    setResolutionOverrideReason('');
    setResolutionOverrideFiles([]);
    setResolutionOverrideConfirmed(false);
  };

  const submitResolutionOverride = async () => {
    if (!resolutionOverrideTicket) return;
    if (!resolutionOverrideTime) {
      enqueueSnackbar('Enter the verified completion date and time.', { variant: 'error' });
      return;
    }
    if (resolutionOverrideReason.trim().length < 10) {
      enqueueSnackbar('Reason must contain at least 10 characters.', { variant: 'error' });
      return;
    }
    if (resolutionOverrideFiles.length === 0) {
      enqueueSnackbar('Upload at least one proof image with a visible timestamp.', { variant: 'error' });
      return;
    }
    if (!resolutionOverrideConfirmed) {
      enqueueSnackbar('Confirm that the proof supports the verified completion time.', { variant: 'error' });
      return;
    }
    try {
      setSavingResolutionOverride(true);
      const formData = new FormData();
      formData.append('verifiedResolvedAt', new Date(resolutionOverrideTime).toISOString());
      formData.append('reason', resolutionOverrideReason.trim());
      resolutionOverrideFiles.forEach((file) => formData.append('proofFiles', file));
      await ticketsApi.overrideResolutionTime(resolutionOverrideTicket.id, formData);
      enqueueSnackbar('Verified resolution time saved. SLA results were recalculated.', { variant: 'success' });
      setSavingResolutionOverride(false);
      closeResolutionOverrideDialog();
      await silentFetchTickets();
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Unable to correct the resolution time.', { variant: 'error' });
    } finally {
      setSavingResolutionOverride(false);
    }
  };

  const [selectedTab, setSelectedTab] = useState('all');
  const [showEscalations, setShowEscalations] = useState(false);

  // Table Scroll State
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const handleTableScroll = useCallback(() => {
    if (tableContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(handleTableScroll, 100);
    window.addEventListener('resize', handleTableScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleTableScroll);
    };
  }, [handleTableScroll, tickets, allEscalations]);

  const frontendFilteredTickets = React.useMemo(() => {
    return tickets.filter(t => {
      const matchesPriority = !filterPriority || t.priority === filterPriority;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ? true : (
        t.ticketNumber.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        formatPersonName(t.requester).toLowerCase().includes(q)
      );
      return matchesPriority && matchesSearch;
    });
  }, [tickets, filterPriority, searchQuery]);

  const frontendFilteredEscalations = React.useMemo(() => {
    return allEscalations.filter(e => !filterPriority || (e.ticket && e.ticket.priority === filterPriority));
  }, [allEscalations, filterPriority]);

  const statusTabs = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'pause', label: 'Paused' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'closed', label: 'Closed' },
    { key: 'freeze', label: 'Frozen' },
    { key: 'duplicate', label: 'Duplicate' },
    { key: 'proxy', label: 'Proxy Requests' },
  ];
  const selectedStatus = statusTabs.some(({ key }) => key === selectedTab && key !== 'all' && key !== 'proxy')
    ? selectedTab as TicketStatus : undefined;
  const allCount = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

  const toRateTickets = frontendFilteredTickets.filter(
    (t) =>
      (t.status === 'resolved' || t.status === 'closed') &&
      t.requesterId === user?.id &&
      !t.satisfactionSubmittedAt,
  );

  // Tickets that were requested FOR this user (someone else filed on their behalf)
  const requestedForTickets = frontendFilteredTickets.filter(
    (t) => t.requesterId === user?.id && t.createdById != null && t.createdById !== user?.id,
  );

  // For management/RICTMS: tickets this user created on behalf of someone else
  const proxyCreatedTickets = frontendFilteredTickets.filter(
    (t) => t.createdById === user?.id && t.requesterId !== user?.id,
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('assignedToMe') === '1' || params.get('scope') === 'assigned_to_me') {
        setShowMyTickets(true);
        setShowEscalatedToMe(false);
      }
      if (params.get('filter') === 'pending_satisfaction') {
        setSelectedTab('to_rate');
      }
      const status = params.get('status');
      if (status && ['open', 'assigned', 'in_progress', 'pause', 'resolved', 'closed', 'freeze', 'duplicate'].includes(status)) {
        setSelectedTab(status);
      }
      const period = params.get('period');
      if (period === 'month' && params.get('year') && params.get('month')) {
        setFilterPeriodMode('month');
        setFilterDate('');
        setFilterYear(params.get('year')!);
        setFilterMonth(params.get('month')!);
      } else if (period === 'day' && params.get('date')) {
        setFilterPeriodMode('day');
        setFilterDate(params.get('date')!);
      }
      const sla = params.get('sla');
      if (sla === 'overdue' || sla === 'nearing_sla' || sla === 'on_track') {
        setFilterSla(sla);
        // Dashboard SLA cards represent every active ticket, not only tickets
        // created during the ticket page's default current-month period.
        setFilterYear('');
        setFilterMonth('');
        setFilterQuarter('');
        setFilterSemester('');
        setFilterPeriodMode('year');
        setFilterDate('');
      }
    }
  }, []);

  useEffect(() => {
    if (!newDialogOpen || !isTicketAdmin) return;
    ticketsApi
      .getTechnicians(form.ticketType)
      .then((rows) => setTechnicians(rows.filter((row) => row.attendanceStatus === 'present' || row.attendanceStatus === 'out_of_office')))
      .catch(() => setTechnicians([]));
  }, [newDialogOpen, isTicketAdmin, form.ticketType]);

  const tabFilteredTickets = frontendFilteredTickets;

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

  useEffect(() => {
    setPage(1);
  }, [selectedTab, filterStatus, filterType, filterPriority, filterSla, filterDate, filterYear, filterMonth, filterQuarter, filterSemester, searchQuery, showMyTickets, showEscalatedToMe]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchDraft.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);
  const fetchTickets = useCallback(async () => {
    const requestId = ++ticketRequestRef.current;
    try {
      setLoading(true);
      const [data, dashboardStats] = await Promise.all([
        restrictedAssignedOnly ? ticketsApi.getMyAssigned({
          status: selectedStatus,
          ticketType: (filterType as TicketType) || undefined,
          priority: filterPriority || undefined,
          date: filterPeriodMode === 'day' ? filterDate : undefined,
          includeCarryover: filterPeriodMode === 'day' && !filterSla,
          year: filterPeriodMode !== 'day' ? Number(filterYear) || undefined : undefined,
          month: filterPeriodMode === 'month' ? Number(filterMonth) || undefined : undefined,
          quarter: filterPeriodMode === 'quarter' ? Number(filterQuarter) || undefined : undefined,
          semester: filterPeriodMode === 'semester' ? Number(filterSemester) || undefined : undefined,
          search: searchQuery,
          proxyCreatedByMe: selectedTab === 'proxy',
          page,
          limit: TICKETS_PAGE_SIZE,
        }) : ticketsApi.getAll({
        status: selectedStatus || (filterStatus as TicketStatus) || undefined,
        ticketType: (filterType as TicketType) || undefined,
        priority: filterPriority || undefined,
        date: filterPeriodMode === 'day' && selectedTab !== 'to_rate' ? filterDate : undefined,
        includeCarryover: filterPeriodMode === 'day' && !filterSla,
        year: filterPeriodMode !== 'day' && selectedTab !== 'to_rate' ? filterYear || undefined : undefined,
        month: filterPeriodMode === 'month' && selectedTab !== 'to_rate' ? filterMonth || undefined : undefined,
        quarter: filterPeriodMode === 'quarter' && selectedTab !== 'to_rate' ? filterQuarter || undefined : undefined,
        semester: filterPeriodMode === 'semester' && selectedTab !== 'to_rate' ? filterSemester || undefined : undefined,
        slaState: filterSla || undefined,
        assignedToMe: showMyTickets && !showEscalatedToMe,
        proxyCreatedByMe: selectedTab === 'proxy',
        pendingSatisfaction: selectedTab === 'to_rate',
        escalatedToMe: showEscalatedToMe && canViewEscalatedQueue,
        search: searchQuery,
        page,
          limit: TICKETS_PAGE_SIZE,
        }),
        ticketsApi.getDashboardStats(),
      ]);
      if (requestId !== ticketRequestRef.current) return;
      setTickets(data.data);
      setTotalPages(data.totalPages);
      setTotalTickets(data.total);
      setStatusCounts(data.statusCounts ?? {});
      setPendingSatCount(dashboardStats.pendingSatisfactionTickets?.length ?? 0);
      setMyTicketsCount(dashboardStats.myTicketsCount ?? 0);
      setEscalatedToMeCount(dashboardStats.escalatedToMeCount ?? 0);

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
    selectedTab,
    selectedStatus,
    filterType,
    filterPriority,
    filterSla,
    filterYear,
    filterDate,
    filterPeriodMode,
    filterMonth,
    filterQuarter,
    filterSemester,
    searchQuery,
    page,
    showMyTickets,
    showEscalatedToMe,
    canViewEscalatedQueue,
    searchQuery,
    page,
    isFocalTech,
    user?.id,
    canManageAll,
    restrictedAssignedOnly,
  ]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    refreshEscalationStates(tickets);
  }, [tickets, refreshEscalationStates]);

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
    const requestId = ++ticketRequestRef.current;
    try {
      const [data, dashboardStats] = await Promise.all([
        restrictedAssignedOnly ? ticketsApi.getMyAssigned({
          status: selectedStatus,
          ticketType: (filterType as TicketType) || undefined,
          priority: filterPriority || undefined,
          date: filterPeriodMode === 'day' ? filterDate : undefined,
          includeCarryover: filterPeriodMode === 'day' && !filterSla,
          year: filterPeriodMode !== 'day' ? Number(filterYear) || undefined : undefined,
          month: filterPeriodMode === 'month' ? Number(filterMonth) || undefined : undefined,
          quarter: filterPeriodMode === 'quarter' ? Number(filterQuarter) || undefined : undefined,
          semester: filterPeriodMode === 'semester' ? Number(filterSemester) || undefined : undefined,
          search: searchQuery,
          proxyCreatedByMe: selectedTab === 'proxy',
          page,
          limit: TICKETS_PAGE_SIZE,
        }) : ticketsApi.getAll({
        status: selectedStatus || (filterStatus as TicketStatus) || undefined,
        ticketType: (filterType as TicketType) || undefined,
        priority: filterPriority || undefined,
        date: filterPeriodMode === 'day' && selectedTab !== 'to_rate' ? filterDate : undefined,
        includeCarryover: filterPeriodMode === 'day' && !filterSla,
        year: filterPeriodMode !== 'day' && selectedTab !== 'to_rate' ? filterYear || undefined : undefined,
        month: filterPeriodMode === 'month' && selectedTab !== 'to_rate' ? filterMonth || undefined : undefined,
        quarter: filterPeriodMode === 'quarter' && selectedTab !== 'to_rate' ? filterQuarter || undefined : undefined,
        semester: filterPeriodMode === 'semester' && selectedTab !== 'to_rate' ? filterSemester || undefined : undefined,
        slaState: filterSla || undefined,
        assignedToMe: showMyTickets && !showEscalatedToMe,
        proxyCreatedByMe: selectedTab === 'proxy',
        pendingSatisfaction: selectedTab === 'to_rate',
        escalatedToMe: showEscalatedToMe && canViewEscalatedQueue,
        search: searchQuery,
        page,
          limit: TICKETS_PAGE_SIZE,
        }),
        ticketsApi.getDashboardStats(),
      ]);
      if (requestId !== ticketRequestRef.current) return;
      setTickets(data.data);
      setTotalPages(data.totalPages);
      setTotalTickets(data.total);
      setStatusCounts(data.statusCounts ?? {});
      setPendingSatCount(dashboardStats.pendingSatisfactionTickets?.length ?? 0);
      setMyTicketsCount(dashboardStats.myTicketsCount ?? 0);
      setEscalatedToMeCount(dashboardStats.escalatedToMeCount ?? 0);
    } catch {
      /* silent */
    }
  }, [
    filterStatus,
    selectedTab,
    selectedStatus,
    filterType,
    filterPriority,
    filterSla,
    filterYear,
    filterDate,
    filterPeriodMode,
    filterMonth,
    filterQuarter,
    filterSemester,
    searchQuery,
    page,
    showMyTickets,
    showEscalatedToMe,
    canViewEscalatedQueue,
    searchQuery,
    page,
    isFocalTech,
    user?.id,
    restrictedAssignedOnly,
  ]);
  useSse(['TICKET_UPDATED', 'SYSTEM_STATUS_CHANGED'], () => {
    if (ticketSseTimerRef.current) clearTimeout(ticketSseTimerRef.current);
    ticketSseTimerRef.current = setTimeout(() => {
      ticketSseTimerRef.current = null;
      void silentFetchTickets();
    }, 750);
  });

  useEffect(() => () => {
    if (ticketSseTimerRef.current) clearTimeout(ticketSseTimerRef.current);
  }, []);

  const refreshRequesterOptions = useCallback(() => {
    if (restrictedAssignedOnly) return;
    usersApi
      .listTicketRequesters()
      .then((users) => setAllUsers(users.filter((u) => u.active && u.role !== 'super_admin')))
      .catch(() => { });
  }, [restrictedAssignedOnly]);

  useEffect(() => {
    // Load the restricted requester list for ticket proxy creation.
    refreshRequesterOptions();
  }, [refreshRequesterOptions]);

  useSse(['USER_DIRECTORY_UPDATED'], refreshRequesterOptions);

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

  useEffect(() => {
    if (newDialogOpen && form.categoryId) {
      ticketSettingsApi
        .getIssueTypes(form.categoryId)
        .then((data) => setIssues(data.filter((iss) => iss.isActive && !iss.isDeleted)))
        .catch(() => setIssues([]));
    } else {
      setIssues([]);
    }
  }, [newDialogOpen, form.categoryId]);

  // Listen for admin changes (activate/deactivate) while dialog is open
  useSse(['GLOBAL_SETTINGS_UPDATED'], () => {
    if (newDialogOpen) {
      ticketSettingsApi
        .getCategories(form.ticketType, true)
        .then(setCategories)
        .catch(() => { }); // silent — don't show errors on background polls
    }
  });

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

  const handleSubmitTicket = async (confirmedForSelf = false) => {
    if (!form.subject.trim() || !form.description.trim()) {
      enqueueSnackbar('Subject and description are required.', { variant: 'warning' });
      return;
    }

    if (user?.role !== 'user' && !form.issueTypeId) {
      enqueueSnackbar('Issue is required for tickets created by RICTMS staff.', { variant: 'warning' });
      return;
    }

    if (isTechnician && form.requesterId == null && !confirmedForSelf) {
      setRequestedForConfirmOpen(true);
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
        if (user?.role !== 'user' && form.issueTypeId) formData.append('issueTypeId', form.issueTypeId);
        if (form.requesterId) formData.append('requesterId', form.requesterId.toString());
        if (form.assignedToId) formData.append('assignedToId', form.assignedToId.toString());
        formData.append('image', selectedImage);
        payload = formData;
      } else {
        payload = { ...form, description: finalDescription, issueTypeId: user?.role === 'user' ? undefined : form.issueTypeId };
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
      const rawMessage = err?.response?.data?.message;
      const message = Array.isArray(rawMessage) ? rawMessage.join(' ') : rawMessage;
      enqueueSnackbar(message || 'Failed to submit ticket', {
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
      const techs = await ticketsApi.getTechnicians(ticket.ticketType);
      const availableByAttendance = techs.filter(
        (t) => t.attendanceStatus === 'present' || t.attendanceStatus === 'out_of_office',
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
      await ticketsApi.assign(assigningTicket.id, Number(selectedTechId), {
        expectedUpdatedAt: assigningTicket.updatedAt,
        expectedAssignedToId: assigningTicket.assignedToId ?? null,
        expectedStatus: assigningTicket.status,
      });
      enqueueSnackbar('Ticket assigned.', { variant: 'success' });
      setAssignDialogOpen(false);
      await silentFetchTickets();
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
      ? formatPersonName(ticket.assignedTo, ticket.assignedTo.email)
      : '';
    setCsatForm({
      consentGiven: false,
      unitSection: user?.units?.[0]?.name || '',
      dateOfTransaction: effectiveResolvedAt(ticket)
        ? new Date(effectiveResolvedAt(ticket) as string).toISOString().split('T')[0]
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
    const contactNumber = csatForm.contactNumber?.trim() ?? '';
    if (!contactNumber) {
      enqueueSnackbar('Contact number is required.', { variant: 'warning' });
      return;
    }
    if (!/^\d{10}$/.test(contactNumber)) {
      enqueueSnackbar('Contact number must contain exactly 10 digits.', { variant: 'warning' });
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
      const rawMessage = err?.response?.data?.message;
      const message = Array.isArray(rawMessage) ? rawMessage.join(' ') : rawMessage;
      enqueueSnackbar(message || 'Failed to submit', { variant: 'error' });
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
        mb={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {restrictedAssignedOnly ? 'My Assigned Tickets' : 'Help Desk Tickets'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Submit and track RICTMS support requests and specialized concerns
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          {!restrictedAssignedOnly && <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNewTicket}>
            New Ticket
          </Button>}
        </Stack>
      </Box>

      {/* Search Bar (Visible to everyone) */}
      <Card sx={{ mb: 1 }}>
        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by ticket number, subject, or requester name..."
            value={searchDraft}
            onChange={(e) => { setSearchDraft(e.target.value); setPage(1); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {!canManageAll && (
        <Card sx={{ mb: 1 }}>
          <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
            <Grid container spacing={2}>
              <Grid item xs={12} lg={12}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, '& > *': { flex: '1 1 100px' } }}>
                  <TextField
                    select
                    label="Year"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    size="small"
                  >
                    <MenuItem value="">All</MenuItem>

                    {yearOptions.map((year) => (
                      <MenuItem key={year} value={year.toString()}>{year}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Period"
                    value={filterPeriodMode}
                    onChange={(e) => {
                      const mode = e.target.value as 'day' | 'month' | 'quarter' | 'semester' | 'year';
                      setFilterPeriodMode(mode);
                      setFilterDate(mode === 'day' ? todayInManila() : '');
                      if (mode === 'year') {
                        setFilterMonth('');
                        setFilterQuarter('');
                        setFilterSemester('');
                      } else if (mode === 'semester') {
                        setFilterMonth('');
                        setFilterQuarter('');
                        setFilterSemester('');
                      } else if (mode === 'quarter') {
                        setFilterMonth('');
                        setFilterQuarter('');
                        setFilterSemester('');
                      } else {
                        setFilterMonth('');
                        setFilterQuarter('');
                        setFilterSemester('');
                      }
                    }}
                    size="small"
                  >
                    <MenuItem value="day">Daily</MenuItem>
                    <MenuItem value="month">Monthly</MenuItem>
                    <MenuItem value="quarter">Quarterly</MenuItem>
                    <MenuItem value="semester">Semester</MenuItem>
                    <MenuItem value="year">Full Year</MenuItem>
                  </TextField>
                  {filterPeriodMode === 'day' && (
                    <TextField type="date" label="Date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
                  )}
                  {filterPeriodMode === 'month' && (
                    <TextField
                      select
                      label="Month"
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      size="small"
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="1">January</MenuItem>
                      <MenuItem value="2">February</MenuItem>
                      <MenuItem value="3">March</MenuItem>
                      <MenuItem value="4">April</MenuItem>
                      <MenuItem value="5">May</MenuItem>
                      <MenuItem value="6">June</MenuItem>
                      <MenuItem value="7">July</MenuItem>
                      <MenuItem value="8">August</MenuItem>
                      <MenuItem value="9">September</MenuItem>
                      <MenuItem value="10">October</MenuItem>
                      <MenuItem value="11">November</MenuItem>
                      <MenuItem value="12">December</MenuItem>
                    </TextField>
                  )}
                  {filterPeriodMode === 'quarter' && (
                    <TextField
                      select
                      label="Quarter"
                      value={filterQuarter}
                      onChange={(e) => setFilterQuarter(e.target.value)}
                      size="small"
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="1">Q1</MenuItem>
                      <MenuItem value="2">Q2</MenuItem>
                      <MenuItem value="3">Q3</MenuItem>
                      <MenuItem value="4">Q4</MenuItem>
                    </TextField>
                  )}
                  {filterPeriodMode === 'semester' && (
                    <TextField
                      select
                      label="Semester"
                      value={filterSemester}
                      onChange={(e) => setFilterSemester(e.target.value)}
                      size="small"
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="1">1st Semester</MenuItem>
                      <MenuItem value="2">2nd Semester</MenuItem>
                    </TextField>
                  )}
                  <Button
                    variant="outlined"
                    sx={{ flex: '0 0 auto', minWidth: 72, height: 36 }}
                    onClick={() => {
                      setFilterStatus('');
                      setFilterType('');
                      setFilterPriority('');
                      setFilterYear(new Date().getFullYear().toString());
                      setFilterMonth((new Date().getMonth() + 1).toString());
                      setFilterQuarter('');
                      setFilterSemester('');
                      setFilterPeriodMode('day');
                      setFilterDate(todayInManila());
                      setSelectedTab('all');
                    }}
                  >
                    Reset
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {canManageAll && (
        <Card sx={{ mb: 1 }}>
          <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
            <Grid container spacing={1} alignItems="center">
              <Grid item xs={12} lg={9}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, '& > *': { flex: '1 1 100px' } }}>
                  <TextField inputProps={{ maxLength: 255 }}
                    select
                    label="Type"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    size="small"
                  >
                    <MenuItem value="">All Types</MenuItem>
                    <MenuItem value="desktop_support">Desktop Support</MenuItem>
                    <MenuItem value="it_support">IT Support</MenuItem>
                    <MenuItem value="pantawid_ict_support">Pantawid ICT Support</MenuItem>
                    <MenuItem value="specialized_concerns">Specialized Concerns</MenuItem>
                  </TextField>
                  <TextField inputProps={{ maxLength: 255 }}
                    select
                    label="Priority"
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    size="small"
                  >
                    <MenuItem value="">All Priorities</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                  </TextField>
                  <TextField
                    select
                    label="SLA"
                    value={filterSla}
                    onChange={(e) => setFilterSla(e.target.value as typeof filterSla)}
                    size="small"
                  >
                    <MenuItem value="">All SLA States</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                    <MenuItem value="nearing_sla">Nearing SLA</MenuItem>
                    <MenuItem value="on_track">On Track</MenuItem>
                  </TextField>
                  <TextField
                    select
                    label="Year"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    size="small"
                  >
                    <MenuItem value="">All</MenuItem>

                    {yearOptions.map((year) => (
                      <MenuItem key={year} value={year.toString()}>{year}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Period"
                    value={filterPeriodMode}
                    onChange={(e) => {
                      const mode = e.target.value as 'day' | 'month' | 'quarter' | 'semester' | 'year';
                      setFilterPeriodMode(mode);
                      setFilterDate(mode === 'day' ? todayInManila() : '');
                      if (mode === 'year') {
                        setFilterMonth('');
                        setFilterQuarter('');
                        setFilterSemester('');
                      } else if (mode === 'semester') {
                        setFilterMonth('');
                        setFilterQuarter('');
                        setFilterSemester('');
                      } else if (mode === 'quarter') {
                        setFilterMonth('');
                        setFilterQuarter('');
                        setFilterSemester('');
                      } else {
                        setFilterMonth('');
                        setFilterQuarter('');
                        setFilterSemester('');
                      }
                    }}
                    size="small"
                  >
                    <MenuItem value="day">Daily</MenuItem>
                    <MenuItem value="month">Monthly</MenuItem>
                    <MenuItem value="quarter">Quarterly</MenuItem>
                    <MenuItem value="semester">Semester</MenuItem>
                    <MenuItem value="year">Full Year</MenuItem>
                  </TextField>
                  {filterPeriodMode === 'day' && (
                    <TextField type="date" label="Date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
                  )}
                  {filterPeriodMode === 'month' && (
                    <TextField
                      select
                      label="Month"
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      size="small"
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="1">January</MenuItem>
                      <MenuItem value="2">February</MenuItem>
                      <MenuItem value="3">March</MenuItem>
                      <MenuItem value="4">April</MenuItem>
                      <MenuItem value="5">May</MenuItem>
                      <MenuItem value="6">June</MenuItem>
                      <MenuItem value="7">July</MenuItem>
                      <MenuItem value="8">August</MenuItem>
                      <MenuItem value="9">September</MenuItem>
                      <MenuItem value="10">October</MenuItem>
                      <MenuItem value="11">November</MenuItem>
                      <MenuItem value="12">December</MenuItem>
                    </TextField>
                  )}
                  {filterPeriodMode === 'quarter' && (
                    <TextField
                      select
                      label="Quarter"
                      value={filterQuarter}
                      onChange={(e) => setFilterQuarter(e.target.value)}
                      size="small"
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="1">Q1</MenuItem>
                      <MenuItem value="2">Q2</MenuItem>
                      <MenuItem value="3">Q3</MenuItem>
                      <MenuItem value="4">Q4</MenuItem>
                    </TextField>
                  )}
                  {filterPeriodMode === 'semester' && (
                    <TextField
                      select
                      label="Semester"
                      value={filterSemester}
                      onChange={(e) => setFilterSemester(e.target.value)}
                      size="small"
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="1">1st Semester</MenuItem>
                      <MenuItem value="2">2nd Semester</MenuItem>
                    </TextField>
                  )}
                  <Button
                    variant="outlined"
                    sx={{ flex: '0 0 auto', minWidth: 72, height: 36 }}
                    onClick={() => {
                      setFilterStatus('');
                      setFilterType('');
                      setFilterPriority('');
                      setFilterSla('');
                      setFilterYear(new Date().getFullYear().toString());
                      setFilterMonth((new Date().getMonth() + 1).toString());
                      setFilterQuarter('');
                      setFilterSemester('');
                      setFilterPeriodMode('day');
                      setFilterDate(todayInManila());
                      setSelectedTab('all');
                    }}
                  >
                    Reset
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={12} lg={3}>
                <Stack direction="row" spacing={1} sx={{ '& > *': { flex: 1, minWidth: 0 } }}>
                  {!restrictedAssignedOnly && (isFocalTech || canManageAll) && (
                    <Badge badgeContent={myTicketsCount} color="error" overlap="circular" sx={{ width: '100%', height: 36, '& .MuiBadge-badge': { zIndex: 1 } }}>
                      <Button
                        fullWidth
                        size="small"
                        variant={showMyTickets ? 'contained' : 'outlined'}
                        color="primary"
                        sx={{ height: '100%', whiteSpace: 'nowrap', px: 1 }}
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
                    <Badge badgeContent={escalatedToMeCount} color="error" overlap="circular" sx={{ width: '100%', height: 36, '& .MuiBadge-badge': { zIndex: 1 } }}>
                      <Button
                        fullWidth
                        size="small"
                        variant={showEscalatedToMe ? 'contained' : 'outlined'}
                        color="warning"
                        sx={{ height: '100%', whiteSpace: 'nowrap', px: 1 }}
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
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
      {!restrictedAssignedOnly && !canManageAll && (isFocalTech || canViewEscalatedQueue) && (
        <Card sx={{ mb: 1 }}>
          <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
            <Stack direction="row" spacing={1} sx={{ '& > *': { flex: 1, maxWidth: { xs: '100%', md: '50%', lg: '33%' } } }}>
              {(isFocalTech || canManageAll) && (
                <Badge badgeContent={myTicketsCount} color="error" overlap="circular" sx={{ width: '100%', '& .MuiBadge-badge': { zIndex: 1 } }}>
                  <Button
                    fullWidth
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
                <Badge badgeContent={escalatedToMeCount} color="error" overlap="circular" sx={{ width: '100%', '& .MuiBadge-badge': { zIndex: 1 } }}>
                  <Button
                    fullWidth
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
      <Card sx={{ mb: 1 }}>
        <CardContent sx={{ pt: 0.5, px: 1, pb: '0 !important' }}>
          <Tabs value={selectedTab === 'to_rate' ? false : selectedTab} onChange={(_, value) => { setSelectedTab(value); setShowEscalations(false); }} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
            {statusTabs.map(({ key, label }) => (
              <Tab key={key} value={key} label={key === 'proxy' ? label : `${label} (${key === 'all' ? allCount : statusCounts[key] ?? 0})`} />
            ))}
          </Tabs>
          {canManageAll && <Button size="small" onClick={() => setShowEscalations((value) => !value)}>Escalations ({frontendFilteredEscalations.length})</Button>}
          {user?.role === 'user' && <Button size="small" onClick={() => { setSelectedTab('to_rate'); setShowEscalations(false); }}>To Rate ({pendingSatCount})</Button>}
        </CardContent>
      </Card>

      {canManageAll && showEscalations ? (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress size={28} />
              </Box>
            ) : frontendFilteredEscalations.length === 0 ? (
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
                    {frontendFilteredEscalations.map((e) => (
                      <TableRow key={e.id} hover onClick={() => router.push(`/operations/tickets/${e.ticketId}`)} sx={{ cursor: 'pointer' }}>
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
                        <TableCell>{formatPersonName(e.escalatedBy, '—')}</TableCell>
                        <TableCell>{formatPersonName(e.escalatedTo, '—')}</TableCell>
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
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ticket ${ticket.ticketNumber}`}
                  onClick={() => router.push(`/operations/tickets/${ticket.id}`)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      router.push(`/operations/tickets/${ticket.id}`);
                    }
                  }}
                  sx={{
                    ...(hasPendingSatisfaction ? { backgroundColor: 'warning.50' } : {}),
                    cursor: 'pointer',
                    transition: 'box-shadow 120ms ease, transform 120ms ease',
                    '&:hover, &:focus-visible': { boxShadow: 4 },
                    '&:active': { transform: 'scale(0.995)' },
                  }}
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
                          label={`Requested for: ${ticket.requester ? formatPersonName(ticket.requester, ticket.requester.email || 'Unknown') : 'Unknown'}`}
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
                      {ticket.resolutionTimeOverride && (
                        <Chip size="small" label="SLA time adjusted" color="secondary" variant="outlined" />
                      )}
                    </Stack>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </Typography>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              router.push(`/operations/tickets/${ticket.id}`);
                            }}
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
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openAssignDialog(ticket);
                                }}
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
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEscalateDialog(ticket);
                                }}
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
                              onClick={(event) => {
                                event.stopPropagation();
                                openSatDialog(ticket);
                              }}
                            >
                              <SatisfactionIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canOverrideResolutionTime && ['resolved', 'closed'].includes(ticket.status) && (
                          <Tooltip title="Correct resolution time">
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={(event) => {
                                event.stopPropagation();
                                openResolutionOverrideDialog(ticket);
                              }}
                            >
                              <ResolutionTimeIcon fontSize="small" />
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
        <Box position="relative">
          {canScrollLeft && (
            <IconButton
              size="small"
              onClick={() => tableContainerRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
              sx={{
                position: 'absolute',
                left: 8, // float over the sticky Ticket column
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 4,
                bgcolor: 'background.paper',
                boxShadow: 3,
                '&:hover': { bgcolor: 'background.paper' }
              }}
            >
              <ChevronLeft />
            </IconButton>
          )}
          {canScrollRight && (
            <IconButton
              size="small"
              onClick={() => tableContainerRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
              sx={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 4,
                bgcolor: 'background.paper',
                boxShadow: 3,
                '&:hover': { bgcolor: 'background.paper' }
              }}
            >
              <ChevronRight />
            </IconButton>
          )}
          <TableContainer 
            component={Card} 
            sx={{ overflow: 'auto', maxHeight: 'calc(100vh - 320px)' }}
            ref={tableContainerRef}
            onScroll={handleTableScroll}
          >
          <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: '100%', minWidth: canManageAll ? 1300 : 1060 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 90, position: 'sticky', left: 0, backgroundColor: 'background.paper', zIndex: 3, borderRight: '1px solid', borderColor: 'divider' }}>Ticket #</TableCell>
                <TableCell sx={{ width: 270 }}>Subject</TableCell>
                <TableCell sx={{ width: 150 }}>Type</TableCell>
                <TableCell sx={{ width: 130 }}>Category</TableCell>
                <TableCell sx={{ width: 110 }}>Priority</TableCell>
                <TableCell sx={{ width: 140, ...populatedFieldSx(!!user?.middleName) }}>Status</TableCell>
                <TableCell sx={{ width: 120 }}>SLA</TableCell>
                {canManageAll && <TableCell sx={{ width: 120 }}>Requester</TableCell>}
                {canManageAll && <TableCell sx={{ width: 120 }}>Assigned To</TableCell>}
                <TableCell sx={{ width: 140, ...populatedFieldSx(!!user?.middleName) }}>Date</TableCell>
                <TableCell sx={{ width: 120 }}>Actions</TableCell>
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

                  const hasUnread = canManageAll ? ticket.hasUnreadTechnician : ticket.hasUnreadUser;

                  return (
                    <TableRow
                      key={ticket.id}
                      hover
                      className="ticket-row"
                      sx={[
                        { '&:hover .ticket-cell::after': { opacity: 1 } }
                      ]}
                    >
                      {/* Ticket # */}
                      <TableCell 
                        className="ticket-cell"
                        sx={{ 
                          fontFamily: 'monospace', fontWeight: 600, wordBreak: 'break-word', 
                          position: 'sticky', left: 0, 
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? '#121212' : '#ffffff', 
                          zIndex: 2, borderRight: '1px solid', borderColor: 'divider',
                          '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            bgcolor: 'rgba(0, 0, 0, 0.04)',
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            pointerEvents: 'none',
                            zIndex: 0,
                          }
                        }}
                      >
                        <Box sx={{ position: 'relative', zIndex: 1 }}>
                          {hasUnread ? (
                            <Badge color="error" variant="dot" sx={{ '& .MuiBadge-badge': { right: -6, top: 4 } }}>
                              {ticket.ticketNumber}
                            </Badge>
                          ) : (
                            ticket.ticketNumber
                          )}
                        </Box>
                      </TableCell>
                      {/* Subject — only column with ellipsis */}
                      <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ticket.subject}
                      </TableCell>
                      {/* Type */}
                      <TableCell sx={{ verticalAlign: 'top', py: 1 }}>
                        <Stack direction="column" spacing={0.5}>
                          {ticket.createdById && ticket.createdById !== ticket.requesterId && (
                            <Chip
                              size="small"
                              label="Proxy"
                              color="secondary"
                              sx={{
                                width: '100%', height: 'auto', py: 0.5,
                                '& .MuiChip-label': { display: 'block', whiteSpace: 'normal', wordBreak: 'break-word' }
                              }}
                            />
                          )}
                          <Chip
                            size="small"
                            icon={ticketTypeIcon(ticket.ticketType)}
                            label={TICKET_TYPE_LABELS[ticket.ticketType]}
                            variant="outlined"
                            sx={{
                              width: '100%', height: 'auto', py: 0.5,
                              '& .MuiChip-label': { display: 'block', whiteSpace: 'normal', wordBreak: 'break-word' }
                            }}
                          />
                        </Stack>
                      </TableCell>
                      {/* Category */}
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {ticket.category?.name ?? '—'}
                        </Typography>
                      </TableCell>
                      {/* Priority */}
                      <TableCell sx={{ verticalAlign: 'top', py: 1 }}>
                        {ticket.priority ? (
                          <Chip
                            size="small"
                            label={ticket.priority.toUpperCase()}
                            color={ticket.priority === 'critical' ? 'default' : (PRIORITY_COLOR[ticket.priority] ?? 'default')}
                            sx={{
                              width: '100%',
                              ...(ticket.priority === 'critical' && {
                                bgcolor: '#000',
                                color: '#fff',
                                '& .MuiChip-label': { color: '#fff' },
                              }),
                              ...(ticket.priority === 'urgent' && {
                                bgcolor: 'error.dark',
                                color: '#fff',
                                '& .MuiChip-label': { color: '#fff' },
                              }),
                            }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                      {/* Status */}
                      <TableCell sx={{ verticalAlign: 'top', py: 1 }}>
                        <Stack direction="column" spacing={0.5}>
                          <Chip
                            size="small"
                            label={ticket.status.replace(/_/g, ' ').toUpperCase()}
                            color={STATUS_COLOR[ticket.status] ?? 'default'}
                            sx={{ width: '100%' }}
                          />
                          {hasPendingSatisfaction && (
                            <Chip size="small" label="Unrated" color="warning" variant="filled" sx={{ width: '100%' }} />
                          )}
                        </Stack>
                      </TableCell>
                      {/* SLA */}
                      <TableCell sx={{ verticalAlign: 'top', py: 1 }}>
                        {(() => {
                          const s = getSlaStatus(ticket);
                          return s ? (
                            <Stack spacing={0.5}>
                              <Chip
                                size="small"
                                label={SLA_CHIP[s].label}
                                color={SLA_CHIP[s].color}
                                sx={{ width: '100%' }}
                              />
                              {ticket.resolutionTimeOverride && (
                                <Chip size="small" label="Time adjusted" color="secondary" variant="outlined" />
                              )}
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.disabled">—</Typography>
                          );
                        })()}
                      </TableCell>
                      {/* Requester */}
                      {canManageAll && (
                        <TableCell>
                          <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                            {ticket.requester
                              ? formatPersonName(ticket.requester, ticket.requester.email)
                              : '—'}
                          </Typography>
                        </TableCell>
                      )}
                      {/* Assigned To */}
                      {canManageAll && (
                        <TableCell>
                          {ticket.assignedTo ? (
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                {formatPersonName(ticket.assignedTo, ticket.assignedTo.email)}
                              </Typography>
                              {ticket.assignedTechAbsent && (canAssign || canManageAll) && (
                                <Tooltip title="Technician is absent today">
                                  <FiberManualRecord sx={{ color: 'error.main', fontSize: 10, flexShrink: 0 }} />
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
                      {/* Date */}
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => router.push(`/operations/tickets/${ticket.id}`)}
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
                          {canOverrideResolutionTime && ['resolved', 'closed'].includes(ticket.status) && (
                            <Tooltip title="Correct resolution time">
                              <IconButton
                                size="small"
                                color="secondary"
                                onClick={() => openResolutionOverrideDialog(ticket)}
                              >
                                <ResolutionTimeIcon fontSize="small" />
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
        </Box>
      )}

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" sx={{ mt: 1, mb: 2 }}>
          <Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} color="primary" size="small" showFirstButton showLastButton />
        </Box>
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
                {
                  value: 'specialized_concerns' as TicketType,
                  label: 'Specialized Concerns',
                  icon: '🧭',
                  color: '#00695c',
                  desc: 'Reviews, assessments, governance, upgrades, and specialist work',
                },
              ].map((opt) => (
                <Card
                  key={opt.value}
                  onClick={() => setForm({ ...form, ticketType: opt.value, categoryId: undefined, issueTypeId: undefined })}
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

            {categories.length > 0 && (() => {
              const filteredCategories = categories.filter((c) => {
                if (c.isDeleted) return false;
                if (form.ticketType === 'it_support') return c.isIt;
                if (form.ticketType === 'desktop_support') return c.isDesktop;
                if (form.ticketType === 'pantawid_ict_support') return c.isPantawid;
                if (form.ticketType === 'specialized_concerns') return c.isSpecialized;
                return false;
              });

              if (filteredCategories.length === 0) return null;

              return (
                <Autocomplete
                  options={filteredCategories}
                  getOptionLabel={(category) => category.name}
                  value={filteredCategories.find((category) => category.id === form.categoryId) ?? null}
                  onChange={(_, category) => setForm({ ...form, categoryId: category?.id, issueTypeId: undefined })}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  openOnFocus
                  clearOnEscape
                  fullWidth
                  noOptionsText="No categories available"
                  renderInput={(params) => (
                    <TextField {...params} label="Category" helperText="Select a specific category for faster routing" />
                  )}
                />
              );
            })()}

            {user?.role !== 'user' && categories.length > 0 && issues.length > 0 && form.categoryId && (() => {
              // Older ticket-settings responses serialize the foreign key as
              // `category_id`; accept both shapes while the API contract is
              // normalized so issue selection does not silently disappear.
              const filteredIssues = issues.filter((iss) => !iss.isDeleted && (iss.categoryId ?? iss.category_id) === form.categoryId);

              if (filteredIssues.length === 0) return null;

              return (
                <Autocomplete
                  options={filteredIssues}
                  getOptionLabel={(issue) => issue.name}
                  value={filteredIssues.find((issue) => issue.id === form.issueTypeId) ?? null}
                  onChange={(_, issue) => setForm({ ...form, issueTypeId: issue?.id })}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  openOnFocus
                  clearOnEscape
                  fullWidth
                  noOptionsText="No issues available"
                  renderInput={(params) => (
                    <TextField {...params} label="Issue *" required helperText="Required for RICTMS staff; this determines routing and SLA tracking" />
                  )}
                />
              );
            })()}

            <TextField label="Subject *"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              inputProps={{ maxLength: 255 }}
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
                    <TextField label="Equipment Type *"
                      size="small"
                      fullWidth
                      value={disposalDetails.equipmentType}
                      onChange={(e) => setDisposalDetails({ ...disposalDetails, equipmentType: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Serial Number *"
                      size="small"
                      fullWidth
                      value={disposalDetails.serialNumber}
                      onChange={(e) => setDisposalDetails({ ...disposalDetails, serialNumber: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Property Number *"
                      size="small"
                      fullWidth
                      value={disposalDetails.propertyNumber}
                      onChange={(e) => setDisposalDetails({ ...disposalDetails, propertyNumber: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Reason for Disposal *"
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
                          sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' }, mb: 0.5 }}
                          onClick={() => setExpandedKbId(expandedKbId === kb.id ? null : kb.id)}
                        >
                          {kb.title} {expandedKbId === kb.id ? '▲' : '▼'}
                        </Typography>
                        {kb.tags && (
                          <Box display="flex" gap={0.5} flexWrap="wrap" mb={1}>
                            {kb.tags.split(',').map((tag: string) => (
                              <Chip key={tag} label={tag.trim()} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                            ))}
                          </Box>
                        )}
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
            <TextField label="Description *"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              inputProps={{ maxLength: 1000 }}
              fullWidth
              multiline
              rows={4}
              placeholder="Provide details: what happened, when, steps tried..."
            />
            <Box
              tabIndex={0}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                selectTicketImage(event.dataTransfer.files?.[0]);
              }}
              onPaste={(event) => {
                const image = Array.from(event.clipboardData.files).find((file) => file.type.startsWith('image/'));
                if (image) {
                  event.preventDefault();
                  selectTicketImage(image);
                }
              }}
              sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1, p: 1.5, outline: 'none', '&:focus': { borderColor: 'primary.main' } }}
            >
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Attach Image (Optional) — select, drag and drop, or focus here and paste from the clipboard
              </Typography>
              <Button component="label" variant="outlined" size="small" startIcon={<UploadIcon />}>
                {selectedImage ? 'Change Image' : 'Select Image'}
                <input
                  type="file"
                  hidden
                  accept={ALLOWED_IMAGE_FILE_ACCEPT}
                  onChange={(e) => {
                    selectTicketImage(e.target.files?.[0]);
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
                formatPersonName(u, u.email)
              }
              value={allUsers.find((u) => u.id === form.requesterId) ?? null}
              onChange={(_, newValue) =>
                setForm({ ...form, requesterId: newValue?.id ?? undefined })
              }
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params}
                  label="Requested For (Optional)"
                  helperText="Leave blank if you are requesting for yourself. Select a user to request on their behalf."
                  fullWidth
                />
              )}
              clearOnEscape
              fullWidth
            />
            {isTicketAdmin && (
              <Autocomplete
                options={technicians}
                getOptionLabel={(technician) => `${formatPersonName(technician, technician.email)} (${technician.openCount ?? 0} Active${technician.attendanceStatus === 'out_of_office' ? ', OOO' : ''})`}
                value={technicians.find((technician) => technician.id === form.assignedToId) ?? null}
                onChange={(_, technician) => setForm({ ...form, assignedToId: technician?.id })}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                openOnFocus
                clearOnEscape
                fullWidth
                noOptionsText="No eligible staff available"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Assignment"
                    helperText={
                      form.ticketType === 'specialized_concerns'
                        ? 'Leave blank for manual assignment later.'
                        : 'Leave blank to use automatic assignment.'
                    }
                  />
                )}
              />
            )}
            {(canManageAll || isTechnician) && (
              <TextField inputProps={{ maxLength: 255 }}
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
          <Button onClick={() => handleSubmitTicket()} variant="contained" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Ticket'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={requestedForConfirmOpen}
        onClose={() => setRequestedForConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Requested For is blank</DialogTitle>
        <DialogContent>
          <Typography>
            No Requested For user was selected. Do you want to submit this ticket for yourself?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestedForConfirmOpen(false)}>No</Button>
          <Button
            variant="contained"
            onClick={() => {
              setRequestedForConfirmOpen(false);
              handleSubmitTicket(true);
            }}
          >
            Yes, submit for me
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
              router.push('/operations/tickets?filter=pending_satisfaction');
            }}
          >
            Go To Tickets
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={!!resolutionOverrideTicket} onClose={closeResolutionOverrideDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Correct Resolution Time</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning">
              The recorded system resolution time will remain unchanged. The verified time will be used for SLA displays and reports.
            </Alert>
            <Typography variant="body2">
              Ticket: <strong>{resolutionOverrideTicket?.ticketNumber}</strong>
            </Typography>
            <TextField
              label="Recorded system resolution time"
              value={resolutionOverrideTicket?.resolvedAt ? new Date(resolutionOverrideTicket.resolvedAt).toLocaleString() : ''}
              disabled
              fullWidth
            />
            <TextField
              label="Verified completion date and time"
              type="datetime-local"
              value={resolutionOverrideTime}
              onChange={(event) => setResolutionOverrideTime(event.target.value)}
              inputProps={{
                min: toDateTimeLocalValue(resolutionOverrideTicket?.createdAt),
                max: toDateTimeLocalValue(resolutionOverrideTicket?.resolvedAt),
              }}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
            />
            <TextField
              label="Reason for correction"
              value={resolutionOverrideReason}
              onChange={(event) => setResolutionOverrideReason(event.target.value)}
              helperText="Required, minimum 10 characters. Explain why the recorded time differs from the actual completion time."
              inputProps={{ maxLength: 2000 }}
              multiline
              minRows={3}
              required
              fullWidth
            />
            <TicketImageDropzone
              files={resolutionOverrideFiles}
              onFilesChange={setResolutionOverrideFiles}
              label="Proof image with visible timestamp (required, max 10 files, 10 MB each)."
              buttonLabel="Select Proof Image(s)"
            />
            <FormControlLabel
              control={(
                <Checkbox
                  checked={resolutionOverrideConfirmed}
                  onChange={(event) => setResolutionOverrideConfirmed(event.target.checked)}
                />
              )}
              label="I confirm that the attached proof visibly supports the verified completion time."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeResolutionOverrideDialog} disabled={savingResolutionOverride}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={submitResolutionOverride}
            disabled={savingResolutionOverride}
          >
            {savingResolutionOverride ? 'Saving…' : 'Save Correction'}
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
              getOptionLabel={(t) => `${formatPersonName(t, t.email)} (${t.openCount} Active${t.attendanceStatus === 'out_of_office' ? ', OOO' : ''})`}
              value={technicians.find((t) => String(t.id) === selectedTechId) ?? null}
              onChange={(_, newValue) => setSelectedTechId(newValue ? String(newValue.id) : '')}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params}
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
            getOptionLabel={(t) => formatPersonName(t, t.email)}
            value={escalationFocalUsers.find((t) => String(t.id) === escalateToId) ?? null}
            onChange={(_, newValue) => setEscalateToId(newValue ? String(newValue.id) : '')}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField {...params}
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
          <TextField inputProps={{ maxLength: 255 }}
            fullWidth
            multiline
            rows={3}
            label="Reason for escalation (optional)"
            value={escalateNotes}
            onChange={(e) => setEscalateNotes(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TicketImageDropzone
            files={escalateFiles}
            onFilesChange={setEscalateFiles}
            label="Proof photos (optional, max 10 files, 10 MB each)."
            buttonLabel="Select Proof Photo(s)"
          />
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
                  disabled={!!user?.units?.[0]?.name} sx={populatedFieldSx(!!user?.units?.[0]?.name)}
                  value={csatForm.unitSection}
                  onInputChange={(_, v) => setCsatForm((f) => ({ ...f, unitSection: v }))}
                  renderInput={(params) => <TextField {...params} label="Unit/Section *" />}
                />
                <TextField label="Date of Transaction *"
                  type="date"
                  value={csatForm.dateOfTransaction}
                  InputProps={{ readOnly: true }}
                  disabled
                  fullWidth
                  InputLabelProps={{ shrink: true }} sx={populatedFieldSx(true)}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="First Name *"
                  disabled={!!user?.firstName} sx={populatedFieldSx(!!user?.firstName)}
                  value={csatForm.clientFirstName}
                  onChange={(e) => setCsatForm((f) => ({ ...f, clientFirstName: e.target.value }))}
                  fullWidth
                />
                <TextField label="M.I."
                  disabled={!!user?.middleName}
                  value={csatForm.clientMiddleInitial}
                  onChange={(e) =>
                    setCsatForm((f) => ({ ...f, clientMiddleInitial: e.target.value.substring(0, 1) }))
                  }
                  sx={{ width: 140, ...populatedFieldSx(!!user?.middleName) }}
                />
                <TextField label="Last Name *"
                  disabled={!!user?.lastName} sx={populatedFieldSx(!!user?.lastName)}
                  value={csatForm.clientLastName}
                  onChange={(e) => setCsatForm((f) => ({ ...f, clientLastName: e.target.value }))}
                  fullWidth
                />
                <TextField label="Suffix"
                  disabled={!!user?.suffix}
                  value={csatForm.suffix}
                  onChange={(e) => setCsatForm((f) => ({ ...f, suffix: e.target.value }))}
                  sx={{ width: 200, ...populatedFieldSx(!!user?.suffix) }}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Age"
                  type="number"
                  inputProps={{ min: 20, max: 89 }}
                  value={csatForm.age ?? ''}
                  onChange={(e) => setCsatForm((f) => ({ ...f, age: Number(e.target.value) }))}
                  sx={{ maxWidth: 100 }}
                />
                <TextField label="Religion"
                  value={csatForm.religion ?? ''}
                  onChange={(e) => setCsatForm((f) => ({ ...f, religion: e.target.value }))}
                  sx={{ flex: 1 }}
                />
                <TextField inputProps={{ maxLength: 255 }}
                  select
                  label="Sex *"
                  disabled={!!user?.sex}
                  value={csatForm.sex}
                  onChange={(e) => setCsatForm((f) => ({ ...f, sex: e.target.value }))}
                  sx={{ minWidth: 120, ...populatedFieldSx(!!user?.sex) }}
                >
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                  <MenuItem value="Prefer Not to Say">Prefer Not to Say</MenuItem>
                </TextField>
              <TextField label="Contact Number *"
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
                  sx={{ flex: 1, ...populatedFieldSx(!!user?.phoneNumber) }}
                />
              </Stack>

              <TextField label="Technician Name"
                value={csatForm.technicianName}
                InputProps={{ readOnly: true }}
                inputProps={{ tabIndex: -1 }}
                fullWidth
                sx={{
                  '& .MuiInputBase-input': {
                    color: 'text.primary',
                    fontStyle: 'italic',
                    cursor: 'default',
                  },
                  '& .MuiInputLabel-root': { color: 'text.primary' },
                }}
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
