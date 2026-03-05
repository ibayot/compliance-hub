'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  FormControl,
  Grid,
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
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { movApi, MovArtifact } from '@/app/api/mov';
import { kpiApi } from '@/lib/api/kpi';

type RegisterType = 'legal' | 'standards' | 'internal';

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

export default function MovBuilderPage() {
  const { enqueueSnackbar } = useSnackbar();
  const now = new Date();
  const currentYear = now.getFullYear();
  const [tab, setTab] = useState(0);

  const [year, setYear] = useState<number>(currentYear);
  const [quarter, setQuarter] = useState<number>(Math.floor((now.getMonth() + 3) / 3));
  const [scope, setScope] = useState('all');
  const [unitText, setUnitText] = useState('');

  const [reportTitle, setReportTitle] = useState('');
  const [reportHtml, setReportHtml] = useState('');

  const [allArtifacts, setAllArtifacts] = useState<MovArtifact[]>([]);
  const [planEntries, setPlanEntries] = useState<MovArtifact[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<MovArtifact[]>([]);

  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleOwner, setScheduleOwner] = useState('');
  const [scheduleDueDate, setScheduleDueDate] = useState('');
  const [scheduleStatus, setScheduleStatus] = useState('planned');
  const [scheduleRemarks, setScheduleRemarks] = useState('');

  const [kpiRemarks, setKpiRemarks] = useState<Record<string, string>>({});
  const [kpiGapRows, setKpiGapRows] = useState<Array<{ code: string; name: string; recommendation: string }>>([]);

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

  const loadData = async () => {
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
      const rows = (actionPlans.items || []).map((item) => ({
        code: item.kpiCode,
        name: item.kpiName,
        recommendation: item.recommendation,
      }));
      setKpiGapRows(rows);

      const nextRemarks: Record<string, string> = {};
      rows.forEach((row) => {
        nextRemarks[row.code] = kpiRemarks[row.code] || '';
      });
      setKpiRemarks(nextRemarks);
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to load MoV Builder data.', { variant: 'error' });
    }
  };

  useEffect(() => {
    loadData();
  }, [year, quarter]);

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
      enqueueSnackbar(`${registerType[0].toUpperCase()}${registerType.slice(1)} register report generated.`, { variant: 'success' });
      setTab(0);
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to generate register report.', { variant: 'error' });
    }
  };

  const generateAssessmentReport = async () => {
    try {
      const manualRemarks = Object.fromEntries(
        Object.entries(kpiRemarks).filter(([, value]) => String(value || '').trim().length > 0),
      );
      const report = await movApi.generateAssessmentReport({
        year,
        quarter,
        manual_remarks: manualRemarks,
      });
      setReportTitle(report.title);
      setReportHtml(report.report_html || report.report_markdown);
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

  const printOrSavePdf = () => {
    if (!reportHtml.trim()) {
      enqueueSnackbar('Generate a report first before printing.', { variant: 'warning' });
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!frameDoc) {
      enqueueSnackbar('Unable to initialize print document.', { variant: 'error' });
      document.body.removeChild(iframe);
      return;
    }

    frameDoc.open();
    frameDoc.write(reportHtml);
    frameDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1200);
    }, 300);
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        MoV Builder
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Organized workspace for register reporting, assessment reporting, plan updates, and schedule monitoring.
      </Typography>

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

      <Card sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_e, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
          <Tab label="Reports" />
          <Tab label="Assessment Plan" />
          <Tab label="Assessment Schedule" />
          <Tab label="Artifacts" />
        </Tabs>
      </Card>

      {tab === 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader title="Generate Reports" />
              <CardContent>
                <Stack spacing={1.5}>
                  <Button variant="contained" onClick={() => generateRegisterReport('legal')}>Generate Legal Register Report</Button>
                  <Button variant="contained" onClick={() => generateRegisterReport('standards')}>Generate Standards Register Report</Button>
                  <Button variant="contained" onClick={() => generateRegisterReport('internal')}>Generate Internal Policy Register Report</Button>
                  <Divider />
                  <Button variant="contained" color="secondary" onClick={generateAssessmentReport}>Generate Assessment Report</Button>
                  <Button variant="outlined" onClick={saveGeneratedReport}>Save Generated Report</Button>
                  <Button variant="outlined" onClick={printOrSavePdf}>Print / Save PDF</Button>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ mt: 2 }}>
              <CardHeader title="KPI Gap Remarks Override" subheader="Optional manual remarks to enrich assessment report." />
              <CardContent>
                <Stack spacing={1.5}>
                  {kpiGapRows.length === 0 && (
                    <Typography variant="body2" color="text.secondary">No KPI gaps currently detected for this period.</Typography>
                  )}
                  {kpiGapRows.map((row) => (
                    <TextField
                      key={row.code}
                      label={`${row.code} - ${row.name}`}
                      value={kpiRemarks[row.code] || ''}
                      onChange={(e) => setKpiRemarks((prev) => ({ ...prev, [row.code]: e.target.value }))}
                      multiline
                      minRows={2}
                      placeholder={row.recommendation}
                      fullWidth
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card>
              <CardHeader title="Generated Report Preview (HTML)" />
              <CardContent>
                <Stack spacing={2}>
                  <TextField label="Report Title" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} fullWidth />
                  <Box
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, minHeight: 520, p: 2, overflow: 'auto' }}
                    dangerouslySetInnerHTML={{ __html: reportHtml || '<p>No report generated yet.</p>' }}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 1 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Assessment Plan Designer" subheader="Edit, add, and delete year plans with bulleted items." />
              <CardContent>
                <Grid container spacing={2}>
                  {planByYear.map((entry) => {
                    const items = parsePlanItems(entry);
                    const isEditing = editingPlanId === entry.id;
                    return (
                      <Grid item xs={12} md={6} key={entry.id}>
                        <Card variant="outlined" sx={{ borderLeft: '5px solid', borderColor: 'primary.main' }}>
                          <CardContent>
                            <Chip label={`Year ${entry.metadata_json?.year_index || '-'} · ${entry.period_year}`} size="small" sx={{ mb: 1 }} />
                            {isEditing ? (
                              <Stack spacing={1.5}>
                                <TextField label="Plan Title" value={editingPlanTitle} onChange={(e) => setEditingPlanTitle(e.target.value)} fullWidth />
                                <TextField
                                  label="Bulleted Items (one per line)"
                                  value={editingPlanItemsText}
                                  onChange={(e) => setEditingPlanItemsText(e.target.value)}
                                  multiline
                                  minRows={6}
                                  fullWidth
                                />
                                <Stack direction="row" spacing={1}>
                                  <Button variant="contained" onClick={() => savePlanEdit(entry)}>Save</Button>
                                  <Button variant="outlined" onClick={cancelEditPlan}>Cancel</Button>
                                </Stack>
                              </Stack>
                            ) : (
                              <Stack spacing={1}>
                                <Typography variant="h6">{entry.title}</Typography>
                                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                                  {items.length === 0 ? <li>No bullet items yet.</li> : items.map((item, idx) => <li key={`${entry.id}-item-${idx}`}>{item}</li>)}
                                </Box>
                                <Stack direction="row" spacing={1}>
                                  <Button size="small" variant="outlined" onClick={() => startEditPlan(entry)}>Edit</Button>
                                  <Button size="small" color="error" variant="outlined" onClick={() => deletePlanEntry(entry)}>Delete</Button>
                                </Stack>
                              </Stack>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardHeader title="Add Plan Year" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={2}>
                    <TextField type="number" label="Year" value={newPlanYear} onChange={(e) => setNewPlanYear(Number(e.target.value))} fullWidth />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField label="Year Title" value={newPlanTitle} onChange={(e) => setNewPlanTitle(e.target.value)} fullWidth />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Bulleted Items (one per line)"
                      value={newPlanItemsText}
                      onChange={(e) => setNewPlanItemsText(e.target.value)}
                      multiline
                      minRows={4}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button variant="contained" onClick={addPlanEntry}>Add Plan Year</Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 2 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card>
              <CardHeader title={`Assessment Schedule - ${year} Q${quarter}`} subheader="Update status and remarks per item." />
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
                          <TextField
                            size="small"
                            value={entry.title}
                            onChange={(e) => setScheduleEntries((prev) => prev.map((item) => item.id === entry.id ? { ...item, title: e.target.value } : item))}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={String(entry.metadata_json?.owner || '')}
                            onChange={(e) => setScheduleEntries((prev) => prev.map((item) => item.id === entry.id ? { ...item, metadata_json: { ...(item.metadata_json || {}), owner: e.target.value } } : item))}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="date"
                            value={String(entry.metadata_json?.due_date || '')}
                            onChange={(e) => setScheduleEntries((prev) => prev.map((item) => item.id === entry.id ? { ...item, metadata_json: { ...(item.metadata_json || {}), due_date: e.target.value } } : item))}
                            InputLabelProps={{ shrink: true }}
                          />
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" fullWidth>
                            <Select
                              value={entry.status}
                              onChange={(e) => setScheduleEntries((prev) => prev.map((item) => item.id === entry.id ? { ...item, status: e.target.value } : item))}
                            >
                              <MenuItem value="planned">Planned</MenuItem>
                              <MenuItem value="in_progress">In Progress</MenuItem>
                              <MenuItem value="completed">Completed</MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={String(entry.metadata_json?.remarks || '')}
                            onChange={(e) => setScheduleEntries((prev) => prev.map((item) => item.id === entry.id ? { ...item, metadata_json: { ...(item.metadata_json || {}), remarks: e.target.value } } : item))}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => updateScheduleEntry(entry, {
                              title: entry.title,
                              status: entry.status,
                              owner: String(entry.metadata_json?.owner || ''),
                              due_date: String(entry.metadata_json?.due_date || ''),
                              remarks: String(entry.metadata_json?.remarks || ''),
                            })}
                          >
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

      {tab === 3 && (
        <Card>
          <CardHeader title={`Saved MoV Artifacts - ${year} Q${quarter}`} />
          <CardContent>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Scope</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allArtifacts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}><Typography variant="body2" color="text.secondary">No artifacts saved for this period.</Typography></TableCell>
                  </TableRow>
                )}
                {allArtifacts.map((artifact) => (
                  <TableRow key={artifact.id}>
                    <TableCell>{artifact.artifact_type}</TableCell>
                    <TableCell>{artifact.title}</TableCell>
                    <TableCell>{artifact.scope}</TableCell>
                    <TableCell><Chip label={artifact.status} size="small" /></TableCell>
                    <TableCell>{new Date(artifact.updated_at).toLocaleString()}</TableCell>
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
