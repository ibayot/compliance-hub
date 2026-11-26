import { useId } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  Alert, Autocomplete, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, InputAdornment, MenuItem, Stack, TextField,
  ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import {
  SentimentVerySatisfied, SentimentSatisfied, SentimentNeutral,
  SentimentDissatisfied, SentimentVeryDissatisfied,
} from '@mui/icons-material';
import type { CsatFormData } from '@/app/api/references';
import type { User } from '@/lib/types/auth';
import { populatedFieldSx } from '@/lib/utils/populated-field-sx';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  ticketNumber: string;
  submitted: boolean;
  form: CsatFormData;
  setForm: Dispatch<SetStateAction<CsatFormData>>;
  unitSuggestions: string[];
  profile?: Pick<User, 'firstName' | 'middleName' | 'lastName' | 'suffix' | 'sex' | 'phoneNumber'> | null;
  submitting: boolean;
  demo?: boolean;
  error?: string;
};

export function satisfactionFormError(form: CsatFormData): string | undefined {
  if (!form.consentGiven) return 'Please provide consent before submitting.';
  if (!form.unitSection.trim()) return 'Unit/Section is required.';
  if (!form.clientFirstName.trim() || !form.clientLastName.trim()) return 'Client name is required.';
  if (!form.sex) return 'Sex is required.';
  const contact = form.contactNumber?.trim() ?? '';
  if (!contact) return 'Contact number is required.';
  if (!/^\d{10}$/.test(contact)) return 'Contact number must contain exactly 10 digits.';
  if (form.likert.filter((_, i) => ![3, 5, 8].includes(i)).some(value => value === 0)) {
    return 'Please rate all applicable items.';
  }
}

