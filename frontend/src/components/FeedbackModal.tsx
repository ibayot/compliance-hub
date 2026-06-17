import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { feedbackApi } from '@/lib/api/feedback';

interface FeedbackModalProps {
  manualOpen?: boolean;
  onManualClose?: () => void;
}

export default function FeedbackModal({ manualOpen = false, onManualClose }: FeedbackModalProps) {
  const [suggestion, setSuggestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const open = manualOpen;

  const handleClose = () => {
    if (manualOpen && onManualClose) onManualClose();
    setSuggestion('');
  };

  const handleSubmit = async () => {
    if (!suggestion.trim()) return;
    try {
      setSubmitting(true);
      await feedbackApi.create({ suggestion });
      enqueueSnackbar('Thank you for your feedback!', { variant: 'success' });
      handleClose();
    } catch (err: any) {
      enqueueSnackbar('Failed to submit feedback.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Help Us Improve</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" mb={2}>
          We are always looking for ways to improve our service. Do you have any suggestions or
          feedback?
        </Typography>
        <TextField
          label="Your Suggestion"
          multiline
          rows={4}
          fullWidth
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          placeholder="I would like to see a feature that..."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Close
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!suggestion.trim() || submitting}
          startIcon={submitting ? <CircularProgress size={20} /> : undefined}
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
