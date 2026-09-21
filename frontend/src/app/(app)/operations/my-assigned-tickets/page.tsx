'use client';
import { useEffect, useState } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { ticketsApi, Ticket } from '@/app/api/references';
export default function MyAssignedTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true);
    try {
      const result = await ticketsApi.getMyAssigned();
      setTickets(result.data ?? []);
      setError('');
    } catch (cause: any) {
      setError(cause?.response?.data?.message || 'Unable to load your assigned tickets.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  return (
    <Box>
      <Button startIcon={<BackIcon />} onClick={() => navigate('/dashboard')} sx={{ mb: 2 }}>
        Back to Dashboard
      </Button>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <AssignedIcon color="primary" />
        <Typography variant="h5">My Assigned Tickets</Typography>
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
