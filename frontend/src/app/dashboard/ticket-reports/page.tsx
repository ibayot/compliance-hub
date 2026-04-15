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
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ticketsApi, TicketReportResult } from '@/app/api/references';
import { useAuth } from '@/contexts/AuthContext';

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

const PRIVILEGED_ROLES = [
  'super_admin', 'section_head', 'reviewer', 'compliance_officer',
  'cybersec', 'infosec', 'desktop_sr', 'it_support_sr', 'pantawid_ict',
];

export default function TicketReportsPage() {
  const { user } = useAuth();
  const isPrivileged = PRIVILEGED_ROLES.includes(user?.role ?? '');

  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState<number>(Math.ceil((new Date().getMonth() + 1) / 3));
  const [semester, setSemester] = useState<number>(new Date().getMonth() < 6 ? 1 : 2);
  const [technicianId, setTechnicianId] = useState<number | ''>('');
  const [ticketType, setTicketType] = useState<string>('');
  const [technicians, setTechnicians] = useState<Array<{ id: number; firstName: string; lastName: string; role: string }>>([]);
  const [result, setResult] = useState<TicketReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Period-filtered technician dropdown
  useEffect(() => {
    if (!isPrivileged) return;
    const filters: Parameters<typeof ticketsApi.getReportTechnicians>[0] = { year };
    if (periodMode === 'month') filters.month = month;
    else if (periodMode === 'quarter') filters.quarter = quarter;
    else if (periodMode === 'semester') filters.semester = semester;
    if (ticketType) filters.ticketType = ticketType;
    ticketsApi.getReportTechnicians(filters).then(setTechnicians).catch(() => {});
  }, [isPrivileged, year, periodMode, month, quarter, semester, ticketType]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: Parameters<typeof ticketsApi.getReports>[0] = { year };
      if (periodMode === 'month') filters.month = month;
      else if (periodMode === 'quarter') filters.quarter = quarter;
      else if (periodMode === 'semester') filters.semester = semester;
      if (isPrivileged && technicianId) filters.technicianId = technicianId as number;
      if (ticketType) filters.ticketType = ticketType;
      const data = await ticketsApi.getReports(filters);
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  }, [year, periodMode, month, quarter, semester, technicianId, ticketType, isPrivileged]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

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
      <Typography variant="body2" color="text.secondary" mb={3} sx={{ '@media print': { display: 'none' } }}>
        Satisfaction ratings overview — average overall, per support type, and per technician.
      </Typography>

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
            {isPrivileged && (
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

      {!loading && result && (
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
            {/* ── Per Support Type ── */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Average Rating by Support Type</Typography>
                  {result.avgRatingByType.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No rated tickets in this period.</Typography>
                  ) : (
                    <>
                      <Stack spacing={2} mt={1} mb={2}>
                        {result.avgRatingByType.map(row => (
                          <Box key={row.type}>
                            <Box display="flex" justifyContent="space-between" mb={0.5}>
                              <Typography variant="body2" fontWeight={500}>{TYPE_LABELS[row.type] ?? row.type}</Typography>
                              <Typography variant="caption" color="text.secondary">{row.count} rated</Typography>
                            </Box>
                            <RatingBar avg={row.avg} />
                          </Box>
                        ))}
                      </Stack>
                      {/* Pie chart — ticket count distribution */}
                      {pieData.length > 0 && (
                        <Box mt={1}>
                          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                            Ticket distribution by type
                          </Typography>
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}>
                                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </Box>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* ── Per Technician ── */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Average Rating by Technician</Typography>
                  {result.avgRatingByTechnician.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No rated tickets in this period.</Typography>
                  ) : (
                    <>
                      <Table size="small" sx={{ mb: 2 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell>Technician</TableCell>
                            <TableCell align="right">Rated</TableCell>
                            <TableCell>Rating</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {result.avgRatingByTechnician.map(row => (
                            <TableRow key={row.techId}>
                              <TableCell>{row.techName}</TableCell>
                              <TableCell align="right">{row.count}</TableCell>
                              <TableCell>
                                <RatingBar avg={row.avg} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {/* Bar chart */}
                      {barData.length > 0 && (
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v: number) => v.toFixed(2)} />
                            <Bar dataKey="avg" name="Avg Rating" fill="#2196F3" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