export default function ClientSatisfactionDialog({
  open, onClose, onSubmit, ticketNumber, submitted, form, setForm, unitSuggestions, profile, submitting, demo, error,
}: Props) {
  const titleId = useId();
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby={titleId} maxWidth="md" fullWidth>
      <DialogTitle id={titleId} sx={{ fontWeight: 700, textAlign: 'center', pb: 0 }}>
        CLIENT SATISFACTION MEASUREMENT FORM
        <Typography variant="body2" color="text.secondary" fontWeight={400} mt={0.5}>
          Ticket: <strong>{ticketNumber}</strong>
        </Typography>
      </DialogTitle>
      <DialogContent>
        {demo && <Alert severity="info" sx={{ mt: 1 }}>Use sample details for this demo. Only the average score is saved.</Alert>}
        {submitted ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            You have already submitted a satisfaction rating for this ticket. Thank you!
          </Alert>
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.consentGiven}
                  onChange={(e) => setForm((f) => ({ ...f, consentGiven: e.target.checked }))}
                />
              }
              label={
                <Typography variant="body2">
                  I voluntarily give my consent for the use of my personal information. I confirm
                  that I have read the provided information, or it has been read to me. I have had
                  the opportunity to ask questions about it, and any inquiries I made were
                  answered to my satisfaction. I understand that any information collected will be
                  utilized solely to enhance the basic social services provided by the DSWD. *
                </Typography>
              }
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Autocomplete
                options={unitSuggestions}
                fullWidth
                value={form.unitSection || null}
                onChange={(_, value) =>
                  setForm((form) => ({ ...form, unitSection: value || '' }))
                }
                renderInput={(params) => <TextField {...params} label="Unit/Section *" />}
              />
              <TextField
                label="Date of Transaction *"
                type="date"
                value={form.dateOfTransaction}
                InputProps={{ readOnly: true }}
                disabled
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={populatedFieldSx(true)}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="First Name *"
                disabled={!!profile?.firstName}
                value={form.clientFirstName}
                onChange={(e) => setForm((f) => ({ ...f, clientFirstName: e.target.value }))}
                fullWidth
                sx={populatedFieldSx(!!profile?.firstName)}
              />
              <TextField
                label="M.I."
                disabled={!!profile?.middleName}
                value={form.clientMiddleInitial}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    clientMiddleInitial: e.target.value.substring(0, 1),
                  }))
                }
                sx={{ width: 140, ...populatedFieldSx(!!profile?.middleName) }}
              />
              <TextField
                label="Last Name *"
                disabled={!!profile?.lastName}
                value={form.clientLastName}
                onChange={(e) => setForm((f) => ({ ...f, clientLastName: e.target.value }))}
                fullWidth
                sx={populatedFieldSx(!!profile?.lastName)}
              />
              <TextField
                label="Suffix"
                disabled={!!profile?.suffix}
                value={form.suffix}
                onChange={(e) => setForm((f) => ({ ...f, suffix: e.target.value }))}
                sx={{ width: 180, ...populatedFieldSx(!!profile?.suffix) }}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Age"
                type="number"
                inputProps={{ min: 20, max: 89 }}
                value={form.age ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, age: Number(e.target.value) }))}
                sx={{ maxWidth: 200 }}
              />
              <TextField
                label="Religion"
                value={form.religion ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, religion: e.target.value }))}
                sx={{ flex: 1 }}
              />
              <TextField
                inputProps={{ maxLength: 255 }}
                select
                label="Sex *"
                disabled={!!profile?.sex}
                value={form.sex}
                onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}
                sx={{ minWidth: 120, ...populatedFieldSx(!!profile?.sex) }}
              >
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
                <MenuItem value="Prefer Not to Say">Prefer Not to Say</MenuItem>
              </TextField>
              <TextField
                label="Contact Number *"
                disabled={!!profile?.phoneNumber}
                value={form.contactNumber ?? ''}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setForm((f) => ({ ...f, contactNumber: digits }));
                }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">+63</InputAdornment>,
                }}
                inputProps={{ inputMode: 'numeric' }}
                sx={{ flex: 1, ...populatedFieldSx(!!profile?.phoneNumber) }}
              />
            </Stack>
            <TextField
              label="Technician Name *"
              value={form.technicianName}
              InputProps={{ readOnly: true }}
              disabled
              // fullWidth
            />

            <Typography variant="subtitle2" fontWeight={700} mt={1}>
              SERVICE QUALITY RATINGS *
            </Typography>
            <Typography variant="body2">
              For Service Quality Dimension 0-8, please select the number that best corresponds to
              your answer.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {' '}
              5-Strongly Agree, 4-Agree, 3-Neither Agree nor Disagree, 2-Disagree, 1-Strongly
              Disagree, N/A-Not Applicable
            </Typography>

            {(
              [
                'I am satisfied with the service that I availed.',
                'I spent a reasonable amount of time for my transaction.',
                "The office followed the transaction's requirements and steps based on the information provided",
                'The steps (including payment) I need to do for my transaction were easy and simple.',
                'I easily found information about my transaction from the office or its website.',
                "I paid a reasonable amount of fees for my transaction. (If services was free, mark the 'N/A' column) (You may skip this).",
                'I feel the office was fair to everyone, or "walang palakasan", during my transaction.',
                'I was treated courteously by the staff, and (if asked for help) the staff was helpful.',
                'I got what I needed from the government office, or (if denied) denial of request was sufficiently explained to me.',
              ] as string[]
            ).map((item, idx) => {
              const isNA = [3, 5, 8].includes(idx);
              const val = form.likert[idx];
              return (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ flex: 1, minWidth: 0, mb: { xs: 1, sm: 0 } }}>
                    {idx}. {item}
                  </Typography>
                  {isNA ? (
                    <Chip
                      size="small"
                      label="N/A"
                      color="default"
                      sx={{ minWidth: 64, alignSelf: { xs: 'flex-start', sm: 'auto' } }}
                    />
                  ) : (
                    <ToggleButtonGroup
                      aria-label={`Service quality question ${idx}`}
                      exclusive
                      size="small"
                      value={val === 0 ? null : val}
                      sx={{ alignSelf: { xs: 'center', sm: 'auto' } }}
                      onChange={(_, v) => {
                        if (v !== null) {
                          const updated = [...form.likert] as Array<number | 'NA'>;
                          updated[idx] = v as number;
                          setForm((f) => ({ ...f, likert: updated }));
                        }
                      }}
                    >
                      <ToggleButton
                        value={1}
                        aria-label="Very dissatisfied (1)"
                        sx={{
                          px: 0.5,
                          border: 'none',
                          '&.Mui-selected': { bgcolor: 'transparent' },
                        }}
                      >
                        <SentimentVeryDissatisfied
                          sx={{ color: val === 1 ? 'error.main' : 'action.disabled', fontSize: 28 }}
                        />
                      </ToggleButton>
                      <ToggleButton
                        value={2}
                        aria-label="Dissatisfied (2)"
                        sx={{
                          px: 0.5,
                          border: 'none',
                          '&.Mui-selected': { bgcolor: 'transparent' },
                        }}
                      >
                        <SentimentDissatisfied
                          sx={{ color: val === 2 ? 'warning.main' : 'action.disabled', fontSize: 28 }}
                        />
                      </ToggleButton>
                      <ToggleButton
                        value={3}
                        aria-label="Neutral (3)"
                        sx={{
                          px: 0.5,
                          border: 'none',
                          '&.Mui-selected': { bgcolor: 'transparent' },
                        }}
                      >
                        <SentimentNeutral
                          sx={{ color: val === 3 ? 'warning.dark' : 'action.disabled', fontSize: 28 }}
                        />
                      </ToggleButton>
                      <ToggleButton
                        value={4}
                        aria-label="Satisfied (4)"
                        sx={{
                          px: 0.5,
                          border: 'none',
                          '&.Mui-selected': { bgcolor: 'transparent' },
                        }}
                      >
                        <SentimentSatisfied
                          sx={{ color: val === 4 ? 'success.main' : 'action.disabled', fontSize: 28 }}
                        />
                      </ToggleButton>
                      <ToggleButton
                        value={5}
                        aria-label="Very satisfied (5)"
                        sx={{
                          px: 0.5,
                          border: 'none',
                          '&.Mui-selected': { bgcolor: 'transparent' },
                        }}
                      >
                        <SentimentVerySatisfied
                          sx={{ color: val === 5 ? 'primary.main' : 'action.disabled', fontSize: 28 }}
                        />
                      </ToggleButton>
                    </ToggleButtonGroup>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {!submitted && (
          <Button
            onClick={onSubmit}
            variant="contained"
            color="warning"
            disabled={submitting || !form.consentGiven}
          >
            {submitting ? 'Submitting…' : 'Submit Feedback'}
          </Button>
        )}
      </DialogActions>
    {error && <Alert severity="error" sx={{ mx: 2, mb: 1 }}>{error}</Alert>}
    </Dialog>
  );
}
