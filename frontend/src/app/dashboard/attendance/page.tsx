'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, MenuItem,
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
import { useAutoRefresh } from '@/lib/utils/useAutoRefresh';

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
  const { user } = useAuth();
  const isLowerLevelTech = [
    'technician_it_staff', 'technician_desktop_staff',
    'it_support_jr', 'desktop_jr',
  ].includes(user?.role ?? '');
  /** All RICTMS staff (everyone except super_admin and regular users) sees their own attendance in the calendar */
  const isRICTMSStaff = !['super_admin', 'user'].includes(user?.role ?? '');
  const { enqueueSnackbar } = useSnackbar();

  const [tab, setTab] = useState(0);
  const now = new Date();
  const todayStr = formatDate(now);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  // Office days
  const [officeDays, setOfficeDays] = useState<OfficeDay[]>([]);
  const [odLoading, setOdLoading] = useState(false);

  // Attendance — default to '' (all technicians)
  const [attendance, setAttendance] = useState<TechAttendance[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attType, setAttType] = useState('');

  // Technicians list (all technicians, regardless of attendance records)
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [techLoading, setTechLoading] = useState(false);

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
      const data = await attendanceApi.getAttendance(startDate, endDate, attType || undefined);
      setAttendance(data);
    } catch { enqueueSnackbar('Failed to load attendance', { variant: 'error' }); }
    finally { setAttLoading(false); }
  }, [startDate, endDate, attType]);

  const fetchTechnicians = useCallback(async () => {
    try {
      setTechLoading(true);
      const data = await attendanceApi.getTechnicians(attType || undefined);
      setTechnicians(data);
    } catch { enqueueSnackbar('Failed to load technicians', { variant: 'error' }); }
    finally { setTechLoading(false); }
  }, [attType]);

  useEffect(() => { fetchOfficeDays(); }, [fetchOfficeDays]);
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
      const data = await attendanceApi.getOfficeDays(String(month + 1), String(year));
      setOfficeDays(data);
    } catch { /* silent — do not show error on background poll */ }
  }, [year, month]);

  const silentRefreshTab1 = useCallback(async () => {
    if (tab !== 1) return;
    try {
      const [techs, att] = await Promise.all([
        attendanceApi.getTechnicians(attType || undefined),
        attendanceApi.getAttendance(startDate, endDate, attType || undefined),
      ]);
      setTechnicians(techs);
      setAttendance(att);
    } catch { /* silent */ }
  }, [tab, attType, startDate, endDate]);

  useAutoRefresh(silentRefreshOfficeDays);
  useAutoRefresh(silentRefreshTab1);

  // Live refresh for attendance data in Tab 0 — so presence indicators update in real time
  // when a manager tags a staff member as present without requiring a page reload.
  const silentRefreshTab0Attendance = useCallback(async () => {
    if (tab !== 0 || !isRICTMSStaff) return;
    try {
      const data = await attendanceApi.getAttendance(startDate, endDate, attType || undefined);
      setAttendance(data);
    } catch { /* silent */ }
  }, [tab, isRICTMSStaff, startDate, endDate, attType]);
  useAutoRefresh(silentRefreshTab0Attendance);

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
      fetchAttendance();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to update', { variant: 'error' });
    }
  };

  // Attendance records map: userId → (date → TechAttendance)
  const attRecordsMap = useMemo(() => {
    const m = new Map<number, Map<string, TechAttendance>>();
    attendance.forEach(att => {
      if (!m.has(att.userId)) m.set(att.userId, new Map());
      m.get(att.userId)!.set(att.date.slice(0, 10), att);
    });
    return m;
  }, [attendance]);

  const handleSetAttendance = async (userId: number, date: string, status: AttendanceStatus) => {
    // Optimistic update — immediately reflect in UI without showing loading spinner
    setAttendance(prev => {
      const idx = prev.findIndex(r => r.userId === userId && r.date.slice(0, 10) === date);
      if (idx !== -1) {
        const arr = [...prev];
        arr[idx] = { ...arr[idx], status };
        return arr;
      }
      // No record yet: create a temporary placeholder
      return [...prev, { id: `temp-${userId}-${date}`, userId, date, status, createdAt: '' } as TechAttendance];
    });
    try {
      const updated = await attendanceApi.setAttendance({ userId, date, status });
      // Replace temp record with actual server response
      setAttendance(prev => {
        const idx = prev.findIndex(r => r.userId === userId && r.date.slice(0, 10) === date);
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
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m);
    setYear(y);
  };

  const canManageAttendance = [
    'super_admin', 'focal', 'reviewer', 'section_head',
    'it_support_sr', 'desktop_sr', 'pantawid_ict',
    'technician', 'technician_it_support', 'technician_desktop',
    // ITO focal-equivalent roles
    'lead_infra', 'server_admin', 'db_admin', 'network_admin',
    'project_mgr', 'dev_lead', 'sqa_lead', 'records_officer', 'hr_id_officer',
    'compliance_officer', 'cybersec', 'infosec',
  ].includes(user?.role ?? '');

  const canManageOfficeDays = [
    'super_admin', 'focal', 'reviewer', 'section_head',
    'lead_infra', 'server_admin', 'db_admin', 'network_admin',
    'project_mgr', 'dev_lead', 'sqa_lead', 'records_officer', 'hr_id_officer',
    'compliance_officer', 'cybersec', 'infosec',
    'it_support_sr', 'desktop_sr', 'pantawid_ict',
  ].includes(user?.role ?? '');

  const canManage = canManageAttendance;

  // Only show weekdays in the attendance grid
  const weekdays = days.filter(d => isWeekday(d));

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={0.5}>Attendance Management</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Manage the office day calendar and track technician attendance by support type
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
        {!isLowerLevelTech && (
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Office Days" />
          <Tab label="Attendance" />
        </Tabs>
        )}

        {/* ── Office Days Calendar ── */}
        {tab === 0 && (
          <CardContent>
            {odLoading ? (
              <Box textAlign="center" py={4}><CircularProgress /></Box>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Click on a date to toggle it as an office day. Past dates cannot be changed. Weekdays default to office days.
                </Typography>
                <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={0.5}>
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                    <Box key={d} textAlign="center" py={0.5}><Typography variant="caption" fontWeight={700}>{d}</Typography></Box>
                  ))}
                  {/* Pad first week */}
                  {Array.from({ length: days[0].getDay() }).map((_, i) => <Box key={`pad-${i}`} />)}
                  {days.map(d => {
                    const isOffice = isOfficeDayForDate(d);
                    const dStr = formatDate(d);
                    // Today and past are not clickable (today is already treated as office day)
                    const isPastOrToday = dStr < todayStr;
                    const isToday = dStr === todayStr;
                    return (
                        <Box
                        key={dStr}
                        onClick={canManageOfficeDays && !isPastOrToday ? () => toggleOfficeDay(d) : undefined}
                        sx={{
                          textAlign: 'center', py: 1.5, borderRadius: 1,
                          bgcolor: isOffice ? 'success.light' : 'grey.200',
                          color: isOffice ? 'success.contrastText' : 'text.disabled',
                          cursor: canManageOfficeDays && !isPastOrToday ? 'pointer' : 'default',
                          opacity: isPastOrToday ? 0.55 : 1,
                          '&:hover': canManageOfficeDays && !isPastOrToday ? { opacity: 0.8 } : {},
                          border: isToday ? '2px solid' : 'none',
                          borderColor: 'primary.main',
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>{d.getDate()}</Typography>
                        <Typography variant="caption">{isOffice ? 'Office' : 'Off'}</Typography>
                        {isRICTMSStaff && isOffice && (() => {
                          const myStatus = attRecordsMap.get(user?.id ?? 0)?.get(dStr)?.status ?? null;
                          const myCfg = myStatus ? STATUS_CONFIG[myStatus] : null;
                          return (
                            <Box mt={0.5}>
                              {myCfg
                                ? <Chip size="small" icon={myCfg.icon as any} label={myCfg.label} color={myCfg.color} sx={{ transform: 'scale(0.75)', transformOrigin: 'center' }} />
                                : <Typography variant="caption" color="inherit">—</Typography>
                              }
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
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Support Type</InputLabel>
                <Select value={attType} label="Support Type" onChange={e => setAttType(e.target.value)}>
                  <MenuItem value="">All Technicians</MenuItem>
                  <MenuItem value="ito">ITOs</MenuItem>
                  <MenuItem value="it_support">IT Support</MenuItem>
                  <MenuItem value="desktop_support">Desktop Support</MenuItem>
                  <MenuItem value="pantawid_ict_support">Pantawid ICT Support</MenuItem>
                </Select>
              </FormControl>
              <Box display="flex" gap={1} flexWrap="wrap">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <Chip key={key} size="small" icon={cfg.icon as any} label={cfg.label} color={cfg.color} variant="outlined" />
                ))}
              </Box>
            </Stack>

            {(attLoading || techLoading) ? (
              <Box textAlign="center" py={4}><CircularProgress /></Box>
            ) : technicians.length === 0 ? (
              <Typography color="text.secondary" py={3} textAlign="center">
                No technicians found for this support type.
              </Typography>
            ) : (
              <TableContainer sx={{ maxHeight: 500 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ position: 'sticky', left: 0, zIndex: 3, bgcolor: 'background.paper', minWidth: 160 }}>Technician</TableCell>
                      {weekdays.map(d => {
                        const isOffice = isOfficeDayForDate(d);
                        return (
                          <TableCell key={formatDate(d)} align="center" sx={{ minWidth: 36, px: 0.5, ...(isOffice ? {} : { bgcolor: 'action.disabledBackground' }) }}>
                            <Typography variant="caption" color={isOffice ? 'text.primary' : 'text.disabled'}>{d.getDate()}</Typography>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {technicians.map((tech: any) => {
                      const userId = tech.id;
                      const records = attRecordsMap.get(userId) ?? new Map<string, TechAttendance>();
                      return (
                        <TableRow key={userId}>
                          <TableCell sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.paper' }}>
                            <Typography variant="body2" noWrap>
                              {[tech.firstName, tech.lastName].filter(Boolean).join(' ') || tech.email}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {(tech.role ?? '').replace(/_/g, ' ')}
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
                                      sx={{
                                        color: cfg ? `${cfg.color}.main` : 'action.active',
                                        '&:hover': { bgcolor: cfg ? `${cfg.color}.light` : 'action.hover', opacity: 0.85 },
                                      }}
                                    >
                                      {cfg ? cfg.icon : <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1, color: 'text.secondary' }}>•</Typography>}
                                    </IconButton>
                                  </Tooltip>
                                ) : (
                                  cfg
                                    ? <Chip size="small" icon={cfg.icon as any} label={cfg.label} color={cfg.color} sx={{ transform: 'scale(0.85)', transformOrigin: 'center' }} />
                                    : <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1, color: 'text.secondary' }}>•</Typography>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
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
