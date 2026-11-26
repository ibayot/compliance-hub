import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { authApi } from '@/lib/api/auth';
import type { User } from '@/lib/types/auth';

export default function DemoPasswordChangeModal({ open, onClose }: { open: boolean; onClose: () => void; user: User }) {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <Dialog open={open} disableEscapeKeyDown fullWidth maxWidth="xs">
      <form onSubmit={async event => {
        event.preventDefault();
        if (saving) return;
        if (password !== confirm) { setError('The new passwords must match.'); return; }
        setSaving(true); setError('');
        try {
          await authApi.changePassword({ currentPassword: current, newPassword: password });
          setCurrent(''); setPassword(''); setConfirm('');
          onClose();
        } catch { setError('Could not change the password. Check the current password and the new password requirements.'); }
        finally { setSaving(false); }
      }}>
        <DialogTitle>Change Demo Account Password</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography variant="body2">Use at least 12 characters with uppercase and lowercase letters, a number and a special character.</Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Current Password" type="password" autoComplete="current-password" value={current} onChange={event => setCurrent(event.target.value)} required />
            <TextField label="New Password" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} required />
            <TextField label="Confirm New Password" type="password" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} required />
          </Stack>
        </DialogContent>
        <DialogActions><Button type="submit" variant="contained" disabled={saving}>Change Password</Button></DialogActions>
      </form>
    </Dialog>
  );
}
