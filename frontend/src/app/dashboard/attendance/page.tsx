'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Button, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, TextField, MenuItem,
  Stack, CircularProgress, Tabs, Tab, Tooltip, Select, FormControl, InputLabel,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon, ChevronRight as NextIcon,
  CheckCircle as PresentIcon, Cancel as AbsentIcon,
  WbSunny as HalfDayIcon, FlightTakeoff as OOOIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/contexts/AuthContext';
import {
  attendanceApi, TechAttendance, OfficeDay, AttendanceStatus,
} from '@/app/api/references';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: 'success' | 'error' | 'warning' | 'info'; icon: React.ReactNode }> = {
  present: { label: 'Present', color: 'success', icon: <PresentIcon fontSize="small" /> },
  absent: { label: 'Absent', color: 'error', icon: <AbsentIcon fontSize="small" /> },
  half_day: { label: 'Half Day', color: 'warning', icon: <HalfDayIcon fontSize="small" /> },
  out_of_office: { label: 'OOO', color: 'info', icon: <OOOIcon fontSize="small" /> },
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isWeekday(d: Date): boolean {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [tab, setTab] = useState(0);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  // Office days
  const [officeDays, setOfficeDays] = useState<OfficeDay[]>([]);
  const [odLoading, setOdLoading] = useState(false);

  // Attendance
  const [attendance, setAttendance] = useState<TechAttendance[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attType, setAttType] = useState('it_support');

  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const startDate = formatDate(days[0]);
  const endDate = formatDate(days[days.length - 1]);

  const fetchOfficeDays = useCallback(async () => {
    try {
      setOdLoading(true);
      const data = await attendanceApi.getOfficeDays(String(month + 1), String(year));
      setOfficeDays(data);
    } catch { enqueueSnackbar('Failed to load office days', { variant: 'error' }); }
    finally { setOdLoading(false); }
  }, [year, month]);

  const fetchAttendance = useCallback(async () => {
    try {
      setAttLoading(true);
      const data = await attendanceApi.getAttendance(startDate, endDate, attType);
      setAttendance(data);
    } catch { enqueueSnackbar('Failed to load attendance', { variant: 'error' }); }
    finally { setAttLoading(false); }
  }, [startDate, endDate, attType]);

  useEffect(() => { fetchOfficeDays(); }, [fetchOfficeDays]);
  useEffect(() => { if (tab === 1) fetchAttendance(); }, [tab, fetchAttendance]);

  // Office day map: date → OfficeDay
  const odMap = useMemo(() => {
    const m = new Map<string, OfficeDay>();
    officeDays.forEach(od => m.set(od.date.slice(0, 10), od));
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
    try {
      await attendanceApi.setOfficeDay({ date: dateStr, isOfficeDay: !current });
      fetchOfficeDays();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to update', { variant: 'error' });
    }
  };

  // Attendance: group by user
  const techMap = useMemo(() => {
    const m = new Map<number, { user: TechAttendance['user']; records: Map<string, TechAttendance> }>();
    attendance.forEach(att => {
      if (!m.has(att.userId)) m.set(att.userId, { user: att.user, records: new Map() });
      m.get(att.userId)!.records.set(att.date.slice(0, 10), att);
    });
    return m;
  }, [attendance]);

  const handleSetAttendance = async (userId: number, date: string, status: AttendanceStatus) => {
    try {
      await attendanceApi.setAttendance({ userId, date, status });
      fetchAttendance();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed', { variant: 'error' });
    }
  };

  const navMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m);
    setYear(y);
  };

  const canManage = ['super_admin','focal','reviewer'].includes(user?.role ?? '');

  // Only show weekdays in the attendance grid
  const weekdays = days.filter(d => isWeekday(d));

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={0.5}>Attendance Management</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Manage office day calendar and technician attendance
      </Typography>

      {/* Month Navigation */}
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <IconButton onClick={() => navMonth(-1)}><PrevIcon /></IconButton>
        <Typography variant="h6" fontWeight={600} sx={{ minWidth: 200, textAlign: 'center' }}>
          {MONTHS[month]} {year}
        </Typography>
        <IconButton onClick={() => navMonth(1)}><NextIcon /></IconButton>
      </Stack>

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Office Days Calendar" />
          <Tab label="Technician Attendance" />
        </Tabs>

        {/* ── Office Days Calendar ── */}
        {tab === 0 && (
          <CardContent>
            {odLoading ? (
              <Box textAlign="center" py={4}><CircularProgress /></Box>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Click on a date to toggle it as an office day or non-office day. Weekdays default to office days.
                </Typography>
                <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={0.5}>
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                    <Box key={d} textAlign="center" py={0.5}><Typography variant="caption" fontWeight={700}>{d}</Typography></Box>
                  ))}
                  {/* Pad first week */}
                  {Array.from({ length: days[0].getDay() }).map((_, i) => <Box key={`pad-${i}`} />)}
                  {days.map(d => {
                    const isOffice = isOfficeDayForDate(d);
                    const isPast = d < new Date(new Date().setHours(0,0,0,0));
                    return (
                      <Box
                        key={formatDate(d)}
                        onClick={canManage && !isPast ? () => toggleOfficeDay(d) : undefined}
                        sx={{
                          textAlign: 'center', py: 1.5, borderRadius: 1,
                          bgcolor: isOffice ? 'success.light' : 'grey.200',
                          color: isOffice ? 'success.contrastText' : 'text.disabled',
                          cursor: canManage && !isPast ? 'pointer' : 'default',
                          opacity: isPast ? 0.5 : 1,
                          '&:hover': canManage && !isPast ? { opacity: 0.8 } : {},
                          border: formatDate(d) === formatDate(now) ? '2px solid' : 'none',
                          borderColor: 'primary.main',
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>{d.getDate()}</Typography>
                        <Typography variant="caption">{isOffice ? 'Office' : 'Off'}</Typography>
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
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Support Type</InputLabel>
                <Select value={attType} label="Support Type" onChange={e => setAttType(e.target.value)}>
                  <MenuItem value="it_support">IT Support</MenuItem>
                  <MenuItem value="desktop_support">Desktop Support</MenuItem>
                </Select>
              </FormControl>
              <Box display="flex" gap={1}>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <Chip key={key} size="small" icon={cfg.icon as any} label={cfg.label} color={cfg.color} variant="outlined" />
                ))}
              </Box>
            </Stack>

            {attLoading ? (
              <Box textAlign="center" py={4}><CircularProgress /></Box>
            ) : techMap.size === 0 ? (
              <Typography color="text.secondary" py={3} textAlign="center">
                No technician attendance records for this month. Set attendance below.
              </Typography>
            ) : (
              <TableContainer sx={{ maxHeight: 500 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ position: 'sticky', left: 0, zIndex: 3, bgcolor: 'background.paper', minWidth: 160 }}>Technician</TableCell>
                      {weekdays.map(d => (
                        <TableCell key={formatDate(d)} align="center" sx={{ minWidth: 36, px: 0.5 }}>
                          <Typography variant="caption">{d.getDate()}</Typography>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.from(techMap.entries()).map(([userId, { user: techUser, records }]) => (
                      <TableRow key={userId}>
                        <TableCell sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.paper' }}>
                          <Typography variant="body2" noWrap>
                            {techUser ? `${techUser.firstName ?? ''} ${techUser.lastName ?? ''}`.trim() || techUser.email : `User #${userId}`}
                          </Typography>
                        </TableCell>
                        {weekdays.map(d => {
                          const dateStr = formatDate(d);
                          const rec = records.get(dateStr);
                          const status = rec?.status;
                          const cfg = status ? STATUS_CONFIG[status] : null;

                          return (
                            <TableCell key={dateStr} align="center" sx={{ px: 0.5 }}>
                              {canManage ? (
                                <Tooltip title={`Click to cycle: ${!status ? 'Set present' : status}`}>
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      const cycle: AttendanceStatus[] = ['present', 'absent', 'half_day', 'out_of_office'];
                                      const nextIdx = status ? (cycle.indexOf(status) + 1) % cycle.length : 0;
                                      handleSetAttendance(userId, dateStr, cycle[nextIdx]);
                                    }}
                                    sx={{ color: cfg ? `${cfg.color}.main` : 'text.disabled' }}
                                  >
                                    {cfg ? cfg.icon : <Typography variant="caption">·</Typography>}
                                  </IconButton>
                                </Tooltip>
                              ) : (
                                cfg ? <Chip size="small" icon={cfg.icon as any} label="" color={cfg.color} variant="outlined" sx={{ '& .MuiChip-label': { display: 'none' } }} /> : <Typography variant="caption" color="text.disabled">·</Typography>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        )}
      </Card>
    </Box>
  );
}
