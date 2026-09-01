'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
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
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  CheckCircle as PresentIcon,
  Cancel as AbsentIcon,
  WbSunny as HalfDayIcon,
  FlightTakeoff as OOOIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/contexts/AuthContext';
import { attendanceApi, TechAttendance, OfficeDay, AttendanceStatus } from '@/app/api/references';
import { useSse } from '@/lib/utils/useSse';
import ResponsiveTable from '@/components/layout/ResponsiveTable';

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
  const { user, myCap } = useAuth();
  /** All RICTMS staff (everyone except regular users) sees their own attendance in the calendar */
  const isRICTMSStaff = user?.role !== 'user';
  const { enqueueSnackbar } = useSnackbar();

  const [tab, setTab] = useState(0);
  const now = new Date();
  const todayStr = formatDate(now);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  // Office days
  const [officeDays, setOfficeDays] = useState<OfficeDay[]>([]);
  const [odLoading, setOdLoading] = useState(false);

  const [attendance, setAttendance] = useState<TechAttendance[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [timePickerData, setTimePickerData] = useState<{ userId: number; dateStr: string; status: AttendanceStatus } | null>(null);
  const [timeStr, setTimeStr] = useState('08:00');
  
  // System Status
  const [systemStatus, setSystemStatus] = useState<{ isOnline: boolean } | null>(null);

  // Technicians list (all technicians, regardless of attendance records)
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [techLoading, setTechLoading] = useState(false);

  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const startDate = formatDate(days[0]);
  const endDate = formatDate(days[days.length - 1]);

  const fetchSystemStatus = useCallback(async () => {
    try {
      const status = await attendanceApi.getSystemStatus();
      setSystemStatus(status);
    } catch {
      // ignore
    }
  }, []);

  const fetchOfficeDays = useCallback(async () => {
    try {
      setOdLoading(true);
      const data = await attendanceApi.getOfficeDays(startDate, endDate);
      setOfficeDays(data);
    } catch {
      enqueueSnackbar('Failed to load office days', { variant: 'error' });
    } finally {
      setOdLoading(false);
    }
  }, [startDate, endDate]);

  const fetchAttendance = useCallback(async () => {
    try {
      setAttLoading(true);
      const data = await attendanceApi.getAttendance(startDate, endDate);
      setAttendance(data);
    } catch {
      enqueueSnackbar('Failed to load attendance', { variant: 'error' });
    } finally {
      setAttLoading(false);
    }
  }, [startDate, endDate]);

  const fetchTechnicians = useCallback(async () => {
    try {
      setTechLoading(true);
      const data = await attendanceApi.getTechnicians();
      setTechnicians(data);
    } catch {
      enqueueSnackbar('Failed to load technicians', { variant: 'error' });
    } finally {
      setTechLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOfficeDays();
    fetchSystemStatus();
  }, [fetchOfficeDays, fetchSystemStatus]);
  useEffect(() => {
    if (tab === 1) {
      fetchTechnicians();
      fetchAttendance();
    } else if (isRICTMSStaff && tab === 0) {
      // All RICTMS staff see their own presence indicator in the Office Days Calendar
      fetchAttendance();
    }
  }, [tab, fetchTechnicians, fetchAttendance, isRICTMSStaff]);

  // ── Silent auto-refresh: update data every 30s without showing loading spinners (avoids flicker) ──
  const silentRefreshOfficeDays = useCallback(async () => {
    try {
      const data = await attendanceApi.getOfficeDays(startDate, endDate);
      setOfficeDays(data);
    } catch {
      /* silent — do not show error on background poll */
    }
  }, [startDate, endDate]);

  const silentRefreshTab1 = useCallback(async () => {
    if (tab !== 1) return;
    try {
      const [techs, att] = await Promise.all([
        attendanceApi.getTechnicians(),
        attendanceApi.getAttendance(startDate, endDate),
      ]);
      setTechnicians(techs);
      setAttendance(att);
    } catch {
      /* silent */
    }
  }, [tab, startDate, endDate]);

  useSse(['ATTENDANCE_UPDATED', 'SYSTEM_STATUS_CHANGED'], () => {
    silentRefreshOfficeDays();
    silentRefreshTab1();
    silentRefreshTab0Attendance();
  });

  // Live refresh for attendance data in Tab 0 — so presence indicators update in real time
  // when a manager tags a staff member as present without requiring a page reload.
  const silentRefreshTab0Attendance = useCallback(async () => {
    if (tab !== 0 || !isRICTMSStaff) return;
    try {
      const data = await attendanceApi.getAttendance(startDate, endDate);
      setAttendance(data);
    } catch {
      /* silent */
    }
  }, [tab, isRICTMSStaff, startDate, endDate]);

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
    if (od) return od.isOfficeDay;
    return isWeekday(d);
  };

  const toggleOfficeDay = async (d: Date) => {
    const dateStr = formatDate(d);
    const current = isOfficeDayForDate(d);
    const newValue = !current;

    // Optimistic update — reflect change immediately without showing loading spinner
    setOfficeDays((prev) => {
      const idx = prev.findIndex((od) => od.date.slice(0, 10) === dateStr);
      if (idx !== -1) {
        const arr = [...prev];
        arr[idx] = { ...arr[idx], isOfficeDay: newValue };
        return arr;
      }
      // Create a local placeholder so the UI renders instantly
      return [
        ...prev,
        {
          id: `temp-${dateStr}`,
          date: dateStr,
          isOfficeDay: newValue,
          notes: null,
          setById: null,
          createdAt: '',
        } as any,
      ];
    });

    try {
      const updated = await attendanceApi.setOfficeDay({ date: dateStr, isOfficeDay: newValue });
      // Replace the optimistic placeholder with the real server record
      setOfficeDays((prev) => {
        const idx = prev.findIndex((od) => od.date.slice(0, 10) === dateStr);
        if (idx !== -1) {
          const arr = [...prev];
          arr[idx] = updated;
          return arr;
        }
        return prev;
      });
      // Silently refresh attendance presence indicators (no loading spinner)
      attendanceApi
        .getAttendance(startDate, endDate)
        .then((data) => setAttendance(data))
        .catch(() => { });
    } catch (err: any) {
      // Rollback: re-fetch silently to restore truthful server state
      attendanceApi
        .getOfficeDays(String(month + 1), String(year))
        .then((data) => setOfficeDays(data))
        .catch(() => { });
      enqueueSnackbar(err?.response?.data?.message || 'Failed to update office day', {
        variant: 'error',
      });
    }
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

  const todayInViewedMonth =
    year === now.getFullYear() && month === now.getMonth() && isWeekday(now);
  const hasUnmarkedTodayAttendance = useMemo(() => {
    if (tab !== 1 || !todayInViewedMonth || technicians.length === 0) return false;
    return technicians.some((tech: any) => !attRecordsMap.get(tech.id)?.get(todayStr));
  }, [tab, todayInViewedMonth, technicians, attRecordsMap, todayStr]);

  // SSE now handles live-refreshing today's attendance even for unmarked staff.

  const handleSetAttendance = async (userId: number, date: string, status: AttendanceStatus, clockInTime?: string) => {
    // Optimistic update — immediately reflect in UI without showing loading spinner
    setAttendance((prev) => {
      const idx = prev.findIndex((r) => r.userId === userId && r.date.slice(0, 10) === date);
      if (idx !== -1) {
        const arr = [...prev];
        arr[idx] = { ...arr[idx], status, clockInTime: clockInTime ?? arr[idx].clockInTime };
        return arr;
      }
      // No record yet: create a temporary placeholder
      return [
        ...prev,
        { id: `temp-${userId}-${date}`, userId, date, status, clockInTime, createdAt: '' } as TechAttendance,
      ];
    });
    try {
      const updated = await attendanceApi.setAttendance({ userId, date, status, clockInTime });
      // Replace temp record with actual server response
      setAttendance((prev) => {
        const idx = prev.findIndex((r) => r.userId === userId && r.date.slice(0, 10) === date);
        if (idx !== -1) {
          const arr = [...prev];
          arr[idx] = updated;
          return arr;
        }
        return prev;
      });
    } catch (err: any) {
      // Rollback on error by refetching
      fetchAttendance();
      enqueueSnackbar(err?.response?.data?.message || 'Failed', { variant: 'error' });
    }
  };

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
        <Typography variant="h4" fontWeight={700} mb={0.5}>
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

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={0.5}>
        Attendance Management
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Manage the office day calendar and track technician attendance by support type
      </Typography>

      {/* Month Navigation */}
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <IconButton onClick={() => navMonth(-1)}>
          <PrevIcon />
        </IconButton>
        <Typography variant="h6" fontWeight={600} sx={{ minWidth: 200, textAlign: 'center' }}>
          {MONTHS[month]} {year}
        </Typography>
        <IconButton onClick={() => navMonth(1)}>
          <NextIcon />
        </IconButton>
      </Stack>

      <Card>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Office Days" />
          <Tab label="Attendance" />
        </Tabs>

        {/* ── Office Days Calendar ── */}
        {tab === 0 && (
          <CardContent>
            {odLoading ? (
              <Box textAlign="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Click on today or a future date to toggle it as an office day. Past dates cannot
                  be changed. Weekdays default to office days.
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
                    // Past dates are not clickable; today remains editable for emergency declarations.
                    const isPastOrToday = dStr < todayStr;
                    const isToday = dStr === todayStr;
                    return (
                      <Box
                        key={dStr}
                        data-testid={`office-day-${dStr}`}
                        data-office-day={isOffice ? 'true' : 'false'}
                        onClick={
                          canManageOfficeDays && !isPastOrToday
                            ? () => toggleOfficeDay(d)
                            : undefined
                        }
                        sx={{
                          textAlign: 'center',
                          py: 1.5,
                          borderRadius: 1,
                          bgcolor: isOffice ? 'success.light' : 'grey.200',
                          color: isOffice ? 'success.contrastText' : 'text.disabled',
                          cursor: canManageOfficeDays && !isPastOrToday ? 'pointer' : 'default',
                          opacity: isPastOrToday ? 0.55 : 1,
                          '&:hover': canManageOfficeDays && !isPastOrToday ? { opacity: 0.8 } : {},
                          border: isToday ? '2px solid' : 'none',
                          borderColor: 'primary.main',
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {d.getDate()}
                        </Typography>
                        <Typography variant="caption">{isOffice ? 'Office' : 'Off'}</Typography>
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
            <Stack direction="row" spacing={2} mb={2} alignItems="center">
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                {canManage && (
                  <Typography variant="body2" color="text.secondary" mr={1}>
                    Click a cell to cycle:
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

            {attLoading || techLoading ? (
              <Box textAlign="center" py={4}>
                <CircularProgress />
              </Box>
            ) : technicians.length === 0 ? (
              <Typography color="text.secondary" py={3} textAlign="center">
                No staff found.
              </Typography>
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
                          minWidth: 160,
                        }}
                      >
                        Staff
                      </TableCell>
                      {attendanceDays.map((d) => {
                        const isOffice = isOfficeDayForDate(d);
                        const isToday = formatDate(d) === formatDate(new Date());
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
                            className="name-cell"
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
                              <Typography variant="body2" noWrap>
                                {[tech.firstName, tech.lastName].filter(Boolean).join(' ') ||
                                  tech.email}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {(tech.role ?? '').replace(/_/g, ' ')}
                              </Typography>
                            </Box>
                          </TableCell>
                          {attendanceDays.map((d) => {
                            const dateStr = formatDate(d);
                            const rec = records.get(dateStr);
                            const status = rec?.status;
                            const cfg = status ? STATUS_CONFIG[status] : null;
                            const todayStr = formatDate(new Date());
                            const isPastDate = dateStr < todayStr;
                            const isFutureDate = dateStr > todayStr;
                            const isToday = dateStr === todayStr;

                            const cellClickHandler = () => {
                              if (!canManage || isPastDate || isFutureDate) return;
                              let cycle: AttendanceStatus[] = ['absent', 'half_day', 'out_of_office'];
                              
                              if (systemStatus?.isOnline) {
                                // If online, present is synced automatically.
                                // Don't allow manual present toggling.
                              } else {
                                // Offline fallback
                                // Only Admins can set PRESENT fallback
                                if (canManage) { // assuming canManage means admin here
                                  cycle = ['present', 'absent', 'half_day', 'out_of_office'];
                                }
                              }

                              const handleTransition = (newStatus: AttendanceStatus) => {
                                if (newStatus === 'present') {
                                  setTimePickerData({ userId, dateStr, status: newStatus });
                                } else {
                                  handleSetAttendance(userId, dateStr, newStatus);
                                }
                              };

                              if (!status) {
                                handleTransition(cycle[0]);
                              } else {
                                const currentIdx = cycle.indexOf(status);
                                if (currentIdx === -1 || currentIdx === cycle.length - 1) {
                                  // if it was 'present' and not in cycle, or at end of cycle
                                  setAttendance((prev) => prev.filter((r) => !(r.userId === userId && r.date.slice(0, 10) === dateStr)));
                                  attendanceApi.deleteAttendance(userId, dateStr).catch(() => fetchAttendance());
                                } else {
                                  handleTransition(cycle[currentIdx + 1]);
                                }
                              }
                            };

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
                                onClick={cellClickHandler}
                                sx={{
                                  p: 0,
                                  height: '40px',
                                  bgcolor: isToday ? 'primary.50' : 'inherit',
                                  cursor: (canManage && !isPastDate && !isFutureDate) ? 'pointer' : 'default',
                                  '&:hover': (canManage && !isPastDate && !isFutureDate)
                                    ? { bgcolor: 'rgba(0, 0, 0, 0.08)' }
                                    : (!isToday ? { bgcolor: 'rgba(0, 0, 0, 0.02)' } : {})
                                }}
                              >
                                  <Box display="flex" flexDirection="column" width="100%" height="100%" justifyContent="center" alignItems="center">
                                    <Box
                                      sx={{
                                        color: cfg ? `${cfg.color}.main` : 'action.active',
                                        display: 'flex'
                                      }}
                                    >
                                      {renderIcon()}
                                    </Box>
                                    {rec?.clockInTime && (
                                      <Typography variant="caption" sx={{ fontSize: '0.6rem', lineHeight: 1, mt: 0.25, color: 'text.secondary' }}>
                                        {new Date(rec.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}
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
