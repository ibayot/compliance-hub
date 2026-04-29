import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Alert, Box, CircularProgress } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import type { RoleCapabilityRecord } from '@/lib/api/users';

import HomePage from '@/app/page';
import LoginPage from '@/app/login/page';
import DashboardPage from '@/app/dashboard/page';
import DocumentsPage from '@/app/dashboard/documents/page';
import DocumentUploadPage from '@/app/dashboard/documents/upload/page';
import DocumentDetailPage from '@/app/dashboard/documents/[id]/page';
import IncidentsPage from '@/app/dashboard/incidents/page';
import IssuancesPage from '@/app/dashboard/issuances/page';
import TicketsPage from '@/app/dashboard/tickets/page';
import TicketDetailPage from '@/app/dashboard/tickets/[id]/page';
import UnitsPage from '@/app/dashboard/units/page';
import MetricsPage from '@/app/dashboard/metrics/page';
import ReviewsPage from '@/app/dashboard/reviews/page';
import KpiPage from '@/app/dashboard/kpi/page';
import SettingsPage from '@/app/dashboard/settings/page';
import UserManualPage from '@/app/dashboard/user-manual/page';
import RepositoryPage from '@/app/dashboard/repository/page';
import ReportsPage from '@/app/dashboard/reports/page';
import MovPlannerPage from '@/app/dashboard/mov/page';
import TicketSettingsPage from '@/app/dashboard/ticket-settings/page';
import AttendancePage from '@/app/dashboard/attendance/page';
import TicketReportsPage from '@/app/dashboard/ticket-reports/page';

function ProtectedDashboard({
  children,
  requiredCapability,
  allowedRoles,
}: {
  children: React.ReactNode;
  requiredCapability?: keyof RoleCapabilityRecord;
  allowedRoles?: string[];
}) {
  const { isAuthenticated, loading, user, myCap } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  const isSuperAdmin = user?.role === 'super_admin';
  const hasCapability = requiredCapability ? Boolean(myCap?.[requiredCapability]) : true;
  const hasRoleAccess = allowedRoles ? Boolean(user?.role && allowedRoles.includes(user.role)) : true;
  const isAllowed = isSuperAdmin || (requiredCapability ? hasCapability : true) && hasRoleAccess;

  if (!isAllowed) {
    return (
      <DashboardLayout>
        <Box p={4}>
          <Alert severity="warning">You do not have access to this feature.</Alert>
        </Box>
      </DashboardLayout>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedDashboard>
            <DashboardPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/documents"
        element={
          <ProtectedDashboard requiredCapability="isDocumentsAccess">
            <DocumentsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/documents/upload"
        element={
          <ProtectedDashboard requiredCapability="isDocumentsAccess">
            <DocumentUploadPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/documents/:id"
        element={
          <ProtectedDashboard requiredCapability="isDocumentsAccess">
            <DocumentDetailPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/incidents"
        element={
          <ProtectedDashboard>
            <IncidentsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/issuances"
        element={
          <ProtectedDashboard requiredCapability="isIssuancesAccess">
            <IssuancesPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/tickets"
        element={
          <ProtectedDashboard>
            <TicketsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/tickets/:id"
        element={
          <ProtectedDashboard>
            <TicketDetailPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/units"
        element={
          <ProtectedDashboard allowedRoles={['super_admin', 'section_head']}>
            <UnitsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/metrics"
        element={
          <ProtectedDashboard requiredCapability="isMetricsAccess">
            <MetricsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/reviews"
        element={
          <ProtectedDashboard requiredCapability="isReviewsAccess">
            <ReviewsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/kpi"
        element={
          <ProtectedDashboard requiredCapability="isKpiAccess">
            <KpiPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/user-manual"
        element={
          <ProtectedDashboard>
            <UserManualPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/settings"
        element={
          <ProtectedDashboard allowedRoles={['super_admin', 'compliance_officer', 'cybersec', 'infosec', 'section_head', 'desktop_sr', 'it_support_sr', 'pantawid_ict']}>
            <SettingsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/repository"
        element={
          <ProtectedDashboard requiredCapability="isRepositoryAccess">
            <RepositoryPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/reports"
        element={
          <ProtectedDashboard requiredCapability="isReportsAccess">
            <ReportsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/mov"
        element={
          <ProtectedDashboard requiredCapability="isMovAccess">
            <MovPlannerPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/ticket-settings"
        element={
          <ProtectedDashboard requiredCapability="isTicketSettingsFocal">
            <TicketSettingsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/attendance"
        element={
          <ProtectedDashboard requiredCapability="isAttendanceAccess">
            <AttendancePage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/ticket-reports"
        element={
          <ProtectedDashboard>
            <TicketReportsPage />
          </ProtectedDashboard>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
