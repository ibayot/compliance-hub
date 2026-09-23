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
                {r.notes.map((n) => (
                  <Stack key={n.id} spacing={0.5}>
                    <Chip
                      size="small"
                      sx={{ alignSelf: 'flex-start' }}
                      color={
                        n.category === 'bug_fix'
                          ? 'error'
                          : n.category === 'enhancement'
                            ? 'primary'
                            : 'success'
                      }
                      label={n.category.replace('_', ' ').toUpperCase()}
                    />
                    <Typography fontWeight={700}>{n.title}</Typography>
                    <Typography whiteSpace="pre-wrap">{n.description}</Typography>
                  </Stack>
                ))}
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
