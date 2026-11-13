'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RegisteredPageAction {
  label: string;
  icon: 'add' | 'edit';
  button: HTMLButtonElement;
}

interface NavigationEntry {
  key: string;
  pathname: string;
  search: string;
}

interface MobileNavigationContextValue {
  canGoBack: boolean;
  goBack: () => void;
  pageAction: RegisteredPageAction | null;
  registerPageAction: (pathname: string, action: RegisteredPageAction | null) => void;
}

const MobileNavigationContext = createContext<MobileNavigationContextValue | null>(null);

function getParentPath(pathname: string, search: string, canOpenTicketQueue: boolean): string | null {
  if (pathname === '/dashboard') return null;

  if (pathname.startsWith('/operations/tickets/')) {
    const source = new URLSearchParams(search).get('source');
    return source === 'my-tickets' || !canOpenTicketQueue ? '/operations/my-tickets' : '/operations/tickets';
  }
  if (pathname === '/operations/settings' && canOpenTicketQueue) return '/operations/tickets';
  if (pathname.startsWith('/governance/documents/')) return '/governance/documents';

  // Every other authenticated primary page returns to the application home when
  // it was opened directly, without an in-app route to return to.
  return '/dashboard';
}

export function MobileNavigationProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const { myCap } = useAuth();
  const entriesRef = useRef<NavigationEntry[]>([
    { key: location.key, pathname: location.pathname, search: location.search },
  ]);
  const [historyDepth, setHistoryDepth] = useState(0);
  const [registeredAction, setRegisteredAction] = useState<{
    pathname: string;
    action: RegisteredPageAction | null;
  } | null>(null);

  useEffect(() => {
    const entries = entriesRef.current;
    if (entries[entries.length - 1]?.key === location.key) return;

    const nextEntry = { key: location.key, pathname: location.pathname, search: location.search };
    if (navigationType === 'POP') {
      const existingIndex = entries.findIndex((entry) => entry.key === location.key);
      entriesRef.current = existingIndex >= 0 ? entries.slice(0, existingIndex + 1) : [nextEntry];
    } else if (navigationType === 'REPLACE') {
      entriesRef.current = [...entries.slice(0, -1), nextEntry];
    } else {
      entriesRef.current = [...entries, nextEntry];
    }
    setHistoryDepth(Math.max(0, entriesRef.current.length - 1));
  }, [location.key, location.pathname, location.search, navigationType]);

  const parentPath = getParentPath(location.pathname, location.search, Boolean(myCap?.isTicketModuleAccess));
  const canGoBack = historyDepth > 0 || parentPath !== null;

  const goBack = useCallback(() => {
    if (entriesRef.current.length > 1) {
      entriesRef.current = entriesRef.current.slice(0, -1);
      setHistoryDepth(Math.max(0, entriesRef.current.length - 1));
      navigate(-1);
      return;
    }
    if (parentPath) navigate(parentPath, { replace: true });
  }, [navigate, parentPath]);

  const registerPageAction = useCallback(
    (pathname: string, action: RegisteredPageAction | null) => {
      setRegisteredAction((current) =>
        action ? { pathname, action } : current?.pathname === pathname ? null : current,
      );
    },
    [],
  );

  const pageAction = registeredAction?.pathname === location.pathname
    ? registeredAction.action
    : null;
  const value = useMemo(
    () => ({ canGoBack, goBack, pageAction, registerPageAction }),
    [canGoBack, goBack, pageAction, registerPageAction],
  );

  return <MobileNavigationContext.Provider value={value}>{children}</MobileNavigationContext.Provider>;
}

export function useMobileNavigation() {
  const value = useContext(MobileNavigationContext);
  if (!value) throw new Error('Mobile navigation controls require MobileNavigationProvider.');
  return value;
}

export function useMobilePageAction(label: string | null, icon: 'add' | 'edit' = 'add') {
  const { registerPageAction } = useMobileNavigation();
  const { pathname } = useLocation();
  return useCallback((button: HTMLButtonElement | null) => {
    registerPageAction(pathname, button && label ? { button, label, icon } : null);
  }, [pathname, registerPageAction, label, icon]);
}
