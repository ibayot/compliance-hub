'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { authApi } from '@/lib/api/auth';
import { usersApi } from '@/lib/api/users';
import { UserRole } from '@/lib/types/auth';

export default function SettingsPage() {
  const { user } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [creatingUser, setCreatingUser] = useState(false);
  const [focalUsers, setFocalUsers] = useState<any[]>([]);
  const [focalForm, setFocalForm] = useState({
    email: '',
    password: '',
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    staffId: '',
    role: UserRole.FOCAL,
    position: '',
    designation: '',
  });

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const focalRoleOptions = useMemo(
    () => [UserRole.FOCAL, UserRole.TECHNICIAN],
    [],
  );

  const loadFocalUsers = async () => {
    if (!isSuperAdmin) {
      return;
    }

    try {
      const data = await usersApi.list();
      setFocalUsers(
        data.filter((item) => focalRoleOptions.includes(item.role as UserRole)),
      );
    } catch {
      // non-blocking list for settings page
    }
  };

  useEffect(() => {
    loadFocalUsers();
  }, [isSuperAdmin]);

  const handleChangePassword = async () => {
    setMessage(null);
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    try {
      setChangingPassword(true);
      const response = await authApi.changePassword({
        currentPassword,
        newPassword,
      });
      setMessage(response.message || 'Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCreateFocalUser = async () => {
    setMessage(null);
    setError(null);

    try {
      setCreatingUser(true);
      await usersApi.create({
        email: focalForm.email,
        password: focalForm.password,
        firstName: focalForm.firstName,
        middleName: focalForm.middleName,
        lastName: focalForm.lastName,
        suffix: focalForm.suffix,
        staffId: focalForm.staffId,
        role: focalForm.role,
        position: focalForm.position,
        designation: focalForm.designation,
      });

      setMessage('Focal user created successfully.');
      setFocalForm({
        email: '',
        password: '',
        firstName: '',
        middleName: '',
        lastName: '',
        suffix: '',
        staffId: '',
        role: UserRole.FOCAL,
        position: '',
        designation: '',
      });
      await loadFocalUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create focal user');
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account settings and preferences
        </Typography>
      </Box>

      <Paper sx={{ p: 4 }}>
        {message && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Typography variant="h6" gutterBottom>
          User Information
        </Typography>
        <Box mt={2}>
          <Typography variant="body2">
            <strong>Name:</strong> {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="body2">
            <strong>Email:</strong> {user?.email}
          </Typography>
          <Typography variant="body2">
            <strong>Role:</strong> {user?.role?.replace('_', ' ').toUpperCase()}
          </Typography>
        </Box>

        <Box mt={4}>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="h6" gutterBottom>
            Theme Preference
          </Typography>
          <FormControlLabel
            control={<Switch checked={mode === 'dark'} onChange={toggleMode} />}
            label={mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
          />
        </Box>

        <Box mt={4}>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="h6" gutterBottom>
            Change Password
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={handleChangePassword}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {changingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </Grid>
          </Grid>
        </Box>

        {isSuperAdmin && (
          <Box mt={4}>
            <Divider sx={{ mb: 3 }} />
            <Typography variant="h6" gutterBottom>
              Focal User Management
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create focal accounts and manage focal roles for operations users.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Email"
                  value={focalForm.email}
                  onChange={(event) => setFocalForm({ ...focalForm, email: event.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Temporary Password"
                  type="password"
                  value={focalForm.password}
                  onChange={(event) => setFocalForm({ ...focalForm, password: event.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  label="Role"
                  value={focalForm.role}
                  onChange={(event) => setFocalForm({ ...focalForm, role: event.target.value as UserRole })}
                  fullWidth
                >
                  {focalRoleOptions.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role.replace('_', ' ').toUpperCase()}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="First Name"
                  value={focalForm.firstName}
                  onChange={(event) => setFocalForm({ ...focalForm, firstName: event.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Middle Name"
                  value={focalForm.middleName}
                  onChange={(event) => setFocalForm({ ...focalForm, middleName: event.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Last Name"
                  value={focalForm.lastName}
                  onChange={(event) => setFocalForm({ ...focalForm, lastName: event.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Suffix"
                  value={focalForm.suffix}
                  onChange={(event) => setFocalForm({ ...focalForm, suffix: event.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Staff ID"
                  value={focalForm.staffId}
                  onChange={(event) => setFocalForm({ ...focalForm, staffId: event.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Position"
                  value={focalForm.position}
                  onChange={(event) => setFocalForm({ ...focalForm, position: event.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Designation"
                  value={focalForm.designation}
                  onChange={(event) => setFocalForm({ ...focalForm, designation: event.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={handleCreateFocalUser}
                  disabled={creatingUser || !focalForm.email || !focalForm.password}
                >
                  {creatingUser ? 'Creating...' : 'Create Focal User'}
                </Button>
              </Grid>
            </Grid>

            <Box mt={3}>
              <Typography variant="subtitle1" gutterBottom>
                Existing Focal Accounts
              </Typography>
              {focalUsers.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No focal accounts found.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {focalUsers.map((item) => (
                    <Grid item xs={12} md={6} key={item.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography fontWeight={600}>
                            {[item.firstName, item.middleName, item.lastName, item.suffix]
                              .filter(Boolean)
                              .join(' ') || item.email}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.email}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.role.replace('_', ' ').toUpperCase()} • Staff ID: {item.staffId || 'N/A'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
