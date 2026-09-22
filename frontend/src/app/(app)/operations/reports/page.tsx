'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Autocomplete,
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
  Table as MuiTable,
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
import { formatPersonName } from '@/lib/utils/person-name';
import { useSse } from '@/lib/utils/useSse';
import ResponsiveTable from '@/components/layout/ResponsiveTable';

const Table = ({ children, ...props }: any) => (
  <ResponsiveTable minWidth={680}>
    <MuiTable {...props}>{children}</MuiTable>
  </ResponsiveTable>
);

const TYPE_LABELS: Record<string, string> = {
  desktop_support: 'Desktop Support',
  it_support: 'IT Support',
  pantawid_ict_support: 'Pantawid ICT Support',
  specialized_concerns: 'Specialized Concerns',
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

type ReportVisualSpec = {
  id: string;
  title: string;
  kind: 'chart' | 'table';
  values: Array<{ label: string; value: number }>;
  headers: string[];
  rows?: string[][];
};

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
  const canManageReports = !!myCap?.isTicketReportsManage;

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
    Array<{ id: number; firstName: string; middleName?: string; lastName: string; suffix?: string; role: string }>
  >([]);
  const [result, setResult] = useState<TicketReportResult | null>(null);
  const [detailedResult, setDetailedResult] = useState<RatingsReportResult | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reportRequestRef = React.useRef(0);
  const visibleReportRequestInFlight = React.useRef(false);

  // Tabs State
  const [tab, setTab] = useState(0);
  const [issuesSubTab, setIssuesSubTab] = useState(0);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [slaInsights, setSlaInsights] = useState<any[]>([]);
  const [slaLoading, setSlaLoading] = useState(false);

  const [issueCountsData, setIssueCountsData] = useState<any[]>([]);
  const [explanationsLoading, setExplanationsLoading] = useState(false);
  const [printError, setPrintError] = useState('');

  useEffect(() => {
    if (!canManageReports && (tab === 1 || tab === 2)) setTab(0);
  }, [canManageReports, tab]);

  // Period-filtered technician dropdown
  useEffect(() => {
    if (!canManageReports) return;
    const filters: Parameters<typeof ticketsApi.getReportTechnicians>[0] = { year };
    if (periodMode === 'month') filters.month = month;
    else if (periodMode === 'quarter') filters.quarter = quarter;
    else if (periodMode === 'semester') filters.semester = semester;
    if (ticketType) filters.ticketType = ticketType;
    ticketsApi
      .getReportTechnicians(filters)
      .then(setTechnicians)
      .catch(() => { });
  }, [canManageReports, year, periodMode, month, quarter, semester, ticketType]);

  const fetchReports = useCallback(async (silent = false) => {
    if (silent && visibleReportRequestInFlight.current) return;
    const requestId = ++reportRequestRef.current;
    if (!silent) {
      visibleReportRequestInFlight.current = true;
      setLoading(true);
      setError(null);
    }
    try {
      const filters: Parameters<typeof ticketsApi.getReports>[0] = { year };
      if (periodMode === 'month') filters.month = month;
      else if (periodMode === 'quarter') filters.quarter = quarter;
      else if (periodMode === 'semester') filters.semester = semester;
      // Privileged users: filter by chosen technician (optional); non-privileged: always filter to own id
      const useStaffAndTypeFilters = tab === 0 || tab === 3;
      const effectiveTechId = canManageReports
        ? useStaffAndTypeFilters && technicianId !== ''
          ? (technicianId as number)
          : undefined
        : (user?.id ?? undefined);
      if (effectiveTechId) filters.technicianId = effectiveTechId;
      if (useStaffAndTypeFilters && ticketType) filters.ticketType = ticketType;
      const data = await ticketsApi.getReports(filters);
      if (requestId !== reportRequestRef.current) return;
      setResult(data);
      try {
        if (canManageReports) {
          const { technicianId: _unusedTechnicianId, ticketType: _unusedTicketType, ...issueFilters } = filters;
          const issueData = await ticketsApi.getIssueCountsReport(issueFilters);
          if (requestId !== reportRequestRef.current) return;
          setIssueCountsData(issueData);
        } else {
          setIssueCountsData([]);
        }
      } catch (err) {
        console.error('Failed to fetch issue counts', err);
        if (requestId === reportRequestRef.current) {
          setIssueCountsData([]);
          if (tab === 1) setError('Failed to load issue counts. Please refresh or adjust the period.');
        }
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
          ticketType: useStaffAndTypeFilters && ticketType ? ticketType : undefined,
        });
        if (requestId !== reportRequestRef.current) return;
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
      if (requestId === reportRequestRef.current) {
        setResult(null);
        setIssueCountsData([]);
        setError(err?.response?.data?.message || 'Failed to load report data.');
      }
    } finally {
      if (!silent && requestId === reportRequestRef.current) {
        visibleReportRequestInFlight.current = false;
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
    tab,
    canManageReports,
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
    if (canManageReports && tab === 2) fetchSlaInsights();
  }, [canManageReports, tab, fetchSlaInsights]);

  // Derived data for Issues Tab
  const uniqueCategories = React.useMemo(() => {
    if (!issueCountsData) return [];
    const cats = new Set(issueCountsData.map((i: any) => i.categoryName || 'Unknown'));
    return Array.from(cats) as string[];
  }, [issueCountsData]);

  const categoryColors = React.useMemo(() => Object.fromEntries(
    [...uniqueCategories].sort().map((name, index) => {
      const hue = Math.round((index * 137.508 + 205) % 360);
      return [name, {
        strong: `hsl(${hue} 65% 40%)`,
        light: `hsl(${hue} 65% 40% / 0.09)`,
      }];
    }),
  ) as Record<string, { strong: string; light: string }>, [uniqueCategories]);

  const categoryData = React.useMemo(() => {
    if (!issueCountsData) return [];
    const catMap: Record<string, number> = {};
    issueCountsData.forEach((item: any) => {
      const cat = item.categoryName || 'Unknown';
      catMap[cat] = (catMap[cat] || 0) + Number(item.count);
    });
    const data = Object.keys(catMap).map(cat => ({ categoryName: cat, count: catMap[cat] }));
    return data.filter(d => d.count > 0).sort((a, b) => b.count - a.count || a.categoryName.localeCompare(b.categoryName));
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
    const map = new Map<string, { categoryName: string; issueName: string; count: number }>();
    issueCountsData.forEach((item: any) => {
      const categoryName = item.categoryName || 'Unknown';
      const issueName = item.issueName || 'Unknown';
      const key = JSON.stringify([categoryName, issueName]);
      const entry = map.get(key) || { categoryName, issueName, count: 0 };
      entry.count += Number(item.count);
      map.set(key, entry);
    });
    return Array.from(map.values())
      .map((entry) => ({ ...entry, name: `${entry.categoryName} — ${entry.issueName}` }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
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
      name: row.techName,
      avg: parseFloat(row.avg.toFixed(2)),
      count: row.count,
    })) ?? [];

  // Ticket count per technician (grouped view — 2nd bar chart)
  const countBarData =
    result?.avgRatingByTechnician.map((row) => ({
      name: row.techName,
      tickets: row.count,
    })) ?? [];

  // Individual view = specific technician selected (privileged) OR non-privileged user viewing own data
  const isIndividualView = canManageReports ? !!technicianId : true;
  const hasPerformanceData =
    slaPieData.length > 0 ||
    (result?.slaByType?.length ?? 0) > 0 ||
    (result?.slaByTechnician?.length ?? 0) > 0 ||
    (result?.avgRatingByTechnician?.length ?? 0) > 0;

  const sectionTitle = tab === 0 ? 'Overview & Ratings'
    : tab === 1 ? issuesSubTab === 0 ? 'Categories' : 'Issues'
      : tab === 2 ? 'SLA Insights' : 'Performance';
  const chartSpecs = React.useMemo<ReportVisualSpec[]>(() => {
    if (!result) return [];
    const supportTypeValues = result.avgRatingByType.map((row) => ({
      label: TYPE_LABELS[row.type] ?? row.type,
      value: Number(row.avg || 0),
    }));
    const assigneeLabels = result.avgRatingByTechnician.map((row) => row.techName || `Assignee #${row.techId}`);
    const assigneeValues = result.avgRatingByTechnician.map((row, index) => ({ label: assigneeLabels[index], value: Number(row.avg || 0) }));
    const volumeAssigneeValues = result.avgRatingByTechnician.map((row, index) => ({ label: assigneeLabels[index], value: Number(row.count || 0) }));
    const baseOverview: ReportVisualSpec[] = [
      {
        id: 'overview_summary_table', title: 'Overview summary', kind: 'table',
        values: [
          { label: 'Total tickets', value: result.totalTickets },
          { label: 'Tickets with ratings', value: result.totalWithRating },
          { label: 'Rating fill rate (%)', value: result.totalTickets > 0 ? Math.round((result.totalWithRating / result.totalTickets) * 100) : 0 },
          ...(result.avgOverallRating === null ? [] : [{ label: 'Average rating (out of 5)', value: result.avgOverallRating }]),
        ],
        headers: ['Overview Metric', 'Result'],
        rows: [
          ['Total tickets', String(result.totalTickets)],
          ['Tickets with ratings', String(result.totalWithRating)],
          ['Rating fill rate', `${result.totalTickets > 0 ? Math.round((result.totalWithRating / result.totalTickets) * 100) : 0}%`],
          ['Average rating (out of 5)', result.avgOverallRating === null ? 'N/A' : result.avgOverallRating.toFixed(2)],
        ],
      },
      { id: 'overview_support_type_chart', title: 'Tickets by support type', kind: 'chart', values: pieData.map((row) => ({ label: row.name, value: Number(row.value || 0) })), headers: ['Support Type', 'Tickets'] },
      { id: 'overview_escalation_chart', title: 'Escalation outcome', kind: 'chart', values: escalationPieData.map((row) => ({ label: row.name, value: Number(row.value || 0) })), headers: ['Outcome', 'Escalations'] },
      { id: 'overview_rating_type_chart', title: 'Average rating by support type', kind: 'chart', values: supportTypeValues, headers: ['Support Type', 'Average Rating (out of 5)'] },
    ];
    if (viewMode === 'detailed' && detailedResult) {
      return [
        { id: 'overview_detailed_day_chart', title: 'Average rating by day', kind: 'chart', values: detailedResult.byDay.map((row) => ({ label: row.date, value: Number(row.avgRating || 0) })), headers: ['Day', 'Average Rating (out of 5)'] },
        { id: 'overview_detailed_week_chart', title: 'Average rating by week', kind: 'chart', values: detailedResult.byWeek.map((row) => ({ label: row.week, value: Number(row.avgRating || 0) })), headers: ['Week', 'Average Rating (out of 5)'] },
        {
          id: 'overview_ratings_table', title: 'Ratings per ticket', kind: 'table',
          values: detailedResult.byTicket.map((row) => ({ label: row.ticketNumber, value: Number(row.rating || 0) })),
          headers: ['Ticket', 'Subject', 'Submitted At', 'Rating', 'Comment'],
          rows: detailedResult.byTicket.map((row) => [row.ticketNumber, row.subject, new Date(row.submittedAt).toLocaleDateString(), String(row.rating), row.comment || '—']),
        },
      ];
    }
    if (viewMode === 'detailed') return [];
    if (!isIndividualView) {
      baseOverview.push(
        { id: 'overview_rating_assignee_chart', title: 'Average rating by assignee', kind: 'chart', values: assigneeValues, headers: ['Assignee', 'Average Rating (out of 5)'] },
        { id: 'overview_volume_assignee_chart', title: 'Resolved tickets by assignee', kind: 'chart', values: volumeAssigneeValues, headers: ['Assignee', 'Resolved Tickets'] },
      );
    }
    return baseOverview;
  }, [result, tab, issuesSubTab, categoryData, selectedCategoryName, drillDownData, allIssuesAggregated, slaInsights, pieData, escalationPieData, slaPieData, viewMode, detailedResult, isIndividualView]);

  const printSpecs = React.useMemo<ReportVisualSpec[]>(() => {
    if (!result) return [];
    if (tab === 1 && issuesSubTab === 0) return [
      { id: 'issues_categories_chart', title: 'Tickets by category', kind: 'chart', values: categoryData.map((row) => ({ label: row.categoryName, value: Number(row.count || 0) })), headers: ['Category', 'Tickets with Issues'] },
      ...(selectedCategoryName ? [{ id: 'issues_category_drilldown_chart', title: `Issues in ${selectedCategoryName}`, kind: 'chart', values: drillDownData.map((row: any) => ({ label: row.issueName, value: Number(row.open || 0) + Number(row.in_progress || 0) + Number(row.resolved || 0) + Number(row.closed || 0) + Number(row.freeze_pause || 0) })), headers: ['Issue', 'Tickets'] }] : []),
    ] as ReportVisualSpec[];
    if (tab === 1) return [{ id: 'issues_all_chart', title: 'Tickets by issue', kind: 'chart', values: allIssuesAggregated.map((row) => ({ label: row.name, value: Number(row.count || 0) })), headers: ['Category', 'Issue', 'Tickets'], rows: allIssuesAggregated.map((row) => [row.categoryName, row.issueName, String(row.count)]) }] as ReportVisualSpec[];
    if (tab === 2) return [
      { id: 'sla_insights_chart', title: 'Configured versus actual SLA', kind: 'chart', values: slaInsights.flatMap((row: any) => [{ label: `${row.issueName || 'Unknown issue'} — configured SLA hours`, value: Number(row.configuredSlaHours || 0) }, { label: `${row.issueName || 'Unknown issue'} — average resolution hours`, value: Number(row.avgResolutionHours || 0) }]), headers: ['Issue and Metric', 'Hours'] },
      { id: 'sla_insights_table', title: 'SLA insight details', kind: 'table', values: slaInsights.map((row: any) => ({ label: row.issueName || 'Unknown issue', value: Number(row.avgResolutionHours || 0) })), headers: ['Category', 'Issue', 'Resolved Tickets', 'Configured SLA', 'Avg Actual Resolution', 'Status', 'Interpretation'], rows: slaInsights.map((row: any) => [row.categoryName || 'Unknown', row.issueName, String(row.resolvedTicketsCount || 0), row.configuredSlaHours > 0 ? `${Number(row.configuredSlaHours).toFixed(1)}h` : 'None', row.avgResolutionHours ? `${Number(row.avgResolutionHours).toFixed(1)}h` : '—', row.configuredSlaHours > 0 ? (row.isFailingSla ? 'Failing' : 'Healthy') : 'Unmonitored', row.configuredSlaHours <= 0 ? '—' : row.isFailingSla ? 'Consider extending SLA' : row.avgResolutionHours < row.configuredSlaHours * 0.5 ? 'SLA is very generous, consider tightening' : 'SLA is balanced']) },
    ] as ReportVisualSpec[];
    if (tab === 3) return [
      { id: 'performance_sla_chart', title: 'SLA performance', kind: 'chart', values: slaPieData.map((row) => ({ label: row.name, value: Number(row.value || 0) })), headers: ['SLA Outcome', 'Resolved Tickets'] },
      { id: 'performance_sla_category_table', title: 'SLA by support type', kind: 'table', values: result.slaByType.flatMap((row) => [{ label: `${TYPE_LABELS[row.type] ?? row.type} met`, value: Number(row.met || 0) }, { label: `${TYPE_LABELS[row.type] ?? row.type} missed`, value: Number(row.missed || 0) }]), headers: ['Support Type', 'Met', 'Missed', 'Avg Time (hrs)'], rows: result.slaByType.map((row) => [TYPE_LABELS[row.type] ?? row.type, String(row.met), String(row.missed), String(row.avgResolutionTimeHours)]) },
      { id: 'performance_sla_assignee_table', title: 'SLA by assignee', kind: 'table', values: result.slaByTechnician.flatMap((row) => [{ label: `${row.techName || `Assignee #${row.techId}`} met`, value: Number(row.met || 0) }, { label: `${row.techName || `Assignee #${row.techId}`} missed`, value: Number(row.missed || 0) }]), headers: ['Assignee', 'Met', 'Missed', 'Avg Time (hrs)'], rows: result.slaByTechnician.map((row) => [row.techName || `Assignee #${row.techId}`, String(row.met), String(row.missed), String(row.avgResolutionTimeHours)]) },
      { id: 'performance_assignee_table', title: 'Assignee performance detail', kind: 'table', values: result.avgRatingByTechnician.map((row) => ({ label: row.techName || `Assignee #${row.techId}`, value: Number(row.avg || 0) })), headers: ['Assignee', 'Resolved Tickets', 'Rated Tickets', 'Average Rating'], rows: result.avgRatingByTechnician.map((row) => [row.techName || `Assignee #${row.techId}`, String(row.count), String(row.ratedCount || 0), Number(row.avg || 0).toFixed(2)]) },
    ];
    return chartSpecs;
  }, [result, tab, issuesSubTab, categoryData, selectedCategoryName, drillDownData, allIssuesAggregated, slaInsights, slaPieData, chartSpecs]);

  const handlePrint = async () => {
    if (loading || (tab === 2 && slaLoading) || printSpecs.length === 0) return;
    const printWindow = window.open('', '_blank', 'width=1100,height=780');
    if (!printWindow) {
      setPrintError('The print window was blocked. Allow pop-ups for this site, then try again.');
      return;
    }
    setExplanationsLoading(true);
    setPrintError('');
    const assigneeVisualIds = new Set([
      'overview_rating_assignee_chart', 'overview_volume_assignee_chart', 'overview_assignee_table',
      'performance_sla_assignee_table', 'performance_assignee_table',
    ]);
    const explanationSpecs = printSpecs.map(({ id, title, values }) => {
      // Keep actual staff names in the printed chart/table, but never send them to AI.
      const safeValues = values.map((item, index) => ({
        label: id === 'performance_sla_assignee_table'
          ? `Assignee ${Math.floor(index / 2) + 1} ${index % 2 === 0 ? 'met' : 'missed'}`
          : assigneeVisualIds.has(id) ? `Assignee ${index + 1}` : item.label,
        value: item.value,
      }));
      const rankedValues = safeValues.length > 30 ? [...safeValues].sort((a, b) => b.value - a.value) : safeValues;
      const sampledValues = rankedValues.length > 30
        ? [...rankedValues.slice(0, 15), ...rankedValues.slice(-15)]
        : rankedValues;
      return { id, title, totalValues: values.length, values: sampledValues };
    });
    const localExplanation = (chart: typeof explanationSpecs[number]) => {
      const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });
      const byLabel = (label: string) => chart.values.find((item) => item.label === label)?.value ?? 0;
      if (chart.values.length === 0) {
        const subject = chart.id.startsWith('issues_') ? 'tickets with configured issues' : chart.id.includes('rating') ? 'requester ratings' : 'tickets';
        return `No ${subject} were recorded for this part of the selected period. There are therefore no results to compare here. A broader period or different filter may show activity.`;
      }
      if (chart.id === 'overview_summary_table') {
        const rating = chart.values.find((item) => item.label === 'Average rating (out of 5)');
        return `During the selected period, ${number(byLabel('Total tickets'))} tickets were recorded and ${number(byLabel('Tickets with ratings'))} received a requester rating. That is a ${number(byLabel('Rating fill rate (%)'))}% rating response rate. ${byLabel('Tickets with ratings') > 0 && rating ? `The average rating was ${number(rating.value)} out of 5.` : 'No average rating is available because no tickets were rated.'}`;
      }
      if (chart.id === 'overview_escalation_chart') {
        const accepted = byLabel('Accepted');
        const returned = byLabel('Returned');
        const pending = byLabel('Pending/Other');
        return `During the selected period, ${number(accepted + returned + pending)} ticket escalations were recorded. ${number(accepted)} were accepted, ${number(returned)} returned, and ${number(pending)} had a pending or other outcome. These counts do not establish the reasons behind the outcomes.`;
      }
      if (chart.id === 'performance_sla_chart' || chart.id === 'overview_sla_chart') {
        const met = byLabel('Met SLA');
        const missed = byLabel('Missed SLA');
        return `Of the ${number(met + missed)} resolved tickets with an SLA outcome, ${number(met)} were classified as met and ${number(missed)} as missed. The support-type and assignee results show where these outcomes occurred. The counts alone do not establish why a deadline was missed.`;
      }
      const highest = chart.values.reduce((best, current) => current.value > best.value ? current : best);
      const lowest = chart.values.reduce((best, current) => current.value < best.value ? current : best);
      if (chart.id.startsWith('issues_')) {
        const subject = chart.id === 'issues_categories_chart' ? 'categories' : 'issues';
        const total = chart.values.reduce((sum, item) => sum + item.value, 0);
        const opening = chart.totalValues > chart.values.length
          ? `Tickets with configured issues were counted across ${chart.totalValues} ${subject}.`
          : `${number(total)} tickets with configured issues were counted across ${chart.totalValues} ${subject}.`;
        return `${opening} ${highest.label} accounted for ${number(highest.value)} tickets, while ${lowest.label} accounted for ${number(lowest.value)}. Tickets without an issue and duplicates are excluded from these counts.`;
      }
      if (chart.id === 'performance_sla_category_table' || chart.id === 'performance_sla_assignee_table') {
        const met = chart.values.filter((item) => item.label.endsWith(' met'));
        const missed = chart.values.filter((item) => item.label.endsWith(' missed'));
        const group = chart.id === 'performance_sla_category_table' ? 'support type' : 'assignee';
        const topMet = met.reduce((best, current) => current.value > best.value ? current : best, met[0]);
        const opening = chart.totalValues > chart.values.length
          ? `SLA outcomes were reported across ${Math.ceil(chart.totalValues / 2)} ${group}s.`
          : `Across the reported ${group}s, ${number(met.reduce((sum, item) => sum + item.value, 0))} resolved tickets met their SLA classification and ${number(missed.reduce((sum, item) => sum + item.value, 0))} missed it.`;
        return `${opening} ${topMet?.label.replace(/ met$/, '') || 'No group'} had the most met outcomes among the reported comparisons at ${number(topMet?.value || 0)}. Compare each group's met and missed counts alongside its average resolution time before drawing conclusions.`;
      }
      if (chart.id === 'sla_insights_chart') {
        const configured = chart.values.filter((item) => item.label.endsWith('configured SLA hours'));
        const actual = chart.values.filter((item) => item.label.endsWith('average resolution hours'));
        const topConfigured = configured.reduce((best, current) => current.value > best.value ? current : best, configured[0]);
        const topActual = actual.reduce((best, current) => current.value > best.value ? current : best, actual[0]);
        return `Configured SLA targets and actual average resolution times are compared in hours for the listed issues. ${topConfigured?.label.replace(/ — configured SLA hours$/, '') || 'No issue'} had the longest target at ${number(topConfigured?.value || 0)} hours, while ${topActual?.label.replace(/ — average resolution hours$/, '') || 'no issue'} had the longest actual average at ${number(topActual?.value || 0)} hours. Compare the target and actual time for the same issue before considering an adjustment.`;
      }
      const subjects: Record<string, string> = {
        overview_support_type_chart: 'tickets were distributed among support types',
        overview_rating_type_chart: 'requester ratings were averaged by support type',
        overview_rating_assignee_chart: 'requester ratings were averaged by assignee',
        overview_volume_assignee_chart: 'resolved tickets were distributed among assignees',
        overview_detailed_day_chart: 'requester ratings were averaged by day',
        overview_detailed_week_chart: 'requester ratings were averaged by week',
        overview_ratings_table: 'rated tickets were recorded individually',
        sla_insights_chart: 'configured SLA targets and actual resolution times were compared in hours',
        sla_insights_table: 'actual resolution times were averaged for each issue',
        performance_sla_category_table: 'SLA outcomes were grouped by support type',
        performance_sla_assignee_table: 'SLA outcomes were grouped by assignee',
        performance_assignee_table: 'resolved ticket ratings were grouped by assignee',
      };
      const unit = chart.id.includes('rating') || chart.id === 'performance_assignee_table' || chart.id.startsWith('overview_detailed_') ? ' out of 5'
        : chart.id.startsWith('sla_insights_') ? ' hours' : ' tickets';
      const contrast = highest.label === lowest.label
        ? `${highest.label} recorded ${number(highest.value)}${unit}.`
        : `${highest.label} had the highest result at ${number(highest.value)}${unit}, while ${lowest.label} had the lowest at ${number(lowest.value)}${unit}.`;
      return `During the selected period, ${subjects[chart.id] || 'ticket activity was recorded'}. ${contrast} The difference describes recorded activity and does not establish its cause.`;
    };
    let explanationResponse: { source: 'cloudflare' | 'fallback'; explanations: Record<string, string> } = { source: 'fallback', explanations: {} };
    try {
      explanationResponse = await ticketsApi.getReportExplanations(explanationSpecs);
    } catch {
      explanationResponse.explanations = Object.fromEntries(explanationSpecs.map((chart) => [chart.id, localExplanation(chart)]));
    } finally {
      setExplanationsLoading(false);
    }
    setPrintError('');
    const doc = printWindow.document;
    doc.title = `Ticket Reports - ${sectionTitle} - ${periodLabel} ${year}`;
    const style = doc.createElement('style');
    style.textContent = `
      @page { size: A4 ${tab === 1 || tab === 2 ? 'landscape' : 'portrait'}; margin: 13mm; }
      body { font-family: Arial, sans-serif; color: #222; font-size: 13px; }
      h1 { font-size: 22px; margin: 0 0 5px; } h2 { font-size: 16px; margin: 20px 0 6px; }
      .meta { color: #555; border-bottom: 2px solid #1976d2; padding-bottom: 12px; }
      .explanation { background: #f2f7fc; padding: 9px 11px; border-left: 3px solid #1976d2; font-size: 13px; line-height: 1.5; }
      .print-chart { border: 1px solid #d7dee8; padding: 8px; margin-top: 8px; break-inside: avoid; page-break-inside: avoid; }
      .bar-line { display: flex; align-items: center; gap: 7px; margin: 5px 0; }
      .bar-label { width: 170px; overflow-wrap: anywhere; }
      .bar-track { flex: 1; height: 10px; background: #e7edf4; border-radius: 4px; overflow: hidden; }
      .bar-fill { display: block; height: 100%; background: #1976d2; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .bar-value { width: 70px; text-align: right; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
      th, td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      th { background: #edf2f7; } thead { display: table-header-group; }
      tr, .explanation { break-inside: avoid; page-break-inside: avoid; }
      section { margin-bottom: 20px; } section h2 { break-after: avoid; }
      .footer { margin-top: 24px; border-top: 1px solid #ccc; padding-top: 8px; color: #666; font-size: 10px; }
    `;
    doc.head.appendChild(style);
    const add = (tag: string, value: string, parent: HTMLElement = doc.body) => {
      const element = doc.createElement(tag);
      element.textContent = value;
      parent.appendChild(element);
      return element;
    };
    add('h1', `Ticket Reports — ${sectionTitle}`);
    const assignee = technicians.find((person) => person.id === technicianId);
    const assigneeLabel = assignee ? formatPersonName(assignee, `Assignee #${assignee.id}`) : canManageReports ? 'All assignees' : 'My tickets';
    const printUsesStaffAndTypeFilters = tab === 0 || tab === 3;
    add('div', `${periodLabel} ${year} • ${printUsesStaffAndTypeFilters && ticketType ? TYPE_LABELS[ticketType] ?? ticketType : 'All support types'} • ${printUsesStaffAndTypeFilters ? assigneeLabel : 'All assignees'} • Generated ${new Date().toLocaleString()}`, doc.body).className = 'meta';
    if (tab === 1) add('p', 'These counts include tickets with configured issues and exclude duplicate tickets. Category totals are the sum of their listed issues.');
    const addBarChart = (values: Array<{ label: string; value: number }>, parent: HTMLElement, visualId: string) => {
      const maxValue = Math.max(1, ...values.map((row) => Number(row.value) || 0));
      const chart = doc.createElement('div');
      chart.className = 'print-chart';
      for (const row of values) {
        const line = doc.createElement('div');
        line.className = 'bar-line';
        const label = doc.createElement('span');
        label.className = 'bar-label';
        label.textContent = row.label;
        const track = doc.createElement('span');
        track.className = 'bar-track';
        const bar = doc.createElement('span');
        bar.className = 'bar-fill';
        const categoryName = visualId === 'issues_categories_chart' ? row.label
          : visualId === 'issues_all_chart' ? allIssuesAggregated.find((issue) => issue.name === row.label)?.categoryName
            : undefined;
        if (categoryName && categoryColors[categoryName]) bar.style.backgroundColor = categoryColors[categoryName].strong;
        bar.style.width = `${Math.max(0, Math.min(100, (Number(row.value) / maxValue) * 100))}%`;
        track.appendChild(bar);
        const value = doc.createElement('span');
        value.className = 'bar-value';
        value.textContent = Number(row.value).toLocaleString(undefined, { maximumFractionDigits: 2 });
        line.append(label, track, value);
        chart.appendChild(line);
      }
      parent.appendChild(chart);
    };
    for (const chart of printSpecs) {
      const section = doc.createElement('section');
      doc.body.appendChild(section);
      add('h2', chart.title, section);
      const explanationSpec = explanationSpecs.find((item) => item.id === chart.id);
      const explanation = add('p', explanationResponse.explanations[chart.id] || (explanationSpec ? localExplanation(explanationSpec) : `${chart.title} has no explanation available.`), section);
      explanation.className = 'explanation';
      if (assigneeVisualIds.has(chart.id) && chart.values.length > 0) {
        add('p', 'Assignee numbers in the explanation correspond to the names below, in displayed order.', section);
      }
      if (chart.kind === 'chart') addBarChart(chart.values, section, chart.id);
      if (chart.values.length === 0 && (!chart.rows || chart.rows.length === 0)) {
        add('p', 'No data is available for this section.', section);
        continue;
      }
      const table = doc.createElement('table');
      const thead = doc.createElement('thead');
      const heading = doc.createElement('tr');
      for (const label of chart.headers) add('th', label, heading);
      thead.appendChild(heading);
      table.appendChild(thead);
      const tbody = doc.createElement('tbody');
      const rows = chart.rows ?? chart.values.map((row) => [row.label, Number(row.value).toLocaleString(undefined, { maximumFractionDigits: 2 })]);
      for (const row of rows) {
        const tr = doc.createElement('tr');
        for (const [index, value] of row.entries()) {
          const cell = add('td', value, tr);
          if (chart.id === 'issues_all_chart' && index === 0 && categoryColors[row[0]]) {
            cell.style.backgroundColor = categoryColors[row[0]].light;
            cell.style.borderLeft = `4px solid ${categoryColors[row[0]].strong}`;
          }
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      section.appendChild(table);
    }
    add('div', `Generated from Ticket Reports • ${explanationResponse.source === 'cloudflare' ? 'Explanations assisted by Cloudflare AI; verify against the figures.' : 'Descriptions use the displayed figures.'}`, doc.body).className = 'footer';
    printWindow.focus();
    printWindow.setTimeout(() => printWindow.print(), 250);
  };

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
          onClick={handlePrint}
          disabled={!result || !!error || printSpecs.length === 0 || loading || explanationsLoading || (tab === 2 && slaLoading)}
          size="small"
        >
          Print / Export PDF
        </Button>
      </Box>
      {printError && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setPrintError('')}>{printError}</Alert>}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
          <Tab value={0} label="Overview & Ratings" />
          {canManageReports && <Tab value={1} label="Issues" />}
          {canManageReports && <Tab value={2} label="SLA Insights" />}
          <Tab value={3} label="Performance" />
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
                    <MenuItem value="specialized_concerns">Specialized Concerns</MenuItem>
                  </TextField>
                  {canManageReports && (
                    <Autocomplete
                      options={technicians}
                      getOptionLabel={(option) => formatPersonName(option)}
                      value={technicians.find((option) => option.id === technicianId) ?? null}
                      onChange={(_, option) => setTechnicianId(option?.id ?? '')}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      openOnFocus
                      clearOnEscape
                      fullWidth
                      size="small"
                      sx={{ minWidth: 120 }}
                      noOptionsText="No assignees available"
                      renderInput={(params) => <TextField {...params} label="Assignee" placeholder="All Assignees" />}
                    />
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
              Satisfaction ratings overview — average overall, per support type, and per assignee.
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
                              Average Rating by Assignee
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
                                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" height={80} interval={0} />
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
                              Resolved Tickets by Assignee
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
                                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" height={80} interval={0} />
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
                      Assignee Performance Detail
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
                          <TableCell>Assignee</TableCell>
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
                      SLA Detail By Assignee
                    </Typography>
                    <Table size="small" sx={{ mb: 4 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Assignee</TableCell>
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
              No performance data is available for the selected period and assignee.
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
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>SLA by Support Type</Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Support Type</TableCell>
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

            {/* SLA by Assignee */}
            {result.slaByTechnician && result.slaByTechnician.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>SLA by Assignee</Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Assignee</TableCell>
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
            
            {/* Assignee Performance Detail */}
            {result.avgRatingByTechnician.length > 0 && (
              <Grid item xs={12}>
                <Card><CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Assignee Performance Detail</Typography>
                  <Table size="small" sx={{ mb: 4 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Assignee</TableCell>
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
      {canManageReports && tab === 1 && loading && <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}
      {canManageReports && tab === 1 && error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {canManageReports && tab === 1 && !loading && !error && result && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={issuesSubTab} onChange={(_, v) => setIssuesSubTab(v)}>
              <Tab label="Categories" />
              <Tab label="Issues" />
            </Tabs>
          </Box>

          {issuesSubTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Tickets by Category
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      Each category total is the sum of tickets with its configured issues. Select a bar to inspect that category.
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
                                fill={categoryColors[entry.categoryName]?.strong ?? '#8884d8'}
                                opacity={selectedCategoryName && selectedCategoryName !== entry.categoryName ? 0.45 : 1}
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
              {allIssuesAggregated.length > 0 && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Most Reported Issues
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      The 12 most reported issues are shown here; the complete issue list and exact counts remain below. Bar colors match their categories.
                    </Typography>
                    <ResponsiveContainer width="100%" height={Math.max(260, Math.min(12, allIssuesAggregated.length) * 38 + 50)}>
                      <BarChart layout="vertical" data={allIssuesAggregated.slice(0, 12)} margin={{ top: 8, right: 32, bottom: 8, left: 8 }}>
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={190} interval={0} tick={{ fontSize: 11 }} tickFormatter={(label: string) => label.length > 28 ? `${label.slice(0, 25)}…` : label} />
                        <Tooltip formatter={(value: number) => [value, 'Tickets']} labelFormatter={(label) => String(label)} />
                        <Bar dataKey="count" name="Tickets" radius={[0, 4, 4, 0]}>
                          {allIssuesAggregated.slice(0, 12).map((row) => (
                            <Cell key={JSON.stringify([row.categoryName, row.issueName])} fill={categoryColors[row.categoryName]?.strong ?? '#1976d2'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Tickets by Issue
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Every configured issue is listed with its category and ticket count. Tickets without an issue and duplicate tickets are excluded.
                  </Typography>
                  {allIssuesAggregated.length === 0 ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
                      <Typography color="text.secondary">No specific issues reported in this timeframe.</Typography>
                    </Box>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Category</TableCell>
                          <TableCell>Issue</TableCell>
                          <TableCell align="right">Tickets</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {allIssuesAggregated.map((row) => (
                          <TableRow key={JSON.stringify([row.categoryName, row.issueName])} hover sx={{ backgroundColor: categoryColors[row.categoryName]?.light }}>
                            <TableCell sx={{ borderLeft: `4px solid ${categoryColors[row.categoryName]?.strong ?? 'transparent'}` }}>
                              <Chip size="small" label={row.categoryName} sx={{ backgroundColor: categoryColors[row.categoryName]?.light, color: categoryColors[row.categoryName]?.strong, fontWeight: 700 }} />
                            </TableCell>
                            <TableCell>{row.issueName}</TableCell>
                            <TableCell align="right">{row.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      )}

      {/* ── Tab 2: SLA Insights ── */}
      {canManageReports && tab === 2 && (
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
