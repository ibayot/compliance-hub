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
} from '@mui/material';
import { usersApi } from '@/lib/api/users';
import { unitsApi, Unit } from '@/lib/api/units';
import { useSnackbar } from 'notistack';

interface Props {
  open: boolean;
  onClose: () => void;
  userId: number;
}

export default function ForcePasswordChangeModal({ open, onClose, userId }: Props) {
  const { enqueueSnackbar } = useSnackbar();

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Profile fields
  const [staffId, setStaffId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sex, setSex] = useState('');
  const [unitId, setUnitId] = useState<number | ''>('');

  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      unitsApi.listAll().then(setUnits).catch(console.error);

      if (userId) {
        usersApi.getUserById(userId).then(user => {
          if (user) {
            setStaffId(user.staffId || '');
            setFirstName(user.firstName || '');
            setMiddleName(user.middleName || '');
            setLastName(user.lastName || '');
            setPhoneNumber(user.phoneNumber || '');
            setSex(user.sex || '');
            if (user.units && user.units.length > 0) {
              setUnitId(user.units[0].id);
            }
          }
        }).catch(console.error);
      }
    }
  }, [open, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
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
      await usersApi.updateUser(userId, {
        password: newPassword,
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

          <Typography variant="subtitle2" sx={{ mb: 1, mt: 2, fontWeight: 'bold' }}>
            Account Security
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="New Password"
                type="password"
                fullWidth
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Confirm New Password"
                type="password"
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
                  {units.map((unit) => (
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
