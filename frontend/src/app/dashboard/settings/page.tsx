'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
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
  AdminPanelSettings as RoleIcon,
  Edit as EditIcon,
  Key as KeyIcon,
  Palette as PaletteIcon,
  PersonAdd as PersonAddIcon,
  People as PeopleIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
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
    value: UserRole.FOCAL,
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

  const enumValues = Object.values(UserRole);
  const usedValues = new Set(roles.map((r) => r.value));
  const availableCodes = enumValues.filter((value) => !usedValues.has(value));

  const handleCreate = async () => {
    try {
      setSaving(true);
      await usersApi.createRoleDefinition(form);
      enqueueSnackbar('Role definition added.', { variant: 'success' });
      setCreateOpen(false);
      setForm({ value: UserRole.FOCAL, label: '', description: '', assignable: true });
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
      await usersApi.updateRoleDefinition(selected.value, {
        label: selected.label,
        description: selected.description,
        assignable: selected.value === UserRole.SUPER_ADMIN ? false : selected.assignable,
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

  return (
    <Card elevation={2}>
      <CardHeader
        avatar={<RoleIcon color="primary" />}
        title="System Role Definitions"
        subheader="View all roles available for user provisioning. System roles are pre-defined and cannot be deleted."
        action={
          <Button
            variant="outlined"
            size="small"
            onClick={() => setCreateOpen(true)}
            disabled={availableCodes.length === 0}
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
                  <TableCell align="right"><strong>Details</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.value} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{role.label}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={role.value} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      {role.assignable
                        ? <Chip label="Yes" size="small" color="success" />
                        : <Chip label="System Only" size="small" color="default" />}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View description">
                        <IconButton size="small" onClick={() => setSelected(role)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
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
                  fullWidth
                  disabled
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
                      disabled={selected?.value === UserRole.SUPER_ADMIN}
                      onChange={(e) => setSelected((prev) => prev ? { ...prev, assignable: e.target.checked } : prev)}
                    />
                  }
                  label="Assignable during user creation"
                />
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
                  select
                  label="Role Code"
                  value={form.value}
                  onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value as UserRole }))}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  {availableCodes.map((code) => (
                    <MenuItem key={code} value={code}>{code}</MenuItem>
                  ))}
                </TextField>
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
                      checked={form.value === UserRole.SUPER_ADMIN ? false : form.assignable}
                      disabled={form.value === UserRole.SUPER_ADMIN}
                      onChange={(e) => setForm((prev) => ({ ...prev, assignable: e.target.checked }))}
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
                  disabled={saving || !form.label || !form.description || availableCodes.length === 0}
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editing, setEditing] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', middleName: '', lastName: '',
    suffix: '', staffId: '', role: UserRole.FOCAL, position: '', designation: '',
    unitIds: [] as number[],
  });

  const assignableRoles = useMemo(() => roles.filter((r) => r.assignable), [roles]);

  const reload = useCallback(async () => {
    try {
      const [users, roleList, unitList] = await Promise.all([
        usersApi.list(),
        usersApi.getRoles(),
        unitsApi.listAll(),
      ]);
      setRoles(roleList);
      setUnits(unitList);
      const assignable = new Set(roleList.filter((r) => r.assignable).map((r) => r.value));
      setFocalUsers(users.filter((u: any) => assignable.has(u.role as string)));
    } catch { /* non-blocking */ }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const resetForm = () => setForm({
    email: '', password: '', firstName: '', middleName: '', lastName: '',
    suffix: '', staffId: '', role: UserRole.FOCAL, position: '', designation: '', unitIds: [],
  });

  const handleOpenCreate = () => { resetForm(); setCreateError(null); setCreateDialogOpen(true); };

  const handleCreate = async () => {
    setCreateError(null);
    try {
      setCreating(true);
      await usersApi.create(form);
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
        designation: editUser.designation,
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
        title="Focal & Operations User Management"
        subheader="Create and manage user accounts for focal persons, technicians, reviewers, and auditors."
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
              <Alert severity="error" sx={{ mb: 2, mt: 0.5 }} onClose={() => setCreateError(null)}>
                {createError}
              </Alert>
            )}
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} md={4}>
                <TextField label="Email Address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth helperText="Login credential" />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Temporary Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} fullWidth helperText="User should change on first login" />
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
                <TextField label="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Designation / Title" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} fullWidth />
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
            <Button variant="contained" startIcon={<PersonAddIcon />} onClick={handleCreate} disabled={creating || !form.email || !form.password}>
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </DialogActions>
        </Dialog>

        <Divider sx={{ my: 3 }} />

        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
          <PeopleIcon color="action" fontSize="small" />
          <Typography variant="subtitle2">Existing Users</Typography>
          <Badge badgeContent={focalUsers.length} color="primary" sx={{ ml: 1 }} />
        </Box>

        {focalUsers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No users provisioned yet.</Typography>
        ) : (
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
              {focalUsers.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {[u.firstName, u.middleName, u.lastName, u.suffix].filter(Boolean).join(' ') || ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                  </TableCell>
                  <TableCell><Typography variant="body2">{u.staffId || ''}</Typography></TableCell>
                  <TableCell>
                    <Chip label={u.role?.replace('_', ' ').toUpperCase()} size="small" variant="outlined" />
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
                            designation: u.designation || '',
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
        )}

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
                  label="Position"
                  value={editUser?.position || ''}
                  onChange={(e) => setEditUser((prev: any) => ({ ...prev, position: e.target.value }))}
                  fullWidth
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


