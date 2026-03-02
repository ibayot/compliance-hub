'use client';

import React, { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
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
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { kpiApi } from '@/lib/api/kpi';
import { documentsApi } from '@/lib/api/documents';
import { unitsApi } from '@/lib/api/units';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

function getBandColor(band: string): 'error' | 'warning' | 'success' | 'info' | 'default' {
  if (!band) return 'default';
  const b = band.toLowerCase();
  if (b.includes('poor') || b.includes('critical') || b.includes('red')) return 'error';
  if (b.includes('good') || b.includes('excellent') || b.includes('green')) return 'success';
  if (b.includes('fair') || b.includes('average') || b.includes('yellow')) return 'warning';
  return 'info';
}

interface ReportParams {
  year: number;
  month: number;
  unitId: string; // '' = all
}

function ReportView({ params }: { params: ReportParams }) {
  const { year, month, unitId } = params;
  const reportRef = useRef<HTMLDivElement>(null);

  const periodLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  const kpiQuery = useQuery({
    queryKey: ['report-kpi', year, month],
    queryFn: () => kpiApi.dashboardSummary(year, month),
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

  const loading = kpiQuery.isLoading || docsQuery.isLoading;
  const error = kpiQuery.isError || docsQuery.isError;

  const handlePrint = () => {
    const content = reportRef.current;
    if (!content) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Consolidated Report — ${periodLabel}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
            h1, h2, h3 { margin-bottom: 8px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th, td { border: 1px solid #bbb; padding: 6px 10px; font-size: 13px; }
            th { background: #f0f0f0; }
            .score-card { display: inline-block; padding: 16px 32px; border: 2px solid #1976d2; border-radius: 8px; margin: 8px 0; }
            .footer { margin-top: 32px; font-size: 11px; color: #888; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mt: 2 }}>Failed to load report data. Please try again.</Alert>;
  }

  const summary = kpiQuery.data?.summary;
  const units = kpiQuery.data?.units ?? [];
  const docs = docsQuery.data?.data ?? [];

  // Filter units if unitId selected
  const filteredUnits = unitId
    ? units.filter((u) => String(u.unitId) === unitId)
    : units;

  const filteredDocs = unitId
    ? docs.filter((d) => String(d.unit_id) === unitId)
    : docs;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
        >
          Print / Export PDF
        </Button>
      </Box>

      <Paper elevation={2} sx={{ p: 4 }}>
        <div ref={reportRef}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight={700}>
              Consolidated Period Report
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {periodLabel}
            </Typography>
            {unitId && (
              <Typography variant="body2" color="text.secondary">
                Unit: {filteredUnits[0]?.unitName ?? `#${unitId}`}
              </Typography>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Overall KPI Score */}
          {summary && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Overall KPI Performance
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 2 }}>
                <Paper elevation={0} variant="outlined" sx={{ p: 2, minWidth: 140, textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight={700} color="primary">
                    {summary.overallScore.toFixed(1)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Overall Score</Typography>
                </Paper>
                <Paper elevation={0} variant="outlined" sx={{ p: 2, minWidth: 140, textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight={700}>{summary.unitCount}</Typography>
                  <Typography variant="caption" color="text.secondary">Units Reporting</Typography>
                </Paper>
                <Paper elevation={0} variant="outlined" sx={{ p: 2, minWidth: 140, textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight={700}>{summary.rowCount}</Typography>
                  <Typography variant="caption" color="text.secondary">KPI Entries</Typography>
                </Paper>
              </Box>
            </Box>
          )}

          {/* Per-unit KPI table */}
          {filteredUnits.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                KPI Scores by Unit
              </Typography>
              <TableContainer component={Paper} elevation={0} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Unit</TableCell>
                      <TableCell align="right">Score</TableCell>
                      <TableCell>Band</TableCell>
                      <TableCell align="right">KPI Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUnits.map((u) => (
                      <TableRow key={u.unitId} hover>
                        <TableCell>{u.unitName}</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600}>{u.score.toFixed(1)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={u.band || '—'}
                            size="small"
                            color={getBandColor(u.band)}
                          />
                        </TableCell>
                        <TableCell align="right">{u.kpiCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {filteredUnits.length === 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              No KPI data available for {periodLabel}.
            </Alert>
          )}

          <Divider sx={{ mb: 3 }} />

          {/* Documents table */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Document Submissions — {year}
            </Typography>
            {filteredDocs.length === 0 ? (
              <Alert severity="info">No documents found for this period.</Alert>
            ) : (
              <TableContainer component={Paper} elevation={0} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell>Period</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Submitted On</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredDocs.map((doc) => (
                      <TableRow key={doc.id} hover>
                        <TableCell>{doc.title}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {doc.document_type}
                          </Typography>
                        </TableCell>
                        <TableCell>{doc.unit?.name ?? '—'}</TableCell>
                        <TableCell>
                          <Typography variant="caption">{doc.period || doc.year}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Chip
                              label={(doc.status || 'pending').replace('_', ' ')}
                              color={STATUS_COLOR[doc.status] ?? 'default'}
                              size="small"
                            />
                            {doc.compliance_status && doc.compliance_status !== 'pending' && (
                              <Chip
                                label={doc.compliance_status.replace('_', ' ')}
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
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          {/* Footer */}
          <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
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
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [generateParams, setGenerateParams] = useState<ReportParams | null>(null);

  const { data: unitsResponse } = useQuery({
    queryKey: ['units-all'],
    queryFn: () => unitsApi.listUnits({ page: 1, limit: 100 }),
  });

  const yearOptions = Array.from({ length: 7 }, (_, i) => now.getFullYear() - 3 + i);
  const units = unitsResponse?.data ?? [];

  const handleGenerate = () => {
    setGenerateParams({ year: selectedYear, month: selectedMonth, unitId: selectedUnit });
  };

  return (
    <Box p={3}>
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
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Report Parameters
        </Typography>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={6} sm={3}>
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

          <Grid item xs={6} sm={3}>
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
          </Grid>

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
      </Paper>

      {/* Report output */}
      {generateParams && <ReportView params={generateParams} />}
    </Box>
  );
}
