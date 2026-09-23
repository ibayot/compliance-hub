import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, Grid, IconButton, InputLabel, MenuItem, Paper, Select, Stack, Switch, Tab, Table, TableBody, TableCell, TableContainer as MuiTableContainer, TableHead, TablePagination, TableRow, Tabs, TextField, Typography } from '@mui/material';
import { Add, Delete, Edit, GroupAdd, Refresh, Star } from '@mui/icons-material';
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
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [skipTarget, setSkipTarget] = useState<any | null>(null);
  const [skipConfirmed, setSkipConfirmed] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<any | null>(null);
  const [releaseConfirmed, setReleaseConfirmed] = useState(false);
  const reconcileAttempted = useRef(false);
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
      const a = await dutiesApi.access(); setAccess(a);
      if (!a.viewer && !a.canSchedule) return;
      const [dashboard, rotation, map, logs, exceptions, reservations, staff, roster, rosterConfig] = await Promise.all([
        dutiesApi.dashboard(), dutiesApi.rotation(), dutiesApi.map(year, month),
        a.admin ? dutiesApi.logs(logsPage + 1, PAGE_SIZE) : EMPTY_PAGE,
        a.admin ? dutiesApi.exceptions(exceptionsPage + 1, PAGE_SIZE) : EMPTY_PAGE,
        a.admin || a.canSchedule ? dutiesApi.reservations(reservationsPage + 1, PAGE_SIZE) : EMPTY_PAGE, a.admin ? dutiesApi.staff() : [],
        a.admin ? dutiesApi.roster() : [],
        a.admin ? dutiesApi.rosterConfig() : { odOverrideEnabled: false },
      ]);
      if (a.admin && !reconcileAttempted.current && roster.length > 0) {
        await dutiesApi.reconcile();
        reconcileAttempted.current = true;
      }
      setData({ dashboard, rotation, roster, rosterConfig, map, logs, exceptions, reservations }); setUsers(staff.filter(isDutyStaff)); setError('');
    } catch (e: any) { setError(e?.response?.data?.message || 'Unable to load Duty Monitoring.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, [year, month, logsPage, exceptionsPage, reservationsPage]);
  useSse(['DUTY_UPDATED', 'ATTENDANCE_UPDATED', 'TICKET_UPDATED'], () => void load(true));

  const save = async () => {
    try {
      if (dialog === 'log') { await dutiesApi.saveLog(form, form.id); setLogsPage(0); }
      if (dialog === 'exception') { await dutiesApi.saveException(form, form.id); setExceptionsPage(0); }
      if (dialog === 'reservation') {
        const payload = { ...form };
        if (form.slot === 'AM') { payload.startTime = '08:00'; payload.endTime = '12:00'; }
        if (form.slot === 'PM') { payload.startTime = '13:00'; payload.endTime = '17:00'; }
        if (form.slot === 'WHOLE_DAY') { payload.startTime = null; payload.endTime = null; }
        delete payload.slot;
        await dutiesApi.saveReservation(payload, form.id);
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
    } catch (e: any) { enqueueSnackbar(e?.response?.data?.message || e?.message || 'Unable to save Duty record.', { variant: 'error' }); }
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
  const requestDelete = (kind: 'log' | 'exception', row: any) => {
    const date = kind === 'log' ? row.dutyDate : row.exceptionDate;
    const name = kind === 'log' ? row.name : userName(users, row.userId);
    setDeleteTarget({ kind, id: row.id, label: `${name} on ${date}` });
    setDeleteConfirmed(false);
  };
  const confirmDelete = async () => {
    if (!deleteTarget || !deleteConfirmed) return;
    try {
      if (deleteTarget.kind === 'log') await dutiesApi.deleteLog(deleteTarget.id);
      if (deleteTarget.kind === 'exception') await dutiesApi.deleteException(deleteTarget.id);
      const goToPreviousLogsPage = deleteTarget.kind === 'log' && data.logs.items.length === 1 && logsPage > 0;
      const goToPreviousExceptionsPage = deleteTarget.kind === 'exception' && data.exceptions.items.length === 1 && exceptionsPage > 0;
      setDeleteTarget(null); setDeleteConfirmed(false);
      enqueueSnackbar(deleteTarget.kind === 'log' ? 'Duty Log entry deleted.' : 'Duty exception deleted.', { variant: 'success' });
      if (goToPreviousLogsPage) setLogsPage((value) => value - 1);
      else if (goToPreviousExceptionsPage) setExceptionsPage((value) => value - 1);
      else await load(true);
    } catch (e: any) { enqueueSnackbar(e?.response?.data?.message || 'Unable to remove Duty record.', { variant: 'error' }); }
  };
  const removeReservation = async (id: string) => { try { await dutiesApi.deleteReservation(id); enqueueSnackbar('Meeting schedule deleted.', { variant: 'success' }); if (data.reservations.items.length === 1 && reservationsPage > 0) setReservationsPage((value) => value - 1); else await load(true); } catch (e: any) { enqueueSnackbar(e?.response?.data?.message || 'Unable to remove meeting.', { variant: 'error' }); } };
  const release = async () => {
    if (!releaseTarget || !releaseConfirmed) return;
    try {
      await dutiesApi.releaseCoverage(releaseTarget.coverageId);
      setReleaseTarget(null); setReleaseConfirmed(false);
      enqueueSnackbar('OD returned to Ticket Assignment. The next eligible technician remains pending for manual activation.', { variant: 'success' });
      await load(true);
    } catch (e: any) { enqueueSnackbar(e?.response?.data?.message || 'Unable to return the OD to Ticket Assignment.', { variant: 'error' }); }
  };

  if (busy && !access) return <Box display="flex" justifyContent="center" py={12}><CircularProgress /></Box>;
  if (access && !access.viewer && !access.canSchedule) return <Alert severity="warning">You do not have Duty Monitoring access.</Alert>;
  const tabs = access?.admin ? ['overview','map','logs','rotation','exceptions','meetings','roster'] : access?.canSchedule ? ['overview','map','meetings'] : ['overview','map'];
  const days = Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => `${year}-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`);
  const events = (date: string) => [
    ...(data.map.reservations || []).filter((x: any) => x.meetingDate === date && x.status !== 'cancelled').map((x: any) => ({ kind: 'meeting', dutyType: x.venueType, label: `${x.venueType} | ${meetingSlot(x)} | ${x.purpose || 'Meeting'}`, color: '#81d4fa', detail: `${x.venueType} meeting, ${meetingSlot(x)}, ${x.purpose || 'No purpose provided'}${x.relievers?.length ? ` | Immediate relievers: ${x.relievers.map((reliever:any) => reliever.name).join(', ')}` : ''}` })),
    ...(data.map.assignments || []).filter((x: any) => x.dutyDate === date && x.dutyType === 'OD').map((x: any) => ({ kind: 'od', dutyType: 'OD', label: `OD | ${x.name}`, color: '#66bb6a', detail: `OD duty: ${x.name}` })),
    ...(data.map.exceptions || []).filter((x: any) => x.exceptionDate === date).map((x: any) => ({ kind: 'exception', dutyType: 'EXCEPTION', label: `EXCEPTION | ${formatType(x.type)} | ${x.name}`, color: '#ef9a9a', detail: `Exception type: ${formatType(x.type)} | ${x.name}${x.remarks ? ` | ${x.remarks}` : ''}` })),
  ].sort((a: any, b: any) => {
    const rank = (event: any) => event.kind === 'meeting' ? VENUES.indexOf(event.dutyType) : event.kind === 'od' ? VENUES.length : VENUES.length + 1;
    return rank(a) - rank(b);
  });

  return <Box>
    <Stack direction={{ xs:'column', sm:'row' }} justifyContent="space-between" alignItems={{ xs:'flex-start', sm:'center' }} mb={3} spacing={2}><Box><Typography variant="h4" fontWeight={700} mb={0.5}>Duty Monitoring</Typography><Typography variant="body2" color="text.secondary">Rotation, coverage, exceptions, and meeting readiness.</Typography></Box><Button variant="outlined" startIcon={<Refresh />} onClick={() => load()}>Refresh</Button></Stack>
    {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError('')}>{error}</Alert>}
    <Card><Tabs value={tab} onChange={(_,v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ px:2, borderBottom:1, borderColor:'divider' }}>{tabs.map((x) => <Tab key={x} value={x} label={x === 'logs' ? 'Duty Log' : x} />)}</Tabs><CardContent>

    {tab === 'overview' && <Grid container spacing={2}>{data.dashboard.map((x:any) => <Grid item xs={12} sm={6} lg={3} key={x.dutyType}><Card sx={{ height:'100%', background: dutyGradient(x.dutyType === 'OD' ? 'warning' : 'info') }}><CardContent><Typography variant="overline">{x.dutyType === 'OD' ? 'OFFICER OF THE DAY':x.dutyType}</Typography><Typography variant="h6">{x.name}</Typography><Typography color={x.managementOverrideIssue ? 'error.main' : 'text.secondary'}>{x.managementOverrideIssue ? `Needs attention: ${x.managementOverrideIssue}` : x.isImmediateReliever ? 'Management-requested coverage' : x.isOnDuty ? 'On duty' : x.isNext ? 'Next eligible in rotation' : x.hasTechnician && x.daysSince == null ? 'No previous duty' : x.daysSince == null ? '' : `${x.daysSince} days since previous duty`}</Typography>{x.isImmediateReliever && <><Chip sx={{ mt:1 }} label="Immediate reliever" size="small" color="secondary" /><Typography variant="caption" color="text.secondary" display="block" mt={1}>{x.immediateRelieverReason}</Typography></>}{x.isSubstitute && <Chip sx={{ mt:1 }} label="Substitute" size="small" color="warning" />}{access?.admin && x.coverageStatus === 'active' && <Button size="small" sx={{mt:2}} onClick={()=>{ setReleaseTarget({ coverageId:x.coverageId, name:x.name, activeTicketCount:x.activeTicketCount || 0 }); setReleaseConfirmed(false); }}>Return to Ticket Assignment</Button>}{access?.admin && x.requiresReassignment && <Stack direction="row" spacing={1} mt={2}><Button size="small" color="warning" onClick={()=>open('coverage',{coverageId:x.coverageId,dutyType:x.dutyType,userId:x.userId,activeTicketCount:x.activeTicketCount||0})}>{x.activeTicketCount > 0 ? 'Activate After Reassignment' : 'Activate Duty'}</Button><Button size="small" color="error" variant="outlined" onClick={()=>openSkip({coverageId:x.coverageId,userId:x.userId,name:x.name,dutyType:x.dutyType,activeTicketCount:x.activeTicketCount||0})}>Skip</Button></Stack>}</CardContent></Card></Grid>)}</Grid>}
    {tab === 'map' && <><Stack direction="row" gap={2} mb={2}><TextField size="small" type="number" label="Year" value={year} onChange={(e) => setYear(+e.target.value)} /><TextField select size="small" label="Month" value={month} onChange={(e) => setMonth(+e.target.value)}>{MONTHS.map((label, index) => <MenuItem key={label} value={index + 1}>{label}</MenuItem>)}</TextField></Stack><Grid container spacing={1}>{days.map((d) => { const dayEvents = events(d); const visible = dayEvents.slice(0, 1); return <Grid item xs={12} sm={6} md={4} lg={12/7} key={d}><Paper variant="outlined" onClick={() => setSelectedDay(d)} sx={{ p:1.5, height:132, boxSizing:'border-box', overflow:'hidden', cursor:'pointer', bgcolor:d===TODAY()?'action.selected':undefined }}><Typography fontWeight={800}>{+d.slice(-2)}</Typography>{visible.map((x:any,i:number) => <Chip key={i} size="small" label={x.label} sx={{ m:.25, maxWidth:'100%', height:'auto', justifyContent:'flex-start', bgcolor:x.color, '& .MuiChip-label': { display:'block', whiteSpace:'normal', overflowWrap:'anywhere', py:.35 } }} />)}{dayEvents.length > 1 && <Chip size="small" label={`... +${dayEvents.length - 1}`} sx={{ m:.25 }} />}</Paper></Grid>; })}</Grid></>}
    {tab === 'rotation' && <Grid container spacing={2}>{TYPES.map((t) => <Grid item xs={12} md={6} key={t}><Card variant="outlined"><CardContent><Typography variant="h6" mb={1}>{t} ROTATION</Typography><TableContainer><Table size="small"><TableHead><TableRow><TableCell>Name</TableCell><TableCell>Last Assigned</TableCell><TableCell>Days Since</TableCell><TableCell>Next?</TableCell></TableRow></TableHead><TableBody><RotationRows rows={data.rotation} t={t} /></TableBody></Table></TableContainer></CardContent></Card></Grid>)}</Grid>}
    {tab === 'logs' && <Section title="Duty Log" add={() => open('log',{dutyDate:TODAY(),dutyType:'OD'})}><TableContainer><Table size="small"><TableHead><TableRow><TableCell>Date</TableCell><TableCell>Name</TableCell><TableCell>Duty</TableCell><TableCell>Remarks</TableCell><TableCell /></TableRow></TableHead><TableBody>{data.logs.items.length ? data.logs.items.map((x:any)=><TableRow key={x.id}><TableCell>{x.dutyDate}</TableCell><TableCell>{x.name}</TableCell><TableCell>{formatType(x.dutyType)}</TableCell><TableCell>{x.remarks}</TableCell><TableCell><ActionButtons edit={()=>open('log',x)} remove={()=>requestDelete('log',x)} /></TableCell></TableRow>) : <EmptyTableRow colSpan={5} message="No duty log entries found." />}</TableBody></Table></TableContainer><TablePagination component="div" count={data.logs.total} page={logsPage} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]} onPageChange={(_,value)=>setLogsPage(value)} /></Section>}
    {tab === 'exceptions' && <Section title="Notes & Exceptions" add={() => open('exception',{exceptionDate:TODAY(),type:'travel_order'})}><TableContainer><Table size="small"><TableHead><TableRow><TableCell>Date</TableCell><TableCell>Name</TableCell><TableCell>Type</TableCell><TableCell>Remarks</TableCell><TableCell /></TableRow></TableHead><TableBody>{data.exceptions.items.length ? data.exceptions.items.map((x:any)=><TableRow key={x.id}><TableCell>{x.exceptionDate}</TableCell><TableCell>{userName(users,x.userId)}</TableCell><TableCell>{formatType(x.type)}</TableCell><TableCell>{x.remarks}</TableCell><TableCell><ActionButtons edit={()=>open('exception',x)} remove={()=>requestDelete('exception',x)} /></TableCell></TableRow>) : <EmptyTableRow colSpan={5} message="No duty exceptions found." />}</TableBody></Table></TableContainer><TablePagination component="div" count={data.exceptions.total} page={exceptionsPage} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]} onPageChange={(_,value)=>setExceptionsPage(value)} /></Section>}
    {tab === 'meetings' && <Section title="Meeting Schedule" add={() => open('reservation',{meetingDate:TODAY(),venueType:'ROC',slot:'AM',status:'confirmed'})}><TableContainer><Table size="small"><TableHead><TableRow><TableCell>Date</TableCell><TableCell>Duty Area</TableCell><TableCell>Period</TableCell><TableCell>Purpose</TableCell><TableCell>Immediate Relievers</TableCell><TableCell>Status</TableCell><TableCell /></TableRow></TableHead><TableBody>{data.reservations.items.length ? data.reservations.items.map((x:any)=><TableRow key={x.id}><TableCell>{x.meetingDate}</TableCell><TableCell>{x.venueType}</TableCell><TableCell>{meetingSlot(x)}</TableCell><TableCell>{x.purpose||'Meeting'}</TableCell><TableCell>{x.relievers?.length ? <Stack spacing={0.5}>{x.relievers.map((reliever:any)=><Chip key={reliever.id} size="small" label={reliever.name} />)}<Typography variant="caption" color="text.secondary">{x.relievers[0].reason}</Typography></Stack> : <Typography variant="body2" color="text.secondary">Normal rotation</Typography>}</TableCell><TableCell>{formatType(x.status)}</TableCell><TableCell><Stack direction="row">{access?.admin && x.meetingDate >= TODAY() && !['cancelled','completed'].includes(x.status) && <IconButton color="secondary" size="small" aria-label="Assign immediate relievers" onClick={()=>open('relievers',{id:x.id,venueType:x.venueType,meetingDate:x.meetingDate,userIds:(x.relievers||[]).map((reliever:any)=>reliever.userId),reason:x.relievers?.[0]?.reason||''})}><GroupAdd fontSize="small" /></IconButton>}{(access?.admin || (access?.currentOd && x.meetingDate >= TODAY())) && <IconButton color="primary" size="small" aria-label="Edit meeting" onClick={()=>open('reservation',{...x,slot:meetingSlot(x).toUpperCase().replace(' ','_')})}><Edit fontSize="small" /></IconButton>}{access?.admin && <IconButton color="error" size="small" aria-label="Delete meeting" onClick={()=>removeReservation(x.id)}><Delete fontSize="small" /></IconButton>}</Stack></TableCell></TableRow>) : <EmptyTableRow colSpan={7} message="No meeting schedules found." />}</TableBody></Table></TableContainer><TablePagination component="div" count={data.reservations.total} page={reservationsPage} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]} onPageChange={(_,value)=>setReservationsPage(value)} /></Section>}
    {tab === 'roster' && <Card variant="outlined" sx={{ maxWidth: 720 }}><CardContent><Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" gap={1} mb={1}><Box><Typography variant="h6">Duty Roster</Typography><Typography variant="body2" color="text.secondary">One ordered roster is used by OD, ROC, CONFERENCE, and OPCEN.</Typography></Box><Chip color={data.rosterConfig.odOverrideEnabled ? 'warning' : 'default'} label={`OD Override ${data.rosterConfig.odOverrideEnabled ? 'On' : 'Off'}`} /></Stack><Typography variant="body2" color="text.secondary" mb={2}>{data.rosterConfig.odOverrideEnabled ? 'OD-only members rotate for OD; all other members rotate for meeting venues.' : 'All members remain available to every duty rotation.'}</Typography><Stack spacing={1} mb={2}>{data.roster.length ? data.roster.map((x:any,index:number)=><Stack key={x.id} direction="row" spacing={1.5} alignItems="center"><Chip size="small" label={index + 1} /><Typography variant="body2">{x.name}</Typography>{x.odOnly && <Chip size="small" color="warning" variant="outlined" label="OD only" />}</Stack>) : <Typography variant="body2" color="text.secondary">No eligible duty roster members.</Typography>}</Stack><Button variant="contained" onClick={()=>open('roster',{userIds:data.roster.map((x:any)=>x.userId),odOnlyUserIds:data.roster.filter((x:any)=>x.odOnly).map((x:any)=>x.userId),odOverrideEnabled:!!data.rosterConfig.odOverrideEnabled})}>Manage Roster</Button></CardContent></Card>}
    </CardContent></Card>

    <Dialog open={!!selectedDay} onClose={()=>setSelectedDay(null)} fullWidth maxWidth="md"><DialogTitle>Duty details for {selectedDay}</DialogTitle><DialogContent>{selectedDay && events(selectedDay).length ? <TableContainer component={Paper} variant="outlined"><Table size="small"><TableHead><TableRow><TableCell>Type</TableCell><TableCell>Details</TableCell></TableRow></TableHead><TableBody>{events(selectedDay).map((x:any,i:number)=><TableRow key={i}><TableCell><Chip size="small" label={x.kind === 'meeting' ? x.dutyType : x.kind === 'od' ? 'OD' : 'EXCEPTION'} sx={{ bgcolor:x.color, maxWidth:'100%', height:'auto', '& .MuiChip-label': { whiteSpace:'normal', py:.5 } }} /></TableCell><TableCell>{x.detail}</TableCell></TableRow>)}</TableBody></Table></TableContainer> : <Typography color="text.secondary">No duties, exceptions, or reservations recorded for this day.</Typography>}</DialogContent><DialogActions><Button onClick={()=>setSelectedDay(null)}>Close</Button></DialogActions></Dialog>
    <Dialog open={!!releaseTarget} onClose={()=>setReleaseTarget(null)} fullWidth maxWidth="sm"><DialogTitle>Return {releaseTarget?.name || 'the active OD'} to Ticket Assignment?</DialogTitle><DialogContent><Alert severity={releaseTarget?.activeTicketCount > 0 ? 'error' : 'warning'}>{releaseTarget?.activeTicketCount > 0 ? <>Reassign all active tickets first. This action will not automatically reassign tickets.</> : <>This ends the current OD coverage. The next eligible technician will be presented for manual activation; nobody will be activated automatically.</>}</Alert><Stack direction="row" alignItems="center" mt={2}><Checkbox checked={releaseConfirmed} onChange={(e)=>setReleaseConfirmed(e.target.checked)} /><Typography>I confirm that I want to return this OD to Ticket Assignment.</Typography></Stack></DialogContent><DialogActions><Button onClick={()=>setReleaseTarget(null)}>Cancel</Button><Button variant="contained" color="warning" disabled={!releaseConfirmed || releaseTarget?.activeTicketCount > 0} onClick={release}>Confirm Return</Button></DialogActions></Dialog>
    <Dialog open={!!skipTarget} onClose={()=>setSkipTarget(null)} fullWidth maxWidth="sm"><DialogTitle>Skip {skipTarget?.name || 'current technician'}?</DialogTitle><DialogContent><Alert severity="warning">{skipTarget?.activeTicketCount > 0 ? <>The technician will keep the active ticket or tickets. This creates a <b>DUE TO TA</b> exception.</> : <>Use Skip when the technician cannot take duty because of reports or another work commitment. This creates an <b>OTHER</b> exception.</>} The next eligible person will be presented for manual activation; nobody is activated automatically.</Alert><Stack direction="row" alignItems="center" mt={2}><Checkbox checked={skipConfirmed} onChange={(e)=>setSkipConfirmed(e.target.checked)} /><Typography>I confirm this technician should be skipped for today.</Typography></Stack></DialogContent><DialogActions><Button onClick={()=>setSkipTarget(null)}>Cancel</Button><Button variant="contained" color="error" disabled={!skipConfirmed} onClick={skip}>Confirm Skip</Button></DialogActions></Dialog>
    <Dialog open={!!deleteTarget} onClose={()=>setDeleteTarget(null)} fullWidth maxWidth="sm"><DialogTitle>Delete {deleteTarget?.kind === 'log' ? 'Duty Log entry' : 'Duty exception'}?</DialogTitle><DialogContent><Alert severity="error">This permanently deletes <b>{deleteTarget?.label}</b>. This action cannot be undone.</Alert><Stack direction="row" alignItems="center" mt={2}><Checkbox checked={deleteConfirmed} onChange={(e)=>setDeleteConfirmed(e.target.checked)} /><Typography>I confirm that I want to permanently delete this record.</Typography></Stack></DialogContent><DialogActions><Button onClick={()=>setDeleteTarget(null)}>Cancel</Button><Button variant="contained" color="error" disabled={!deleteConfirmed} onClick={confirmDelete}>Delete Permanently</Button></DialogActions></Dialog>
    <Dialog open={!!dialog} onClose={()=>setDialog(null)} fullWidth><DialogTitle>{dialog === 'roster' ? 'Manage Duty Roster' : dialog === 'relievers' ? `Immediate Relievers — ${form.venueType || ''}` : `${form.id ? 'Edit' : 'Add'} ${dialog}`}</DialogTitle><DialogContent><Stack spacing={2} mt={1}>
      {dialog==='log' && <><DateField label="Date" value={form.dutyDate} change={(v:string)=>setForm({...form,dutyDate:v})}/><DutyField value={form.dutyType} change={(v:string)=>setForm({...form,dutyType:v})}/><UserField users={dutyRosterUsers(form.dutyType, form.userId)} value={form.userId} change={(v:number)=>setForm({...form,userId:v})}/><TextField label="Remarks" multiline value={form.remarks||''} onChange={(e)=>setForm({...form,remarks:e.target.value})}/></>}
      {dialog==='exception' && <><DateField label="Date" value={form.exceptionDate} change={(v:string)=>setForm({...form,exceptionDate:v})}/><UserField users={dutyRosterUsers("", form.userId)} value={form.userId} change={(v:number)=>setForm({...form,userId:v})}/><SelectField label="Type" value={form.type} values={['travel_order','exam','assistance','pacd','canvass','due_to_ta','other']} change={(v:string)=>setForm({...form,type:v})}/><TextField label="Remarks" multiline value={form.remarks||''} onChange={(e)=>setForm({...form,remarks:e.target.value})}/></>}
      {dialog==='reservation' && <><DateField label="Meeting Date" value={form.meetingDate} min={access?.admin ? undefined : TODAY()} change={(v:string)=>setForm({...form,meetingDate:v})}/><SelectField label="Venue" value={form.venueType} values={['ROC','OPCEN','CONFERENCE']} change={(v:string)=>setForm({...form,venueType:v})}/><SelectField label="Meeting period" value={form.slot} values={['AM','PM','WHOLE_DAY']} change={(v:string)=>setForm({...form,slot:v})}/><TextField label="Purpose" value={form.purpose||''} onChange={(e)=>setForm({...form,purpose:e.target.value})}/><SelectField label="Status" value={form.status} values={['scheduled','confirmed','completed','cancelled']} change={(v:string)=>setForm({...form,status:v})}/></>}
      {dialog==='roster' && <><SearchableMultiSelect label="Members in rotation order" value={form.userIds||[]} options={users.filter(isDutyStaff).map((u)=>({value:u.id,label:userName(users,u.id)}))} onChange={(userIds)=>setForm({...form,userIds,odOnlyUserIds:(form.odOnlyUserIds||[]).filter((id:number)=>userIds.includes(id))})} /><FormControlLabel control={<Switch checked={!!form.odOverrideEnabled} onChange={(e)=>setForm({...form,odOverrideEnabled:e.target.checked})} />} label="Enable OD Override" />{form.odOverrideEnabled && <><Alert severity="info">OD-only members will rotate only for Officer of the Day. Other roster members will rotate for ROC, Conference, and OpCen.</Alert><SearchableMultiSelect label="OD-only members" value={form.odOnlyUserIds||[]} options={users.filter((u:any)=>(form.userIds||[]).includes(u.id)).map((u)=>({value:u.id,label:userName(users,u.id)}))} onChange={(odOnlyUserIds)=>setForm({...form,odOnlyUserIds})} /></>}</>}
      {dialog==='relievers' && <><Alert severity="warning">These technicians replace the normal {form.venueType} assignment for {form.meetingDate}. Select one or more active technicians from the shared roster.</Alert><SearchableMultiSelect label="Immediate relievers" value={form.userIds||[]} options={data.roster.filter((row:any)=>!data.rosterConfig.odOverrideEnabled || !row.odOnly).map((row:any)=>({value:row.userId,label:row.name}))} onChange={(userIds)=>setForm({...form,userIds})} /><TextField required label="Reason" multiline minRows={3} value={form.reason||''} onChange={(e)=>setForm({...form,reason:e.target.value})} helperText="Required. Explain why management requested this replacement." />{(form.userIds||[]).length > 0 && <Button color="error" variant="outlined" onClick={async()=>{try{await dutiesApi.clearMeetingRelievers(form.id);setDialog(null);setForm({});await load(true);enqueueSnackbar('Immediate relievers removed; normal rotation restored.',{variant:'success'});}catch(e:any){enqueueSnackbar(e?.response?.data?.message||'Unable to remove immediate relievers.',{variant:'error'});}}}>Restore Normal Rotation</Button>}</>}
      {dialog==='coverage' && <><Alert severity="info"><Typography fontWeight={800} mb={1}>{form.activeTicketCount > 0 ? 'Activate After Reassignment' : 'Activate Duty'}</Typography>{form.activeTicketCount > 0 ? <Typography component="div"><ol style={{margin:0,paddingLeft:20}}><li>Reassign the current technician&apos;s active ticket or tickets with the required justification.</li><li>Keep the technician&apos;s attendance eligible for duty.</li><li>Press Save to confirm that the technician will continue with the scheduled duty.</li></ol></Typography> : <Typography>Press Save to explicitly activate this roster member for duty. Until then, no Duty coverage or attendance override is recorded.</Typography>}<Typography mt={1}>Use Skip when this person cannot take the duty. The next eligible person will still require manual activation.</Typography></Alert><UserField users={users.filter((u:any)=>isDutyStaff(u) && u.id===form.userId)} value={form.userId} change={(v:number)=>setForm({...form,userId:v})}/></>}
    </Stack></DialogContent><DialogActions><Button onClick={()=>setDialog(null)}>Cancel</Button><Button variant="contained" onClick={save}>Save</Button></DialogActions></Dialog>
  </Box>;
}

