'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { ArrowBack as BackIcon, Assignment as AssignedIcon } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { ticketsApi, Ticket, TicketStatus } from '@/app/api/references';
import { useSse } from '@/lib/utils/useSse';
export default function MyAssignedTicketsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const filters = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const requestedStatus = params.get('status');
    const allowedStatuses: TicketStatus[] = ['assigned', 'in_progress', 'resolved', 'closed'];
    const status = allowedStatuses.includes(requestedStatus as TicketStatus)
      ? (requestedStatus as TicketStatus)
      : undefined;
    const year = Number(params.get('year')) || undefined;
    const month = Number(params.get('month')) || undefined;
    return { status, year, month };
  }, [location.search]);

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const result = await ticketsApi.getMyAssigned(filters);
      setTickets(result.data ?? []);
      setError('');
    } catch (cause: any) {
      setError(cause?.response?.data?.message || 'Unable to load your assigned tickets.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [filters]);
  useEffect(() => {
    void load(true);
  }, [load]);
  useSse(['TICKET_UPDATED'], () => {
    void load(false);
  });

  const periodLabel = filters.year && filters.month
    ? new Date(filters.year, filters.month - 1, 1).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : null;
  return (
    <Box>
      <Button startIcon={<BackIcon />} onClick={() => navigate('/dashboard')} sx={{ mb: 2 }}>
        Back to Dashboard
      </Button>
      <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
        <AssignedIcon color="primary" />
        <Typography variant="h5">My Assigned Tickets</Typography>
        {(filters.status || periodLabel) && (
          <Typography variant="body2" color="text.secondary">
            {[filters.status?.replace('_', ' '), periodLabel].filter(Boolean).join(' · ')}
          </Typography>
        )}
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {tickets.length === 0 ? (
            <Alert severity="info">You have no assigned tickets.</Alert>
          ) : (
            tickets.map((ticket) => (
              <Card key={ticket.id} variant="outlined">
                <CardActionArea
                  onClick={() => navigate(`/operations/tickets/${ticket.id}`)}
                  aria-label={`Open ticket ${ticket.ticketNumber}`}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" gap={2} flexWrap="wrap">
                      <Box>
                        <Typography variant="overline" color="text.secondary">
                          {ticket.ticketNumber}
                        </Typography>
                        <Typography fontWeight={700}>{ticket.subject}</Typography>
                      </Box>
                      <Chip
                        label={ticket.status.replace('_', ' ')}
                        size="small"
                        color={ticket.status === 'in_progress' ? 'primary' : 'default'}
                      />
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))
          )}
        </Stack>
      )}
    </Box>
  );
}
