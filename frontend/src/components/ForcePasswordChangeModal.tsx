'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  InputAdornment,
  IconButton,
  Box,
  Tooltip,
  Menu,
} from '@mui/material';
import { Visibility, VisibilityOff, AutoFixHigh, Key, VpnKey } from '@mui/icons-material';
import { usersApi } from '@/lib/api/users';
import type { User } from '@/lib/types/auth';
import { authApi } from '@/lib/api/auth';
import { useSnackbar } from 'notistack';
import { unitsForUserRole } from '@/lib/utils/unit-visibility';

interface Props {
  open: boolean;
  onClose: () => void;
  user: User;
}

export default function ForcePasswordChangeModal({ open, onClose, user }: Props) {
  const { enqueueSnackbar } = useSnackbar();

  // Password fields
  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleGenerateClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleGenerateClose = () => {
    setAnchorEl(null);
  };

  const handleGeneratePassword = async (type: 'random' | 'passphrase') => {
    handleGenerateClose();
    try {
      let result;
      if (type === 'random') {
        result = await authApi.generateRandomPassword();
      } else {
        result = await authApi.generatePassphrase();
      }
      setNewPassword(result.password);
      setConfirmPassword(result.password);
      setShowPassword(true);
      enqueueSnackbar('Password generated successfully', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar('Failed to generate password', { variant: 'error' });
    }
  };

  // Profile fields
  const [staffId, setStaffId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sex, setSex] = useState('');
  const [unitId, setUnitId] = useState<number | ''>('');

  const [units, setUnits] = useState<Array<{ id: number; name: string; hasReportorialRequirements?: boolean }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const availableUnits = unitsForUserRole(units, user.role);

  useEffect(() => {
    if (open) {
      setNewPassword('');
      setConfirmPassword('');
      setStaffId(user.staffId || '');
      setFirstName(user.firstName || '');
      setMiddleName(user.middleName || '');
      setLastName(user.lastName || '');
      setPhoneNumber(user.phoneNumber || '');
      setSex(user.sex || '');
      setUnitId(user.units?.[0]?.id ?? '');
      usersApi.getProfileUnits().then(setUnits).catch(() => {
        setUnits(user.units || []);
        enqueueSnackbar('Unable to load the available units.', { variant: 'error' });
      });
    }
  }, [enqueueSnackbar, open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!staffId || !firstName || !lastName || !phoneNumber || !sex || unitId === '') {
      setError('Please fill in all required profile fields, including Staff ID.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await usersApi.updateUser(user.id, {
        password: newPassword,
        staffId,
        firstName,
        middleName,
        lastName,
        phoneNumber,
        sex,
        unitIds: [unitId as number]
      });
      enqueueSnackbar('Profile updated and password changed successfully', { variant: 'success' });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} disableEscapeKeyDown maxWidth="sm" fullWidth>
      <DialogTitle>Complete Your Profile & Change Password</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3 }}>
            You are currently using the default password for your account. For security reasons, please set a new password and complete your profile information before continuing.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1, mt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Account Security
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AutoFixHigh />}
              onClick={handleGenerateClick}
            >
              Generate Password
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleGenerateClose}
            >
              <MenuItem onClick={() => handleGeneratePassword('random')}>
                <Key fontSize="small" sx={{ mr: 1 }} /> Random Password
              </MenuItem>
              <MenuItem onClick={() => handleGeneratePassword('passphrase')}>
                <VpnKey fontSize="small" sx={{ mr: 1 }} /> Passphrase
              </MenuItem>
            </Menu>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Confirm New Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ mb: 1, mt: 3, fontWeight: 'bold' }}>
            Personal Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                margin="dense"
                label="Staff ID"
                fullWidth
                required
                value={staffId}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setStaffId(digits);
                }}
                onBlur={() => {
                  if (staffId && staffId.length < 6) {
                    setStaffId(staffId.padStart(6, '0'));
                  }
                }}
                inputProps={{ inputMode: 'numeric', maxLength: 6 }}
                placeholder="6 digits"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                margin="dense"
                label="First Name"
                fullWidth
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                inputProps={{ maxLength: 100 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                margin="dense"
                label="Middle Name/Initial"
                fullWidth
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                inputProps={{ maxLength: 100 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                margin="dense"
                label="Last Name"
                fullWidth
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                inputProps={{ maxLength: 100 }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                margin="dense"
                label="Phone Number"
                fullWidth
                required
                value={phoneNumber}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhoneNumber(digits);
                }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">+63</InputAdornment>,
                }}
                inputProps={{ inputMode: 'numeric' }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth margin="dense" required>
                <InputLabel>Sex</InputLabel>
                <Select
                  value={sex}
                  label="Sex"
                  onChange={(e) => setSex(e.target.value)}
                >
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                  <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth margin="dense" required>
                <InputLabel>Unit/Section</InputLabel>
                <Select
                  value={unitId}
                  label="Unit/Section"
                  onChange={(e) => setUnitId(e.target.value as number)}
                >
                  {availableUnits.map((unit) => (
                    <MenuItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading || !newPassword || !confirmPassword || !staffId || !firstName || !lastName || !phoneNumber || !sex || unitId === ''}
          >
            {loading ? 'Saving Profile...' : 'Save Profile & Password'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
