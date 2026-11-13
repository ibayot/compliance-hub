'use client';
import WorkspaceTabs from '@/components/layout/WorkspaceTabs';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Stack,
  CircularProgress,
  Tabs,
  Tab,
  Tooltip,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  CheckCircle as PresentIcon,
  Cancel as AbsentIcon,
  WbSunny as HalfDayIcon,
  FlightTakeoff as OOOIcon,
  Restore as RestoreDtrIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { formatPersonName } from '@/lib/utils/person-name';
import { attendanceApi, TechAttendance, OfficeDay, AttendanceStatus } from '@/app/api/references';
import { useSse } from '@/lib/utils/useSse';
import ResponsiveTable from '@/components/layout/ResponsiveTable';

const EMPTY_OFFICE_DAYS: OfficeDay[] = [];
const EMPTY_ATTENDANCE: TechAttendance[] = [];
const officeDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
});

function getManilaDate() {
  const parts = Object.fromEntries(officeDateFormat.formatToParts().map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; color: 'success' | 'error' | 'warning' | 'info'; icon: React.ReactNode }
> = {
  present: { label: 'Present', color: 'success', icon: <PresentIcon fontSize="small" /> },
  absent: { label: 'Absent', color: 'error', icon: <AbsentIcon fontSize="small" /> },
  half_day: { label: 'Half Day', color: 'warning', icon: <HalfDayIcon fontSize="small" /> },
  out_of_office: { label: 'OOO', color: 'info', icon: <OOOIcon fontSize="small" /> },
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/** Format date as YYYY-MM-DD using local time (avoids UTC offset issues) */
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isWeekday(d: Date): boolean {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

export default function AttendancePage() {
  const { user, myCap, isSessionLocked, requiresPasswordChange } = useAuth();
  /** All RICTMS staff (everyone except regular users) sees their own attendance in the calendar */
  const isRICTMSStaff = user?.role !== 'user';
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const compactAttendance = useMediaQuery(theme.breakpoints.down('sm'));

  const [tab, setTab] = useState(0);
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState('');
  const [todayStr, setTodayStr] = useState(getManilaDate);
  const [officeYear, officeMonth] = todayStr.split('-').map(Number);
  const [year, setYear] = useState(officeYear);
  const [month, setMonth] = useState(officeMonth - 1);

  // Office days
  const [officeDaySelection, setOfficeDaySelection] = useState<{ date: string; type: 'office' | 'off' | 'overtime' } | null>(null);
  const [savingOfficeDay, setSavingOfficeDay] = useState(false);


  const [timePickerData, setTimePickerData] = useState<{ userId: number; dateStr: string; status: AttendanceStatus } | null>(null);
  const [timeStr, setTimeStr] = useState('08:00');
  
  // System Status

  // Technicians list (all technicians, regardless of attendance records)

  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const startDate = formatDate(days[0]);
  const endDate = formatDate(days[days.length - 1]);

  const queryClient = useQueryClient();
  const active = !!user && !isSessionLocked && !requiresPasswordChange;
  const mayRead = active && !!myCap?.isAttendanceAccess;
  const scope = ['attendance-page', user?.id] as const;
  const officeKey = [...scope, 'office-days', startDate, endDate] as const;
  const attendanceKey = [...scope, 'records', startDate, endDate] as const;
  const officeQuery = useQuery({
    queryKey: officeKey,
    queryFn: ({ signal }) => attendanceApi.getOfficeDays(startDate, endDate, { signal }),
    enabled: mayRead,
    retry: false,
  });
  const attendanceQuery = useQuery({
    queryKey: attendanceKey,
    queryFn: ({ signal }) => attendanceApi.getAttendance(startDate, endDate, undefined, { signal }),
    enabled: mayRead && (tab === 1 || isRICTMSStaff),
    retry: false,
    refetchInterval: 60_000,
  });
  const techniciansQuery = useQuery({
    queryKey: [...scope, 'staff'],
    queryFn: ({ signal }) => attendanceApi.getTechnicians(undefined, { signal }),
    enabled: mayRead && tab === 1,
    retry: false,
    refetchInterval: 60_000,
  });
  const systemQuery = useQuery({
    queryKey: [...scope, 'dtr'],
    queryFn: ({ signal }) => attendanceApi.getSystemStatus({ signal }),
    enabled: mayRead,
    retry: false,
    refetchInterval: 60_000,
  });
  const officeDays = officeQuery.data ?? EMPTY_OFFICE_DAYS;
  const attendance = attendanceQuery.data ?? EMPTY_ATTENDANCE;
  const technicians = techniciansQuery.data ?? [];
  const systemStatus = systemQuery.isError ? undefined : systemQuery.data;
  const refreshAttendance = () => queryClient.invalidateQueries({ queryKey: scope }, { cancelRefetch: false });

  useSse(['ATTENDANCE_UPDATED', 'SYSTEM_STATUS_CHANGED'], () => {
    if (mayRead) void refreshAttendance();
  });

  useEffect(() => {
    const refreshDate = () => setTodayStr(getManilaDate());
    const interval = window.setInterval(refreshDate, 60_000);
    window.addEventListener('focus', refreshDate);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshDate);
    };
  }, []);

  // Office day map: date → OfficeDay
  const odMap = useMemo(() => {
    const m = new Map<string, OfficeDay>();
    officeDays.forEach((od) => m.set(od.date.slice(0, 10), od));
    return m;
  }, [officeDays]);

  // Determine if a date is an office day (explicit setting or weekday default)
  const isOfficeDayForDate = (d: Date): boolean => {
    const key = formatDate(d);
    const od = odMap.get(key);
    if (od) return od.isOfficeDay || !!od.isOvertime;
    return isWeekday(d);
  };

  const toggleOfficeDay = (d: Date) => {
    const dateStr = formatDate(d);
    setOfficeDaySelection({ date: dateStr, type: odMap.get(dateStr)?.isOvertime ? 'overtime' : isOfficeDayForDate(d) ? 'office' : 'off' });
  };
  const saveOfficeDay = async () => {
    if (!officeDaySelection || savingOfficeDay) return;
    const { date: dateStr, type } = officeDaySelection;
    setSavingOfficeDay(true);
    try {
      await attendanceApi.setOfficeDay({ date: dateStr, isOfficeDay: type !== 'off', isOvertime: type === 'overtime' });
      await queryClient.invalidateQueries({ queryKey: scope });
      setOfficeDaySelection(null);
      enqueueSnackbar('Office calendar updated.', { variant: 'success' });
    } catch (err: any) {
      void queryClient.invalidateQueries({ queryKey: officeKey });
      enqueueSnackbar(err?.response?.data?.message || 'Failed to update office day', {
        variant: 'error',
      });
    } finally { setSavingOfficeDay(false); }
  };

  // Attendance records map: userId → (date → TechAttendance)
  const attRecordsMap = useMemo(() => {
    const m = new Map<number, Map<string, TechAttendance>>();
    attendance.forEach((att) => {
      if (!m.has(att.userId)) m.set(att.userId, new Map());
      m.get(att.userId)!.set(att.date.slice(0, 10), att);
    });
    return m;
  }, [attendance]);

  const activeRows = useRef(new Set<number>());
  const [pendingRows, setPendingRows] = useState<number[]>([]);
  const runAttendanceAction = async (userId: number, operation: () => Promise<unknown>, success: string, failure: string) => {
    if (activeRows.current.has(userId)) return;
    activeRows.current.add(userId);
    setPendingRows((current) => [...current, userId]);
    try {
      await operation();
      await queryClient.invalidateQueries({ queryKey: [...scope, 'records'] });
      enqueueSnackbar(success, { variant: 'success' });
    } catch (err: any) {
      void queryClient.invalidateQueries({ queryKey: [...scope, 'records'] });
      enqueueSnackbar(err?.response?.data?.message || failure, { variant: 'error' });
    } finally {
      activeRows.current.delete(userId);
      setPendingRows((current) => current.filter((id) => id !== userId));
    }
  };

  const handleSetAttendance = (userId: number, date: string, status: AttendanceStatus, clockInTime?: string) =>
    runAttendanceAction(userId, () => attendanceApi.setAttendance({ userId, date, status, clockInTime }), 'Attendance updated.', 'Could not update attendance.');

  const handleRestoreDtrAttendance = (userId: number, date: string) =>
    runAttendanceAction(userId, () => attendanceApi.restoreFromDtr(userId, date), 'Attendance restored to Present from DTR.', 'Could not restore attendance from DTR.');

  const navMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y--;
    }
    if (m > 11) {
      m = 0;
      y++;
    }
    setMonth(m);
    setYear(y);
  };

  const canManageAttendance = !!myCap?.isAttendanceManage;

  const canManageOfficeDays = !!myCap?.isAttendanceManage;

  const canAccessAttendance = !!myCap?.isAttendanceAccess;

  if (!canAccessAttendance) {
    return (
      <Box>
        <Typography component="h1" variant="h4" fontWeight={700} mb={0.5}>
          Attendance Management
        </Typography>
        <Typography color="error">You do not have access to this feature.</Typography>
      </Box>
    );
  }

  const canManage = canManageAttendance;

  // Attendance only shows declared office days. Weekdays default to office
  // days, while weekends and explicitly declared off days stay hidden here.
  const attendanceDays = days.filter(isOfficeDayForDate);
  const availableDates = attendanceDays.map(formatDate);
  const activeAttendanceDate = availableDates.includes(selectedAttendanceDate)
    ? selectedAttendanceDate
    : availableDates.filter((date) => date <= todayStr).slice(-1)[0] ?? availableDates[0] ?? '';

  function getAttendanceAction(userId: number, date: string, record?: TechAttendance) {
    if (!canManage || date !== todayStr || !systemStatus) return null;
    const cycle: AttendanceStatus[] = systemStatus?.isOnline
      ? ['absent', 'half_day', 'out_of_office']
      : ['present', 'absent', 'half_day', 'out_of_office'];
    const status = record?.status;
    const index = status ? cycle.indexOf(status) : -1;
    const next = !status || (status === 'present' && systemStatus?.isOnline)
      ? cycle[0]
      : index >= 0 ? cycle[index + 1] : undefined;
    if (next) {
      return {
        label: next === 'out_of_office' ? 'Mark out of office' : `Mark ${STATUS_CONFIG[next].label.toLowerCase()}`,
        run: () => next === 'present'
          ? setTimePickerData({ userId, dateStr: date, status: next })
          : void handleSetAttendance(userId, date, next),
      };
    }
    if (systemStatus?.isOnline && record?.isManualOverride && record.clockInTime) {
      return { label: 'Restore DTR present', run: () => void handleRestoreDtrAttendance(userId, date) };
    }
    return {
      label: 'Clear status',
      run: () => void runAttendanceAction(userId, () => attendanceApi.deleteAttendance(userId, date), 'Attendance status cleared.', 'Could not clear attendance status.'),
    };
  }

  return (
    <Box>
<Typography component="h1" variant="h4" fontWeight={700} mb={0.5}>
        Attendance Management
      </Typography>
<Typography variant="body2" color="text.secondary" mb={3}>
        Manage the office day calendar and track technician attendance by support type
      </Typography>
<Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <IconButton aria-label="Previous month" onClick={() => navMonth(-1)}>
          <PrevIcon />
        </IconButton>
        <Typography variant="h6" fontWeight={600} sx={{ minWidth: 200, textAlign: 'center' }}>
          {MONTHS[month]} {year}
        </Typography>
        <IconButton aria-label="Next month" onClick={() => navMonth(1)}>
          <NextIcon />
        </IconButton>
      </Stack>
<WorkspaceLayout kind="standard">
{/* Month Navigation */}
<Card>
        <WorkspaceTabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Office Days" />
          <Tab label="Attendance" />
        </WorkspaceTabs>

        {/* ── Office Days Calendar ── */}
        {tab === 0 && (
          <CardContent>
            {officeQuery.isError ? <Alert severity="error" action={<Button color="inherit" onClick={() => void officeQuery.refetch()}>Retry</Button>}>Could not load the office calendar.</Alert> : officeQuery.isLoading ? (
              <Box textAlign="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Select today or a future date to choose Office, Off, or Overtime (OT). OT attendance is optional;
                  staff without a clock-in are not automatically marked absent. Past dates remain locked.
                </Typography>
                <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={0.5}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <Box key={d} textAlign="center" py={0.5}>
                      <Typography variant="caption" fontWeight={700}>
                        {d}
                      </Typography>
                    </Box>
                  ))}
                  {/* Pad first week */}
                  {Array.from({ length: days[0].getDay() }).map((_, i) => (
                    <Box key={`pad-${i}`} />
                  ))}
                  {days.map((d) => {
                    const isOffice = isOfficeDayForDate(d);
                    const dStr = formatDate(d);
                    const isOvertime = !!odMap.get(dStr)?.isOvertime;
                    // Past dates are not clickable; today remains editable for emergency declarations.
                    const isPast = dStr < todayStr;
                    const isToday = dStr === todayStr;
                    return (
                      <Box
                        component="button"
                        type="button"
                        disabled={!canManageOfficeDays || isPast}
                        aria-label={`${dStr}: ${isOvertime ? 'Overtime' : isOffice ? 'Office' : 'Off'}`}
                        key={dStr}
                        data-testid={`office-day-${dStr}`}
                        data-office-day={isOffice ? 'true' : 'false'}
                        onClick={
                          canManageOfficeDays && !isPast
                            ? () => toggleOfficeDay(d)
                            : undefined
                        }
                        sx={{
                          textAlign: 'center',
                          py: 1.5,
                          borderRadius: 1,
                          bgcolor: isOvertime ? 'warning.light' : isOffice ? 'success.light' : 'action.hover',
                          color: isOvertime ? 'warning.contrastText' : isOffice ? 'success.contrastText' : 'text.disabled',
                          cursor: canManageOfficeDays && !isPast ? 'pointer' : 'default',
                          opacity: isPast ? 0.55 : 1,
                          '&:hover': canManageOfficeDays && !isPast ? { opacity: 0.8 } : {},
                          border: isToday ? '2px solid' : 'none',
                          borderColor: 'primary.main',
                          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {d.getDate()}
                        </Typography>
                        <Typography variant="caption">{isOvertime ? 'OT' : isOffice ? 'Office' : 'Off'}</Typography>
                        {isRICTMSStaff &&
                          isOffice &&
                          (() => {
                            const myStatus =
                              attRecordsMap.get(user?.id ?? 0)?.get(dStr)?.status ?? null;
                            const myCfg = myStatus ? STATUS_CONFIG[myStatus] : null;
                            return (
                              <Box mt={0.5}>
                                {myCfg ? (
                                  <Chip
                                    size="small"
                                    icon={myCfg.icon as any}
                                    label={myCfg.label}
                                    color={myCfg.color}
                                    sx={{ transform: 'scale(0.75)', transformOrigin: 'center' }}
                                  />
                                ) : (
                                  <Typography variant="caption" color="inherit">
                                    —
                                  </Typography>
                                )}
                              </Box>
                            );
                          })()}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </CardContent>
        )}

        {/* ── Technician Attendance ── */}
        {tab === 1 && (
          <CardContent>
            {canManage && systemQuery.isError && (
              <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => void systemQuery.refetch()}>Retry</Button>}>
                Attendance can be viewed, but status changes are unavailable until the clock-in system status can be checked.
              </Alert>
            )}
            <Stack direction="row" spacing={2} mb={2} alignItems="center">
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                {canManage && !compactAttendance && (
                  <Typography variant="body2" color="text.secondary" mr={1}>
                    Use today's status buttons to cycle:
                  </Typography>
                )}
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                  let label = cfg.label;
                  if (key === 'present') {
                    if (systemStatus?.isOnline) {
                      label = 'Present (Auto-Synced)';
                    } else if (systemStatus?.isOnline === false) {
                      label = 'Present (Fallback)';
                    }
                  }
                  return (
                    <Chip
                      key={key}
                      size="small"
                      icon={cfg.icon as any}
                      label={label}
                      color={cfg.color}
                      variant="outlined"
                    />
                  );
                })}
              </Box>
            </Stack>

            {officeQuery.isError || attendanceQuery.isError || techniciansQuery.isError ? <Alert severity="error" action={<Button color="inherit" onClick={() => void refreshAttendance()}>Retry</Button>}>Could not load attendance for this month.</Alert> : officeQuery.isLoading || attendanceQuery.isLoading || techniciansQuery.isLoading ? (
              <Box textAlign="center" py={4}>
                <CircularProgress />
              </Box>
            ) : technicians.length === 0 ? (
              <Typography color="text.secondary" py={3} textAlign="center">
                No staff found.
              </Typography>
            ) : !activeAttendanceDate ? (
              <Typography color="text.secondary" py={3} textAlign="center">
                No office or overtime days in this month.
              </Typography>
            ) : compactAttendance ? (
              <Stack spacing={1.5}>
                <TextField select fullWidth label="Attendance date" value={activeAttendanceDate}
                  onChange={(event) => setSelectedAttendanceDate(event.target.value)}>
                  {attendanceDays.map((date) => (
                    <MenuItem key={formatDate(date)} value={formatDate(date)}>
                      {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      {formatDate(date) === todayStr ? ' (Today)' : ''}
                    </MenuItem>
                  ))}
                </TextField>
                <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
                  {technicians.map((tech) => {
                    const record = attRecordsMap.get(tech.id)?.get(activeAttendanceDate);
                    const status = record?.status && STATUS_CONFIG[record.status];
                    const name = formatPersonName(tech) || tech.email;
                    const action = getAttendanceAction(tech.id, activeAttendanceDate, record);
                    const canRestore = canManage && activeAttendanceDate === todayStr &&
                      systemStatus?.isOnline && record?.isManualOverride && record.clockInTime;
                    return (
                      <Card component="li" variant="outlined" key={tech.id} sx={{ p: 1.5 }}>
                        <Stack spacing={0.75} alignItems="flex-start">
                          <Typography fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>{name}</Typography>
                          <Typography variant="caption" color="text.secondary">{(tech.role ?? '').replace(/_/g, ' ')}</Typography>
                          <Stack direction="row" gap={1} useFlexGap flexWrap="wrap" alignItems="center">
                            <Chip size="small" label={status?.label ?? 'No record'} color={status?.color ?? 'default'} />
                            {record?.clockInTime && (
                              <Typography variant="body2">In: {new Date(record.clockInTime).toLocaleTimeString([], { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}</Typography>
                            )}
                          </Stack>
                          {action && (
                            <Stack direction="row" gap={0.5} useFlexGap flexWrap="wrap">
                              <Button size="small" aria-label={`${action.label} for ${name}`} disabled={pendingRows.includes(tech.id)} onClick={action.run} sx={{ minHeight: 44 }}>
                                {action.label}
                              </Button>
                              {canRestore && action.label !== 'Restore DTR present' && (
                                <IconButton aria-label={`Restore DTR present for ${name}`} disabled={pendingRows.includes(tech.id)} onClick={() => void handleRestoreDtrAttendance(tech.id, activeAttendanceDate)} sx={{ width: 44, height: 44 }}>
                                  <RestoreDtrIcon />
                                </IconButton>
                              )}
                            </Stack>
                          )}
                        </Stack>
                      </Card>
                    );
                  })}
                </Stack>
              </Stack>
            ) : (
              <ResponsiveTable minWidth={560} maxHeight={500} testId="attendance-table">
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          position: 'sticky',
                          left: 0,
                          zIndex: 3,
                          bgcolor: 'background.paper',
                          width: 180, minWidth: 160, maxWidth: 200,
                        }}
                      >
                        Staff
                      </TableCell>
                      {attendanceDays.map((d) => {
                        const isOffice = isOfficeDayForDate(d);
                        const isToday = formatDate(d) === todayStr;
                        return (
                          <TableCell
                            key={formatDate(d)}
                            align="center"
                            sx={{
                              minWidth: 36,
                              px: 0.5,
                              ...(isOffice ? {} : { bgcolor: 'action.disabledBackground' }),
                              ...(isToday ? { bgcolor: 'primary.main', border: '2px solid', borderColor: 'primary.dark' } : {}),
                            }}
                          >
                            <Typography
                              variant="caption"
                              color={isToday ? 'primary.contrastText' : isOffice ? 'text.primary' : 'text.disabled'}
                              fontWeight={isToday ? 700 : 400}
                            >
                              {d.getDate()}
                            </Typography>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {technicians.map((tech: any) => {
                      const userId = tech.id;
                      const records =
                        attRecordsMap.get(userId) ?? new Map<string, TechAttendance>();
                      return (
                        <TableRow
                          key={userId}
                          sx={{ '&:hover .name-cell::after': { opacity: 1 } }}
                        >
                          <TableCell
                            component="th" scope="row" className="name-cell"
                            sx={{
                              position: 'sticky',
                              left: 0,
                              zIndex: 2,
                              bgcolor: 'background.paper',
                              '&::after': {
                                content: '""',
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                bgcolor: 'rgba(0, 0, 0, 0.08)',
                                opacity: 0,
                                transition: 'opacity 0.2s',
                                pointerEvents: 'none',
                                zIndex: 0,
                              }
                            }}
                          >
                            <Box sx={{ position: 'relative', zIndex: 1 }}>
                              <Typography variant="body2" sx={{ maxWidth: 180, overflowWrap: "anywhere" }}>
                                {formatPersonName(tech) ||
                                  tech.email}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                                {(tech.role ?? '').replace(/_/g, ' ')}
                              </Typography>
                            </Box>
                          </TableCell>
                          {attendanceDays.map((d) => {
                            const dateStr = formatDate(d);
                            const rec = records.get(dateStr);
                            const status = rec?.status;
                            const cfg = status ? STATUS_CONFIG[status] : null;
                            const isToday = dateStr === todayStr;
                            const action = getAttendanceAction(userId, dateStr, rec);
                            const canRestoreFromDtr = Boolean(canManage && isToday && systemStatus?.isOnline && rec?.isManualOverride && rec.clockInTime);
                            const staffName = formatPersonName(tech) || tech.email;

                            const renderIcon = () => {
                              if (!cfg) return (
                                <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1, color: 'text.secondary' }}>
                                  •
                                </Typography>
                              );
                              return canManage ? cfg.icon : (
                                <Chip
                                  size="small"
                                  icon={cfg.icon as any}
                                  label={cfg.label}
                                  color={cfg.color}
                                  sx={{ transform: 'scale(0.85)', transformOrigin: 'center' }}
                                />
                              );
                            };

                            return (
                              <TableCell
                                key={dateStr}
                                align="center"
                                sx={{ p: 0, height: 44, bgcolor: isToday ? 'primary.50' : 'inherit' }}
                              >
                                  <Box display="flex" flexDirection="column" width="100%" height="100%" justifyContent="center" alignItems="center">
                                    <Box
                                      sx={{
                                        color: cfg ? `${cfg.color}.main` : 'action.active',
                                        display: 'flex'
                                      }}
                                    >
                                      {action ? (
                                        <IconButton aria-label={`${action.label} for ${staffName}; current status: ${cfg?.label ?? "no record"}`}
                                          disabled={pendingRows.includes(userId)} onClick={action.run} sx={{ minWidth: 44, minHeight: 44, color: "inherit" }}>
                                          {renderIcon()}
                                        </IconButton>
                                      ) : renderIcon()}
                                      {canRestoreFromDtr && (
                                        <Tooltip title="Restore DTR Present">
                                          <IconButton
                                            size="small"
                                            aria-label="Restore attendance to Present from DTR"
                                            disabled={pendingRows.includes(userId)}
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              handleRestoreDtrAttendance(userId, dateStr);
                                            }}
                                            sx={{ p: 0.125, ml: 0.25, color: 'success.main' }}
                                          >
                                            <RestoreDtrIcon sx={{ fontSize: '0.9rem' }} />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                    </Box>
                                    {rec?.clockInTime && (
                                      <Typography variant="caption" sx={{ fontSize: '0.6rem', lineHeight: 1, mt: 0.25, color: 'text.secondary' }}>
                                        {new Date(rec.clockInTime).toLocaleTimeString([], { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}
                                      </Typography>
                                    )}
                                  </Box>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ResponsiveTable>
            )}
          </CardContent>
        )}
      </Card>
{/* Time Picker Dialog */}
</WorkspaceLayout>
<Dialog open={!!officeDaySelection} onClose={() => !savingOfficeDay && setOfficeDaySelection(null)} fullWidth maxWidth="sm" aria-labelledby="office-day-dialog-title">
        <DialogTitle id="office-day-dialog-title">Office calendar — {officeDaySelection?.date}</DialogTitle>
        <DialogContent>
          <TextField autoFocus select fullWidth label="Day type" value={officeDaySelection?.type || 'off'} disabled={savingOfficeDay}
            sx={{ mt: 1 }} onChange={event => setOfficeDaySelection(current => current && ({ ...current, type: event.target.value as 'office' | 'off' | 'overtime' }))}>
            <MenuItem value="office">Office day</MenuItem><MenuItem value="off">Off day</MenuItem><MenuItem value="overtime">Overtime (OT)</MenuItem>
          </TextField>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>OT uses voluntary clock-ins and manual ticket acquisition. Only requests filed and assigned on OT receive the extra SLA working day. Unclaimed requests enter automatic routing on a normal office day.</Typography>
        </DialogContent>
        <DialogActions><Button disabled={savingOfficeDay} onClick={() => setOfficeDaySelection(null)}>Cancel</Button><Button variant="contained" disabled={savingOfficeDay} onClick={() => void saveOfficeDay()}>{savingOfficeDay ? 'Saving…' : 'Save'}</Button></DialogActions>
      </Dialog>
<Dialog open={Boolean(timePickerData)} onClose={() => setTimePickerData(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Set Clock-In Time</DialogTitle>
        <DialogContent>
          <Box py={2}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Please set the clock-in time for this manual override.
            </Typography>
            <TextField
              fullWidth
              type="time"
              label="Clock-In Time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 60 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTimePickerData(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr) || timePickerData?.dateStr !== todayStr || systemStatus?.isOnline !== false}
            onClick={() => {
              if (timePickerData) {
                // Construct a full ISO date string from dateStr + timeStr
                const fullDateTimeStr = `${timePickerData.dateStr}T${timeStr}:00+08:00`;
                const isoTime = new Date(fullDateTimeStr).toISOString();
                handleSetAttendance(timePickerData.userId, timePickerData.dateStr, timePickerData.status, isoTime);
              }
              setTimePickerData(null);
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
</Box>
  );
}
