import { useState } from 'react';
import { Alert, Button, CircularProgress } from '@mui/material';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import RequesterDashboard from '@/components/RequesterDashboard';
import KnowledgeBasePage from '@/app/(app)/operations/knowledge-base/page';
import UserManualPage from '@/app/(app)/admin/user-manual/page';
import TicketsPage from '@/app/(app)/operations/tickets/page';
import TicketDetailPage from '@/app/(app)/operations/tickets/[id]/page';
import SettingsPage from '@/app/(app)/admin/settings/page';
import { demoUserPaths } from '@/lib/api/demo';
import { useDemoDashboard } from './useDemoDashboard';

function DemoDashboardPage() {
  const { data, isPending, isError, refetch } = useDemoDashboard();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  if (isPending) return <CircularProgress size={24} aria-label="Loading demo dashboard" />;
  if (isError) return <Alert severity="error" action={<Button onClick={() => void refetch()}>Retry</Button>}>Could not load the demo dashboard.</Alert>;
  return <RequesterDashboard name="Demo" s={data} pendingCount={data?.pendingCount ?? 0}
    reminderOpen={!dismissed && Boolean(data?.pendingCount)} onDismissReminder={() => setDismissed(true)}
    openTickets={() => navigate(demoUserPaths.tickets)}
    openPendingTickets={() => navigate(`${demoUserPaths.tickets}?filter=pending_satisfaction`)} />;
}

export default function DemoUserWorkspace() {
  const { pathname } = useLocation();
  const { id, ticketId } = useParams();
  const { isSessionLocked, requiresPasswordChange } = useAuth();
  if (pathname.startsWith('/operations/demo')) {
    return <Navigate replace to={ticketId ? `/operations/tickets/${ticketId}?source=my-tickets` : demoUserPaths.dashboard} />;
  }
  const pages = {
    [demoUserPaths.dashboard]: <DemoDashboardPage />,
    [demoUserPaths.tickets]: <TicketsPage personalRequestedOnly />,
    [demoUserPaths.knowledge]: <KnowledgeBasePage demo />,
    [demoUserPaths.settings]: <SettingsPage />,
    [demoUserPaths.manual]: <UserManualPage />,
  } as Record<string, React.ReactNode>;
  const page = pathname.startsWith('/operations/tickets/') && id
    ? <TicketDetailPage key={id} />
    : pages[pathname];
  if (!page) return <Navigate replace to={demoUserPaths.dashboard} />;
  return <DashboardLayout>
    {!isSessionLocked && !requiresPasswordChange && page}
  </DashboardLayout>;
}
