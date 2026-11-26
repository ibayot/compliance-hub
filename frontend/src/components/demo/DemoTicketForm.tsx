import { useState } from 'react';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DemoTicket, DemoTicketSummary, demoSupportTypes } from '@/lib/api/demo';

type Props = {
  proxy: boolean;
  submit: (subject: string, description: string, type: DemoTicketSummary['supportType']) => Promise<DemoTicket>;
  onSuccess: (ticket: DemoTicket) => void;
  onCancel: () => void;
};

export default function DemoTicketForm({ proxy, submit, onSuccess, onCancel }: Props) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [supportType, setSupportType] = useState<DemoTicketSummary['supportType']>('IT Support');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  return (
    <Stack component="form" spacing={2} onSubmit={async event => {
      event.preventDefault();
      if (saving) return;
      setSaving(true);
      setError('');
      try {
        onSuccess(await submit(subject, description, supportType));
      } catch {
        setError('Could not file the demo ticket. Check the fields and confirm the demo is still active.');
      } finally {
        setSaving(false);
      }
    }}>
      {proxy && <Typography variant="body2">Requested for Demo User · Assigned to Demo Technician</Typography>}
      {error && <Alert severity="error">{error}</Alert>}
      <TextField label="Subject" value={subject} onChange={event => setSubject(event.target.value)} required inputProps={{ maxLength: 255 }} />
      <TextField select label="Support Type" value={supportType} onChange={event => setSupportType(event.target.value as typeof supportType)}>
        {demoSupportTypes.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
      </TextField>
      <TextField label="Description" value={description} onChange={event => setDescription(event.target.value)} required multiline minRows={3} inputProps={{ maxLength: 12000 }} />
      <Stack direction="row" justifyContent="flex-end" gap={1}>
        <Button disabled={saving} onClick={onCancel}>Cancel</Button>
        <Button disabled={saving || !subject.trim() || !description.trim()} type="submit" variant="contained">Submit Demo Ticket</Button>
      </Stack>
    </Stack>
  );
}
