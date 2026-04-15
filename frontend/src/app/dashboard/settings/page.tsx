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
  ListItemText,
  MenuItem,
  Select,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
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
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { authApi } from '@/lib/api/auth';
import { usersApi, RoleDefinition } from '@/lib/api/users';
import { unitsApi, Unit } from '@/lib/api/units';
import { UserRole } from '@/lib/types/auth';

// --- Change Password Card ---------------------------------------------------

function ChangePasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const handleSubmit = async () => {
    if (next.length < 8) { enqueueSnackbar('New password must be at least 8 characters.', { variant: 'error' }); return; }
    if (next !== confirm) { enqueueSnackbar('New password and confirmation do not match.', { variant: 'error' }); return; }
    try {
      setBusy(true);
      const res = await authApi.changePassword({ currentPassword: current, newPassword: next });
      enqueueSnackbar(res.message || 'Password updated successfully.', { variant: 'success' });
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to update password.', { variant: 'error' });
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

  const handleCreate = async () => {
    const codeVal = form.value.trim().toLowerCase().replace(/\s+/g, '_');
    if (!codeVal.match(/^[a-z0-9_]+$/)) {
      enqueueSnackbar('Role code must use lowercase letters, digits, and underscores only.', { variant: 'error' });
      return;
    }
    try {
      setSaving(true);
      await usersApi.createRoleDefinition({ ...form, value: codeVal, technicianType: form.technicianType || null });
      enqueueSnackbar('Role definition added.', { variant: 'success' });
      setCreateOpen(false);
      setForm({ value: '', label: '', description: '', assignable: true, technicianType: null });
      await loadRoles();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to create role definition.', { variant: 'error' });
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
      enqueueSnackbar(err?.response?.data?.message || 'Failed to update role definition.', { variant: 'error' });
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
      enqueueSnackbar(err?.response?.data?.message || 'Failed to delete role.', { variant: 'error' });
    }
  };

  return (
    <Card elevation={2}>
      <CardHeader
        avatar={<RoleIcon color="primary" />}
        title="System Role Definitions"
        subheader="Manage roles for user provisioning. System roles cannot be deleted; custom roles can have their code renamed or deleted."
        action={
          <Button
            variant="outlined"
            size="small"
            onClick={() => setCreateOpen(true)}
          >
            Add Role Definition
          </Button>
        }
      />
      <CardContent>
        {loading ? (
          <Typography variant="body2" color="text.secondary">Loading roles...</Typography>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Role</strong></TableCell>
                  <TableCell><strong>Code</strong></TableCell>
                  <TableCell><strong>Assignable</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.value} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{role.label}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={role.value} size="small" variant="outlined" color={role.isSystem || role.is_system ? 'default' : 'primary'} />
                    </TableCell>
                    <TableCell>
                      {role.assignable
                        ? <Chip label="Yes" size="small" color="success" />
                        : <Chip label="System Only" size="small" color="default" />}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => setSelected({ ...role, _originalValue: role.value } as any)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {!(role.isSystem || role.is_system) && (
                        <Tooltip title="Delete custom role">
                          <IconButton size="small" color="error" onClick={() => handleDelete(role.value)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="xs" fullWidth>
              <DialogTitle>Edit Role Definition</DialogTitle>
              <DialogContent dividers>
                <TextField
                  label="Role Code"
                  value={selected?.value || ''}
                  onChange={(e) => setSelected((prev) => prev ? { ...prev, value: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') } : prev)}
                  fullWidth
                  disabled={Boolean(selected?.isSystem || selected?.is_system)}
                  helperText={(selected?.isSystem || selected?.is_system) ? 'System role codes are fixed' : 'Custom role \u2014 code can be renamed'}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Role Label"
                  value={selected?.label || ''}
                  onChange={(e) => setSelected((prev) => prev ? { ...prev, label: e.target.value } : prev)}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Description"
                  value={selected?.description || ''}
                  onChange={(e) => setSelected((prev) => prev ? { ...prev, description: e.target.value } : prev)}
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
                      onChange={(e) => setSelected((prev) => prev ? { ...prev, assignable: e.target.checked } : prev)}
                    />
                  }
                  label="Assignable during user creation"
                />
                <TextField
                  select
                  label="Technician Type (Attendance)"
                  value={selected?.technicianType ?? ''}
                  onChange={(e) => setSelected((prev) => prev ? { ...prev, technicianType: e.target.value || null } : prev)}
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
                <Button variant="contained" onClick={handleUpdate} disabled={saving || !selected?.label || !selected?.description}>
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
                  onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
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
                      checked={form.value === 'super_admin' ? false : form.assignable}
                      disabled={form.value === 'super_admin'}
                      onChange={(e) => setForm((prev) => ({ ...prev, assignable: e.target.checked }))}
                    />
                  }
                  label="Assignable during user creation"
                />
                <TextField
                  select
                  label="Technician Type (Attendance)"
                  value={form.technicianType ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, technicianType: e.target.value || null }))}
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
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [focalUsers, setFocalUsers] = useState<any[]>([]);
  const [userTab, setUserTab] = useState(0); // 0 = RICTMS Staff, 1 = Regular Users
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editing, setEditing] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', middleName: '', lastName: '',
    suffix: '', staffId: '', role: UserRole.FOCAL, position: '', positionFull: '', designation: '',
    ticketMainFocal: false, ticketTechnician: false,
    unitIds: [] as number[],
  });

  const assignableRoles = useMemo(() => roles.filter((r) => r.assignable), [roles]);

  // Email autocomplete suggestions
  const [emailSuggestions, setEmailSuggestions] = useState<{ id: number; email: string; firstName?: string; lastName?: string }[]>([]);
  const [emailInputValue, setEmailInputValue] = useState('');
  const [isExistingEmail, setIsExistingEmail] = useState(false);

  useEffect(() => {
    if (!emailInputValue || emailInputValue.length < 2) { setEmailSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const results = await usersApi.searchEmails(emailInputValue);
        setEmailSuggestions(results);
      } catch { setEmailSuggestions([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [emailInputValue]);

  const reload = useCallback(async () => {
    try {
      const [users, roleList, unitList] = await Promise.all([
        usersApi.list(),
        usersApi.getRoles(),
        unitsApi.listAll(),
      ]);
      setRoles(roleList);
      setUnits(unitList);
      // Show ALL users — not filtered by assignable flag
      setFocalUsers(users);
    } catch { /* non-blocking */ }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const resetForm = () => {
    setForm({
      email: '', password: '', firstName: '', middleName: '', lastName: '',
      suffix: '', staffId: '', role: UserRole.FOCAL, position: '', positionFull: '', designation: '',
      ticketMainFocal: false, ticketTechnician: false,
      unitIds: [],
    });
    setIsExistingEmail(false);
  };

  const handleOpenCreate = () => { resetForm(); setEmailInputValue(''); setEmailSuggestions([]); setCreateError(null); setCreateDialogOpen(true); };

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
      enqueueSnackbar('User profile updated successfully.', { variant: 'success' });
      setEditUser(null);
      await reload();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to update user.', { variant: 'error' });
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

  return (
    <Card elevation={2}>
      <CardHeader
        avatar={<PersonAddIcon color="primary" />}
        title="User Management"
        subheader="Create and manage user accounts for RICTMS staff and regular users."
        action={
          <Button variant="contained" startIcon={<PersonAddIcon />} size="small" onClick={handleOpenCreate}>
            Create New User
          </Button>
        }
      />
      <CardContent>
        {/* Create user dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Create New User</DialogTitle>
          <DialogContent>
            {createError && (
              <Typography color="error" sx={{ mb: 2, mt: 0.5 }}>
                {createError}
              </Typography>
            )}
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} md={4}>
                <Autocomplete
                  freeSolo
                  options={emailSuggestions.map((s) => s.email)}
                  inputValue={emailInputValue}
                  onInputChange={(_, value) => {
                    setEmailInputValue(value);
                    setForm({ ...form, email: value });
                    setIsExistingEmail(false);
                  }}
                  onChange={(_, value) => {
                    const v = value || '';
                    setEmailInputValue(v);
                    const match = emailSuggestions.find(s => s.email === v);
                    setIsExistingEmail(!!match);
                    setForm({
                      ...form,
                      email: v,
                      firstName: match?.firstName ?? form.firstName,
                      lastName: match?.lastName ?? form.lastName,
                      password: '',
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Email Address"
                      fullWidth
                      helperText="Login credential — type to search existing accounts"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Temporary Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} fullWidth helperText={isExistingEmail ? 'Leave blank to keep existing password unchanged' : 'Required for new accounts — user should change on first login'} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} fullWidth helperText="Determines access permissions">
                  {assignableRoles.map((r) => (
                    <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField label="Middle Name" value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField label="Suffix (Jr./Sr.)" value={form.suffix} onChange={(e) => setForm({ ...form, suffix: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Staff ID" value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} fullWidth helperText="Optional employee identifier" />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Position (Abbreviated)" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} fullWidth helperText="e.g. ITO I" />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Full Position Title" value={form.positionFull} onChange={(e) => setForm({ ...form, positionFull: e.target.value })} fullWidth helperText="e.g. Information Technology Officer I" />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Designation / Title" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={<Switch checked={form.ticketMainFocal} onChange={(e) => setForm({ ...form, ticketMainFocal: e.target.checked })} />}
                  label="Ticket Main Focal"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={<Switch checked={form.ticketTechnician} onChange={(e) => setForm({ ...form, ticketTechnician: e.target.checked })} />}
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
            <Button variant="contained" startIcon={<PersonAddIcon />} onClick={handleCreate} disabled={creating || !form.email || (!form.password && !isExistingEmail)}>
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </DialogActions>
        </Dialog>

        <Divider sx={{ my: 3 }} />

        {/* Tabs: RICTMS Staff / Regular Users */}
        <Tabs value={userTab} onChange={(_, v) => setUserTab(v)} sx={{ mb: 2 }}>
          <Tab label={`RICTMS Staff (${focalUsers.filter((u: any) => u.role !== 'user').length})`} />
          <Tab label={`Regular Users (${focalUsers.filter((u: any) => u.role === 'user').length})`} />
        </Tabs>

        {(() => {
          const displayUsers = userTab === 0
            ? focalUsers.filter((u: any) => u.role !== 'user')
            : focalUsers.filter((u: any) => u.role === 'user');

          if (displayUsers.length === 0) {
            return <Typography variant="body2" color="text.secondary">{userTab === 0 ? 'No RICTMS staff accounts provisioned yet.' : 'No regular user accounts provisioned yet.'}</Typography>;
          }

          return (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Name / Email</strong></TableCell>
                  <TableCell><strong>Staff ID</strong></TableCell>
                  <TableCell><strong>Role</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayUsers.map((u: any) => (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {[u.firstName, u.middleName, u.lastName, u.suffix].filter(Boolean).join(' ') || ''}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2">{u.staffId || ''}</Typography></TableCell>
                    <TableCell>
                      <Chip label={u.role?.replace(/_/g, ' ').toUpperCase()} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      {(u.is_active || u.active)
                        ? <Chip icon={<ActiveIcon />} label="Active" size="small" color="success" />
                        : <Chip icon={<InactiveIcon />} label="Inactive" size="small" color="default" />}
                    </TableCell>
                    <TableCell align="right">
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
                              unitIds: Array.isArray(u.units) ? u.units.map((unit: any) => unit.id) : [],
                            });
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={(u.is_active || u.active) ? 'Deactivate' : 'Activate'}>
                        <IconButton size="small" color={(u.is_active || u.active) ? 'warning' : 'success'} onClick={() => handleToggleActive(u)}>
                          {(u.is_active || u.active) ? <InactiveIcon fontSize="small" /> : <ActiveIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                  fullWidth
                  disabled
                  helperText="Staff ID is immutable and cannot be updated."
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="First Name"
                  value={editUser?.firstName || ''}
                  onChange={(e) => setEditUser((prev: any) => ({ ...prev, firstName: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Middle Name"
                  value={editUser?.middleName || ''}
                  onChange={(e) => setEditUser((prev: any) => ({ ...prev, middleName: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Last Name"
                  value={editUser?.lastName || ''}
                  onChange={(e) => setEditUser((prev: any) => ({ ...prev, lastName: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Suffix"
                  value={editUser?.suffix || ''}
                  onChange={(e) => setEditUser((prev: any) => ({ ...prev, suffix: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Position (Abbreviated)"
                  value={editUser?.position || ''}
                  onChange={(e) => setEditUser((prev: any) => ({ ...prev, position: e.target.value }))}
                  fullWidth
                  helperText="e.g. ITO I"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Full Position Title"
                  value={editUser?.positionFull || ''}
                  onChange={(e) => setEditUser((prev: any) => ({ ...prev, positionFull: e.target.value }))}
                  fullWidth
                  helperText="e.g. Information Technology Officer I"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Designation"
                  value={editUser?.designation || ''}
                  onChange={(e) => setEditUser((prev: any) => ({ ...prev, designation: e.target.value }))}
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
                    <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(editUser?.ticketMainFocal)}
                      onChange={(e) => setEditUser((prev: any) => ({ ...prev, ticketMainFocal: e.target.checked }))}
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
                      onChange={(e) => setEditUser((prev: any) => ({ ...prev, ticketTechnician: e.target.checked }))}
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
                    onChange={(e) => setEditUser((prev: any) => ({ ...prev, unitIds: e.target.value as number[] }))}
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
            <Button variant="contained" onClick={handleEditSave} disabled={editing || !editUser?.email || !editUser?.role}>
              {editing ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// --- Main Settings Page -----------------------------------------------------

export default function SettingsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>Settings</Typography>
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
              <Typography variant="caption" color="text.secondary" display="block">Full Name</Typography>
              <Typography variant="body1">
                {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || '�'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary" display="block">Email</Typography>
              <Typography variant="body1">{user?.email || '�'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" display="block">Role</Typography>
              <Chip label={user?.role?.replace('_', ' ').toUpperCase() || '�'} size="small" color="primary" variant="outlined" />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="caption" color="text.secondary" display="block">Assigned Units</Typography>
              {user?.units && user.units.length > 0 ? (
                <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.25}>
                  {(user.units as any[]).map((unit: any) => (
                    <Chip key={unit.id} label={unit.name} size="small" variant="outlined" color="secondary" />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">None assigned</Typography>
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
          <ChangePasswordCard />
        </Grid>

        {isSuperAdmin && (
          <Grid item xs={12}>
            <RoleManagementCard />
          </Grid>
        )}

        {isSuperAdmin && (
          <Grid item xs={12}>
            <FocalUserManagementCard />
          </Grid>
        )}
      </Grid>
    </Box>
  );
}


