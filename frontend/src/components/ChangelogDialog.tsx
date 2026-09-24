import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { AppRelease } from '@/lib/api/changelog';

const CATEGORY_GROUPS = [
  { value: 'feature', label: 'FEATURE', color: 'success' },
  { value: 'enhancement', label: 'ENHANCEMENT', color: 'primary' },
  { value: 'bug_fix', label: 'BUG FIX', color: 'error' },
] as const;

export default function ChangelogDialog({
  open,
  releases,
  onClose,
  onAcknowledge,
  manual = false,
}: {
  open: boolean;
  releases: AppRelease[];
  onClose: () => void;
  onAcknowledge: () => void;
  manual?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{manual ? "What's New" : "What's New in Compliance Hub"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          {releases.length ? (
            releases.map((r) => (
              <Stack key={r.id} spacing={1}>
                <Typography variant="h6">
                  v{r.version} — {r.title}
                </Typography>
                {CATEGORY_GROUPS.map((group) => {
                  const notes = r.notes.filter((note) => note.category === group.value);
                  if (!notes.length) return null;
                  return (
                    <Stack key={group.value} spacing={1}>
                      <Chip
                        size="small"
                        sx={{ alignSelf: 'flex-start' }}
                        color={group.color}
                        label={group.label}
                      />
                      {notes.map((note) => (
                        <Stack key={note.id} spacing={0.5}>
                          <Typography fontWeight={700}>{note.title}</Typography>
                          <Typography whiteSpace="pre-wrap">{note.description}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  );
                })}
                <Divider />
              </Stack>
            ))
          ) : (
            <Typography color="text.secondary">No applicable release notes yet.</Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {!manual && releases.length > 0 && (
          <Button variant="contained" onClick={onAcknowledge}>
            Got it
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
