import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { Ticket, ticketsApi } from '@/app/api/references';
import { useAuth } from '@/contexts/AuthContext';
import { useSse } from '@/lib/utils/useSse';

export default function OvertimeTicketQueue() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [data, setData] = useState<{ data: Ticket[]; total: number; totalPages: number }>({ data: [], total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const enabled = !!user && user.role !== 'user';
  const load = useCallback(async () => {
    const request = ++sequence.current;
    if (!enabled) { setData({ data: [], total: 0, totalPages: 1 }); return; }
    setLoading(true);
    try {
      const response = await ticketsApi.getOvertimeOpen(page);
      if (request !== sequence.current) return;
      if (page > response.totalPages) { setPage(response.totalPages); return; }
      setData(response); setError('');
    } catch (e: any) {
      if (request === sequence.current) { setData({ data: [], total: 0, totalPages: 1 }); setError(e.response?.data?.message || 'Unable to load overtime tickets.'); }
    } finally { if (request === sequence.current) setLoading(false); }
  }, [enabled, user?.id, user?.role, page]);
  useEffect(() => { void load(); return () => { ++sequence.current; }; }, [load]);
  useSse(['TICKET_UPDATED', 'ATTENDANCE_UPDATED'], () => { void load(); });
  if (!enabled) return null;
  const claim = async (ticket: Ticket) => {
    if (claiming) return;
    setClaiming(ticket.id);
    try { await ticketsApi.claimOvertime(ticket.id); enqueueSnackbar('Ticket acquired and assigned to you.', { variant: 'success' }); }
    catch (e: any) { enqueueSnackbar(e.response?.data?.message || 'Unable to acquire this ticket. Refresh and try again.', { variant: 'error' }); }
    finally { setClaiming(null); await load(); }
  };
  return <Card sx={{ mb: 3 }}>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
        <Typography variant="h6">Overtime Open Tickets ({data.total})</Typography>
        <Button size="small" onClick={() => void load()} disabled={loading}>Refresh</Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Staff who clocked in on the original OT day can acquire these requests. Acquired tickets move to the assignee’s queue; ticket administrators retain oversight. Unclaimed requests enter automatic routing on a normal office day.
      </Typography>
      {error && <Alert severity="error" action={<Button onClick={() => void load()}>Retry</Button>}>{error}</Alert>}
      {loading && <CircularProgress size={20} aria-label="Loading overtime tickets" />}
      {!loading && !error && data.data.length === 0 && <Typography color="text.secondary">No open overtime tickets available to you.</Typography>}
      <Stack spacing={2}>
        {data.data.map(ticket => <Box key={ticket.id} sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
            <Box sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <Typography component={Link} to={`/operations/tickets/${ticket.id}`}>{ticket.ticketNumber}: {ticket.subject}</Typography>
              <Typography variant="caption" display="block">OT date: {ticket.overtimeDate}</Typography>
            </Box>
            {ticket.canClaimOvertime && <Button variant="contained" size="small" sx={{ flexShrink: 0, alignSelf: 'flex-start' }}
              disabled={!!claiming} onClick={() => void claim(ticket)}>{claiming === ticket.id ? 'Acquiring…' : 'Get Ticket'}</Button>}
          </Stack>
        </Box>)}
      </Stack>
      {data.totalPages > 1 && <Stack direction="row" gap={1} alignItems="center" sx={{ mt: 2 }}>
        <Button disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}>Previous</Button>
        <Typography variant="body2">Page {page} of {data.totalPages}</Typography>
        <Button disabled={page >= data.totalPages || loading} onClick={() => setPage(p => p + 1)}>Next</Button>
      </Stack>}
    </CardContent>
  </Card>;
}
