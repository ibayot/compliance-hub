import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import { feedbackApi } from '@/lib/api/feedback';

interface FeedbackModalProps {
  manualOpen?: boolean;
  onManualClose?: () => void;
}

export default function FeedbackModal({ manualOpen = false, onManualClose }: FeedbackModalProps) {
  const [autoOpen, setAutoOpen] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const checkAndShow = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const timeInMinutes = hours * 60 + minutes;
      
      // 7:30 AM is 450 minutes, 6:30 PM is 1110 minutes
      if (timeInMinutes >= 450 && timeInMinutes <= 1110) {
        const lastShown = localStorage.getItem('lastFeedbackShown');
        if (!lastShown || now.getTime() - parseInt(lastShown, 10) > 60 * 60 * 1000) {
          setAutoOpen(true);
          localStorage.setItem('lastFeedbackShown', now.getTime().toString());
        }
      }
    };

    // Initial check
    checkAndShow();

    // Check every 5 minutes
    const interval = setInterval(checkAndShow, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const open = manualOpen || autoOpen;

  const handleClose = () => {
    if (manualOpen && onManualClose) onManualClose();
    if (autoOpen) setAutoOpen(false);
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
          We are always looking for ways to improve our service. Do you have any suggestions or feedback?
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
        <Button onClick={handleClose} disabled={submitting}>Close</Button>
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
