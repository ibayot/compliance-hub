import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Alert, Box, CircularProgress } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import type { RoleCapabilityRecord } from '@/lib/api/users';

import HomePage from '@/app/page';
import LoginPage from '@/app/login/page';
import MfaVerifyPage from '@/app/mfa-verify/page';
import DashboardPage from '@/app/(app)/dashboard/page';
import DocumentsPage from '@/app/(app)/governance/documents/page';
import DocumentUploadPage from '@/app/(app)/governance/documents/upload/page';
import DocumentDetailPage from '@/app/(app)/governance/documents/[id]/page';
import IncidentsPage from '@/app/(app)/governance/incidents/page';
import IssuancesPage from '@/app/(app)/governance/issuances/page';
import TicketsPage from '@/app/(app)/operations/tickets/page';
import TicketDetailPage from '@/app/(app)/operations/tickets/[id]/page';
import UnitsPage from '@/app/(app)/admin/units/page';
import MetricsPage from '@/app/(app)/governance/metrics/page';
import ReviewsPage from '@/app/(app)/governance/reviews/page';
import KpiPage from '@/app/(app)/governance/kpi/page';
import SettingsPage from '@/app/(app)/admin/settings/page';
import UserManualPage from '@/app/(app)/admin/user-manual/page';
import RepositoryPage from '@/app/(app)/governance/repository/page';
import ReportsPage from '@/app/(app)/governance/reports/page';
import MovPlannerPage from '@/app/(app)/governance/mov/page';
import TicketSettingsPage from '@/app/(app)/operations/settings/page';
import AttendancePage from '@/app/(app)/admin/attendance/page';
import TicketReportsPage from '@/app/(app)/operations/reports/page';
import KnowledgeBasePage from '@/app/(app)/operations/knowledge-base/page';
import AuditLogsPage from '@/app/(app)/admin/audit-logs/page';

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
    return <Navigate to="/login" replace />;
  }

  // Deep linking allowed

  const hasCapability = requiredCapability ? Boolean(myCap?.[requiredCapability]) : true;
  const hasRoleAccess = allowedRoles
    ? Boolean(user?.role && allowedRoles.includes(user.role))
    : true;
  const isAllowed = (requiredCapability ? hasCapability : true) && hasRoleAccess;

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
      <Route path="/mfa-verify" element={<MfaVerifyPage />} />

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
          <ProtectedDashboard>
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
          <ProtectedDashboard>
            <TicketsPage />
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
          <ProtectedDashboard allowedRoles={['super_admin', 'section_head']}>
            <UnitsPage />
          </ProtectedDashboard>
        }
      />
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
          <ProtectedDashboard>
            <TicketReportsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/operations/knowledge-base"
        element={
          <ProtectedDashboard>
            <KnowledgeBasePage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedDashboard allowedRoles={['super_admin', 'compliance_officer']}>
            <AuditLogsPage />
          </ProtectedDashboard>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

