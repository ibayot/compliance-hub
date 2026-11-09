import WorkspaceTabs from '@/components/layout/WorkspaceTabs';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';
import { useEffect, useId, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, Grid, IconButton, InputLabel, MenuItem, Paper, Select, Stack, Switch, Tab, Table, TableBody, TableCell, TableContainer as MuiTableContainer, TableHead, TablePagination, TableRow, Tabs, TextField, Typography } from '@mui/material';
import { Add, Delete, Edit, ExpandMore, GroupAdd, Refresh, Star } from '@mui/icons-material';
import { dutiesApi, DutyAccess, DutyType } from '@/lib/api/duties';
import type { UserRecord } from '@/lib/api/users';
import { formatPersonName } from '@/lib/utils/person-name';
import { useSse } from '@/lib/utils/useSse';
import { useSnackbar } from 'notistack';
import { alpha, useTheme } from '@mui/material/styles';
import ResponsiveTable from '@/components/layout/ResponsiveTable';
import { SearchableMultiSelect, SearchableSelect } from '@/components/SearchableSelect';

const TYPES: DutyType[] = ['OD', 'ROC', 'CONFERENCE', 'OPCEN'];
const VENUES = ['ROC', 'CONFERENCE', 'OPCEN'];
const PAGE_SIZE = 10;
const EMPTY_PAGE = { items: [], total: 0, page: 1, limit: PAGE_SIZE, totalPages: 0 };
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const TODAY = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
const isDutyStaff = (user: any) => user.active !== false && user.role !== 'super_admin' && user.role !== 'user' && user.technicianEligible === true;
const formatType = (value: string) => String(value || '').replaceAll('_', ' ').toUpperCase();
const userName = (users: UserRecord[], id: number) => { const u = users.find((x) => x.id === id); return u ? formatPersonName(u, `User #${id}`) : `User #${id}`; };
const meetingSlot = (x: any) => !x.startTime && !x.endTime ? 'Whole Day' : Number(String(x.startTime).slice(0, 2)) < 12 ? 'AM' : 'PM';
const TableContainer = ({ component, children, ...props }: any) => component
  ? <MuiTableContainer component={component} {...props}>{children}</MuiTableContainer>
  : <ResponsiveTable minWidth={620}>{children}</ResponsiveTable>;

