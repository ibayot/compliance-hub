'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSse } from '@/lib/utils/useSse';
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
  Stack,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Select,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
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
  Assignment as AssignedIcon,
  PlayCircle as InProgressIcon,
  Computer as DesktopIcon,
  Wifi as ItSupportIcon,
  Error as ErrorIcon,
  AcUnit as FrozenIcon,
  FileCopy as DuplicateIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { documentsApi } from '@/lib/api/documents';
import { ticketsApi, ticketSettingsApi, TicketDashboardStats, TechAssignedStats } from '@/app/api/references';

import { incidentsApi, TodayStats } from '@/lib/api/incidents';
import { usersApi } from '@/lib/api/users';
import { cybersecurityApi, CybersecurityMetric } from '@/lib/api/cybersecurity';
import { DashboardSummaryResponse, kpiApi } from '@/lib/api/kpi';

export default function DashboardPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { user, myCap } = useAuth();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
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
  const [pendingSatReminderOpen, setPendingSatReminderOpen] = useState(false);

  // Tech monthly assigned-ticket stats with selectable period
  const [techAssignedStats, setTechAssignedStats] = useState<TechAssignedStats | null>(null);
  const [generalStats, setGeneralStats] = useState<any>(null);
  const [techStatsYear, setTechStatsYear] = useState(() => new Date().getFullYear());
  const yearOptions = Array.from({ length: 7 }, (_, index) => new Date().getFullYear() - 3 + index);
  const [techStatsMonth, setTechStatsMonth] = useState(() => new Date().getMonth() + 1);
  const [techStatsLoading, setTechStatsLoading] = useState(false);

  const [showDebugClockout, setShowDebugClockout] = useState(false);

  // Admin-level full ticket metrics
  const [ticketMetrics, setTicketMetrics] = useState<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    satisfactionAvg: number | null;
    satisfactionFillRate: number;
    resolvedTickets: number;
  } | null>(null);

  // IT Help Desk Overview Filters
  const [itStatsMode, setItStatsMode] = useState<'year' | 'semester' | 'quarter' | 'month'>('year');
  const [itStatsYear, setItStatsYear] = useState(() => new Date().getFullYear());
  const [itStatsSemester, setItStatsSemester] = useState(() => (new Date().getMonth() < 6 ? 1 : 2));
  const [itStatsQuarter, setItStatsQuarter] = useState(() => Math.floor(new Date().getMonth() / 3) + 1);
  const [itStatsMonth, setItStatsMonth] = useState(() => new Date().getMonth() + 1);
  const [itStatsLoading, setItStatsLoading] = useState(false);

  const now = useMemo(() => new Date(), []);
  const periodYear = now.getFullYear();
  const periodMonth = now.getMonth() + 1;

  const isRegularUser = user?.role === 'user';
  const isTechnicianAny = !!myCap?.isDesktop || !!myCap?.isItSupport || !!myCap?.isPantawidIct;
  const isLowerLevelTech = (!!myCap?.isDesktop || !!myCap?.isItSupport || !!myCap?.isPantawidIct) && !myCap?.isFocal;
  // Compliance Officer = any role tagged with roleCode 'compliance_officer'
  const isComplianceOfficer = user?.roleCode === 'compliance_officer';
  // Full dashboard: super_admin or CO; generic staff (focal, etc.) see doc cards + KPI only
  const isFullDashboard = !!myCap?.isReportsAccess || !!myCap?.isReviewsAccess || !!myCap?.isTicketSettingsFocal;
  // Section Head and Cybersecurity Officer — identified via roleCode
  const isSectionHead = user?.roleCode === 'section_head';
  const isCybersecurityOfficer = user?.roleCode === 'cybersecurity_officer';

  const [globalConfig, setGlobalConfig] = useState<any>(null);
  const [slaSummary, setSlaSummary] = useState<{ breached: number; nearing: number; onTrack: number } | null>(null);

  useEffect(() => {
    if (myCap?.isTicketSettingsFocal) {
      ticketsApi.getSlaSummary().then(setSlaSummary).catch(console.error);

    }
  }, [myCap?.isTicketSettingsFocal, techStatsYear, techStatsMonth]);

  // Compute clock out logic
  const isClockOutEnabled = useMemo(() => {
    if (!globalConfig) return false;
    const nowTime = new Date();
    const currentTime = `${String(nowTime.getHours()).padStart(2, '0')}:${String(nowTime.getMinutes()).padStart(2, '0')}:00`;

    if (globalConfig.scheduleMode === 'OFFICE_HOURS') {
      return currentTime >= globalConfig.officeClockout;
    } else if (globalConfig.scheduleMode === 'CWW') {
      return currentTime >= globalConfig.cwwClockoutStart && currentTime <= globalConfig.cwwClockoutEnd;
    }
    return false;
  }, [globalConfig]);

  const getGradient = (color: string) => {
    if (color === 'default' || color === 'action') {
      return isDark 
        ? `linear-gradient(135deg, ${alpha('#9e9e9e', 0.2)} 0%, ${alpha('#9e9e9e', 0.05)} 100%)` 
        : `linear-gradient(135deg, ${alpha('#9e9e9e', 0.15)} 0%, ${alpha('#9e9e9e', 0.05)} 100%)`;
    }
    const mainColor = (theme.palette as any)[color]?.main || '#9e9e9e';
    return isDark
      ? `linear-gradient(135deg, ${alpha(mainColor, 0.2)} 0%, ${alpha(mainColor, 0.05)} 100%)`
      : `linear-gradient(135deg, ${alpha(mainColor, 0.15)} 0%, ${alpha(mainColor, 0.05)} 100%)`;
  };

  const [appMode, setAppMode] = useState<string>('loading');

  useEffect(() => {
    if (myCap?.isGlobalSettingsAccess) {
      ticketSettingsApi.getGlobalConfig().then(setGlobalConfig).catch(() => { });
    }
    usersApi.getAppMode().then((res: any) => setAppMode(res.appMode || 'full')).catch(() => setAppMode('full'));
  }, [myCap?.isGlobalSettingsAccess]);

  const silentFetchDashboardData = useCallback(async () => {
    if (!user) return;
    if (!isRegularUser && myCap === null) return;

    try {
      if (isRegularUser) {
        try {
          const dashStats = await ticketsApi.getDashboardStats();
          setUserTicketStats(dashStats);
        } catch (err) {
          console.error('Failed to silently fetch user ticket stats:', err);
        }
        return;
      }

      if (isTechnicianAny && !isFullDashboard) return;

      const [
        docsResponse,
        metricsResult,
        incidentsResult,
        ticketStatsResult,
        kpiSummaryResult,
        userDashStatsResult,
      ] = await Promise.allSettled([
        documentsApi.listDocuments({ limit: 1000 }),
        cybersecurityApi.getAll(),
        incidentsApi.getTodayStats(),
        ticketsApi.getStatistics(),
        kpiApi.dashboardSummary(periodYear, periodMonth),
        ticketsApi.getDashboardStats(),
      ]);

      const docs = docsResponse.status === 'fulfilled' ? docsResponse.value.data : [];
      const totalDocsCount = docsResponse.status === 'fulfilled' ? docsResponse.value.total : docs.length;
      const compliant = docs.filter((d: any) => d.status === 'ready').length;
      const pending = docs.filter((d: any) => d.status === 'pending' || d.status === 'processing').length;

      if (metricsResult.status === 'fulfilled') setCyberMetrics(metricsResult.value);
      if (incidentsResult.status === 'fulfilled') setIncidentStats(incidentsResult.value);
      if (kpiSummaryResult.status === 'fulfilled') setKpiSummary(kpiSummaryResult.value);
      if (userDashStatsResult.status === 'fulfilled') setUserTicketStats(userDashStatsResult.value);

      setStats({
        totalDocuments: totalDocsCount,
        compliantDocuments: compliant,
        pendingDocuments: pending,
        openTickets: (ticketStatsResult.status === 'fulfilled' ? (ticketStatsResult.value as any)?.byStatus?.open : 0) || 0,
        recentDocuments: docs.slice(0, 5),
      });
    } catch (err) {
      console.error('Failed to silently fetch dashboard data:', err);
    }
  }, [user, myCap, isRegularUser, isTechnicianAny, isFullDashboard, periodYear, periodMonth]);

  useSse(['TICKET_UPDATED', 'INCIDENT_SNAPSHOT_CREATED'], silentFetchDashboardData);

  useEffect(() => {
    if (!user) return;
    // For staff/admins, wait until capabilities are loaded before fetching data
    if (!isRegularUser && myCap === null) return;
    
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

        // Technicians: tech stats are loaded by the dedicated useEffect above — no extra data needed
        // BUT if they are also full dashboard users, they need the extra data!
        if (isTechnicianAny && !isFullDashboard) return;

        // Staff / admin: full dashboard
        const [
          docsResponse,
          metricsResult,
          incidentsResult,
          ticketStatsResult,
          kpiSummaryResult,
          userDashStatsResult,
        ] = await Promise.allSettled([
          documentsApi.listDocuments({ limit: 1000 }),
          cybersecurityApi.getAll(),
          incidentsApi.getTodayStats(),
          ticketsApi.getStatistics(), // Fetch unfiltered stats for top cards
          kpiApi.dashboardSummary(periodYear, periodMonth),
          ticketsApi.getDashboardStats(),
        ]);

        const docs = docsResponse.status === 'fulfilled' ? docsResponse.value.data : [];
        const totalDocsCount =
          docsResponse.status === 'fulfilled' ? docsResponse.value.total : docs.length;
        const compliant = docs.filter((d: any) => d.status === 'ready').length;
        const pending = docs.filter(
          (d: any) => d.status === 'pending' || d.status === 'processing',
        ).length;

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
        if (userDashStatsResult.status === 'fulfilled') {
          setUserTicketStats(userDashStatsResult.value);
        }

        setStats({
          totalDocuments: totalDocsCount,
          compliantDocuments: compliant,
          pendingDocuments: pending,
          openTickets: (ticketStatsResult.status === 'fulfilled' ? (ticketStatsResult.value as any)?.byStatus?.open : 0) || 0,
          recentDocuments: docs.slice(0, 5), // Latest 5 documents
        });
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id, myCap, isRegularUser, isTechnicianAny, isFullDashboard, periodYear, periodMonth]);

  // Fetch IT Help Desk Overview stats when filters change
  useEffect(() => {
    if (!isFullDashboard) return;
    setItStatsLoading(true);
    const filters: any = {};
    if (itStatsMode === 'year') {
      filters.year = itStatsYear;
    } else if (itStatsMode === 'semester') {
      filters.year = itStatsYear;
      filters.semester = itStatsSemester;
    } else if (itStatsMode === 'quarter') {
      filters.year = itStatsYear;
      filters.quarter = itStatsQuarter;
    } else if (itStatsMode === 'month') {
      filters.year = itStatsYear;
      filters.month = itStatsMonth;
    }
    
    ticketsApi.getStatistics(filters)
      .then((data: any) => {
        setTicketMetrics(data);
      })
      .catch((err) => {
        console.error('Failed to fetch IT Help Desk stats:', err);
      })
      .finally(() => {
        setItStatsLoading(false);
      });
  }, [isFullDashboard, itStatsMode, itStatsYear, itStatsSemester, itStatsQuarter, itStatsMonth]);

  useEffect(() => {
    if (!isRegularUser) return;
    const pendingCount = userTicketStats?.pendingSatisfactionTickets?.length ?? 0;
    // Suppress the reminder if the user is forced to change their password
    if (pendingCount > 0 && !user?.requiresPasswordChange) {
      setPendingSatReminderOpen(true);
    }
  }, [isRegularUser, userTicketStats, user?.requiresPasswordChange]);

  // Fetch monthly assigned-ticket stats for technicians whenever period changes
  useEffect(() => {
    if (!isTechnicianAny || !user?.id) return;
    setTechStatsLoading(true);
    ticketsApi
      .getAssignedStats(techStatsYear, techStatsMonth)
      .then((data) => setTechAssignedStats(data))
      .catch(() => { })
      .finally(() => setTechStatsLoading(false));
  }, [isTechnicianAny, user?.id, techStatsYear, techStatsMonth]);



  if (loading || appMode === 'loading') {
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
    const pendingCount = s?.pendingSatisfactionTickets?.length ?? 0;

    return (
      <Box>
        <Dialog
          open={pendingSatReminderOpen}
          onClose={() => setPendingSatReminderOpen(false)}
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
            <Button onClick={() => setPendingSatReminderOpen(false)}>Close</Button>
            <Button
              variant="contained"
              color="warning"
              onClick={() => {
                setPendingSatReminderOpen(false);
                router.push('/operations/tickets?filter=pending_satisfaction');
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
                  onClick={() => router.push('/operations/tickets?filter=pending_satisfaction')}
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
                onClick={() => router.push('/operations/tickets')}
              >
                My Tickets
              </Button>
              {pendingCount > 0 && (
                <Button
                  variant="outlined"
                  fullWidth
                  color="warning"
                  startIcon={<StarIcon />}
                  onClick={() => router.push('/operations/tickets?filter=pending_satisfaction')}
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
  const complianceRate =
    stats.totalDocuments > 0
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
          Welcome back, {user?.firstName || user?.email}!
        </Typography>
      </Box>

      {/* Technician Personal Assignment Stats */}
      {isTechnicianAny && appMode !== 'compliance_only' && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              gap={2}
              mb={2}
              flexWrap="wrap"
            >
              <Box display="flex" alignItems="center" gap={2}>
                <AssignedIcon color="primary" fontSize="large" />
                <Box>
                  <Typography variant="h6">My Assigned Tickets</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Monthly statistics for tickets assigned to you
                  </Typography>
                </Box>
              </Box>
              <Stack direction="row" spacing={1}>
                <TextField
                  select
                  size="small"
                  label="Month"
                  value={techStatsMonth}
                  onChange={(e) => setTechStatsMonth(Number(e.target.value))}
                  sx={{ minWidth: 110 }}
                  SelectProps={{ MenuProps: { disableScrollLock: true } }}
                >
                  {[
                    'January',
                    'February',
                    'March',
                    'April',
                    'May',
                    'June',
                    'July',
                    'August',
                    'September',
                    'October',
                    'November',
                    'December',
                  ].map((m, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      {m}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Year"
                  value={techStatsYear}
                  onChange={(e) => setTechStatsYear(Number(e.target.value))}
                  sx={{ minWidth: 90 }}
                  SelectProps={{ MenuProps: { disableScrollLock: true } }}
                >
                  {yearOptions.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Box>
            {techStatsLoading ? (
              <Box textAlign="center" py={3}>
                <CircularProgress size={24} />
              </Box>
            ) : techAssignedStats ? (
              <>
                <Grid container spacing={2} mb={1}>
                  {(
                    [
                      {
                        label: 'Assigned',
                        value: techAssignedStats.assigned,
                        color: 'warning' as const,
                        Icon: TicketIcon,
                      },
                      {
                        label: 'In Progress',
                        value: techAssignedStats.inProgress,
                        color: 'primary' as const,
                        Icon: InProgressIcon,
                      },
                      {
                        label: 'Resolved',
                        value: techAssignedStats.resolved,
                        color: 'success' as const,
                        Icon: ResolvedIcon,
                      },
                      {
                        label: 'Closed',
                        value: techAssignedStats.closed,
                        color: 'default' as const,
                        Icon: ClosedIcon,
                      },
                    ] as const
                  ).map(({ label, value, color, Icon }) => (
                    <Grid item xs={6} sm={3} key={label}>
                      <Card
                        sx={{
                          borderRadius: 3,
                          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : `0 4px 20px ${alpha((theme.palette as any)[color]?.main || '#9e9e9e', 0.15)}`,
                          background: getGradient(color),
                          textAlign: 'center',
                        }}
                      >
                        <CardContent>
                        <Icon color={color === 'default' ? 'action' : color} fontSize="large" />
                        <Typography
                          variant="h4"
                          color={color === 'default' ? 'text.secondary' : `${color}.main`}
                          mt={1}
                        >
                          {value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {label}
                        </Typography>
                      </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                <Box display="flex" gap={4} mt={1} flexWrap="wrap">
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Total this month
                    </Typography>
                    <Typography variant="h6">{techAssignedStats.total}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Total Resolved & Closed
                    </Typography>
                    <Typography variant="h6">
                      {techAssignedStats.resolved + techAssignedStats.closed}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {techAssignedStats.ratedCount} of{' '}
                      {techAssignedStats.resolved + techAssignedStats.closed} tickets have rating
                    </Typography>
                  </Box>
                  {techAssignedStats.satisfactionAvg !== null && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Avg. Satisfaction
                      </Typography>
                      <Typography variant="h6" color="warning.main">
                        {techAssignedStats.satisfactionAvg} / 5 ⭐
                      </Typography>
                    </Box>
                  )}
                </Box>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" py={2} textAlign="center">
                No assigned tickets for this period.
              </Typography>
            )}


          </CardContent>
        </Card>
      )}

      {/* Main Stats — hidden for all technicians */}
      {!isTechnicianAny && (
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


          {isFullDashboard && appMode !== 'ticketing_only' && (
            <Grid item xs={12} md={6} lg={3}>
              <Card
                sx={{
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 4 },
                }}
                onClick={() => (window.location.href = '/governance/incidents')}
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
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mt: 0.5 }}
                        >
                          +{incidentStats.addedToday} today
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {isFullDashboard && appMode !== 'compliance_only' && (
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
                        Open Tickets
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Incident Response Tracking — visible only to super_admin, CO, Section Head, and Cybersecurity Officer */}
      {(isFullDashboard || isSectionHead || isCybersecurityOfficer) && incidentStats && appMode !== 'ticketing_only' && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <BugIcon color="error" fontSize="large" />
              <Box>
                <Typography variant="h6">
                  Incident Response — {format(new Date(), 'EEEE, MMMM d, yyyy')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Start: {incidentStats.startCount} • Added: {incidentStats.addedToday} • Current:{' '}
                  {incidentStats.currentCount}
                </Typography>
              </Box>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : `0 4px 20px ${alpha((theme.palette as any)['info']?.main || '#9e9e9e', 0.15)}`,
                    background: getGradient('info'),
                    textAlign: 'center',
                  }}
                >
                  <CardContent>
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    Low Severity
                  </Typography>
                  <Typography variant="h5" color="info.main">
                    {incidentStats.severityBreakdown.low}
                  </Typography>
                </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : `0 4px 20px ${alpha((theme.palette as any)['warning']?.main || '#9e9e9e', 0.15)}`,
                    background: getGradient('warning'),
                    textAlign: 'center',
                  }}
                >
                  <CardContent>
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    Medium Severity
                  </Typography>
                  <Typography variant="h5" color="warning.main">
                    {incidentStats.severityBreakdown.medium}
                  </Typography>
                </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : `0 4px 20px ${alpha((theme.palette as any)['error']?.main || '#9e9e9e', 0.15)}`,
                    background: getGradient('error'),
                    textAlign: 'center',
                  }}
                >
                  <CardContent>
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    High Severity
                  </Typography>
                  <Typography variant="h5" color="error.main">
                    {incidentStats.severityBreakdown.high}
                  </Typography>
                </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : `0 4px 20px ${alpha((theme.palette as any)['error']?.main || '#9e9e9e', 0.15)}`,
                    background: getGradient('error'),
                    textAlign: 'center',
                  }}
                >
                  <CardContent>
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    Critical Severity
                  </Typography>
                  <Typography variant="h5" color="error.dark">
                    {incidentStats.severityBreakdown.critical}
                  </Typography>
                </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* IT Help Desk Metrics */}
      {isFullDashboard && ticketMetrics && appMode !== 'compliance_only' && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
              <Box display="flex" alignItems="center" gap={2}>
                <TicketIcon color="info" fontSize="large" />
                <Box>
                  <Typography variant="h6">IT Help Desk Overview</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total: {ticketMetrics.total} tickets • Resolved: {ticketMetrics.resolvedTickets}
                    {ticketMetrics.satisfactionAvg !== null &&
                      ` • Satisfaction: ${ticketMetrics.satisfactionAvg}/5`}
                  </Typography>
                </Box>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                {itStatsLoading && <CircularProgress size={20} />}
                <Select
                  size="small"
                  value={itStatsMode}
                  onChange={(e) => setItStatsMode(e.target.value as any)}
                  sx={{ width: 130 }}
                  MenuProps={{ disableScrollLock: true }}
                >
                  <MenuItem value="year">All Year</MenuItem>
                  <MenuItem value="semester">By Semester</MenuItem>
                  <MenuItem value="quarter">By Quarter</MenuItem>
                  <MenuItem value="month">By Month</MenuItem>
                </Select>

                {itStatsMode === 'semester' && (
                  <Select
                    size="small"
                    value={itStatsSemester}
                    onChange={(e) => setItStatsSemester(Number(e.target.value))}
                    sx={{ width: 100 }}
                    MenuProps={{ disableScrollLock: true }}
                  >
                    <MenuItem value={1}>1st Sem</MenuItem>
                    <MenuItem value={2}>2nd Sem</MenuItem>
                  </Select>
                )}

                {itStatsMode === 'quarter' && (
                  <Select
                    size="small"
                    value={itStatsQuarter}
                    onChange={(e) => setItStatsQuarter(Number(e.target.value))}
                    sx={{ width: 100 }}
                    MenuProps={{ disableScrollLock: true }}
                  >
                    <MenuItem value={1}>Q1</MenuItem>
                    <MenuItem value={2}>Q2</MenuItem>
                    <MenuItem value={3}>Q3</MenuItem>
                    <MenuItem value={4}>Q4</MenuItem>
                  </Select>
                )}

                {itStatsMode === 'month' && (
                  <Select
                    size="small"
                    value={itStatsMonth}
                    onChange={(e) => setItStatsMonth(Number(e.target.value))}
                    sx={{ width: 130 }}
                    MenuProps={{ disableScrollLock: true }}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <MenuItem key={i + 1} value={i + 1}>
                        {format(new Date(periodYear, i), 'MMMM')}
                      </MenuItem>
                    ))}
                  </Select>
                )}

                <Button variant="outlined" size="small" href="/operations/tickets">
                  View All Tickets
                </Button>
              </Box>
            </Box>

            {/* Status Breakdown */}
            <Grid container spacing={2} mb={2}>
              {[
                { key: 'open', label: 'Open', color: 'warning' as const, Icon: TicketIcon },
                { key: 'assigned', label: 'Assigned', color: 'info' as const, Icon: AssignedIcon },
                {
                  key: 'in_progress',
                  label: 'In Progress',
                  color: 'primary' as const,
                  Icon: InProgressIcon,
                },
                {
                  key: 'resolved',
                  label: 'Resolved',
                  color: 'success' as const,
                  Icon: ResolvedIcon,
                },
                { key: 'closed', label: 'Closed', color: 'default' as const, Icon: ClosedIcon },
                { key: 'frozen', label: 'Frozen', color: 'info' as const, Icon: FrozenIcon },
                { key: 'duplicate', label: 'Duplicate', color: 'error' as const, Icon: DuplicateIcon },
              ].map(({ key, label, color, Icon }) => (
                <Grid item xs={6} sm={4} md={3} key={key}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : `0 4px 20px ${alpha((theme.palette as any)[color]?.main || '#9e9e9e', 0.15)}`,
                      background: getGradient(color),
                      textAlign: 'center',
                    }}
                  >
                    <CardContent sx={{ p: '12px !important' }}>
                    <Icon color={color === 'default' ? 'action' : color} fontSize="small" />
                    <Typography
                      variant="h5"
                      color={color === 'default' ? 'text.secondary' : (color === 'info' && key === 'frozen' ? 'info.light' : `${color}.main`)}
                      mt={0.5}
                    >
                      {ticketMetrics.byStatus[key] ?? 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {label}
                    </Typography>
                  </CardContent>
                  </Card>
                </Grid>
              ))}
              <Grid item xs={6} sm={4} md={3}>
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : `0 4px 20px ${alpha(theme.palette.warning.main, 0.15)}`,
                    background: getGradient('warning'),
                    textAlign: 'center',
                  }}
                >
                  <CardContent sx={{ p: '12px !important' }}>
                  <StarIcon color="warning" fontSize="small" />
                  <Typography variant="h5" color="warning.main" mt={0.5}>
                    {ticketMetrics.satisfactionAvg !== null
                      ? `${ticketMetrics.satisfactionAvg}`
                      : '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Satisfaction
                  </Typography>
                </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Type Breakdown */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    border: 1,
                    borderColor: 'info.main',
                  }}
                >
                  <ItSupportIcon color="info" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      IT Support
                    </Typography>
                    <Typography variant="h6" color="info.main">
                      {ticketMetrics.byType['it_support'] ?? 0} tickets
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    border: 1,
                    borderColor: 'success.main',
                  }}
                >
                  <DesktopIcon color="success" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Desktop Support
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {ticketMetrics.byType['desktop_support'] ?? 0} tickets
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    border: 1,
                    borderColor: 'warning.main',
                  }}
                >
                  <TicketIcon color="warning" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Pantawid ICT Support
                    </Typography>
                    <Typography variant="h6" color="warning.main">
                      {ticketMetrics.byType['pantawid_ict_support'] ?? 0} tickets
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            {ticketMetrics.satisfactionFillRate > 0 && (
              <Box mt={2}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2" color="text.secondary">
                    Satisfaction fill rate
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {ticketMetrics.satisfactionFillRate}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(ticketMetrics.satisfactionFillRate, 100)}
                  color={
                    ticketMetrics.satisfactionFillRate >= 80
                      ? 'success'
                      : ticketMetrics.satisfactionFillRate >= 50
                        ? 'warning'
                        : 'error'
                  }
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {myCap?.isTicketSettingsFocal && slaSummary && appMode !== 'compliance_only' && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Active Tickets SLA Dashboard
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card
                  sx={{
                    boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : '0 4px 20px rgba(211, 47, 47, 0.15)',
                    background: isDark
                      ? `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.2)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`
                      : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  
                  <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                      <ErrorIcon color={isDark ? 'error' : 'error'} />
                      <Typography color={isDark ? 'error.light' : 'error.dark'} variant="subtitle2" fontWeight={600} textTransform="uppercase" letterSpacing={1}>
                        Breached / Overdue
                      </Typography>
                    </Stack>
                    <Typography variant="h2" color={isDark ? 'error.light' : 'error.dark'} fontWeight={800}>
                      {slaSummary.breached}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : '0 4px 20px rgba(237, 108, 2, 0.15)',
                    background: isDark
                      ? `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.2)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`
                      : 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  
                  <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                      <WarningIcon color={isDark ? 'warning' : 'warning'} />
                      <Typography color={isDark ? 'warning.light' : 'warning.dark'} variant="subtitle2" fontWeight={600} textTransform="uppercase" letterSpacing={1}>
                        Nearing Breach
                      </Typography>
                    </Stack>
                    <Typography variant="h2" color={isDark ? 'warning.light' : 'warning.dark'} fontWeight={800}>
                      {slaSummary.nearing}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : '0 4px 20px rgba(46, 125, 50, 0.15)',
                    background: isDark
                      ? `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.2)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`
                      : 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  
                  <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                      <CompliantIcon color={isDark ? 'success' : 'success'} />
                      <Typography color={isDark ? 'success.light' : 'success.dark'} variant="subtitle2" fontWeight={600} textTransform="uppercase" letterSpacing={1}>
                        On Track
                      </Typography>
                    </Stack>
                    <Typography variant="h2" color={isDark ? 'success.light' : 'success.dark'} fontWeight={800}>
                      {slaSummary.onTrack}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Cybersecurity Metrics */}
      {isFullDashboard && appMode !== 'ticketing_only' && (
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
                const color =
                  metric.status === 'compliant'
                    ? 'success'
                    : metric.status === 'warning'
                      ? 'warning'
                      : metric.status === 'non_compliant'
                        ? 'error'
                        : 'info';

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
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mt: 0.5 }}
                        >
                          {metric.details}
                        </Typography>
                      )}
                      <Box mt={1}>
                        <Chip
                          label={
                            metric.status === 'compliant'
                              ? 'Compliant'
                              : metric.status === 'warning'
                                ? 'Needs Attention'
                                : metric.status === 'non_compliant'
                                  ? 'Non-Compliant'
                                  : 'Unknown'
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
      )}

      {/* Compliance Management Metrics */}
      {isFullDashboard && appMode !== 'ticketing_only' && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Box>
                <Typography variant="h6">KPI Overview</Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.role === 'super_admin' || isComplianceOfficer
                    ? 'Consolidated KPI visibility across all units.'
                    : 'KPI visibility scoped to your assigned unit(s).'}
                </Typography>
              </Box>
              <Button variant="outlined" href="/governance/kpi">
                Open KPI Workspace
              </Button>
            </Box>

            <Grid container spacing={2} mb={2}>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Overall KPI Score
                  </Typography>
                  <Typography variant="h5" color="primary">
                    {kpiSummary?.summary.overallScore ?? 0}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Units Covered
                  </Typography>
                  <Typography variant="h5">{kpiSummary?.summary.unitCount ?? 0}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Monitoring Rows
                  </Typography>
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
      )}

      {/* Recent Documents and Compliance Overview — CO / super_admin only */}
      {isFullDashboard && appMode !== 'ticketing_only' && (
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
                      <Chip label={stats.compliantDocuments} color="success" size="small" />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">Pending:</Typography>
                      <Chip label={stats.pendingDocuments} color="warning" size="small" />
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Staff / Technician Quick Actions */}
      {!isRegularUser && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box display="flex" flexDirection="column" gap={2} mt={2}>
                  {isFullDashboard && appMode !== 'ticketing_only' && (
                    <>
                      <Button variant="contained" href="/governance/documents/upload" fullWidth>
                        Upload Document
                      </Button>
                      <Button variant="outlined" href="/governance/issuances" fullWidth>
                        View Issuances
                      </Button>
                    </>
                  )}
                  {appMode !== 'compliance_only' && (
                    <Button variant="outlined" href="/operations/tickets" fullWidth>
                      View Tickets
                    </Button>
                  )}

                  {/* Technician Pause / Resume */}
                  {user?.role !== 'user' && appMode !== 'compliance_only' && (
                    <>
                      <Button
                        variant="outlined"
                        color="warning"
                        disabled={!isClockOutEnabled}
                        onClick={async () => {
                          try {
                            const res = await ticketsApi.technicianPause();
                            enqueueSnackbar(res.message, { variant: 'success' });
                            window.location.reload();
                          } catch (e) { enqueueSnackbar('Failed to pause', { variant: 'error' }); }
                        }}
                        fullWidth
                      >
                        Clock Out (Pause My Tickets)
                      </Button>

                      {showDebugClockout && (
                        <Button
                          variant="text"
                          color="error"
                          size="small"
                          onClick={async () => {
                            try {
                              const res = await ticketsApi.technicianPause();
                              enqueueSnackbar(res.message, { variant: 'success' });
                              window.location.reload();
                            } catch (e) { enqueueSnackbar('Failed to pause', { variant: 'error' }); }
                          }}
                          fullWidth
                        >
                          Clock Out (Debug Bypass)
                        </Button>
                      )}

                      {user?.role === 'super_admin' && (
                        <Button
                          variant="text"
                          color="secondary"
                          size="small"
                          onClick={() => setShowDebugClockout(!showDebugClockout)}
                          fullWidth
                        >
                          {showDebugClockout ? 'Hide Clockout Bypass' : 'Show Clockout Bypass'}
                        </Button>
                      )}
                    </>
                  )}

                  {/* Global Pause / Resume (Settings Focals only) */}
                  {(!!myCap?.isTicketSettingsFocal || user?.role === 'super_admin') && (
                    <>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={async () => {
                          try {
                            const res = await ticketsApi.globalPause();
                            enqueueSnackbar(res.message, { variant: 'success' });
                            window.location.reload();
                          } catch (e) { enqueueSnackbar('Failed to globally pause', { variant: 'error' }); }
                        }}
                        fullWidth
                      >
                        Global Pause (Flag Ceremony)
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={async () => {
                          try {
                            const res = await ticketsApi.globalResume();
                            enqueueSnackbar(res.message, { variant: 'success' });
                            window.location.reload();
                          } catch (e) { enqueueSnackbar('Failed to globally resume', { variant: 'error' }); }
                        }}
                        fullWidth
                      >
                        Global Resume
                      </Button>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
