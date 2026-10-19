'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/contexts/AuthContext';
import { useSse } from '@/lib/utils/useSse';
import { PendingStaffRecord, usersApi } from '@/lib/api/users';
import { SearchableSelect } from '@/components/SearchableSelect';

export default function PendingStaffPanel({ onCompleted }: { onCompleted: () => Promise<void> }) {
  const { myCap } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [staff, setStaff] = useState<PendingStaffRecord[]>([]);
  const [roles, setRoles] = useState<Array<{value: string; label: string}>>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(10);
  const [selected, setSelected] = useState<PendingStaffRecord | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [saving, setSaving] = useState(false);
  const reload = useCallback(async () => {
    setLoading(true);
    try { const data = await usersApi.listPendingStaff(); setStaff(data.staff); setRoles(data.roles); setError(''); }
    catch { setError('Unable to load pending staff. Check that staff synchronization and its database setup are complete.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  useSse(['USER_DIRECTORY_UPDATED'], reload);
  const filtered = useMemo(() => staff.filter((person) =>
    [person.staffId, person.firstName, person.middleName, person.lastName, person.suffix, person.unit, person.positionFull]
      .filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase())), [staff, query]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / rows) - 1));
  const eligibleRoles = roles.filter((item) => Boolean(Number(selected?.reportorial)) === (item.value !== 'user'));
  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await usersApi.completePendingStaff(selected.staffId, email.trim(), role);
      setSelected(null);
      enqueueSnackbar('Email saved and account added to User Management.', { variant: 'success' });
      await Promise.all([reload(), onCompleted()]);
    } catch (err: any) {
      const message = err?.response?.data?.message;
      enqueueSnackbar((Array.isArray(message) ? message[0] : message) || 'Unable to complete this staff account.', { variant: 'error' });
      if (err?.response?.status === 409) void reload();
    } finally { setSaving(false); }
  };
  return <Box>
    <Alert severity="info" sx={{ mb: 2 }}>These staff have been synchronized but do not yet have accounts. Add an email to create their account from the existing details. Existing accounts remain in the regular account tabs.</Alert>
    {error && <Alert severity="error" action={<Button color="inherit" onClick={() => void reload()}>Retry</Button>} sx={{ mb: 2 }}>{error}</Alert>}
    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
      <TextField size="small" fullWidth label="Search pending staff" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
      <Button onClick={() => void reload()} disabled={loading}>Refresh</Button>
    </Stack>
    {loading && <Typography color="text.secondary">Loading pending staff...</Typography>}
    <TableContainer><Table size="small"><TableHead><TableRow>
      <TableCell>Staff ID</TableCell><TableCell>Name</TableCell><TableCell>Unit / Position</TableCell><TableCell>Action</TableCell>
    </TableRow></TableHead><TableBody>
      {filtered.slice(currentPage * rows, (currentPage + 1) * rows).map((person) => {
        const reviewRequired = person.reviewReason === 'Reportorial-unit staff require authorized account setup.' && myCap?.isUserManagementAdmin ? '' : person.reviewReason;
        const problem = reviewRequired || (person.linkedUserId ? 'Linked account needs reconciliation.' : '') ||
          (!person.unitId || !Number(person.unitActive) ? 'An active unit is required.' : '') ||
          (Number(person.reportorial) && !myCap?.isUserManagementAdmin ? 'User Management Admin is required for RICTMS accounts.' : '');
        return <TableRow key={person.staffId} hover><TableCell>{person.staffId}</TableCell>
          <TableCell>{[person.firstName, person.middleName, person.lastName, person.suffix].filter(Boolean).join(' ')}</TableCell>
          <TableCell>{person.unit || 'Not assigned'}<Typography variant="caption" display="block">{person.positionFull}</Typography></TableCell>
          <TableCell><Button size="small" variant="outlined" disabled={!!problem} onClick={() => {
            setSelected(person); setEmail('');
            setRole(Number(person.reportorial) ? '' : 'user');
          }}>Add Email</Button>{problem && <Typography variant="caption" display="block" color="text.secondary">{problem}</Typography>}</TableCell>
        </TableRow>;
      })}
      {!loading && !filtered.length && <TableRow><TableCell colSpan={4}>No pending staff match this list.</TableCell></TableRow>}
    </TableBody></Table></TableContainer>
    <TablePagination component="div" count={filtered.length} page={currentPage} rowsPerPage={rows}
      onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={(e) => { setRows(Number(e.target.value)); setPage(0); }} />
    <Dialog open={!!selected} onClose={() => { if (!saving) setSelected(null); }} fullWidth maxWidth="sm">
      <DialogTitle>Add Email and Create Account</DialogTitle><DialogContent>
        <Typography sx={{ mb: 1 }}>{[selected?.firstName, selected?.middleName, selected?.lastName, selected?.suffix].filter(Boolean).join(' ')} — {selected?.staffId}</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>{selected?.unit}</Typography>
        <TextField label="Email Address" type="email" required fullWidth value={email} disabled={saving}
          onChange={(e) => setEmail(e.target.value)} inputProps={{ maxLength: 100 }} sx={{ mb: 2 }} />
        <SearchableSelect label="Role" required value={role} options={eligibleRoles} disabled={saving || !myCap?.isUserManagementAdmin}
          onChange={(value) => setRole(String(value))} clearable={false} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>The current account setup and first-login requirements apply. Automatic ticket assignment remains off until explicitly enabled. No existing account will be overwritten.</Typography>
      </DialogContent><DialogActions><Button disabled={saving} onClick={() => setSelected(null)}>Cancel</Button>
        <Button variant="contained" disabled={saving || !email.trim() || !eligibleRoles.some((item) => item.value === role)} onClick={() => void save()}>{saving ? 'Saving...' : 'Save Account'}</Button>
      </DialogActions>
    </Dialog>
  </Box>;
}
