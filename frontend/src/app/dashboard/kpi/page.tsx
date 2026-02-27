'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
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
import {
  Bar,
  BarChart,
  Cell,
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

  const [periodYear, setPeriodYear] = useState(currentYear);
  const [periodMonth, setPeriodMonth] = useState(currentMonth);
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
    try {
      const data = await kpiApi.listMonitoring({
        periodYear,
        periodMonth,
        unitId: filterUnitId === '' ? undefined : Number(filterUnitId),
      });
      setMonitoring(data);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to load KPI monitoring data.', { variant: 'error' });
    }
  }, [enqueueSnackbar, periodMonth, periodYear, filterUnitId]);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await kpiApi.dashboardSummary(periodYear, periodMonth);
      setSummary(data);
      if (!canManage) {
        const ownUnit = availableUnits[0];
        if (ownUnit) {
          const detail = await kpiApi.dashboardUnit(ownUnit.id, periodYear, periodMonth);
          setSelectedUnitDashboard(detail);
        }
      }
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to load KPI dashboard.', { variant: 'error' });
    }
  }, [enqueueSnackbar, periodMonth, periodYear, canManage, availableUnits]);

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
      periodMonth,
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
    try {
      const detail = await kpiApi.dashboardUnit(unitId, periodYear, periodMonth);
      setSelectedUnitDashboard(detail);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to load unit KPI dashboard.', { variant: 'error' });
    }
  };

  const unitScoreChart = (summary?.units || []).map((unit) => ({
    name: unit.unitName,
    score: Number(unit.score || 0),
    band: String(unit.band || 'unclassified').toLowerCase(),
  }));

  const bandDistribution = Object.values(
    unitScoreChart.reduce((acc, row) => {
      const band = row.band || 'unclassified';
      if (!acc[band]) {
        acc[band] = { name: band.toUpperCase(), value: 0 };
      }
      acc[band].value += 1;
      return acc;
    }, {} as Record<string, { name: string; value: number }>),
  );

  const selectedKpiDetailChart = (selectedUnitDashboard?.details || []).map((item) => ({
    name: item.code,
    normalized: Number(item.normalizedScore || 0),
    target: Number(item.targetValue || 0),
    actual: Number(item.actualValue || 0),
  }));

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
            <Grid item xs={12} md={3}>
              <TextField
                label="Period Year"
                type="number"
                value={periodYear}
                onChange={(e) => setPeriodYear(Number(e.target.value))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Period Month"
                value={periodMonth}
                onChange={(e) => setPeriodMonth(Number(e.target.value))}
                fullWidth
              >
                {monthOptions.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
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
        {canManage && <Tab label="KPI Master" />}
        {canManage && <Tab label="KPI Monitoring" />}
        <Tab label="KPI Dashboard" />
      </Tabs>

      {canManage && tab === 0 && (
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

      {canManage && ((tab === 1) || (!canManage && tab === 0)) && (
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

      {((canManage && tab === 2) || (!canManage && tab === 0)) && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Overall Score</Typography>
                <Typography variant="h4">{summary?.summary.overallScore ?? 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Units in Dashboard</Typography>
                <Typography variant="h4">{summary?.summary.unitCount ?? 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Monitoring Rows</Typography>
                <Typography variant="h4">{summary?.summary.rowCount ?? 0}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Unit KPI Scores" subheader="Scoreboard view by unit" />
              <CardContent>
                <Box sx={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={unitScoreChart}>
                      <XAxis dataKey="name" hide={unitScoreChart.length > 8} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                        {unitScoreChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={BAND_COLORS[entry.band] || BAND_COLORS.unclassified} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>

                <Table size="small">
                  <TableBody>
                    {(summary?.units || []).map((unit) => (
                      <TableRow key={unit.unitId}>
                        <TableCell>{unit.unitName}</TableCell>
                        <TableCell>{unit.score}</TableCell>
                        <TableCell><Chip size="small" label={unit.band.toUpperCase()} /></TableCell>
                        <TableCell>{unit.kpiCount}</TableCell>
                        <TableCell align="right">
                          <Button size="small" onClick={() => openUnitDashboard(unit.unitId)}>View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title={selectedUnitDashboard ? `Unit Detail - ${selectedUnitDashboard.unitName}` : 'Unit Detail'} subheader="KPI normalized metrics" />
              <CardContent>
                {!selectedUnitDashboard ? (
                  <Typography variant="body2" color="text.secondary">Select a unit to view KPI-level normalized scores.</Typography>
                ) : (
                  <>
                    <Typography variant="body2" sx={{ mb: 1 }}>Composite Score: <strong>{selectedUnitDashboard.score}</strong> ({selectedUnitDashboard.band})</Typography>
                    <Box sx={{ width: '100%', height: 220, mb: 2 }}>
                      <ResponsiveContainer>
                        <BarChart data={selectedKpiDetailChart}>
                          <XAxis dataKey="name" hide={selectedKpiDetailChart.length > 6} />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Bar dataKey="normalized" fill="#1976d2" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>KPI</TableCell>
                          <TableCell>Target</TableCell>
                          <TableCell>Actual</TableCell>
                          <TableCell>Normalized</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedUnitDashboard.details.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.code}</TableCell>
                            <TableCell>{item.targetValue}</TableCell>
                            <TableCell>{item.actualValue}</TableCell>
                            <TableCell>{item.normalizedScore}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader title="Band Distribution" />
              <CardContent>
                <Box sx={{ width: '100%', height: 240 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={bandDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {bandDistribution.map((entry, index) => (
                          <Cell key={`pie-${index}`} fill={BAND_COLORS[String(entry.name).toLowerCase()] || BAND_COLORS.unclassified} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
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
