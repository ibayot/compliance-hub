'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Stack,
  LinearProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ticketsApi, TicketReportResult, RatingsReportResult } from '@/app/api/references';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoRefresh } from '@/lib/utils/useAutoRefresh';

const TYPE_LABELS: Record<string, string> = {
  desktop_support: 'Desktop Support',
  it_support: 'IT Support',
  pantawid_ict_support: 'Pantawid ICT Support',
};

const RATING_COLOR = (avg: number): 'error' | 'warning' | 'success' | 'info' => {
  if (avg >= 4.5) return 'success';
  if (avg >= 3.5) return 'info';
  if (avg >= 2.5) return 'warning';
  return 'error';
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' },   { value: 5, label: 'May' },       { value: 6, label: 'June' },
  { value: 7, label: 'July' },    { value: 8, label: 'August' },    { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

type PeriodMode = 'month' | 'quarter' | 'semester' | 'year';

function RatingBar({ avg }: { avg: number }) {
  const pct = (avg / 5) * 100;
  return (
    <Box display="flex" alignItems="center" gap={1} minWidth={0}>
      <Box flex={1} minWidth={60}>
        <LinearProgress
          variant="determinate"
          value={pct}
          color={RATING_COLOR(avg)}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>
      <Typography variant="body2" fontWeight={700} minWidth={28}>
        {avg.toFixed(1)}
      </Typography>
    </Box>
  );
}

const PIE_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];
const ESC_PIE_COLORS: Record<string, string> = {
  Accepted: '#4CAF50',
  Returned: '#F44336',
  Pending: '#FF9800',
};

export default function TicketReportsPage() {
  const { user, myCap } = useAuth();
  /** True for all staff with ticket settings admin access (DB-driven via is_ticket_settings_focal flag) */
  const isTicketSettingsFocal = user?.role === 'super_admin' || !!myCap?.isTicketSettingsFocal;

  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState<number>(Math.ceil((new Date().getMonth() + 1) / 3));
  const [semester, setSemester] = useState<number>(new Date().getMonth() < 6 ? 1 : 2);
  const [technicianId, setTechnicianId] = useState<number | ''>('');
  const [ticketType, setTicketType] = useState<string>('');
  const [technicians, setTechnicians] = useState<Array<{ id: number; firstName: string; lastName: string; role: string }>>([]);
  const [result, setResult] = useState<TicketReportResult | null>(null);
  const [detailedResult, setDetailedResult] = useState<RatingsReportResult | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Period-filtered technician dropdown
  useEffect(() => {
    if (!isTicketSettingsFocal) return;
    const filters: Parameters<typeof ticketsApi.getReportTechnicians>[0] = { year };
    if (periodMode === 'month') filters.month = month;
    else if (periodMode === 'quarter') filters.quarter = quarter;
    else if (periodMode === 'semester') filters.semester = semester;
    if (ticketType) filters.ticketType = ticketType;
    ticketsApi.getReportTechnicians(filters).then(setTechnicians).catch(() => {});
  }, [isTicketSettingsFocal, year, periodMode, month, quarter, semester, ticketType]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: Parameters<typeof ticketsApi.getReports>[0] = { year };
      if (periodMode === 'month') filters.month = month;
      else if (periodMode === 'quarter') filters.quarter = quarter;
      else if (periodMode === 'semester') filters.semester = semester;
      // Privileged users: filter by chosen technician (optional); non-privileged: always filter to own id
      const effectiveTechId = isTicketSettingsFocal
        ? (technicianId !== '' ? (technicianId as number) : undefined)
        : (user?.id ?? undefined);
      if (effectiveTechId) filters.technicianId = effectiveTechId;
      if (ticketType) filters.ticketType = ticketType;
      const data = await ticketsApi.getReports(filters);
      setResult(data);

      try {
        const dData = await ticketsApi.getRatingsReport({
          year,
          month: periodMode === 'month' ? month : undefined,
          quarter: periodMode === 'quarter' ? quarter : undefined,
          semester: periodMode === 'semester' ? semester : undefined,
          technicianId: effectiveTechId,
          ticketType: ticketType ? ticketType : undefined,
        });
        setDetailedResult(dData);
      } catch (err) {
        console.error('Failed to fetch detailed ratings', err);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  }, [year, periodMode, month, quarter, semester, technicianId, ticketType, isTicketSettingsFocal, user?.id]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);
  useAutoRefresh(fetchReports);

  const periodLabel = (() => {
    if (periodMode === 'month') return MONTHS.find(m => m.value === month)?.label ?? '';
    if (periodMode === 'quarter') return `Q${quarter}`;
    if (periodMode === 'semester') return `S${semester}`;
    return 'Full Year';
  })();

  const pieData = result?.avgRatingByType.map(row => ({
    name: TYPE_LABELS[row.type] ?? row.type,
    value: row.count,
  })) ?? [];

  const barData = result?.avgRatingByTechnician.map(row => ({
    name: row.techName.split(' ').pop() ?? row.techName,
    avg: parseFloat(row.avg.toFixed(2)),
    count: row.count,
  })) ?? [];

  // Ticket count per technician (grouped view — 2nd bar chart)
  const countBarData = result?.avgRatingByTechnician.map(row => ({
    name: row.techName.split(' ').pop() ?? row.techName,
    tickets: row.count,
  })) ?? [];

  // Escalation outcome pie (individual view — shown when escalations exist)
  const escalationPieData: { name: string; value: number }[] = [];
  if (result && result.totalEscalations > 0) {
    const pending = result.totalEscalations - result.acceptedEscalations - result.returnedEscalations;
    if (result.acceptedEscalations > 0) escalationPieData.push({ name: 'Accepted', value: result.acceptedEscalations });
    if (result.returnedEscalations > 0) escalationPieData.push({ name: 'Returned', value: result.returnedEscalations });
    if (pending > 0) escalationPieData.push({ name: 'Pending', value: pending });
  }

  // Individual view = specific technician selected (privileged) OR non-privileged user viewing own data
  const isIndividualView = isTicketSettingsFocal ? !!technicianId : true;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} sx={{ '@media print': { display: 'none' } }}>
        <Typography variant="h5" fontWeight={700}>
          Ticket Reports
        </Typography>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={() => window.print()}
          size="small"
        >
          Print
        </Button>
      </Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} sx={{ '@media print': { display: 'none' } }}>
        <Typography variant="body2" color="text.secondary">
          Satisfaction ratings overview — average overall, per support type, and per technician.
        </Typography>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, val) => val && setViewMode(val)}
          size="small"
        >
          <ToggleButton value="overview">Overview</ToggleButton>
          <ToggleButton value="detailed">Detailed Ratings</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* ── Print header (only visible in print) ── */}
      <Box sx={{ display: 'none', '@media print': { display: 'block', mb: 2 } }}>
        <Typography variant="h5" fontWeight={700}>Ticket Reports — {periodLabel} {year}</Typography>
        {ticketType && <Typography variant="body2">Support Type: {TYPE_LABELS[ticketType] ?? ticketType}</Typography>}
      </Box>

      {/* ── Filters ── */}
      <Card sx={{ mb: 3, '@media print': { display: 'none' } }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>Filters</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4} md={2}>
              <TextField
                select fullWidth size="small" label="Year"
                value={year} onChange={(e) => setYear(Number(e.target.value))}
              >
                {YEARS.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <TextField
                select fullWidth size="small" label="Period"
                value={periodMode} onChange={(e) => setPeriodMode(e.target.value as PeriodMode)}
              >
                <MenuItem value="month">Monthly</MenuItem>
                <MenuItem value="quarter">Quarterly</MenuItem>
                <MenuItem value="semester">Semester</MenuItem>
                <MenuItem value="year">Full Year</MenuItem>
              </TextField>
            </Grid>
            {periodMode === 'month' && (
              <Grid item xs={12} sm={4} md={2}>
                <TextField
                  select fullWidth size="small" label="Month"
                  value={month} onChange={(e) => setMonth(Number(e.target.value))}
                >
                  {MONTHS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                </TextField>
              </Grid>
            )}
            {periodMode === 'quarter' && (
              <Grid item xs={12} sm={4} md={2}>
                <TextField
                  select fullWidth size="small" label="Quarter"
                  value={quarter} onChange={(e) => setQuarter(Number(e.target.value))}
                >
                  {[1, 2, 3, 4].map(q => <MenuItem key={q} value={q}>Q{q}</MenuItem>)}
                </TextField>
              </Grid>
            )}
            {periodMode === 'semester' && (
              <Grid item xs={12} sm={4} md={2}>
                <TextField
                  select fullWidth size="small" label="Semester"
                  value={semester} onChange={(e) => setSemester(Number(e.target.value))}
                >
                  <MenuItem value={1}>S1 (Jan–Jun)</MenuItem>
                  <MenuItem value={2}>S2 (Jul–Dec)</MenuItem>
                </TextField>
              </Grid>
            )}
            <Grid item xs={12} sm={4} md={2}>
              <TextField
                select fullWidth size="small" label="Support Type"
                value={ticketType} onChange={(e) => setTicketType(e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="desktop_support">Desktop Support</MenuItem>
                <MenuItem value="it_support">IT Support</MenuItem>
                <MenuItem value="pantawid_ict_support">Pantawid ICT Support</MenuItem>
              </TextField>
            </Grid>
            {isTicketSettingsFocal && (
              <Grid item xs={12} sm={4} md={2}>
                <TextField
                  select fullWidth size="small" label="Technician"
                  value={technicianId} onChange={(e) => setTechnicianId(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <MenuItem value="">All Technicians</MenuItem>
                  {technicians.map(t => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {loading && <Box textAlign="center" py={4}><CircularProgress /></Box>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ '@media print': { display: 'none' } }}>
        {!loading && viewMode === 'overview' && result && (
        <>
          {/* ── Summary Cards ── */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Total Tickets</Typography>
                  <Typography variant="h4" fontWeight={700}>{result.totalTickets}</Typography>
                  <Typography variant="body2" color="text.secondary">{periodLabel} {year}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Tickets Rated</Typography>
                  <Typography variant="h4" fontWeight={700}>{result.totalWithRating}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {result.totalTickets > 0
                      ? `${Math.round((result.totalWithRating / result.totalTickets) * 100)}% fill rate`
                      : 'No data'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Average Rating</Typography>
                  {result.avgOverallRating !== null ? (
                    <>
                      <Typography variant="h4" fontWeight={700}>{result.avgOverallRating.toFixed(1)}</Typography>
                      <Chip
                        label={result.avgOverallRating >= 4.5 ? 'Excellent' : result.avgOverallRating >= 3.5 ? 'Good' : result.avgOverallRating >= 2.5 ? 'Fair' : 'Poor'}
                        color={RATING_COLOR(result.avgOverallRating)}
                        size="small"
                      />
                    </>
                  ) : (
                    <Typography variant="h6" color="text.secondary">No ratings</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* ── Escalation Metrics ── */}
          {(result.totalEscalations ?? 0) > 0 && (
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Escalation Summary</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Total Escalations</Typography>
                    <Typography variant="h4" fontWeight={700}>{result.totalEscalations ?? 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Accepted</Typography>
                    <Typography variant="h4" fontWeight={700} color="success.main">{result.acceptedEscalations ?? 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Returned</Typography>
                    <Typography variant="h4" fontWeight={700} color="error.main">{result.returnedEscalations ?? 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          <Grid container spacing={3}>
            {/* ═══════════════════════════════════════════════════════════
                INDIVIDUAL VIEW — specific technician selected (or non-focal user's own data)
                Shows pie charts for each parameter
                ═════════════════════════════════════════════════════════ */}
            {isIndividualView && (
              <>
                {/* Pie 1 — Ticket distribution by support type */}
                <Grid item xs={12} md={escalationPieData.length > 0 ? 6 : 8}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Tickets by Support Type
                      </Typography>
                      {pieData.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No data for this period.</Typography>
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={pieData} cx="50%" cy="50%" outerRadius={80}
                              dataKey="value"
                            >
                              {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend 
                              formatter={(value, entry: any) => {
                                const payload = entry.payload;
                                if (!payload) return value;
                                const total = pieData.reduce((acc, curr) => acc + curr.value, 0);
                                const percent = total > 0 ? ((payload.value / total) * 100).toFixed(0) : 0;
                                return `${value} (${percent}%)`;
                              }} 
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Pie 2 — Escalation outcome (only if escalations exist) */}
                {escalationPieData.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                          Escalation Outcome
                        </Typography>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={escalationPieData} cx="50%" cy="50%" outerRadius={80}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              {escalationPieData.map((entry) => (
                                <Cell key={entry.name} fill={ESC_PIE_COLORS[entry.name] ?? '#9C27B0'} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Avg Rating by Support Type (table + rating bars) */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Average Rating by Support Type
                      </Typography>
                      {result!.avgRatingByType.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No rated tickets in this period.</Typography>
                      ) : (
                        <Stack spacing={2} mt={1}>
                          {result!.avgRatingByType.map(row => (
                            <Box key={row.type}>
                              <Box display="flex" justifyContent="space-between" mb={0.5}>
                                <Typography variant="body2" fontWeight={500}>{TYPE_LABELS[row.type] ?? row.type}</Typography>
                                <Typography variant="caption" color="text.secondary">{row.count} rated</Typography>
                              </Box>
                              <RatingBar avg={row.avg} />
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </>
            )}

            {/* ═══════════════════════════════════════════════════════════
                GROUPED VIEW — all technicians, privileged user, no tech filter
                Shows bar charts for each parameter
                ═════════════════════════════════════════════════════════ */}
            {!isIndividualView && (
              <>
                {/* Type distribution pie — always useful context */}
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Tickets by Support Type
                      </Typography>
                      {pieData.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No data.</Typography>
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={pieData} cx="50%" cy="50%" outerRadius={80}
                              dataKey="value"
                            >
                              {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend 
                              formatter={(value, entry: any) => {
                                const payload = entry.payload;
                                if (!payload) return value;
                                const total = pieData.reduce((acc, curr) => acc + curr.value, 0);
                                const percent = total > 0 ? ((payload.value / total) * 100).toFixed(0) : 0;
                                return `${value} (${percent}%)`;
                              }} 
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Bar 1 — Avg rating per technician */}
                <Grid item xs={12} md={8}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Average Rating by Technician
                      </Typography>
                      {barData.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No rated tickets in this period.</Typography>
                      ) : (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v: number) => v.toFixed(2)} />
                            <Legend />
                            <Bar dataKey="avg" name="Avg Rating" fill="#2196F3" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Bar 2 — Ticket count per technician */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Ticket Volume by Technician
                      </Typography>
                      {countBarData.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No data.</Typography>
                      ) : (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={countBarData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="tickets" name="Total Tickets" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Avg Rating by Type — table */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Average Rating by Support Type
                      </Typography>
                      {result!.avgRatingByType.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No rated tickets in this period.</Typography>
                      ) : (
                        <Stack spacing={2} mt={1}>
                          {result!.avgRatingByType.map(row => (
                            <Box key={row.type}>
                              <Box display="flex" justifyContent="space-between" mb={0.5}>
                                <Typography variant="body2" fontWeight={500}>{TYPE_LABELS[row.type] ?? row.type}</Typography>
                                <Typography variant="caption" color="text.secondary">{row.ratedCount ?? 0} rated / {row.count} resolved</Typography>
                              </Box>
                              <RatingBar avg={row.avg} />
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Technician detail table (grouped view reference) */}
                {result!.avgRatingByTechnician.length > 0 && (
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                          Technician Detail
                        </Typography>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Technician</TableCell>
                              <TableCell align="right">Resolved Tickets</TableCell>
                              <TableCell align="right">Rated Tickets</TableCell>
                              <TableCell>Avg Rating</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {result!.avgRatingByTechnician.map(row => (
                              <TableRow key={row.techId}>
                                <TableCell>{row.techName}</TableCell>
                                <TableCell align="right">{row.count}</TableCell>
                                <TableCell align="right">{row.ratedCount ?? 0}</TableCell>
                                <TableCell><RatingBar avg={row.avg} /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </>
            )}
          </Grid>
        </>
      )}

      {!loading && viewMode === 'detailed' && detailedResult && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Average Rating By Day</Typography>
                {detailedResult.byDay.length === 0 ? <Typography variant="body2" color="text.secondary">No data.</Typography> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={detailedResult.byDay} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="avgRating" name="Avg Rating" fill="#9C27B0" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Average Rating By Week</Typography>
                {detailedResult.byWeek.length === 0 ? <Typography variant="body2" color="text.secondary">No data.</Typography> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={detailedResult.byWeek} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="avgRating" name="Avg Rating" fill="#FF9800" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Ratings Per Ticket</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ticket</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell>Submitted At</TableCell>
                      <TableCell align="right">Rating</TableCell>
                      <TableCell>Comment</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailedResult.byTicket.map(t => (
                      <TableRow key={t.ticketId}>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{t.ticketNumber}</TableCell>
                        <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</TableCell>
                        <TableCell>{new Date(t.submittedAt).toLocaleDateString()}</TableCell>
                        <TableCell align="right"><Chip size="small" label={t.rating} color={RATING_COLOR(t.rating)} /></TableCell>
                        <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.comment || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {detailedResult.byTicket.length === 0 && (
                      <TableRow><TableCell colSpan={5} align="center"><Typography variant="body2" color="text.secondary" py={2}>No rated tickets found.</Typography></TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      </Box>

      {/* ── PRINT-ONLY LAYOUT ── */}
      <Box sx={{ display: 'none', '@media print': { display: 'block' } }}>
        {!loading && result && (
          <Box>
            <Grid container spacing={2} mb={3}>
              <Grid item xs={4}>
                <Typography variant="subtitle2" color="text.secondary">Total Tickets</Typography>
                <Typography variant="h6">{result.totalTickets}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle2" color="text.secondary">Tickets Rated</Typography>
                <Typography variant="h6">{result.totalWithRating}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle2" color="text.secondary">Avg Rating</Typography>
                <Typography variant="h6">{result.avgOverallRating?.toFixed(1) ?? 'N/A'}</Typography>
              </Grid>
              {(result.totalEscalations ?? 0) > 0 && (
                <>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2" color="text.secondary">Total Escalations</Typography>
                    <Typography variant="h6">{result.totalEscalations}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2" color="text.secondary">Accepted / Returned</Typography>
                    <Typography variant="h6">{result.acceptedEscalations} / {result.returnedEscalations}</Typography>
                  </Grid>
                </>
              )}
            </Grid>

            <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ mt: 4, borderBottom: '1px solid #ccc' }}>
              Tickets by Support Type
            </Typography>
            {pieData.length > 0 && (
              <Box height={250} width="100%" sx={{ display: 'flex', justifyContent: 'center' }}>
                <PieChart width={300} height={250}>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" isAnimationActive={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </Box>
            )}
            <Table size="small" sx={{ mb: 4 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Support Type</TableCell>
                  <TableCell align="right">Count</TableCell>
                  <TableCell align="right">% of Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pieData.map(row => (
                  <TableRow key={row.name}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="right">{row.value}</TableCell>
                    <TableCell align="right">{((row.value / Math.max(result.totalTickets, 1)) * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ mt: 4, borderBottom: '1px solid #ccc' }}>
              Average Rating by Support Type
            </Typography>
            <Table size="small" sx={{ mb: 4 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Support Type</TableCell>
                  <TableCell align="right">Rated Tickets</TableCell>
                  <TableCell align="right">Average Rating</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.avgRatingByType.map(row => (
                  <TableRow key={row.type}>
                    <TableCell>{TYPE_LABELS[row.type] ?? row.type}</TableCell>
                    <TableCell align="right">{row.ratedCount ?? 0}</TableCell>
                    <TableCell align="right">{row.avg.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {!isIndividualView && result.avgRatingByTechnician.length > 0 && (
              <>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ mt: 4, borderBottom: '1px solid #ccc' }}>
                  Technician Performance Detail
                </Typography>
                <Box height={250} width="100%" mb={2} sx={{ display: 'flex', justifyContent: 'center' }}>
                  <BarChart width={600} height={250} data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="avg" name="Avg Rating" fill="#4CAF50" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </Box>
                <Table size="small" sx={{ mb: 4 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Technician</TableCell>
                      <TableCell align="right">Resolved Tickets</TableCell>
                      <TableCell align="right">Rated Tickets</TableCell>
                      <TableCell align="right">Average Rating</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.avgRatingByTechnician.map(row => (
                      <TableRow key={row.techId}>
                        <TableCell>{row.techName}</TableCell>
                        <TableCell align="right">{row.count}</TableCell>
                        <TableCell align="right">{row.ratedCount ?? 0}</TableCell>
                        <TableCell align="right">{row.avg.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
