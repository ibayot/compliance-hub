import {
  Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent,
  DialogTitle, Grid, LinearProgress, Typography,
} from '@mui/material';
import {
  Cancel as ClosedIcon, CheckCircleOutline as ResolvedIcon, ConfirmationNumber as TicketIcon,
  PendingActions as PendingIcon, Star as StarIcon,
} from '@mui/icons-material';

type Props = {
  name: string;
  s?: { open: number; inProgress: number; resolved: number; closed: number; satisfactionFillRate: number } | null;
  pendingCount: number;
  reminderOpen: boolean;
  onDismissReminder: () => void;
  openTickets: () => void;
  openPendingTickets: () => void;
};

export default function RequesterDashboard({
  name, s, pendingCount, reminderOpen, onDismissReminder, openTickets, openPendingTickets,
}: Props) {
  const fillRate = s?.satisfactionFillRate ?? 0;
  return (
    <Box>
      <Dialog
        open={reminderOpen}
        onClose={onDismissReminder}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Pending Satisfaction Reminder</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            You have {pendingCount} resolved/closed ticket{pendingCount > 1 ? 's' : ''} awaiting
            your satisfaction rating. Please rate these tickets before opening a new request.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onDismissReminder}>Close</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => {
              onDismissReminder();
              openPendingTickets();
            }}
          >
            Rate Now
          </Button>
        </DialogActions>
      </Dialog>

      {/* Page Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {name}!
        </Typography>
      </Box>

      {/* Ticket Counts */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TicketIcon color="warning" fontSize="large" />
              <Typography variant="h4" color="warning.main" mt={1}>
                {s?.open ?? 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Open
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PendingIcon color="info" fontSize="large" />
              <Typography variant="h4" color="info.main" mt={1}>
                {s?.inProgress ?? 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ResolvedIcon color="success" fontSize="large" />
              <Typography variant="h4" color="success.main" mt={1}>
                {s?.resolved ?? 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Resolved
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ClosedIcon color="action" fontSize="large" />
              <Typography variant="h4" color="text.secondary" mt={1}>
                {s?.closed ?? 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Closed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Satisfaction Fill Rate */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <StarIcon color="warning" />
            <Typography variant="h6">Client Satisfaction</Typography>
          </Box>
          <Box mb={1}>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" color="text.secondary">
                Satisfaction forms filled
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {fillRate.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(fillRate, 100)}
              color={fillRate >= 80 ? 'success' : fillRate >= 50 ? 'warning' : 'error'}
              sx={{ height: 10, borderRadius: 5 }}
            />
          </Box>
          {pendingCount > 0 && (
            <Box mt={2} display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                {pendingCount} resolved ticket{pendingCount > 1 ? 's' : ''} awaiting your
                satisfaction rating
              </Typography>
              <Button
                variant="contained"
                size="small"
                color="warning"
                startIcon={<StarIcon />}
                onClick={() => openPendingTickets()}
              >
                Rate Now
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<TicketIcon />}
              onClick={() => openTickets()}
            >
              My Tickets
            </Button>
            {pendingCount > 0 && (
              <Button
                variant="outlined"
                fullWidth
                color="warning"
                startIcon={<StarIcon />}
                onClick={() => openPendingTickets()}
              >
                Fill Client Satisfaction ({pendingCount})
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
