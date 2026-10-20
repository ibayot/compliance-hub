import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Chip, CircularProgress, Pagination, Paper, Stack, TextField, Typography } from '@mui/material';
import { DirectoryUnit, StaffDirectoryResult, staffDirectoryApi } from '@/lib/api/staff-directory';
import { useAuth } from '@/contexts/AuthContext';
import { useSse } from '@/lib/utils/useSse';

export default function StaffDirectoryPage() {
  const { user, myCap, isSessionLocked } = useAuth();
  const [units, setUnits] = useState<DirectoryUnit[]>([]);
  const [unit, setUnit] = useState<DirectoryUnit | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<StaffDirectoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const generation = useRef(0);
  const sseTimer = useRef<ReturnType<typeof setTimeout>>();
  const allowed = !!user && !!myCap?.isStaffDirectoryAccess && !isSessionLocked;

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    if (!allowed) return;
    const request = ++generation.current;
    setLoading(true);
    setFailed(false);
    try {
      const data = await staffDirectoryApi.list({ page, limit: 25, unitId: unit?.id, search: query || undefined });
      if (request !== generation.current) return;
      // A directory update can remove the last page; fetch the nearest valid page.
      if (page > 1 && page > Math.max(1, Math.ceil(data.total / data.limit))) { setPage(Math.max(1, Math.ceil(data.total / data.limit))); return; }
      setResult(data);
      setUnits(data.units);
    } catch {
      if (request === generation.current) { setFailed(true); setResult(null); }
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [allowed, user?.id, page, unit?.id, query]);

  useEffect(() => {
    setResult(null);
    void load();
    return () => { generation.current++; clearTimeout(sseTimer.current); };
  }, [load]);
  useSse(['USER_DIRECTORY_UPDATED'], () => {
    clearTimeout(sseTimer.current);
    sseTimer.current = setTimeout(() => void load(), 500);
  });

  if (!allowed) return null;
  return <Box>
    <Typography variant="h4" component="h1" gutterBottom>Staff Directory</Typography>
    <Typography color="text.secondary" sx={{ mb: 2 }}>
      Find staff by their current unit in Compliance Hub. Saved unit selections take precedence over personnel-directory updates.
      Directory-only staff have not yet been registered. This is a read-only lookup, not account management.
    </Typography>
    <Paper sx={{ p: 2, mb: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        <Autocomplete options={units} value={units.find(option => option.id === unit?.id) || unit} onChange={(_, value) => { setUnit(value); setPage(1); }}
          getOptionLabel={option => `${option.name} (${option.staffCount})`}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          sx={{ width: { xs: '100%', md: 360 }, minWidth: 0 }}
          renderInput={params => <TextField {...params} label="Unit" placeholder="All active units" size="small" />} />
        <TextField label="Search staff" placeholder="Name or position" value={search} size="small"
          inputProps={{ maxLength: 100 }} onChange={event => setSearch(event.target.value)} sx={{ flex: 1, minWidth: 0 }} />
        <Button onClick={() => { setSearch(''); setQuery(''); setUnit(null); setPage(1); }}>Reset</Button>
      </Stack>
    </Paper>
    {failed && <Alert severity="warning" action={<Button color="inherit" onClick={() => void load()}>Retry</Button>}>
      Staff could not be loaded. Please retry; no account or unit data has been changed.
    </Alert>}
    {loading ? <Box role="status" aria-label="Loading staff directory" sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box> : result && <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {result.total} staff {unit ? `in ${unit.name}` : 'across units'}{query ? ' matching your search' : ''}
      </Typography>
      {!result.data.length && <Alert severity="info">No staff match this unit or search.</Alert>}
      <Stack spacing={1}>
        {result.data.map(staff => <Paper key={staff.key} variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 2fr) minmax(0, 2fr) auto' }, gap: 1.5, alignItems: 'center' }}>
            <Typography fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>{staff.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{staff.position || 'Position not provided'}</Typography>
            <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{staff.units.map(u => u.name).join(' · ') || 'No active unit assigned'}</Typography>
            <Chip size="small" variant="outlined" label={staff.hasAccount ? 'Registered' : 'Directory only'} sx={{ justifySelf: 'start' }} />
          </Box>
        </Paper>)}
      </Stack>
      {result.total > result.limit && <Pagination page={page} count={Math.ceil(result.total / result.limit)} onChange={(_, value) => setPage(value)}
        sx={{ mt: 2, display: 'flex', justifyContent: 'center' }} siblingCount={0} />}
    </>}
  </Box>;
}
