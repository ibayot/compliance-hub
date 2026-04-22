'use client';

import React, { useRef, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  Print as PrintIcon,
  Assessment as ReportIcon,
  TrendingUp as TrendingUpIcon,
  InsertDriveFile as DocIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { kpiApi, KpiDirection } from '@/lib/api/kpi';
import { documentsApi } from '@/lib/api/documents';
import { unitsApi } from '@/lib/api/units';
import { metricsApi } from '@/lib/api/metrics';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types/auth';
import { KpiMasterRecord, UnitTimeseriesPoint } from '@/lib/api/kpi';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const UNIT_COLORS: string[] = [
  '#1565c0', '#6a1b9a', '#00695c', '#e65100',
  '#558b2f', '#4527a0', '#ad1457', '#00838f',
];

const BAND_COLORS: Record<string, string> = {
  green: '#2e7d32',
  amber: '#ed6c02',
  red: '#d32f2f',
  unclassified: '#546e7a',
};

const STATUS_COLOR: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  pending: 'warning',
  processing: 'info',
  ready: 'success',
  failed: 'error',
};

const COMPLIANCE_COLOR: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  compliant: 'success',
  non_compliant: 'error',
  needs_revision: 'warning',
};

function getBandChipColor(band: string): 'error' | 'warning' | 'success' | 'info' | 'default' {
  if (!band) return 'default';
  const b = band.toLowerCase();
  if (b === 'red' || b.includes('poor') || b.includes('critical')) return 'error';
  if (b === 'green' || b.includes('good') || b.includes('excellent')) return 'success';
  if (b === 'amber' || b.includes('fair') || b.includes('average') || b.includes('yellow')) return 'warning';
  return 'info';
}

/** Sparkline identical to KPI module trend column; supports multi-point zigzag via `points`. */
function TrendSparkline({ prev, current, band, points }: { prev: number | null; current: number | null; band: string; points?: number[] }) {
  const color = BAND_COLORS[band] || BAND_COLORS.unclassified;
  const w = 60; const h = 24; const pad = 5;
  const fallbackSeries = [prev !== null ? prev : 0, current !== null ? current : 0];
  const series = (points && points.length > 0 ? points : fallbackSeries).map((v) => Math.min(100, Math.max(0, Number(v))));
  const toY = (v: number) => h - pad - (Math.min(100, Math.max(0, v)) / 100) * (h - 2 * pad);
  const xFor = (idx: number) => {
    if (series.length <= 1) return pad;
    return pad + (idx / (series.length - 1)) * ((w - pad) - pad);
  };
  const pathPoints = series.map((val, idx) => `${xFor(idx)},${toY(val)}`).join(' ');
  const startX = xFor(0);
  const startY = toY(series[0] ?? 0);
  const endX = xFor(series.length - 1);
  const endY = toY(series[series.length - 1] ?? 0);
  const prevIdx = Math.max(0, series.length - 2);
  const prevX = xFor(prevIdx);
  const prevY = toY(series[prevIdx] ?? (series[series.length - 1] ?? 0));
  const angle = Math.atan2(endY - prevY, endX - prevX) * (180 / Math.PI);
  const startColor = points && points.length > 0 ? color : (prev !== null ? color : '#b0bec5');
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      <polyline points={pathPoints} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={startX} cy={startY} r={3} fill={startColor} stroke="#fff" strokeWidth={1} />
      <polygon
        points="-6,-4 0,0 -6,4"
        transform={`translate(${endX},${endY}) rotate(${angle})`}
        fill={color}
      />
    </svg>
  );
}

function DirectionIndicator({ direction }: { direction?: KpiDirection | null }) {
  if (direction === 'higher_is_better') {
    return <Typography variant="caption" color="success.main">↑</Typography>;
  }
  if (direction === 'lower_is_better') {
    return <Typography variant="caption" color="info.main">↓</Typography>;
  }
  return <Typography variant="caption" color="text.secondary">—</Typography>;
}

type Frequency = 'monthly' | 'quarterly' | 'semestral' | 'annual';

interface ReportParams {
  year: number;
  frequency: Frequency;
  month: number;
  quarter: number;
  semester: number;
  unitId: string;
  unitName: string;
}

type ReportSeriesDatum = { label: string } & Record<string, number | null | string>;
type UnitTimeseriesMap = Record<number, UnitTimeseriesPoint[]>;

const SAFE_KEY_BLOCKLIST = new Set(['__proto__', 'prototype', 'constructor']);

function toSafeDataKey(prefix: string, value: string | number): string {
  const normalized = String(value).replace(/[^a-zA-Z0-9_]/g, '_');
  if (!normalized || SAFE_KEY_BLOCKLIST.has(normalized)) {
    return `${prefix}_invalid`;
  }
  return `${prefix}_${normalized}`;
}

