'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  MenuItem,
  Grid,
  FormControlLabel,
  Switch,
  CircularProgress,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/contexts/AuthContext';
import {
  ticketsApi,
  Ticket,
  TechnicianOption,
  UpdateTicketDto,
  SubmitSatisfactionDto,
} from '@/app/api/references';
import { ArrowBack as BackIcon, Star as StarIcon } from '@mui/icons-material';

const STATUS_OPTS = [
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const PRIORITY_COLOR: Record<string, 'error' | 'warning' | 'info' | 'success' | 'default'> = {
  urgent: 'error',
  high: 'error',
  medium: 'warning',
  low: 'info',
};

const STATUS_COLOR: Record<string, 'error' | 'warning' | 'info' | 'success' | 'default'> = {
  open: 'warning',
  assigned: 'info',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'default',
};

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const ticketId = params.id as string;
  const { enqueueSnackbar } = useSnackbar();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);

  // Comment form
  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Status/resolution update (staff)
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignToId, setAssignToId] = useState<number | ''>('');

  // Satisfaction dialog
  const [satDialogOpen, setSatDialogOpen] = useState(false);
  const [satRating, setSatRating] = useState<number | null>(null);
  const [satComment, setSatComment] = useState('');

  const isRegularUser = user?.role === 'user';
  const isTechnician = user?.role === 'technician_desktop' || user?.role === 'technician_it_support' || user?.role === 'technician';
  const isAdmin = user?.role === 'super_admin' || user?.role === 'focal' || user?.role === 'reviewer';
  const canStaff = isAdmin || isTechnician;
  const isRequester = ticket?.requesterId === (user as any)?.id;
  const canSatisfaction = isRequester && (ticket?.status === 'resolved' || ticket?.status === 'closed') && !ticket?.satisfactionRating;

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  useEffect(() => {
    if (canStaff) fetchTechnicians();
  }, [canStaff]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const data = await ticketsApi.getById(ticketId);
      setTicket(data);
      setNewStatus(data.status);
      setResolutionNotes(data.resolutionNotes || '');
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to fetch ticket', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const data = await ticketsApi.getTechnicians();
      setTechnicians(data || []);
    } catch { /* restricted */ }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    try {
      setSubmittingComment(true);
      await ticketsApi.addComment(ticketId, comment, isInternal && canStaff);
      setComment('');
      setIsInternal(false);
      fetchTicket();
      enqueueSnackbar('Comment added.', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to add comment', { variant: 'error' });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUpdateStatus = async () => {
    try {
      const payload: UpdateTicketDto = { status: newStatus as Ticket['status'] };
      if (resolutionNotes) payload.resolutionNotes = resolutionNotes;
      await ticketsApi.update(ticketId, payload);
      setEditingStatus(false);
      fetchTicket();
      enqueueSnackbar('Ticket updated.', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update ticket', { variant: 'error' });
    }
  };

  const handleAssign = async () => {
    if (!assignToId) return;
    try {
      await ticketsApi.assign(ticketId, Number(assignToId));
      setAssignDialogOpen(false);
      fetchTicket();
      enqueueSnackbar('Ticket assigned.', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to assign ticket', { variant: 'error' });
    }
  };

  const handleSubmitSatisfaction = async () => {
    if (!satRating) {
      enqueueSnackbar('Please select a rating.', { variant: 'warning' });
      return;
    }
    try {
      const payload: SubmitSatisfactionDto = { rating: satRating, comment: satComment || undefined };
      await ticketsApi.submitSatisfaction(ticketId, payload);
      setSatDialogOpen(false);
      fetchTicket();
      enqueueSnackbar('Thank you for your feedback!', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to submit satisfaction', { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box>
        <Typography color="error">Ticket not found</Typography>
        <Button startIcon={<BackIcon />} onClick={() => router.push('/dashboard/tickets')} sx={{ mt: 2 }}>
          Back to Tickets
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<BackIcon />} onClick={() => router.push('/dashboard/tickets')} sx={{ mb: 2 }}>
        Back to Tickets
      </Button>

      {/* ── Ticket Header ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
            <Box flexGrow={1}>
              <Typography variant="overline" color="text.secondary">
                {ticket.ticketNumber}
              </Typography>
              <Typography variant="h5" gutterBottom>
                {ticket.subject}
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                <Chip
                  label={ticket.ticketType === 'desktop_support' ? 'Desktop Support' : 'IT Support'}
                  color="primary"
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`Priority: ${ticket.priority.toUpperCase()}`}
                  color={PRIORITY_COLOR[ticket.priority] ?? 'default'}
                  size="small"
                />
                <Chip
                  label={ticket.status.replace('_', ' ').toUpperCase()}
                  color={STATUS_COLOR[ticket.status] ?? 'default'}
                  size="small"
                />
              </Box>
            </Box>

            {/* Actions */}
            <Box display="flex" flexDirection="column" gap={1} minWidth={160}>
              {canStaff && !editingStatus && (
                <Button variant="outlined" size="small" onClick={() => setEditingStatus(true)}>
                  Update Status
                </Button>
              )}
              {canStaff && (
                <Button variant="outlined" size="small" onClick={() => {
                  setAssignToId(ticket.assignedToId || '');
                  setAssignDialogOpen(true);
                }}>
                  {ticket.assignedToId ? 'Reassign' : 'Assign Technician'}
                </Button>
              )}
              {canSatisfaction && (
                <Button
                  variant="contained"
                  size="small"
                  color="warning"
                  startIcon={<StarIcon />}
                  onClick={() => setSatDialogOpen(true)}
                >
                  Rate Resolution
                </Button>
              )}
            </Box>
          </Box>

          {/* Inline status editor */}
          {editingStatus && canStaff && (
            <Box mt={3} p={2} bgcolor="action.hover" borderRadius={1}>
              <Typography variant="subtitle2" gutterBottom>Update Ticket</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    size="small"
                  >
                    {STATUS_OPTS.map((s) => (
                      <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Resolution Notes (optional)"
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box display="flex" gap={1}>
                    <Button variant="contained" size="small" onClick={handleUpdateStatus}>Save</Button>
                    <Button size="small" onClick={() => setEditingStatus(false)}>Cancel</Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── Ticket Details ── */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Description</Typography>
              <Typography variant="body2" whiteSpace="pre-wrap">{ticket.description}</Typography>

              {ticket.resolutionNotes && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Resolution Notes</Typography>
                  <Typography variant="body2" whiteSpace="pre-wrap">{ticket.resolutionNotes}</Typography>
                </>
              )}

              {ticket.satisfactionRating && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Client Satisfaction</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Rating value={ticket.satisfactionRating} readOnly />
                    <Typography variant="body2" color="text.secondary">
                      {ticket.satisfactionRating}/5
                    </Typography>
                  </Box>
                  {ticket.satisfactionComment && (
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                      "{ticket.satisfactionComment}"
                    </Typography>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Details</Typography>
              <Box display="flex" flexDirection="column" gap={1.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Ticket Number</Typography>
                  <Typography variant="body2">{ticket.ticketNumber}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Requested By</Typography>
                  <Typography variant="body2">
                    {(ticket as any).requester
                      ? `${(ticket as any).requester.firstName} ${(ticket as any).requester.lastName}`
                      : `User #${ticket.requesterId}`}
                  </Typography>
                </Box>
                {ticket.assignedToId && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Assigned To</Typography>
                    <Typography variant="body2">
                      {(ticket as any).assignedTo
                        ? `${(ticket as any).assignedTo.firstName} ${(ticket as any).assignedTo.lastName}`
                        : `User #${ticket.assignedToId}`}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary">Created</Typography>
                  <Typography variant="body2">{new Date(ticket.createdAt).toLocaleString()}</Typography>
                </Box>
                {ticket.resolvedAt && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Resolved</Typography>
                    <Typography variant="body2">{new Date(ticket.resolvedAt).toLocaleString()}</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Comments ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Comments ({(ticket as any).comments?.length ?? 0})
          </Typography>

          {(ticket as any).comments?.length > 0 ? (
            <List disablePadding>
              {(ticket as any).comments.map((c: any, i: number) => (
                <React.Fragment key={c.id ?? i}>
                  <ListItem alignItems="flex-start" disableGutters>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight={600}>
                            {c.user
                              ? `${c.user.firstName} ${c.user.lastName}`
                              : `User #${c.userId}`}
                          </Typography>
                          {c.isInternal && (
                            <Chip label="Internal" size="small" color="default" variant="outlined" />
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {new Date(c.createdAt).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.primary" whiteSpace="pre-wrap" mt={0.5}>
                          {c.content}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {i < (ticket as any).comments.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">No comments yet.</Typography>
          )}

          {/* Add comment */}
          {ticket.status !== 'closed' && (
            <Box mt={3}>
              <Divider sx={{ mb: 2 }} />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Add a comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                size="small"
              />
              {canStaff && (
                <FormControlLabel
                  control={<Switch checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} size="small" />}
                  label={<Typography variant="caption">Internal note (hidden from requester)</Typography>}
                  sx={{ mt: 1 }}
                />
              )}
              <Box mt={1}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleAddComment}
                  disabled={submittingComment || !comment.trim()}
                >
                  {submittingComment ? 'Submitting…' : 'Add Comment'}
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── Assign Dialog ── */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Assign Technician</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Technician"
            value={assignToId}
            onChange={(e) => setAssignToId(Number(e.target.value))}
            size="small"
            sx={{ mt: 1 }}
          >
            {technicians
              .filter((t) => {
                if (ticket.ticketType === 'desktop_support') return t.role === 'technician_desktop' || t.role === 'technician';
                if (ticket.ticketType === 'it_support') return t.role === 'technician_it_support' || t.role === 'technician';
                return true;
              })
              .map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.firstName} {t.lastName} ({t.openTickets} open)
                </MenuItem>
              ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssign} disabled={!assignToId}>Assign</Button>
        </DialogActions>
      </Dialog>

      {/* ── Satisfaction Dialog ── */}
      <Dialog open={satDialogOpen} onClose={() => setSatDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Rate the Resolution</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            How satisfied are you with how this ticket was resolved?
          </Typography>
          <Box display="flex" justifyContent="center" my={2}>
            <Rating
              value={satRating}
              onChange={(_, v) => setSatRating(v)}
              size="large"
            />
          </Box>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Comments (optional)"
            value={satComment}
            onChange={(e) => setSatComment(e.target.value)}
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSatDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitSatisfaction} disabled={!satRating}>Submit</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