export default function DutiesPage() {
  const now = new Date();
  const [access, setAccess] = useState<DutyAccess | null>(null);
  const [tab, setTab] = useState('overview');
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<any>({ dashboard: [], rotation: [], roster: [], rosterConfig: { odOverrideEnabled: false }, logs: EMPTY_PAGE, exceptions: EMPTY_PAGE, reservations: EMPTY_PAGE, map: {} });
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [logsPage, setLogsPage] = useState(0);
  const [exceptionsPage, setExceptionsPage] = useState(0);
  const [reservationsPage, setReservationsPage] = useState(0);
  const [dialog, setDialog] = useState<'log'|'exception'|'reservation'|'roster'|'coverage'|'relievers'|null>(null);
  const [form, setForm] = useState<any>({});
  const [selectedDay, setSelectedDay] = useState<string>(TODAY());
  const [skipTarget, setSkipTarget] = useState<any | null>(null);
  const [skipConfirmed, setSkipConfirmed] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<any | null>(null);
  const [releaseConfirmed, setReleaseConfirmed] = useState(false);
  const [cancelMeetingTarget, setCancelMeetingTarget] = useState<any | null>(null);
  const [cancelMeetingReason, setCancelMeetingReason] = useState('');
  const [cancelMeetingConfirmed, setCancelMeetingConfirmed] = useState(false);
  const [cancellingMeeting, setCancellingMeeting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const dutyGradient = (color: 'warning' | 'info') => {
    const main = theme.palette[color].main;
    return isDark
      ? `linear-gradient(135deg, ${alpha(main, 0.2)} 0%, ${alpha(main, 0.05)} 100%)`
      : `linear-gradient(135deg, ${alpha(main, 0.15)} 0%, ${alpha(main, 0.05)} 100%)`;
  };

  const load = async (silent = false) => {
    try {
      if (!silent) setBusy(true);
      const firstLoad = !access;
      const a = access ?? await dutiesApi.access();
      if (firstLoad) setAccess(a);
      if (!a.viewer && !a.canSchedule) return;
      const [dashboard, rotation, map, logs, exceptions, reservations, staff, roster, rosterConfig] = await Promise.all([
        tab === 'overview' ? dutiesApi.dashboard() : undefined,
        tab === 'rotation' ? dutiesApi.rotation() : undefined,
        tab === 'map' ? dutiesApi.map(year, month) : undefined,
        tab === 'logs' && a.admin ? dutiesApi.logs(logsPage + 1, PAGE_SIZE) : undefined,
        tab === 'exceptions' && a.admin ? dutiesApi.exceptions(exceptionsPage + 1, PAGE_SIZE) : undefined,
        tab === 'meetings' && (a.admin || a.canSchedule) ? dutiesApi.reservations(reservationsPage + 1, PAGE_SIZE) : undefined,
        firstLoad && a.admin ? dutiesApi.staff() : undefined,
        a.admin && (firstLoad || tab === 'roster') ? dutiesApi.roster() : undefined,
        a.admin && (firstLoad || tab === 'roster') ? dutiesApi.rosterConfig() : undefined,
      ]);
      setData((current:any) => ({
        ...current,
        ...(dashboard ? { dashboard } : {}),
        ...(rotation ? { rotation } : {}),
        ...(map ? { map } : {}),
        ...(logs ? { logs } : {}),
        ...(exceptions ? { exceptions } : {}),
        ...(reservations ? { reservations } : {}),
        ...(roster ? { roster } : {}),
        ...(rosterConfig ? { rosterConfig } : {}),
      }));
      if (staff) setUsers(staff.filter(isDutyStaff));
      setError('');
    } catch (e: any) { setError(e?.response?.data?.message || 'Unable to load Duty Monitoring.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, [tab, year, month, logsPage, exceptionsPage, reservationsPage]);
  useEffect(() => {
    const [selectedYear, selectedMonth] = selectedDay.split('-').map(Number);
    if (selectedYear !== year || selectedMonth !== month) {
      setSelectedDay(`${year}-${String(month).padStart(2, '0')}-01`);
    }
  }, [year, month, selectedDay]);
  useSse(['DUTY_UPDATED', 'ATTENDANCE_UPDATED', 'TICKET_UPDATED'], () => void load(true));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (dialog === 'log') { await dutiesApi.saveLog({ dutyDate: form.dutyDate, userId: form.userId, dutyType: form.dutyType, dutyPeriod: form.dutyPeriod, remarks: form.remarks }, form.id); setLogsPage(0); }
      if (dialog === 'exception') { await dutiesApi.saveException({ exceptionDate: form.exceptionDate, userId: form.userId, dutyType: form.dutyType, type: form.type, remarks: form.remarks }, form.id); setExceptionsPage(0); }
      if (dialog === 'reservation') {
        const payload: any = { meetingDate: form.meetingDate, venueType: form.venueType, status: form.status, purpose: form.purpose || '' };
        if (form.slot === 'AM') { payload.startTime = '08:00'; payload.endTime = '12:00'; }
        if (form.slot === 'PM') { payload.startTime = '13:00'; payload.endTime = '17:00'; }
        if (form.slot === 'WHOLE_DAY') { payload.startTime = null; payload.endTime = null; }
        await dutiesApi.saveReservation(form.restrictions?.scheduleLocked ? { purpose: payload.purpose } : payload, form.id);
        setReservationsPage(0);
      }
      if (dialog === 'roster') await dutiesApi.replaceRoster(form.userIds || [], form.odOnlyUserIds || [], !!form.odOverrideEnabled);
      if (dialog === 'relievers') {
        if (!(form.userIds || []).length) throw new Error('Select at least one immediate reliever.');
        if (String(form.reason || '').trim().length < 3) throw new Error('A reason of at least 3 characters is required.');
        await dutiesApi.saveMeetingRelievers(form.id, form.userIds, String(form.reason).trim());
      }
      if (dialog === 'coverage') await dutiesApi.activateCoverage(form.coverageId, form.userId);
      setDialog(null); setForm({}); await load(true);
      enqueueSnackbar('Duty record saved.', { variant: 'success' });
    } catch (e: any) { enqueueSnackbar(e?.response?.data?.message || e?.message || 'Unable to save Duty record.', { variant: 'error' }); }
    finally { setSaving(false); }
  };
  const open = (kind: typeof dialog, value: any) => { setDialog(kind); setForm(value); };
  const dutyRosterUsers = (dutyType: string, currentId?: number) => {
    const rosterIds = new Set(data.roster.map((row: any) => row.userId));
    return users.filter((user: any) => isDutyStaff(user) && (rosterIds.has(user.id) || user.id === currentId));
  };
  const openSkip = (value: any) => { setSkipTarget(value); setSkipConfirmed(false); };
  const skip = async () => {
    if (!skipTarget || !skipConfirmed) return;
    try {
      await dutiesApi.skipCoverage(skipTarget.coverageId, skipTarget.userId);
      setSkipTarget(null); setSkipConfirmed(false); await load(true);
    } catch (e: any) { enqueueSnackbar(e?.response?.data?.message || 'Unable to skip the duty technician.', { variant: 'error' }); }
  };
  const requestDelete = (kind: 'log' | 'exception' | 'reservation', row: any) => {
    const date = kind === 'log' ? row.dutyDate : kind === 'reservation' ? row.meetingDate : row.exceptionDate;
    const name = kind === 'log' ? row.name : kind === 'reservation' ? `${row.venueType} meeting` : userName(users, row.userId);
    setDeleteTarget({ kind, id: row.id, label: `${name} on ${date}` });
    setDeleteConfirmed(false);
  };
  const confirmDelete = async () => {
    if (!deleteTarget || !deleteConfirmed || deleting) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'log') await dutiesApi.deleteLog(deleteTarget.id);
      if (deleteTarget.kind === 'exception') await dutiesApi.deleteException(deleteTarget.id);
      if (deleteTarget.kind === 'reservation') await dutiesApi.deleteReservation(deleteTarget.id);
      const goToPreviousLogsPage = deleteTarget.kind === 'log' && data.logs.items.length === 1 && logsPage > 0;
      const goToPreviousExceptionsPage = deleteTarget.kind === 'exception' && data.exceptions.items.length === 1 && exceptionsPage > 0;
      const goToPreviousReservationsPage = deleteTarget.kind === 'reservation' && data.reservations.items.length === 1 && reservationsPage > 0;
      setDeleteTarget(null); setDeleteConfirmed(false);
      enqueueSnackbar(deleteTarget.kind === 'log' ? 'Duty Log entry deleted.' : deleteTarget.kind === 'reservation' ? 'Meeting schedule deleted.' : 'Duty exception deleted.', { variant: 'success' });
      if (goToPreviousLogsPage) setLogsPage((value) => value - 1);
      else if (goToPreviousExceptionsPage) setExceptionsPage((value) => value - 1);
      else if (goToPreviousReservationsPage) setReservationsPage((value) => value - 1);
      else await load(true);
    } catch (e: any) { enqueueSnackbar(e?.response?.data?.message || 'Unable to remove Duty record.', { variant: 'error' }); }
    finally { setDeleting(false); }
  };
  const release = async () => {
    if (!releaseTarget || !releaseConfirmed) return;
    try {
      await dutiesApi.releaseCoverage(releaseTarget.coverageId);
      setReleaseTarget(null); setReleaseConfirmed(false);
      enqueueSnackbar(releaseTarget.dutyType === 'OD' ? 'OD duty ended and saved. The next eligible technician is ready for manual activation.' : 'Duty completed and saved to the Duty Log.', { variant: 'success' });
      await load(true);
    } catch (e: any) { enqueueSnackbar(e?.response?.data?.message || 'Unable to return the OD to Ticket Assignment.', { variant: 'error' }); }
  };
  const finishReservation = async (reservationId: string) => {
    try {
      await dutiesApi.completeReservation(reservationId);
      enqueueSnackbar('Duty completed and saved to the Duty Log.', { variant: 'success' });
      await load(true);
    } catch (e: any) { enqueueSnackbar(e?.response?.data?.message || 'Unable to finish the duty.', { variant: 'error' }); }
  };
  const requestMeetingCancellation = (meeting: any) => {
    setCancelMeetingTarget(meeting);
    setCancelMeetingReason('');
    setCancelMeetingConfirmed(false);
  };
  const cancelMeeting = async () => {
    const reason = cancelMeetingReason.trim();
    if (!cancelMeetingTarget || cancellingMeeting || !cancelMeetingConfirmed || reason.length < 3 || reason.length > 2000) return;
    setCancellingMeeting(true);
    try {
      await dutiesApi.cancelReservation(cancelMeetingTarget.id, reason);
      setCancelMeetingTarget(null);
      enqueueSnackbar('Meeting cancelled. Assigned staff released; no completed duty was logged.', { variant: 'success' });
      await load(true);
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message || 'Unable to cancel the meeting.', { variant: 'error' });
    } finally {
      setCancellingMeeting(false);
    }
  };

  if (busy && !access) return <Box display="flex" justifyContent="center" py={12}><CircularProgress /></Box>;
  if (access && !access.viewer && !access.canSchedule) return <Alert severity="warning">You do not have Duty Monitoring access.</Alert>;
  const tabs = access?.admin ? ['overview','map','logs','rotation','exceptions','meetings','roster'] : access?.canSchedule ? ['overview','map','meetings'] : ['overview','map'];
  const days = Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => `${year}-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`);
  const calendarCells: Array<string | null> = [
    ...Array.from({ length: new Date(year, month - 1, 1).getDay() }, () => null),
    ...days,
  ];
  const events = (date: string) => [
    ...(data.map.reservations || []).filter((x: any) => x.meetingDate === date && x.status !== 'cancelled').map((x: any) => ({ kind: 'meeting', dutyType: x.venueType, label: `${x.venueType} | ${meetingSlot(x)} | ${x.purpose || 'Meeting'}`, color: '#81d4fa', detail: `${x.venueType} meeting, ${meetingSlot(x)}, ${x.purpose || 'No purpose provided'}${x.relievers?.length ? ` | Immediate relievers: ${x.relievers.map((reliever:any) => reliever.name).join(', ')}` : ''}` })),
    ...(data.map.assignments || []).filter((x: any) => x.dutyDate === date && x.dutyType === 'OD').map((x: any) => ({ kind: 'od', dutyType: 'OD', label: `OD | ${x.name}`, color: '#66bb6a', detail: `OD duty: ${x.name}` })),
    ...(data.map.exceptions || []).filter((x: any) => x.exceptionDate === date).map((x: any) => ({ kind: 'exception', dutyType: 'EXCEPTION', label: `EXCEPTION | ${formatType(x.type)} | ${x.name}`, color: '#ef9a9a', detail: `Exception type: ${formatType(x.type)} | ${x.name}${x.remarks ? ` | ${x.remarks}` : ''}` })),
  ].sort((a: any, b: any) => {
    const rank = (event: any) => event.kind === 'meeting' ? VENUES.indexOf(event.dutyType) : event.kind === 'od' ? VENUES.length : VENUES.length + 1;
    return rank(a) - rank(b);
  });
  const selectedDayEvents = events(selectedDay);
  const selectedDateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date(`${selectedDay}T12:00:00`));

  return <Box>
