import { Component, lazy, Suspense, useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import type { RoleCapabilityRecord } from '@/lib/api/users';
import { usersApi } from '@/lib/api/users';
import {
  DEFAULT_APP_APPEARANCE,
  normalizeAppAppearance,
} from '@/lib/appearance';
import { useThemeMode } from '@/contexts/ThemeModeContext';

const HomePage = lazy(() => import('@/app/page'));
const LoginPage = lazy(() => import('@/app/login/page'));
const MfaVerifyPage = lazy(() => import('@/app/mfa-verify/page'));
const DashboardPage = lazy(() => import('@/app/(app)/dashboard/page'));
const DocumentsPage = lazy(() => import('@/app/(app)/governance/documents/page'));
const DocumentUploadPage = lazy(() => import('@/app/(app)/governance/documents/upload/page'));
const DocumentDetailPage = lazy(() => import('@/app/(app)/governance/documents/[id]/page'));
const IncidentsPage = lazy(() => import('@/app/(app)/governance/incidents/page'));
const IssuancesPage = lazy(() => import('@/app/(app)/governance/issuances/page'));
const TicketsPage = lazy(() => import('@/app/(app)/operations/tickets/page'));
const TicketDetailPage = lazy(() => import('@/app/(app)/operations/tickets/[id]/page'));
const UnitsPage = lazy(() => import('@/app/(app)/admin/units/page'));
const StaffDirectoryPage = lazy(() => import('@/app/(app)/operations/staff-directory/page'));
const MetricsPage = lazy(() => import('@/app/(app)/governance/metrics/page'));
const ReviewsPage = lazy(() => import('@/app/(app)/governance/reviews/page'));
const KpiPage = lazy(() => import('@/app/(app)/governance/kpi/page'));
const SettingsPage = lazy(() => import('@/app/(app)/admin/settings/page'));
const UserManualPage = lazy(() => import('@/app/(app)/admin/user-manual/page'));
const RepositoryPage = lazy(() => import('@/app/(app)/governance/repository/page'));
const ReportsPage = lazy(() => import('@/app/(app)/governance/reports/page'));
const MovPlannerPage = lazy(() => import('@/app/(app)/governance/mov/page'));
const TicketSettingsPage = lazy(() => import('@/app/(app)/operations/settings/page'));
const AttendancePage = lazy(() => import('@/app/(app)/admin/attendance/page'));
const TicketReportsPage = lazy(() => import('@/app/(app)/operations/reports/page'));
const KnowledgeBasePage = lazy(() => import('@/app/(app)/operations/knowledge-base/page'));
const AuditLogsPage = lazy(() => import('@/app/(app)/admin/audit-logs/page'));
const DutiesPage = lazy(() => import('@/app/(app)/operations/duties/page'));
const ChangelogManagementPage = lazy(() => import('@/app/(app)/admin/changelog/page'));
const PublicRatingPage = lazy(() => import('@/app/rate/page'));

function ProtectedDashboard({
  children,
  requiredCapability,
}: {
  children: React.ReactNode;
  requiredCapability?: keyof RoleCapabilityRecord | Array<keyof RoleCapabilityRecord>;

}) {
  const { isAuthenticated, loading, myCap, reconnecting, retrySession, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" gap={2} justifyContent="center" alignItems="center" minHeight="100vh" p={3} role="status">
        <CircularProgress aria-label={reconnecting ? 'Reconnecting' : 'Checking session'} />
        {reconnecting && <>
          <Typography variant="h6">Reconnecting to the application</Typography>
          <Typography color="text.secondary" textAlign="center">The server is temporarily unavailable. We will retry without signing you out.</Typography>
          <Button variant="contained" onClick={retrySession}>Retry now</Button>
          <Button onClick={() => void logout()}>Sign out</Button>
        </>}
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ returnTo: location.pathname + location.search + location.hash }} />;
  }

  // Deep linking allowed

  const capabilityKeys = requiredCapability
    ? Array.isArray(requiredCapability)
      ? requiredCapability
      : [requiredCapability]
    : [];
  const hasCapability =
    capabilityKeys.length === 0 || capabilityKeys.some((key) => Boolean(myCap?.[key]));
  const isAllowed = hasCapability;

  return (
    <DashboardLayout>
      <RouteLoadErrorBoundary key={location.pathname}>
        <Suspense fallback={<PageLoadingFallback />}>
          {isAllowed ? children : <RouteNotice denied />}
        </Suspense>
      </RouteLoadErrorBoundary>
    </DashboardLayout>
  );
}

