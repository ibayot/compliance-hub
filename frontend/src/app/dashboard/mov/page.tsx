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
import { useAutoRefresh } from '@/lib/utils/useAutoRefresh';

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

function compressImageToBase64(file: File, maxPx = 400, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas 2d unavailable')); return; }
      // Fill white before drawing so transparent pixels don't become black in JPEG
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')); };
    img.src = url;
  });
}

export default function MovBuilderPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const now = new Date();
  const currentYear = now.getFullYear();
  const [tab, setTab] = useState(0);

  // ── Role Gate (render-time check) ─────────────────────────────────────────
  const allowed = !user || user.role === 'super_admin' || user.role === 'reviewer' ||
    user.role === 'compliance_officer' || user.roleCode === 'compliance_officer';

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

  // ── Print Presets ─────────────────────────────────────────────────────────
  const [printPresets, setPrintPresets] = useState<MovArtifact[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetName, setPresetName] = useState('');

  // ── Signature Block (print-only) ──────────────────────────────────────────
  const [preparedByName, setPreparedByName] = useState('');
  const [preparedByPosition, setPreparedByPosition] = useState('');
  const [preparedByDesignation, setPreparedByDesignation] = useState('');
  const [approvedByName, setApprovedByName] = useState('');
  const [approvedByPosition, setApprovedByPosition] = useState('');
  const [approvedByDesignation, setApprovedByDesignation] = useState('');

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
      const [artifacts, plans, schedule, actionPlans, presets] = await Promise.all([
        movApi.list({ period_year: year, quarter }),
        movApi.list({ artifact_type: 'assessment_plan_year' }),
        movApi.list({ artifact_type: 'assessment_schedule_entry', period_year: year, quarter }),
        kpiApi.actionPlans(year, quarter * 3),
        movApi.list({ artifact_type: 'print_settings' }),
      ]);

      setAllArtifacts(artifacts);
      setPlanEntries(plans);
      setScheduleEntries(schedule);
      setPrintPresets(presets);
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
  useAutoRefresh(loadData);

  // Pre-fill "Prepared by" from the current logged-in user on first load.
  // Uses a separate effect so it doesn't interfere with loadData / preset loading.
  useEffect(() => {
    if (!user) return;
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    if (fullName && !preparedByName) setPreparedByName(fullName);
    if (user.position && !preparedByPosition) setPreparedByPosition(user.position);
    if (user.designation && !preparedByDesignation) setPreparedByDesignation(user.designation);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const escapeHtml = (value: string): string => value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const parseFooterInput = (rawValue: string): { startPage: number; bodyHtml: string; hasAny: boolean } => {
      const lines = String(rawValue || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        return { startPage: 1, bodyHtml: '', hasAny: false };
      }

      let startPage = 1;
      let bodyLines = lines;
      const pageToken = /^(?:page\s*)?(\d+)$/i.exec(lines[0]);
      if (pageToken) {
        startPage = Math.max(Number.parseInt(pageToken[1], 10) || 1, 1);
        bodyLines = lines.slice(1);
      }

      return {
        startPage,
        bodyHtml: bodyLines.map((line) => escapeHtml(line)).join('<br />'),
        hasAny: true,
      };
    };

    const bodyContent = reportHtml || '<p>No report content.</p>';
    let normalizedBody = bodyContent;
    let extractedStyleTags = '';

    if (/<body[^>]*>/i.test(bodyContent)) {
      normalizedBody = bodyContent.replace(/^[\s\S]*<body[^>]*>/i, '').replace(/<\/body>[\s\S]*$/i, '');
    }

    const styleMatches = bodyContent.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi);
    if (styleMatches && styleMatches.length > 0) {
      extractedStyleTags = styleMatches.join('\n');
    }

    normalizedBody = normalizedBody.replace(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi, (tableBlock) => {
      if (/<tfoot\b/i.test(tableBlock)) {
        return tableBlock;
      }
      return tableBlock.replace(
        /<\/table>/i,
        '<tfoot><tr><td style="border-top:1px solid #d1d5db;padding:0;height:0;line-height:0;" colspan="100%"></td></tr></tfoot></table>',
      );
    });

    const headerParts: string[] = [];
    if (headerImage1) headerParts.push(`<img src="${headerImage1}" style="height:39px;width:auto;max-height:39px;object-fit:contain;display:inline-block;vertical-align:middle;" alt="Header 1" />`);
    if (headerImage2) headerParts.push(`<img src="${headerImage2}" style="height:45px;width:auto;max-height:45px;object-fit:contain;display:inline-block;vertical-align:middle;" alt="Header 2" />`);

    const firstPageHeaderHtml = headerParts.length > 0
      ? `<div class="print-first-page-header" style="display:flex;flex-direction:row;align-items:center;gap:16px;">${headerParts.join('')}</div>`
      : '';

    const firstFooterConfig = parseFooterInput(diffFirstFooter ? firstPageFooter : pageFooter);
    const subsequentFooterConfig = parseFooterInput(pageFooter);

    const SIDE_MARGIN_MM = 12.7;   // 0.5in
    const TOP_MARGIN_MM = 15;      // ~0.6in
    const BOTTOM_MARGIN_MM = 25.4; // 1in physical bottom margin

    // Counter offset: if startPage != 1, shift the CSS page counter.
    const subOffset = subsequentFooterConfig.hasAny ? subsequentFooterConfig.startPage - 1 : 0;
    const counterResetStyle = subOffset !== 0
      ? `html { counter-reset: page ${subOffset}; }`
      : '';

    // Build @bottom-center CSS content string.
    // Order per line (white-space:pre, \A = newline):
    //   Line 1: Page X of Y
    //   Line 2: ─────────── (separator, clipped by overflow:hidden)
    //   Line 3: footer body text (e.g. "DSWD")
    // counter(page)/counter(pages) only work reliably in @page margin boxes, not position:fixed HTML.
    const SEPARATOR = '\u2500'.repeat(135); // ─ × 140; overflow:hidden clips any excess
    const escapeCssStr = (text: string): string =>
      text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\A ');
    const bodyHtmlToPlainLines = (bodyHtml: string): string[] =>
      bodyHtml.split(/<br\s*\/?>\s*/i).map((l) => l.replace(/<[^>]+>/g, '').trim()).filter(Boolean);

    const buildCssContent = (config: { hasAny: boolean; bodyHtml: string }): string => {
      if (!config.hasAny) return 'none';
      const sep = escapeCssStr(SEPARATOR);
      const bodyLines = bodyHtmlToPlainLines(config.bodyHtml);
      if (bodyLines.length > 0) {
        const escaped = escapeCssStr(bodyLines.join('\n'));
        return `"Page " counter(page) " of " counter(pages) "\\A ${sep}\\A ${escaped}"`;
      }
      return `"Page " counter(page) " of " counter(pages) "\\A ${sep}"`;
    };

    const subsequentCssContent = buildCssContent(subsequentFooterConfig);
    const firstCssContent = buildCssContent(diffFirstFooter ? firstFooterConfig : subsequentFooterConfig);

    const firstPageOverrideCss = diffFirstFooter && firstFooterConfig.hasAny
      ? `@page :first { @bottom-center { content: ${firstCssContent}; line-height: 1.0; overflow: hidden; } }`
      : '';
    const suppressFooterCss = !subsequentFooterConfig.hasAny && !(diffFirstFooter && firstFooterConfig.hasAny)
      ? `@page { @bottom-center { content: none !important; border: none !important; } }`
      : '';

    // Build print-only signature block (Prepared by / Approved by)
    const buildSignatureCell = (label: string, name: string, pos: string, des: string): string => {
      const posLine = [pos, des].filter(Boolean).join(' / ');
      return [
        `<td style="width:50%;text-align:center;vertical-align:top;padding:0 40px;border:none;">`,
        `<p style="margin:0;">${escapeHtml(label)}</p>`,
        `<br><br><br>`,
        `<div style="border-top:1px solid #374151;margin:0 4px;"></div>`,
        (name ? `<p style="margin:4px 0 0 0;font-weight:bold;">${escapeHtml(name.toUpperCase())}</p>` : `<p style="margin:4px 0 0 0;">&nbsp;</p>`),
        (posLine ? `<p style="margin:0;">${escapeHtml(posLine)}</p>` : ''),
        `</td>`,
      ].join('');
    };
    const hasPreparedSig = !!(preparedByName || preparedByPosition || preparedByDesignation);
    const hasApprovedSig = !!(approvedByName || approvedByPosition || approvedByDesignation);
    const signatureHtml = (hasPreparedSig || hasApprovedSig)
      ? `<div style="margin-top:32pt;page-break-inside:avoid;font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#111827;"><table style="width:100%;border:none;border-collapse:collapse;"><tr>${buildSignatureCell('Prepared by:', preparedByName, preparedByPosition, preparedByDesignation)}${buildSignatureCell('Approved by:', approvedByName, approvedByPosition, approvedByDesignation)}</tr></table></div>`
      : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    ${counterResetStyle}
    @page {
      size: A4 landscape;
      margin: ${TOP_MARGIN_MM}mm ${SIDE_MARGIN_MM}mm ${BOTTOM_MARGIN_MM}mm ${SIDE_MARGIN_MM}mm;
      /* Order: Page X of Y  \n  ─────  \n  footer body text */
      @bottom-center {
        content: ${subsequentCssContent};
        font-size: 8pt;
        line-height: 1.0;
        color: #6b7280;
        text-align: center;
        white-space: pre;
        width: 100%;
        overflow: hidden;
        vertical-align: top;
      }
    }
    ${firstPageOverrideCss}
    ${suppressFooterCss}

    html, body { margin: 0 !important; padding: 0 !important; color: #111827; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .print-root { padding: 0; line-height: 1.15; }
    p, h1, h2, h3, h4, h5, h6 { margin-top: 0 !important; margin-bottom: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important; line-height: 1.15 !important; }
    /* Override report-injected class styles that escaped the p/h selector net */
    .summary-block { margin: 0 !important; line-height: 1.15 !important; }
    /* Space after main report title h2 so content doesn't run into it */
    h2 { margin-bottom: 10px !important; }
    .print-first-page-header {
      margin-top: 0;
      margin-bottom: 10px;
      text-align: left;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #d1d5db;
      margin: 0 !important;
      page-break-inside: auto !important;
      break-inside: auto !important;
    }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { page-break-inside: auto !important; break-inside: auto !important; page-break-after: auto; }
    td, th { page-break-inside: auto !important; break-inside: auto !important; }
    th, td { border: 1px solid #d1d5db; }
    th { background: #87CEEB !important; }
  </style>
  ${extractedStyleTags}
</head>
<body>
  <div class="print-root">
    ${firstPageHeaderHtml}
    ${normalizedBody}
    ${signatureHtml}
  </div>
</body>
</html>`;
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
    // Always reset so the same file can be re-selected after clearing
    e.target.value = '';
    if (!file) return;
    try {
      const compressed = await compressImageToBase64(file);
      if (target === 1) setHeaderImage1(compressed);
      else setHeaderImage2(compressed);
    } catch {
      enqueueSnackbar('Failed to process image.', { variant: 'error' });
    }
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) { enqueueSnackbar('Enter a preset name.', { variant: 'warning' }); return; }
    const payload = {
      header1_data: headerImage1, header2_data: headerImage2,
      page_footer: pageFooter, diff_first_footer: diffFirstFooter, first_page_footer: firstPageFooter,
      prepared_by_name: preparedByName, prepared_by_position: preparedByPosition, prepared_by_designation: preparedByDesignation,
      approved_by_name: approvedByName, approved_by_position: approvedByPosition, approved_by_designation: approvedByDesignation,
    };
    try {
      const existing = printPresets.find((p) => p.title === presetName.trim());
      if (existing) {
        await movApi.update(existing.id, { metadata_json: payload });
        enqueueSnackbar('Preset updated.', { variant: 'success' });
      } else {
        await movApi.create({ artifact_type: 'print_settings', title: presetName.trim(), scope: 'settings', period_year: new Date().getFullYear(), content_markdown: 'print_settings', metadata_json: payload });
        enqueueSnackbar('Preset saved.', { variant: 'success' });
      }
      const updated = await movApi.list({ artifact_type: 'print_settings' });
      setPrintPresets(updated);
    } catch { enqueueSnackbar('Failed to save preset.', { variant: 'error' }); }
  };

  const handleLoadPreset = () => {
    const preset = printPresets.find((p) => p.id === selectedPresetId);
    if (!preset?.metadata_json) { enqueueSnackbar('Select a preset first.', { variant: 'warning' }); return; }
    const m = preset.metadata_json as Record<string, any>;
    if (m.header1_data !== undefined) setHeaderImage1(m.header1_data as string);
    if (m.header2_data !== undefined) setHeaderImage2(m.header2_data as string);
    if (m.page_footer !== undefined) setPageFooter(m.page_footer as string);
    if (m.diff_first_footer !== undefined) setDiffFirstFooter(Boolean(m.diff_first_footer));
    if (m.first_page_footer !== undefined) setFirstPageFooter(m.first_page_footer as string);
    if (m.prepared_by_name !== undefined) setPreparedByName(m.prepared_by_name as string);
    if (m.prepared_by_position !== undefined) setPreparedByPosition(m.prepared_by_position as string);
    if (m.prepared_by_designation !== undefined) setPreparedByDesignation(m.prepared_by_designation as string);
    if (m.approved_by_name !== undefined) setApprovedByName(m.approved_by_name as string);
    if (m.approved_by_position !== undefined) setApprovedByPosition(m.approved_by_position as string);
    if (m.approved_by_designation !== undefined) setApprovedByDesignation(m.approved_by_designation as string);
    setPresetName(preset.title);
    enqueueSnackbar(`Preset “${preset.title}” loaded.`, { variant: 'success' });
  };

  const handleDeletePreset = async () => {
    if (!selectedPresetId) { enqueueSnackbar('Select a preset to delete.', { variant: 'warning' }); return; }
    try {
      await movApi.remove(selectedPresetId);
      setPrintPresets((prev) => prev.filter((p) => p.id !== selectedPresetId));
      setSelectedPresetId('');
      enqueueSnackbar('Preset deleted.', { variant: 'success' });
    } catch { enqueueSnackbar('Failed to delete preset.', { variant: 'error' }); }
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

                  {/* ── Saved Presets ── */}
                  {printPresets.length > 0 && (
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Load Preset</InputLabel>
                        <Select
                          value={selectedPresetId}
                          label="Load Preset"
                          onChange={(e) => setSelectedPresetId(e.target.value)}
                        >
                          {printPresets.map((p) => (
                            <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button variant="outlined" size="small" onClick={handleLoadPreset}>Load</Button>
                      <Button variant="outlined" size="small" color="error" onClick={handleDeletePreset}>Delete</Button>
                    </Stack>
                  )}

                  <Divider />
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
                      helperText="Line 1 may be page start (e.g., 1 or Page 1). Remaining line(s) are footer text."
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
                    helperText="Line 1 may be page start (e.g., 1 or Page 1). Remaining line(s) are footer text."
                    placeholder="e.g. DSWD Field Office XII · ICT Unit · Confidential"
                  />

                  {/* ── Signature Block ── */}
                  <Divider />
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block' }}>
                    Signature Block (print-only) — auto-filled from your account
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: -1 }}>
                    Prepared by
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={12} md={4}>
                      <TextField size="small" label="Name" value={preparedByName} onChange={(e) => setPreparedByName(e.target.value)} fullWidth />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField size="small" label="Position" value={preparedByPosition} onChange={(e) => setPreparedByPosition(e.target.value)} fullWidth helperText="Abbreviated, e.g. ITO I" />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField size="small" label="Designation" value={preparedByDesignation} onChange={(e) => setPreparedByDesignation(e.target.value)} fullWidth />
                    </Grid>
                  </Grid>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Approved by
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={12} md={4}>
                      <TextField size="small" label="Name" value={approvedByName} onChange={(e) => setApprovedByName(e.target.value)} fullWidth />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField size="small" label="Position" value={approvedByPosition} onChange={(e) => setApprovedByPosition(e.target.value)} fullWidth helperText="Abbreviated, e.g. ITO II" />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField size="small" label="Designation" value={approvedByDesignation} onChange={(e) => setApprovedByDesignation(e.target.value)} fullWidth />
                    </Grid>
                  </Grid>

                  <Divider />

                  {/* ── Save Preset ── */}
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <TextField
                      size="small"
                      label="Save as Preset"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder="Preset name..."
                      sx={{ minWidth: 200 }}
                    />
                    <Button variant="contained" size="small" onClick={handleSavePreset}>
                      {printPresets.some((p) => p.title === presetName.trim()) ? 'Update Preset' : 'Save Preset'}
                    </Button>
                  </Stack>
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
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      minHeight: 520,
                      p: 2,
                      overflow: 'auto',
                      backgroundColor: '#fff',
                      color: '#111',
                      '&, & *': { color: '#111' },
                      '& th': { backgroundColor: '#87CEEB !important' },
                    }}
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