<Stack direction={{ xs:'column', sm:'row' }} justifyContent="space-between" alignItems={{ xs:'flex-start', sm:'center' }} mb={3} spacing={2}><Box><Typography variant="h4" fontWeight={700} mb={0.5}>Duty Monitoring</Typography><Typography variant="body2" color="text.secondary">Rotation, coverage, exceptions, and meeting readiness.</Typography></Box><Button variant="outlined" startIcon={<Refresh />} onClick={() => load()}>Refresh</Button></Stack>
<WorkspaceLayout kind="standard">
{error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError('')}>{error}</Alert>}
<Card><WorkspaceTabs value={tab} onChange={(_,v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ px:2, borderBottom:1, borderColor:'divider' }}>{tabs.map((x) => <Tab key={x} value={x} label={x === 'logs' ? 'Duty Log' : `${x.charAt(0).toUpperCase()}${x.slice(1)}`} />)}</WorkspaceTabs><CardContent>

    {tab === 'overview' && <Grid container spacing={2}>{data.dashboard.map((x:any) => <Grid item xs={12} sm={6} lg={3} key={x.dutyType}><Card sx={{ height:'100%', background: dutyGradient(x.dutyType === 'OD' ? 'warning' : 'info') }}><CardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Typography variant="overline">{x.dutyType === 'OD' ? 'OFFICER OF THE DAY':x.dutyType}</Typography>
        {x.dutyPeriod && <Chip size="small" variant="outlined" label={formatType(x.dutyPeriod)} />}
      </Stack>
      <Typography variant="h6">{x.name}</Typography>
      <Typography color={x.managementOverrideIssue ? 'error.main' : 'text.secondary'}>{x.managementOverrideIssue ? `Needs attention: ${x.managementOverrideIssue}` : x.nextInRotationName ? `Next in rotation: ${x.nextInRotationName}` : x.isImmediateReliever ? 'Management-requested coverage' : x.isOnDuty ? 'On duty' : x.isNext ? 'Next eligible in rotation' : x.hasTechnician && x.daysSince == null ? 'No previous duty' : x.daysSince == null ? '' : `${x.daysSince} days since previous duty`}</Typography>
      {x.isImmediateReliever && <><Chip sx={{ mt:1 }} label="Immediate reliever" size="small" color="secondary" /><Typography variant="caption" color="text.secondary" display="block" mt={1}>{x.immediateRelieverReason}</Typography></>}
      {x.isSubstitute && <Chip sx={{ mt:1 }} label="Substitute" size="small" color="warning" />}
      {access?.admin && x.coverageStatus === 'active' && <Button size="small" sx={{mt:2}} onClick={()=>{ setReleaseTarget({ coverageId:x.coverageId, name:x.name, dutyType:x.dutyType, dutyPeriod:x.dutyPeriod, activeTicketCount:x.activeTicketCount || 0 }); setReleaseConfirmed(false); }}>{x.dutyType === 'OD' ? 'End OD Duty' : 'Finish Duty'}</Button>}
      {access?.admin && x.isImmediateReliever && x.isOnDuty && x.reservationId && <Button size="small" sx={{mt:2}} onClick={()=>finishReservation(x.reservationId)}>Finish Duty</Button>}
      {access?.canSchedule && x.reservationId && (x.isOnDuty || x.requiresReassignment) && <Button size="small" color="error" variant="outlined" sx={{mt:2}} onClick={()=>requestMeetingCancellation({id:x.reservationId,venueType:x.dutyType,meetingDate:TODAY()})}>Cancel Meeting</Button>}
      {access?.admin && x.requiresReassignment && <Stack direction="row" spacing={1} mt={2}><Button size="small" color="warning" onClick={()=>open('coverage',{coverageId:x.coverageId,dutyType:x.dutyType,userId:x.userId,activeTicketCount:x.activeTicketCount||0})}>{x.activeTicketCount > 0 ? 'Activate After Reassignment' : 'Activate Duty'}</Button><Button size="small" color="error" variant="outlined" onClick={()=>openSkip({coverageId:x.coverageId,userId:x.userId,name:x.name,dutyType:x.dutyType,activeTicketCount:x.activeTicketCount||0})}>Skip</Button></Stack>}
    </CardContent></Card></Grid>)}</Grid>}
    {tab === 'map' && <>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={1.5} mb={2}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Duty Schedule</Typography>
          <Typography variant="body2" color="text.secondary">Select a date to review its assigned duties, meetings, and exceptions.</Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <TextField size="small" type="number" label="Year" value={year} inputProps={{ min: 2000, max: 2100 }} onChange={(e) => setYear(+e.target.value)} sx={{ width: 120 }} />
          <TextField select size="small" label="Month" value={month} onChange={(e) => setMonth(+e.target.value)} sx={{ minWidth: 150 }}>
            {MONTHS.map((label, index) => <MenuItem key={label} value={index + 1}>{label}</MenuItem>)}
          </TextField>
        </Stack>
      </Stack>
      <Box className="duty-map-grid" sx={{ display: 'grid', width: '100%', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.8fr) minmax(250px, 1fr)' }, gap: 2, alignItems: 'stretch' }}>
        <Box sx={{ minWidth: 0, display: 'flex' }}>
          <Paper variant="outlined" sx={{ p: { xs: 1, sm: 1.5 }, width: '100%', height: '100%', bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: { xs: 0.5, sm: 1 } }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => (
                <Typography key={weekday} variant="overline" textAlign="center" color="text.secondary" sx={{ py: 0.5, fontSize: 10, fontWeight: 800 }}>
                  {weekday}
                </Typography>
              ))}
              {calendarCells.map((date, index) => {
                if (!date) return <Box key={`empty-${index}`} aria-hidden="true" />;
                const dayEvents = events(date);
                const isToday = date === TODAY();
                const isSelected = date === selectedDay;
                return (
                  <Box
                    key={date}
                    component="button"
                    type="button"
                    aria-label={`${date}${dayEvents.length ? `, ${dayEvents.length} duty entries` : ', no duty entries'}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedDay(date)}
                    sx={{
                      minWidth: 0,
                      minHeight: { xs: 64, sm: 72, lg: 76 },
                      p: { xs: 0.5, sm: 1 },
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      textAlign: 'left',
                      border: '1px solid',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      borderRadius: 1.5,
                      bgcolor: isSelected ? 'action.selected' : 'background.paper',
                      boxShadow: isSelected ? `inset 0 0 0 1px ${theme.palette.primary.main}` : 'none',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.light' },
                      '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="body2" fontWeight={isSelected || isToday ? 800 : 600} color={isToday ? 'primary.main' : 'text.primary'}>
                        {Number(date.slice(-2))}
                      </Typography>
                      {dayEvents.length > 0 && <Chip size="small" label={dayEvents.length} color={isToday ? 'primary' : 'default'} sx={{ height: 20, '& .MuiChip-label': { px: 0.75 } }} />}
                    </Stack>
                    {dayEvents.slice(0, 2).map((event: any, eventIndex: number) => (
                      <Typography key={`${event.kind}-${eventIndex}`} variant="caption" noWrap sx={{ mt: 0.25, px: 0.75, py: 0.25, borderRadius: 0.75, bgcolor: `${event.color}25`, color: 'text.primary', borderLeft: `3px solid ${event.color}` }}>
                        {event.label}
                      </Typography>
                    ))}
                    {dayEvents.length > 2 && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>+{dayEvents.length - 2} more</Typography>}
                  </Box>
                );
              })}
            </Box>
            <Stack direction="row" gap={1.5} flexWrap="wrap" mt={1.5} aria-label="Duty map legend">
              {[
                { label: 'Meetings', color: '#81d4fa' },
                { label: 'Officer of the Day', color: '#66bb6a' },
                { label: 'Exceptions', color: '#ef9a9a' },
              ].map((entry) => (
                <Stack key={entry.label} direction="row" alignItems="center" gap={0.75}>
                  <Box aria-hidden="true" sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: entry.color }} />
                  <Typography variant="caption" color="text.secondary">{entry.label}</Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Box>
        <Box sx={{ minWidth: 0, display: 'flex' }}>
          <Paper variant="outlined" component="aside" aria-label="Selected day details" sx={{ p: { xs: 1.5, sm: 2 }, width: '100%', height: { xs: 'auto', lg: '100%' }, minHeight: { xs: 260, lg: 0 }, maxHeight: { xs: 420, lg: 'none' }, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
            <Box sx={{ pb: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: '0.1em' }}>Selected Day</Typography>
              <Typography variant="h6" fontWeight={750}>{selectedDateLabel}</Typography>
              <Typography variant="body2" color="text.secondary">{selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'entry' : 'entries'}</Typography>
            </Box>
            <Box sx={{ overflowY: 'auto', py: 1.5, flex: 1, minHeight: 0 }}>
              {selectedDayEvents.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body2" fontWeight={600}>No scheduled items</Typography>
                  <Typography variant="caption" color="text.secondary">Choose another date to view its duty details.</Typography>
                </Box>
              ) : (
                <Stack spacing={1}>
                  {selectedDayEvents.map((event: any, index: number) => (
                    <Accordion key={`${event.kind}-${index}`} disableGutters elevation={0} variant="outlined" TransitionProps={{ timeout: 0 }} sx={{ borderColor: 'divider', borderLeft: `3px solid ${event.color}`, '&:before': { display: 'none' } }}>
                      <AccordionSummary expandIcon={<ExpandMore />} sx={{ minHeight: 54, '& .MuiAccordionSummary-content': { my: 1 } }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>{event.label}</Typography>
                          <Typography variant="caption" color="text.secondary">{event.kind === 'meeting' ? 'Meeting' : event.kind === 'od' ? 'Officer of the Day' : 'Exception'}</Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0, pb: 1.5 }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{event.detail}</Typography>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
    </>}
    {tab === 'rotation' && <Grid container spacing={2}>{TYPES.map((t) => <Grid item xs={12} md={6} key={t}><Card variant="outlined"><CardContent><Typography variant="h6" mb={1}>{t} ROTATION</Typography><TableContainer><Table size="small"><TableHead><TableRow><TableCell>Name</TableCell><TableCell>Last Assigned</TableCell><TableCell>Days Since</TableCell><TableCell>Next?</TableCell></TableRow></TableHead><TableBody><RotationRows rows={data.rotation} t={t} /></TableBody></Table></TableContainer></CardContent></Card></Grid>)}</Grid>}
    {tab === 'logs' && <Section title="Duty Log" add={() => open('log',{dutyDate:TODAY(),dutyType:'OD',dutyPeriod:'WHOLE_DAY'})}><TableContainer><Table size="small"><TableHead><TableRow><TableCell>Date</TableCell><TableCell>Name</TableCell><TableCell>Duty</TableCell><TableCell>Period</TableCell><TableCell>Remarks</TableCell><TableCell /></TableRow></TableHead><TableBody>{data.logs.items.length ? data.logs.items.map((x:any)=><TableRow key={x.id}><TableCell>{x.dutyDate}</TableCell><TableCell>{x.name}</TableCell><TableCell>{formatType(x.dutyType)}</TableCell><TableCell>{formatType(x.dutyPeriod || 'WHOLE_DAY')}</TableCell><TableCell>{x.remarks}</TableCell><TableCell>{x.canModify ? <ActionButtons edit={()=>open('log',x)} remove={()=>requestDelete('log',x)} /> : <Typography variant="caption" color="text.secondary">Application log — read only</Typography>}</TableCell></TableRow>) : <EmptyTableRow colSpan={6} message="No duty log entries found." />}</TableBody></Table></TableContainer><TablePagination component="div" count={data.logs.total} page={logsPage} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]} onPageChange={(_,value)=>setLogsPage(value)} /></Section>}
    {tab === 'exceptions' && <Section title="Notes & Exceptions" add={() => open('exception',{exceptionDate:TODAY(),type:'travel_order'})}><TableContainer><Table size="small"><TableHead><TableRow><TableCell>Date</TableCell><TableCell>Name</TableCell><TableCell>Type</TableCell><TableCell>Remarks</TableCell><TableCell /></TableRow></TableHead><TableBody>{data.exceptions.items.length ? data.exceptions.items.map((x:any)=><TableRow key={x.id}><TableCell>{x.exceptionDate}</TableCell><TableCell>{userName(users,x.userId)}</TableCell><TableCell>{formatType(x.type)}</TableCell><TableCell>{x.remarks}</TableCell><TableCell><ActionButtons edit={()=>open('exception',x)} remove={()=>requestDelete('exception',x)} /></TableCell></TableRow>) : <EmptyTableRow colSpan={5} message="No duty exceptions found." />}</TableBody></Table></TableContainer><TablePagination component="div" count={data.exceptions.total} page={exceptionsPage} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]} onPageChange={(_,value)=>setExceptionsPage(value)} /></Section>}
    {tab === 'meetings' && <Section title="Meeting Schedule" add={() => open('reservation',{meetingDate:TODAY(),venueType:'ROC',slot:'AM',status:'confirmed'})}><TableContainer><Table size="small"><TableHead><TableRow><TableCell>Date</TableCell><TableCell>Duty Area</TableCell><TableCell>Period</TableCell><TableCell>Purpose</TableCell><TableCell>Immediate Relievers</TableCell><TableCell>Status</TableCell><TableCell /></TableRow></TableHead><TableBody>{data.reservations.items.length ? data.reservations.items.map((x:any)=><TableRow key={x.id}><TableCell>{x.meetingDate}</TableCell><TableCell>{x.venueType}</TableCell><TableCell>{meetingSlot(x)}</TableCell><TableCell>{x.purpose||'Meeting'}</TableCell><TableCell>{x.relievers?.length ? <Stack spacing={0.5}>{x.relievers.map((reliever:any)=><Chip key={reliever.id} size="small" label={reliever.name} />)}<Typography variant="caption" color="text.secondary">{x.relievers[0].reason}</Typography></Stack> : <Typography variant="body2" color="text.secondary">Normal rotation</Typography>}</TableCell><TableCell>{formatType(x.status)}{x.status === 'cancelled' && x.remarks && <Box component="details" sx={{mt:0.5,maxWidth:360}}><Typography component="summary" variant="caption" sx={{cursor:'pointer'}}>Cancellation details</Typography><Typography variant="caption" sx={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{x.remarks}</Typography></Box>}</TableCell><TableCell><Stack direction="row">{access?.admin && x.meetingDate >= TODAY() && !['cancelled','completed'].includes(x.status) && <IconButton color="secondary" size="small" aria-label="Assign immediate relievers" onClick={()=>open('relievers',{id:x.id,venueType:x.venueType,meetingDate:x.meetingDate,userIds:(x.relievers||[]).map((reliever:any)=>reliever.userId),reason:x.relievers?.[0]?.reason||''})}><GroupAdd fontSize="small" /></IconButton>}{(access?.admin || (access?.currentOd && x.meetingDate >= TODAY())) && <IconButton color="primary" size="small" aria-label="Edit meeting" onClick={()=>open('reservation',{...x,slot:meetingSlot(x).toUpperCase().replace(' ','_')})}><Edit fontSize="small" /></IconButton>}{access?.canSchedule && (access.admin || x.meetingDate >= TODAY()) && x.restrictions?.canCancel && <Button size="small" color="error" onClick={()=>requestMeetingCancellation(x)}>Cancel Meeting</Button>}{access?.admin && x.restrictions?.canDelete && <IconButton color="error" size="small" aria-label="Delete meeting" onClick={()=>requestDelete('reservation',x)}><Delete fontSize="small" /></IconButton>}</Stack></TableCell></TableRow>) : <EmptyTableRow colSpan={7} message="No meeting schedules found." />}</TableBody></Table></TableContainer><TablePagination component="div" count={data.reservations.total} page={reservationsPage} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]} onPageChange={(_,value)=>setReservationsPage(value)} /></Section>}
    {tab === 'roster' && <Card variant="outlined" sx={{ maxWidth: 720 }}><CardContent><Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" gap={1} mb={1}><Box><Typography variant="h6">Duty Roster</Typography><Typography variant="body2" color="text.secondary">One ordered roster is used by OD, ROC, CONFERENCE, and OPCEN.</Typography></Box><Chip color={data.rosterConfig.odOverrideEnabled ? 'warning' : 'default'} label={`OD Override ${data.rosterConfig.odOverrideEnabled ? 'On' : 'Off'}`} /></Stack><Typography variant="body2" color="text.secondary" mb={2}>{data.rosterConfig.odOverrideEnabled ? 'OD-only members rotate for OD; all other members rotate for meeting venues.' : 'All members remain available to every duty rotation.'}</Typography><Stack spacing={1} mb={2}>{data.roster.length ? data.roster.map((x:any,index:number)=><Stack key={x.id} direction="row" spacing={1.5} alignItems="center"><Chip size="small" label={index + 1} /><Typography variant="body2">{x.name}</Typography>{x.odOnly && <Chip size="small" color="warning" variant="outlined" label="OD only" />}</Stack>) : <Typography variant="body2" color="text.secondary">No eligible duty roster members.</Typography>}</Stack><Button variant="contained" onClick={()=>open('roster',{userIds:data.roster.map((x:any)=>x.userId),odOnlyUserIds:data.roster.filter((x:any)=>x.odOnly).map((x:any)=>x.userId),odOverrideEnabled:!!data.rosterConfig.odOverrideEnabled})}>Manage Roster</Button></CardContent></Card>}
    </CardContent></Card>
</WorkspaceLayout>
<Dialog open={!!cancelMeetingTarget} onClose={()=>!cancellingMeeting && setCancelMeetingTarget(null)} fullWidth maxWidth="sm" aria-labelledby="cancel-meeting-title">
  <DialogTitle id="cancel-meeting-title">Cancel {cancelMeetingTarget?.venueType} meeting?</DialogTitle>
  <DialogContent>
    <Alert severity="warning">The meeting on {cancelMeetingTarget?.meetingDate} will be marked Cancelled. Assigned staff will be released and attendance set by this duty will be restored. No completed duty will be added to the Duty Log. Completed or already logged meetings cannot be cancelled.</Alert>
    <TextField autoFocus fullWidth required multiline minRows={3} label="Cancellation reason" value={cancelMeetingReason} onChange={(event)=>setCancelMeetingReason(event.target.value)} disabled={cancellingMeeting} inputProps={{maxLength:2000}} helperText="Enter 3–2000 characters. The reason is retained with the meeting." sx={{mt:2}} />
    <FormControlLabel sx={{mt:1}} control={<Checkbox checked={cancelMeetingConfirmed} disabled={cancellingMeeting} onChange={(event)=>setCancelMeetingConfirmed(event.target.checked)} />} label="I confirm this meeting was cancelled and no duty should be logged." />
  </DialogContent>
  <DialogActions><Button disabled={cancellingMeeting} onClick={()=>setCancelMeetingTarget(null)}>Keep Meeting</Button><Button color="error" variant="contained" disabled={cancellingMeeting || !cancelMeetingConfirmed || cancelMeetingReason.trim().length < 3 || cancelMeetingReason.trim().length > 2000} onClick={()=>void cancelMeeting()}>{cancellingMeeting ? 'Cancelling…' : 'Cancel Meeting'}</Button></DialogActions>
</Dialog>
<Dialog open={!!releaseTarget} onClose={()=>setReleaseTarget(null)} fullWidth maxWidth="sm"><DialogTitle>{releaseTarget?.dutyType === 'OD' ? `End ${releaseTarget?.name || 'the active OD'}'s duty?` : `Finish ${releaseTarget?.name || 'the active staff member'}'s ${formatType(releaseTarget?.dutyPeriod || '')} duty?`}</DialogTitle><DialogContent><Alert severity={releaseTarget?.dutyType === 'OD' && releaseTarget?.activeTicketCount > 0 ? 'error' : 'warning'}>{releaseTarget?.dutyType === 'OD' && releaseTarget?.activeTicketCount > 0 ? <>Reassign all active tickets first. This action will not automatically reassign tickets.</> : <>The completed duty will be saved immediately in the Duty Log. The next eligible period or technician will be shown for manual activation.</>}</Alert><Stack direction="row" alignItems="center" mt={2}><Checkbox checked={releaseConfirmed} onChange={(e)=>setReleaseConfirmed(e.target.checked)} /><Typography>I confirm that this duty has finished.</Typography></Stack></DialogContent><DialogActions><Button onClick={()=>setReleaseTarget(null)}>Cancel</Button><Button variant="contained" color="warning" disabled={!releaseConfirmed || (releaseTarget?.dutyType === 'OD' && releaseTarget?.activeTicketCount > 0)} onClick={release}>Finish Duty</Button></DialogActions></Dialog>
<Dialog open={!!skipTarget} onClose={()=>setSkipTarget(null)} fullWidth maxWidth="sm"><DialogTitle>Skip {skipTarget?.name || 'current technician'}?</DialogTitle><DialogContent><Alert severity="warning">{skipTarget?.activeTicketCount > 0 ? <>The technician will keep the active ticket or tickets. This creates a <b>DUE TO TA</b> exception.</> : <>Use Skip when the technician cannot take duty because of reports or another work commitment. This creates an <b>OTHER</b> exception.</>} The next eligible person will be presented for manual activation; nobody is activated automatically.</Alert><Stack direction="row" alignItems="center" mt={2}><Checkbox checked={skipConfirmed} onChange={(e)=>setSkipConfirmed(e.target.checked)} /><Typography>I confirm this technician should be skipped for today.</Typography></Stack></DialogContent><DialogActions><Button onClick={()=>setSkipTarget(null)}>Cancel</Button><Button variant="contained" color="error" disabled={!skipConfirmed} onClick={skip}>Confirm Skip</Button></DialogActions></Dialog>
<Dialog open={!!deleteTarget} onClose={()=>!deleting && setDeleteTarget(null)} fullWidth maxWidth="sm"><DialogTitle>Delete {deleteTarget?.kind === 'log' ? 'Duty Log entry' : deleteTarget?.kind === 'reservation' ? 'meeting schedule' : 'Duty exception'}?</DialogTitle><DialogContent><Alert severity="error">This permanently deletes <b>{deleteTarget?.label}</b>. This action cannot be undone.</Alert><Stack direction="row" alignItems="center" mt={2}><Checkbox checked={deleteConfirmed} onChange={(e)=>setDeleteConfirmed(e.target.checked)} /><Typography>I confirm that I want to permanently delete this record.</Typography></Stack></DialogContent><DialogActions><Button disabled={deleting} onClick={()=>setDeleteTarget(null)}>Cancel</Button><Button variant="contained" color="error" disabled={!deleteConfirmed || deleting} onClick={confirmDelete}>{deleting ? 'Deleting…' : 'Delete Permanently'}</Button></DialogActions></Dialog>
<Dialog open={!!dialog} onClose={()=>!saving && setDialog(null)} fullWidth><DialogTitle>{dialog === 'roster' ? 'Manage Duty Roster' : dialog === 'relievers' ? `Immediate Relievers — ${form.venueType || ''}` : `${form.id ? 'Edit' : 'Add'} ${dialog}`}</DialogTitle><DialogContent><Stack spacing={2} mt={1}>
      {dialog==='log' && <><DateField label="Date" value={form.dutyDate} change={(v:string)=>setForm({...form,dutyDate:v})}/><DutyField value={form.dutyType} change={(v:string)=>setForm({...form,dutyType:v})}/><SelectField label="Period" value={form.dutyPeriod||'WHOLE_DAY'} values={['AM','PM','WHOLE_DAY']} change={(v:string)=>setForm({...form,dutyPeriod:v})}/><UserField users={users} value={form.userId} change={(v:number)=>setForm({...form,userId:v})}/><TextField label="Remarks" multiline value={form.remarks||''} onChange={(e)=>setForm({...form,remarks:e.target.value})}/></>}
      {dialog==='exception' && <><DateField label="Date" value={form.exceptionDate} change={(v:string)=>setForm({...form,exceptionDate:v})}/><UserField users={dutyRosterUsers("", form.userId)} value={form.userId} change={(v:number)=>setForm({...form,userId:v})}/><SelectField label="Type" value={form.type} values={['travel_order','exam','assistance','pacd','canvass','due_to_ta','other']} change={(v:string)=>setForm({...form,type:v})}/><TextField label="Remarks" multiline value={form.remarks||''} onChange={(e)=>setForm({...form,remarks:e.target.value})}/></>}
      {dialog==='reservation' && <>{form.restrictions?.scheduleLocked && <Alert severity="info">{form.restrictions?.purposeOnly ? 'This meeting has duty history. Only its purpose can be changed.' : 'Active duty locks the venue, date, and period. Use Cancel Meeting if the meeting will not proceed.'}</Alert>}<DateField disabled={!!form.restrictions?.scheduleLocked} label="Meeting Date" value={form.meetingDate} min={access?.admin ? undefined : TODAY()} change={(v:string)=>setForm({...form,meetingDate:v})}/><SelectField disabled={!!form.restrictions?.scheduleLocked} label="Venue" value={form.venueType} values={['ROC','OPCEN','CONFERENCE']} change={(v:string)=>setForm({...form,venueType:v})}/><SelectField disabled={!!form.restrictions?.scheduleLocked} label="Meeting period" value={form.slot} values={['AM','PM','WHOLE_DAY']} change={(v:string)=>setForm({...form,slot:v})}/><TextField label="Purpose" value={form.purpose||''} onChange={(e)=>setForm({...form,purpose:e.target.value})}/><SelectField disabled={!!form.restrictions?.scheduleLocked || form.status === 'cancelled'} label="Status" value={form.status} values={form.status === 'completed' ? ['completed'] : form.status === 'cancelled' ? ['cancelled'] : ['scheduled','confirmed']} change={(v:string)=>setForm({...form,status:v})}/></>}
      {dialog==='roster' && <><SearchableMultiSelect label="Members in rotation order" value={form.userIds||[]} options={users.filter(isDutyStaff).map((u)=>({value:u.id,label:userName(users,u.id)}))} onChange={(userIds)=>setForm({...form,userIds,odOnlyUserIds:(form.odOnlyUserIds||[]).filter((id:number)=>userIds.includes(id))})} /><FormControlLabel control={<Switch checked={!!form.odOverrideEnabled} onChange={(e)=>setForm({...form,odOverrideEnabled:e.target.checked})} />} label="Enable OD Override" />{form.odOverrideEnabled && <><Alert severity="info">OD-only members will rotate only for Officer of the Day. Other roster members will rotate for ROC, Conference, and OpCen.</Alert><SearchableMultiSelect label="OD-only members" value={form.odOnlyUserIds||[]} options={users.filter((u:any)=>(form.userIds||[]).includes(u.id)).map((u)=>({value:u.id,label:userName(users,u.id)}))} onChange={(odOnlyUserIds)=>setForm({...form,odOnlyUserIds})} /></>}</>}
      {dialog==='relievers' && <><Alert severity="warning">These technicians replace the normal {form.venueType} assignment for {form.meetingDate}. Select one or more active technicians from the shared roster.</Alert><SearchableMultiSelect label="Immediate relievers" value={form.userIds||[]} options={data.roster.filter((row:any)=>!data.rosterConfig.odOverrideEnabled || !row.odOnly).map((row:any)=>({value:row.userId,label:row.name}))} onChange={(userIds)=>setForm({...form,userIds})} /><TextField required label="Reason" multiline minRows={3} value={form.reason||''} onChange={(e)=>setForm({...form,reason:e.target.value})} helperText="Required. Explain why management requested this replacement." />{(form.userIds||[]).length > 0 && <Button color="error" variant="outlined" onClick={async()=>{try{await dutiesApi.clearMeetingRelievers(form.id);setDialog(null);setForm({});await load(true);enqueueSnackbar('Immediate relievers removed; normal rotation restored.',{variant:'success'});}catch(e:any){enqueueSnackbar(e?.response?.data?.message||'Unable to remove immediate relievers.',{variant:'error'});}}}>Restore Normal Rotation</Button>}</>}
      {dialog==='coverage' && <><Alert severity="info"><Typography fontWeight={800} mb={1}>{form.activeTicketCount > 0 ? 'Activate After Reassignment' : 'Activate Duty'}</Typography>{form.activeTicketCount > 0 ? <Typography component="div"><ol style={{margin:0,paddingLeft:20}}><li>Reassign the current technician&apos;s active ticket or tickets with the required justification.</li><li>Keep the technician&apos;s attendance eligible for duty.</li><li>Press Save to confirm that the technician will continue with the scheduled duty.</li></ol></Typography> : <Typography>Press Save to explicitly activate this roster member for duty. Until then, no Duty coverage or attendance override is recorded.</Typography>}<Typography mt={1}>Use Skip when this person cannot take the duty. The next eligible person will still require manual activation.</Typography></Alert><UserField users={users.filter((u:any)=>isDutyStaff(u) && u.id===form.userId)} value={form.userId} change={(v:number)=>setForm({...form,userId:v})}/></>}
    </Stack></DialogContent><DialogActions><Button onClick={()=>setDialog(null)}>Cancel</Button><Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></DialogActions></Dialog>
</Box>;
}

function EmptyTableRow({colSpan, message}: { colSpan: number; message: string }) { return <TableRow><TableCell colSpan={colSpan}><Typography color="text.secondary" align="center">{message}</Typography></TableCell></TableRow> }
function RotationRows({rows, t}: { rows: any[]; t: DutyType }) { const filtered = rows.filter((x: any) => x.dutyType===t); return filtered.length ? <>{filtered.map((x:any) => <TableRow key={x.id} sx={{opacity:x.excluded?.5:1}}><TableCell>{x.name}</TableCell><TableCell>{x.lastAssigned||'Never'}</TableCell><TableCell>{x.daysSince===9999?'First rotation':x.daysSince}</TableCell><TableCell>{x.next ? <Star color="warning" fontSize="small" /> : ''}</TableCell></TableRow>)}</> : <EmptyTableRow colSpan={4} message="No rotation data available." />; }
function Section({title,add,children}:any){return <Box><Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}><Typography variant="h6">{title}</Typography><Button variant="contained" startIcon={<Add/>} onClick={add}>Add</Button></Stack>{children}</Box>}
function ActionButtons({edit,remove}:any){return <Stack direction="row"><IconButton color="primary" size="small" aria-label="Edit" onClick={edit}><Edit fontSize="small" /></IconButton><IconButton color="error" size="small" aria-label="Delete" onClick={remove}><Delete fontSize="small" /></IconButton></Stack>}
function DateField({label,value,min,change,disabled}:any){return <TextField disabled={disabled} type="date" label={label} InputLabelProps={{shrink:true}} inputProps={min ? { min } : undefined} value={value||''} onChange={(e)=>change(e.target.value)}/>}
function UserField({users,value,change}:any){return <SearchableSelect label="Name" value={value||null} options={users.filter(isDutyStaff).map((u:UserRecord)=>({value:u.id,label:userName(users,u.id)}))} onChange={(userId)=>change(userId||0)} />}
function DutyField({value,change}:any){return <SelectField label="Duty" value={value} values={TYPES} change={change}/>}
function SelectField({label,value,values,change,disabled}:any){const labelId=useId();return <FormControl disabled={disabled}><InputLabel id={labelId}>{label}</InputLabel><Select labelId={labelId} label={label} value={value||''} onChange={(e)=>change(e.target.value)}>{values.map((x:string)=><MenuItem key={x} value={x}>{x.replaceAll('_',' ').toUpperCase()}</MenuItem>)}</Select></FormControl>}
