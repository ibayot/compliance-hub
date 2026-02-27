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
} from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/contexts/AuthContext';
import { ticketsApi, Ticket, TicketConfigOption } from '@/app/api/references';

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [issueType, setIssueType] = useState<Ticket['issue_type']>('other');
  const [issueTypeId, setIssueTypeId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [issueTypes, setIssueTypes] = useState<TicketConfigOption[]>([]);
  const [categories, setCategories] = useState<TicketConfigOption[]>([]);
  const [resolutionSteps, setResolutionSteps] = useState('');
  const [resolutionDate, setResolutionDate] = useState('');

  useEffect(() => {
    fetchTicket();
    fetchConfigs();
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const data = await ticketsApi.getById(ticketId);
      setTicket(data);
      setIssueType((data.issue_type || 'other') as Ticket['issue_type']);
      setIssueTypeId(data.issue_type_id || '');
      setCategoryId(data.category_id || '');
      setResolutionSteps(data.resolution_steps || '');
      setResolutionDate(data.resolution_date ? new Date(data.resolution_date).toISOString().slice(0, 10) : '');
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to fetch ticket', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigs = async () => {
    try {
      const [issueTypeData, categoryData] = await Promise.all([
        ticketsApi.listIssueTypes(true),
        ticketsApi.listCategories(true),
      ]);
      setIssueTypes(issueTypeData || []);
      setCategories(categoryData || []);
    } catch {
      // non-blocking for detail view
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    try {
      setSubmitting(true);
      await ticketsApi.addComment(ticketId, comment);
      setComment('');
      fetchTicket();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to add comment', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: Ticket['status']) => {
    try {
      await ticketsApi.update(ticketId, { status: newStatus });
      fetchTicket();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update status', { variant: 'error' });
    }
  };

  const handleSaveIssueDetails = async () => {
    try {
      await ticketsApi.update(ticketId, {
        issue_type_id: issueTypeId || undefined,
        category_id: categoryId || undefined,
        issue_type: issueType,
        resolution_steps: resolutionSteps || undefined,
        resolution_date: resolutionDate || undefined,
      });
      fetchTicket();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update issue details', { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading issue...</Typography>
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box>
        <Typography color="error">Issue not found</Typography>
        <Button onClick={() => router.push('/dashboard/tickets')} sx={{ mt: 2 }}>
          Back to Issues
        </Button>
      </Box>
    );
  }

  const isReviewer = user?.role === 'super_admin' || user?.role === 'reviewer';

  return (
    <Box>
      <Button onClick={() => router.push('/dashboard/tickets')} sx={{ mb: 2 }}>
        ← Back to Issues
      </Button>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
            <Box>
              <Typography variant="h5" gutterBottom>
                {ticket.subject}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Issue #{ticket.ticket_number}
              </Typography>
            </Box>
            {isReviewer && (
              <TextField
                select
                label="Status"
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value as Ticket['status'])}
                size="small"
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </TextField>
            )}
          </Box>

          <Box display="flex" gap={1} mb={3}>
            <Chip
              label={`Priority: ${ticket.priority.toUpperCase()}`}
              color={
                ticket.priority === 'urgent' || ticket.priority === 'high'
                  ? 'error'
                  : ticket.priority === 'medium'
                  ? 'warning'
                  : 'info'
              }
              size="small"
            />
            <Chip
              label={`Category: ${(ticket.category_config?.name || ticket.category).replace('_', ' ')}`}
              size="small"
            />
            <Chip
              label={`Issue Type: ${(ticket.issue_type_config?.name || ticket.issue_type || 'other').replace('_', ' ')}`}
              size="small"
            />
            <Chip
              label={`Status: ${ticket.status.replace('_', ' ')}`}
              color={
                ticket.status === 'resolved'
                  ? 'success'
                  : ticket.status === 'in_progress'
                  ? 'warning'
                  : 'info'
              }
              size="small"
            />
          </Box>

          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">
                Reported By
              </Typography>
              <Typography variant="body2">
                {ticket.reported_by
                  ? `${ticket.reported_by.firstName} ${ticket.reported_by.lastName}`
                  : 'Unknown'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">
                Created At
              </Typography>
              <Typography variant="body2">
                {new Date(ticket.created_at).toLocaleString()}
              </Typography>
            </Grid>
            {ticket.assigned_to && (
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">
                  Assigned To
                </Typography>
                <Typography variant="body2">
                  {`${ticket.assigned_to.firstName} ${ticket.assigned_to.lastName}`}
                </Typography>
              </Grid>
            )}
            {ticket.unit && (
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">
                  Unit
                </Typography>
                <Typography variant="body2">{ticket.unit.name}</Typography>
              </Grid>
            )}
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>
            Description
          </Typography>
          <Typography variant="body2" paragraph>
            {ticket.description}
          </Typography>

          {isReviewer && (
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>
                Issue Documentation
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    fullWidth
                    label="Category"
                    value={categoryId || ticket.category}
                    onChange={(event) => {
                      setCategoryId(event.target.value);
                      setIssueTypeId('');
                      setIssueType('other');
                    }}
                    size="small"
                  >
                    {categories
                      .filter((item) => item.is_active)
                      .map((item) => (
                        <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                      ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    fullWidth
                    label="Issue Type"
                    value={issueTypeId || issueType}
                    onChange={(event) => {
                      setIssueTypeId(event.target.value);
                      setIssueType('other');
                    }}
                    size="small"
                  >
                    {issueTypes
                      .filter((item) => !categoryId || (item as any).category_id === categoryId)
                      .filter((item) => item.is_active)
                      .map((item) => (
                        <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                      ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Resolution Date"
                    InputLabelProps={{ shrink: true }}
                    value={resolutionDate}
                    onChange={(event) => setResolutionDate(event.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Resolution Steps"
                    value={resolutionSteps}
                    onChange={(event) => setResolutionSteps(event.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="outlined" onClick={handleSaveIssueDetails}>
                    Save Issue Details
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Comments ({ticket.comments?.length || 0})
          </Typography>

          {ticket.comments && ticket.comments.length > 0 && (
            <List>
              {ticket.comments.map((comment, index) => (
                <React.Fragment key={comment.id}>
                  {index > 0 && <Divider />}
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="subtitle2">
                            {comment.user
                              ? `${comment.user.firstName} ${comment.user.lastName}`
                              : 'Unknown User'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(comment.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {comment.comment}
                        </Typography>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}

          <Divider sx={{ my: 2 }} />

          <Box>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              onClick={handleAddComment}
              disabled={!comment.trim() || submitting}
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
