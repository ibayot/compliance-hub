import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Box,
  IconButton,
  Stack,
} from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { useSnackbar } from 'notistack';
import { feedbackApi } from '@/lib/api/feedback';

interface FeedbackModalProps {
  manualOpen?: boolean;
  onManualClose?: () => void;
}

export default function FeedbackModal({ manualOpen = false, onManualClose }: FeedbackModalProps) {
  const [suggestion, setSuggestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const { enqueueSnackbar } = useSnackbar();

  const open = manualOpen;
  const previews = useMemo(
    () => images.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [images],
  );

  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);

  const addImages = (incoming: File[]) => {
    const valid = incoming.filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type));
    if (valid.length !== incoming.length) {
      enqueueSnackbar('Only JPEG, PNG, and WebP images can be attached.', { variant: 'warning' });
    }
    const oversized = valid.some((file) => file.size > 5 * 1024 * 1024);
    if (oversized) enqueueSnackbar('Each image must be 5 MB or smaller.', { variant: 'warning' });
    setImages((current) => {
      const accepted = valid.filter((file) => file.size <= 5 * 1024 * 1024);
      const combined = [...current, ...accepted].slice(0, 5);
      if (current.length + accepted.length > 5) {
        enqueueSnackbar('A suggestion may contain up to 5 images.', { variant: 'warning' });
      }
      return combined;
    });
  };

  const handleClose = () => {
    if (manualOpen && onManualClose) onManualClose();
    setSuggestion('');
    setImages([]);
  };

  const handleSubmit = async () => {
    if (!suggestion.trim()) return;
    try {
      setSubmitting(true);
      const created = await feedbackApi.create({ suggestion: suggestion.trim() });
      if (images.length) {
        try {
          await feedbackApi.uploadAttachments(created.id, images);
        } catch (uploadError: any) {
          enqueueSnackbar(
            uploadError.response?.data?.message ||
              'Your suggestion was saved, but its images could not be uploaded.',
            { variant: 'warning' },
          );
          handleClose();
          return;
        }
      }
      enqueueSnackbar('Thank you for your feedback!', { variant: 'success' });
      handleClose();
    } catch (err: any) {
      enqueueSnackbar('Failed to submit feedback.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !submitting && handleClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Help Us Improve</DialogTitle>
      <DialogContent
        dividers
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addImages(Array.from(event.dataTransfer.files));
        }}
        onPaste={(event) => {
          const pasted = Array.from(event.clipboardData.files);
          if (pasted.length) addImages(pasted);
        }}
      >
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
        <Stack direction="row" spacing={1} alignItems="center" mt={2}>
          <Button component="label" startIcon={<AddPhotoAlternateOutlinedIcon />}>
            Add images
            <input
              hidden
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => {
                addImages(Array.from(event.target.files || []));
                event.target.value = '';
              }}
            />
          </Button>
          <Typography variant="caption" color="text.secondary">
            Up to 5 images. You may also drag, drop, or paste from the clipboard.
          </Typography>
        </Stack>
        {previews.length > 0 && (
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" mt={1}>
            {previews.map((preview, index) => (
              <Box key={`${preview.file.name}-${preview.file.lastModified}-${index}`} position="relative">
                <Box
                  component="img"
                  src={preview.url}
                  alt={`Suggestion attachment ${index + 1}`}
                  sx={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 1, border: 1, borderColor: 'divider' }}
                />
                <IconButton
                  size="small"
                  aria-label={`Remove image ${index + 1}`}
                  onClick={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper', boxShadow: 1 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        )}
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
