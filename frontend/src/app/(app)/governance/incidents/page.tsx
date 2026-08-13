'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSse } from '@/lib/utils/useSse';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import { BugReport as BugIcon, Assessment as AssessmentIcon } from '@mui/icons-material';
import {
  incidentsApi,
  Incident,
  IncidentStatistics,
  TodayStats,
  IncidentPeriodStats,
} from '@/lib/api/incidents';

export default function IncidentsPage() {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<IncidentStatistics | null>(null);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [periodStats, setPeriodStats] = useState<IncidentPeriodStats | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const silentFetchData = useCallback(async () => {
    try {
      const [statsData, todayData, periodsData, incidentsData] = await Promise.all([
        incidentsApi.getStatistics(),
        incidentsApi.getTodayStats(),
        incidentsApi.getPeriodStats(),
        incidentsApi.getAll({ status: 'open,in_progress' }),
      ]);

      setStatistics(statsData);
      setTodayStats(todayData);
      setPeriodStats(periodsData);
      setRecentIncidents(incidentsData.slice(0, 10)); // Latest 10
    } catch (err) {
      console.error('Failed to fetch incident data silently:', err);
    }
  }, []);

  useSse(['TICKET_UPDATED', 'INCIDENT_SNAPSHOT_CREATED'], silentFetchData);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [statsData, todayData, periodsData, incidentsData] = await Promise.all([
        incidentsApi.getStatistics(),
        incidentsApi.getTodayStats(),
        incidentsApi.getPeriodStats(),
        incidentsApi.getAll({ status: 'open,in_progress' }),
      ]);

      setStatistics(statsData);
      setTodayStats(todayData);
      setPeriodStats(periodsData);
      setRecentIncidents(incidentsData.slice(0, 10)); // Latest 10
    } catch (err) {
      console.error('Failed to fetch incident data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'error';
      case 'in_progress':
        return 'warning';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'default';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Page Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Incident Response Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Real-time security incident tracking • 8:00 AM - 5:00 PM Philippines Time
        </Typography>
      </Box>

      {/* Today's Stats */}
      {todayStats && (
        <Card sx={{ mb: 4, borderLeft: 4, borderColor: 'error.main' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <AssessmentIcon color="error" fontSize="large" />
              <Box>
                <Typography variant="h5">Today Incident Tracking</Typography>
                <Typography variant="caption" color="text.secondary">
                  Daily snapshot: 8:00 AM (Start) to 5:00 PM (End)
                </Typography>
              </Box>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Start of Day (8:00 AM)
                  </Typography>
                  <Typography variant="h3" color="text.primary">
                    {todayStats.startCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Open incidents at 8 AM
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, bgcolor: 'error.50' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Added Today
                  </Typography>
                  <Typography variant="h3" color="error.main">
                    +{todayStats.addedToday}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    New incidents reported
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, bgcolor: 'warning.50' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Current Count
                  </Typography>
                  <Typography variant="h3" color="warning.main">
                    {todayStats.currentCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total open incidents now
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Severity Breakdown */}
            <Box mt={3}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Severity Breakdown (Added Today)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Chip label="Low" color="info" size="small" />
                    <Typography variant="h6" mt={1}>
                      {todayStats.severityBreakdown.low}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Chip label="Medium" color="warning" size="small" />
                    <Typography variant="h6" mt={1}>
                      {todayStats.severityBreakdown.medium}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Chip label="High" color="error" size="small" />
                    <Typography variant="h6" mt={1}>
                      {todayStats.severityBreakdown.high}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Chip
                      label="Critical"
                      color="error"
                      size="small"
                      sx={{ bgcolor: 'error.dark' }}
                    />
                    <Typography variant="h6" mt={1}>
                      {todayStats.severityBreakdown.critical}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Posture Overview by Period */}
      {periodStats && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cybersecurity Incident Posture Overview
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              Daily, weekly, monthly, quarterly, and yearly rollups
            </Typography>
            <Grid container spacing={2}>
              {[
                { label: 'Daily', value: periodStats.daily },
                { label: 'Weekly', value: periodStats.weekly },
                { label: 'Monthly', value: periodStats.monthly },
                { label: 'Quarterly', value: periodStats.quarterly },
                { label: 'Yearly', value: periodStats.yearly },
              ].map((period) => (
                <Grid item xs={12} sm={6} md={4} key={period.label}>
                  <Paper sx={{ p: 2, border: 1, borderColor: 'divider', height: '100%' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {period.label}
                    </Typography>
                    <Typography variant="h5" color="primary.main">
                      {period.value.totalReported}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                      Reported
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      Critical Open: {period.value.criticalOpen}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Resolved: {period.value.resolvedWithinPeriod}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                      Low {period.value.bySeverity.low} • Med {period.value.bySeverity.medium}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      High {period.value.bySeverity.high} • Crit {period.value.bySeverity.critical}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Overall Statistics */}
      {statistics && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Incidents by Status
                </Typography>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Open</Typography>
                    <Typography variant="body2" fontWeight={600} color="error.main">
                      {statistics.byStatus.open}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(statistics.byStatus.open / statistics.total) * 100}
                    color="error"
                    sx={{ mb: 2 }}
                  />

                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">In Progress</Typography>
                    <Typography variant="body2" fontWeight={600} color="warning.main">
                      {statistics.byStatus.in_progress}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(statistics.byStatus.in_progress / statistics.total) * 100}
                    color="warning"
                    sx={{ mb: 2 }}
                  />

                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Resolved</Typography>
                    <Typography variant="body2" fontWeight={600} color="success.main">
                      {statistics.byStatus.resolved}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(statistics.byStatus.resolved / statistics.total) * 100}
                    color="success"
                    sx={{ mb: 2 }}
                  />

                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Closed</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {statistics.byStatus.closed}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(statistics.byStatus.closed / statistics.total) * 100}
                    sx={{ mb: 2 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Incidents by Severity
                </Typography>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Critical</Typography>
                    <Typography variant="body2" fontWeight={600} color="error.dark">
                      {statistics.bySeverity.critical}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(statistics.bySeverity.critical / statistics.total) * 100}
                    sx={{
                      mb: 2,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': { bgcolor: 'error.dark' },
                    }}
                  />

                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">High</Typography>
                    <Typography variant="body2" fontWeight={600} color="error.main">
                      {statistics.bySeverity.high}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(statistics.bySeverity.high / statistics.total) * 100}
                    color="error"
                    sx={{ mb: 2 }}
                  />

                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Medium</Typography>
                    <Typography variant="body2" fontWeight={600} color="warning.main">
                      {statistics.bySeverity.medium}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(statistics.bySeverity.medium / statistics.total) * 100}
                    color="warning"
                    sx={{ mb: 2 }}
                  />

                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Low</Typography>
                    <Typography variant="body2" fontWeight={600} color="info.main">
                      {statistics.bySeverity.low}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(statistics.bySeverity.low / statistics.total) * 100}
                    color="info"
                    sx={{ mb: 2 }}
                  />
                </Box>

                <Box mt={3} p={2} bgcolor="error.50" borderRadius={1}>
                  <Typography variant="body2" color="text.secondary">
                    Critical Open Incidents
                  </Typography>
                  <Typography variant="h4" color="error.dark">
                    {statistics.criticalOpen}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Requires immediate attention
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Recent Open/In-Progress Incidents */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Open & In-Progress Incidents
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Reported</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentIncidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No open incidents
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  recentIncidents.map((incident) => (
                    <TableRow key={incident.id} hover sx={{ cursor: 'pointer' }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {incident.title}
                        </Typography>
                        {incident.description && (
                          <Typography variant="caption" color="text.secondary">
                            {incident.description.substring(0, 80)}
                            {incident.description.length > 80 ? '...' : ''}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {incident.category
                            .replace(/_/g, ' ')
                            .toLowerCase()
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={incident.severity.toUpperCase()}
                          color={getSeverityColor(incident.severity) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={incident.status.replace('_', ' ').toUpperCase()}
                          color={getStatusColor(incident.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(incident.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
