'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  SentimentDissatisfied,
  SentimentNeutral,
  SentimentSatisfied,
  SentimentVeryDissatisfied,
  SentimentVerySatisfied,
} from '@mui/icons-material';
import type { CsatFormData } from '@/app/api/references';
import { publicRatingApi, PublicRatingSession, PublicRatingTicket } from '@/lib/api/public-rating';

const QUALITY_ITEMS = [
  'I am satisfied with the service that I availed.',
  'I spent a reasonable amount of time for my transaction.',
  "The office followed the transaction's requirements and steps based on the information provided.",
  'The steps I needed to complete for my transaction were easy and simple.',
  'I easily found information about my transaction from the office or its website.',
  'I paid a reasonable amount of fees for my transaction. (If the service was free, this is not applicable.)',
  'I feel the office was fair to everyone during my transaction.',
  'I was treated courteously by the staff, and the staff was helpful when I asked for assistance.',
  'I received what I needed, or a denied request was sufficiently explained to me.',
];

const manilaDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Not recorded';

const transactionDate = (ticket: PublicRatingTicket) =>
  new Date(ticket.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

function createForm(session: PublicRatingSession, ticket: PublicRatingTicket): CsatFormData {
  return {
    consentGiven: false,
    unitSection: session.recipient.unitSection,
    dateOfTransaction: transactionDate(ticket),
    clientFirstName: session.recipient.firstName,
    clientMiddleInitial: session.recipient.middleInitial,
    clientLastName: session.recipient.lastName,
    suffix: session.recipient.suffix,
    religion: '',
    sex: '',
    contactNumber: '',
    technicianName: ticket.technicianName,
    likert: [0, 0, 0, 'NA', 0, 'NA', 0, 0, 'NA'],
  };
}

export default function PublicRatingPage() {
  const { token } = useParams<{ token?: string }>();
  const [phase, setPhase] = useState<'loading' | 'verify' | 'ready' | 'error' | 'complete'>(
    'loading',
  );
  const [message, setMessage] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<PublicRatingSession | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<PublicRatingTicket | null>(null);
  const [form, setForm] = useState<CsatFormData | null>(null);

  const loadSession = useCallback(async () => {
    const loaded = await publicRatingApi.getSession();
    setSession(loaded);
    setPhase('ready');
    if (window.location.pathname !== '/rate') {
      window.history.replaceState({}, document.title, '/rate');
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        await loadSession();
        return;
      } catch {
        // A new invitation starts mailbox verification below.
      }
      if (!token) {
        if (active) {
          setMessage('Open the current feedback invitation from your email to continue.');
          setPhase('error');
        }
        return;
      }
      try {
        await publicRatingApi.getStatus(token);
        if (active) setPhase('verify');
      } catch (error: any) {
        if (active) {
          setMessage(error?.message || 'This feedback invitation is invalid or unavailable.');
          setPhase('error');
        }
      }
    };
    void initialize();
    return () => {
      active = false;
    };
  }, [loadSession, token]);

  const requestCode = async () => {
    if (!token) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await publicRatingApi.requestCode(token);
      setCodeRequested(true);
      setMessage(result.message);
    } catch (error: any) {
      setMessage(error?.message || 'The verification code could not be sent.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!token || !/^\d{6}$/.test(code)) {
      setMessage('Enter the six-digit code sent to the invitation recipient.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await publicRatingApi.verify(token, code);
      await loadSession();
    } catch (error: any) {
      setMessage(error?.message || 'Verification failed.');
    } finally {
      setBusy(false);
    }
  };

  const openRating = (ticket: PublicRatingTicket) => {
    if (!session || ticket.ratingStatus !== 'eligible') return;
    setSelectedTicket(ticket);
    setForm(createForm(session, ticket));
    setMessage('');
  };

  const unanswered = useMemo(
    () => form?.likert.some((value, index) => ![3, 5, 8].includes(index) && value === 0) ?? true,
    [form],
  );

  const submitRating = async () => {
    if (!selectedTicket || !form) return;
    if (!form.consentGiven) return setMessage('Consent is required to submit feedback.');
    if (!form.unitSection.trim()) return setMessage('Unit/Section is required.');
    if (!form.clientFirstName.trim() || !form.clientLastName.trim())
      return setMessage('First and last name are required.');
    if (!form.sex) return setMessage('Sex is required.');
    if (!/^\d{10}$/.test(form.contactNumber || ''))
      return setMessage('Contact number must contain exactly 10 digits after +63.');
    if (unanswered) return setMessage('Please answer every applicable service quality item.');
    setBusy(true);
    setMessage('');
    try {
      const result = await publicRatingApi.submit(selectedTicket.id, { formData: form });
      setSelectedTicket(null);
      setForm(null);
      if (result.invitationCompleted) {
        setPhase('complete');
        setSession(null);
      } else {
        await loadSession();
        setMessage('Thank you. Your feedback was recorded.');
      }
    } catch (error: any) {
      setMessage(error?.message || 'Feedback could not be submitted.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f7fb', py: { xs: 2, md: 5 } }}>
      <Container maxWidth="md">
        <Card sx={{ mb: 2, borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                component="img"
                src="/images/logos/dswd-logo.png"
                alt="DSWD"
                sx={{ height: 52 }}
              />
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  Service Feedback
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  A restricted form for completed service requests
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {phase === 'loading' && (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <CircularProgress />
            </CardContent>
          </Card>
        )}
        {phase === 'error' && <Alert severity="warning">{message}</Alert>}
        {phase === 'complete' && (
          <Alert severity="success">
            Thank you. Feedback has been submitted for every request in this invitation. You may
            close this browser tab.
          </Alert>
        )}

        {phase === 'verify' && (
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Verify the invitation recipient
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                The link alone does not reveal ticket information. Request a one-time code, then
                enter the code sent to the intended recipient&apos;s registered email address.
              </Typography>
              {message && (
                <Alert severity={codeRequested ? 'info' : 'warning'} sx={{ mb: 2 }}>
                  {message}
                </Alert>
              )}
              {!codeRequested ? (
                <Button variant="contained" onClick={requestCode} disabled={busy}>
                  {busy ? 'Sending...' : 'Send Verification Code'}
                </Button>
              ) : (
                <Stack spacing={2}>
                  <TextField
                    label="Six-digit verification code"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputProps={{ inputMode: 'numeric', autoComplete: 'one-time-code' }}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      onClick={verify}
                      disabled={busy || code.length !== 6}
                    >
                      {busy ? 'Verifying...' : 'Verify and Continue'}
                    </Button>
                    <Button onClick={requestCode} disabled={busy}>
                      Send Another Code
                    </Button>
                  </Stack>
                </Stack>
              )}
            </CardContent>
          </Card>
        )}

        {phase === 'ready' && session && (
          <Stack spacing={2}>
            {message && <Alert severity="success">{message}</Alert>}
            <Alert severity="info">
              This page lists only completed requests included when the invitation was sent. The
              invitation expires on{' '}
              {new Date(session.expiresAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}.
            </Alert>
            {session.tickets.map((ticket) => (
              <Card key={ticket.id} sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    gap={1}
                  >
                    <Box>
                      <Typography variant="overline" color="primary.main">
                        {ticket.ticketNumber}
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {ticket.subject}
                      </Typography>
                    </Box>
                    <Chip
                      label={
                        ticket.ratingStatus === 'rated' ? 'Feedback submitted' : 'Awaiting feedback'
                      }
                      color={ticket.ratingStatus === 'rated' ? 'success' : 'warning'}
                      size="small"
                    />
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                    {ticket.description}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={0.5}>
                    <Typography variant="body2">
                      <strong>Technician:</strong> {ticket.technicianName}
                    </Typography>
                    {ticket.categoryName && (
                      <Typography variant="body2">
                        <strong>Category:</strong> {ticket.categoryName}
                      </Typography>
                    )}
                    {ticket.issueName && (
                      <Typography variant="body2">
                        <strong>Issue:</strong> {ticket.issueName}
                      </Typography>
                    )}
                    <Typography variant="body2">
                      <strong>Requested:</strong> {manilaDate(ticket.createdAt)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Resolved:</strong> {manilaDate(ticket.resolvedAt)}
                    </Typography>
                    {ticket.ratingStatus === 'rated' && ticket.rating != null && (
                      <Typography variant="body2">
                        <strong>Recorded rating:</strong> {ticket.rating}/5
                      </Typography>
                    )}
                  </Stack>
                  {ticket.ratingStatus === 'eligible' && (
                    <Button variant="contained" sx={{ mt: 2 }} onClick={() => openRating(ticket)}>
                      Rate This Service
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Container>

      <Dialog
        open={Boolean(selectedTicket && form)}
        onClose={() => !busy && setSelectedTicket(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Client Satisfaction Measurement Form
          <Typography variant="body2" color="text.secondary">
            {selectedTicket?.ticketNumber}
          </Typography>
        </DialogTitle>
        {form && (
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {message && <Alert severity="warning">{message}</Alert>}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.consentGiven}
                    onChange={(event) => setForm({ ...form, consentGiven: event.target.checked })}
                  />
                }
                label="I voluntarily consent to the use of this information solely to improve DSWD services. *"
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Unit/Section *"
                  value={form.unitSection}
                  onChange={(event) => setForm({ ...form, unitSection: event.target.value })}
                  fullWidth
                />
                <TextField
                  label="Date of Transaction *"
                  type="date"
                  value={form.dateOfTransaction}
                  InputProps={{ readOnly: true }}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="First Name *"
                  value={form.clientFirstName}
                  InputProps={{ readOnly: Boolean(session?.recipient.firstName) }}
                  onChange={(event) => setForm({ ...form, clientFirstName: event.target.value })}
                  fullWidth
                />
                <TextField
                  label="M.I."
                  value={form.clientMiddleInitial || ''}
                  InputProps={{ readOnly: Boolean(session?.recipient.middleInitial) }}
                  onChange={(event) =>
                    setForm({ ...form, clientMiddleInitial: event.target.value.slice(0, 1) })
                  }
                  sx={{ width: { sm: 120 } }}
                />
                <TextField
                  label="Last Name *"
                  value={form.clientLastName}
                  InputProps={{ readOnly: Boolean(session?.recipient.lastName) }}
                  onChange={(event) => setForm({ ...form, clientLastName: event.target.value })}
                  fullWidth
                />
                <TextField
                  label="Suffix"
                  value={form.suffix || ''}
                  InputProps={{ readOnly: Boolean(session?.recipient.suffix) }}
                  onChange={(event) => setForm({ ...form, suffix: event.target.value })}
                  sx={{ width: { sm: 150 } }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Age"
                  type="number"
                  inputProps={{ min: 0, max: 120 }}
                  value={form.age ?? ''}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      age: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                />
                <TextField
                  label="Religion"
                  value={form.religion || ''}
                  onChange={(event) => setForm({ ...form, religion: event.target.value })}
                  fullWidth
                />
                <TextField
                  select
                  label="Sex *"
                  value={form.sex}
                  onChange={(event) => setForm({ ...form, sex: event.target.value })}
                  sx={{ minWidth: 150 }}
                >
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                  <MenuItem value="Prefer Not to Say">Prefer Not to Say</MenuItem>
                </TextField>
                <TextField
                  label="Contact Number *"
                  value={form.contactNumber || ''}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      contactNumber: event.target.value.replace(/\D/g, '').slice(0, 10),
                    })
                  }
                  InputProps={{
                    startAdornment: <InputAdornment position="start">+63</InputAdornment>,
                  }}
                  inputProps={{ inputMode: 'numeric' }}
                  fullWidth
                />
              </Stack>
              <TextField
                label="Technician Name *"
                value={form.technicianName}
                InputProps={{ readOnly: true }}
                fullWidth
              />
              <Typography variant="subtitle2" fontWeight={700}>
                Service Quality Ratings *
              </Typography>
              <Typography variant="caption" color="text.secondary">
                5 — Strongly Agree, 4 — Agree, 3 — Neither Agree nor Disagree, 2 — Disagree, 1 —
                Strongly Disagree
              </Typography>
              {QUALITY_ITEMS.map((item, index) => {
                const notApplicable = [3, 5, 8].includes(index);
                const value = form.likert[index];
                return (
                  <Box
                    key={item}
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { sm: 'center' },
                      gap: 1,
                    }}
                  >
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {index}. {item}
                    </Typography>
                    {notApplicable ? (
                      <Chip size="small" label="N/A" />
                    ) : (
                      <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={value === 0 ? null : value}
                        onChange={(_, next) => {
                          if (next === null) return;
                          const likert = [...form.likert] as Array<number | 'NA'>;
                          likert[index] = next;
                          setForm({ ...form, likert });
                        }}
                      >
                        <ToggleButton value={1}>
                          <SentimentVeryDissatisfied color={value === 1 ? 'error' : 'disabled'} />
                        </ToggleButton>
                        <ToggleButton value={2}>
                          <SentimentDissatisfied color={value === 2 ? 'warning' : 'disabled'} />
                        </ToggleButton>
                        <ToggleButton value={3}>
                          <SentimentNeutral color={value === 3 ? 'warning' : 'disabled'} />
                        </ToggleButton>
                        <ToggleButton value={4}>
                          <SentimentSatisfied color={value === 4 ? 'success' : 'disabled'} />
                        </ToggleButton>
                        <ToggleButton value={5}>
                          <SentimentVerySatisfied color={value === 5 ? 'primary' : 'disabled'} />
                        </ToggleButton>
                      </ToggleButtonGroup>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setSelectedTicket(null)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={submitRating} disabled={busy || !form?.consentGiven}>
            {busy ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
