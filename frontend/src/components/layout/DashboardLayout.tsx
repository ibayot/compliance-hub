'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import Sidebar from './Sidebar';
import AppBar from './AppBar';
import EnvironmentOverlay from './EnvironmentOverlay';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { PageTitleProvider } from '@/contexts/PageTitleContext';
import { useServiceAvailability } from '@/lib/utils/useServiceAvailability';
import { useAuth } from '@/contexts/AuthContext';
import { useSse } from '@/lib/utils/useSse';
import {
  AttendanceAssignmentAlert,
  ticketsApi,
} from '@/app/api/references';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <PageTitleProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </PageTitleProvider>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { drawerWidth } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user, myCap, isSessionLocked, requiresPasswordChange } = useAuth();
  const { services, loaded } = useServiceAvailability();
  const [attendanceAlerts, setAttendanceAlerts] = useState<AttendanceAssignmentAlert[]>([]);
  const [attendanceAlertOpen, setAttendanceAlertOpen] = useState(false);
  const [reassigningUserId, setReassigningUserId] = useState<number | null>(null);
  const nextAttendancePromptAt = useRef(0);
  const attendanceReminderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attendanceSseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attendanceRequestId = useRef(0);
  const canManageTicketAssignments = Boolean(
    myCap?.isTicketFocal || myCap?.isTicketSettingsFocal,
  );

  const refreshAttendanceAlerts = useCallback(async (forcePrompt = false) => {
    if (
      !user ||
      !canManageTicketAssignments ||
      isSessionLocked ||
      requiresPasswordChange
    ) {
      attendanceRequestId.current += 1;
      setAttendanceAlerts([]);
      setAttendanceAlertOpen(false);
      return;
    }

    try {
      const requestId = ++attendanceRequestId.current;
      const alerts = await ticketsApi.getAttendanceAssignmentAlerts();
      if (requestId !== attendanceRequestId.current) return;
      setAttendanceAlerts(alerts);
      if (alerts.length === 0) {
        setAttendanceAlertOpen(false);
      } else if (forcePrompt || Date.now() >= nextAttendancePromptAt.current) {
        setAttendanceAlertOpen(true);
      }
    } catch {
      // This background check must never interrupt normal navigation.
    }
  }, [canManageTicketAssignments, isSessionLocked, requiresPasswordChange, user]);

  useEffect(() => {
    void refreshAttendanceAlerts();
    const interval = window.setInterval(() => {
      void refreshAttendanceAlerts();
    }, 5 * 60 * 1000);
    return () => {
      window.clearInterval(interval);
      if (attendanceReminderTimer.current) clearTimeout(attendanceReminderTimer.current);
      if (attendanceSseTimer.current) clearTimeout(attendanceSseTimer.current);
    };
  }, [refreshAttendanceAlerts]);

  useSse(['ATTENDANCE_UPDATED', 'TICKET_UPDATED'], () => {
    if (attendanceSseTimer.current) clearTimeout(attendanceSseTimer.current);
    attendanceSseTimer.current = setTimeout(() => {
      attendanceSseTimer.current = null;
      void refreshAttendanceAlerts();
    }, 750);
  });

  const scheduleFiveMinuteReminder = () => {
    nextAttendancePromptAt.current = Date.now() + 5 * 60 * 1000;
    if (attendanceReminderTimer.current) clearTimeout(attendanceReminderTimer.current);
    attendanceReminderTimer.current = setTimeout(() => {
      attendanceReminderTimer.current = null;
      void refreshAttendanceAlerts(true);
    }, 5 * 60 * 1000);
  };

  const handleManualReassignment = (alert: AttendanceAssignmentAlert) => {
    scheduleFiveMinuteReminder();
    setAttendanceAlertOpen(false);
    const firstTicket = alert.tickets[0];
    navigate(firstTicket ? `/operations/tickets/${firstTicket.id}` : '/operations/tickets');
  };

  const handleAutomaticReassignment = async (alert: AttendanceAssignmentAlert) => {
    setReassigningUserId(alert.userId);
    try {
      const result = await ticketsApi.autoReassignAttendanceAlertTickets(alert.userId);
      const message = result.remaining > 0
        ? `${result.reassigned} ticket(s) reassigned; ${result.remaining} still need manual reassignment.`
        : `${result.reassigned} ticket(s) reassigned successfully.`;
      enqueueSnackbar(message, { variant: result.remaining > 0 ? 'warning' : 'success' });
      if (result.messages.length > 0) {
        enqueueSnackbar(result.messages.join(' '), { variant: 'warning' });
      }
      await refreshAttendanceAlerts(true);
    } catch (error: any) {
      enqueueSnackbar(
        error?.response?.data?.message || 'Automatic reassignment failed. Please reassign the tickets manually.',
        { variant: 'error' },
      );
    } finally {
      setReassigningUserId(null);
    }
  };

  const compliancePaths = [
    '/governance/documents',
    '/governance/repository',
    '/governance/issuances',
    '/governance/metrics',
    '/governance/kpi',
    '/governance/reviews',
    '/governance/reports',
    '/governance/mov',
  ];
  const isComplianceRoute = compliancePaths.some(
    (p) => location.pathname === p || location.pathname.startsWith(`${p}/`),
  );
  const showComplianceUnavailable = isComplianceRoute && loaded && services.compliance === false;
  const isComplianceLoading = isComplianceRoute && !loaded;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <EnvironmentOverlay />
      <Dialog
        open={attendanceAlertOpen && attendanceAlerts.length > 0}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle>Assigned tickets need attention</DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>
            The following RICTMS staff are absent, late, or have no attendance record and still
            have Assigned or In Progress tickets. Choose automatic reassignment or review the
            tickets and reassign them manually.
          </Alert>
          <Stack spacing={2} divider={<Divider flexItem />}>
            {attendanceAlerts.map((alert) => (
              <Box key={alert.userId}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography fontWeight={700}>{alert.staffName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {alert.role.replaceAll('_', ' ')} · {alert.tickets.length} active ticket(s)
                    </Typography>
                  </Box>
                  <Chip
                    label={alert.attendanceLabel}
                    color={alert.attendanceState === 'absent' ? 'error' : 'warning'}
                    size="small"
                  />
                </Stack>
                <Stack spacing={0.5} sx={{ my: 1.5 }}>
                  {alert.tickets.map((ticket) => (
                    <Typography key={ticket.id} variant="body2">
                      {ticket.ticketNumber} — {ticket.subject} ({ticket.status.replaceAll('_', ' ')})
                    </Typography>
                  ))}
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    variant="contained"
                    onClick={() => void handleAutomaticReassignment(alert)}
                    disabled={reassigningUserId !== null}
                  >
                    {reassigningUserId === alert.userId ? 'Reassigning…' : 'Automatically Reassign'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => handleManualReassignment(alert)}
                    disabled={reassigningUserId !== null}
                  >
                    Review and Reassign Manually
                  </Button>
                </Stack>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              scheduleFiveMinuteReminder();
              setAttendanceAlertOpen(false);
            }}
          >
            Remind me in 5 minutes
          </Button>
        </DialogActions>
      </Dialog>
      {/* App Bar */}
      <AppBar onMenuClick={handleDrawerToggle} />

      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          bgcolor: 'background.default',
          minHeight: '100vh',
          transition: (theme) =>
            theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
        }}
      >
        {/* Toolbar spacing */}
        <Toolbar />

        {/* Page content with 90% width */}
        <Box
          sx={{
            width: '90%',
            mx: 'auto',
            py: 4,
          }}
        >
          {isComplianceLoading ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress size={24} />
              <Typography variant="body2" color="text.secondary" mt={1}>
                Checking service availability...
              </Typography>
            </Paper>
          ) : showComplianceUnavailable ? (
            <Paper sx={{ p: 3 }}>
              <Alert severity="warning">
                Service currently unavailable. Please try again later.
              </Alert>
            </Paper>
          ) : (
            children
          )}
        </Box>
      </Box>
    </Box>
  );
}
