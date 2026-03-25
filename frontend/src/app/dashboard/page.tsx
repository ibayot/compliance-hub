'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
} from '@mui/material';
import {
  Description as DocumentIcon,
  CheckCircle as CompliantIcon,
  Warning as WarningIcon,
  ConfirmationNumber as TicketIcon,
  Security as SecurityIcon,
  Shield as ShieldIcon,
  VpnLock as VpnLockIcon,
  BugReport as BugIcon,
  Star as StarIcon,
  PendingActions as PendingIcon,
  CheckCircleOutline as ResolvedIcon,
  Cancel as ClosedIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { documentsApi } from '@/lib/api/documents';
import { ticketsApi, TicketDashboardStats } from '@/app/api/references';
import { incidentsApi, TodayStats } from '@/lib/api/incidents';
import { cybersecurityApi, CybersecurityMetric } from '@/lib/api/cybersecurity';
import { DashboardSummaryResponse, kpiApi } from '@/lib/api/kpi';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    compliantDocuments: 0,
    pendingDocuments: 0,
    openTickets: 0,
    recentDocuments: [] as any[],
  });

  // Real-time cybersecurity metrics from API
  const [cyberMetrics, setCyberMetrics] = useState<CybersecurityMetric[]>([]);
  
  // Real-time incident tracking (8AM - 5PM)
  const [incidentStats, setIncidentStats] = useState<TodayStats | null>(null);
  const [kpiSummary, setKpiSummary] = useState<DashboardSummaryResponse | null>(null);

  // User-specific ticket dashboard stats
  const [userTicketStats, setUserTicketStats] = useState<TicketDashboardStats | null>(null);

  const now = useMemo(() => new Date(), []);
  const periodYear = now.getFullYear();
  const periodMonth = now.getMonth() + 1;

  const isRegularUser = user?.role === 'user';

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // For regular users — only fetch ticket dashboard stats
      if (isRegularUser) {
        try {
          const dashStats = await ticketsApi.getDashboardStats();
          setUserTicketStats(dashStats);
        } catch (err) {
          console.error('Failed to fetch user ticket stats:', err);
        }
        return;
      }

      // Staff / admin: full dashboard
      const [docsResponse, metricsResult, incidentsResult, ticketStatsResult, kpiSummaryResult] =
        await Promise.allSettled([
          documentsApi.listDocuments({}),
          cybersecurityApi.getAll(),
          incidentsApi.getTodayStats(),
          ticketsApi.getStatistics(),
          kpiApi.dashboardSummary(periodYear, periodMonth),
        ]);

      const docs =
        docsResponse.status === 'fulfilled' ? docsResponse.value.data : [];
      const compliant = docs.filter((d: any) => d.status === 'ready').length;
      const pending = docs.filter((d: any) => d.status === 'pending' || d.status === 'processing').length;

      // Fetch ticket statistics
      let ticketStats = { total: 0, byStatus: {}, byPriority: {} };
      if (ticketStatsResult.status === 'fulfilled') {
        ticketStats = ticketStatsResult.value;
      } else {
        // Statistics endpoint might not be available
        const tickets = await ticketsApi.getAll({});
        const openTickets = tickets.filter((t: any) => t.status === 'open' || t.status === 'in_progress');
        ticketStats = { total: tickets.length, byStatus: { open: openTickets.length }, byPriority: {} };
      }

      // Fetch cybersecurity metrics from API
      if (metricsResult.status === 'fulfilled') {
        setCyberMetrics(metricsResult.value);
      }

      // Fetch today's incident tracking (8AM - 5PM Philippines time)
      if (incidentsResult.status === 'fulfilled') {
        setIncidentStats(incidentsResult.value);
      }

      if (kpiSummaryResult.status === 'fulfilled') {
        setKpiSummary(kpiSummaryResult.value);
      }

      setStats({
        totalDocuments: docs.length,
        compliantDocuments: compliant,
        pendingDocuments: pending,
        openTickets: (ticketStats.byStatus as any)?.open || 0,
        recentDocuments: docs.slice(0, 5), // Latest 5 documents
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // ─────────────────────────────────────────────
  // Regular User Dashboard
  // ─────────────────────────────────────────────
  if (isRegularUser) {
    const s = userTicketStats;
    const fillRate = s?.satisfactionFillRate ?? 0;
    const pendingCount = s?.pendingSatisfactionTickets ?? 0;

    return (
      <Box>
        {/* Page Header */}
        <Box mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back, {user?.firstName || user?.email}!
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
                <Typography variant="body2" color="text.secondary">Open</Typography>
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
                <Typography variant="body2" color="text.secondary">In Progress</Typography>
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
                <Typography variant="body2" color="text.secondary">Resolved</Typography>
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
                <Typography variant="body2" color="text.secondary">Closed</Typography>
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
                  {pendingCount} resolved ticket{pendingCount > 1 ? 's' : ''} awaiting your satisfaction rating
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  color="warning"
                  startIcon={<StarIcon />}
                  onClick={() => router.push('/dashboard/tickets?filter=pending_satisfaction')}
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
            <Typography variant="h6" gutterBottom>Quick Actions</Typography>
            <Box display="flex" flexDirection="column" gap={2} mt={2}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<TicketIcon />}
                onClick={() => router.push('/dashboard/tickets')}
              >
                My Tickets
              </Button>
              {pendingCount > 0 && (
                <Button
                  variant="outlined"
                  fullWidth
                  color="warning"
                  startIcon={<StarIcon />}
                  onClick={() => router.push('/dashboard/tickets?filter=pending_satisfaction')}
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

  // ─────────────────────────────────────────────
  // Staff / Admin Dashboard (unchanged)
  // ─────────────────────────────────────────────
  const complianceRate = stats.totalDocuments > 0
    ? ((stats.compliantDocuments / stats.totalDocuments) * 100).toFixed(1)
    : 0;

  return (
    <Box>
      {/* Page Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.firstName || user?.email}! • Role: {user?.role?.replace('_', ' ').toUpperCase()}
        </Typography>
      </Box>

      {/* Main Stats */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <DocumentIcon color="primary" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="primary">
                    {stats.totalDocuments}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Documents
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CompliantIcon color="success" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {stats.compliantDocuments}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ready Documents
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <WarningIcon color="warning" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {stats.pendingDocuments}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Documents
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              '&:hover': { boxShadow: 4 }
            }}
            onClick={() => window.location.href = '/dashboard/incidents'}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <BugIcon color="error" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="error.main">
                    {incidentStats?.currentCount || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Security Incidents
                  </Typography>
                  {incidentStats && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      +{incidentStats.addedToday} today
                    </Typography>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <TicketIcon color="info" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="info.main">
                    {stats.openTickets}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Open Issues
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Incident Response Tracking (8AM - 5PM) */}
      {incidentStats && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <BugIcon color="error" fontSize="large" />
              <Box>
                <Typography variant="h6">Incident Response — {format(new Date(), 'EEEE, MMMM d, yyyy')}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Start: {incidentStats.startCount} • Added: {incidentStats.addedToday} • Current: {incidentStats.currentCount}
                </Typography>
              </Box>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, border: 1, borderColor: 'info.main', bgcolor: 'info.50' }}>
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    Low Severity
                  </Typography>
                  <Typography variant="h5" color="info.main">
                    {incidentStats.severityBreakdown.low}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, border: 1, borderColor: 'warning.main', bgcolor: 'warning.50' }}>
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    Medium Severity
                  </Typography>
                  <Typography variant="h5" color="warning.main">
                    {incidentStats.severityBreakdown.medium}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, border: 1, borderColor: 'error.main', bgcolor: 'error.50' }}>
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    High Severity
                  </Typography>
                  <Typography variant="h5" color="error.main">
                    {incidentStats.severityBreakdown.high}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, border: 1, borderColor: 'error.dark', bgcolor: 'error.100' }}>
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    Critical Severity
                  </Typography>
                  <Typography variant="h5" color="error.dark">
                    {incidentStats.severityBreakdown.critical}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Cybersecurity Metrics */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <SecurityIcon color="primary" fontSize="large" />
            <Typography variant="h6">Cybersecurity Compliance</Typography>
          </Box>
          <Grid container spacing={2}>
            {cyberMetrics.map((metric, index) => {
              const icons = [ShieldIcon, VpnLockIcon, SecurityIcon, BugIcon];
              const Icon = icons[index % icons.length];
              const color = metric.status === 'compliant' ? 'success' :
                metric.status === 'warning' ? 'warning' : 
                metric.status === 'non_compliant' ? 'error' : 'info';

              return (
                <Grid item xs={12} sm={6} md={3} key={metric.id}>
                  <Paper
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: `${color}.main`,
                      bgcolor: `${color}.50`,
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Icon color={color} fontSize="small" />
                      <Typography variant="body2" fontWeight={600}>
                        {metric.name}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {metric.value || 'Unknown'}
                    </Typography>
                    {metric.details && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {metric.details}
                      </Typography>
                    )}
                    <Box mt={1}>
                      <Chip
                        label={
                          metric.status === 'compliant' ? 'Compliant' : 
                          metric.status === 'warning' ? 'Needs Attention' : 
                          metric.status === 'non_compliant' ? 'Non-Compliant' : 
                          'Unknown'
                        }
                        color={color}
                        size="small"
                      />
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      {/* KPI Overview */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box>
              <Typography variant="h6">KPI Overview</Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.role === 'super_admin' || user?.role === 'reviewer'
                  ? 'Consolidated KPI visibility across all units.'
                  : 'KPI visibility scoped to your assigned unit(s).'}
              </Typography>
            </Box>
            <Button variant="outlined" href="/dashboard/kpi">Open KPI Workspace</Button>
          </Box>

          <Grid container spacing={2} mb={2}>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">Overall KPI Score</Typography>
                <Typography variant="h5" color="primary">{kpiSummary?.summary.overallScore ?? 0}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">Units Covered</Typography>
                <Typography variant="h5">{kpiSummary?.summary.unitCount ?? 0}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">Monitoring Rows</Typography>
                <Typography variant="h5">{kpiSummary?.summary.rowCount ?? 0}</Typography>
              </Paper>
            </Grid>
          </Grid>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            Period: {periodYear}-{String(periodMonth).padStart(2, '0')}
          </Typography>

          {kpiSummary && kpiSummary.units.length > 0 ? (
            <List>
              {kpiSummary.units.slice(0, 5).map((unit) => (
                <ListItem key={unit.unitId}>
                  <ListItemText
                    primary={unit.unitName}
                    secondary={`KPI Count: ${unit.kpiCount} • Score: ${unit.score}`}
                  />
                  <Chip label={String(unit.band).toUpperCase()} size="small" />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No KPI rows found for this period.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Recent Documents and Compliance Overview */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Documents
              </Typography>
              {stats.recentDocuments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No documents yet
                </Typography>
              ) : (
                <List>
                  {stats.recentDocuments.map((doc: any) => (
                    <ListItem key={doc.id}>
                      <ListItemText
                        primary={doc.title}
                        secondary={`${doc.document_type} • ${new Date(
                          doc.created_at,
                        ).toLocaleDateString()}`}
                      />
                      <Chip
                        label={doc.status}
                        color={
                          doc.status === 'ready'
                            ? 'success'
                            : doc.status === 'failed'
                              ? 'error'
                              : 'warning'
                        }
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Compliance Overview
              </Typography>
              <Box textAlign="center" py={3}>
                <Typography variant="h2" color="primary" gutterBottom>
                  {complianceRate}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Documents Ready
                </Typography>
              </Box>
              <Box mt={2}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Documents by Status:
                </Typography>
                <Box display="flex" flexDirection="column" gap={1} mt={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Ready:</Typography>
                    <Chip
                      label={stats.compliantDocuments}
                      color="success"
                      size="small"
                    />
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Pending:</Typography>
                    <Chip
                      label={stats.pendingDocuments}
                      color="warning"
                      size="small"
                    />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box display="flex" flexDirection="column" gap={2} mt={2}>
                <Button
                  variant="contained"
                  href="/dashboard/documents/upload"
                  fullWidth
                >
                  Upload Document
                </Button>
                <Button
                  variant="outlined"
                  href="/dashboard/tickets"
                  fullWidth
                >
                  View Issues
                </Button>
                <Button
                  variant="outlined"
                  href="/dashboard/issuances"
                  fullWidth
                >
                  View Issuances
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