function PageLoadingFallback() {
  return (
    <Box
      role="status"
      aria-live="polite"
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap={1.5}
      minHeight="55vh"
      color="text.secondary"
    >
      <CircularProgress size={24} aria-label="Loading page" />
      <Typography variant="body2">Loading page…</Typography>
    </Box>
  );
}

class RouteLoadErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          role="alert"
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={1.5}
          minHeight="55vh"
          px={2}
          textAlign="center"
        >
          <Typography variant="h6">This page couldn’t load</Typography>
          <Typography color="text.secondary" maxWidth={440}>
            Check your connection, then reload the page. Your account session is not being cleared.
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

function TicketListEntry() {
  const { user } = useAuth();
  const location = useLocation();
  return user?.role === 'user'
    ? <Navigate to={`/operations/my-tickets${location.search}${location.hash}`} replace />
    : <TicketsPage />;
}

function RouteNotice({ denied = false }: { denied?: boolean }) {
  const { isAuthenticated } = useAuth();
  return (
    <Box display="flex" flexDirection="column" gap={1.5} alignItems="center" justifyContent="center" minHeight="45vh" px={2} textAlign="center">
      <Typography component="h1" variant="h5">{denied ? 'Page unavailable for your account' : 'Page not found'}</Typography>
      <Typography color="text.secondary" maxWidth={440}>
        {denied ? 'Your account doesn’t have access to this page. Contact your administrator if you need access.' : 'Check the link or choose another page.'}
      </Typography>
      <Button component={Link} to={isAuthenticated ? '/dashboard' : '/login'} variant="contained" replace>
        {isAuthenticated ? 'Go to Dashboard' : 'Go to Sign In'}
      </Button>
    </Box>
  );
}

function UnknownRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoadingFallback />;
  return isAuthenticated ? <ProtectedDashboard><RouteNotice /></ProtectedDashboard> : <RouteNotice />;
}

function AppearancePreferenceLoader() {
  const { user, loading } = useAuth();
  const { setAppearance, setAppearanceReady } = useThemeMode();

  useEffect(() => {
    if (loading) return;

    let active = true;
    if (!user) {
      setAppearanceReady(true);
      return () => {
        active = false;
      };
    }

    setAppearanceReady(false);
    usersApi
      .getUiPreferences()
      .then((stored) => {
        if (!active) return;
        setAppearance(stored ? normalizeAppAppearance(stored) : DEFAULT_APP_APPEARANCE);
      })
      .catch(() => {
        // An unavailable preference endpoint must not prevent a user from opening the app.
        if (active) setAppearance(DEFAULT_APP_APPEARANCE);
      })
      .finally(() => {
        if (active) setAppearanceReady(true);
      });

    return () => {
      active = false;
    };
  }, [loading, setAppearance, setAppearanceReady, user?.id]);

  return null;
}

