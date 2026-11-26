import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { demoApi } from '@/lib/api/demo';

export const demoDashboardKey = ['demo', 'requester-dashboard'] as const;

export function useDemoDashboard() {
  const { user, isSessionLocked, requiresPasswordChange } = useAuth();
  return useQuery({
    queryKey: [...demoDashboardKey, user?.id],
    queryFn: demoApi.dashboard,
    enabled: user?.demoRole === 'user' && !isSessionLocked && !requiresPasswordChange,
    staleTime: 5_000,
  });
}
