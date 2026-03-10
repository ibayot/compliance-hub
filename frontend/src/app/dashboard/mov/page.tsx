'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Assessment as AssessmentIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Image as ImageIcon,
  Print as PrintIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { movApi, MovArtifact } from '@/app/api/mov';
import { kpiApi } from '@/lib/api/kpi';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types/auth';

type RegisterType = 'legal' | 'standards' | 'internal';

const PLAN_COLORS = ['#1565c0','#2e7d32','#e65100','#6a1b9a','#00695c','#c62828','#4527a0','#00838f'];

function parsePlanItems(entry: MovArtifact): string[] {
  const metadataItems = Array.isArray(entry.metadata_json?.items) ? (entry.metadata_json?.items as string[]) : [];
  if (metadataItems.length > 0) {
    return metadataItems;
  }
  return String(entry.content_markdown || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^-\s+/, '').trim())
    .filter(Boolean);
}

function toBullets(items: string[]): string {
  return items.map((item) => `- ${item.trim()}`).join('\n');
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function MovBuilderPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const now = new Date();
  const currentYear = now.getFullYear();
  const [tab, setTab] = useState(0);

  // ── Role Gate (render-time check) ─────────────────────────────────────────
  const allowed = !user || [UserRole.SUPER_ADMIN, UserRole.REVIEWER].includes(user.role as UserRole);

  const [year, setYear] = useState<number>(currentYear);
  const [quarter, setQuarter] = useState<number>(Math.floor((now.getMonth() + 3) / 3));
  const [scope, setScope] = useState('all');
  const [unitText, setUnitText] = useState('');

  const [reportTitle, setReportTitle] = useState('');
  const [reportHtml, setReportHtml] = useState('');

  // ── Report Settings ────────────────────────────────────────────────────────
  const [headerImage1, setHeaderImage1] = useState('');
  const [headerImage2, setHeaderImage2] = useState('');
  const [pageFooter, setPageFooter] = useState('');
  const [diffFirstFooter, setDiffFirstFooter] = useState(false);
  const [firstPageFooter, setFirstPageFooter] = useState('');

  const [allArtifacts, setAllArtifacts] = useState<MovArtifact[]>([]);
  const [planEntries, setPlanEntries] = useState<MovArtifact[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<MovArtifact[]>([]);

  // ── Artifact edit state ───────────────────────────────────────────────────
  const [editingArtifactId, setEditingArtifactId] = useState<string | null>(null);
  const [editingArtifactStatus, setEditingArtifactStatus] = useState('');

  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleOwner, setScheduleOwner] = useState('');
  const [scheduleDueDate, setScheduleDueDate] = useState('');
  const [scheduleStatus, setScheduleStatus] = useState('planned');
  const [scheduleRemarks, setScheduleRemarks] = useState('');

  const [kpiRemarks, setKpiRemarks] = useState<Record<string, string>>({});
  const [kpiGapRows, setKpiGapRows] = useState<Array<{ code: string; name: string; recommendation: string }>>([]);
  const [additionalRemarks, setAdditionalRemarks] = useState('');
  const [lastReportKind, setLastReportKind] = useState<'register' | 'monitoring' | 'assessment' | ''>('');

  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingPlanTitle, setEditingPlanTitle] = useState('');
  const [editingPlanItemsText, setEditingPlanItemsText] = useState('');

  const [newPlanYear, setNewPlanYear] = useState<number>(currentYear);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanItemsText, setNewPlanItemsText] = useState('');

  const planByYear = useMemo(
    () => [...planEntries].sort((a, b) => Number(a.period_year) - Number(b.period_year)),
    [planEntries],
  );

  const loadData = useCallback(async () => {
    try {
      const [artifacts, plans, schedule, actionPlans] = await Promise.all([
        movApi.list({ period_year: year, quarter }),
        movApi.list({ artifact_type: 'assessment_plan_year' }),
        movApi.list({ artifact_type: 'assessment_schedule_entry', period_year: year, quarter }),
        kpiApi.actionPlans(year, quarter * 3),
      ]);

      setAllArtifacts(artifacts);
      setPlanEntries(plans);
      setScheduleEntries(schedule);
      const rows = (actionPlans.items || []).map((item: any) => ({
        code: item.kpiCode,
        name: item.kpiName,
        recommendation: item.recommendation,
      }));
      setKpiGapRows(rows);

      setKpiRemarks((prev) => {
        const next: Record<string, string> = {};
        rows.forEach((row: any) => { next[row.code] = prev[row.code] || ''; });
        return next;
      });
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to load MoV Builder data.', { variant: 'error' });
    }
  }, [year, quarter, enqueueSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const generateRegisterReport = async (registerType: RegisterType) => {
    try {
      const report = await movApi.generateRegisterReport({
        year,
        quarter,
        scope: scope === 'all' ? undefined : scope,
        unit: unitText.trim() || undefined,
        register_type: registerType,
      });
      setReportTitle(report.title);
      setReportHtml(report.content_html || report.content_markdown);
      setLastReportKind('register');
      enqueueSnackbar(`${registerType[0].toUpperCase()}${registerType.slice(1)} register report generated.`, { variant: 'success' });
      setTab(0);
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to generate register report.', { variant: 'error' });
    }
  };

  const generateMonitoringMatrix = async () => {
    try {
      const report = await movApi.generateMonitoringMatrixReport({
        year,
        quarter,
        scope: scope === 'all' ? undefined : scope,
        unit: unitText.trim() || undefined,
      });
      setReportTitle(report.title);
      setReportHtml(report.content_html || report.content_markdown);
      setLastReportKind('monitoring');
      enqueueSnackbar('Register Monitoring Matrix generated.', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to generate monitoring matrix.', { variant: 'error' });
    }
  };

  const generateAssessmentReport = async () => {
    try {
      const manualRemarks = {
        ...Object.fromEntries(Object.entries(kpiRemarks).filter(([, value]) => String(value || '').trim().length > 0)),
      };
      if (additionalRemarks.trim()) manualRemarks['_additional'] = additionalRemarks.trim();
      const report = await movApi.generateAssessmentReport({
        year,
        quarter,
        manual_remarks: manualRemarks,
      });
      setReportTitle(report.title);
      setReportHtml(report.report_html || report.report_markdown);
      setLastReportKind('assessment');
      enqueueSnackbar('Assessment report generated.', { variant: 'success' });
      setTab(0);
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to generate assessment report.', { variant: 'error' });
    }
  };

  const saveGeneratedReport = async () => {
    if (!reportTitle.trim() || !reportHtml.trim()) {
      enqueueSnackbar('Generate a report first before saving.', { variant: 'warning' });
      return;
    }
    try {
      await movApi.create({
        artifact_type: 'generated_report',
        title: reportTitle,
        period_year: year,
        quarter,
        scope: scope === 'all' ? 'regional' : scope,
        content_markdown: reportHtml,
        status: 'generated',
      });
      enqueueSnackbar('Generated report saved.', { variant: 'success' });
      await loadData();
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to save generated report.', { variant: 'error' });
    }
  };

  // Inject report settings (header images, footer) before printing
  const buildPrintHtml = (): string => {
    let html = reportHtml;
    const headerParts: string[] = [];
    if (headerImage1) headerParts.push(`<img src="${headerImage1}" style="max-width:100%;display:block;margin-bottom:6px;" alt="Header 1" />`);
    if (headerImage2) headerParts.push(`<img src="${headerImage2}" style="max-width:100%;display:block;margin-bottom:6px;" alt="Header 2" />`);

    const footerStyle = 'font-family:Helvetica,Arial,sans-serif;font-size:8pt;color:#6b7280;border-top:1px solid #d1d5db;padding:4px 8px;margin-top:16px;';
    let footerHtml = '';
    if (diffFirstFooter && firstPageFooter.trim()) {
      footerHtml = `<div style="${footerStyle}" id="footer-first">${firstPageFooter.trim()}</div><div style="${footerStyle}" id="footer-rest">${pageFooter.trim()}</div>`;
    } else if (pageFooter.trim()) {
      footerHtml = `<div style="${footerStyle}">${pageFooter.trim()}</div>`;
    }

    if (headerParts.length > 0) {
      html = html.replace(/<body([^>]*)>/i, (_m, attrs) => `<body${attrs}>${headerParts.join('')}`);
    }
    if (footerHtml) {
      html = html.replace(/<\/body>/i, `${footerHtml}</body>`);
    }
    return html;
  };

  const printOrSavePdf = () => {
    if (!reportHtml.trim()) {
      enqueueSnackbar('Generate a report first before printing.', { variant: 'warning' });
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!frameDoc) {
      enqueueSnackbar('Unable to initialize print document.', { variant: 'error' });
      document.body.removeChild(iframe);
      return;
    }

    frameDoc.open();
    frameDoc.write(buildPrintHtml());
    frameDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1500);
    }, 400);
  };

  const addScheduleEntry = async () => {
    if (!scheduleTitle.trim()) {
      enqueueSnackbar('Schedule activity title is required.', { variant: 'warning' });
      return;
    }

    try {
      await movApi.create({
        artifact_type: 'assessment_schedule_entry',
        title: scheduleTitle,
        period_year: year,
        quarter,
        scope: scope === 'all' ? 'regional' : scope,
        status: scheduleStatus,
        content_markdown: scheduleTitle,
        metadata_json: {
          owner: scheduleOwner,
          due_date: scheduleDueDate,
          remarks: scheduleRemarks,
        },
      });

      setScheduleTitle('');
      setScheduleOwner('');
      setScheduleDueDate('');
      setScheduleStatus('planned');
      setScheduleRemarks('');
      enqueueSnackbar('Schedule entry added.', { variant: 'success' });
      await loadData();
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to add schedule entry.', { variant: 'error' });
    }
  };

  const updateScheduleEntry = async (entry: MovArtifact, patch: Partial<{ status: string; remarks: string; title: string; owner: string; due_date: string }>) => {
    try {
      const metadata = {
        ...(entry.metadata_json || {}),
      } as Record<string, any>;
      if (patch.owner !== undefined) metadata.owner = patch.owner;
      if (patch.due_date !== undefined) metadata.due_date = patch.due_date;
      if (patch.remarks !== undefined) metadata.remarks = patch.remarks;

      await movApi.update(entry.id, {
        status: patch.status !== undefined ? patch.status : entry.status,
        title: patch.title !== undefined ? patch.title : entry.title,
        content_markdown: patch.title !== undefined ? patch.title : entry.content_markdown,
        metadata_json: metadata,
      });

      await loadData();
      enqueueSnackbar('Schedule entry updated.', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to update schedule entry.', { variant: 'error' });
    }
  };

  const startEditPlan = (entry: MovArtifact) => {
    setEditingPlanId(entry.id);
    setEditingPlanTitle(entry.title);
    setEditingPlanItemsText(parsePlanItems(entry).join('\n'));
  };

  const cancelEditPlan = () => {
    setEditingPlanId(null);
    setEditingPlanTitle('');
    setEditingPlanItemsText('');
  };

  const savePlanEdit = async (entry: MovArtifact) => {
    const items = editingPlanItemsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!editingPlanTitle.trim() || items.length === 0) {
      enqueueSnackbar('Plan title and at least one bullet item are required.', { variant: 'warning' });
      return;
    }

    try {
      await movApi.update(entry.id, {
        title: editingPlanTitle.trim(),
        content_markdown: toBullets(items),
        metadata_json: {
          ...(entry.metadata_json || {}),
          items,
          year_index: entry.metadata_json?.year_index || entry.period_year - currentYear + 1,
        },
      });
      enqueueSnackbar('Assessment plan updated.', { variant: 'success' });
      cancelEditPlan();
      await loadData();
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to update assessment plan.', { variant: 'error' });
    }
  };

  const addPlanEntry = async () => {
    const items = newPlanItemsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!newPlanTitle.trim() || items.length === 0) {
      enqueueSnackbar('Year title and bullet items are required.', { variant: 'warning' });
      return;
    }

    try {
      const index = Math.max(1, ...planByYear.map((item) => Number(item.metadata_json?.year_index || 0) || 0)) + 1;
      await movApi.create({
        artifact_type: 'assessment_plan_year',
        scope: scope === 'all' ? 'regional' : scope,
        title: newPlanTitle.trim(),
        period_year: newPlanYear,
        status: 'active',
        content_markdown: toBullets(items),
        metadata_json: {
          year_index: index,
          items,
        },
      });

      setNewPlanTitle('');
      setNewPlanItemsText('');
      setNewPlanYear(year);
      enqueueSnackbar('Assessment plan year added.', { variant: 'success' });
      await loadData();
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to add assessment plan.', { variant: 'error' });
    }
  };

  const deletePlanEntry = async (entry: MovArtifact) => {
    try {
      await movApi.remove(entry.id);
      enqueueSnackbar('Assessment plan year deleted.', { variant: 'success' });
      await loadData();
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to delete assessment plan entry.', { variant: 'error' });
    }
  };

  const printPlan = () => {
    const rows = planByYear.map((entry, idx) => {
      const items = parsePlanItems(entry);
      const yearLabel = entry.metadata_json?.year_index ? `Y${entry.metadata_json.year_index}` : `Y${idx + 1}`;
      return `<tr><td style="font-weight:600;white-space:nowrap;">${yearLabel} – ${entry.period_year}</td><td style="font-weight:600;">${entry.title}</td><td><ul style="margin:0;padding-left:18px;">${items.map((i) => `<li>${i}</li>`).join('')}</ul></td></tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:Arial,sans-serif;font-size:10pt;margin:24px;}h2{font-size:11pt;text-align:center;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ccc;padding:6px;vertical-align:top;}th{background:#f3f4f6;text-align:center;font-size:9pt;}td{font-size:10pt;}</style></head><body><h2>ICT COMPLIANCE ASSESSMENT PLAN</h2><table><thead><tr><th>Year</th><th>Title</th><th>Objectives / Activities</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 1500); }, 400);
  };

  const printSchedule = () => {
    const rows = scheduleEntries.map((entry) => {
      return `<tr><td>${entry.title}</td><td>${entry.metadata_json?.owner || '-'}</td><td>${entry.metadata_json?.due_date || '-'}</td><td>${entry.status}</td><td>${entry.metadata_json?.remarks || '-'}</td></tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:Arial,sans-serif;font-size:10pt;margin:24px;}h2{font-size:11pt;text-align:center;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ccc;padding:6px;vertical-align:top;}th{background:#f3f4f6;text-align:center;font-size:9pt;}td{font-size:10pt;}</style></head><body><h2>ICT COMPLIANCE ASSESSMENT SCHEDULE – ${year} Q${quarter}</h2><table><thead><tr><th>Activity</th><th>Owner</th><th>Due Date</th><th>Status</th><th>Remarks</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No entries.</td></tr>'}</tbody></table></body></html>`;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 1500); }, 400);
  };

  const saveArtifactStatus = async (artifact: MovArtifact) => {
    try {
      await movApi.update(artifact.id, { status: editingArtifactStatus });
      setEditingArtifactId(null);
      enqueueSnackbar('Artifact status updated.', { variant: 'success' });
      await loadData();
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to update artifact status.', { variant: 'error' });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    if (target === 1) setHeaderImage1(base64);
    else setHeaderImage2(base64);
  };

// ── Role Gate ─────────────────────────────────────────────────────────────
  if (!allowed) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning" variant="filled">
          <strong>Access Restricted.</strong> The MoV Builder is available to System Administrators and Compliance Officers (Reviewer role) only.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>MoV Builder</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Organized workspace for register reporting, assessment reporting, plan updates, and schedule monitoring.
      </Typography>

      {/* ── Period Filters ── */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <TextField type="number" label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))} fullWidth />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Quarter</InputLabel>
                <Select value={String(quarter)} label="Quarter" onChange={(e) => setQuarter(Number(e.target.value))}>
                  <MenuItem value="1">Q1</MenuItem>
                  <MenuItem value="2">Q2</MenuItem>
                  <MenuItem value="3">Q3</MenuItem>
                  <MenuItem value="4">Q4</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Scope</InputLabel>
                <Select value={scope} label="Scope" onChange={(e) => setScope(e.target.value)}>
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="national">National</MenuItem>
                  <MenuItem value="regional">Regional</MenuItem>
                  <MenuItem value="unit">Unit</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField label="Unit (optional)" value={unitText} onChange={(e) => setUnitText(e.target.value)} fullWidth />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <Card sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_e, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
          <Tab label="Reports" />
          <Tab label="Assessment Plan" />
          <Tab label="Assessment Schedule" />
          <Tab label="Artifacts" />
        </Tabs>
      </Card>

      {/* ══════════════════════════════════════════════════════════════
          TAB 0: REPORTS
      ══════════════════════════════════════════════════════════════ */}
      {tab === 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            {/* ── Generate Buttons ── */}
            <Card>
              <CardHeader title="Generate Reports" />
              <CardContent>
                <Stack spacing={1.5}>
                  <Typography variant="overline" color="text.secondary">Register Reports</Typography>
                  <Button variant="contained" size="small" onClick={() => generateRegisterReport('legal')}>
                    Generate Legal Register Report
                  </Button>
                  <Button variant="contained" size="small" onClick={() => generateRegisterReport('standards')}>
                    Generate Standards Register Report
                  </Button>
                  <Button variant="contained" size="small" onClick={() => generateRegisterReport('internal')}>
                    Generate Internal Policy Register Report
                  </Button>
                  <Button variant="outlined" size="small" onClick={generateMonitoringMatrix}>
                    Generate Register Monitoring Matrix
                  </Button>
                  <Divider />
                  <Typography variant="overline" color="text.secondary">Assessment Report</Typography>
                  <Button variant="contained" color="secondary" onClick={generateAssessmentReport}>
                    Generate Assessment Report
                  </Button>
                  <Divider />
                  <Button variant="outlined" startIcon={<SaveIcon />} onClick={saveGeneratedReport}>Save Generated Report</Button>
                  <Button variant="outlined" startIcon={<PrintIcon />} onClick={printOrSavePdf}>Print / Save PDF</Button>
                </Stack>
              </CardContent>
            </Card>

            {/* ── KPI Gap Remarks ── */}
            {lastReportKind === 'assessment' && (
            <Card sx={{ mt: 2 }}>
              <CardHeader
                title="KPI Gap Remarks Override"
                subheader="Override remarks for all KPI gaps, or add free-form remarks."
              />
              <CardContent>
                <Stack spacing={1.5}>
                  {kpiGapRows.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No KPI gaps detected for this period. You may still add manual remarks below.
                    </Typography>
                  )}
                  {kpiGapRows.map((row) => (
                    <TextField
                      key={row.code}
                      label={`${row.code} – ${row.name}`}
                      value={kpiRemarks[row.code] || ''}
                      onChange={(e) => setKpiRemarks((prev) => ({ ...prev, [row.code]: e.target.value }))}
                      multiline
                      minRows={2}
                      placeholder={row.recommendation}
                      fullWidth
                    />
                  ))}
                  <TextField
                    label="Additional Manual Remarks (appended to report)"
                    value={additionalRemarks}
                    onChange={(e) => setAdditionalRemarks(e.target.value)}
                    multiline
                    minRows={3}
                    placeholder="Enter any additional remarks to include..."
                    fullWidth
                  />
                </Stack>
              </CardContent>
            </Card>
            )}
            <Accordion sx={{ mt: 2, '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Report Settings (Header / Footer)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Typography variant="caption" color="text.secondary">
                    Header images are prepended to the printed output. Footers appear at the bottom.
                  </Typography>

                  {/* Header Image 1 */}
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button variant="outlined" size="small" component="label" startIcon={<ImageIcon />}>
                      Header Image 1
                      <input type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, 1)} />
                    </Button>
                    {headerImage1 && (
                      <>
                        <img src={headerImage1} alt="H1" style={{ height: 36, objectFit: 'contain', border: '1px solid #e0e0e0', borderRadius: 4 }} />
                        <IconButton size="small" onClick={() => setHeaderImage1('')}><CloseIcon fontSize="small" /></IconButton>
                      </>
                    )}
                  </Stack>

                  {/* Header Image 2 */}
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button variant="outlined" size="small" component="label" startIcon={<ImageIcon />}>
                      Header Image 2
                      <input type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, 2)} />
                    </Button>
                    {headerImage2 && (
                      <>
                        <img src={headerImage2} alt="H2" style={{ height: 36, objectFit: 'contain', border: '1px solid #e0e0e0', borderRadius: 4 }} />
                        <IconButton size="small" onClick={() => setHeaderImage2('')}><CloseIcon fontSize="small" /></IconButton>
                      </>
                    )}
                  </Stack>

                  <Divider />

                  <FormControlLabel
                    control={<Checkbox checked={diffFirstFooter} onChange={(e) => setDiffFirstFooter(e.target.checked)} />}
                    label="Use a different footer for the first page"
                  />
                  {diffFirstFooter && (
                    <TextField
                      label="First Page Footer"
                      value={firstPageFooter}
                      onChange={(e) => setFirstPageFooter(e.target.value)}
                      multiline
                      minRows={2}
                      fullWidth
                      placeholder="Footer text for first page only..."
                    />
                  )}
                  <TextField
                    label={diffFirstFooter ? 'Subsequent Pages Footer' : 'Page Footer'}
                    value={pageFooter}
                    onChange={(e) => setPageFooter(e.target.value)}
                    multiline
                    minRows={2}
                    fullWidth
                    placeholder="e.g. DSWD Field Office XII · ICT Unit · Confidential"
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* ── Report Preview ── */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardHeader title="Generated Report Preview" />
              <CardContent>
                <Stack spacing={2}>
                  <TextField label="Report Title" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} fullWidth />
                  <Box
                    id="report-preview-container"
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, minHeight: 520, p: 2, overflow: 'auto', backgroundColor: '#fff' }}
                    dangerouslySetInnerHTML={{ __html: reportHtml || '<p style="color:#9ca3af">No report generated yet. Use the Generate buttons on the left.</p>' }}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: ASSESSMENT PLAN (Timeline Design)
      ══════════════════════════════════════════════════════════════ */}
      {tab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardHeader
                title="Assessment Plan"
                subheader="Multi-year compliance assessment plan. Edit, add, or delete year entries."
                avatar={<Avatar sx={{ bgcolor: 'primary.main' }}><AssessmentIcon /></Avatar>}
                action={<Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={printPlan}>Print Plan</Button>}
              />
              <CardContent>
                {planByYear.length === 0 ? (
                  <Typography color="text.secondary">No plan years found. Add one below.</Typography>
                ) : (
                  <Box sx={{ position: 'relative' }}>
                    {/* Timeline spine */}
                    <Box sx={{ position: 'absolute', left: 27, top: 8, bottom: 8, width: 3, bgcolor: 'divider', zIndex: 0 }} />
                    <Stack spacing={3}>
                      {planByYear.map((entry, idx) => {
                        const items = parsePlanItems(entry);
                        const isEditing = editingPlanId === entry.id;
                        const accentColor = PLAN_COLORS[idx % PLAN_COLORS.length];
                        const yearLabel = entry.metadata_json?.year_index ? `Y${entry.metadata_json.year_index}` : `Y${idx + 1}`;
                        return (
                          <Box key={entry.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, position: 'relative', zIndex: 1 }}>
                            <Avatar sx={{ bgcolor: accentColor, width: 56, height: 56, flexShrink: 0, fontWeight: 700, fontSize: '1rem', boxShadow: 3 }}>
                              {yearLabel}
                            </Avatar>
                            <Card variant="outlined" sx={{ flex: 1, borderLeft: `5px solid ${accentColor}`, borderRadius: 2, boxShadow: 1 }}>
                              <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
                                  <Chip label={String(entry.period_year)} size="small" sx={{ bgcolor: accentColor, color: '#fff', fontWeight: 600 }} />
                                  <Chip label={entry.status} size="small" variant="outlined" />
                                </Box>
                                {isEditing ? (
                                  <Stack spacing={1.5}>
                                    <TextField label="Plan Title" value={editingPlanTitle} onChange={(e) => setEditingPlanTitle(e.target.value)} fullWidth />
                                    <TextField
                                      label="Bullet Items (one per line)"
                                      value={editingPlanItemsText}
                                      onChange={(e) => setEditingPlanItemsText(e.target.value)}
                                      multiline
                                      minRows={5}
                                      fullWidth
                                      helperText="Each line becomes one bullet item."
                                    />
                                    <Stack direction="row" spacing={1}>
                                      <Button variant="contained" size="small" startIcon={<CheckIcon />} onClick={() => savePlanEdit(entry)}>Save</Button>
                                      <Button variant="outlined" size="small" startIcon={<CloseIcon />} onClick={cancelEditPlan}>Cancel</Button>
                                    </Stack>
                                  </Stack>
                                ) : (
                                  <Stack spacing={1}>
                                    <Typography variant="h6" sx={{ fontWeight: 600, color: accentColor }}>{entry.title}</Typography>
                                    <Box component="ul" sx={{ m: 0, pl: 2.5, '& li': { mb: 0.3 } }}>
                                      {items.length === 0
                                        ? <li><Typography variant="body2" color="text.secondary">No items yet.</Typography></li>
                                        : items.map((item, i) => (
                                          <li key={`${entry.id}-item-${i}`}><Typography variant="body2">{item}</Typography></li>
                                        ))}
                                    </Box>
                                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                      <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => startEditPlan(entry)}>Edit</Button>
                                      <Button size="small" color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={() => deletePlanEntry(entry)}>Delete</Button>
                                    </Stack>
                                  </Stack>
                                )}
                              </CardContent>
                            </Card>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ borderTop: '3px solid', borderColor: 'primary.main' }}>
              <CardHeader
                title="Add New Plan Year"
                avatar={<Avatar sx={{ bgcolor: 'primary.light' }}><AddIcon /></Avatar>}
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={2}>
                    <TextField type="number" label="Year" value={newPlanYear} onChange={(e) => setNewPlanYear(Number(e.target.value))} fullWidth />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField label="Year Title" value={newPlanTitle} onChange={(e) => setNewPlanTitle(e.target.value)} fullWidth placeholder="e.g. Year 1 – Context & Governance" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Bullet Items (one per line)"
                      value={newPlanItemsText}
                      onChange={(e) => setNewPlanItemsText(e.target.value)}
                      multiline
                      minRows={4}
                      fullWidth
                      helperText="Enter one item per line."
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={addPlanEntry}>Add Plan Year</Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: ASSESSMENT SCHEDULE
      ══════════════════════════════════════════════════════════════ */}
      {tab === 2 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card>
              <CardHeader title={`Assessment Schedule – ${year} Q${quarter}`} subheader="Update status and remarks per activity." action={<Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={printSchedule}>Print Schedule</Button>} />
              <CardContent>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} md={3}><TextField fullWidth label="Activity" value={scheduleTitle} onChange={(e) => setScheduleTitle(e.target.value)} /></Grid>
                  <Grid item xs={12} md={2}><TextField fullWidth label="Owner" value={scheduleOwner} onChange={(e) => setScheduleOwner(e.target.value)} /></Grid>
                  <Grid item xs={12} md={2}><TextField fullWidth type="date" label="Due Date" value={scheduleDueDate} onChange={(e) => setScheduleDueDate(e.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select value={scheduleStatus} label="Status" onChange={(e) => setScheduleStatus(e.target.value)}>
                        <MenuItem value="planned">Planned</MenuItem>
                        <MenuItem value="in_progress">In Progress</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}><TextField fullWidth label="Remarks" value={scheduleRemarks} onChange={(e) => setScheduleRemarks(e.target.value)} /></Grid>
                  <Grid item xs={12} md={1}><Button fullWidth variant="contained" onClick={addScheduleEntry}>Add</Button></Grid>
                </Grid>

                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Activity</TableCell>
                      <TableCell>Owner</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Remarks</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scheduleEntries.length === 0 && (
                      <TableRow><TableCell colSpan={6}><Typography variant="body2" color="text.secondary">No schedule entries for this quarter.</Typography></TableCell></TableRow>
                    )}
                    {scheduleEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <TextField size="small" value={entry.title} onChange={(e) => setScheduleEntries((prev) => prev.map((item) => item.id === entry.id ? { ...item, title: e.target.value } : item))} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" value={String(entry.metadata_json?.owner || '')} onChange={(e) => setScheduleEntries((prev) => prev.map((item) => item.id === entry.id ? { ...item, metadata_json: { ...(item.metadata_json || {}), owner: e.target.value } } : item))} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="date" value={String(entry.metadata_json?.due_date || '')} onChange={(e) => setScheduleEntries((prev) => prev.map((item) => item.id === entry.id ? { ...item, metadata_json: { ...(item.metadata_json || {}), due_date: e.target.value } } : item))} InputLabelProps={{ shrink: true }} />
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" fullWidth>
                            <Select value={entry.status} onChange={(e) => setScheduleEntries((prev) => prev.map((item) => item.id === entry.id ? { ...item, status: e.target.value } : item))}>
                              <MenuItem value="planned">Planned</MenuItem>
                              <MenuItem value="in_progress">In Progress</MenuItem>
                              <MenuItem value="completed">Completed</MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <TextField size="small" value={String(entry.metadata_json?.remarks || '')} onChange={(e) => setScheduleEntries((prev) => prev.map((item) => item.id === entry.id ? { ...item, metadata_json: { ...(item.metadata_json || {}), remarks: e.target.value } } : item))} />
                        </TableCell>
                        <TableCell>
                          <Button size="small" variant="outlined" onClick={() => updateScheduleEntry(entry, { title: entry.title, status: entry.status, owner: String(entry.metadata_json?.owner || ''), due_date: String(entry.metadata_json?.due_date || ''), remarks: String(entry.metadata_json?.remarks || '') })}>
                            Save
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: ARTIFACTS (with status edit)
      ══════════════════════════════════════════════════════════════ */}
      {tab === 3 && (
        <Card>
          <CardHeader title={`Saved MoV Artifacts – ${year} Q${quarter}`} subheader="View and edit artifact status." />
          <CardContent>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Scope</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Updated</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allArtifacts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}><Typography variant="body2" color="text.secondary">No artifacts saved for this period.</Typography></TableCell>
                  </TableRow>
                )}
                {allArtifacts.map((artifact) => (
                  <TableRow key={artifact.id}>
                    <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {artifact.artifact_type}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Tooltip title={artifact.title}>
                        <span style={{ cursor: 'default', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {artifact.title}
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{artifact.scope}</TableCell>
                    <TableCell>
                      {editingArtifactId === artifact.id ? (
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                          <Select value={editingArtifactStatus} onChange={(e) => setEditingArtifactStatus(e.target.value)}>
                            <MenuItem value="draft">Draft</MenuItem>
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="generated">Generated</MenuItem>
                            <MenuItem value="archived">Archived</MenuItem>
                          </Select>
                        </FormControl>
                      ) : (
                        <Chip
                          label={artifact.status}
                          size="small"
                          color={artifact.status === 'active' ? 'success' : artifact.status === 'generated' ? 'primary' : 'default'}
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(artifact.updated_at).toLocaleString()}</TableCell>
                    <TableCell>
                      {editingArtifactId === artifact.id ? (
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" color="primary" onClick={() => saveArtifactStatus(artifact)}>
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => setEditingArtifactId(null)}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      ) : (
                        <IconButton size="small" onClick={() => { setEditingArtifactId(artifact.id); setEditingArtifactStatus(artifact.status); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