function EmptyTableRow({colSpan, message}: { colSpan: number; message: string }) { return <TableRow><TableCell colSpan={colSpan}><Typography color="text.secondary" align="center">{message}</Typography></TableCell></TableRow> }
function RotationRows({rows, t}: { rows: any[]; t: DutyType }) { const filtered = rows.filter((x: any) => x.dutyType===t); return filtered.length ? <>{filtered.map((x:any) => <TableRow key={x.id} sx={{opacity:x.excluded?.5:1}}><TableCell>{x.name}</TableCell><TableCell>{x.lastAssigned||'Never'}</TableCell><TableCell>{x.daysSince===9999?'First rotation':x.daysSince}</TableCell><TableCell>{x.next ? <Star color="warning" fontSize="small" /> : ''}</TableCell></TableRow>)}</> : <EmptyTableRow colSpan={4} message="No rotation data available." />; }
function Section({title,add,children}:any){return <Box><Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}><Typography variant="h6">{title}</Typography><Button variant="contained" startIcon={<Add/>} onClick={add}>Add</Button></Stack>{children}</Box>}
function ActionButtons({edit,remove}:any){return <Stack direction="row"><IconButton color="primary" size="small" aria-label="Edit" onClick={edit}><Edit fontSize="small" /></IconButton><IconButton color="error" size="small" aria-label="Delete" onClick={remove}><Delete fontSize="small" /></IconButton></Stack>}
function DateField({label,value,min,change}:any){return <TextField type="date" label={label} InputLabelProps={{shrink:true}} inputProps={min ? { min } : undefined} value={value||''} onChange={(e)=>change(e.target.value)}/>}
function UserField({users,value,change}:any){return <SearchableSelect label="Name" value={value||null} options={users.filter(isDutyStaff).map((u:UserRecord)=>({value:u.id,label:userName(users,u.id)}))} onChange={(userId)=>change(userId||0)} />}
function DutyField({value,change}:any){return <SelectField label="Duty" value={value} values={TYPES} change={change}/>}
function SelectField({label,value,values,change}:any){return <FormControl><InputLabel>{label}</InputLabel><Select label={label} value={value||''} onChange={(e)=>change(e.target.value)}>{values.map((x:string)=><MenuItem key={x} value={x}>{x.replaceAll('_',' ').toUpperCase()}</MenuItem>)}</Select></FormControl>}
