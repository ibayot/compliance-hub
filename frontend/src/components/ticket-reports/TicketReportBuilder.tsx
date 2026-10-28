import React, { useEffect, useRef, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Card, CardContent, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/contexts/AuthContext';
import ResponsiveTable from '@/components/layout/ResponsiveTable';
import ReportTicketList from './ReportTicketList';
import { formatPersonName } from '@/lib/utils/person-name';
import { BuiltTicketReport, defaultReportConfiguration, ReportConfiguration, REPORT_COLUMNS, REPORT_SECTIONS, REPORT_SUPPORT_TYPES, ticketReportBuilderApi, TicketReportTemplate } from '@/lib/api/ticket-report-builder';
import { printTicketReport, reportBlocks, reportMetadata, reportWarnings, REPORT_METHOD } from '@/lib/utils/ticket-report-presentation';

const errorText = (error: any, fallback: string): string => typeof error?.response?.data?.message === 'string' ? error.response.data.message : fallback;

export default function TicketReportBuilder() {
  const { user, myCap } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const canManage = Boolean(myCap?.isTicketReportsManage);
  const current = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
  const [year, setYear] = useState(Number(current.slice(0, 4)));
  const [month, setMonth] = useState(Number(current.slice(5, 7)));
  const [configuration, setConfiguration] = useState<ReportConfiguration>(defaultReportConfiguration);
  const [templates, setTemplates] = useState<TicketReportTemplate[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [staff, setStaff] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [report, setReport] = useState<BuiltTicketReport | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TicketReportTemplate | null>(null);
  const [page, setPage] = useState(0);
  const request = useRef(0), operation = useRef(false);
  const selected = templates.find(template => template.id === selectedId);
  const individual = !canManage || configuration.technicianId !== null;
  const scopedConfiguration: ReportConfiguration = individual ? { ...configuration,
    sections: configuration.sections.filter(section => section !== 'staff'), columns: configuration.columns.filter(column => column !== 'assignee') } : configuration;
  const accountName = formatPersonName(user);
  const signature = JSON.stringify({ year, month, configuration: scopedConfiguration });
  const [generatedSignature, setGeneratedSignature] = useState('');
  const stale = Boolean(report && signature !== generatedSignature);
  const validConfig = configuration.title.trim().length > 0 && Number.isInteger(year) && year >= 1900 && year <= 9998 &&
    `${year}-${String(month).padStart(2, '0')}` <= current.slice(0, 7);

  useEffect(() => {
    let alive = true;
    request.current++;
    setReport(null); setTemplates([]); setSelectedId(''); setName(''); setConfiguration(defaultReportConfiguration());
    setGenerating(false); setGeneratedSignature(''); setError(''); setPage(0);
    setStaff([]); setLoadError(''); setLoadingTemplates(true);
    Promise.all([ticketReportBuilderApi.templates(), canManage ? ticketReportBuilderApi.staff() : Promise.resolve([])])
      .then(([saved, options]) => { if (alive) { setTemplates(saved); setStaff(options); } })
      .catch(err => { if (alive) setLoadError(errorText(err, 'Could not load report templates or staff options. Reopen the builder to retry.')); })
      .finally(() => { if (alive) setLoadingTemplates(false); });
    return () => { alive = false; request.current++; };
  }, [user?.id, canManage]);

  function change<K extends keyof ReportConfiguration>(key: K, value: ReportConfiguration[K]) {
    request.current++; setGenerating(false); setConfiguration(previous => ({ ...previous, [key]: value }));
  }
  function chooseTemplate(id: string) {
    request.current++; setGenerating(false); setSelectedId(id); setError('');
    const template = templates.find(item => item.id === id);
    setName(template?.name ?? ''); setConfiguration(template ? structuredClone(template.configuration) : defaultReportConfiguration());
  }
  async function save(copy = false) {
    if (operation.current || !name.trim() || !configuration.title.trim()) return;
    operation.current = true; setBusy(true); setError('');
    try {
      const saved = selected && !copy ? await ticketReportBuilderApi.update(selected, name.trim(), scopedConfiguration)
        : await ticketReportBuilderApi.create(name.trim(), scopedConfiguration);
      setTemplates(previous => [...previous.filter(item => item.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedId(saved.id); setName(saved.name);
      enqueueSnackbar('Report template saved.', { variant: 'success' });
    } catch (err) { setError(errorText(err, 'Could not save the template.')); }
    finally { operation.current = false; setBusy(false); }
  }
  async function remove() {
    if (!deleteTarget || operation.current) return;
    operation.current = true; setBusy(true); setError('');
    try {
      await ticketReportBuilderApi.remove(deleteTarget);
      setTemplates(previous => previous.filter(item => item.id !== deleteTarget.id));
      if (selectedId === deleteTarget.id) { setSelectedId(''); setName(''); }
      setDeleteTarget(null); enqueueSnackbar('Report template deleted.', { variant: 'success' });
    } catch (err) { setError(errorText(err, 'Could not delete the template.')); setDeleteTarget(null); }
    finally { operation.current = false; setBusy(false); }
  }
  async function generate() {
    const id = ++request.current;
    setGenerating(true); setError('');
    try {
      const result = await ticketReportBuilderApi.preview(year, month, scopedConfiguration);
      if (id !== request.current) return;
      setReport(result); setGeneratedSignature(signature); setPage(0);
    } catch (err) { if (id === request.current) { setReport(null); setError(errorText(err, 'Could not generate the monthly report.')); } }
    finally { if (id === request.current) setGenerating(false); }
  }
  const setPeriod = (key: 'year' | 'month', value: number) => { request.current++; setGenerating(false); key === 'year' ? setYear(value) : setMonth(value); };

  return <Stack spacing={2}>
    <Typography variant="h6" component="h2">Monthly Ticket Report Builder</Typography>
    <Typography color="text.secondary">Choose your sections, save a personal template, and generate a monthly report. Required metrics are always included.</Typography>
    {loadingTemplates && <Box role="status" aria-label="Loading report templates"><CircularProgress size={24} /></Box>}
    {loadError && <Alert severity="error">{loadError}</Alert>}
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    <Card><CardContent><Stack spacing={2}>
      <Typography variant="subtitle1" component="h3" fontWeight={600}>Personal templates</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField select fullWidth size="small" label="Saved template" value={selectedId} onChange={e => chooseTemplate(e.target.value)} disabled={busy || loadingTemplates}>
          <MenuItem value="">New report</MenuItem>
          {templates.map(template => <MenuItem key={template.id} value={template.id}>{template.name}</MenuItem>)}
        </TextField>
        <TextField fullWidth size="small" label="Template name" value={name} onChange={e => setName(e.target.value)} inputProps={{ maxLength: 80 }} disabled={busy} helperText="Saved to your account; reusable for another month." />
      </Stack>
      <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1}>
        <Button variant="outlined" disabled={busy || loadingTemplates || Boolean(loadError) || !name.trim() || !configuration.title.trim()} onClick={() => save()}>{busy ? 'Saving…' : selected ? 'Save changes' : 'Save template'}</Button>
        {selected && <><Button disabled={busy || !name.trim()} onClick={() => save(true)}>Save as new template</Button>
          <Button color="error" disabled={busy} onClick={() => setDeleteTarget(selected)}>Delete template</Button></>}
      </Stack>
      {selected && !canManage && selected.configuration.technicianId && selected.configuration.technicianId !== user?.id &&
        <Alert severity="warning">This template contains a staff scope your current permissions do not allow. Use your own account below and save the updated template.</Alert>}
    </Stack></CardContent></Card>
    <Card><CardContent><Stack spacing={2}>
      <Typography variant="subtitle1" component="h3" fontWeight={600}>Report settings</Typography>
      <TextField size="small" label="Report title" value={configuration.title} onChange={e => change('title', e.target.value)} inputProps={{ maxLength: 120 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        <TextField size="small" type="number" label="Year" value={Number.isNaN(year) ? '' : year} onChange={e => setPeriod('year', e.target.value === '' ? NaN : Number(e.target.value))} inputProps={{ min: 1900, max: Number(current.slice(0, 4)), step: 1 }}
          error={!Number.isInteger(year) || year < 1900 || year > Number(current.slice(0, 4))} helperText={`Enter a whole year from 1900 to ${current.slice(0, 4)}.`} />
        <TextField size="small" select label="Month" value={month} onChange={e => setPeriod('month', Number(e.target.value))}
          error={Number.isInteger(year) && `${year}-${String(month).padStart(2, '0')}` > current.slice(0, 7)} helperText="Choose a current or past month.">
          {Array.from({ length: 12 }, (_, index) => <MenuItem key={index} value={index + 1}>{new Date(2026, index, 1).toLocaleDateString('en-PH', { month: 'long' })}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Support type" value={configuration.ticketType ?? ''} onChange={e => change('ticketType', e.target.value || null)}>
          <MenuItem value="">All support types</MenuItem>
          {Object.entries(REPORT_SUPPORT_TYPES).map(([id, label]) => <MenuItem key={id} value={id}>{label}</MenuItem>)}
        </TextField>
        {canManage ? <Autocomplete options={staff} value={staff.find(option => option.id === configuration.technicianId) ?? null}
          isOptionEqualToValue={(a, b) => a.id === b.id} getOptionLabel={option => option.name}
          onChange={(_, value) => change('technicianId', value?.id ?? null)}
          renderInput={params => <TextField {...params} size="small" label="Assigned staff" placeholder="All authorized staff" helperText={configuration.technicianId && !staff.some(s => s.id === configuration.technicianId) ? `Saved staff #${configuration.technicianId} is unavailable. Clear or choose another staff member.` : 'Clear to include all authorized staff.'} />} />
          : <Typography color="text.secondary">Staff: {accountName}</Typography>}
      </Box>
      {!canManage && configuration.technicianId !== null && <Button onClick={() => change('technicianId', null)}>Use {accountName}</Button>}
      {canManage && configuration.technicianId !== null && !staff.some(option => option.id === configuration.technicianId) &&
        <Button onClick={() => change('technicianId', null)}>Use all authorized staff</Button>}
      <Alert severity="info">Required: received and completed totals; SLA Met, Missed, unavailable and compliance; pause/freeze counts, frequency and business duration. These metrics cannot be removed.</Alert>
      <Box component="fieldset" sx={{ border: 0, p: 0, m: 0 }}><Typography component="legend" fontWeight={600}>Optional sections</Typography>
        <Stack direction="row" useFlexGap flexWrap="wrap">
          {Object.entries(REPORT_SECTIONS).filter(([id]) => id !== 'staff' || !individual).map(([id, label]) =>
            <FormControlLabel key={id} label={label} control={<Checkbox checked={configuration.sections.includes(id as keyof typeof REPORT_SECTIONS)} onChange={(_, checked) =>
              change('sections', checked ? [...configuration.sections, id as keyof typeof REPORT_SECTIONS] : configuration.sections.filter(section => section !== id))} />} />)}
        </Stack>
      </Box>
      <FormControlLabel label="Include ticket list" control={<Checkbox checked={configuration.includeTicketList} onChange={(_, checked) => change('includeTicketList', checked)} />} />
      {configuration.includeTicketList && <Stack spacing={2}>
        <TextField size="small" select label="Ticket list basis" value={configuration.listBasis} onChange={e => change('listBasis', e.target.value as ReportConfiguration['listBasis'])}>
          <MenuItem value="completed">Completed this month</MenuItem><MenuItem value="received">Received this month</MenuItem><MenuItem value="interrupted">Recorded pause/freeze activity this month</MenuItem>
        </TextField>
        <Typography variant="body2">Ticket number, pause/freeze counts and durations, history quality, and completed-month SLA are required. All pause/freeze values cover the selected month.</Typography>
        <Box component="fieldset" sx={{ border: 0, p: 0, m: 0 }}><Typography component="legend">Additional columns</Typography>
          <Stack direction="row" useFlexGap flexWrap="wrap">{Object.entries(REPORT_COLUMNS).filter(([id]) => id !== 'assignee' || !individual).map(([id, label]) => <FormControlLabel key={id} label={label} control={<Checkbox checked={configuration.columns.includes(id as keyof typeof REPORT_COLUMNS)} onChange={(_, checked) =>
            change('columns', checked ? [...configuration.columns, id as keyof typeof REPORT_COLUMNS] : configuration.columns.filter(column => column !== id))} />} />)}</Stack>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField fullWidth size="small" select label="Sort tickets by" value={configuration.sortBy} onChange={e => change('sortBy', e.target.value as ReportConfiguration['sortBy'])}>
            <MenuItem value="ticketNumber">Ticket number</MenuItem><MenuItem value="createdAt">Filed date</MenuItem><MenuItem value="completedAt">Effective completion</MenuItem>
          </TextField>
          <TextField fullWidth size="small" select label="Sort order" value={configuration.sortOrder} onChange={e => change('sortOrder', e.target.value as ReportConfiguration['sortOrder'])}>
            <MenuItem value="asc">Ascending</MenuItem><MenuItem value="desc">Descending</MenuItem>
          </TextField>
        </Stack>
      </Stack>}
      <Box><Button variant="contained" onClick={generate} disabled={generating || !validConfig} aria-busy={generating}>{generating ? 'Generating…' : 'Generate preview'}</Button></Box>
    </Stack></CardContent></Card>
    {report && <Card><CardContent><Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
        <Typography variant="h6" component="h2">{report.configuration.title}</Typography>
        <Button variant="outlined" startIcon={<PrintIcon />} disabled={stale || generating} onClick={() => { if (!printTicketReport(report)) setError('The print window was blocked. Allow pop-ups for this site and try again.'); }}>Print / Export PDF</Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, fontStyle: 'italic' }}>{reportMetadata(report)}</Typography>
      {stale && <Alert severity="warning">Settings changed. Generate a new preview before exporting.</Alert>}
      {reportWarnings(report).map(warning => <Alert key={warning} severity="warning">{warning}</Alert>)}
      <Box component="details"><Typography component="summary" sx={{ cursor: 'pointer' }}>Calculation notes</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{REPORT_METHOD}</Typography></Box>
      {reportBlocks(report).map(block => <Box key={block.id}>
        <Typography variant="subtitle1" component="h3" color="primary" fontWeight={700} gutterBottom>{block.title}</Typography>
        {block.id === 'tickets' ? <ReportTicketList block={block} start={page * 25} pageSize={25} basis={report.configuration.listBasis} /> :
        <ResponsiveTable minWidth={block.headers.length === 2 ? undefined : 400}><Table size="small" aria-label={block.title} sx={block.headers.length === 2 ? { tableLayout: 'fixed' } : undefined}>
          <TableHead><TableRow>{block.headers.map((header, index) => <TableCell key={header} component="th" scope="col" sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700, ...(block.headers.length === 2 && index === 1 ? { width: '32%' } : {}) }}>{header}</TableCell>)}</TableRow></TableHead>
          <TableBody>{block.rows.map((values, index) => <TableRow key={block.rowKeys?.[index] ?? values[0]} sx={{ '&:nth-of-type(even)': { bgcolor: 'action.hover' } }}>{values.map((value, column) => <TableCell key={column}>{value}</TableCell>)}</TableRow>)}
            {!block.rows.length && <TableRow><TableCell colSpan={block.headers.length}>No matching records.</TableCell></TableRow>}
          </TableBody>
        </Table></ResponsiveTable>}
        {block.id === 'tickets' && <TablePagination component="div" count={block.rows.length} page={page} onPageChange={(_, value) => setPage(value)} rowsPerPage={25} rowsPerPageOptions={[25]} />}
      </Box>)}
    </Stack></CardContent></Card>}
    <Dialog open={Boolean(deleteTarget)} onClose={() => { if (!busy) setDeleteTarget(null); }} aria-labelledby="delete-report-template-title">
      <DialogTitle id="delete-report-template-title">Delete template?</DialogTitle><DialogContent><DialogContentText>Delete “{deleteTarget?.name}” from your saved templates? Ticket records and the current report will remain available.</DialogContentText></DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setDeleteTarget(null)}>Cancel</Button><Button color="error" disabled={busy} onClick={remove}>Delete template</Button></DialogActions>
    </Dialog>
  </Stack>;
}