export default function App() {
  const { pathname } = useLocation();
  return (
    <>
    <AppearancePreferenceLoader />
    <RouteLoadErrorBoundary key={pathname.startsWith('/admin/') || pathname.startsWith('/governance/') || pathname.startsWith('/operations/') || pathname === '/dashboard' ? 'application' : pathname}>
    <Suspense fallback={<PageLoadingFallback />}>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/mfa-verify" element={<MfaVerifyPage />} />
      <Route path="/rate" element={<PublicRatingPage />} />
      <Route path="/rate/:token" element={<PublicRatingPage />} />

      <Route
        path="/admin/changelog"
        element={<ProtectedDashboard requiredCapability="isChangelogManagement"><ChangelogManagementPage /></ProtectedDashboard>}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedDashboard>
            <DashboardPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/governance/documents"
        element={
          <ProtectedDashboard requiredCapability="isDocumentsAccess">
            <DocumentsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/governance/documents/upload"
        element={
          <ProtectedDashboard requiredCapability="isDocumentsAccess">
            <DocumentUploadPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/governance/documents/archived"
        element={<ProtectedDashboard requiredCapability="isDocumentsAccess"><Navigate to="/governance/documents?tab=archived" replace /></ProtectedDashboard>}
      />
      <Route
        path="/governance/documents/:id"
        element={
          <ProtectedDashboard requiredCapability="isDocumentsAccess">
            <DocumentDetailPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/governance/incidents"
        element={
          <ProtectedDashboard requiredCapability="isIncidentsAccess">
            <IncidentsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/governance/issuances"
        element={
          <ProtectedDashboard requiredCapability="isIssuancesAccess">
            <IssuancesPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/operations/tickets"
        element={
          <ProtectedDashboard requiredCapability="isTicketModuleAccess">
            <TicketListEntry />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/operations/my-assigned-tickets"
        element={
          <ProtectedDashboard>
            <TicketsPage restrictedAssignedOnly />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/operations/my-tickets"
        element={
          <ProtectedDashboard>
            <TicketsPage personalRequestedOnly />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/operations/tickets/:id"
        element={
          <ProtectedDashboard>
            <TicketDetailPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/admin/units"
        element={
          <ProtectedDashboard requiredCapability="isUnitsAccess">
            <UnitsPage />
          </ProtectedDashboard>
        }
      />
      <Route path="/operations/staff-directory" element={
        <ProtectedDashboard requiredCapability="isStaffDirectoryAccess"><StaffDirectoryPage /></ProtectedDashboard>
      } />
      <Route
        path="/governance/metrics"
        element={
          <ProtectedDashboard requiredCapability="isMetricsAccess">
            <MetricsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/governance/reviews"
        element={
          <ProtectedDashboard requiredCapability="isReviewsAccess">
            <ReviewsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/governance/kpi"
        element={
          <ProtectedDashboard requiredCapability="isKpiAccess">
            <KpiPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/admin/user-manual"
        element={
          <ProtectedDashboard>
            <UserManualPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedDashboard>
            <SettingsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/governance/repository"
        element={
          <ProtectedDashboard requiredCapability="isRepositoryAccess">
            <RepositoryPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/governance/reports"
        element={
          <ProtectedDashboard requiredCapability="isReportsAccess">
            <ReportsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/governance/mov"
        element={
          <ProtectedDashboard requiredCapability="isMovAccess">
            <MovPlannerPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/operations/settings"
        element={
          <ProtectedDashboard requiredCapability="isTicketSettingsFocal">
            <TicketSettingsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/admin/attendance"
        element={
          <ProtectedDashboard requiredCapability="isAttendanceAccess">
            <AttendancePage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/operations/reports"
        element={
          <ProtectedDashboard requiredCapability="isTicketReportsAccess">
            <TicketReportsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/operations/knowledge-base"
        element={
          <ProtectedDashboard requiredCapability="isTicketModuleAccess">
            <KnowledgeBasePage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/operations/duties"
        element={
          <ProtectedDashboard requiredCapability={['isDutyViewerAccess', 'isDutyAdminAccess']}>
            <DutiesPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedDashboard requiredCapability="isAuditAccess">
            <AuditLogsPage />
          </ProtectedDashboard>
        }
      />

      <Route path="*" element={<UnknownRoute />} />
    </Routes>
    </Suspense>
    </RouteLoadErrorBoundary>
    </>
  );
}
