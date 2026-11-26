import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, List, ListItem, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { demoApi, demoDate, demoStatuses, DemoState, DemoTicketSummary } from '@/lib/api/demo';

export default function DemoModeSettings() {
  const [state, setState] = useState<DemoState | null>(null);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tickets, setTickets] = useState<DemoTicketSummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [requester, setRequester] = useState('');
  const [technician, setTechnician] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<'disable' | DemoTicketSummary | null>(null);
  const [result, setResult] = useState<{ message: string; severity: 'info' | 'error' | 'success' }>();

  const load = useCallback(async (nextPage: number) => {
    const [nextState, storage] = await Promise.allSettled([demoApi.state(), demoApi.ready()]);
    if (nextState.status === 'rejected') {
      setResult({ message: 'Could not load Demo Mode settings.', severity: 'error' });
      return;
    }
    setState(nextState.value);
    const storageReady = storage.status === 'fulfilled' && storage.value;
    setReady(storageReady);
    if (!storageReady) return;
    try {
      const data = await demoApi.list(nextPage);
      if (!data.items.length && nextPage > 1) {
        setPage(nextPage - 1);
        return;
      }
      setTickets(data.items);
      setHasMore(data.hasMore);
    } catch {
      setResult({ message: 'Could not load demo tickets.', severity: 'error' });
    }
  }, []);

  useEffect(() => {
    setChecking(true);
    void load(page).finally(() => setChecking(false));
  }, [load, page]);

  async function change(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setResult(undefined);
    try { await action(); }
    catch { setResult({ message: 'Could not save the demo change. Refresh the settings and try again.', severity: 'error' }); }
    finally { setBusy(false); }
  }

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
            <Typography component="h2" variant="h6">Demo Mode</Typography>
            {state && <Chip size="small" color={state.active ? 'success' : 'default'} label={state.active ? 'On' : 'Off'} />}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Give two dedicated accounts access to a separate demo ticket workspace for presentations. Demo activity stays out of live reports.
          </Typography>
          {result && <Alert severity={result.severity}>{result.message}</Alert>}
          {checking && <CircularProgress size={22} aria-label="Loading Demo Mode" />}
          {state && !checking && <>
            {!ready && <Alert severity="warning">Demo ticket storage is unavailable. Check the Ticketing database setup before starting a demo.</Alert>}
            {state.active ? <>
              <Typography variant="body2">
                Demo User #{state.active.requesterId} · Demo Technician #{state.active.technicianId}
              </Typography>
              <Box><Button variant="outlined" color="warning" onClick={() => setConfirmation('disable')} disabled={busy}>Turn Off Demo Mode</Button></Box>
            </> : <>
              {(!state.candidates.some(account => account.demoRole === 'user') || !state.candidates.some(account => account.demoRole === 'technician')) && (
                <Alert severity="info">In User Management, create active accounts named Demo User and Demo Technician. Refresh here to select them.</Alert>
              )}
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
                <TextField select label="Demo User" value={requester} onChange={event => setRequester(event.target.value)} fullWidth>
                  <MenuItem value="">Select an account</MenuItem>
                  {state.candidates.filter(account => account.demoRole === 'user').map(account => (
                    <MenuItem key={account.id} value={String(account.id)}>{account.email} · #{account.id}</MenuItem>
                  ))}
                </TextField>
                <TextField select label="Demo Technician" value={technician} onChange={event => setTechnician(event.target.value)} fullWidth>
                  <MenuItem value="">Select an account</MenuItem>
                  {state.candidates.filter(account => account.demoRole === 'technician').map(account => (
                    <MenuItem key={account.id} value={String(account.id)}>{account.email} · #{account.id}</MenuItem>
                  ))}
                </TextField>
              </Stack>
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Button variant="contained" disabled={!ready || !requester || !technician || busy} onClick={() => void change(async () => {
                  setState(await demoApi.enable(Number(requester), Number(technician)));
                  setResult({ message: 'Demo Mode is on. The two selected accounts can now sign in.', severity: 'success' });
                })}>Turn On Demo Mode</Button>
                <Button disabled={busy} onClick={() => void change(() => load(page))}>Refresh</Button>
              </Stack>
            </>}
            {ready && <>
              <Typography component="h3" variant="subtitle1">Manage Demo Tickets</Typography>
              {tickets.length === 0 && <Typography variant="body2" color="text.secondary">No demo tickets to manage.</Typography>}
              <List disablePadding>
                {tickets.map(ticket => {
                  const retention = state.retained.find(run => run.id === ticket.runId);
                  return (
                    <ListItem key={ticket.id} disableGutters divider sx={{ alignItems: 'start', gap: 1.5 }}>
                      <Box sx={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}>
                        <Typography variant="body2" fontWeight={700}>{ticket.ticketNumber}</Typography>
                        <Typography variant="body2">{ticket.subject} · {demoStatuses[ticket.status]}</Typography>
                        {retention && <Typography variant="caption" color="text.secondary">Scheduled for deletion {demoDate(retention.purgeAfter)}</Typography>}
                      </Box>
                      <Button color="error" onClick={() => setConfirmation(ticket)} disabled={busy}>Delete</Button>
                    </ListItem>
                  );
                })}
              </List>
              {(hasMore || page > 1) && (
                <Stack direction="row" gap={1}>
                  <Button disabled={busy || page === 1} onClick={() => setPage(value => value - 1)}>Previous</Button>
                  <Button disabled={busy || !hasMore} onClick={() => setPage(value => value + 1)}>Next</Button>
                </Stack>
              )}
            </>}
          </>}
        </Stack>
      </CardContent>
      <Dialog open={confirmation !== null} onClose={() => setConfirmation(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{confirmation === 'disable' ? 'Turn off Demo Mode?' : 'Delete demo ticket?'}</DialogTitle>
        <DialogContent>
          {confirmation === 'disable'
            ? 'Both demo accounts will lose access immediately. The current demo tickets and attachments will be scheduled for deletion in seven days.'
            : confirmation ? `${confirmation.ticketNumber} and its comments, attachments, resolution and rating will be permanently deleted.` : ''}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmation(null)}>Cancel</Button>
          <Button color={confirmation === 'disable' ? 'warning' : 'error'} disabled={busy} onClick={() => {
            const selected = confirmation;
            setConfirmation(null);
            if (!selected) return;
            void change(async () => {
              if (selected === 'disable') {
                setState(await demoApi.disable());
                setResult({ message: 'Demo Mode is off. The demo tickets are scheduled for deletion in seven days.', severity: 'success' });
              } else {
                const response = await demoApi.remove(selected.id);
                await load(page);
                setResult(response.filesPending
                  ? { message: 'Demo ticket deleted. Attachment cleanup will retry automatically.', severity: 'info' }
                  : { message: 'Demo ticket and its attachments deleted.', severity: 'success' });
              }
            });
          }}>{confirmation === 'disable' ? 'Turn Off' : 'Delete Demo Ticket'}</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
