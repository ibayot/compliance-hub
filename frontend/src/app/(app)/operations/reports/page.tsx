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
  Tabs,
  Tab
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ticketsApi, TicketReportResult, RatingsReportResult } from '@/app/api/references';
import { useAuth } from '@/contexts/AuthContext';
import { useSse } from '@/lib/utils/useSse';

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
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
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
        {avg.toFixed(2)}
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
  const isTicketSettingsFocal = !!myCap?.isTicketSettingsFocal;

  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState<number>(Math.ceil((new Date().getMonth() + 1) / 3));
  const [semester, setSemester] = useState<number>(new Date().getMonth() < 6 ? 1 : 2);
  const [technicianId, setTechnicianId] = useState<number | ''>('');
  const [pieData, setPieData] = useState<any[]>([]);
  const [escalationPieData, setEscalationPieData] = useState<any[]>([]);
  const [slaPieData, setSlaPieData] = useState<any[]>([]);
  const [ticketType, setTicketType] = useState<string>('');
  const [technicians, setTechnicians] = useState<
    Array<{ id: number; firstName: string; lastName: string; role: string }>
  >([]);
  const [result, setResult] = useState<TicketReportResult | null>(null);
  const [detailedResult, setDetailedResult] = useState<RatingsReportResult | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tabs State
  const [tab, setTab] = useState(0);
  const [issuesSubTab, setIssuesSubTab] = useState(0);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [slaInsights, setSlaInsights] = useState<any[]>([]);
  const [slaLoading, setSlaLoading] = useState(false);

  const [issueCountsData, setIssueCountsData] = useState<any[]>([]);

  // Period-filtered technician dropdown
  useEffect(() => {
    if (!isTicketSettingsFocal) return;
    const filters: Parameters<typeof ticketsApi.getReportTechnicians>[0] = { year };
    if (periodMode === 'month') filters.month = month;
    else if (periodMode === 'quarter') filters.quarter = quarter;
    else if (periodMode === 'semester') filters.semester = semester;
    if (ticketType) filters.ticketType = ticketType;
    ticketsApi
      .getReportTechnicians(filters)
      .then(setTechnicians)
      .catch(() => { });
  }, [isTicketSettingsFocal, year, periodMode, month, quarter, semester, ticketType]);

  const fetchReports = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const filters: Parameters<typeof ticketsApi.getReports>[0] = { year };
      if (periodMode === 'month') filters.month = month;
      else if (periodMode === 'quarter') filters.quarter = quarter;
      else if (periodMode === 'semester') filters.semester = semester;
      // Privileged users: filter by chosen technician (optional); non-privileged: always filter to own id
      const effectiveTechId = isTicketSettingsFocal
        ? technicianId !== ''
          ? (technicianId as number)
          : undefined
        : (user?.id ?? undefined);
      if (effectiveTechId) filters.technicianId = effectiveTechId;
      if (ticketType) filters.ticketType = ticketType;
      const data = await ticketsApi.getReports(filters);
      setResult(data);
      try {
        if (isTicketSettingsFocal) {
          const issueData = await ticketsApi.getIssueCountsReport(filters);
          setIssueCountsData(issueData);
        } else {
          setIssueCountsData([]);
        }
      } catch (err) {
        console.error('Failed to fetch issue counts', err);
      }

      const pData = data.avgRatingByType.map((row) => ({
        name: TYPE_LABELS[row.type] ?? row.type,
        value: row.count,
      }));
      setPieData(pData);

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

        const escChartData = [];
        if (data.acceptedEscalations > 0)
          escChartData.push({ name: 'Accepted', value: data.acceptedEscalations });
        if (data.returnedEscalations > 0)
          escChartData.push({ name: 'Returned', value: data.returnedEscalations });
        if (
          data.totalEscalations > 0 &&
          data.totalEscalations > data.acceptedEscalations + data.returnedEscalations
        ) {
          escChartData.push({
            name: 'Pending/Other',
            value: data.totalEscalations - (data.acceptedEscalations + data.returnedEscalations),
          });
        }
        setEscalationPieData(escChartData);

        const slaData = [];
        if (data.slaStats?.met > 0) slaData.push({ name: 'Met SLA', value: data.slaStats.met });
        if (data.slaStats?.missed > 0) slaData.push({ name: 'Missed SLA', value: data.slaStats.missed });
        setSlaPieData(slaData);
      } catch (err) {
        console.error('Failed to fetch detailed ratings', err);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load report data.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [
    year,
    periodMode,
    month,
    quarter,
    semester,
    technicianId,
    ticketType,
    isTicketSettingsFocal,
    user?.id,
  ]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const fetchSlaInsights = React.useCallback(async () => {
    setSlaLoading(true);
    try {
      const filters: any = { year };
      if (periodMode === 'month') filters.month = month;
      else if (periodMode === 'quarter') filters.quarter = quarter;
      else if (periodMode === 'semester') filters.semester = semester;
      
      const data = await ticketsApi.getSlaInsights(filters);
      setSlaInsights(data);
    } catch (err) {
      console.error('Failed to fetch SLA insights', err);
    } finally {
      setSlaLoading(false);
    }
  }, [year, month, quarter, semester, periodMode]);

  useEffect(() => {
    if (tab === 2) fetchSlaInsights();
  }, [tab, fetchSlaInsights]);

  // Derived data for Issues Tab
  const uniqueCategories = React.useMemo(() => {
    if (!issueCountsData) return [];
    const cats = new Set(issueCountsData.map((i: any) => i.categoryName || 'Unknown'));
    return Array.from(cats) as string[];
  }, [issueCountsData]);

  const categoryData = React.useMemo(() => {
    if (!issueCountsData) return [];
    const catMap: Record<string, number> = {};
    issueCountsData.forEach((item: any) => {
      const cat = item.categoryName || 'Unknown';
      catMap[cat] = (catMap[cat] || 0) + Number(item.count);
    });
    const data = Object.keys(catMap).map(cat => ({ categoryName: cat, count: catMap[cat] }));
    return data.filter(d => d.count > 0);
  }, [issueCountsData]);

  const drillDownData = React.useMemo(() => {
    if (!issueCountsData || !selectedCategoryName) return [];

    // Group by issueName, then aggregate counts per status
    const issueMap: Record<string, any> = {};
    const filtered = issueCountsData.filter((item: any) => (item.categoryName || 'Unknown') === selectedCategoryName);

    filtered.forEach((item: any) => {
      if (!issueMap[item.issueName]) {
        issueMap[item.issueName] = { issueName: item.issueName, open: 0, in_progress: 0, resolved: 0, closed: 0, freeze_pause: 0 };
      }
      const status = item.status || 'open';
      const count = Number(item.count);

      if (status === 'open' || status === 'assigned') {
        issueMap[item.issueName].open += count;
      } else if (status === 'in_progress') {
        issueMap[item.issueName].in_progress += count;
      } else if (status === 'resolved') {
        issueMap[item.issueName].resolved += count;
      } else if (status === 'closed') {
        issueMap[item.issueName].closed += count;
      } else if (status === 'freeze' || status === 'pause') {
        issueMap[item.issueName].freeze_pause += count;
      } else {
        // Fallback for anything else
        issueMap[item.issueName].open += count;
      }
    });

    return Object.values(issueMap).filter(d => (d.open + d.in_progress + d.resolved + d.closed + d.freeze_pause) > 0);
  }, [issueCountsData, selectedCategoryName]);


  const allIssuesAggregated = React.useMemo(() => {
    if (!issueCountsData) return [];
    const map: Record<string, number> = {};
    issueCountsData.forEach((item: any) => {
      const name = `${item.categoryName || 'Unknown'} - ${item.issueName || 'Unknown'}`;
      map[name] = (map[name] || 0) + Number(item.count);
    });
    return Object.keys(map)
      .map(name => ({ name, count: map[name] }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [issueCountsData]);

  const catBottomMargin = React.useMemo(() => {
    if (!categoryData.length) return 60;
    const maxLen = Math.max(...categoryData.map(c => c.categoryName.length));
    return Math.max(60, maxLen * 3.5);
  }, [categoryData]);

  const issueBottomMargin = React.useMemo(() => {
    if (!drillDownData.length) return 60;
    const maxLen = Math.max(...drillDownData.map(i => i.issueName.length));
    return Math.max(60, maxLen * 3.5);
  }, [drillDownData]);

  const slaBottomMargin = React.useMemo(() => {
    if (!slaInsights || !slaInsights.length) return 80;
    const maxLen = Math.max(...slaInsights.map(i => (i.issueName || '').length));
    return Math.max(60, maxLen * 3.5);
  }, [slaInsights]);
  useSse(['TICKET_UPDATED'], () => fetchReports(true));

  const periodLabel = (() => {
    if (periodMode === 'month') return MONTHS.find((m) => m.value === month)?.label ?? '';
    if (periodMode === 'quarter') return `Q${quarter}`;
    if (periodMode === 'semester') return `S${semester}`;
    return 'Full Year';
  })();

  const barData =
    result?.avgRatingByTechnician.map((row) => ({
      name: row.techName.split(' ').pop() ?? row.techName,
      avg: parseFloat(row.avg.toFixed(2)),
      count: row.count,
    })) ?? [];

  // Ticket count per technician (grouped view — 2nd bar chart)
  const countBarData =
    result?.avgRatingByTechnician.map((row) => ({
      name: row.techName.split(' ').pop() ?? row.techName,
      tickets: row.count,
    })) ?? [];

  // Individual view = specific technician selected (privileged) OR non-privileged user viewing own data
  const isIndividualView = isTicketSettingsFocal ? !!technicianId : true;
  const hasPerformanceData =
    slaPieData.length > 0 ||
    (result?.slaByType?.length ?? 0) > 0 ||
    (result?.slaByTechnician?.length ?? 0) > 0 ||
    (result?.avgRatingByTechnician?.length ?? 0) > 0;

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
        sx={{ '@media print': { display: 'none' } }}
      >
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
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Overview & Ratings" />
          <Tab label="Issues" />
          <Tab label="SLA Insights" />
          <Tab label="Performance" />
        </Tabs>
      </Box>

      {/* ── Filters ── */}
      <Card sx={{ mb: 3, '@media print': { display: 'none' } }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Filters
          </Typography>
          <Box sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, '& > *': { flex: '1 1 120px' } }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                sx={{ minWidth: 120 }}
              >
                {YEARS.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                size="small"
                label="Period"
                value={periodMode}
                onChange={(e) => setPeriodMode(e.target.value as PeriodMode)}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="month">Monthly</MenuItem>
                <MenuItem value="quarter">Quarterly</MenuItem>
                <MenuItem value="semester">Semester</MenuItem>
                <MenuItem value="year">Full Year</MenuItem>
              </TextField>
              {periodMode === 'month' && (
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Month"
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  sx={{ minWidth: 120 }}
                >
                  {MONTHS.map((m) => (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              {periodMode === 'quarter' && (
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Quarter"
                  value={quarter}
                  onChange={(e) => setQuarter(Number(e.target.value))}
                  sx={{ minWidth: 120 }}
                >
                  {[1, 2, 3, 4].map((q) => (
                    <MenuItem key={q} value={q}>
                      Q{q}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              {periodMode === 'semester' && (
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Semester"
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value={1}>S1 (Jan–Jun)</MenuItem>
                  <MenuItem value={2}>S2 (Jul–Dec)</MenuItem>
                </TextField>
              )}
              {[0, 3].includes(tab) && (
                <>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Support Type"
                    value={ticketType}
                    onChange={(e) => setTicketType(e.target.value)}
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="">All Types</MenuItem>
                    <MenuItem value="desktop_support">Desktop Support</MenuItem>
                    <MenuItem value="it_support">IT Support</MenuItem>
                    <MenuItem value="pantawid_ict_support">Pantawid ICT Support</MenuItem>
                  </TextField>
                  {isTicketSettingsFocal && (
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Technician"
                      value={technicianId}
                      onChange={(e) =>
                        setTechnicianId(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      sx={{ minWidth: 120 }}
                    >
                      <MenuItem value="">All Technicians</MenuItem>
                      {technicians.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.firstName} {t.lastName}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {tab === 0 && (
        <Box>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={3}
            sx={{ '@media print': { display: 'none' } }}
          >
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
            <Typography variant="h5" fontWeight={700}>
              Ticket Reports — {periodLabel} {year}
            </Typography>
            {ticketType && (
              <Typography variant="body2">
                Support Type: {TYPE_LABELS[ticketType] ?? ticketType}
              </Typography>
            )}
          </Box>

          {loading && (
            <Box textAlign="center" py={4}>
              <CircularProgress />
            </Box>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ '@media print': { display: 'none' } }}>
            {!loading && viewMode === 'overview' && result && (
              <>
                {/* ── Summary Cards ── */}
                <Grid container spacing={2} mb={3}>
                  <Grid item xs={12} sm={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">
                          Total Tickets
                        </Typography>
                        <Typography variant="h4" fontWeight={700}>
                          {result.totalTickets}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {periodLabel} {year}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">
                          Tickets Rated
                        </Typography>
                        <Typography variant="h4" fontWeight={700}>
                          {result.totalWithRating}
                        </Typography>
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
                        <Typography variant="caption" color="text.secondary">
                          Average Rating
                        </Typography>
                        {result.avgOverallRating !== null ? (
                          <>
                            <Typography variant="h4" fontWeight={700}>
                              {result.avgOverallRating.toFixed(2)}
                            </Typography>
                            <Chip
                              label={
                                result.avgOverallRating >= 4.5
                                  ? 'Excellent'
                                  : result.avgOverallRating >= 3.5
                                    ? 'Good'
                                    : result.avgOverallRating >= 2.5
                                      ? 'Fair'
                                      : 'Poor'
                              }
                              color={RATING_COLOR(result.avgOverallRating)}
                              size="small"
                            />
                          </>
                        ) : (
                          <Typography variant="h6" color="text.secondary">
                            No ratings
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* ── Escalation Metrics ── */}
                {(result.totalEscalations ?? 0) > 0 && (
                  <Grid container spacing={2} mb={3}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Escalation Summary
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Card>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">
                            Total Escalations
                          </Typography>
                          <Typography variant="h4" fontWeight={700}>
                            {result.totalEscalations ?? 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Card>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">
                            Accepted
                          </Typography>
                          <Typography variant="h4" fontWeight={700} color="success.main">
                            {result.acceptedEscalations ?? 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Card>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">
                            Returned
                          </Typography>
                          <Typography variant="h4" fontWeight={700} color="error.main">
                            {result.returnedEscalations ?? 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                )}

                {/* ── SLA Metrics ── */}
                {result.slaStats && (result.slaStats.met > 0 || result.slaStats.missed > 0) && (
                  <Grid container spacing={2} mb={3}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        SLA & Resolution Time
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Card>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">
                            SLA Met
                          </Typography>
                          <Typography variant="h4" fontWeight={700} color="success.main">
                            {result.slaStats.met}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Card>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">
                            SLA Missed
                          </Typography>
                          <Typography variant="h4" fontWeight={700} color="error.main">
                            {result.slaStats.missed}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Card>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">
                            Avg Resolution Time
                          </Typography>
                          <Typography variant="h4" fontWeight={700}>
                            {result.slaStats.avgResolutionTimeHours} hrs
                          </Typography>
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
                              <Typography variant="body2" color="text.secondary">
                                No data for this period.
                              </Typography>
                            ) : (
                              <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                  <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    dataKey="value"
                                  >
                                    {pieData.map((_, i) => (
                                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                  <Legend
                                    formatter={(value, entry: any) => {
                                      const payload = entry.payload;
                                      if (!payload) return value;
                                      const total = pieData.reduce((acc, curr) => acc + curr.value, 0);
                                      const percent =
                                        total > 0 ? ((payload.value / total) * 100).toFixed(0) : 0;
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
                              <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                  <Pie
                                    data={escalationPieData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}
                                  >
                                    {escalationPieData.map((entry) => (
                                      <Cell
                                        key={entry.name}
                                        fill={ESC_PIE_COLORS[entry.name] ?? '#9C27B0'}
                                      />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
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
                              <Typography variant="body2" color="text.secondary">
                                No rated tickets in this period.
                              </Typography>
                            ) : (
                              <Stack spacing={2} mt={1}>
                                {result!.avgRatingByType.map((row) => (
                                  <Box key={row.type}>
                                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                                      <Typography variant="body2" fontWeight={500}>
                                        {TYPE_LABELS[row.type] ?? row.type}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {row.ratedCount ?? 0} rated / {row.resolvedCount ?? 0} resolved / {row.count} tickets
                                      </Typography>
                                    </Box>
                                    <RatingBar avg={row.avg} />
                                  </Box>
                                ))}
                              </Stack>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Pie 3 — SLA */}
                      {slaPieData.length > 0 && (
                        <Grid item xs={12} md={4}>
                          <Card>
                            <CardContent>
                              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                SLA Performance
                              </Typography>
                              <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                  <Pie
                                    data={slaPieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={80}
                                    dataKey="value"
                                    labelLine={false}
                                    label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                                      const RADIAN = Math.PI / 180;
                                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                      return (
                                        <text
                                          x={x}
                                          y={y}
                                          fill="white"
                                          textAnchor="middle"
                                          dominantBaseline="central"
                                          fontSize={12}
                                        >
                                          {value}
                                        </text>
                                      );
                                    }}
                                  >
                                    {slaPieData.map((entry, index) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={
                                          entry.name === 'Met SLA'
                                            ? '#2e7d32'
                                            : entry.name === 'Missed SLA'
                                              ? '#d32f2f'
                                              : '#757575'
                                        }
                                      />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                </PieChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        </Grid>
                      )}
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
                              <Typography variant="body2" color="text.secondary">
                                No data.
                              </Typography>
                            ) : (
                              <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                  <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    dataKey="value"
                                  >
                                    {pieData.map((_, i) => (
                                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                  <Legend
                                    formatter={(value, entry: any) => {
                                      const payload = entry.payload;
                                      if (!payload) return value;
                                      const total = pieData.reduce((acc, curr) => acc + curr.value, 0);
                                      const percent =
                                        total > 0 ? ((payload.value / total) * 100).toFixed(0) : 0;
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
                              <Typography variant="body2" color="text.secondary">
                                No rated tickets in this period.
                              </Typography>
                            ) : (
                              <ResponsiveContainer width="100%" height={200}>
                                <BarChart
                                  data={barData}
                                  margin={{ top: 4, right: 8, left: -20, bottom: 4 }}
                                >
                                  <XAxis dataKey="issueName" tick={{ fontSize: 11 }} />
                                  <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                                  <Tooltip formatter={(v: number) => v.toFixed(2)} />
                                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                  <Bar
                                    dataKey="avg"
                                    name="Avg Rating"
                                    fill="#2196F3"
                                    radius={[4, 4, 0, 0]}
                                  />
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
                              <Typography variant="body2" color="text.secondary">
                                No data.
                              </Typography>
                            ) : (
                              <ResponsiveContainer width="100%" height={200}>
                                <BarChart
                                  data={countBarData}
                                  margin={{ top: 4, right: 8, left: -20, bottom: 4 }}
                                >
                                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                  <Tooltip />
                                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                  <Bar
                                    dataKey="tickets"
                                    name="Total Tickets"
                                    fill="#4CAF50"
                                    radius={[4, 4, 0, 0]}
                                  />
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
                              <Typography variant="body2" color="text.secondary">
                                No rated tickets in this period.
                              </Typography>
                            ) : (
                              <Stack spacing={2} mt={1}>
                                {result!.avgRatingByType.map((row) => (
                                  <Box key={row.type}>
                                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                                      <Typography variant="body2" fontWeight={500}>
                                        {TYPE_LABELS[row.type] ?? row.type}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {row.ratedCount ?? 0} rated / {row.resolvedCount ?? 0} resolved / {row.count} tickets
                                      </Typography>
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
                                  {result!.avgRatingByTechnician.map((row) => (
                                    <TableRow key={row.techId}>
                                      <TableCell>{row.techName}</TableCell>
                                      <TableCell align="right">{row.count}</TableCell>
                                      <TableCell align="right">{row.ratedCount ?? 0}</TableCell>
                                      <TableCell>
                                        <RatingBar avg={row.avg} />
                                      </TableCell>
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
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Average Rating By Day
                      </Typography>
                      {detailedResult.byDay.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          No data.
                        </Typography>
                      ) : (
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart
                            data={detailedResult.byDay}
                            margin={{ top: 4, right: 8, left: -20, bottom: 4 }}
                          >
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar
                              dataKey="avgRating"
                              name="Avg Rating"
                              fill="#9C27B0"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Average Rating By Week
                      </Typography>
                      {detailedResult.byWeek.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          No data.
                        </Typography>
                      ) : (
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart
                            data={detailedResult.byWeek}
                            margin={{ top: 4, right: 8, left: -20, bottom: 4 }}
                          >
                            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar
                              dataKey="avgRating"
                              name="Avg Rating"
                              fill="#FF9800"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Ratings Per Ticket
                      </Typography>
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
                          {detailedResult.byTicket.map((t) => (
                            <TableRow key={t.ticketId}>
                              <TableCell sx={{ fontFamily: 'monospace' }}>{t.ticketNumber}</TableCell>
                              <TableCell
                                sx={{
                                  maxWidth: 200,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {t.subject}
                              </TableCell>
                              <TableCell>{new Date(t.submittedAt).toLocaleDateString()}</TableCell>
                              <TableCell align="right">
                                <Chip size="small" label={t.rating} color={RATING_COLOR(t.rating)} />
                              </TableCell>
                              <TableCell
                                sx={{
                                  maxWidth: 250,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {t.comment || '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                          {detailedResult.byTicket.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} align="center">
                                <Typography variant="body2" color="text.secondary" py={2}>
                                  No rated tickets found.
                                </Typography>
                              </TableCell>
                            </TableRow>
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
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Tickets
                    </Typography>
                    <Typography variant="h6">{result.totalTickets}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Tickets Rated
                    </Typography>
                    <Typography variant="h6">{result.totalWithRating}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Avg Rating
                    </Typography>
                    <Typography variant="h6">{result.avgOverallRating?.toFixed(2) ?? 'N/A'}</Typography>
                  </Grid>
                  {(result.totalEscalations ?? 0) > 0 && (
                    <>
                      <Grid item xs={4}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Total Escalations
                        </Typography>
                        <Typography variant="h6">{result.totalEscalations}</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Accepted / Returned
                        </Typography>
                        <Typography variant="h6">
                          {result.acceptedEscalations} / {result.returnedEscalations}
                        </Typography>
                      </Grid>
                    </>
                  )}
                </Grid>

                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  gutterBottom
                  sx={{ mt: 4, borderBottom: '1px solid #ccc' }}
                >
                  Tickets by Support Type
                </Typography>
                {pieData.length > 0 && (
                  <Box height={250} width="100%" sx={{ display: 'flex', justifyContent: 'center' }}>
                    <PieChart width={300} height={250}>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
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
                    {pieData.map((row) => (
                      <TableRow key={row.name}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell align="right">{row.value}</TableCell>
                        <TableCell align="right">
                          {((row.value / Math.max(result.totalTickets, 1)) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  gutterBottom
                  sx={{ mt: 4, borderBottom: '1px solid #ccc' }}
                >
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
                    {result.avgRatingByType.map((row) => (
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
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      gutterBottom
                      sx={{ mt: 4, borderBottom: '1px solid #ccc' }}
                    >
                      Technician Performance Detail
                    </Typography>
                    <Box
                      height={250}
                      width="100%"
                      mb={2}
                      sx={{ display: 'flex', justifyContent: 'center' }}
                    >
                      <BarChart
                        width={600}
                        height={250}
                        data={barData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar
                          dataKey="avg"
                          name="Avg Rating"
                          fill="#4CAF50"
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={false}
                        />
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
                        {result.avgRatingByTechnician.map((row) => (
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

                {result.slaByType && result.slaByType.length > 0 && (
                  <>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      gutterBottom
                      sx={{ mt: 4, borderBottom: '1px solid #ccc' }}
                    >
                      SLA Detail By Category
                    </Typography>
                    <Table size="small" sx={{ mb: 4 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Category</TableCell>
                          <TableCell align="right">Met SLA</TableCell>
                          <TableCell align="right">Missed SLA</TableCell>
                          <TableCell align="right">Avg Time (hrs)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {result.slaByType.map((row) => (
                          <TableRow key={row.type}>
                            <TableCell>{row.type || 'Unknown'}</TableCell>
                            <TableCell align="right">{row.met}</TableCell>
                            <TableCell align="right">{row.missed}</TableCell>
                            <TableCell align="right">{row.avgResolutionTimeHours}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}

                {result.slaByTechnician && result.slaByTechnician.length > 0 && (
                  <>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      gutterBottom
                      sx={{ mt: 4, borderBottom: '1px solid #ccc' }}
                    >
                      SLA Detail By Technician
                    </Typography>
                    <Table size="small" sx={{ mb: 4 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Technician</TableCell>
                          <TableCell align="right">Met SLA</TableCell>
                          <TableCell align="right">Missed SLA</TableCell>
                          <TableCell align="right">Avg Time (hrs)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {result.slaByTechnician.map((row) => (
                          <TableRow key={row.techId}>
                            <TableCell>{row.techName}</TableCell>
                            <TableCell align="right">{row.met}</TableCell>
                            <TableCell align="right">{row.missed}</TableCell>
                            <TableCell align="right">{row.avgResolutionTimeHours}</TableCell>
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
      )}


      {tab === 3 && result && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Performance Metrics
          </Typography>
          {!hasPerformanceData && (
            <Alert severity="info" sx={{ mb: 2 }}>
              No performance data is available for the selected period and technician.
            </Alert>
          )}
          <Grid container spacing={3}>
            {/* SLA Pie */}
            {slaPieData.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      SLA Performance
                    </Typography>
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={slaPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          dataKey="value"
                          labelLine={false}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return (
                              <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12}>
                                {value}
                              </text>
                            );
                          }}
                        >
                          {slaPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.name === "Met SLA" ? "#2e7d32" : entry.name === "Missed SLA" ? "#d32f2f" : "#757575"} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ paddingTop: "20px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* SLA by Category */}
            {result.slaByType && result.slaByType.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>SLA by Category</Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Category</TableCell>
                          <TableCell align="right">Met</TableCell>
                          <TableCell align="right">Missed</TableCell>
                          <TableCell align="right">Avg Time (hrs)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {result.slaByType.map((row) => (
                          <TableRow key={row.type}>
                            <TableCell>{TYPE_LABELS[row.type] ?? row.type}</TableCell>
                            <TableCell align="right">{row.met}</TableCell>
                            <TableCell align="right">{row.missed}</TableCell>
                            <TableCell align="right">{row.avgResolutionTimeHours}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* SLA by Technician */}
            {result.slaByTechnician && result.slaByTechnician.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>SLA by Technician</Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Technician</TableCell>
                          <TableCell align="right">Met</TableCell>
                          <TableCell align="right">Missed</TableCell>
                          <TableCell align="right">Avg Time (hrs)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {result.slaByTechnician.map((row) => (
                          <TableRow key={row.techId}>
                            <TableCell>{row.techName}</TableCell>
                            <TableCell align="right">{row.met}</TableCell>
                            <TableCell align="right">{row.missed}</TableCell>
                            <TableCell align="right">{row.avgResolutionTimeHours}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>
            )}
            
            {/* Technician Performance Detail */}
            {result.avgRatingByTechnician.length > 0 && (
              <Grid item xs={12}>
                <Card><CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Technician Performance Detail</Typography>
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
                      {result.avgRatingByTechnician.map((row) => (
                        <TableRow key={row.techId}>
                          <TableCell>{row.techName}</TableCell>
                          <TableCell align="right">{row.count}</TableCell>
                          <TableCell align="right">{row.ratedCount ?? 0}</TableCell>
                          <TableCell align="right">{row.avg.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent></Card>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* ── Tab 1: Issues ── */}
      {tab === 1 && result && issueCountsData && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={issuesSubTab} onChange={(_, v) => setIssuesSubTab(v)}>
              <Tab label="Categories & Issues" />
              <Tab label="All Issues" />
            </Tabs>
          </Box>

          {issuesSubTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Issue Categories Overview
                    </Typography>
                    {categoryData.length === 0 ? (
                      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
                        <Typography color="text.secondary">No categories to display.</Typography>
                      </Box>
                    ) : (
                      <ResponsiveContainer width="100%" height={300 + catBottomMargin}>
                        <BarChart
                          data={categoryData}
                          margin={{ top: 20, right: 30, left: 20, bottom: catBottomMargin }}
                        >
                          <XAxis
                            dataKey="categoryName"
                            interval={0}
                            angle={-45}
                            textAnchor="end"
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis allowDecimals={false} tickCount={5} />
                          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                          <Legend verticalAlign="top" />
                          <Bar
                            dataKey="count"
                            name="Tickets"
                            fill="#8884d8"
                            radius={[4, 4, 0, 0]}
                            onClick={(data) => {
                              setSelectedCategoryName(
                                selectedCategoryName === data.categoryName ? null : data.categoryName
                              );
                            }}
                            cursor="pointer"
                          >
                            {categoryData.map((entry: any, index: number) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  selectedCategoryName === entry.categoryName ? '#ffc658' : '#8884d8'
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {selectedCategoryName && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        Drill-Down: {selectedCategoryName}
                      </Typography>
                      {drillDownData.length === 0 ? (
                        <Box
                          display="flex"
                          justifyContent="center"
                          alignItems="center"
                          minHeight={300}
                          bgcolor="#f9f9f9"
                          borderRadius={2}
                        >
                          <Typography color="text.secondary">
                            No issues recorded under this category with counts &gt; 0.
                          </Typography>
                        </Box>
                      ) : (
                        <ResponsiveContainer width="100%" height={300 + issueBottomMargin}>
                          <BarChart
                            data={drillDownData}
                            margin={{ top: 20, right: 30, left: 20, bottom: issueBottomMargin }}
                          >
                            <XAxis
                              dataKey="issueName"
                              interval={0}
                              angle={-45}
                              textAnchor="end"
                              tick={{ fontSize: 11 }}
                            />
                            <YAxis allowDecimals={false} tickCount={5} />
                            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                            <Legend verticalAlign="top" />
                            <Bar dataKey="open" name="Open/Assigned" stackId="a" fill="#1976d2" />
                            <Bar dataKey="in_progress" name="In Progress" stackId="a" fill="#ed6c02" />
                            <Bar dataKey="resolved" name="Resolved" stackId="a" fill="#4caf50" />
                            <Bar dataKey="closed" name="Closed" stackId="a" fill="#757575" />
                            <Bar dataKey="freeze_pause" name="Frozen/Paused" stackId="a" fill="#9c27b0" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}

          {issuesSubTab === 1 && (
            <Box>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    All Issues
                  </Typography>
                  {allIssuesAggregated.length === 0 ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
                      <Typography color="text.secondary">No specific issues reported in this timeframe.</Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height={Math.max(400, allIssuesAggregated.length * 40)}>
                      <BarChart
                        data={allIssuesAggregated}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <XAxis type="number" allowDecimals={false} tickCount={5} tick={{ fontSize: 11 }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={250}
                          interval={0}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                        <Legend verticalAlign="top" />
                        <Bar
                          dataKey="count"
                          name="Occurrences"
                          fill="#8884d8"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      )}

      {/* ── Tab 2: SLA Insights ── */}
      {tab === 2 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            SLA Recalibration Insights
          </Typography>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="body2" color="text.secondary">
              Compare configured SLA hours against the actual average resolution time for each issue.
            </Typography>

          </Box>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              {slaLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
                  <CircularProgress size={24} />
                </Box>
              ) : slaInsights.length === 0 ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
                  <Typography color="text.secondary">No resolution data available for the selected period.</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={300 + slaBottomMargin}>
                  <BarChart
                    data={slaInsights}
                    margin={{ top: 20, right: 30, left: 20, bottom: slaBottomMargin }}
                  >
                    <XAxis
                      dataKey="issueName"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                    <Legend verticalAlign="top" />
                    <Bar dataKey="configuredSlaHours" name="Configured SLA (hrs)" fill="#8884d8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avgResolutionHours" name="Actual Avg (hrs)" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell>Issue</TableCell>
                    <TableCell align="right">Resolved Tickets</TableCell>
                    <TableCell align="right">Configured SLA</TableCell>
                    <TableCell align="right">Avg Actual Resolution</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Interpretation</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {slaLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : slaInsights.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary" py={2}>
                          No resolution data available for the selected period.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    slaInsights.map((insight: any, i: number) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Typography variant="body2">{insight.categoryName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight={600}>{insight.issueName}</Typography>
                        </TableCell>
                        <TableCell align="right">{insight.resolvedTicketsCount}</TableCell>
                        <TableCell align="right">
                          {insight.configuredSlaHours > 0
                            ? `${insight.configuredSlaHours.toFixed(1)}h`
                            : 'None'}
                        </TableCell>
                        <TableCell align="right">
                          {insight.avgResolutionHours
                            ? `${insight.avgResolutionHours.toFixed(1)}h`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {insight.configuredSlaHours > 0 ? (
                            <Chip
                              size="small"
                              label={insight.isFailingSla ? 'Failing' : 'Healthy'}
                              color={insight.isFailingSla ? 'error' : 'success'}
                            />
                          ) : (
                            <Chip size="small" label="Unmonitored" color="default" />
                          )}
                        </TableCell>
                        <TableCell>
                          {insight.configuredSlaHours > 0 ? (
                            insight.isFailingSla ? (
                              <Typography variant="caption" color="error">Consider extending SLA</Typography>
                            ) : (insight.avgResolutionHours < insight.configuredSlaHours * 0.5) ? (
                              <Typography variant="caption" color="success.main">SLA is very generous, consider tightening</Typography>
                            ) : (
                              <Typography variant="caption" color="text.secondary">SLA is balanced</Typography>
                            )
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}