function getPeriodLabel(p: ReportParams): string {
  switch (p.frequency) {
    case 'monthly': return `${MONTH_NAMES[p.month - 1]} ${p.year}`;
    case 'quarterly': {
      const s = (p.quarter - 1) * 3 + 1;
      const e = p.quarter * 3;
      return `Q${p.quarter} ${p.year} (${MONTH_ABBR[s - 1]}–${MONTH_ABBR[e - 1]})`;
    }
    case 'semestral': {
      const s = (p.semester - 1) * 6 + 1;
      const e = p.semester * 6;
      return `H${p.semester} ${p.year} (${MONTH_ABBR[s - 1]}–${MONTH_ABBR[e - 1]})`;
    }
    case 'annual': return `Annual ${p.year}`;
    default: return `${MONTH_NAMES[p.month - 1]} ${p.year}`;
  }
}

function getTimeseriesRange(p: ReportParams) {
  const { year, frequency, month, quarter, semester } = p;
  switch (frequency) {
    case 'monthly':
      // Monthly shows previous month -> selected month.
      if (month > 1) {
        return { fromYear: year, fromMonth: month - 1, toYear: year, toMonth: month };
      }
      return { fromYear: year, fromMonth: 1, toYear: year, toMonth: 1 };
    case 'quarterly': {
      const quarterStart = (quarter - 1) * 3 + 1;
      return { fromYear: year, fromMonth: quarter > 1 ? quarterStart - 1 : quarterStart, toYear: year, toMonth: quarter * 3 };
    }
    case 'semestral': {
      const semStart = (semester - 1) * 6 + 1;
      return { fromYear: year, fromMonth: semester > 1 ? semStart - 1 : semStart, toYear: year, toMonth: semester * 6 };
    }
    case 'annual':
      return { fromYear: year, fromMonth: 1, toYear: year, toMonth: 12 };
  }
}

function getXAxisLabel(periodMonth: number, frequency: Frequency): string {
  const abbr = MONTH_ABBR[periodMonth - 1];
  switch (frequency) {
    case 'monthly':
      return abbr;
    case 'quarterly': {
      const q = Math.ceil(periodMonth / 3);
      const rel = ((periodMonth - 1) % 3) + 1;
      return `Q${q}-${rel}`;
    }
    case 'semestral': {
      const h = periodMonth <= 6 ? 1 : 2;
      const rel = ((periodMonth - 1) % 6) + 1;
      return `H${h}-${rel}`;
    }
    case 'annual':
      return abbr;
    default:
      return abbr;
  }
}

