import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Container,
  Dialog, DialogContent, DialogTitle, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/contexts/PageTitleContext';
import type { CsatFormData } from '@/app/api/references';
import ClientSatisfactionDialog, { satisfactionFormError } from '@/components/ClientSatisfactionDialog';
import { demoApi, demoDate, demoStatuses, demoUserPaths, DemoTicket, DemoTicketSummary } from '@/lib/api/demo';
import DemoTicketForm from './DemoTicketForm';
import { demoDashboardKey } from './useDemoDashboard';

const home = '/operations/demo';
const demoUnit = 'Demo Unit';
const demoProfile = { firstName: 'Demo', lastName: 'User', sex: 'Prefer Not to Say', phoneNumber: '9000000000' };

function demoSatisfactionForm(ticket: DemoTicket): CsatFormData {
  const transaction = ticket.events.find(event => event.action === 'resolved')?.createdAt ?? ticket.createdAt;
  return {
    consentGiven: false, unitSection: demoUnit, dateOfTransaction: transaction.slice(0, 10),
    clientFirstName: demoProfile.firstName, clientMiddleInitial: '', clientLastName: demoProfile.lastName,
    suffix: '', religion: '', sex: demoProfile.sex, contactNumber: demoProfile.phoneNumber,
    technicianName: 'Demo Technician', likert: [0, 0, 0, 'NA', 0, 'NA', 0, 0, 'NA'],
  };
}

