import { Navigate, Route, Routes } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

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
import SettingsPage from '@/app/dashboard/settings/page';

function ProtectedDashboard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

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
          <ProtectedDashboard>
            <DocumentsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/documents/upload"
        element={
          <ProtectedDashboard>
            <DocumentUploadPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/documents/:id"
        element={
          <ProtectedDashboard>
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
          <ProtectedDashboard>
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
          <ProtectedDashboard>
            <UnitsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/metrics"
        element={
          <ProtectedDashboard>
            <MetricsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/reviews"
        element={
          <ProtectedDashboard>
            <ReviewsPage />
          </ProtectedDashboard>
        }
      />
      <Route
        path="/dashboard/settings"
        element={
          <ProtectedDashboard>
            <SettingsPage />
          </ProtectedDashboard>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
