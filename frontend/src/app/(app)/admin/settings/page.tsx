'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  InputAdornment,
  ListItemText,
  MenuItem,
  Stack,
  Select,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AdminPanelSettings as RoleIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Key as KeyIcon,
  Palette as PaletteIcon,
  PersonAdd as PersonAddIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { authApi } from '@/lib/api/auth';
import { ticketSettingsApi } from '@/app/api/references';
import { usersApi, RoleDefinition, RoleCapabilityRecord } from '@/lib/api/users';
import { unitsApi, Unit } from '@/lib/api/units';
import { isReportorialUnit, unitsForUserRole } from '@/lib/utils/unit-visibility';
import { UserRole } from '@/lib/types/auth';
import { useSse } from '@/lib/utils/useSse';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import {
  deleteBiometricCredentials,
  hasBiometricCredentials,
  isBiometricAvailable,
  saveBiometricCredentials,
} from '@/lib/auth/biometric';
import ResponsiveTable from '@/components/layout/ResponsiveTable';

// --- Change Password Card ---------------------------------------------------

function ChangePasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const handleSubmit = async () => {
    if (next.length < 8) {
      enqueueSnackbar('New password must be at least 8 characters.', { variant: 'error' });
      return;
    }
    if (next !== confirm) {
      enqueueSnackbar('New password and confirmation do not match.', { variant: 'error' });
      return;
    }
    if (next.includes('/') || next.includes('\\')) {
      enqueueSnackbar('Password cannot contain forward slash (/) or backslash (\\).', { variant: 'error' });
      return;
    }
    if (current.includes('/') || current.includes('\\')) {
      enqueueSnackbar('Current Password cannot contain forward slash (/) or backslash (\\).', { variant: 'error' });
      return;
    }
    try {
      setBusy(true);
      const res = await authApi.changePassword({ currentPassword: current, newPassword: next });
      enqueueSnackbar(res.message || 'Password updated successfully.', { variant: 'success' });
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err: any) {
      let msg = err?.response?.data?.message || 'Failed to update password.';
      if (Array.isArray(msg)) {
        msg = msg.join(' | ');
      }
      enqueueSnackbar(msg, {
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };
  const [generating, setGenerating] = useState(false);

  const handleGenerateRandom = async () => {
    try {
      setGenerating(true);
      const res = await authApi.generateRandomPassword();
      setNext(res.password);
      setConfirm(res.password);
      enqueueSnackbar('Random password generated.', { variant: 'info' });
    } catch (err) {
      enqueueSnackbar('Failed to generate password.', { variant: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleGeneratePassphrase = async () => {
    try {
      setGenerating(true);
      const res = await authApi.generatePassphrase();
      setNext(res.password);
      setConfirm(res.password);
      enqueueSnackbar('Random passphrase generated.', { variant: 'info' });
    } catch (err) {
      enqueueSnackbar('Failed to generate passphrase.', { variant: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card elevation={2}>
      <CardHeader
        avatar={<KeyIcon color="primary" />}
        title="Change Password"
        subheader="Update your account password."
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
              <TextField
                label="Current Password"
                type={showCurrent ? 'text' : 'password'}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                fullWidth
                autoComplete="current-password"
                inputProps={{ maxLength: 100 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowCurrent(!showCurrent)} edge="end">
                        {showCurrent ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="New Password"
              type={showNext ? 'text' : 'password'}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              fullWidth
              autoComplete="new-password"
              inputProps={{ maxLength: 100 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowNext(!showNext)} edge="end">
                      {showNext ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Confirm New Password"
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              fullWidth
              autoComplete="new-password"
              inputProps={{ maxLength: 100 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowConfirm(!showConfirm)} edge="end">
                      {showConfirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={busy || !current || !next || !confirm}
            >
              {busy ? 'Updating...' : 'Update Password'}
            </Button>
            <Button
              variant="outlined"
              onClick={handleGenerateRandom}
              disabled={busy || generating}
            >
              Generate Random Password
            </Button>
            <Button
              variant="outlined"
              onClick={handleGeneratePassphrase}
              disabled={busy || generating}
            >
              Generate Passphrase
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

// --- Theme Card -------------------------------------------------------------

function ThemeCard() {
  const { mode, toggleMode } = useThemeMode();
  return (
    <Card elevation={2}>
      <CardHeader
        avatar={<PaletteIcon color="primary" />}
        title="Theme Preference"
        subheader="Switch between light and dark interface themes. Your preference is saved automatically."
      />
      <CardContent>
        <FormControlLabel
          control={<Switch checked={mode === 'dark'} onChange={toggleMode} color="primary" />}
          label={
            <Box>
              <Typography variant="body1" component="span">
                {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </Typography>
              <Typography variant="body2" color="text.secondary" display="block">
                {mode === 'dark'
                  ? 'Using dark backgrounds  easier on the eyes in low-light environments.'
                  : 'Using light backgrounds  standard high-contrast interface.'}
              </Typography>
            </Box>
          }
        />
      </CardContent>
    </Card>
  );
}


// --- Security Settings Card -------------------------------------------------

function SecuritySettingsCard() {
  const { user, myCap } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [defaultPassword, setDefaultPassword] = useState('');
  const [mfaTestMode, setMfaTestMode] = useState(false);
  const [vaptMode, setVaptMode] = useState(false);
  const [appMode, setAppMode] = useState('full');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canManage = Boolean(myCap?.isSecuritySettingsAccess) || Boolean(myCap?.isTicketSettingsFocal);
  const vaptSettingsEnabled = String(import.meta.env.VITE_VAPT_SETTINGS_ENABLED || '').trim().toLowerCase() === 'true';

  useEffect(() => {
    if (canManage) {
      usersApi.getSecurityConfig().then(config => {
        setDefaultPassword(config.defaultPassword || '');
        setMfaTestMode(Boolean((config as any).mfaTestMode));
        setVaptMode(Boolean((config as any).vaptMode));
        setAppMode((config as any).appMode || 'full');
        setLoading(false);
      }).catch(err => {
        enqueueSnackbar('Failed to load security config', { variant: 'error' });
        setLoading(false);
      });
    }
  }, [canManage, enqueueSnackbar]);

  const handleSave = async () => {
    if (!defaultPassword) {
      enqueueSnackbar('Default password cannot be empty', { variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { defaultPassword, mfaTestMode, appMode };
      if (vaptSettingsEnabled) payload.vaptMode = vaptMode;
      await usersApi.updateSecurityConfig(payload as any);
      enqueueSnackbar('Security settings updated successfully', { variant: 'success' });
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update security settings', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) return null;

  return (
    <Card elevation={2} sx={{ mb: 3 }}>
      <CardHeader
        avatar={<SecurityIcon color="primary" />}
        title="Security Settings"
        subheader="Manage application-wide security settings."
      />
      <CardContent>
        {loading ? (
          <Typography>Loading...</Typography>
        ) : (
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="System Default Password"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                  inputProps={{ maxLength: 100 }}
                helperText="This password is used as the initial password for new users and when resetting passwords."
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={mfaTestMode}
                    onChange={(e) => setMfaTestMode(e.target.checked)}
                    color="primary"
                  />
                }
                label="Enable MFA Test Mode"
              />
            </Grid>
            {vaptSettingsEnabled && (
<Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={vaptMode}
                    onChange={(e) => setVaptMode(e.target.checked)}
                    color="secondary"
                  />
                }
                label="Enable VAPT Mode (Skip DDoS & shorter JWT)"
              />
            </Grid>
            )}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>App Mode</InputLabel>
                <Select
                  value={appMode}
                  label="App Mode"
                  onChange={(e) => setAppMode(e.target.value)}
                >
                  <MenuItem value="full">Full (Ticketing + Compliance)</MenuItem>
                  <MenuItem value="ticketing_only">Ticketing Only</MenuItem>
                  <MenuItem value="compliance_only">Compliance Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving || !defaultPassword}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );
}


function GlobalSettingsCard() {
  const { myCap } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const canManageGlobal = Boolean(myCap?.isGlobalSettingsAccess);
  const canManageSmtp = canManageGlobal || Boolean(myCap?.isSmtpSettingsAccess);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [smtpTestLoading, setSmtpTestLoading] = useState(false);
  const [smtpTestEmail, setSmtpTestEmail] = useState('');
  const [config, setConfig] = useState<any>({
    assignmentStrategy: 'CURRENT_AUTO',
    roundRobinCapHours: 80,
    autoCloseDays: 3,
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    smtpFromName: '',
    primarySmtpDailyLimit: 2000,
    scheduleMode: 'OFFICE_HOURS',
    officeClockin: '08:00:00',
    officeClockout: '17:00:00',
    cwwClockinStart: '07:00:00',
    cwwClockinEnd: '08:00:00',
    cwwClockoutStart: '18:00:00',
    cwwClockoutEnd: '19:00:00',
    isEmailNotificationsEnabled: true,
    emailTestOverride: '',
  });

  const load = useCallback(async () => {
    if (!canManageGlobal) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setConfig(await ticketSettingsApi.getGlobalConfig());
    } catch {
      enqueueSnackbar('Failed to load global settings', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [canManageGlobal, enqueueSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  useSse(['GLOBAL_SETTINGS_UPDATED'], load);

  const handleSave = async () => {
    try {
      setSaving(true);
      const { id, createdAt, updatedAt, primarySmtpSentToday, primarySmtpLastSentDate, ...payload } = config as any;
      await ticketSettingsApi.updateGlobalConfig(payload);
      enqueueSnackbar('Global settings updated', { variant: 'success' });
      await load();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to update global settings', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!smtpTestEmail.trim()) {
      enqueueSnackbar('Please enter an email address to test', { variant: 'warning' });
      return;
    }
    try {
      setSmtpTestLoading(true);
      const res = await ticketSettingsApi.testEmail(smtpTestEmail.trim());
      enqueueSnackbar(res.message, { variant: res.sent ? 'success' : 'error' });
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Test email failed', { variant: 'error' });
    } finally {
      setSmtpTestLoading(false);
    }
  };

  if (!canManageGlobal) return null;

  return (
    <Card elevation={2}>
      <CardHeader
        avatar={<SecurityIcon color="primary" />}
        title="Global Settings"
        subheader="Manage routing, work hours, and outbound emails."
      />
      <CardContent>
        {loading ? (
          <Typography>Loading...</Typography>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" fontWeight={600} mb={2}>Routing Configuration</Typography>
              <Stack spacing={2}>
                <TextField select label="Assignment Strategy" value={config.assignmentStrategy} onChange={(e) => setConfig((p: any) => ({ ...p, assignmentStrategy: e.target.value }))} fullWidth>
                  <MenuItem value="CURRENT_AUTO">Zero-Active</MenuItem>
                  <MenuItem value="CAPPED_ROUND_ROBIN">Capped Round-Robin</MenuItem>
                </TextField>
                <TextField label="Auto Close (Days)" type="number" value={config.autoCloseDays} onChange={(e) => setConfig((p: any) => ({ ...p, autoCloseDays: Number(e.target.value) }))} fullWidth />
                {config.assignmentStrategy === 'CAPPED_ROUND_ROBIN' && (
                  <TextField label="Round-Robin SLA Cap (hours)" type="number" value={config.roundRobinCapHours} onChange={(e) => setConfig((p: any) => ({ ...p, roundRobinCapHours: Number(e.target.value) }))} fullWidth />
                )}
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" fontWeight={600} mb={2}>Work Hours & Schedule</Typography>
              <Stack spacing={2}>
                <TextField select label="Schedule Mode" value={config.scheduleMode || 'OFFICE_HOURS'} onChange={(e) => setConfig((p: any) => ({ ...p, scheduleMode: e.target.value }))} fullWidth>
                  <MenuItem value="OFFICE_HOURS">Standard Office Hours</MenuItem>
                  <MenuItem value="CWW">Compressed Work Week (CWW)</MenuItem>
                </TextField>
                {config.scheduleMode === 'OFFICE_HOURS' && (
                  <>
                    <TextField label="Office Clock-in" type="time" value={config.officeClockin || '08:00:00'} onChange={(e) => setConfig((p: any) => ({ ...p, officeClockin: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
                    <TextField label="Office Clock-out" type="time" value={config.officeClockout || '17:00:00'} onChange={(e) => setConfig((p: any) => ({ ...p, officeClockout: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
                  </>
                )}
                {config.scheduleMode === 'CWW' && (
                  <>
                    <TextField label="CWW Clock-in Start" type="time" value={config.cwwClockinStart || '07:00:00'} onChange={(e) => setConfig((p: any) => ({ ...p, cwwClockinStart: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
                    <TextField label="CWW Clock-in End" type="time" value={config.cwwClockinEnd || '08:00:00'} onChange={(e) => setConfig((p: any) => ({ ...p, cwwClockinEnd: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
                    <TextField label="CWW Clock-out Start" type="time" value={config.cwwClockoutStart || '18:00:00'} onChange={(e) => setConfig((p: any) => ({ ...p, cwwClockoutStart: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
                    <TextField label="CWW Clock-out End" type="time" value={config.cwwClockoutEnd || '19:00:00'} onChange={(e) => setConfig((p: any) => ({ ...p, cwwClockoutEnd: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
                  </>
                )}
              </Stack>
            </Grid>
            {canManageSmtp && (
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="h6" fontWeight={600} mb={2}>SMTP Configuration</Typography>
                <Stack spacing={2} maxWidth={520}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="subtitle1" fontWeight={600}>Enable Outbound Emails</Typography>
                    <Switch checked={config.isEmailNotificationsEnabled ?? true} onChange={(e) => setConfig((p: any) => ({ ...p, isEmailNotificationsEnabled: e.target.checked }))} />
                  </Box>
                  {config.isEmailNotificationsEnabled && (
                    <TextField label="Test Override Email" value={config.emailTestOverride || ''} onChange={(e) => setConfig((p: any) => ({ ...p, emailTestOverride: e.target.value }))} inputProps={{ maxLength: 100 }} fullWidth />
                  )}
                  <TextField label="SMTP Host" value={config.smtpHost || ''} onChange={(e) => setConfig((p: any) => ({ ...p, smtpHost: e.target.value }))} inputProps={{ maxLength: 100 }} fullWidth />
                  <TextField label="SMTP Port" type="number" value={config.smtpPort || ''} onChange={(e) => setConfig((p: any) => ({ ...p, smtpPort: Number(e.target.value) }))} fullWidth />
                  <TextField label="SMTP Username" value={config.smtpUser || ''} onChange={(e) => setConfig((p: any) => ({ ...p, smtpUser: e.target.value }))} inputProps={{ maxLength: 100 }} fullWidth />
                  <TextField label="SMTP Password" type="password" value={config.smtpPass || ''} onChange={(e) => setConfig((p: any) => ({ ...p, smtpPass: e.target.value }))} inputProps={{ maxLength: 100 }} fullWidth />
                  <TextField label="From Email Address" value={config.smtpFrom || ''} onChange={(e) => setConfig((p: any) => ({ ...p, smtpFrom: e.target.value }))} inputProps={{ maxLength: 100 }} fullWidth />
                  <TextField label="From Name" value={config.smtpFromName || ''} onChange={(e) => setConfig((p: any) => ({ ...p, smtpFromName: e.target.value }))} inputProps={{ maxLength: 100 }} fullWidth />
                  <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                    <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Global Settings'}</Button>
                    <TextField size="small" label="Test Recipient Email" value={smtpTestEmail} onChange={(e) => setSmtpTestEmail(e.target.value)} sx={{ flexGrow: 1, minWidth: 240 }} />
                    <Button variant="outlined" onClick={handleTest} disabled={smtpTestLoading}>{smtpTestLoading ? 'Sending...' : 'Test Connection'}</Button>
                  </Box>
                </Stack>
              </Grid>
            )}
          </Grid>
        )}
      </CardContent>
    </Card>
  );
}

// --- Role Capabilities Card ------------------------------------------------

const CAPABILITY_CATEGORIES = [
  {
    name: 'Ticketing & Support Operations',
    columns: [
      { key: 'isFocal', label: 'Focal', description: 'Compliance document & focal-level access' },
      { key: 'isDesktop', label: 'Desktop', description: 'Handle desktop/hardware support tickets' },
      { key: 'isItSupport', label: 'IT Support', description: 'Handle IT/software support tickets' },
      { key: 'isPantawidIct', label: 'Pantawid ICT', description: 'Handle Pantawid ICT support tickets' },
      { key: 'isIto', label: 'ITO Staff', description: 'Non-technician ITO professional staff group' },
      { key: 'isEscalationFocal', label: 'Escalation', description: 'Can receive escalated tickets' },
      { key: 'isTicketSettingsFocal', label: 'Ticket Admin', description: 'Full ticket settings & reports access' },
      { key: 'isAllTickets', label: 'See All Tickets', description: 'View all tickets system-wide (not just own)' },
      { key: 'isTicketFocal', label: 'Assign Tickets', description: 'Manually assign/reassign tickets to technicians' },
      { key: 'isTicketReportsAccess', label: 'Ticket Reports View', description: 'View own technician Overview, Ratings, and Performance' },
      { key: 'isTicketReportsManage', label: 'Ticket Reports Manage', description: 'View all technicians, Issues, and SLA Insights' },
    ]
  },
  {
    name: 'User & Role Management',
    columns: [
      { key: 'isUserManagementAdmin', label: 'User Mgt Admin', description: 'Create/Edit/Deactivate all users' },
      { key: 'isUserManagementView', label: 'User Mgt View', description: 'Create/Edit regular users only' },
      { key: 'isSystemRolesAccess', label: 'System Roles Admin', description: 'Access System Role Definitions' },
      { key: 'isRoleCapabilitiesAccess', label: 'Capabilities Admin', description: 'Access Role Capabilities Matrix' },
      { key: 'isUserManagementRolesManage', label: 'Role Definition Manage', description: 'Create, edit, and delete role definitions' },
    ]
  },
  {
    name: 'Compliance',
    columns: [
      { key: 'isKpiAccess', label: 'KPI View', description: 'Access KPI dashboard/read endpoints' },
      { key: 'isKpiManage', label: 'KPI Manage', description: 'Create/update KPI master and monitoring records' },
      { key: 'isReviewsAccess', label: 'Reviews', description: 'Access review workflows' },
      { key: 'isMetricsAccess', label: 'Metrics', description: 'Access Metrics module' },
      { key: 'isMetricsManage', label: 'Metrics Manage', description: 'Create, edit, and delete metric templates' },
    ]
  },
  {
    name: 'Attendance',
    columns: [
      { key: 'isAttendanceAccess', label: 'Attendance View', description: 'Access attendance and office-day views' },
      { key: 'isAttendanceManage', label: 'Attendance Manage', description: 'Mutate attendance and office-day records' },
    ]
  },
  {
    name: 'Documents & Records',
    columns: [
      { key: 'isReportsAccess', label: 'Reports', description: 'Access consolidated compliance reports' },
      { key: 'isMovAccess', label: 'MoV', description: 'Access MoV Builder' },
      { key: 'isDocumentsAccess', label: 'Documents', description: 'Access Documents module' },
      { key: 'isRepositoryAccess', label: 'Repository', description: 'Access Repository module' },
      { key: 'isIssuancesAccess', label: 'Issuances', description: 'Access Issuances module' },
      { key: 'isDocumentTypesManage', label: 'Document Types Manage', description: 'Manage reportorial document types' },
      { key: 'isAuditAccess', label: 'Audit Logs', description: 'Access audit log records' },
      { key: 'isUnitsAccess', label: 'Units View', description: 'View organizational units' },
      { key: 'isUnitsManage', label: 'Units Manage', description: 'Create, edit, and delete organizational units' },
    ]
  },
  {
    name: 'Global, Security & SMTP Settings',
    columns: [
      { key: 'isGlobalSettingsAccess', label: 'Global Settings Admin', description: 'Manage routing, work hours, schedules, and SMTP in Settings' },
      { key: 'isDutyViewerAccess', label: 'Duty Viewer', description: 'View Duty dashboard cards and monthly Duty map' },
      { key: 'isDutyAdminAccess', label: 'Duty Administrator', description: 'Manage duty rosters, logs, exceptions, meetings, and attendance release' },
      { key: 'isSecuritySettingsAccess', label: 'Security Settings Admin', description: 'Manage the default password in Security Settings' },
      { key: 'isSmtpSettingsAccess', label: 'SMTP Admin', description: 'Manage SMTP credentials in Settings' },
    ]
  }
];

function CapabilityCategoryAccordion({ category, caps, saving, handleToggle, canEdit }: { category: any, caps: any[], saving: string | null, handleToggle: (role: string, field: any, val: boolean) => void, canEdit: boolean }) {
  return (
    <Accordion
      disableGutters
      square
      sx={{ borderBottom: 1, borderColor: 'divider', '&:before': { display: 'none' } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1" fontWeight="bold">
          {category.name}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        <ResponsiveTable minWidth={620} testId={`capability-category-${category.name}`}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    width: 160,
                    minWidth: 160,
                    maxWidth: 160,
                    position: 'sticky',
                    left: 0,
                    zIndex: 101,
                    bgcolor: 'background.paper',
                    borderRight: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  Role
                </TableCell>
                {category.columns.map((col: any) => (
                  <TableCell
                    key={col.key as string}
                    align="center"
                    sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                  >
                    <Tooltip title={col.description} placement="top">
                      <span>{col.label}</span>
                    </Tooltip>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {caps
                .filter((c) => c.roleValue !== 'user' && c.roleValue !== 'super_admin')
                .map((cap) => (
                  <TableRow
                    key={cap.roleValue}
                    hover
                    sx={{ opacity: saving === cap.roleValue ? 0.6 : 1 }}
                  >
                    <TableCell
                      sx={{
                        width: 160,
                        minWidth: 160,
                        maxWidth: 160,
                        position: 'sticky',
                        left: 0,
                        zIndex: 100,
                        bgcolor: 'background.paper',
                        borderRight: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Chip
                        label={cap.roleValue}
                        size="small"
                        color={cap.roleValue === 'super_admin' ? 'error' : 'default'}
                      />
                    </TableCell>
                    {category.columns.map((col: any) => {
                      const val = cap[col.key as keyof RoleCapabilityRecord] as boolean;
                      const isLocked = cap.roleValue === 'super_admin' || !canEdit;
                      return (
                        <TableCell key={col.key as string} align="center">
                          <Switch
                            size="small"
                            checked={cap.roleValue === 'super_admin' ? true : Boolean(val)}
                            disabled={isLocked || saving === cap.roleValue}
                            onChange={(e) =>
                              handleToggle(cap.roleValue, col.key as string, e.target.checked)
                            }
                            color="primary"
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </ResponsiveTable>
      </AccordionDetails>
    </Accordion>
  );
}

function RoleCapabilitiesCard() {
  const { user, myCap } = useAuth();
  const canEdit = Boolean(myCap?.isRoleCapabilitiesAccess);
  const [caps, setCaps] = useState<RoleCapabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // roleValue being saved
  const { enqueueSnackbar } = useSnackbar();

  const load = useCallback(async () => {
    try {
      const data = await usersApi.listCapabilities();
      setCaps(data);
    } catch {
      enqueueSnackbar('Failed to load role capabilities.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    load();
  }, [load]);
  useSse(['GLOBAL_SETTINGS_UPDATED'], load);

  const handleToggle = async (
    roleValue: string,
    field: keyof RoleCapabilityRecord,
    newValue: boolean,
  ) => {
    setSaving(roleValue);
    try {
      const updated = await usersApi.updateCapability(roleValue, { [field]: newValue });
      setCaps((prev) => prev.map((c) => (c.roleValue === roleValue ? updated : c)));
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to update capability.', {
        variant: 'error',
      });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card elevation={2}>
      <CardHeader
        avatar={<SecurityIcon color="primary" />}
        title="Role Capabilities Matrix"
        subheader={
          canEdit
            ? 'Toggle capability flags per role. Changes take effect immediately — the backend cache is reloaded on each save.'
            : 'View-only. Role capability flags for the system. Contact the System Administrator to make changes.'
        }
      />
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        {loading ? (
          <Box p={2}>
            <Typography variant="body2" color="text.secondary">
              Loading capabilities...
            </Typography>
          </Box>
        ) : (
          <Box>
            {CAPABILITY_CATEGORIES.map((category) => (
              <CapabilityCategoryAccordion
                key={category.name}
                category={category}
                caps={caps}
                saving={saving}
                handleToggle={handleToggle}
                canEdit={canEdit}
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// --- Role Management Card ---------------------------------------------------

function RoleManagementCard() {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RoleDefinition | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmRole, setDeleteConfirmRole] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState({
    value: '',
    label: '',
    description: '',
    assignable: true,
  });

  const loadRoles = useCallback(async () => {
    try {
      const list = await usersApi.getRoles();
      setRoles(list);
    } catch {
      enqueueSnackbar('Failed to load role definitions.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);
  useSse(['GLOBAL_SETTINGS_UPDATED'], loadRoles);

  const handleCreate = async () => {
    if (form.description.trim().length < 5) {
      enqueueSnackbar('Description must be at least 5 characters.', { variant: 'warning' });
      return;
    }
    const codeVal = form.value.trim().toLowerCase().replace(/\s+/g, '_');
    if (!codeVal.match(/^[a-z0-9_]+$/)) {
      enqueueSnackbar('Role code must use lowercase letters, digits, and underscores only.', {
        variant: 'error',
      });
      return;
    }
    try {
      setSaving(true);
      await usersApi.createRoleDefinition({
        ...form,
        value: codeVal,

      });
      enqueueSnackbar('Role definition added.', { variant: 'success' });
      setCreateOpen(false);
      setForm({ value: '', label: '', description: '', assignable: true });
      await loadRoles();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to create role definition.', {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    if (selected.description.trim().length < 5) {
      enqueueSnackbar('Description must be at least 5 characters.', { variant: 'warning' });
      return;
    }
    try {
      setSaving(true);
      const originalValue = (selected as any)._originalValue ?? selected.value;
      await usersApi.updateRoleDefinition(originalValue, {
        value: selected.value !== originalValue ? selected.value : undefined,
        label: selected.label,
        description: selected.description,
        assignable: selected.value === 'super_admin' ? false : selected.assignable,
      });
      enqueueSnackbar('Role definition updated.', { variant: 'success' });
      setSelected(null);
      await loadRoles();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to update role definition.', {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (roleValue: string) => {
    setDeleteConfirmRole(roleValue);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmRole) return;
    try {
      await usersApi.deleteRoleDefinition(deleteConfirmRole);
      enqueueSnackbar(`Role "${deleteConfirmRole}" deleted.`, { variant: 'success' });
      setDeleteConfirmRole(null);
      await loadRoles();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to delete role.', {
        variant: 'error',
      });
    }
  };

  return (
    <Card elevation={2}>
      <CardHeader
        avatar={<RoleIcon color="primary" />}
        title="System Role Definitions"
        subheader="Manage roles for user provisioning. System roles cannot be deleted; custom roles can have their code renamed or deleted."
        action={
          <Button variant="outlined" size="small" onClick={() => setCreateOpen(true)}>
            Add Role Definition
          </Button>
        }
      />
      <CardContent>
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading roles...
          </Typography>
        ) : (
          <>
            <ResponsiveTable minWidth={620} testId="role-management-table">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Role</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Code</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Assignable</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Actions</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles
                  .filter((role) => role.value !== 'super_admin')
                  .map((role) => (
                    <TableRow key={role.value} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {role.label}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={role.value}
                          size="small"
                          variant="outlined"
                          color={role.isSystem || role.is_system ? 'default' : 'primary'}
                        />
                      </TableCell>
                      <TableCell>
                        {role.assignable ? (
                          <Chip label="Yes" size="small" color="success" />
                        ) : (
                          <Chip label="System Only" size="small" color="default" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() =>
                              setSelected({ ...role, _originalValue: role.value } as any)
                            }
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {!(role.isSystem || role.is_system) && (
                          <Tooltip title="Delete custom role">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(role.value)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            </ResponsiveTable>

            <Dialog
              open={Boolean(selected)}
              onClose={() => setSelected(null)}
              maxWidth="xs"
              fullWidth
            >
              <DialogTitle>Edit Role Definition</DialogTitle>
              <DialogContent dividers>
                <TextField
                  label="Role Code"
                  value={selected?.value || ''}
                  onChange={(e) =>
                    setSelected((prev) =>
                      prev
                        ? {
                            ...prev,
                            value: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                          }
                        : prev,
                    )
                  }
                  fullWidth
                  inputProps={{ maxLength: 255 }}
                  disabled={Boolean(selected?.isSystem || selected?.is_system)}
                  helperText={
                    selected?.isSystem || selected?.is_system
                      ? 'System role codes are fixed'
                      : 'Custom role \u2014 code can be renamed'
                  }
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Role Label"
                  value={selected?.label || ''}
                  onChange={(e) =>
                    setSelected((prev) => (prev ? { ...prev, label: e.target.value } : prev))
                  }
                  fullWidth
                  inputProps={{ maxLength: 255 }}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Description"
                  value={selected?.description || ''}
                  onChange={(e) =>
                    setSelected((prev) => (prev ? { ...prev, description: e.target.value } : prev))
                  }
                  fullWidth
                  multiline
                  minRows={3}
                  sx={{ mb: 2 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(selected?.assignable)}
                      disabled={selected?.value === 'super_admin'}
                      onChange={(e) =>
                        setSelected((prev) =>
                          prev ? { ...prev, assignable: e.target.checked } : prev,
                        )
                      }
                    />
                  }
                  label="Assignable during user creation"
                />

              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSelected(null)}>Close</Button>
                <Button
                  variant="contained"
                  onClick={handleUpdate}
                  disabled={saving || !selected?.label || selected.description.trim().length < 5}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </DialogActions>
            </Dialog>

            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
              <DialogTitle>Add Role Definition</DialogTitle>
              <DialogContent dividers>
                <TextField
                  label="Role Code"
                  value={form.value}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      value: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                    }))
                  }
                  fullWidth
                  inputProps={{ maxLength: 255 }}
                  helperText="Lowercase letters, digits, and underscores. E.g. section_head"
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Role Label"
                  value={form.label}
                  onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                  fullWidth
                  inputProps={{ maxLength: 255 }}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Description"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  fullWidth
                  multiline
                  minRows={3}
                  sx={{ mb: 2 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.value === 'super_admin' ? false : Boolean(form.assignable)}
                      disabled={form.value === 'super_admin'}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, assignable: e.target.checked }))
                      }
                    />
                  }
                  label="Assignable during user creation"
                />

              </DialogContent>
              <DialogActions>
                <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button
                  variant="contained"
                  onClick={handleCreate}
                  disabled={saving || !form.value || !form.label || form.description.trim().length < 5}
                >
                  {saving ? 'Saving...' : 'Create'}
                </Button>
              </DialogActions>
            </Dialog>

            <Dialog open={!!deleteConfirmRole} onClose={() => setDeleteConfirmRole(null)}>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogContent>
                <Typography>
                  Are you sure you want to delete custom role "{deleteConfirmRole}"? This cannot be undone.
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDeleteConfirmRole(null)}>Cancel</Button>
                <Button onClick={confirmDelete} color="error" variant="contained">
                  Delete
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// --- Focal User Management Card ---------------------------------------------

function FocalUserManagementCard() {
  const { user: currentUser, myCap, logout } = useAuth();
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [focalUsers, setFocalUsers] = useState<any[]>([]);
  const [userTab, setUserTab] = useState(0); // 0 = RICTMS Staff, 1 = Regular Users
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const handleTableScroll = useCallback(() => {
    if (tableContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(handleTableScroll, 100);
    window.addEventListener('resize', handleTableScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleTableScroll);
    };
  }, [handleTableScroll, focalUsers]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [creating, setCreating] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [resetUser, setResetUser] = useState<any | null>(null);
  const [resetting, setResetting] = useState(false);
  const [defaultPassword, setDefaultPassword] = useState('Changeme123!');
  const [editing, setEditing] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    staffId: '',
    role: UserRole.USER,
    position: '',
    positionFull: '',
    designation: '',
    autoAssignmentEligible: true,

    unitIds: [] as number[],
  });

  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
  const isUserManagementAdmin = Boolean(myCap?.isUserManagementAdmin);

  const assignableRoles = useMemo(() => {
    if (isUserManagementAdmin) {
      return roles.filter((r) => r.assignable);
    }
    return roles.filter((r) => r.value === 'user');
  }, [roles, isUserManagementAdmin]);

  const selectableUnits = useMemo(
    () => unitsForUserRole(units, editUser?.role),
    [units, editUser?.role],
  );

  const canModifyUser = useCallback((u: any) => {
    // No one can modify Super Admin except Super Admin
    if (u.role === 'super_admin' && !isSuperAdmin) return false;

    if (currentUser?.id == u.id) return true;

    const hasViewCap = Boolean(myCap?.isUserManagementView);
    
    if (!isUserManagementAdmin && !hasViewCap) return false;

    if (!isUserManagementAdmin && hasViewCap && u.role !== 'user') return false;

    const isTargetAdmin = u.role === 'super_admin' || u.isUserManagementAdmin === true;
    
    if (myCap?.isUserManagementRolesManage) return true;
    if (isUserManagementAdmin && isTargetAdmin) return false;
    
    return true;
  }, [currentUser, isSuperAdmin, isUserManagementAdmin, myCap]);

  // Email autocomplete suggestions
  const [emailSuggestions, setEmailSuggestions] = useState<
    { id: number; email: string; firstName?: string; lastName?: string }[]
  >([]);
  const [emailInputValue, setEmailInputValue] = useState('');
  const [isExistingEmail, setIsExistingEmail] = useState(false);

  useEffect(() => {
    if (!emailInputValue || emailInputValue.length < 2) {
      setEmailSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await usersApi.searchEmails(emailInputValue);
        setEmailSuggestions(results);
      } catch {
        setEmailSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [emailInputValue]);

  const reload = useCallback(async () => {
    try {
      const [users, roleList, unitList, securityConfig] = await Promise.all([
        usersApi.list(),
        usersApi.getRoles(),
        unitsApi.listAll(),
        usersApi.getSecurityConfig().catch(() => ({ defaultPassword: 'Changeme123!' })),
      ]);
      setRoles(roleList);
      setUnits(unitList);
      // Show ALL users — not filtered by assignable flag
      setFocalUsers(users);
      if (securityConfig?.defaultPassword) {
        setDefaultPassword(securityConfig.defaultPassword);
      }
    } catch {
      /* non-blocking */
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);
  useSse(['GLOBAL_SETTINGS_UPDATED'], reload);

  const resetForm = () => {
    setForm({
      email: '',
      password: defaultPassword,
      firstName: '',
      middleName: '',
      lastName: '',
      suffix: '',
      staffId: '',
      role: UserRole.USER,
      position: '',
      positionFull: '',
      designation: '',
      autoAssignmentEligible: true,
      unitIds: [],
    });
    setIsExistingEmail(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setEmailInputValue('');
    setEmailSuggestions([]);
    setCreateDialogOpen(true);
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      // Only include password in payload if it was provided (blank = no change for existing accounts)
      const payload: any = { ...form };
      if (!payload.password) delete payload.password;
      await usersApi.create(payload);
      enqueueSnackbar(`User ${form.email} created successfully.`, { variant: 'success' });
      resetForm();
      setCreateDialogOpen(false);
      await reload();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      const conciseMessage = Array.isArray(message) ? message[0] : message;
      enqueueSnackbar(conciseMessage || 'Failed to create user.', { variant: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    if (editUser.id === currentUser?.id && editUser.unitIds?.length !== 1) {
      enqueueSnackbar('A unit is required before saving your profile.', { variant: 'warning' });
      return;
    }
    try {
      setEditing(true);
      await usersApi.updateUser(editUser.id, {
        email: editUser.email,
        staffId: editUser.staffId,
        phoneNumber: editUser.phoneNumber,
        sex: editUser.sex,
        firstName: editUser.firstName,
        middleName: editUser.middleName,
        lastName: editUser.lastName,
        suffix: editUser.suffix,
        position: editUser.position,
        positionFull: editUser.positionFull,
        designation: editUser.designation,

        autoAssignmentEligible: Boolean(editUser.autoAssignmentEligible),
        role: editUser.role,
        unitIds: editUser.unitIds,
      });
      const roleChanged = currentUser?.id === editUser.id && currentUser?.role !== editUser.role;

      enqueueSnackbar('User profile updated successfully.', { variant: 'success' });
      setEditUser(null);

      if (roleChanged) {
        enqueueSnackbar('Your role has been updated. Please log in again to apply changes.', {
          variant: 'info',
        });
        setTimeout(() => logout(), 2000);
        return; // Skip reload() to avoid triggering the global interceptor immediately
      }

      await reload();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to update user.', {
        variant: 'error',
      });
    } finally {
      setEditing(false);
    }
  };

  const handleToggleActive = async (u: any) => {
    try {
      if (u.is_active || u.active) {
        await usersApi.deactivate(u.id);
      } else {
        await usersApi.activate(u.id);
      }
      await reload();
    } catch {
      enqueueSnackbar('Failed to update user status.', { variant: 'error' });
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser) return;
    try {
      setResetting(true);
      await usersApi.resetPassword(resetUser.id);
      enqueueSnackbar(`Password reset successfully to ${defaultPassword}!`, { variant: 'success' });
      setResetUser(null);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to reset password', { variant: 'error' });
    } finally {
      setResetting(false);
    }
  };

  return (
    <Card elevation={2}>
      <CardHeader
        avatar={<PersonAddIcon color="primary" />}
        title="User Management"
        subheader="Create and manage user accounts for RICTMS staff and regular users."
        action={
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            size="small"
            onClick={handleOpenCreate}
          >
            Create New User
          </Button>
        }
      />
      <CardContent>
        {/* Create user dialog */}
        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Create New User</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email Address"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                    inputProps={{ maxLength: 100 }}
                  fullWidth
                  autoComplete="off"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  required
                  label="Role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  fullWidth
                >
                  {assignableRoles.map((r) => (
                    <MenuItem key={r.value} value={r.value}>
                      {r.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.autoAssignmentEligible}
                      onChange={(e) => setForm({ ...form, autoAssignmentEligible: e.target.checked })}
                    />
                  }
                  label="Eligible for automatic ticket assignment"
                />
                <Typography variant="caption" display="block" color="text.secondary">
                  Disable this for a technician who should remain manually assignable but not receive automatic tickets.
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  required
                  label="First Name"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    inputProps={{ maxLength: 100 }}
                  fullWidth
                  autoComplete="off"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Middle Name"
                  value={form.middleName}
                  onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                    inputProps={{ maxLength: 100 }}
                  fullWidth
                  autoComplete="off"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  required
                  label="Last Name"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    inputProps={{ maxLength: 100 }}
                  fullWidth
                  autoComplete="off"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Suffix (Jr./Sr.)"
                  value={form.suffix}
                  onChange={(e) => setForm({ ...form, suffix: e.target.value })}
                    inputProps={{ maxLength: 5 }}
                  fullWidth
                  autoComplete="off"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={handleCreate}
              disabled={creating || !form.email || (!form.password && !isExistingEmail) || !form.role || !form.firstName || !form.lastName}
            >
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </DialogActions>
        </Dialog>

        <Divider sx={{ my: 3 }} />

        {/* Controls: Tabs & Search */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            mb: 2,
            gap: 2,
          }}
        >
          <Tabs
            value={userTab}
            onChange={(_, v) => {
              setUserTab(v);
              setPage(0);
            }}
            sx={{ minWidth: 0 }}
          >
            <Tab
              label={`RICTMS Staff (${focalUsers.filter((u: any) => u.role !== 'user' && u.role !== 'super_admin').length})`}
            />
            <Tab
              label={`Regular Users (${focalUsers.filter((u: any) => u.role === 'user').length})`}
            />
          </Tabs>
          <TextField
            size="small"
            placeholder="Search staff by name or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            inputProps={{ maxLength: 100 }}
            sx={{ width: { xs: '100%', sm: 300 } }}
          />
        </Box>

        {(() => {
          let displayUsers =
            userTab === 0
              ? focalUsers.filter((u: any) => u.role !== 'user' && u.role !== 'super_admin')
              : focalUsers.filter((u: any) => u.role === 'user');

          if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            displayUsers = displayUsers.filter((u: any) => {
              const fullName =
                `${u.firstName || ''} ${u.middleName || ''} ${u.lastName || ''} ${u.suffix || ''}`.toLowerCase();
              return (
                fullName.includes(lowerQuery) ||
                (u.email || '').toLowerCase().includes(lowerQuery) ||
                (u.staffId || '').toLowerCase().includes(lowerQuery)
              );
            });
          }

          if (displayUsers.length === 0) {
            return (
              <Typography variant="body2" color="text.secondary">
                {searchQuery.trim()
                  ? 'No users found matching your search.'
                  : userTab === 0
                    ? 'No RICTMS staff accounts provisioned yet.'
                    : 'No regular user accounts provisioned yet.'}
              </Typography>
            );
          }

          const paginatedUsers = displayUsers.slice(
            page * rowsPerPage,
            page * rowsPerPage + rowsPerPage,
          );

          return (
            <>
              <Box sx={{ minWidth: 0 }}>
                {(canScrollLeft || canScrollRight) && (
                  <Box
                    role="toolbar"
                    aria-label="User table horizontal scroll controls"
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      minHeight: 40,
                      position: 'sticky',
                      top: 0,
                      zIndex: 4,
                      bgcolor: 'background.paper',
                      borderBottom: 1,
                      borderColor: 'divider',
                    }}
                  >
                  <IconButton
                    size="small"
                    disabled={!canScrollLeft}
                    aria-label="Scroll user table left"
                    onClick={() => tableContainerRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={!canScrollRight}
                    aria-label="Scroll user table right"
                    onClick={() => tableContainerRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                  </Box>
                )}
                <TableContainer ref={tableContainerRef} onScroll={handleTableScroll}>
                  <Table size="small" sx={{ minWidth: 800 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Name / Email</strong>
                      </TableCell>
                      {userTab === 0 && (
                        <TableCell>
                          <strong>Staff ID</strong>
                        </TableCell>
                      )}
                      <TableCell>
                        <strong>Role</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Status</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Actions</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedUsers.map((u: any) => (
                      <TableRow key={u.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {[u.firstName, u.middleName, u.lastName, u.suffix]
                              .filter(Boolean)
                              .join(' ') || ''}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {u.email}
                          </Typography>
                        </TableCell>
                        {userTab === 0 && (
                          <TableCell>
                            <Typography variant="body2">{u.staffId || ''}</Typography>
                          </TableCell>
                        )}
                        <TableCell>
                          <Chip
                            label={String(u.role || u.roleValue || u.role_value || u.userRole || '—').replace(/_/g, ' ').toUpperCase()}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {u.is_active || u.active ? (
                            <Chip
                              icon={<ActiveIcon />}
                              label="Active"
                              size="small"
                              color="success"
                            />
                          ) : (
                            <Chip
                              icon={<InactiveIcon />}
                              label="Inactive"
                              size="small"
                              color="default"
                            />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Quick Reset Password">
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setResetUser(u)}
                                disabled={!canModifyUser(u)}
                              >
                                <KeyIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Edit user">
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setEditUser({
                                    id: u.id,
                                    email: u.email || '',
                                    firstName: u.firstName || '',
                                    middleName: u.middleName || '',
                                    lastName: u.lastName || '',
                                    suffix: u.suffix || '',
                                    staffId: u.staffId || '',
                                     phoneNumber: u.phoneNumber || '',
                                     sex: u.sex || '',
                                    position: u.position || '',
                                    positionFull: u.positionFull || '',
                                    designation: u.designation || '',

                                    autoAssignmentEligible: u.autoAssignmentEligible !== false,
                                    role: u.role,
                                    unitIds: Array.isArray(u.units)
                                      ? u.units.map((unit: any) => unit.id)
                                      : [],
                                  });
                                }}
                                disabled={!canModifyUser(u)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={u.is_active || u.active ? 'Deactivate' : 'Activate'}>
                            <span>
                              <IconButton
                                size="small"
                                color={u.is_active || u.active ? 'warning' : 'success'}
                                onClick={() => handleToggleActive(u)}
                                disabled={u.id == currentUser?.id || !canModifyUser(u)}
                              >
                                {u.is_active || u.active ? (
                                  <InactiveIcon fontSize="small" />
                                ) : (
                                  <ActiveIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              </Box>
              <TablePagination
                component="div"
                count={displayUsers.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </>
          );
        })()}

        <Dialog open={Boolean(editUser)} onClose={() => setEditUser(null)} maxWidth="md" fullWidth>
          <DialogTitle>Edit User Profile</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email"
                  value={editUser?.email || ''}
                  onChange={(e) => setEditUser((prev: any) => ({ ...prev, email: e.target.value }))}
                    inputProps={{ maxLength: 100 }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Staff ID"
                  value={editUser?.staffId || ''}
                  onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setEditUser((prev: any) => ({ ...prev, staffId: digits }));
                    }}
                    inputProps={{ inputMode: "numeric", maxLength: 6 }}
                    placeholder="6 digits"
                  fullWidth
                  helperText="Optional employee identifier"
                />
              </Grid>
               <Grid item xs={12} md={3}>
                 <TextField
                   label="Phone Number"
                   value={editUser?.phoneNumber || ''}
                   onChange={(e) =>
                     setEditUser((prev: any) => ({ ...prev, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))
                   }
                   inputProps={{ inputMode: 'numeric', maxLength: 10 }}
                   InputProps={{ startAdornment: <InputAdornment position="start">+63</InputAdornment> }}
                   fullWidth
                 />
               </Grid>
               <Grid item xs={12} md={3}>
                 <FormControl fullWidth>
                   <InputLabel>Sex</InputLabel>
                   <Select
                     value={editUser?.sex || ''}
                     label="Sex"
                     onChange={(e) => setEditUser((prev: any) => ({ ...prev, sex: e.target.value }))}
                   >
                     <MenuItem value=""><em>Not specified</em></MenuItem>
                     <MenuItem value="Male">Male</MenuItem>
                     <MenuItem value="Female">Female</MenuItem>
                     <MenuItem value="Other">Other</MenuItem>
                     <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
                   </Select>
                 </FormControl>
               </Grid>
               <Grid item xs={12} md={3}>
                <TextField
                  label="First Name"
                  value={editUser?.firstName || ''}
                  onChange={(e) =>
                    setEditUser((prev: any) => ({ ...prev, firstName: e.target.value }))
                  }
                    inputProps={{ maxLength: 100 }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Middle Name"
                  value={editUser?.middleName || ''}
                  onChange={(e) =>
                    setEditUser((prev: any) => ({ ...prev, middleName: e.target.value }))
                  }
                    inputProps={{ maxLength: 100 }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Last Name"
                  value={editUser?.lastName || ''}
                  onChange={(e) =>
                    setEditUser((prev: any) => ({ ...prev, lastName: e.target.value }))
                  }
                    inputProps={{ maxLength: 100 }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Suffix"
                  value={editUser?.suffix || ''}
                  onChange={(e) =>
                    setEditUser((prev: any) => ({ ...prev, suffix: e.target.value }))
                  }
                    inputProps={{ maxLength: 5 }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Position (Abbreviated)"
                  value={editUser?.position || ''}
                  onChange={(e) =>
                    setEditUser((prev: any) => ({ ...prev, position: e.target.value }))
                  }
                    inputProps={{ maxLength: 12 }}
                  fullWidth
                  helperText="e.g. ITO I"
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  label="Full Position Title"
                  value={editUser?.positionFull || ''}
                  onChange={(e) =>
                    setEditUser((prev: any) => ({ ...prev, positionFull: e.target.value }))
                  }
                    inputProps={{ maxLength: 100 }}
                  fullWidth
                  helperText="e.g. Information Technology Officer I"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Designation / Title"
                  value={editUser?.designation || ''}
                  onChange={(e) =>
                    setEditUser((prev: any) => ({ ...prev, designation: e.target.value }))
                  }
                    inputProps={{ maxLength: 100 }}
                  fullWidth
                  helperText="e.g. Head, Software Dev"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={editUser?.role || ''}
                    label="Role"
                    onChange={(e) => {
                      const nextRole = e.target.value as UserRole;
                      setEditUser((prev: any) => {
                        const currentUnit = units.find((unit) => unit.id === prev?.unitIds?.[0]);
                        const keepsUnit = currentUnit && isReportorialUnit(currentUnit) === (nextRole !== UserRole.USER);
                        return {
                          ...prev,
                          role: nextRole,
                          unitIds: keepsUnit ? [currentUnit.id] : [],
                        };
                      });
                    }}
                  >
                    {assignableRoles.map((r) => (
                      <MenuItem key={r.value} value={r.value}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Assigned Unit</InputLabel>
                  <Select
                    value={editUser?.unitIds?.[0] || ''}
                    label="Assigned Unit"
                    onChange={(e) =>
                      setEditUser((prev: any) => ({ ...prev, unitIds: e.target.value ? [e.target.value as number] : [] }))
                    }
                    renderValue={(selected) =>
                      units.find((u) => u.id === selected)?.name ?? selected
                    }
                    MenuProps={{ disableAutoFocusItem: true }}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {selectableUnits.map((unit) => (
                      <MenuItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editUser?.autoAssignmentEligible !== false}
                      onChange={(e) =>
                        setEditUser((prev: any) => ({
                          ...prev,
                          autoAssignmentEligible: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Eligible for automatic ticket assignment"
                />
                <Typography variant="caption" display="block" color="text.secondary">
                  Turn this off to keep the technician available for manual assignment while excluding them from automatic routing.
                </Typography>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditUser(null)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleEditSave}
              disabled={editing || !editUser?.email || !editUser?.role}
            >
              {editing ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={Boolean(resetUser)} onClose={() => setResetUser(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Quick Reset Password</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body1">
              Are you sure you want to reset the password for <strong>{resetUser?.email}</strong> to the system default?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              The new password will be <strong>{defaultPassword}</strong>
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResetUser(null)} color="inherit">Cancel</Button>
            <Button onClick={handleResetPassword} color="error" variant="contained" disabled={resetting}>
              {resetting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// --- Main Settings Page -----------------------------------------


// --- Mobile Settings Card (Biometrics) --------------------------------------

function MobileSettingsCard() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enrollmentOpen, setEnrollmentOpen] = useState(false);
  const [password, setPassword] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  useEffect(() => {
    const checkBio = async () => {
      if (!Capacitor.isNativePlatform()) {
        setLoading(false);
        return;
      }
      try {
        const [{ value }, saved] = await Promise.all([
          Preferences.get({ key: 'biometricEnabled' }),
          hasBiometricCredentials(),
        ]);
        setEnabled(value === 'true' && saved);
      } catch (e) {
        console.error('Failed to get biometric pref', e);
      } finally {
        setLoading(false);
      }
    };
    checkBio();
  }, []);

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    if (!newValue) {
      setSaving(true);
      try {
        await deleteBiometricCredentials();
        await Preferences.set({ key: 'biometricEnabled', value: 'false' });
        setEnabled(false);
        enqueueSnackbar('Biometric login disabled.', { variant: 'info' });
      } catch (err) {
        console.error(err);
        enqueueSnackbar('Failed to disable biometric login.', { variant: 'error' });
      } finally {
        setSaving(false);
      }
      return;
    }

    if (user?.authProvider === 'google') {
      enqueueSnackbar('Biometric login enrollment requires a local email and password account.', { variant: 'warning' });
      return;
    }

    try {
      if (!(await isBiometricAvailable())) {
        enqueueSnackbar('Biometric authentication is not available on this device.', { variant: 'error' });
        return;
      }
      setPassword('');
      setEnrollmentOpen(true);
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Unable to check biometric authentication on this device.', { variant: 'error' });
    }
  };

  const handleEnable = async () => {
    if (!user?.email || !password) {
      enqueueSnackbar('Enter your current password to enable biometric login.', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      await authApi.reauthenticate({ password });
      await saveBiometricCredentials(user.email, password);
      await Preferences.set({ key: 'biometricEnabled', value: 'true' });
      setEnabled(true);
      setPassword('');
      setEnrollmentOpen(false);
      enqueueSnackbar('Biometric login enabled on this device.', { variant: 'success' });
    } catch (err: any) {
      console.error(err);
      enqueueSnackbar(err?.response?.data?.message || 'Biometric enrollment was not completed.', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!Capacitor.isNativePlatform() || loading) return null;

  return (
    <Card elevation={2} sx={{ mb: 3 }}>
      <CardHeader
        title="Mobile Settings"
        subheader="Manage settings specific to the mobile app."
      />
      <CardContent>
        <FormControlLabel
          control={<Switch checked={enabled} onChange={handleToggle} color="primary" />}
          label={
            <Box>
              <Typography variant="body1" component="span">
                Allow biometric login
              </Typography>
              <Typography variant="body2" color="text.secondary" display="block">
                Use your fingerprint or Face ID instead of entering your password each time.
              </Typography>
            </Box>
          }
          disabled={saving}
        />
      </CardContent>

      <Dialog
        open={enrollmentOpen}
        onClose={() => !saving && setEnrollmentOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Enable biometric login</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Confirm your current password once. It will be protected by this device's secure biometric storage.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            type="password"
            label="Current password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !saving) handleEnable();
            }}
            autoComplete="current-password"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEnrollmentOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleEnable} variant="contained" disabled={saving || !password}>
            {saving ? 'Enabling...' : 'Enable'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}


function ProfilePreferencesCard() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [units, setUnits] = useState<{ id: number; name: string; hasReportorialRequirements?: boolean }[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phoneNumber: '',
    sex: '',
    unitId: '' as number | '',
    position: '',
    positionFull: '',
    designation: '',
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      phoneNumber: user.phoneNumber || '',
      sex: user.sex || '',
      unitId: user.units?.[0]?.id ?? '',
      position: user.position || '',
      positionFull: user.positionFull || '',
      designation: user.designation || '',
    });
    usersApi.getProfileUnits().then(setUnits).catch(() => {
      enqueueSnackbar('Unable to load unit options.', { variant: 'error' });
    });
  }, [user?.id, enqueueSnackbar]);

  const handleSave = async () => {
    if (!user) return;
    const phoneNumber = form.phoneNumber.replace(/\D/g, '').slice(0, 10);
    if (form.unitId === '') {
      enqueueSnackbar('A unit is required before saving your profile.', { variant: 'warning' });
      return;
    }

    const fieldsBeingCleared = [
      !phoneNumber && user.phoneNumber ? 'Phone Number' : null,
      !form.sex.trim() && user.sex ? 'Sex' : null,
      !form.position.trim() && user.position ? 'Position' : null,
      !form.positionFull.trim() && user.positionFull ? 'Position Full' : null,
      !form.designation.trim() && user.designation ? 'Designation' : null,
    ].filter((field): field is string => Boolean(field));

    if (
      fieldsBeingCleared.length > 0 &&
      !window.confirm(
        `The following fields are blank: ${fieldsBeingCleared.join(', ')}.\n\nSaving them as blank will remove their existing data. Do you want to continue?`,
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      await usersApi.updateUser(user.id, {
        phoneNumber: phoneNumber || null,
        sex: form.sex || null,
        unitIds: [Number(form.unitId)],
        position: form.position.trim() || null,
        positionFull: form.positionFull.trim() || null,
        designation: form.designation.trim() || null,
      });
      enqueueSnackbar('Profile information updated successfully.', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to update profile information.', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const availableUnits = unitsForUserRole(units, user?.role);

  return (
    <Card elevation={2}>
      <CardHeader
        title="Profile Information"
        subheader="Update your contact, unit, and position details. Password changes are handled separately below."
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Phone Number"
              value={form.phoneNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              inputProps={{ inputMode: 'numeric', maxLength: 10 }}
              InputProps={{ startAdornment: <InputAdornment position="start">+63</InputAdornment> }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Sex</InputLabel>
              <Select value={form.sex} label="Sex" onChange={(e) => setForm((prev) => ({ ...prev, sex: e.target.value }))}>
                <MenuItem value=""><em>Not specified</em></MenuItem>
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
                <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth required>
              <InputLabel>Unit/Section</InputLabel>
              <Select value={form.unitId} label="Unit/Section" onChange={(e) => setForm((prev) => ({ ...prev, unitId: e.target.value as number | '' }))}>
                <MenuItem value=""><em>Select a unit</em></MenuItem>
                {availableUnits.map((unit) => <MenuItem key={unit.id} value={unit.id}>{unit.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Position" value={form.position} onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))} inputProps={{ maxLength: 12 }} fullWidth />
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField label="Position Full" value={form.positionFull} onChange={(e) => setForm((prev) => ({ ...prev, positionFull: e.target.value }))} inputProps={{ maxLength: 100 }} fullWidth />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Designation" value={form.designation} onChange={(e) => setForm((prev) => ({ ...prev, designation: e.target.value }))} inputProps={{ maxLength: 100 }} fullWidth />
          </Grid>
        </Grid>
        <Box mt={2} display="flex" justifyContent="flex-end">
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile Information'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
export default function SettingsPage() {
  const { user, myCap } = useAuth();
  const [tabIndex, setTabIndex] = useState(0);

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  // Users management uses the old cap admin logic for now unless requested otherwise, but roles and capabilities use their new specific DB-driven flags
  const canManageUsers = Boolean(myCap?.isUserManagementAdmin) || Boolean(myCap?.isUserManagementView);
  const canManageSystemRoles = Boolean(myCap?.isSystemRolesAccess);
  const canManageRoleCapabilities = Boolean(myCap?.isRoleCapabilitiesAccess);
  const canManageGlobalSettings = Boolean(myCap?.isGlobalSettingsAccess);
  const canManageSecuritySettings = Boolean(myCap?.isSecuritySettingsAccess);

  if (!user) {
    return <Typography sx={{ m: 3 }}>You must be logged in to view this page.</Typography>;
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const tabs = [
    { label: 'Profile & Preferences', show: true },
    { label: 'User Management', show: canManageUsers },
    { label: 'Role Management', show: canManageSystemRoles },
    { label: 'Role Capabilities Matrix', show: canManageRoleCapabilities },
    { label: 'Global Settings', show: canManageGlobalSettings },
    { label: 'Security Settings', show: canManageSecuritySettings },
  ];

  // Build the rendered tab array
  const renderedTabs = tabs.filter(t => t.show);
  // Ensure the current tabIndex is within bounds if tabs are hidden
  const currentTab = renderedTabs[tabIndex] || renderedTabs[0];

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account, theme, and user administration preferences.
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tabIndex} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons
          allowScrollButtonsMobile
          aria-label="settings tabs"
        >
          {renderedTabs.map((tab, index) => (
            <Tab key={tab.label} label={tab.label} />
          ))}
        </Tabs>
      </Box>

      {currentTab.label === 'Profile & Preferences' && (
        <Box>
          {/* Account Info */}
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', py: 4 }}>
              <Avatar 
                src={import.meta.env.VITE_PROFILE_IMAGE_URL ? `${import.meta.env.VITE_PROFILE_IMAGE_URL}/${user?.staffId}.jpg` : undefined} 
                imgProps={{ style: { objectPosition: 'center 20%' } }}
                sx={{ 
                  width: 120, 
                  height: 120, 
                  mb: 2, 
                  bgcolor: 'primary.main', 
                  fontSize: '3rem',
                  boxShadow: 2
                }}
              >
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </Avatar>
              
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || '—'}
              </Typography>
              
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {user?.email || '—'}
              </Typography>
              
              <Box display="flex" gap={1} mt={2} justifyContent="center" flexWrap="wrap">
                <Chip
                  label={user?.role?.replace('_', ' ').toUpperCase() || '—'}
                  color="primary"
                />
                {user?.units && (user.units as any[]).map((unit: any) => (
                  <Chip
                    key={unit.id}
                    label={unit.name}
                    variant="outlined"
                    color="secondary"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <ProfilePreferencesCard />
            </Grid>
            <Grid item xs={12}>
              <ThemeCard />
            </Grid>
            <Grid item xs={12}>
              <MobileSettingsCard />
            </Grid>
            <Grid item xs={12}>
              <ChangePasswordCard />
            </Grid>
          </Grid>
        </Box>
      )}

      {currentTab.label === 'User Management' && (
        <Box>
          <FocalUserManagementCard />
        </Box>
      )}

      {currentTab.label === 'Role Management' && (
        <Box>
          <RoleManagementCard />
        </Box>
      )}

      {currentTab.label === 'Role Capabilities Matrix' && (
        <Box>
          <RoleCapabilitiesCard />
        </Box>
      )}

      {currentTab.label === 'Global Settings' && (
        <Box>
          <GlobalSettingsCard />
        </Box>
      )}

      {currentTab.label === 'Security Settings' && (
        <Box>
          <SecuritySettingsCard />
        </Box>
      )}

    </Box>
  );
}
