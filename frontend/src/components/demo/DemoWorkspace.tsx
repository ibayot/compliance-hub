import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Container, MenuItem,
  Rating, Stack, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth } from '@/contexts/AuthContext';
import { demoApi, demoDate, demoStatuses, demoSupportTypes, DemoTicket, DemoTicketSummary } from '@/lib/api/demo';

const home = '/operations/demo';

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
          ? <TicketDetail key={ticketId} id={ticketId} technician={user?.demoRole === 'technician'} />
          : <TicketList technician={user?.demoRole === 'technician'} />)}
      </Stack>
    </Container>
  );
}

function TicketList({ technician }: { technician: boolean }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<DemoTicketSummary[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [supportType, setSupportType] = useState<DemoTicketSummary['supportType']>('IT Support');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let current = true;
    setItems(null);
    setError('');
    void demoApi.list(page).then(({ items: next, hasMore: more }) => {
      if (current) { setItems(next); setHasMore(more); }
    }).catch(() => { if (current) { setItems([]); setError('Could not load demo tickets. Try refreshing.'); } });
    return () => { current = false; };
  }, [page, revision]);

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Typography component="h2" variant="h6">Demo Tickets</Typography>
        <Stack direction="row" gap={1}>
          <Button startIcon={<RefreshIcon />} onClick={() => setRevision(value => value + 1)}>Refresh</Button>
          {!creating && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>New Ticket</Button>}
        </Stack>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {creating && (
        <Card variant="outlined">
          <CardContent>
            <Stack component="form" spacing={2} onSubmit={async event => {
              event.preventDefault();
              if (saving) return;
              setSaving(true); setError('');
              try {
                const ticket = await demoApi.create(subject, description, supportType);
                navigate(`${home}/${ticket.id}`);
              } catch { setError('Could not file the demo ticket. Check the fields and try again.'); }
              finally { setSaving(false); }
            }}>
              <Typography component="h3" variant="h6">New Demo Ticket</Typography>
              {technician && <Typography variant="body2">Requested for Demo User</Typography>}
              <TextField label="Subject" value={subject} onChange={event => setSubject(event.target.value)} required inputProps={{ maxLength: 255 }} />
              <TextField select label="Support Type" value={supportType} onChange={event => setSupportType(event.target.value as typeof supportType)}>
                {demoSupportTypes.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
              </TextField>
              <TextField label="Description" value={description} onChange={event => setDescription(event.target.value)} required multiline minRows={3} inputProps={{ maxLength: 12000 }} />
              <Stack direction="row" justifyContent="flex-end" gap={1}>
                <Button disabled={saving} onClick={() => setCreating(false)}>Cancel</Button>
                <Button disabled={saving || !subject.trim() || !description.trim()} type="submit" variant="contained">Submit Ticket</Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}
      {items === null ? <CircularProgress aria-label="Loading demo tickets" size={24} /> : items.map(ticket => (
        <Card variant="outlined" key={ticket.id} component={Link} to={`${home}/${ticket.id}`} sx={{
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

function TicketDetail({ id, technician }: { id: string; technician: boolean }) {
  const [ticket, setTicket] = useState<DemoTicket | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [resolving, setResolving] = useState(false);

  const refresh = useCallback(async () => {
    setError('');
    try { setTicket(await demoApi.detail(id)); }
    catch { setError('Could not open this demo ticket. Check that Demo Mode is still on.'); }
  }, [id]);
  useEffect(() => { void refresh(); }, [refresh]);

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
  const actorName = (id: number) => id === ticket?.technicianId ? 'Demo Technician' : 'Demo User';

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between">
        <Button component={Link} to={home} startIcon={<ArrowBackIcon />}>Demo Tickets</Button>
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
              {!technician && ticket.status === 'resolved' && <>
                <Box><Typography component="h3" variant="subtitle2">Rate Resolution</Typography>
                  <Rating name="demo-resolution" value={rating} onChange={(_, value) => setRating(value)} size="large" />
                </Box>
                <TextField label="Feedback (optional)" value={feedback} onChange={event => setFeedback(event.target.value)} multiline inputProps={{ maxLength: 4000 }} />
                <Button variant="contained" disabled={busy || !rating} onClick={() => { if (rating) void update(() => demoApi.rate(id, rating, feedback)); }}>Submit Rating</Button>
              </>}
              {ticket.rating && <Typography variant="body2">Resolution rated {ticket.rating.rating}/5{ticket.rating.feedback ? ` — ${ticket.rating.feedback}` : ''}</Typography>}
            </Stack>
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1}>
              <Typography component="h3" variant="subtitle1">Attachments</Typography>
              {ticket.attachments.map(item => <Button key={item.id} sx={{ justifyContent: 'flex-start', overflowWrap: 'anywhere' }} onClick={() => void download(item)}>{item.fileName}</Button>)}
              {ticket.attachments.length === 0 && <Typography variant="body2" color="text.secondary">No attachments</Typography>}
              {ticket.status !== 'closed' && (
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
                {ticket.status !== 'closed' && <>
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
      </>}
    </Stack>
  );
}
