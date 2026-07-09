'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
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
  Edit as EditIcon,
  Key as KeyIcon,
  Palette as PaletteIcon,
  PersonAdd as PersonAddIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { authApi } from '@/lib/api/auth';
import { usersApi, RoleDefinition, RoleCapabilityRecord } from '@/lib/api/users';
import { unitsApi, Unit } from '@/lib/api/units';
import { UserRole } from '@/lib/types/auth';
import { useAutoRefresh } from '@/lib/utils/useAutoRefresh';

// --- Change Password Card ---------------------------------------------------

function ChangePasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
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
    try {
      setBusy(true);
      const res = await authApi.changePassword({ currentPassword: current, newPassword: next });
      enqueueSnackbar(res.message || 'Password updated successfully.', { variant: 'success' });
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to update password.', {
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card elevation={2}>
      <CardHeader
        avatar={<KeyIcon color="primary" />}
        title="Change Password"
        subheader="Update your account password. Minimum 8 characters."
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Current Password"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              fullWidth
              autoComplete="current-password"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="New Password"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              fullWidth
              autoComplete="new-password"
              helperText="Minimum 8 characters"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Confirm New Password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              fullWidth
              autoComplete="new-password"
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={busy || !current || !next || !confirm}
            >
              {busy ? 'Updating...' : 'Update Password'}
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canManage = user?.role === UserRole.SUPER_ADMIN || Boolean(myCap?.isSecuritySettingsAccess);

  useEffect(() => {
    if (canManage) {
      usersApi.getSecurityConfig().then(config => {
        setDefaultPassword(config.defaultPassword || '');
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
      await usersApi.updateSecurityConfig({ defaultPassword });
      enqueueSnackbar('Security settings updated successfully', { variant: 'success' });
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
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="System Default Password"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                helperText="This password is used as the initial password for new users and when resetting passwords."
              />
            </Grid>
            <Grid item xs={12} md={4}>
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

// --- Role Capabilities Card ------------------------------------------------

const CAPABILITY_COLUMNS: {
  key: keyof RoleCapabilityRecord;
  label: string;
  description: string;
}[] = [
  { key: 'isFocal', label: 'Focal', description: 'Compliance document & focal-level access' },
  { key: 'isDesktop', label: 'Desktop', description: 'Handle desktop/hardware support tickets' },
  { key: 'isItSupport', label: 'IT Support', description: 'Handle IT/software support tickets' },
  {
    key: 'isPantawidIct',
    label: 'Pantawid ICT',
    description: 'Handle Pantawid ICT support tickets',
  },
  { key: 'isIto', label: 'ITO Staff', description: 'Non-technician ITO professional staff group' },
  { key: 'isEscalationFocal', label: 'Escalation', description: 'Can receive escalated tickets' },
  {
    key: 'isTicketSettingsFocal',
    label: 'Ticket Admin',
    description: 'Full ticket settings & reports access',
  },
  {
    key: 'isSmtpSettingsAccess',
    label: 'SMTP Admin',
    description: 'Manage SMTP credentials in Ticket Settings',
  },
  {
    key: 'isSecuritySettingsAccess',
    label: 'Security Admin',
    description: 'Manage Default Password in Security Settings',
  },
  {
    key: 'isAllTickets',
    label: 'See All Tickets',
    description: 'View all tickets system-wide (not just own)',
  },
  {
    key: 'isTicketFocal',
    label: 'Assign Tickets',
    description: 'Manually assign/reassign tickets to technicians',
  },
  { key: 'isKpiAccess', label: 'KPI View', description: 'Access KPI dashboard/read endpoints' },
  {
    key: 'isKpiManage',
    label: 'KPI Manage',
    description: 'Create/update KPI master and monitoring records',
  },
  {
    key: 'isAttendanceAccess',
    label: 'Attendance View',
    description: 'Access attendance and office-day views',
  },
  {
    key: 'isAttendanceManage',
    label: 'Attendance Manage',
    description: 'Mutate attendance and office-day records',
  },
  {
    key: 'isReportsAccess',
    label: 'Reports',
    description: 'Access consolidated compliance reports',
  },
  { key: 'isReviewsAccess', label: 'Reviews', description: 'Access review workflows' },
  { key: 'isMovAccess', label: 'MoV', description: 'Access MoV Builder' },
  { key: 'isDocumentsAccess', label: 'Documents', description: 'Access Documents module' },
  { key: 'isRepositoryAccess', label: 'Repository', description: 'Access Repository module' },
  { key: 'isIssuancesAccess', label: 'Issuances', description: 'Access Issuances module' },
  { key: 'isMetricsAccess', label: 'Metrics', description: 'Access Metrics module' },
  {
    key: 'isRoleCapabilitiesAccess',
    label: 'Capabilities Admin',
    description: 'Access Role Capabilities Matrix',
  },
  {
    key: 'isSystemRolesAccess',
    label: 'System Roles Admin',
    description: 'Access System Role Definitions',
  },
];

function RoleCapabilitiesCard() {
  const { user, myCap } = useAuth();
  const canEdit = user?.role === UserRole.SUPER_ADMIN || Boolean(myCap?.isRoleCapabilitiesAccess);
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
  useAutoRefresh(load);

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
          <TableContainer>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      minWidth: 160,
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
                  {CAPABILITY_COLUMNS.map((col) => (
                    <TableCell
                      key={col.key}
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
                  .filter((c) => c.roleValue !== 'user')
                  .map((cap) => (
                    <TableRow
                      key={cap.roleValue}
                      hover
                      sx={{ opacity: saving === cap.roleValue ? 0.6 : 1 }}
                    >
                      <TableCell
                        sx={{
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
                          variant="outlined"
                          color={cap.roleValue === 'super_admin' ? 'error' : 'default'}
                        />
                      </TableCell>
                      {CAPABILITY_COLUMNS.map((col) => {
                        const val = cap[col.key] as boolean;
                        const isLocked = cap.roleValue === 'super_admin' || !canEdit;
                        return (
                          <TableCell key={col.key} align="center">
                            <Switch
                              size="small"
                              checked={cap.roleValue === 'super_admin' ? true : Boolean(val)}
                              disabled={isLocked || saving === cap.roleValue}
                              onChange={(e) =>
                                handleToggle(cap.roleValue, col.key, e.target.checked)
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
          </TableContainer>
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
  const [saving, setSaving] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState({
    value: '',
    label: '',
    description: '',
    assignable: true,
    technicianType: null as string | null,
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
  useAutoRefresh(loadRoles);

  const handleCreate = async () => {
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
        technicianType: form.technicianType || null,
      });
      enqueueSnackbar('Role definition added.', { variant: 'success' });
      setCreateOpen(false);
      setForm({ value: '', label: '', description: '', assignable: true, technicianType: null });
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
    try {
      setSaving(true);
      const originalValue = (selected as any)._originalValue ?? selected.value;
      await usersApi.updateRoleDefinition(originalValue, {
        value: selected.value !== originalValue ? selected.value : undefined,
        label: selected.label,
        description: selected.description,
        assignable: selected.value === 'super_admin' ? false : selected.assignable,
        technicianType: selected.technicianType ?? null,
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

  const handleDelete = async (roleValue: string) => {
    if (!window.confirm(`Delete custom role "${roleValue}"? This cannot be undone.`)) return;
    try {
      await usersApi.deleteRoleDefinition(roleValue);
      enqueueSnackbar(`Role "${roleValue}" deleted.`, { variant: 'success' });
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
                <TextField
                  select
                  label="Technician Type (Attendance)"
                  value={selected?.technicianType ?? ''}
                  onChange={(e) =>
                    setSelected((prev) =>
                      prev ? { ...prev, technicianType: e.target.value || null } : prev,
                    )
                  }
                  fullWidth
                  sx={{ mt: 2 }}
                  helperText="Tag this role so members appear in the Technician Attendance grid"
                >
                  <MenuItem value="">— Not a technician role —</MenuItem>
                  <MenuItem value="it_support">IT Support</MenuItem>
                  <MenuItem value="desktop_support">Desktop Support</MenuItem>
                  <MenuItem value="pantawid_ict_support">Pantawid ICT Support</MenuItem>
                </TextField>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSelected(null)}>Close</Button>
                <Button
                  variant="contained"
                  onClick={handleUpdate}
                  disabled={saving || !selected?.label || !selected?.description}
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
                  helperText="Lowercase letters, digits, and underscores. E.g. section_head"
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Role Label"
                  value={form.label}
                  onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                  fullWidth
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
                <TextField
                  select
                  label="Technician Type (Attendance)"
                  value={form.technicianType ?? ''}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, technicianType: e.target.value || null }))
                  }
                  fullWidth
                  sx={{ mt: 2 }}
                  helperText="Tag this role so members appear in the Technician Attendance grid"
                >
                  <MenuItem value="">— Not a technician role —</MenuItem>
                  <MenuItem value="it_support">IT Support</MenuItem>
                  <MenuItem value="desktop_support">Desktop Support</MenuItem>
                  <MenuItem value="pantawid_ict_support">Pantawid ICT Support</MenuItem>
                </TextField>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button
                  variant="contained"
                  onClick={handleCreate}
                  disabled={saving || !form.value || !form.label || !form.description}
                >
                  {saving ? 'Saving...' : 'Create'}
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
  const { user: currentUser, logout } = useAuth();
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [focalUsers, setFocalUsers] = useState<any[]>([]);
  const [userTab, setUserTab] = useState(0); // 0 = RICTMS Staff, 1 = Regular Users
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [creating, setCreating] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [resetUser, setResetUser] = useState<any | null>(null);
  const [resetting, setResetting] = useState(false);
  const [defaultPassword, setDefaultPassword] = useState('Changeme123!');
  const [editing, setEditing] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
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
    ticketMainFocal: false,
    ticketTechnician: false,
    unitIds: [] as number[],
  });

  const assignableRoles = useMemo(() => roles.filter((r) => r.assignable), [roles]);

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
  useAutoRefresh(reload);

  const resetForm = () => {
    setForm({
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
      ticketMainFocal: false,
      ticketTechnician: false,
      unitIds: [],
    });
    setIsExistingEmail(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setEmailInputValue('');
    setEmailSuggestions([]);
    setCreateError(null);
    setCreateDialogOpen(true);
  };

  const handleCreate = async () => {
    setCreateError(null);
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
      setCreateError(err?.response?.data?.message || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    try {
      setEditing(true);
      await usersApi.updateUser(editUser.id, {
        email: editUser.email,
        firstName: editUser.firstName,
        middleName: editUser.middleName,
        lastName: editUser.lastName,
        suffix: editUser.suffix,
        position: editUser.position,
        positionFull: editUser.positionFull,
        designation: editUser.designation,
        ticketMainFocal: Boolean(editUser.ticketMainFocal),
        ticketTechnician: Boolean(editUser.ticketTechnician),
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
            {createError && (
              <Typography color="error" sx={{ mb: 2, mt: 0.5 }}>
                {createError}
              </Typography>
            )}
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Email Address"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  fullWidth
                  autoComplete="off"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  required
                  label="Temporary Password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  fullWidth
                  autoComplete="new-password"
                />
              </Grid>
              <Grid item xs={12} md={4}>
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
              <Grid item xs={12} md={3}>
                <TextField
                  required
                  label="First Name"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  fullWidth
                  autoComplete="off"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Middle Name"
                  value={form.middleName}
                  onChange={(e) => setForm({ ...form, middleName: e.target.value })}
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
                  fullWidth
                  autoComplete="off"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Suffix (Jr./Sr.)"
                  value={form.suffix}
                  onChange={(e) => setForm({ ...form, suffix: e.target.value })}
                  fullWidth
                  autoComplete="off"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Staff ID"
                  value={form.staffId}
                  onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                  fullWidth
                  disabled={form.role === UserRole.USER}
                  autoComplete="off"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Position (Abbreviated)"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  fullWidth
                  autoComplete="off"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Full Position Title"
                  value={form.positionFull}
                  onChange={(e) => setForm({ ...form, positionFull: e.target.value })}
                  fullWidth
                  autoComplete="off"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Designation / Title"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  fullWidth
                  autoComplete="off"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(form.ticketTechnician)}
                      onChange={(e) => setForm({ ...form, ticketTechnician: e.target.checked })}
                    />
                  }
                  label="Lower-level Ticket Technician"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Assigned Units</InputLabel>
                  <Select
                    multiple
                    value={form.unitIds}
                    label="Assigned Units"
                    onChange={(e) => setForm({ ...form, unitIds: e.target.value as number[] })}
                    renderValue={(selected) =>
                      (selected as number[])
                        .map((id) => units.find((u) => u.id === id)?.name ?? id)
                        .join(', ')
                    }
                    MenuProps={{ disableAutoFocusItem: true }}
                  >
                    {units.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        <Checkbox checked={form.unitIds.includes(u.id)} />
                        <ListItemText primary={u.name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={handleCreate}
              disabled={creating || !form.email || (!form.password && !isExistingEmail)}
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
              <TableContainer>
                <Table size="small">
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
                            label={u.role?.replace(/_/g, ' ').toUpperCase()}
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
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setResetUser(u)}
                            >
                              <KeyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit user">
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
                                  position: u.position || '',
                                  positionFull: u.positionFull || '',
                                  designation: u.designation || '',
                                  ticketMainFocal: Boolean(u.ticketMainFocal),
                                  ticketTechnician: Boolean(u.ticketTechnician),
                                  role: u.role,
                                  unitIds: Array.isArray(u.units)
                                    ? u.units.map((unit: any) => unit.id)
                                    : [],
                                });
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={u.is_active || u.active ? 'Deactivate' : 'Activate'}>
                            <IconButton
                              size="small"
                              color={u.is_active || u.active ? 'warning' : 'success'}
                              onClick={() => handleToggleActive(u)}
                            >
                              {u.is_active || u.active ? (
                                <InactiveIcon fontSize="small" />
                              ) : (
                                <ActiveIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
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
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Staff ID"
                  value={editUser?.staffId || ''}
                  onChange={(e) =>
                    setEditUser((prev: any) => ({ ...prev, staffId: e.target.value }))
                  }
                  fullWidth
                  disabled={editUser?.role === UserRole.USER}
                  helperText={
                    editUser?.role === UserRole.USER
                      ? 'Not applicable for Regular Staff'
                      : 'Optional employee identifier'
                  }
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="First Name"
                  value={editUser?.firstName || ''}
                  onChange={(e) =>
                    setEditUser((prev: any) => ({ ...prev, firstName: e.target.value }))
                  }
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
                  fullWidth
                  helperText="e.g. ITO I"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Full Position Title"
                  value={editUser?.positionFull || ''}
                  onChange={(e) =>
                    setEditUser((prev: any) => ({ ...prev, positionFull: e.target.value }))
                  }
                  fullWidth
                  helperText="e.g. Information Technology Officer I"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Designation"
                  value={editUser?.designation || ''}
                  onChange={(e) =>
                    setEditUser((prev: any) => ({ ...prev, designation: e.target.value }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  label="Role"
                  value={editUser?.role || ''}
                  onChange={(e) => setEditUser((prev: any) => ({ ...prev, role: e.target.value }))}
                  fullWidth
                >
                  {assignableRoles.map((r) => (
                    <MenuItem key={r.value} value={r.value}>
                      {r.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(editUser?.ticketMainFocal)}
                      onChange={(e) =>
                        setEditUser((prev: any) => ({ ...prev, ticketMainFocal: e.target.checked }))
                      }
                    />
                  }
                  label="Ticket Main Focal"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(editUser?.ticketTechnician)}
                      onChange={(e) =>
                        setEditUser((prev: any) => ({
                          ...prev,
                          ticketTechnician: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Lower-level Ticket Technician"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Assigned Units</InputLabel>
                  <Select
                    multiple
                    value={editUser?.unitIds || []}
                    label="Assigned Units"
                    onChange={(e) =>
                      setEditUser((prev: any) => ({ ...prev, unitIds: e.target.value as number[] }))
                    }
                    renderValue={(selected) =>
                      (selected as number[])
                        .map((id) => units.find((u) => u.id === id)?.name ?? id)
                        .join(', ')
                    }
                    MenuProps={{ disableAutoFocusItem: true }}
                  >
                    {units.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        <Checkbox checked={Boolean(editUser?.unitIds?.includes(u.id))} />
                        <ListItemText primary={u.name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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

export default function SettingsPage() {
  const { user, myCap } = useAuth();

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  // Users management uses the old cap admin logic for now unless requested otherwise, but roles and capabilities use their new specific DB-driven flags
  const canManageUsers =
    isSuperAdmin || user?.role === UserRole.SECTION_HEAD || user?.role === 'compliance_officer';
  const canManageSystemRoles = isSuperAdmin || Boolean(myCap?.isSystemRolesAccess);
  const canManageRoleCapabilities = isSuperAdmin || Boolean(myCap?.isRoleCapabilitiesAccess);

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

      {/* Account Info */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardHeader
          avatar={<RoleIcon color="action" />}
          title="Account Information"
          subheader="Your current session identity."
        />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" display="block">
                Full Name
              </Typography>
              <Typography variant="body1">
                {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || '—'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary" display="block">
                Email
              </Typography>
              <Typography variant="body1">{user?.email || '—'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" display="block">
                Role
              </Typography>
              <Chip
                label={user?.role?.replace('_', ' ').toUpperCase() || '—'}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="caption" color="text.secondary" display="block">
                Assigned Units
              </Typography>
              {user?.units && user.units.length > 0 ? (
                <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.25}>
                  {(user.units as any[]).map((unit: any) => (
                    <Chip
                      key={unit.id}
                      label={unit.name}
                      size="small"
                      variant="outlined"
                      color="secondary"
                    />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  None assigned
                </Typography>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <ThemeCard />
          </Grid>
          <Grid item xs={12} md={6}>
            <SecuritySettingsCard />
        </Grid>
        <Grid item xs={12} md={6}>
          <ChangePasswordCard />
        </Grid>

        {canManageSystemRoles && (
          <Grid item xs={12}>
            <RoleManagementCard />
          </Grid>
        )}
      </Grid>

      {canManageRoleCapabilities && (
        <Box mt={4}>
          <RoleCapabilitiesCard />
        </Box>
      )}

      {canManageUsers && (
        <Box mt={4}>
          <Grid item xs={12}>
            <FocalUserManagementCard />
          </Grid>
        </Box>
      )}
    </Box>
  );
}
