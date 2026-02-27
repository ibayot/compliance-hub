'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { unitsApi, Unit } from '@/lib/api/units';
import {
  DashboardSummaryResponse,
  kpiApi,
  KpiDirection,
  KpiFrequency,
  KpiMasterRecord,
  KpiMonitoringRecord,
  KpiMonitoringStatus,
  KpiType,
  UnitDashboardResponse,
  UnitTimeseriesPoint,
} from '@/lib/api/kpi';

const monthOptions = [
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

const typeLabels: Record<KpiType, string> = {
  measurement: 'Measurement',
  yes_no: 'Yes/No',
};

const directionLabels: Record<KpiDirection, string> = {
  higher_is_better: 'Higher is better',
  lower_is_better: 'Lower is better',
};

const BAND_COLORS: Record<string, string> = {
  green: '#2e7d32',
  amber: '#ed6c02',
  red: '#d32f2f',
  unclassified: '#546e7a',
};

/** Distinct palette for units / KPIs in multi-line charts. */
const UNIT_COLORS: string[] = [
  '#1565c0', '#6a1b9a', '#00695c', '#e65100',
  '#558b2f', '#4527a0', '#ad1457', '#00838f',
];

function computeBand(score: number, thresholds: Array<{ band: string; minScore: number; maxScore: number }>): string {
  const sorted = [...thresholds].sort((a, b) => b.minScore - a.minScore);
  for (const t of sorted) {
    if (score >= t.minScore && score <= t.maxScore) return t.band.toLowerCase();
  }
  if (score >= 80) return 'green';
  if (score >= 50) return 'amber';
  return 'red';
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Returns the from/to year+month range to fetch timeseries data for. */
function getTimeseriesRange(
  viewFrequency: 'monthly' | 'quarterly' | 'semestral' | 'annual',
  periodYear: number,
  periodMonth: number,
  periodQuarter: number,
  periodSemester: number,
): { fromYear: number; fromMonth: number; toYear: number; toMonth: number } {
  switch (viewFrequency) {
    case 'monthly': {
      const toMonth = periodMonth;
      if (periodMonth === 1) return { fromYear: periodYear - 1, fromMonth: 12, toYear: periodYear, toMonth };
      return { fromYear: periodYear, fromMonth: periodMonth - 1, toYear: periodYear, toMonth };
    }
    case 'quarterly': {
      const toMonth = periodQuarter * 3;
      if (periodQuarter === 1) return { fromYear: periodYear - 1, fromMonth: 12, toYear: periodYear, toMonth };
      return { fromYear: periodYear, fromMonth: (periodQuarter - 1) * 3, toYear: periodYear, toMonth };
    }
    case 'semestral': {
      const toMonth = periodSemester * 6;
      if (periodSemester === 1) return { fromYear: periodYear - 1, fromMonth: 12, toYear: periodYear, toMonth };
      return { fromYear: periodYear, fromMonth: 6, toYear: periodYear, toMonth };
    }
    case 'annual':
      return { fromYear: periodYear - 1, fromMonth: 12, toYear: periodYear, toMonth: 12 };
    default:
      return { fromYear: periodYear, fromMonth: periodMonth, toYear: periodYear, toMonth: periodMonth };
  }
}

/** Returns the X-axis label for a timeseries data point. */
function getXAxisLabel(
  point: { periodYear: number; periodMonth: number },
  viewFrequency: 'monthly' | 'quarterly' | 'semestral' | 'annual',
  periodYear: number,
  periodQuarter: number,
  periodSemester: number,
  prevYear: number,
  prevMonth: number,
): string {
  const isPrev = point.periodYear === prevYear && point.periodMonth === prevMonth;
  const abbr = MONTH_ABBR[point.periodMonth - 1];
  if (isPrev) {
    const yy = String(point.periodYear).slice(-2);
    return `${abbr}'${yy}`;
  }
  switch (viewFrequency) {
    case 'monthly': return abbr;
    case 'quarterly': {
      const rel = point.periodMonth - ((periodQuarter - 1) * 3 + 1) + 1;
      return `Q${periodQuarter}-${rel}`;
    }
    case 'semestral': {
      const rel = point.periodMonth - ((periodSemester - 1) * 6 + 1) + 1;
      return `H${periodSemester}-${rel}`;
    }
    case 'annual': {
      const yy = String(point.periodYear).slice(-2);
      return point.periodYear === periodYear ? abbr : `${abbr}'${yy}`;
    }
    default: return abbr;
  }
}

/** Mini 2-point line sparkline for the Trend column in the KPI detail table. */
function TrendSparkline({ prev, current, band }: { prev: number | null; current: number | null; band: string }) {
  const color = BAND_COLORS[band] || BAND_COLORS.unclassified;
  const w = 60; const h = 24; const pad = 5;
  // When prev is null (no historic data) we anchor the start at 0 so the
  // line shows a diagonal ascent/descent rather than a flat horizontal.
  const startVal = prev !== null ? prev : 0;
  const endVal = current !== null ? current : 0;
  const toY = (v: number) => h - pad - (Math.min(100, Math.max(0, v)) / 100) * (h - 2 * pad);
  const y1 = toY(startVal); const y2 = toY(endVal);
  // Grey start dot when prev had no data (anchored at 0); band-colored otherwise.
  const startColor = prev !== null ? color : '#b0bec5';
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      <line x1={pad} y1={y1} x2={w - pad} y2={y2} stroke={color} strokeWidth={2} />
      <circle cx={pad} cy={y1} r={3} fill={startColor} stroke="#fff" strokeWidth={1} />
      <circle cx={w - pad} cy={y2} r={3} fill={color} stroke="#fff" strokeWidth={1} />
    </svg>
  );
}

export default function KpiPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [tab, setTab] = useState(0);
  const [units, setUnits] = useState<Unit[]>([]);
  const [masters, setMasters] = useState<KpiMasterRecord[]>([]);
  const [monitoring, setMonitoring] = useState<KpiMonitoringRecord[]>([]);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [selectedUnitDashboard, setSelectedUnitDashboard] = useState<UnitDashboardResponse | null>(null);
  const [unitTimeseries, setUnitTimeseries] = useState<UnitTimeseriesPoint[]>([]);
  const [allUnitsTimeseries, setAllUnitsTimeseries] = useState<Record<number, UnitTimeseriesPoint[]>>({});
  /** Tracks the currently-selected unit ID without being a useCallback dependency. */
  const selectedUnitIdRef = useRef<number | null>(null);

  const [periodYear, setPeriodYear] = useState(currentYear);
  const [periodMonth, setPeriodMonth] = useState(currentMonth);
  const [viewFrequency, setViewFrequency] = useState<'monthly' | 'quarterly' | 'semestral' | 'annual'>('monthly');
  const [periodQuarter, setPeriodQuarter] = useState<1 | 2 | 3 | 4>(Math.ceil(currentMonth / 3) as 1 | 2 | 3 | 4);
  const [periodSemester, setPeriodSemester] = useState<1 | 2>(currentMonth <= 6 ? 1 : 2);
  const [filterUnitId, setFilterUnitId] = useState<number | ''>('');

  const [masterOpen, setMasterOpen] = useState(false);
  const [masterEditingCode, setMasterEditingCode] = useState<string | null>(null);
  const [masterForm, setMasterForm] = useState({
    code: '',
    name: '',
    description: '',
    unitId: 0,
    type: 'measurement' as KpiType,
    unitOfMeasure: '',
    direction: 'higher_is_better' as KpiDirection,
    targetValue: 100,
    weight: 1,
    frequency: 'monthly' as KpiFrequency,
    active: true,
  });

  const [monitoringOpen, setMonitoringOpen] = useState(false);
  const [monitoringEditingId, setMonitoringEditingId] = useState<number | null>(null);
  const [monitoringForm, setMonitoringForm] = useState({
    kpiMasterCode: '',
    unitId: 0,
    periodYear: currentYear,
    periodMonth: currentMonth,
    actualValue: 0,
    remarks: '',
    status: 'draft' as KpiMonitoringStatus,
  });

  const canManage = ['super_admin', 'reviewer', 'section_head'].includes(String(user?.role));
  const userUnitIds = useMemo(() => ((user?.units || []) as any[]).map((u: any) => Number(u.id)).filter(Number.isFinite), [user?.units]);

  const effectiveMonth = useMemo(() => {
    switch (viewFrequency) {
      case 'quarterly': return (periodQuarter as number) * 3;
      case 'semestral': return (periodSemester as number) * 6;
      case 'annual': return 12;
      default: return periodMonth;
    }
  }, [viewFrequency, periodMonth, periodQuarter, periodSemester]);

  const availableUnits = useMemo(() => {
    if (canManage) return units;
    return units.filter((unit) => userUnitIds.includes(unit.id));
  }, [canManage, units, userUnitIds]);

  const loadInitial = useCallback(async () => {
    try {
      const [unitList, masterList] = await Promise.all([unitsApi.listAll(), kpiApi.listMaster()]);
      setUnits(unitList);
      setMasters(masterList);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to load KPI master data.', { variant: 'error' });
    }
  }, [enqueueSnackbar]);

  const loadMonitoring = useCallback(async () => {
    if (!Number.isFinite(periodYear) || !Number.isFinite(effectiveMonth)) return;
    try {
      const data = await kpiApi.listMonitoring({
        periodYear,
        periodMonth: effectiveMonth,
        unitId: filterUnitId === '' ? undefined : Number(filterUnitId),
      });
      setMonitoring(data);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to load KPI monitoring data.', { variant: 'error' });
    }
  }, [enqueueSnackbar, effectiveMonth, periodYear, filterUnitId]);

  const loadDashboard = useCallback(async () => {
    if (!Number.isFinite(periodYear) || !Number.isFinite(effectiveMonth)) return;
    try {
      const data = await kpiApi.dashboardSummary(periodYear, effectiveMonth);
      setSummary(data);
      const { fromYear, fromMonth, toYear, toMonth } = getTimeseriesRange(
        viewFrequency, periodYear, effectiveMonth, periodQuarter, periodSemester,
      );
      // Fetch timeseries for all visible units simultaneously (multi-line chart).
      const unitIds = (data.units || []).map((u) => u.unitId);
      const tseriesArray = await Promise.all(
        unitIds.map((id) => kpiApi.dashboardUnitTimeseries(id, fromYear, fromMonth, toYear, toMonth)),
      );
      const tseriesMap: Record<number, UnitTimeseriesPoint[]> = {};
      unitIds.forEach((id, idx) => { tseriesMap[id] = tseriesArray[idx]; });
      setAllUnitsTimeseries(tseriesMap);
      if (!canManage) {
        const ownUnit = availableUnits[0];
        if (ownUnit && Number.isFinite(ownUnit.id)) {
          const detail = await kpiApi.dashboardUnit(ownUnit.id, periodYear, effectiveMonth);
          setSelectedUnitDashboard(detail);
          setUnitTimeseries(tseriesMap[ownUnit.id] || []);
          selectedUnitIdRef.current = ownUnit.id;
        }
      } else if (selectedUnitIdRef.current) {
        // Auto-refresh the unit detail pane when the period/filter changes.
        const uid = selectedUnitIdRef.current;
        const detail = await kpiApi.dashboardUnit(uid, periodYear, effectiveMonth);
        setSelectedUnitDashboard(detail);
        setUnitTimeseries(tseriesMap[uid] || []);
      }
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to load KPI dashboard.', { variant: 'error' });
    }
  }, [enqueueSnackbar, effectiveMonth, periodYear, canManage, availableUnits, viewFrequency, periodQuarter, periodSemester]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    loadMonitoring();
    loadDashboard();
  }, [loadMonitoring, loadDashboard]);

  const openCreateMaster = () => {
    setMasterEditingCode(null);
    setMasterForm({
      code: '',
      name: '',
      description: '',
      unitId: availableUnits[0]?.id || 0,
      type: 'measurement',
      unitOfMeasure: '',
      direction: 'higher_is_better',
      targetValue: 100,
      weight: 1,
      frequency: 'monthly',
      active: true,
    });
    setMasterOpen(true);
  };

  const openEditMaster = (row: KpiMasterRecord) => {
    setMasterEditingCode(row.code);
    setMasterForm({
      code: row.code,
      name: row.name,
      description: row.description || '',
      unitId: row.unitId,
      type: row.type,
      unitOfMeasure: row.unitOfMeasure || '',
      direction: row.direction,
      targetValue: Number(row.targetValue),
      weight: Number(row.weight),
      frequency: row.frequency,
      active: Boolean(row.active),
    });
    setMasterOpen(true);
  };

  const saveMaster = async () => {
    try {
      if (!masterForm.code || !masterForm.name || !masterForm.unitId) {
        enqueueSnackbar('Code, name, and unit are required.', { variant: 'warning' });
        return;
      }

      if (masterEditingCode) {
        await kpiApi.updateMaster(masterEditingCode, {
          name: masterForm.name,
          description: masterForm.description,
          unitId: masterForm.unitId,
          type: masterForm.type,
          unitOfMeasure: masterForm.unitOfMeasure,
          direction: masterForm.direction,
          targetValue: masterForm.targetValue,
          weight: masterForm.weight,
          frequency: masterForm.frequency,
          active: masterForm.active,
        });
      } else {
        await kpiApi.createMaster(masterForm as any);
      }

      enqueueSnackbar('KPI master saved.', { variant: 'success' });
      setMasterOpen(false);
      await loadInitial();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to save KPI master.', { variant: 'error' });
    }
  };

  const removeMaster = async (code: string) => {
    try {
      await kpiApi.removeMaster(code);
      enqueueSnackbar('KPI master deleted.', { variant: 'success' });
      await loadInitial();
      await loadMonitoring();
      await loadDashboard();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to delete KPI master.', { variant: 'error' });
    }
  };

  const openCreateMonitoring = () => {
    setMonitoringEditingId(null);
    setMonitoringForm({
      kpiMasterCode: masters[0]?.code || '',
      unitId: availableUnits[0]?.id || 0,
      periodYear,
      periodMonth: effectiveMonth,
      actualValue: 0,
      remarks: '',
      status: 'draft',
    });
    setMonitoringOpen(true);
  };

  const openEditMonitoring = (row: KpiMonitoringRecord) => {
    setMonitoringEditingId(row.id);
    setMonitoringForm({
      kpiMasterCode: row.kpiMasterCode,
      unitId: row.unitId,
      periodYear: row.periodYear,
      periodMonth: row.periodMonth,
      actualValue: Number(row.actualValue),
      remarks: row.remarks || '',
      status: row.status,
    });
    setMonitoringOpen(true);
  };

  const saveMonitoring = async () => {
    try {
      if (!monitoringForm.kpiMasterCode || !monitoringForm.unitId) {
        enqueueSnackbar('KPI and unit are required.', { variant: 'warning' });
        return;
      }

      if (monitoringEditingId) {
        await kpiApi.updateMonitoring(monitoringEditingId, {
          actualValue: monitoringForm.actualValue,
          remarks: monitoringForm.remarks,
          status: monitoringForm.status,
        });
      } else {
        await kpiApi.upsertMonitoring(monitoringForm);
      }

      enqueueSnackbar('KPI monitoring saved.', { variant: 'success' });
      setMonitoringOpen(false);
      await loadMonitoring();
      await loadDashboard();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to save KPI monitoring row.', { variant: 'error' });
    }
  };

  const lockMonitoring = async (id: number) => {
    try {
      await kpiApi.lockMonitoring(id);
      enqueueSnackbar('KPI monitoring row locked.', { variant: 'success' });
      await loadMonitoring();
      await loadDashboard();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to lock KPI monitoring row.', { variant: 'error' });
    }
  };

  const openUnitDashboard = async (unitId: number) => {
    if (!Number.isFinite(unitId) || !Number.isFinite(periodYear) || !Number.isFinite(effectiveMonth)) return;
    try {
      selectedUnitIdRef.current = unitId;
      const { fromYear, fromMonth, toYear, toMonth } = getTimeseriesRange(
        viewFrequency, periodYear, effectiveMonth, periodQuarter, periodSemester,
      );
      const [detail, tseries] = await Promise.all([
        kpiApi.dashboardUnit(unitId, periodYear, effectiveMonth),
        kpiApi.dashboardUnitTimeseries(unitId, fromYear, fromMonth, toYear, toMonth),
      ]);
      setSelectedUnitDashboard(detail);
      setUnitTimeseries(tseries);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to load unit KPI dashboard.', { variant: 'error' });
    }
  };

  const unitScoreChart = (summary?.units || []).map((unit) => ({
    name: unit.unitName.length > 16 ? unit.unitName.substring(0, 15) + '\u2026' : unit.unitName,
    fullName: unit.unitName,
    score: Number(unit.score || 0),
    band: String(unit.band || 'unclassified').toLowerCase(),
  }));

  // Multi-line chart data for Unit KPI Scores: { label, u<unitId>: score|null } per period.
  const allUnitsLineData = useMemo(() => {
    const unitList = summary?.units || [];
    if (unitList.length === 0) return [];
    const firstTs = allUnitsTimeseries[unitList[0].unitId] || [];
    if (firstTs.length === 0) return [];
    const { fromYear, fromMonth } = getTimeseriesRange(viewFrequency, periodYear, effectiveMonth, periodQuarter, periodSemester);
    return firstTs.map((pt) => {
      const label = getXAxisLabel(pt, viewFrequency, periodYear, periodQuarter, periodSemester, fromYear, fromMonth);
      const datum: Record<string, any> = { label };
      unitList.forEach((unit) => {
        const ts = allUnitsTimeseries[unit.unitId] || [];
        const match = ts.find((p) => p.periodYear === pt.periodYear && p.periodMonth === pt.periodMonth);
        datum[`u${unit.unitId}`] = match?.hasData ? match.score : null;
      });
      return datum;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allUnitsTimeseries, summary, viewFrequency, periodYear, effectiveMonth, periodQuarter, periodSemester]);

  // KPI detail multi-line chart: { label, [kpiCode]: score|null } per period.
  const kpiDetailLineData = useMemo(() => {
    if (unitTimeseries.length === 0) return { data: [] as Record<string, any>[], codes: [] as string[] };
    const codes = [...new Set(unitTimeseries.flatMap((pt) => (pt.kpiScores || []).map((k) => k.code)))];
    const { fromYear, fromMonth } = getTimeseriesRange(viewFrequency, periodYear, effectiveMonth, periodQuarter, periodSemester);
    const data = unitTimeseries.map((pt) => {
      const label = getXAxisLabel(pt, viewFrequency, periodYear, periodQuarter, periodSemester, fromYear, fromMonth);
      const datum: Record<string, any> = { label };
      codes.forEach((code) => {
        const kp = (pt.kpiScores || []).find((k) => k.code === code);
        datum[code] = pt.hasData && kp ? kp.normalizedScore : null;
      });
      return datum;
    });
    return { data, codes };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitTimeseries, viewFrequency, periodYear, effectiveMonth, periodQuarter, periodSemester]);

  const bandDistribution = Object.values(
    (summary?.units || []).reduce((acc, unit) => {
      const band = String(unit.band || 'unclassified').toLowerCase();
      if (!acc[band]) acc[band] = { name: band.toUpperCase(), value: 0 };
      acc[band].value += 1;
      return acc;
    }, {} as Record<string, { name: string; value: number }>),
  );

  const overallBand = computeBand(Number(summary?.summary.overallScore ?? 0), summary?.thresholds || []);
  const overallBandColor = BAND_COLORS[overallBand] || BAND_COLORS.unclassified;

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>KPI Monitoring & Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">
          KPI Master defines targets and weights. KPI Monitoring captures periodic values. KPI Dashboard computes normalized unit performance.
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={2}>
              <TextField
                label="Period Year"
                type="number"
                value={periodYear}
                onChange={(e) => setPeriodYear(Number(e.target.value))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                select
                label="Frequency"
                value={viewFrequency}
                onChange={(e) => setViewFrequency(e.target.value as 'monthly' | 'quarterly' | 'semestral' | 'annual')}
                fullWidth
              >
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="semestral">Semestral</MenuItem>
                <MenuItem value="annual">Annual</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              {viewFrequency === 'monthly' && (
                <TextField select label="Period Month" value={periodMonth} onChange={(e) => setPeriodMonth(Number(e.target.value))} fullWidth>
                  {monthOptions.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                </TextField>
              )}
              {viewFrequency === 'quarterly' && (
                <TextField select label="Quarter" value={periodQuarter} onChange={(e) => setPeriodQuarter(Number(e.target.value) as 1 | 2 | 3 | 4)} fullWidth>
                  <MenuItem value={1}>Q1 (Jan–Mar)</MenuItem>
                  <MenuItem value={2}>Q2 (Apr–Jun)</MenuItem>
                  <MenuItem value={3}>Q3 (Jul–Sep)</MenuItem>
                  <MenuItem value={4}>Q4 (Oct–Dec)</MenuItem>
                </TextField>
              )}
              {viewFrequency === 'semestral' && (
                <TextField select label="Semester" value={periodSemester} onChange={(e) => setPeriodSemester(Number(e.target.value) as 1 | 2)} fullWidth>
                  <MenuItem value={1}>H1 (Jan–Jun)</MenuItem>
                  <MenuItem value={2}>H2 (Jul–Dec)</MenuItem>
                </TextField>
              )}
              {viewFrequency === 'annual' && (
                <Box sx={{ pt: 2 }}><Typography variant="body2" color="text.secondary">Full year {periodYear} — reporting month: Dec</Typography></Box>
              )}
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Unit Filter"
                value={filterUnitId}
                onChange={(e) => setFilterUnitId(e.target.value === '' ? '' : Number(e.target.value))}
                fullWidth
              >
                <MenuItem value="">All allowed units</MenuItem>
                {availableUnits.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button fullWidth variant="outlined" onClick={() => { loadMonitoring(); loadDashboard(); }} sx={{ height: '56px' }}>
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
        <Tab label="KPI Dashboard" />
        {canManage && <Tab label="KPI Master" />}
        {canManage && <Tab label="KPI Monitoring" />}
      </Tabs>

      {canManage && tab === 1 && (
        <Card>
          <CardHeader
            title="KPI Master"
            action={<Button variant="contained" onClick={openCreateMaster}>Add KPI</Button>}
          />
          <CardContent>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Direction</TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell>Weight</TableCell>
                  <TableCell>Frequency</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {masters.map((row) => (
                  <TableRow key={row.code}>
                    <TableCell>{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.unit?.name || row.unitId}</TableCell>
                    <TableCell>{typeLabels[row.type]}</TableCell>
                    <TableCell>{directionLabels[row.direction]}</TableCell>
                    <TableCell>{row.targetValue}</TableCell>
                    <TableCell>{row.weight}</TableCell>
                    <TableCell>{row.frequency}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => openEditMaster(row)}>Edit</Button>
                      <Button size="small" color="error" onClick={() => removeMaster(row.code)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {canManage && tab === 2 && (
        <Card>
          <CardHeader
            title="KPI Monitoring"
            action={<Button variant="contained" onClick={openCreateMonitoring}>Encode KPI</Button>}
          />
          <CardContent>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>KPI</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell>Actual</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Entered By</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {monitoring.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.kpiMasterCode} - {row.kpiMaster?.name}</TableCell>
                    <TableCell>{row.unit?.name || row.unitId}</TableCell>
                    <TableCell>{row.periodYear}-{String(row.periodMonth).padStart(2, '0')}</TableCell>
                    <TableCell>{row.actualValue}</TableCell>
                    <TableCell>
                      <Chip label={row.status.toUpperCase()} size="small" color={row.status === 'locked' ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell>{row.enteredByStaffId || ''} {row.enteredByName ? `- ${row.enteredByName}` : ''}</TableCell>
                    <TableCell align="right">
                      {row.status !== 'locked' && <Button size="small" onClick={() => openEditMonitoring(row)}>Edit</Button>}
                      {row.status !== 'locked' && <Button size="small" color="warning" onClick={() => lockMonitoring(row.id)}>Lock</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 0 && (
        <Grid container spacing={2}>
          {/* ── Scorecard row ── */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="overline" color="text.secondary">Overall KPI Score</Typography>
                <Typography variant="h3" fontWeight={700}>{summary?.summary.overallScore ?? 0}</Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(Number(summary?.summary.overallScore ?? 0), 100)}
                  sx={{ mt: 1, height: 8, borderRadius: 4, bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': { bgcolor: '#1976d2' } }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderLeft: '6px solid #1976d2' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">Units in Dashboard</Typography>
                <Typography variant="h3" fontWeight={700}>{summary?.summary.unitCount ?? 0}</Typography>
                <Typography variant="caption" color="text.secondary">Units with at least one KPI entry</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderLeft: '6px solid #0288d1' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">Monitoring Rows</Typography>
                <Typography variant="h3" fontWeight={700}>{summary?.summary.rowCount ?? 0}</Typography>
                <Typography variant="caption" color="text.secondary">KPI entries for this period</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* ── Band Color Legend ── */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', px: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, fontWeight: 600 }}>KPI Band Scale:</Typography>
              {(summary?.thresholds?.length
                ? summary.thresholds
                : [
                    { band: 'green', minScore: 90, maxScore: 100 },
                    { band: 'amber', minScore: 75, maxScore: 89 },
                    { band: 'red', minScore: 0, maxScore: 74 },
                  ]
              ).map((t) => (
                <Chip
                  key={t.band}
                  size="small"
                  label={`${t.minScore}–${t.maxScore}`}
                  sx={{ bgcolor: BAND_COLORS[String(t.band).toLowerCase()] || BAND_COLORS.unclassified, color: '#fff', fontWeight: 600, fontSize: 11 }}
                />
              ))}
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Unit KPI Scores" subheader="Scoreboard view by unit — click a unit row to drilling into individual KPIs" />
              <CardContent>
                {allUnitsLineData.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">No KPI monitoring data for this period. Encode values in KPI Monitoring tab.</Typography>
                  </Box>
                ) : (
                  <Box sx={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                      <LineChart data={allUnitsLineData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(val: any) => val != null ? [`${val}`, 'Score'] : ['—', 'No data']} />
                        <Legend />
                        {(summary?.units || []).map((unit, idx) => (
                            <Line
                              key={unit.unitId}
                              type="monotone"
                              dataKey={`u${unit.unitId}`}
                              name={unit.unitName}
                              stroke={UNIT_COLORS[idx % UNIT_COLORS.length]}
                              strokeWidth={2}
                              connectNulls={false}
                              dot={{ r: 4, strokeWidth: 1.5 }}
                              activeDot={{ r: 6 }}
                            />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                )}

                <Divider sx={{ my: 1 }} />
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Unit</TableCell>
                      <TableCell sx={{ width: 32, p: 0 }}>Color</TableCell>
                      <TableCell>Score</TableCell>
                      <TableCell>Trend</TableCell>
                      <TableCell># KPIs</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(summary?.units || []).map((unit, idx) => {
                      const ts = allUnitsTimeseries[unit.unitId] || [];
                      const firstHasData = ts.find((p) => p.hasData);
                      const lastHasData = [...ts].reverse().find((p) => p.hasData);
                      const prevScore = firstHasData ? firstHasData.score : null;
                      const currScore = lastHasData ? lastHasData.score : Number(unit.score || 0);
                      const bandKey = String(unit.band || 'unclassified').toLowerCase();
                      const unitColor = UNIT_COLORS[idx % UNIT_COLORS.length];
                      return (
                        <TableRow key={unit.unitId} hover sx={{ cursor: 'pointer' }} onClick={() => openUnitDashboard(unit.unitId)}>
                          <TableCell>{unit.unitName}</TableCell>
                          <TableCell sx={{ p: 1 }}>
                            <Box sx={{ width: 20, height: 20, borderRadius: '4px', bgcolor: unitColor }} />
                          </TableCell>
                          <TableCell><strong>{unit.score}</strong></TableCell>
                          <TableCell>
                            <TrendSparkline prev={prevScore} current={currScore} band={bandKey} />
                          </TableCell>
                          <TableCell>{unit.kpiCount}</TableCell>
                        </TableRow>
                      );
                    })}
                    {(summary?.units || []).length === 0 && (
                      <TableRow><TableCell colSpan={5} align="center"><Typography variant="caption" color="text.secondary">No unit data.</Typography></TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader
                title={selectedUnitDashboard ? `Unit Detail — ${selectedUnitDashboard.unitName}` : 'Unit Detail'}
                subheader={selectedUnitDashboard ? `Composite Score: ${selectedUnitDashboard.score} • Band: ${selectedUnitDashboard.band}` : 'Click a unit row to view KPI breakdown'}
              />
              <CardContent>
                {!selectedUnitDashboard ? (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Select a unit from the left table to drill into its KPI-level detail.</Typography>
                  </Box>
                ) : (
                  <>
                    {kpiDetailLineData.data.length === 0 ? (
                      <Box sx={{ py: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">No trend data for this unit/period.</Typography>
                      </Box>
                    ) : (
                      <Box sx={{ width: '100%', height: 240, mb: 2 }}>
                        <ResponsiveContainer>
                          <LineChart data={kpiDetailLineData.data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(val: any) => val != null ? [`${val}`, 'Score'] : ['—', 'No data']} />
                            <Legend />
                            {kpiDetailLineData.codes.map((code, idx) => (
                              <Line
                                key={code}
                                type="monotone"
                                dataKey={code}
                                name={code}
                                stroke={UNIT_COLORS[idx % UNIT_COLORS.length]}
                                strokeWidth={2}
                                connectNulls={false}
                                dot={{ r: 4, strokeWidth: 1.5 }}
                                activeDot={{ r: 6 }}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                    )}
                    <Divider sx={{ my: 1 }} />
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>KPI</TableCell>
                          <TableCell sx={{ width: 32, p: 0 }}>Color</TableCell>
                          <TableCell>Actual</TableCell>
                          <TableCell>Target</TableCell>
                          <TableCell>Score</TableCell>
                          <TableCell>Trend</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedUnitDashboard.details.map((item, idx) => {
                          const firstPt = unitTimeseries.find((pt) => pt.hasData && pt.kpiScores?.some((k) => k.code === item.code));
                          const lastPt = [...unitTimeseries].reverse().find((pt) => pt.hasData && pt.kpiScores?.some((k) => k.code === item.code));
                          const prevScore = firstPt?.kpiScores?.find((k) => k.code === item.code)?.normalizedScore ?? null;
                          const currScore = lastPt?.kpiScores?.find((k) => k.code === item.code)?.normalizedScore ?? item.normalizedScore;
                          const kpiColor = UNIT_COLORS[idx % UNIT_COLORS.length];
                          return (
                            <TableRow key={item.id}>
                              <TableCell>{item.code}</TableCell>
                              <TableCell sx={{ p: 1 }}>
                                <Box sx={{ width: 20, height: 20, borderRadius: '4px', bgcolor: kpiColor }} />
                              </TableCell>
                              <TableCell>{item.actualValue}</TableCell>
                              <TableCell>{item.targetValue}</TableCell>
                              <TableCell><strong>{item.normalizedScore}</strong></TableCell>
                              <TableCell>
                                <TrendSparkline prev={prevScore} current={currScore} band={String(item.band || 'unclassified').toLowerCase()} />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader title="Band Distribution" subheader="Units by performance band" />
              <CardContent>
                {bandDistribution.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">No band data for this period.</Typography>
                  </Box>
                ) : (
                  <Box sx={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={bandDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          labelLine={false}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return (
                              <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={700}>
                                {value}
                              </text>
                            );
                          }}
                        >
                          {bandDistribution.map((entry, index) => (
                            <Cell key={`pie-${index}`} fill={BAND_COLORS[String(entry.name).toLowerCase()] || BAND_COLORS.unclassified} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Dialog open={masterOpen} onClose={() => setMasterOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{masterEditingCode ? 'Edit KPI Master' : 'Create KPI Master'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Code"
                value={masterForm.code}
                onChange={(e) => setMasterForm((prev) => ({ ...prev, code: e.target.value }))}
                fullWidth
                disabled={Boolean(masterEditingCode)}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField label="KPI Name" value={masterForm.name} onChange={(e) => setMasterForm((prev) => ({ ...prev, name: e.target.value }))} fullWidth />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Description" value={masterForm.description} onChange={(e) => setMasterForm((prev) => ({ ...prev, description: e.target.value }))} fullWidth multiline minRows={2} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select label="Unit" value={masterForm.unitId} onChange={(e) => setMasterForm((prev) => ({ ...prev, unitId: Number(e.target.value) }))} fullWidth>
                {availableUnits.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select label="Type" value={masterForm.type} onChange={(e) => setMasterForm((prev) => ({ ...prev, type: e.target.value as KpiType }))} fullWidth>
                <MenuItem value="measurement">Measurement</MenuItem>
                <MenuItem value="yes_no">Yes/No</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Unit of Measure" value={masterForm.unitOfMeasure} onChange={(e) => setMasterForm((prev) => ({ ...prev, unitOfMeasure: e.target.value }))} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select label="Direction" value={masterForm.direction} onChange={(e) => setMasterForm((prev) => ({ ...prev, direction: e.target.value as KpiDirection }))} fullWidth>
                <MenuItem value="higher_is_better">Higher is better</MenuItem>
                <MenuItem value="lower_is_better">Lower is better</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField type="number" label="Target Value" value={masterForm.targetValue} onChange={(e) => setMasterForm((prev) => ({ ...prev, targetValue: Number(e.target.value) }))} fullWidth />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField type="number" label="Weight" value={masterForm.weight} onChange={(e) => setMasterForm((prev) => ({ ...prev, weight: Number(e.target.value) }))} fullWidth />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField select label="Frequency" value={masterForm.frequency} onChange={(e) => setMasterForm((prev) => ({ ...prev, frequency: e.target.value as KpiFrequency }))} fullWidth>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="semestral">Semestral</MenuItem>
                <MenuItem value="annual">Annual</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMasterOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveMaster}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={monitoringOpen} onClose={() => setMonitoringOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{monitoringEditingId ? 'Edit KPI Monitoring' : 'Encode KPI Monitoring'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>KPI</InputLabel>
                <Select
                  value={monitoringForm.kpiMasterCode}
                  label="KPI"
                  onChange={(e) => setMonitoringForm((prev) => ({ ...prev, kpiMasterCode: e.target.value }))}
                  disabled={Boolean(monitoringEditingId)}
                >
                  {masters.map((kpi) => <MenuItem key={kpi.code} value={kpi.code}>{kpi.code} - {kpi.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select label="Unit" value={monitoringForm.unitId} onChange={(e) => setMonitoringForm((prev) => ({ ...prev, unitId: Number(e.target.value) }))} fullWidth disabled={Boolean(monitoringEditingId)}>
                {availableUnits.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField type="number" label="Period Year" value={monitoringForm.periodYear} onChange={(e) => setMonitoringForm((prev) => ({ ...prev, periodYear: Number(e.target.value) }))} fullWidth disabled={Boolean(monitoringEditingId)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select label="Period Month" value={monitoringForm.periodMonth} onChange={(e) => setMonitoringForm((prev) => ({ ...prev, periodMonth: Number(e.target.value) }))} fullWidth disabled={Boolean(monitoringEditingId)}>
                {monthOptions.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField type="number" label="Actual Value" value={monitoringForm.actualValue} onChange={(e) => setMonitoringForm((prev) => ({ ...prev, actualValue: Number(e.target.value) }))} fullWidth />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Remarks" value={monitoringForm.remarks} onChange={(e) => setMonitoringForm((prev) => ({ ...prev, remarks: e.target.value }))} fullWidth multiline minRows={2} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select label="Status" value={monitoringForm.status} onChange={(e) => setMonitoringForm((prev) => ({ ...prev, status: e.target.value as KpiMonitoringStatus }))} fullWidth>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="locked">Locked</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMonitoringOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveMonitoring}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
