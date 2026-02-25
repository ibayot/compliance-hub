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
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
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
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { authApi } from '@/lib/api/auth';
import { usersApi, RoleDefinition } from '@/lib/api/users';
import { UserRole } from '@/lib/types/auth';

// --- Change Password Card ---------------------------------------------------

function ChangePasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async () => {
    setMsg(null);
    if (next.length < 8) { setMsg({ type: 'error', text: 'New password must be at least 8 characters.' }); return; }
    if (next !== confirm) { setMsg({ type: 'error', text: 'New password and confirmation do not match.' }); return; }
    try {
      setBusy(true);
      const res = await authApi.changePassword({ currentPassword: current, newPassword: next });
      setMsg({ type: 'success', text: res.message || 'Password updated successfully.' });
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to update password.' });
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
        {msg && (
          <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>
            {msg.text}
          </Alert>
        )}
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

  useEffect(() => {
    usersApi.getRoles().then(setRoles).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <Card elevation={2}>
      <CardHeader
        avatar={<RoleIcon color="primary" />}
        title="System Role Definitions"
        subheader="View all roles available for user provisioning. System roles are pre-defined and cannot be deleted."
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
              <DialogTitle>{selected?.label}</DialogTitle>
              <DialogContent dividers>
                <Typography variant="body2" gutterBottom>
                  <strong>Role Code:</strong> <code>{selected?.value}</code>
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Assignable:</strong>{' '}
                  {selected?.assignable
                    ? 'Yes  can be assigned when creating users.'
                    : 'No  reserved for system administrators.'}
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="body2">{selected?.description}</Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSelected(null)}>Close</Button>
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
  const [focalUsers, setFocalUsers] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', middleName: '', lastName: '',
    suffix: '', staffId: '', role: UserRole.FOCAL, position: '', designation: '',
  });

  const assignableRoles = useMemo(() => roles.filter((r) => r.assignable), [roles]);

  const reload = useCallback(async () => {
    try {
      const [users, roleList] = await Promise.all([usersApi.list(), usersApi.getRoles()]);
      setRoles(roleList);
      const assignable = new Set(roleList.filter((r) => r.assignable).map((r) => r.value));
      setFocalUsers(users.filter((u: any) => assignable.has(u.role as string)));
    } catch { /* non-blocking */ }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleCreate = async () => {
    setMsg(null);
    try {
      setCreating(true);
      await usersApi.create(form);
      setMsg({ type: 'success', text: `User ${form.email} created successfully.` });
      setForm({ email: '', password: '', firstName: '', middleName: '', lastName: '', suffix: '', staffId: '', role: UserRole.FOCAL, position: '', designation: '' });
      await reload();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to create user.' });
    } finally {
      setCreating(false);
    }
  };

  const handleRoleUpdate = async () => {
    if (!editUserId || !editRole) return;
    try {
      await usersApi.updateRole(editUserId, editRole);
      setMsg({ type: 'success', text: 'Role updated successfully.' });
      setEditUserId(null);
      await reload();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to update role.' });
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
      setMsg({ type: 'error', text: 'Failed to update user status.' });
    }
  };

  return (
    <Card elevation={2}>
      <CardHeader
        avatar={<PersonAddIcon color="primary" />}
        title="Focal & Operations User Management"
        subheader="Create and manage user accounts for focal persons, technicians, reviewers, and auditors."
      />
      <CardContent>
        {msg && (
          <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>
            {msg.text}
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Create New User</Typography>
        <Grid container spacing={2}>
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
            <Button variant="contained" startIcon={<PersonAddIcon />} onClick={handleCreate} disabled={creating || !form.email || !form.password}>
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </Grid>
        </Grid>

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
                    <Tooltip title="Change role">
                      <IconButton size="small" color="primary" onClick={() => { setEditUserId(u.id); setEditRole(u.role); }}>
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

        <Dialog open={editUserId !== null} onClose={() => setEditUserId(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Change User Role</DialogTitle>
          <DialogContent>
            <TextField select label="New Role" value={editRole} onChange={(e) => setEditRole(e.target.value)} fullWidth sx={{ mt: 1 }}>
              {assignableRoles.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{r.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{r.description}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditUserId(null)}>Cancel</Button>
            <Button variant="contained" onClick={handleRoleUpdate} disabled={!editRole}>Save</Button>
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
                {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || ''}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary" display="block">Email</Typography>
              <Typography variant="body1">{user?.email || ''}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" display="block">Role</Typography>
              <Chip label={user?.role?.replace('_', ' ').toUpperCase() || ''} size="small" color="primary" variant="outlined" />
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