function ReportView({ params }: { params: ReportParams }) {
  const { year, frequency, month, quarter, semester, unitId, unitName } = params;
  const reportRef = useRef<HTMLDivElement>(null);

  const effectiveMonth =
    frequency === 'quarterly' ? quarter * 3 :
    frequency === 'semestral' ? semester * 6 :
    frequency === 'annual' ? 12 : month;

  const periodLabel = getPeriodLabel(params);
  const tsRange = getTimeseriesRange(params);

  // ── Data queries (all hooks before any conditional returns) ──────────────────

  const kpiQuery = useQuery({
    queryKey: ['report-kpi', year, effectiveMonth],
    queryFn: () => kpiApi.dashboardSummary(year, effectiveMonth),
  });

  const unitsQuery = useQuery({
    queryKey: ['report-units-all'],
    queryFn: () => unitsApi.listUnits({ page: 1, limit: 200 }),
  });

  const mastersQuery = useQuery({
    queryKey: ['report-kpi-masters'],
    queryFn: () => kpiApi.listMaster(),
  });

  // Unit-specific dashboard + timeseries (when a single unit is selected)
  const unitDashQuery = useQuery({
    queryKey: ['report-kpi-unit', unitId, year, effectiveMonth],
    queryFn: () => kpiApi.dashboardUnit(Number(unitId), year, effectiveMonth),
    enabled: Boolean(unitId),
  });

  const unitTsQuery = useQuery({
    queryKey: ['report-kpi-unit-ts', unitId, year, effectiveMonth, frequency],
    queryFn: () =>
      kpiApi.dashboardUnitTimeseries(
        Number(unitId),
        // tsRange.fromMonth is 1 for monthly (Jan → selectedMonth) and the period
        // start for quarterly/semestral/annual.
        tsRange.fromYear, tsRange.fromMonth,
        tsRange.toYear, tsRange.toMonth,
      ),
    enabled: Boolean(unitId),
  });

  // All units should always be shown in all-units mode, even with incomplete data.
  const allUnits = useMemo(() => unitsQuery.data?.data ?? [], [unitsQuery.data]);

  const allUnitsTsQuery = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['report-all-units-ts', allUnits.map((u) => u.id), year, effectiveMonth, frequency],
    queryFn: async () => {
      if (allUnits.length === 0) return {} as UnitTimeseriesMap;
      const results = await Promise.all(
        allUnits.map((u) =>
          kpiApi.dashboardUnitTimeseries(
            Number(u.id),
            tsRange.fromYear, tsRange.fromMonth,
            tsRange.toYear, tsRange.toMonth,
          ),
        ),
      );
      const map: UnitTimeseriesMap = {};
      allUnits.forEach((u, i) => { map[Number(u.id)] = results[i]; });
      return map;
    },
    enabled: !unitId && allUnits.length > 0,
  });

  const docsQuery = useQuery({
    queryKey: ['report-docs', year, unitId],
    queryFn: () =>
      documentsApi.listDocuments({
        year: String(year),
        unit_id: unitId || undefined,
        limit: 200,
      }),
  });

  const metricsQuery = useQuery({
    queryKey: ['report-metrics-templates'],
    queryFn: () => metricsApi.listTemplates(),
  });

  const actionPlansQuery = useQuery({
    queryKey: ['report-kpi-action-plans', year, effectiveMonth, unitId],
    queryFn: () => kpiApi.actionPlans(year, effectiveMonth, unitId ? Number(unitId) : undefined),
  });

  // ── Derived / computed ────────────────────────────────────────────────────────

  /** Multi-line chart data for "all units" view */
  const allUnitsLineData = useMemo(() => {
    const allTs = allUnitsTsQuery.data;
    if (!allTs || Object.keys(allTs).length === 0) return [];
    const periodMap = new Map<string, { periodYear: number; periodMonth: number }>();
    Object.values(allTs).forEach((pts) => {
      (pts || []).forEach((pt) => {
        const key = `${pt.periodYear}-${String(pt.periodMonth).padStart(2, '0')}`;
        if (!periodMap.has(key)) periodMap.set(key, { periodYear: pt.periodYear, periodMonth: pt.periodMonth });
      });
    });
    const sorted = [...periodMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
    const mapped = sorted.map(({ periodYear, periodMonth }) => {
      const datum: ReportSeriesDatum = { label: getXAxisLabel(periodMonth, frequency) };
      allUnits.forEach((u) => {
        const unitIdNum = Number(u.id);
        const pts: UnitTimeseriesPoint[] = allTs[unitIdNum] || [];
        const pt = pts.find((p) => p.periodYear === periodYear && p.periodMonth === periodMonth);
        datum[toSafeDataKey('u', unitIdNum)] = pt?.hasData ? pt.score : null;
      });
      return datum;
    });
    // For units with no data at the first visible period but with data later,
    // inject 0 at that first point so the line draws from 0 → first-actual.
    if (mapped.length > 0) {
      const first = { ...mapped[0] };
      allUnits.forEach((u) => {
        const key = toSafeDataKey('u', Number(u.id));
        if (first[key] === null) {
          const hasLater = mapped.slice(1).some((d) => d[key] !== null);
          if (hasLater) first[key] = 0;
        }
      });
      const adjusted = [first, ...mapped.slice(1)];
      const shouldPrependZero =
        frequency === 'annual'
        || (frequency === 'monthly' && month === 1)
        || (frequency === 'quarterly' && quarter === 1)
        || (frequency === 'semestral' && semester === 1);
      if (shouldPrependZero) {
        const zeroAnchor: ReportSeriesDatum = { label: '' };
        allUnits.forEach((u) => { zeroAnchor[toSafeDataKey('u', Number(u.id))] = 0; });
        return [zeroAnchor, ...adjusted];
      }
      return adjusted;
    }
    return mapped;
  }, [allUnitsTsQuery.data, allUnits, frequency, month, quarter, semester]);

  /** KPI detail line data for a single selected unit */
  const kpiDetailLineData = useMemo(() => {
    const ts: UnitTimeseriesPoint[] = unitTsQuery.data || [];
    if (ts.length === 0) return { data: [] as ReportSeriesDatum[], codes: [] as string[], keyByCode: {} as Record<string, string> };
    const codes = [...new Set(ts.flatMap((pt) => (pt.kpiScores || []).map((k) => k.code)))];
    const keyByCode = codes.reduce<Record<string, string>>((acc, code) => {
      acc[code] = toSafeDataKey('k', code);
      return acc;
    }, {});
    const data = ts.map((pt) => {
      const datum: ReportSeriesDatum = { label: getXAxisLabel(pt.periodMonth, frequency) };
      codes.forEach((code) => {
        const kp = (pt.kpiScores || []).find((k) => k.code === code);
        datum[keyByCode[code]] = pt.hasData && kp ? kp.normalizedScore : null;
      });
      return datum;
    });
    // For KPIs with no data at the first visible period but with data later,
    // inject 0 at that first point so the line draws from 0 → first-actual.
    if (data.length > 0) {
      const first = { ...data[0] };
      codes.forEach((code) => {
        const key = keyByCode[code];
        if (first[key] === null) {
          const hasLater = data.slice(1).some((d) => d[key] !== null);
          if (hasLater) first[key] = 0;
        }
      });
      const adjusted = [first, ...data.slice(1)];
      const shouldPrependZero =
        frequency === 'annual'
        || (frequency === 'monthly' && month === 1)
        || (frequency === 'quarterly' && quarter === 1)
        || (frequency === 'semestral' && semester === 1);
      if (shouldPrependZero) {
        const zeroAnchor: ReportSeriesDatum = { label: '' };
        codes.forEach((code) => { zeroAnchor[keyByCode[code]] = 0; });
        return { data: [zeroAnchor, ...adjusted], codes, keyByCode };
      }
      return { data: adjusted, codes, keyByCode };
    }
    return { data, codes, keyByCode };
  }, [unitTsQuery.data, frequency, month, quarter, semester]);

  const summaryUnits = useMemo(() => kpiQuery.data?.units ?? [], [kpiQuery.data]);
  const summaryUnitMap = useMemo(() => {
    const map: Record<number, { unitId: number; unitName: string; score: number; kpiCount: number; band: string }> = {};
    summaryUnits.forEach((u) => { map[u.unitId] = u; });
    return map;
  }, [summaryUnits]);

  const unitDetailRows = useMemo(() => {
    if (!unitDashQuery.data) return [] as Array<{
      id: number | string;
      code: string;
      name: string;
      direction: KpiDirection | null;
      targetValue: number | null;
      actualValue: number | null;
      normalizedScore: number | null;
      band: string;
      hasData: boolean;
    }>;
    const unitIdNum = Number(unitId);
    const detailMap = new Map(unitDashQuery.data.details.map((d) => [d.code, d]));
    const masters = (mastersQuery.data || []).filter((m: KpiMasterRecord) => Number(m.unitId) === unitIdNum && m.active);
    const rows = masters.map((m: KpiMasterRecord) => {
      const d = detailMap.get(m.code);
      return {
        id: d?.id ?? `master-${m.code}`,
        code: m.code,
        name: m.name,
        direction: d ? d.direction : m.direction,
        targetValue: d ? d.targetValue : Number(m.targetValue),
        actualValue: d ? d.actualValue : null,
        normalizedScore: d ? d.normalizedScore : null,
        band: String(d?.band || 'unclassified').toLowerCase(),
        hasData: Boolean(d),
      };
    });
    const masterCodes = new Set(masters.map((m: KpiMasterRecord) => m.code));
    const extras = unitDashQuery.data.details
      .filter((d) => !masterCodes.has(d.code))
      .map((d) => ({
        id: d.id,
        code: d.code,
        name: d.name,
        direction: d.direction,
        targetValue: d.targetValue,
        actualValue: d.actualValue,
        normalizedScore: d.normalizedScore,
        band: String(d.band || 'unclassified').toLowerCase(),
        hasData: true,
      }));
    return [...rows, ...extras];
  }, [unitDashQuery.data, mastersQuery.data, unitId]);

  const computeTrendValues = useMemo(() => {
    return (values: number[]) => {
      if (values.length === 0) return { prev: null as number | null, current: null as number | null };
      if (frequency === 'monthly') {
        if (values.length === 1) return { prev: null as number | null, current: values[0] };
        return { prev: values[0], current: values[values.length - 1] };
      }
      const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
      return { prev: values[0], current: Number(avg.toFixed(2)) };
    };
  }, [frequency]);

  /** KPIs needing attention: amber or red band, derived from existing timeseries data. */
  const kpisNeedingAttention = useMemo(() => {
    const items: Array<{
      unitName: string; code: string; name: string; score: number;
      band: string; actualValue: number;
    }> = [];
    if (unitId) {
      // Single-unit view: use dashboardUnit details
      const det = unitDashQuery.data;
      if (det?.details) {
        det.details
          .filter((d) => ['red', 'amber'].includes(String(d.band || '').toLowerCase()))
          .forEach((d) => items.push({
            unitName: det.unitName || unitName, code: d.code, name: d.name,
            score: d.normalizedScore, band: String(d.band).toLowerCase(), actualValue: d.actualValue,
          }));
      }
    } else if (allUnitsTsQuery.data) {
      // All-units view: use last hasData kpiScores per unit
      allUnits.forEach((u) => {
        const unitIdNum = Number(u.id);
        const pts: UnitTimeseriesPoint[] = allUnitsTsQuery.data[unitIdNum] || [];
        const lastPt = [...pts].reverse().find((p) => p.hasData);
        if (!lastPt) return;
        (lastPt.kpiScores || [])
          .filter((k) => ['red', 'amber'].includes(String(k.band || '').toLowerCase()))
          .forEach((k) => items.push({
            unitName: u.name, code: k.code, name: k.name,
            score: k.normalizedScore, band: String(k.band).toLowerCase(), actualValue: k.actualValue,
          }));
      });
    }
    return items;
  }, [unitId, unitDashQuery.data, unitName, allUnitsTsQuery.data, allUnits]);

  /** Metrics count keyed by document_type string */
  const metricsPerDocType = useMemo(() => {
    const map: Record<string, number> = {};
    (metricsQuery.data ?? []).forEach((tmpl) => {
      (tmpl.applicability || []).forEach((app) => {
        if (app.document_type) {
          map[app.document_type] = (map[app.document_type] || 0) + 1;
        }
      });
    });
    return map;
  }, [metricsQuery.data]);

  // ── Early returns ─────────────────────────────────────────────────────────────

  const loading = kpiQuery.isLoading || docsQuery.isLoading || unitsQuery.isLoading;
  const error = kpiQuery.isError || docsQuery.isError || unitsQuery.isError;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load report data. Please try again.
      </Alert>
    );
  }

  // ── Plain derived values (safe after hooks & early returns) ───────────────────

  const summary = kpiQuery.data?.summary;
  const kpiUnits = kpiQuery.data?.units ?? [];
  const docs = docsQuery.data?.data ?? [];

  const filteredKpiUnits = unitId
    ? kpiUnits.filter((u) => String(u.unitId) === unitId)
    : allUnits.map((u) => summaryUnitMap[Number(u.id)]).filter(Boolean);
  const allUnitsRows = allUnits;
  const filteredDocs = unitId ? docs.filter((d) => String(d.unit_id) === unitId) : docs;
  const unitDetail = unitDashQuery.data ?? null;

  const overallScore = Number(summary?.overallScore ?? 0);
  const overallBand = (() => {
    if (overallScore >= 80) return 'green';
    if (overallScore >= 50) return 'amber';
    return 'red';
  })();
  const overallBandColor = BAND_COLORS[overallBand] || BAND_COLORS.unclassified;

  // ── Print handler ─────────────────────────────────────────────────────────────

  const handlePrint = () => {
    const content = reportRef.current;
    if (!content) return;
    const win = window.open('', '_blank', 'width=960,height=720');
    if (!win) return;
    const doc = win.document;
    if (!doc.head || !doc.body) return;
    doc.title = `Consolidated Report - ${periodLabel}`;

    while (doc.body.firstChild) {
      doc.body.removeChild(doc.body.firstChild);
    }

    const style = doc.createElement('style');
    style.textContent = `
      body { font-family: Arial, sans-serif; padding: 28px; color: #222; }
      h1, h2, h3 { margin: 0 0 6px; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
      th, td { border: 1px solid #ccc; padding: 6px 10px; font-size: 12px; }
      th { background: #f4f4f4; font-weight: 600; }
      .score-cards { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
      .score-card { padding: 16px 28px; border: 2px solid #1976d2; border-radius: 8px; text-align: center; min-width: 120px; }
      .score-value { font-size: 2.2rem; font-weight: 700; color: #1976d2; }
      .score-label { font-size: 0.7rem; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
      .section-title { font-size: 1rem; font-weight: 700; margin: 20px 0 8px; border-bottom: 2px solid #1976d2; padding-bottom: 4px; }
      .no-data { padding: 10px 14px; background: #e3f2fd; border-left: 4px solid #1976d2; border-radius: 0 4px 4px 0; font-size: 13px; }
      .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 11px; color: #999; }
      svg { display: none !important; }
    `;
    doc.head.appendChild(style);

    const cloned = content.cloneNode(true) as HTMLElement;
    doc.body.appendChild(cloned);
    win.focus();
    win.print();
  };

  // ── JSX ───────────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Action bar */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
          Print / Export PDF
        </Button>
      </Box>

      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <div ref={reportRef}>

          {/* ── Report Header ── */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Consolidated Period Report
            </Typography>
            <Typography variant="h6" color="primary" fontWeight={500}>
              {periodLabel}
            </Typography>
            {unitId && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Unit: <strong>{unitName || `#${unitId}`}</strong>
              </Typography>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* ── Overall KPI Performance ── */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TrendingUpIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Overall KPI Performance
              </Typography>
            </Box>

            {summary ? (
              <Grid container spacing={2} sx={{ mb: 1 }}>
                {/* Card 1: Overall Score */}
                <Grid item xs={12} sm={4}>
                  <Card
                    elevation={0}
                    variant="outlined"
                    sx={{ textAlign: 'center', p: 2, borderColor: overallBandColor, borderWidth: 2 }}
                  >
                    <Typography variant="h3" fontWeight={700} sx={{ color: overallBandColor }}>
                      {overallScore.toFixed(1)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Overall Score
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(overallScore, 100)}
                      sx={{
                        mt: 1.5, height: 6, borderRadius: 3,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': { bgcolor: overallBandColor },
                      }}
                    />
                  </Card>
                </Grid>

                {/* Card 2: Unit name (specific) OR Units Reporting (all) */}
                <Grid item xs={12} sm={4}>
                  <Card elevation={0} variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                    {unitId ? (
                      <>
                        <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>
                          {unitName || `Unit #${unitId}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Reporting Unit
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
                          All Units
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Reporting Scope
                        </Typography>
                      </>
                    )}
                  </Card>
                </Grid>

                {/* Card 3: KPIs Monitored */}
                <Grid item xs={12} sm={4}>
                  <Card elevation={0} variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h3" fontWeight={700} color="text.secondary">
                      {summary.rowCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      KPIs Monitored
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            ) : (
              <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1, borderLeft: '4px solid #1976d2' }}>
                <Typography variant="body2">No KPI summary data available for {periodLabel}.</Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* ── KPI Scores by Unit ── */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TrendingUpIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                {unitId ? 'KPI Scores' : 'KPI Scores by Unit'}
              </Typography>
            </Box>

            {unitId ? (
              /* Single-unit: KPI detail trend chart + KPI breakdown table */
              <>
                {kpiDetailLineData.data.length > 0 ? (
                  <Box sx={{ width: '100%', height: 260, mb: 2 }}>
                    <ResponsiveContainer>
                      <LineChart data={kpiDetailLineData.data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(val: unknown) => val != null ? [`${val}`, 'Score'] : ['—', 'No data']} />
                        {kpiDetailLineData.codes.map((code, idx) => (
                          <Line
                            key={code}
                            type="monotone"
                            dataKey={kpiDetailLineData.keyByCode[code]}
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
                ) : null}

                {unitDetail && unitDetailRows.length > 0 ? (
                  <TableContainer component={Paper} elevation={0} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Color</TableCell>
                          <TableCell>KPI</TableCell>
                          <TableCell>Direction</TableCell>
                          <TableCell align="right">Actual</TableCell>
                          <TableCell align="right">Target</TableCell>
                          <TableCell align="right">Score</TableCell>
                          <TableCell>Trend</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {unitDetailRows.map((item, idx) => {
                          const visibleTrendValues = kpiDetailLineData.data
                            .map((d) => d[kpiDetailLineData.keyByCode[item.code] ?? toSafeDataKey('k', item.code)])
                            .filter((v) => v !== null && v !== undefined) as number[];
                          const trend = computeTrendValues(visibleTrendValues);
                          const prevKpiScore: number | null = trend.prev;
                          const currKpiScore = item.hasData ? (trend.current ?? item.normalizedScore) : null;
                          const kpiColor = UNIT_COLORS[idx % UNIT_COLORS.length];
                          return (
                            <TableRow key={item.id} hover>
                              <TableCell sx={{ p: 1 }}>
                                <Box sx={{ width: 16, height: 16, borderRadius: '3px', bgcolor: kpiColor }} />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>{item.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{item.code}</Typography>
                              </TableCell>
                              <TableCell><DirectionIndicator direction={item.direction} /></TableCell>
                              <TableCell align="right">{item.hasData ? item.actualValue : '—'}</TableCell>
                              <TableCell align="right">{item.targetValue ?? '—'}</TableCell>
                              <TableCell align="right"><strong>{item.hasData ? item.normalizedScore : '—'}</strong></TableCell>
                              <TableCell>
                                {currKpiScore !== null ? (
                                  <TrendSparkline prev={prevKpiScore} current={currKpiScore} points={visibleTrendValues} band={String(item.band || 'unclassified').toLowerCase()} />
                                ) : (
                                  <Typography variant="caption" color="text.secondary">—</Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : filteredKpiUnits.length > 0 ? (
                  <TableContainer component={Paper} elevation={0} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Unit</TableCell>
                          <TableCell align="right">Score</TableCell>
                          <TableCell>Band</TableCell>
                          <TableCell align="right">KPIs Monitored</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredKpiUnits.map((u) => (
                          <TableRow key={u.unitId} hover>
                            <TableCell>{u.unitName}</TableCell>
                            <TableCell align="right"><Typography fontWeight={600}>{Number(u.score).toFixed(1)}</Typography></TableCell>
                            <TableCell><Chip label={u.band || '—'} size="small" color={getBandChipColor(u.band)} /></TableCell>
                            <TableCell align="right">{u.kpiCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1, borderLeft: '4px solid #1976d2' }}>
                    <Typography variant="body2">No KPI data available for {periodLabel}.</Typography>
                  </Box>
                )}
              </>
            ) : (
              /* All-units: multi-line Unit KPI Scores chart + per-unit table */
              <>
                {allUnitsLineData.length > 0 && (
                  <Box sx={{ width: '100%', height: 280, mb: 2 }}>
                    <ResponsiveContainer>
                      <LineChart data={allUnitsLineData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(val: unknown) => val != null ? [`${val}`, 'Score'] : ['—', 'No data']} />
                        {allUnitsRows.map((u, idx) => (
                          <Line
                            key={u.id}
                            type="monotone"
                            dataKey={toSafeDataKey('u', Number(u.id))}
                            name={u.name}
                            stroke={UNIT_COLORS[idx % UNIT_COLORS.length]}
                            strokeWidth={2}
                            connectNulls={false}
                            dot={{ r: 3, strokeWidth: 1.5 }}
                            activeDot={{ r: 5 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                )}

                {allUnitsRows.length > 0 ? (
                  <TableContainer component={Paper} elevation={0} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Unit</TableCell>
                          <TableCell sx={{ width: 32, p: 0 }}>Color</TableCell>
                          <TableCell align="right">Score</TableCell>
                          <TableCell>Trend</TableCell>
                          <TableCell align="right"># KPIs</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {allUnitsRows.map((u, idx) => {
                          const unitIdNum = Number(u.id);
                          const summaryRow = summaryUnitMap[unitIdNum];
                          const unitColor = UNIT_COLORS[idx % UNIT_COLORS.length];
                          const bandKey = String(summaryRow?.band || 'unclassified').toLowerCase();
                          const visibleTrendValues = allUnitsLineData
                            .map((d) => d[toSafeDataKey('u', unitIdNum)])
                            .filter((v) => v !== null && v !== undefined) as number[];
                          const trend = computeTrendValues(visibleTrendValues);
                          const prevScore: number | null = trend.prev;
                          const currScore: number | null = trend.current ?? (summaryRow ? Number(summaryRow.score) : null);
                          return (
                            <TableRow key={unitIdNum} hover>
                              <TableCell>{u.name}</TableCell>
                              <TableCell sx={{ p: 1 }}>
                                <Box sx={{ width: 20, height: 20, borderRadius: '4px', bgcolor: unitColor }} />
                              </TableCell>
                              <TableCell align="right"><Typography fontWeight={600}>{summaryRow ? Number(summaryRow.score).toFixed(1) : '—'}</Typography></TableCell>
                              <TableCell>
                                {currScore !== null
                                  ? <TrendSparkline prev={prevScore} current={currScore} points={visibleTrendValues} band={bandKey} />
                                  : <Typography variant="caption" color="text.secondary">—</Typography>}
                              </TableCell>
                              <TableCell align="right">{summaryRow ? summaryRow.kpiCount : '—'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1, borderLeft: '4px solid #1976d2' }}>
                    <Typography variant="body2">No KPI data available for {periodLabel}.</Typography>
                  </Box>
                )}
              </>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* ── KPIs Requiring Attention ── */}
          {kpisNeedingAttention.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUpIcon color="error" />
                <Typography variant="h6" fontWeight={700} color="error.main">
                  KPIs Requiring Attention
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                The following KPIs are below acceptable thresholds and require immediate review.
              </Typography>
              <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderColor: 'error.light' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'error.50' }}>
                      {!unitId && <TableCell><strong>Unit</strong></TableCell>}
                      <TableCell><strong>KPI Name</strong></TableCell>
                      <TableCell><strong>Code</strong></TableCell>
                      <TableCell align="right"><strong>Score</strong></TableCell>
                      <TableCell align="right"><strong>Actual</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {kpisNeedingAttention.map((item, idx) => (
                      <TableRow key={idx} hover sx={{ bgcolor: item.band === 'red' ? 'rgb(253,237,237)' : 'rgb(255,249,240)' }}>
                        {!unitId && <TableCell>{item.unitName}</TableCell>}
                        <TableCell><strong>{item.name}</strong></TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">{item.code}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={700} color={item.band === 'red' ? 'error.main' : 'warning.main'}>
                            {item.score}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{item.actualValue}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {Boolean(actionPlansQuery.data?.items?.length) && (
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ReportIcon color="warning" />
                <Typography variant="h6" fontWeight={700} color="warning.main">
                  Suggested KPI Action Plans
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Auto-generated recommendations based on KPI results, remarks, and risk keywords.
              </Typography>
              <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderColor: 'warning.light' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {!unitId && <TableCell><strong>Unit</strong></TableCell>}
                      <TableCell><strong>KPI</strong></TableCell>
                      <TableCell><strong>Priority</strong></TableCell>
                      <TableCell><strong>Recommendation</strong></TableCell>
                      <TableCell><strong>Owner</strong></TableCell>
                      <TableCell><strong>Due Date</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {actionPlansQuery.data?.items.map((item, index) => (
                      <TableRow key={`${item.kpiCode}-${index}`} hover>
                        {!unitId && <TableCell>{item.unitName}</TableCell>}
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{item.kpiName}</Typography>
                          <Typography variant="caption" color="text.secondary">{item.kpiCode}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={item.priority.toUpperCase()}
                            color={item.priority === 'high' ? 'error' : 'warning'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{item.recommendation}</TableCell>
                        <TableCell>{item.owner}</TableCell>
                        <TableCell>{item.suggestedDueDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          <Divider sx={{ mb: 3 }} />

          {/* ── Document Submissions ── */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <DocIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Document Submissions — {year}
              </Typography>
            </Box>

            {filteredDocs.length === 0 ? (
              <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1, borderLeft: '4px solid #1976d2' }}>
                <Typography variant="body2">No documents found for this period.</Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell align="right">Metrics Applied</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Submitted On</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredDocs.map((doc) => {
                      const metricsCount = metricsPerDocType[doc.document_type] ?? 0;
                      return (
                        <TableRow key={doc.id} hover>
                          <TableCell>{doc.title}</TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {doc.document_type}
                            </Typography>
                          </TableCell>
                          <TableCell>{doc.unit?.name ?? '—'}</TableCell>
                          <TableCell align="right">
                            {metricsCount > 0 ? (
                              <Chip label={metricsCount} size="small" color="info" variant="outlined" />
                            ) : (
                              <Typography variant="caption" color="text.disabled">—</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              <Chip
                                label={(doc.status || 'pending').replace(/_/g, ' ')}
                                color={STATUS_COLOR[doc.status] ?? 'default'}
                                size="small"
                              />
                              {doc.compliance_status && doc.compliance_status !== 'pending' && (
                                <Chip
                                  label={doc.compliance_status.replace(/_/g, ' ')}
                                  color={COMPLIANCE_COLOR[doc.compliance_status] ?? 'default'}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          {/* ── Footer ── */}
          <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Report generated on {new Date().toLocaleString()} · Compliance Hub
            </Typography>
          </Box>

        </div>
      </Paper>
    </Box>
  );
}

export default function ReportsPage() {
  const now = new Date();
  const { user } = useAuth();
  const isSuperOrReviewer =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.COMPLIANCE_OFFICER || user?.roleCode === 'compliance_officer';

  if (!isSuperOrReviewer) {
    return (
      <Box p={4}>
        <Typography variant="h5" color="error" gutterBottom>
          Access Restricted
        </Typography>
        <Typography color="text.secondary">
          The Reports module is only accessible to Super Admins and Compliance Officers.
        </Typography>
      </Box>
    );
  }

  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedFrequency, setSelectedFrequency] = useState<Frequency>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.ceil((now.getMonth() + 1) / 3));
  const [selectedSemester, setSelectedSemester] = useState<number>(now.getMonth() < 6 ? 1 : 2);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [generateParams, setGenerateParams] = useState<ReportParams | null>(null);

  const { data: unitsResponse } = useQuery({
    queryKey: ['units-all'],
    queryFn: () => unitsApi.listUnits({ page: 1, limit: 100 }),
  });

  const yearOptions = Array.from({ length: 7 }, (_, i) => now.getFullYear() - 3 + i);
  const units = unitsResponse?.data ?? [];
  const selectedUnitName = units.find((u) => String(u.id) === selectedUnit)?.name ?? '';

  const handleGenerate = () => {
    setGenerateParams({
      year: selectedYear,
      frequency: selectedFrequency,
      month: selectedMonth,
      quarter: selectedQuarter,
      semester: selectedSemester,
      unitId: selectedUnit,
      unitName: selectedUnitName,
    });
  };

  return (
    <Box p={3}>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <ReportIcon color="primary" fontSize="large" />
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Consolidated Reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generate a consolidated compliance report combining KPI scores and document submissions for a selected period.
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Filter / Controls */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardHeader title="Report Parameters" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
        <CardContent sx={{ pt: 0 }}>
          <Grid container spacing={2} alignItems="flex-end">
            {/* Year */}
            <Grid item xs={6} sm={2}>
              <FormControl fullWidth>
                <InputLabel>Year</InputLabel>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  label="Year"
                >
                  {yearOptions.map((y) => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Frequency */}
            <Grid item xs={6} sm={2}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={selectedFrequency}
                  onChange={(e) => setSelectedFrequency(e.target.value as Frequency)}
                  label="Frequency"
                >
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="semestral">Semestral</MenuItem>
                  <MenuItem value="annual">Annual</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Sub-period selector */}
            <Grid item xs={6} sm={2}>
              {selectedFrequency === 'monthly' && (
                <FormControl fullWidth>
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    label="Month"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <MenuItem key={idx + 1} value={idx + 1}>{name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {selectedFrequency === 'quarterly' && (
                <FormControl fullWidth>
                  <InputLabel>Quarter</InputLabel>
                  <Select
                    value={selectedQuarter}
                    onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                    label="Quarter"
                  >
                    <MenuItem value={1}>Q1 (Jan–Mar)</MenuItem>
                    <MenuItem value={2}>Q2 (Apr–Jun)</MenuItem>
                    <MenuItem value={3}>Q3 (Jul–Sep)</MenuItem>
                    <MenuItem value={4}>Q4 (Oct–Dec)</MenuItem>
                  </Select>
                </FormControl>
              )}
              {selectedFrequency === 'semestral' && (
                <FormControl fullWidth>
                  <InputLabel>Semester</InputLabel>
                  <Select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(Number(e.target.value))}
                    label="Semester"
                  >
                    <MenuItem value={1}>H1 (Jan–Jun)</MenuItem>
                    <MenuItem value={2}>H2 (Jul–Dec)</MenuItem>
                  </Select>
                </FormControl>
              )}
              {selectedFrequency === 'annual' && (
                <Box sx={{ pt: 1.5, pl: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Full year {selectedYear}
                  </Typography>
                </Box>
              )}
            </Grid>

            {/* Unit */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Unit (optional)</InputLabel>
                <Select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  label="Unit (optional)"
                >
                  <MenuItem value="">All Units</MenuItem>
                  {units.map((u) => (
                    <MenuItem key={u.id} value={String(u.id)}>{u.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Generate button */}
            <Grid item xs={12} sm={2}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<ReportIcon />}
                onClick={handleGenerate}
              >
                Generate
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Report output */}
      {generateParams && <ReportView params={generateParams} />}
    </Box>
  );
}
