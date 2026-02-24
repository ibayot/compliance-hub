import { useMemo } from 'react';
import { useLocation, useNavigate, useParams as useReactRouterParams } from 'react-router-dom';

export function usePathname() {
  const location = useLocation();
  return location.pathname;
}

export function useRouter() {
  const navigate = useNavigate();

  return useMemo(
    () => ({
      push: (to: string) => navigate(to),
      replace: (to: string) => navigate(to, { replace: true }),
      back: () => navigate(-1),
      forward: () => navigate(1),
    }),
    [navigate],
  );
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>() {
  return useReactRouterParams() as T;
}
