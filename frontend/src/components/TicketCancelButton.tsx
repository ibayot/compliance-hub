import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/contexts/AuthContext';
import { Ticket, ticketsApi } from '@/app/api/references';

export default function TicketCancelButton({ ticket, onCancelled }: { ticket: Ticket; onCancelled: () => void }) {
  const { user, myCap } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const allowed = !!myCap?.isTicketCancellation && ['open', 'assigned', 'in_progress'].includes(ticket.status) &&
    (user?.role !== 'user' || [ticket.requesterId, ticket.createdById].some(id => Number(id) === Number(user?.id)));
  if (!allowed && !snapshot) return null;
  const cancel = async () => {
    if (!snapshot || !reason.trim() || saving) return;
    setSaving(true);
    try {
      const result = await ticketsApi.cancel(ticket.id, reason.trim(), snapshot);
      setSnapshot(null);
      enqueueSnackbar(result.queueHandoffPending ? 'Ticket cancelled. The assignee queue needs staff attention.' : 'Ticket cancelled.', { variant: result.queueHandoffPending ? 'warning' : 'success' });
      onCancelled();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Cancellation could not be completed.', { variant: 'error' });
      if (error.response?.status === 409) onCancelled();
    } finally { setSaving(false); }
  };
  return <span onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
    {allowed && <Button size="small" color="error" variant="outlined" onClick={() => { setReason(''); setSnapshot(ticket.updatedAt); }}>Cancel Ticket</Button>}
    <Dialog open={!!snapshot} onClose={() => { if (!saving) setSnapshot(null); }} fullWidth maxWidth="sm">
      <DialogTitle>Cancel {ticket.ticketNumber}?</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>This ends the request without resolving it. The ticket and its history will be retained. Cancellation cannot be undone.</Alert>
        <TextField autoFocus required fullWidth multiline minRows={3} label="Reason for cancellation"
          value={reason} onChange={event => setReason(event.target.value)} disabled={saving}
          inputProps={{ maxLength: 1500 }} helperText={`${reason.length}/1500 characters`} />
      </DialogContent>
      <DialogActions>
        <Button disabled={saving} onClick={() => setSnapshot(null)}>Keep Ticket</Button>
        <Button color="error" variant="contained" disabled={saving || !reason.trim() || !allowed} onClick={() => void cancel()}>{saving ? 'Cancelling…' : 'Confirm Cancellation'}</Button>
      </DialogActions>
    </Dialog>
  </span>;
}