export default function DemoWorkspace() {
  const { ticketId } = useParams();
  const { user, logout, isSessionLocked, requiresPasswordChange } = useAuth();
  return (
    <Container maxWidth="md" sx={{ px: { xs: 1.5, sm: 3 }, py: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" gap={1.5} alignItems="center" justifyContent="space-between">
          <Box>
            <Typography component="h1" variant="h5">FO2 iCare Demo</Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.demoRole === 'technician' ? 'Demo Technician' : 'Demo User'}
            </Typography>
          </Box>
          <Button onClick={() => void logout()}>Sign out</Button>
        </Stack>
        <Alert severity="info">Use sample information only. Demo tickets stay out of live reports and notifications.</Alert>
        {!isSessionLocked && !requiresPasswordChange && (ticketId
          ? <DemoTicketDetail key={ticketId} id={ticketId} viewer={user?.demoRole ?? 'user'} />
          : <DemoTicketList technician={user?.demoRole === 'technician'} />)}
      </Stack>
    </Container>
  );
}

export function DemoTicketList({ technician, requesterWorkspace = false }: { technician: boolean; requesterWorkspace?: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const status = params.get('filter') === 'pending_satisfaction' ? 'resolved' : params.get('status') ?? '';
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<DemoTicketSummary[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const detailUrl = (id: string) => requesterWorkspace ? `/operations/tickets/${id}?source=my-tickets` : `${home}/${id}`;

  useEffect(() => {
    const timer = window.setTimeout(() => { setPage(1); setQuery(search.trim()); }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let current = true;
    setItems(null);
    setError('');
    void demoApi.list(page, { status: status || undefined, search: query || undefined }).then(({ items: next, hasMore: more }) => {
      if (current) { setItems(next); setHasMore(more); }
    }).catch(() => { if (current) { setItems([]); setError('Could not load demo tickets. Try refreshing.'); } });
    return () => { current = false; };
  }, [page, query, revision, status]);

  const form = <DemoTicketForm proxy={technician} submit={demoApi.create} onCancel={() => setCreating(false)}
    onSuccess={ticket => {
      void queryClient.invalidateQueries({ queryKey: demoDashboardKey });
      navigate(detailUrl(ticket.id));
    }} />;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Box>
          <Typography component={requesterWorkspace ? 'h1' : 'h2'} variant={requesterWorkspace ? 'h4' : 'h6'}>
            {requesterWorkspace ? 'My Tickets' : 'Demo Tickets'}
          </Typography>
          {requesterWorkspace && <Typography variant="body2" color="text.secondary">Submit and track your ICT support requests.</Typography>}
        </Box>
        <Stack direction="row" gap={1}>
          <Button startIcon={<RefreshIcon />} onClick={() => setRevision(value => value + 1)}>Refresh</Button>
          {!creating && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>New Ticket</Button>}
        </Stack>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {requesterWorkspace && <>
        <TextField label="Search tickets" placeholder="Search by ticket number or subject" size="small" fullWidth
          value={search} onChange={event => setSearch(event.target.value)} inputProps={{ maxLength: 255 }} />
        <Tabs aria-label="Ticket status" variant="scrollable" scrollButtons="auto" value={status}
          onChange={(_, value: string) => {
            setPage(1);
            setParams(value ? { status: value } : {});
          }}>
          <Tab value="" label="All" />
          {Object.entries(demoStatuses).map(([value, label]) => <Tab key={value} value={value} label={label} />)}
        </Tabs>
        <Dialog open={creating} onClose={() => setCreating(false)} maxWidth="sm" fullWidth>
          <DialogTitle>New Ticket</DialogTitle>
          <DialogContent dividers>{creating && form}</DialogContent>
        </Dialog>
      </>}
      {creating && !requesterWorkspace && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Typography component="h3" variant="h6">New Demo Ticket</Typography>
              {form}
            </Stack>
          </CardContent>
        </Card>
      )}
      {items === null ? <CircularProgress aria-label="Loading demo tickets" size={24} /> : items.map(ticket => (
        <Card variant="outlined" key={ticket.id} component={Link} to={detailUrl(ticket.id)} sx={{
          display: 'block', color: 'inherit', textDecoration: 'none', '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
        }}>
          <CardContent>
            <Stack direction="row" alignItems="start" justifyContent="space-between" gap={1}>
              <Box sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                <Typography variant="caption" color="text.secondary">{ticket.ticketNumber}</Typography>
                <Typography fontWeight={700}>{ticket.subject}</Typography>
                <Typography variant="body2" color="text.secondary">{ticket.supportType}</Typography>
              </Box>
              <Chip size="small" label={demoStatuses[ticket.status]} />
            </Stack>
          </CardContent>
        </Card>
      ))}
      {items?.length === 0 && !error && <Typography color="text.secondary">No demo tickets have been filed.</Typography>}
      {(page > 1 || hasMore) && (
        <Stack direction="row" justifyContent="space-between">
          <Button disabled={page === 1 || items === null} onClick={() => setPage(value => value - 1)}>Previous</Button>
          <Button disabled={!hasMore || items === null} onClick={() => setPage(value => value + 1)}>Next</Button>
        </Stack>
      )}
    </Stack>
  );
}

export function DemoTicketDetail({ id, viewer, requesterWorkspace = false }: { id: string; viewer: 'user' | 'technician' | 'administrator'; requesterWorkspace?: boolean }) {
  const technician = viewer === 'technician';
  const canParticipate = viewer !== 'administrator';
  const [ticket, setTicket] = useState<DemoTicket | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');
  const [notes, setNotes] = useState('');
  const [ratingForm, setRatingForm] = useState<CsatFormData | null>(null);
  const [ratingError, setRatingError] = useState('');
  const [ratingBusy, setRatingBusy] = useState(false);
  const [resolving, setResolving] = useState(false);
  const queryClient = useQueryClient();
  const { setPageTitle } = usePageTitle();

  const refresh = useCallback(async () => {
    setError('');
    try { setTicket(await demoApi.detail(id)); }
    catch { setError(canParticipate ? 'Could not open this demo ticket. Check that Demo Mode is still on.' : 'This demo ticket could not be opened. It may have been deleted.'); }
  }, [canParticipate, id]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!requesterWorkspace) return;
    setPageTitle(ticket?.ticketNumber ?? null);
    return () => setPageTitle(null);
  }, [requesterWorkspace, setPageTitle, ticket?.ticketNumber]);

  async function update(action: () => Promise<DemoTicket>, done?: () => void) {
    if (busy) return;
    setBusy(true); setError('');
    try { setTicket(await action()); done?.(); }
    catch { setError('Could not save the change. Refresh the ticket and try again.'); }
    finally { setBusy(false); }
  }
  async function download(attachment: DemoTicket['attachments'][number]) {
    try {
      const url = URL.createObjectURL(await demoApi.download(id, attachment.id));
      const link = document.createElement('a');
      link.href = url; link.download = attachment.fileName; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch { setError('Could not download this attachment.'); }
  }

  async function submitRating() {
    if (!ratingForm || ratingBusy) return;
    const validationError = satisfactionFormError(ratingForm);
    if (validationError) { setRatingError(validationError); return; }
    setRatingBusy(true);
    setRatingError('');
    try {
      setTicket(await demoApi.rate(id, ratingForm.likert));
      setRatingForm(null);
      void queryClient.invalidateQueries({ queryKey: demoDashboardKey });
    } catch {
      setRatingError('Could not submit the rating. Try again or refresh the ticket.');
    } finally {
      setRatingBusy(false);
    }
  }
  const actorName = (id: number) => {
    if (id === ticket?.technicianId) return 'Demo Technician';
    if (id === ticket?.requesterId) return 'Demo User';
    return 'Demo Administrator';
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between">
        {canParticipate && <Button component={Link} to={requesterWorkspace ? demoUserPaths.tickets : home} startIcon={<ArrowBackIcon />}>
          {requesterWorkspace ? 'Back to My Tickets' : 'Demo Tickets'}
        </Button>}
        <Button startIcon={<RefreshIcon />} disabled={busy} onClick={() => void refresh()}>Refresh</Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {!ticket && !error && <CircularProgress aria-label="Loading demo ticket" size={24} />}
      {ticket && <>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5} sx={{ overflowWrap: 'anywhere' }}>
              <Typography variant="caption" color="text.secondary">{ticket.ticketNumber}</Typography>
              <Typography component="h2" variant="h6">{ticket.subject}</Typography>
              <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
                <Chip size="small" label={demoStatuses[ticket.status]} />
                <Typography variant="body2">{ticket.supportType}</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">Requested for Demo User · Assigned to Demo Technician</Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{ticket.description}</Typography>
              {ticket.resolutionNotes && <Box>
                <Typography fontWeight={700}>Resolution Notes</Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{ticket.resolutionNotes}</Typography>
              </Box>}
              {technician && ticket.status === 'assigned' && (
                <Button variant="contained" disabled={busy} onClick={() => void update(() => demoApi.status(id, 'in_progress'))}>Start Work</Button>
              )}
              {technician && ticket.status === 'in_progress' && (!resolving
                ? <Button variant="contained" onClick={() => setResolving(true)}>Resolve Ticket</Button>
                : <>
                  <TextField label="Resolution Notes" value={notes} onChange={event => setNotes(event.target.value)} multiline minRows={2} required inputProps={{ maxLength: 5000 }} />
                  <Button variant="contained" disabled={busy || !notes.trim()} onClick={() => void update(() => demoApi.status(id, 'resolved', notes), () => setResolving(false))}>Save Resolution</Button>
                </>)}
              {viewer === 'user' && ticket.status === 'resolved' && (
                <Button variant="contained" startIcon={<ThumbUpIcon />} disabled={busy} onClick={() => {
                  setRatingError('');
                  setRatingForm(demoSatisfactionForm(ticket));
                }}>Rate Resolution</Button>
              )}
              {ticket.rating && <Typography variant="body2">Resolution rated {ticket.rating.rating.toFixed(2)}/5</Typography>}
            </Stack>
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1}>
              <Typography component="h3" variant="subtitle1">Attachments</Typography>
              {ticket.attachments.map(item => <Button key={item.id} sx={{ justifyContent: 'flex-start', overflowWrap: 'anywhere' }} onClick={() => void download(item)}>{item.fileName}</Button>)}
              {ticket.attachments.length === 0 && <Typography variant="body2" color="text.secondary">No attachments</Typography>}
              {canParticipate && ticket.status !== 'closed' && (
                <Button component="label" variant="outlined" disabled={busy}>
                  Attach File
                  <input type="file" hidden accept="image/jpeg,image/png,image/webp,application/pdf" onChange={event => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) { setError('Each attachment must be 10 MB or smaller.'); return; }
                    void update(() => demoApi.upload(id, file));
                  }} />
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1.5} sx={{ overflowWrap: 'anywhere' }}>
                <Typography component="h3" variant="subtitle1">Comments</Typography>
                {ticket.comments.map(item => <Box key={item.id}>
                  <Typography variant="body2" fontWeight={700}>{actorName(item.authorId)}</Typography>
                  <Typography variant="caption" color="text.secondary">{demoDate(item.createdAt)}</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{item.body}</Typography>
                </Box>)}
                {ticket.comments.length === 0 && <Typography variant="body2" color="text.secondary">No comments</Typography>}
                {canParticipate && ticket.status !== 'closed' && <>
                  <TextField label="Add Comment" value={comment} onChange={event => setComment(event.target.value)} multiline inputProps={{ maxLength: 5000 }} />
                  <Button variant="outlined" disabled={busy || !comment.trim()} onClick={() => void update(() => demoApi.comment(id, comment), () => setComment(''))}>Post Comment</Button>
                </>}
              </Stack>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Typography component="h3" variant="subtitle1">Timeline</Typography>
                {ticket.events.map(item => <Box key={item.id}>
                  <Typography variant="body2" fontWeight={700}>{demoStatuses[item.action]}</Typography>
                  <Typography variant="caption" color="text.secondary">{actorName(item.actorId)} · {demoDate(item.createdAt)}</Typography>
                </Box>)}
              </Stack>
            </CardContent>
          </Card>
        </Box>
        {ratingForm && <ClientSatisfactionDialog demo open onClose={() => { if (!ratingBusy) setRatingForm(null); }}
          onSubmit={() => void submitRating()} ticketNumber={ticket.ticketNumber} submitted={Boolean(ticket.rating)}
          form={ratingForm} setForm={update => setRatingForm(current => current && (typeof update === 'function' ? update(current) : update))}
          unitSuggestions={[demoUnit]} profile={demoProfile} submitting={ratingBusy} error={ratingError} />}
      </>}
    </Stack>
  );
}
