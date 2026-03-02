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
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { kpiApi } from '@/lib/api/kpi';
import { documentsApi } from '@/lib/api/documents';
import { unitsApi } from '@/lib/api/units';
import { metricsApi } from '@/lib/api/metrics';

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

/** Mini 2-point sparkline identical to the KPI module trend column. */
function TrendSparkline({ prev, current, band }: { prev: number | null; current: number | null; band: string }) {
  const color = BAND_COLORS[band] || BAND_COLORS.unclassified;
  const w = 60; const h = 24; const pad = 5;
  const startVal = prev !== null ? prev : 0;
  const endVal = current !== null ? current : 0;
  const toY = (v: number) => h - pad - (Math.min(100, Math.max(0, v)) / 100) * (h - 2 * pad);
  const y1 = toY(startVal); const y2 = toY(endVal);
  const startColor = prev !== null ? color : '#b0bec5';
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      <line x1={pad} y1={y1} x2={w - pad} y2={y2} stroke={color} strokeWidth={2} />
      <circle cx={pad} cy={y1} r={3} fill={startColor} stroke="#fff" strokeWidth={1} />
      <circle cx={w - pad} cy={y2} r={3} fill={color} stroke="#fff" strokeWidth={1} />
    </svg>
  );
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
      // Fetch from Jan 1 so monthly charts show Jan → selected-month progression.
      return { fromYear: year, fromMonth: 1, toYear: year, toMonth: month };
    case 'quarterly':
      return { fromYear: year, fromMonth: (quarter - 1) * 3 + 1, toYear: year, toMonth: quarter * 3 };
    case 'semestral':
      return { fromYear: year, fromMonth: (semester - 1) * 6 + 1, toYear: year, toMonth: semester * 6 };
    case 'annual':
      return { fromYear: year, fromMonth: 1, toYear: year, toMonth: 12 };
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

  // All-units timeseries ids derived from summary
  const summaryUnits = useMemo(() => kpiQuery.data?.units ?? [], [kpiQuery.data]);

  const allUnitsTsQuery = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['report-all-units-ts', summaryUnits.map((u) => u.unitId), year, effectiveMonth, frequency],
    queryFn: async () => {
      if (summaryUnits.length === 0) return {} as Record<number, any[]>;
      const results = await Promise.all(
        summaryUnits.map((u) =>
          kpiApi.dashboardUnitTimeseries(
            u.unitId,
            tsRange.fromYear, tsRange.fromMonth,
            tsRange.toYear, tsRange.toMonth,
          ),
        ),
      );
      const map: Record<number, any[]> = {};
      summaryUnits.forEach((u, i) => { map[u.unitId] = results[i]; });
      return map;
    },
    enabled: !unitId && summaryUnits.length > 0,
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

  // ── Derived / computed ────────────────────────────────────────────────────────

  /** Multi-line chart data for "all units" view */
  const allUnitsLineData = useMemo(() => {
    const allTs = allUnitsTsQuery.data;
    if (!allTs || Object.keys(allTs).length === 0) return [];
    const periodMap = new Map<string, { periodYear: number; periodMonth: number }>();
    Object.values(allTs).forEach((pts) => {
      (pts || []).forEach((pt: any) => {
        const key = `${pt.periodYear}-${String(pt.periodMonth).padStart(2, '0')}`;
        if (!periodMap.has(key)) periodMap.set(key, { periodYear: pt.periodYear, periodMonth: pt.periodMonth });
      });
    });
    const sorted = [...periodMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
    const mapped = sorted.map(({ periodYear, periodMonth }) => {
      const datum: Record<string, any> = { label: MONTH_ABBR[periodMonth - 1] };
      summaryUnits.forEach((u) => {
        const pts: any[] = allTs[u.unitId] || [];
        const pt = pts.find((p: any) => p.periodYear === periodYear && p.periodMonth === periodMonth);
        datum[`u${u.unitId}`] = pt?.hasData ? pt.score : null;
      });
      return datum;
    });
    // For units with no data at the first visible period but with data later,
    // inject 0 at that first point so the line draws from 0 → first-actual.
    if (mapped.length > 0) {
      const first = { ...mapped[0] };
      summaryUnits.forEach((u) => {
        const key = `u${u.unitId}`;
        if (first[key] === null) {
          const hasLater = mapped.slice(1).some((d) => d[key] !== null);
          if (hasLater) first[key] = 0;
        }
      });
      return [first, ...mapped.slice(1)];
    }
    return mapped;
  }, [allUnitsTsQuery.data, summaryUnits]);

  /** KPI detail line data for a single selected unit */
  const kpiDetailLineData = useMemo(() => {
    const ts: any[] = unitTsQuery.data || [];
    if (ts.length === 0) return { data: [] as Record<string, any>[], codes: [] as string[] };
    const codes = [...new Set(ts.flatMap((pt) => (pt.kpiScores || []).map((k: any) => k.code as string)))];
    const data = ts.map((pt) => {
      const datum: Record<string, any> = { label: MONTH_ABBR[pt.periodMonth - 1] };
      codes.forEach((code) => {
        const kp = (pt.kpiScores || []).find((k: any) => k.code === code);
        datum[code] = pt.hasData && kp ? kp.normalizedScore : null;
      });
      return datum;
    });
    // For KPIs with no data at the first visible period but with data later,
    // inject 0 at that first point so the line draws from 0 → first-actual.
    if (data.length > 0) {
      const first = { ...data[0] };
      codes.forEach((code) => {
        if (first[code] === null) {
          const hasLater = data.slice(1).some((d) => d[code] !== null);
          if (hasLater) first[code] = 0;
        }
      });
      return { data: [first, ...data.slice(1)], codes };
    }
    return { data, codes };
  }, [unitTsQuery.data]);

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
      summaryUnits.forEach((u) => {
        const pts: any[] = allUnitsTsQuery.data[u.unitId] || [];
        const lastPt = [...pts].reverse().find((p) => p.hasData);
        if (!lastPt) return;
        (lastPt.kpiScores || [])
          .filter((k: any) => ['red', 'amber'].includes(String(k.band || '').toLowerCase()))
          .forEach((k: any) => items.push({
            unitName: u.unitName, code: k.code, name: k.name,
            score: k.normalizedScore, band: String(k.band).toLowerCase(), actualValue: k.actualValue,
          }));
      });
    }
    return items;
  }, [unitId, unitDashQuery.data, unitName, allUnitsTsQuery.data, summaryUnits]);

  /** Metrics count keyed by document_type string */
  const metricsPerDocType = useMemo(() => {
    const map: Record<string, number> = {};
    (metricsQuery.data ?? []).forEach((tmpl) => {
      (tmpl.applicability || []).forEach((app: any) => {
        if (app.document_type) {
          map[app.document_type] = (map[app.document_type] || 0) + 1;
        }
      });
    });
    return map;
  }, [metricsQuery.data]);

  // ── Early returns ─────────────────────────────────────────────────────────────

  const loading = kpiQuery.isLoading || docsQuery.isLoading;
  const error = kpiQuery.isError || docsQuery.isError;

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

  const filteredKpiUnits = unitId ? kpiUnits.filter((u) => String(u.unitId) === unitId) : kpiUnits;
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
    win.document.write(`
      <html>
        <head>
          <title>Consolidated Report — ${periodLabel}</title>
          <style>
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
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    win.document.close();
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
                ) : null}

                {unitDetail && unitDetail.details && unitDetail.details.length > 0 ? (
                  <TableContainer component={Paper} elevation={0} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Color</TableCell>
                          <TableCell>KPI</TableCell>
                          <TableCell align="right">Actual</TableCell>
                          <TableCell align="right">Target</TableCell>
                          <TableCell align="right">Score</TableCell>
                          <TableCell>Band</TableCell>
                          <TableCell>Trend</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {unitDetail.details.map((item, idx) => {
                          // Trend: first → last hasData kpiScore for this code
                          const kpiMoments = (unitTsQuery.data || []).filter(
                            (pt: any) => pt.hasData && (pt.kpiScores || []).some((k: any) => k.code === item.code)
                          );
                          const prevKpiScore: number | null = kpiMoments.length > 1
                            ? (kpiMoments[0].kpiScores?.find((k: any) => k.code === item.code)?.normalizedScore ?? null)
                            : null;
                          const currKpiScore = kpiMoments[kpiMoments.length - 1]?.kpiScores?.find((k: any) => k.code === item.code)?.normalizedScore ?? item.normalizedScore;
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
                              <TableCell align="right">{item.actualValue}</TableCell>
                              <TableCell align="right">{item.targetValue}</TableCell>
                              <TableCell align="right"><strong>{item.normalizedScore}</strong></TableCell>
                              <TableCell>
                                <Chip label={item.band || '—'} size="small" color={getBandChipColor(String(item.band || ''))} />
                              </TableCell>
                              <TableCell>
                                <TrendSparkline prev={prevKpiScore} current={currKpiScore} band={String(item.band || 'unclassified').toLowerCase()} />
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
                        <Tooltip formatter={(val: any) => val != null ? [`${val}`, 'Score'] : ['—', 'No data']} />
                        <Legend />
                        {summaryUnits.map((u, idx) => (
                          <Line
                            key={u.unitId}
                            type="monotone"
                            dataKey={`u${u.unitId}`}
                            name={u.unitName}
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

                {filteredKpiUnits.length > 0 ? (
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
                        {filteredKpiUnits.map((u, idx) => {
                          const unitColor = UNIT_COLORS[idx % UNIT_COLORS.length];
                          const bandKey = String(u.band || 'unclassified').toLowerCase();
                          // Trend: first → last hasData point for this unit's timeseries
                          const unitTs: any[] = allUnitsTsQuery.data?.[u.unitId] || [];
                          const hasDataPts = unitTs.filter((p: any) => p.hasData);
                          const prevScore: number | null = hasDataPts.length > 1 ? (hasDataPts[0]?.score ?? null) : null;
                          const currScore: number | null = hasDataPts[hasDataPts.length - 1]?.score ?? Number(u.score) ?? null;
                          return (
                            <TableRow key={u.unitId} hover>
                              <TableCell>{u.unitName}</TableCell>
                              <TableCell sx={{ p: 1 }}>
                                <Box sx={{ width: 20, height: 20, borderRadius: '4px', bgcolor: unitColor }} />
                              </TableCell>
                              <TableCell align="right"><Typography fontWeight={600}>{Number(u.score).toFixed(1)}</Typography></TableCell>
                              <TableCell>
                                {currScore !== null
                                  ? <TrendSparkline prev={prevScore} current={currScore} band={bandKey} />
                                  : <Typography variant="caption" color="text.secondary">—</Typography>}
                              </TableCell>
                              <TableCell align="right">{u.kpiCount}</TableCell>
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
                The following KPIs are below acceptable thresholds (red or amber band) and require immediate review.
              </Typography>
              <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderColor: 'error.light' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'error.50' }}>
                      {!unitId && <TableCell><strong>Unit</strong></TableCell>}
                      <TableCell><strong>KPI Name</strong></TableCell>
                      <TableCell><strong>Code</strong></TableCell>
                      <TableCell align="right"><strong>Score</strong></TableCell>
                      <TableCell><strong>Band</strong></TableCell>
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
                        <TableCell>
                          <Chip
                            label={item.band.toUpperCase()}
                            size="small"
                            color={item.band === 'red' ? 'error' : 'warning'}
                          />
                        </TableCell>
                        <TableCell align="right">{item.actualValue}</TableCell>
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
