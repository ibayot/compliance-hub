'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography,
  useMediaQuery, useTheme } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/contexts/AuthContext';
import { useSse } from '@/lib/utils/useSse';
import { PendingStaffRecord, usersApi } from '@/lib/api/users';
import { SearchableSelect } from '@/components/SearchableSelect';

export default function PendingStaffPanel({ onCompleted }: { onCompleted: () => Promise<void> }) {
  const { myCap } = useAuth();
  const compact = useMediaQuery(useTheme().breakpoints.down('md'));
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
  const visibleStaff = filtered.slice(currentPage * rows, (currentPage + 1) * rows);
  const renderStaff = (person: PendingStaffRecord) => {
    const reviewRequired = person.reviewReason === 'Reportorial-unit staff require authorized account setup.' && myCap?.isUserManagementAdmin ? '' : person.reviewReason;
    const problem = reviewRequired || (person.linkedUserId ? 'Linked account needs reconciliation.' : '') ||
      (!person.unitId || !Number(person.unitActive) ? 'An active unit is required.' : '') ||
      (Number(person.reportorial) && !myCap?.isUserManagementAdmin ? 'User Management Admin is required for RICTMS accounts.' : '');
    const name = [person.firstName, person.middleName, person.lastName, person.suffix].filter(Boolean).join(' ');
    const unit = <>{person.unit || 'Not assigned'}<Typography variant="caption" display="block" color="text.secondary">{person.positionFull}</Typography></>;
    const action = (
      <Button size="small" variant="outlined" disabled={!!problem} sx={{ minHeight: { xs: 44, md: 32 } }}
        onClick={() => {
          setSelected(person);
          setEmail('');
          setRole(Number(person.reportorial) ? '' : 'user');
        }}
      >Add Email</Button>
    );
    const explanation = problem && <Typography variant="caption" display="block" color="text.secondary">{problem}</Typography>;

    if (compact) return (
      <Card key={person.staffId} component="article" variant="outlined" sx={{ p: 1.25, overflowWrap: 'anywhere' }}>
        <Typography variant="body2" fontWeight={700}>{name}</Typography>
        <Typography variant="caption" display="block" color="text.secondary">Staff ID: {person.staffId}</Typography>
        <Typography component="div" variant="body2" sx={{ my: 0.5 }}>{unit}</Typography>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
          {explanation}
          <Box sx={{ ml: 'auto', flexShrink: 0 }}>{action}</Box>
        </Stack>
      </Card>
    );

    return (
      <TableRow key={person.staffId} hover>
        <TableCell>{person.staffId}</TableCell>
        <TableCell>{name}</TableCell>
        <TableCell>{unit}</TableCell>
        <TableCell>{action}{explanation}</TableCell>
      </TableRow>
    );
  };
  return <Box>
    <Alert severity="info" sx={{ mb: 2 }}>These staff have been synchronized but do not yet have accounts. Add an email to create their account from the existing details. Existing accounts remain in the regular account tabs.</Alert>
    {error && <Alert severity="error" action={<Button color="inherit" onClick={() => void reload()}>Retry</Button>} sx={{ mb: 2 }}>{error}</Alert>}
    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
      <TextField size="small" fullWidth label="Search pending staff" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
      <Button onClick={() => void reload()} disabled={loading}>Refresh</Button>
    </Stack>
    {loading && <Typography color="text.secondary">Loading pending staff...</Typography>}
    {!loading && !error && !filtered.length && <Typography color="text.secondary">No pending staff match this list.</Typography>}
    {visibleStaff.length > 0 && (compact ? (
      <Stack spacing={1}>{visibleStaff.map(renderStaff)}</Stack>
    ) : (
      <TableContainer><Table size="small"><TableHead><TableRow>
        <TableCell>Staff ID</TableCell><TableCell>Name</TableCell><TableCell>Unit / Position</TableCell><TableCell>Action</TableCell>
      </TableRow></TableHead><TableBody>{visibleStaff.map(renderStaff)}</TableBody></Table></TableContainer>
    ))}
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
