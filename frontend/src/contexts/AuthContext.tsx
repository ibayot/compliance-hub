'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { replaceEqualDeep, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { closeSnackbar, useSnackbar } from 'notistack';
import { User } from '@/lib/types/auth';
import { authApi } from '@/lib/api/auth';
import type { SessionProfile } from '@/lib/api/auth';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { usersApi, RoleCapabilityRecord } from '@/lib/api/users';
import { ReadOptions } from '@/lib/api/bounded-read';
import ForcePasswordChangeModal from '@/components/ForcePasswordChangeModal';
import DemoPasswordChangeModal from '@/components/demo/DemoPasswordChangeModal';
import { cancelSessionRenewal, tokenStore } from '@/lib/api/client';
import { DEFAULT_IDLE_LOCK_MINUTES, isValidIdleLockMinutes } from '@/lib/utils/session-policy';
import { canRecoverSession, completeInteractiveSignIn, hasSignedOut, isApplicationPath, isRejectedSession, isSignOutStorageEvent, markSessionSignedOut, observeSessionSignOut, readSessionActivity, recoveryGeneration, rememberSessionActivity } from '@/lib/auth/session-recovery';
import { notificationsApi } from '@/app/api/references';
import { getNativeFcmHandoff } from '@/lib/native-fcm-handoff';
import { clearExpiredDestination, signInDestination } from '@/lib/auth/sign-in-destination';

export { tokenStore } from '@/lib/api/client';

const SESSION_CHECK_INTERVAL_MS = 2 * 60_000;

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) {
      base64 += '='.repeat(4 - pad);
    }
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('JWT parse error:', e);
    return null;
  }
}

async function loadSessionExtras(profile: SessionProfile, options?: ReadOptions) {
  const capabilitiesPromise = profile.capabilities !== undefined
    ? Promise.resolve(profile.capabilities)
    : usersApi.getMyCapabilities(options).catch(() => null);
  const idleLockMinutesPromise = isValidIdleLockMinutes(profile.idleLockMinutes)
    ? Promise.resolve(profile.idleLockMinutes)
    : usersApi.getSessionPolicy(options)
      .then((policy) => policy.idleLockMinutes)
      .catch(() => null);
  const [capabilities, idleLockMinutes] = await Promise.all([
    capabilitiesPromise,
    idleLockMinutesPromise,
  ]);

  return {
    capabilities: capabilities ?? null,
    idleLockMinutes: isValidIdleLockMinutes(idleLockMinutes) ? idleLockMinutes : null,
  };
}

interface AuthContextType {
  user: User | null;
  myCap: RoleCapabilityRecord | null;
  loading: boolean;
  reconnecting: boolean;
  retrySession: () => void;
  login: (email: string, password: string, redirectTo?: string) => Promise<void>;
  loginWithGoogle: (idToken: string, redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<User>;
  isSessionLocked: boolean;
  requiresPasswordChange: boolean;
  unlockSession: (password: string) => Promise<void>;
  isAuthenticated: boolean;
  requiresMfa: boolean;
  setRequiresMfa: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const PasswordChangeModal = user?.demoRole ? DemoPasswordChangeModal : ForcePasswordChangeModal;
  const [myCap, setMyCap] = useState<RoleCapabilityRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [googleSignInEnabled, setGoogleSignInEnabled] = useState(false);
  const [idleLockMinutes, setIdleLockMinutes] = useState(DEFAULT_IDLE_LOCK_MINUTES);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(Date.now());
  const lastActivitySavedRef = useRef(0);
  const currentUserRef = useRef<User | null>(null);
  const retrySessionRef = useRef<() => void>(() => {});
  const navigate = useNavigate();
  const location = useLocation();
  const insideApplication = isApplicationPath(location.pathname);
  const authenticatedUserId = user?.id ?? null;
  useEffect(() => { currentUserRef.current = user; }, [user]);
  const retrySession = useCallback(() => retrySessionRef.current(), []);

  const refreshSession = useCallback(async (options?: ReadOptions): Promise<SessionProfile> => {
    const generation = recoveryGeneration();
    await authApi.refresh(tokenStore.get('refreshToken') || '');
    if (options?.signal?.aborted) throw new Error('Session recovery cancelled.');
    const profile = await authApi.getProfile(options);
    if (options?.signal?.aborted || !canRecoverSession() || generation !== recoveryGeneration()) throw new Error('Session recovery cancelled.');
    const extras = await loadSessionExtras(profile, options);
    if (options?.signal?.aborted || !canRecoverSession() || generation !== recoveryGeneration()) throw new Error('Session recovery cancelled.');
    setUser(profile);
    setMyCap(extras.capabilities);
    if (extras.idleLockMinutes !== null) setIdleLockMinutes(extras.idleLockMinutes);
    return profile;
  }, []);

  useEffect(() => {
    authApi.getPublicConfig()
      .then((config) => setGoogleSignInEnabled(config.googleSignInEnabled !== false))
      .catch(() => setGoogleSignInEnabled(false));
  }, [isSessionLocked]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Older native builds wrote duplicate tokens here and never restored them.
      void Promise.all([Preferences.remove({ key: 'accessToken' }), Preferences.remove({ key: 'refreshToken' })]).catch(() => undefined);
    }
  }, []);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const scheduleInactivityLock = useCallback(() => {
    clearInactivityTimer();
    if (!authenticatedUserId || isSessionLocked || requiresPasswordChange) return;

    const lock = () => {
      sessionStorage.setItem('isSessionLocked', 'true');
      setIsSessionLocked(true);
      setUnlockPassword('');
      setShowUnlockPassword(false);
      setUnlockError(null);
    };

    // Policy refreshes and heartbeat responses must never count as user activity.
    const deadline = lastActivityRef.current + idleLockMinutes * 60_000;
    const checkDeadline = () => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        lock();
        return;
      }
      inactivityTimerRef.current = setTimeout(checkDeadline, Math.min(remaining, 60_000));
    };
    checkDeadline();
  }, [authenticatedUserId, clearInactivityTimer, idleLockMinutes, isSessionLocked, requiresPasswordChange]);

  const unlockSession = useCallback(
    async (password: string) => {
      if (!user) throw new Error('No active session');
      const trimmed = password.trim();
      if (!trimmed) {
        throw new Error('Password is required');
      }
      // A suspended app may reach this dialog with an expired access cookie.
      // Renew via the protected profile probe; a wrong password still fails normally.
      const profile = await authApi.getProfile();
      if (profile.id !== user.id) throw new Error('Your session has changed. Sign in again to continue.');
      await authApi.reauthenticate({ password: trimmed });
      lastActivityRef.current = Date.now();
      rememberSessionActivity(user.id, lastActivityRef.current);
      sessionStorage.removeItem('isSessionLocked');
      setIsSessionLocked(false);
      setUnlockPassword('');
      setShowUnlockPassword(false);
      setUnlockError(null);
      scheduleInactivityLock();
    },
    [scheduleInactivityLock, user],
  );
  const clearLocalSession = useCallback((reason?: string) => {
      cancelSessionRenewal();
      tokenStore.remove('accessToken');
      tokenStore.remove('refreshToken');
      sessionStorage.removeItem('isSessionLocked');
      sessionStorage.removeItem('changelog-prompt-checked');
      sessionStorage.removeItem('mfaTempToken');
      sessionStorage.removeItem('mfaTestModeCode');
      sessionStorage.removeItem('mfaResendAvailableAt');
      clearExpiredDestination();
      queryClient.clear();
      setUser(null);
      setMyCap(null);
      setIdleLockMinutes(DEFAULT_IDLE_LOCK_MINUTES);
      setIsSessionLocked(false);
      setRequiresMfa(false);
      setRequiresPasswordChange(false);
      setLoading(false);
      setReconnecting(false);
      clearInactivityTimer();
      if (Capacitor.isNativePlatform()) {
        void Promise.all([Preferences.remove({ key: 'accessToken' }), Preferences.remove({ key: 'refreshToken' })]).catch(() => undefined);
      }
      navigate(reason ? `/login?reason=${reason}` : '/login');
  }, [clearInactivityTimer, navigate, queryClient]);

  const logout = useCallback(async (reason?: string) => {
    markSessionSignedOut();
    if (!Capacitor.isNativePlatform()) {
      const nativeFcm = getNativeFcmHandoff();
      await Promise.race([
        Promise.all([
          notificationsApi.unsubscribeCurrentPushSubscription().catch(() => undefined),
          nativeFcm?.deviceId
            ? notificationsApi.removeFcmDevice(nativeFcm.deviceId).catch(() => undefined)
            : Promise.resolve(undefined),
        ]).then(() => undefined),
        new Promise<void>((resolve) => window.setTimeout(resolve, 1500)),
      ]);
    }
    const request = authApi.logout();
    clearLocalSession(reason);
    try { await request; } catch { /* Local sign-out remains final during an outage. */ }
  }, [clearLocalSession]);

  useEffect(() => {
    const onSignOut = (event: StorageEvent) => { if (isSignOutStorageEvent(event)) { observeSessionSignOut(); clearLocalSession(); } };
    window.addEventListener('storage', onSignOut);
    return () => window.removeEventListener('storage', onSignOut);
  }, [clearLocalSession]);

  useEffect(() => {
    if (!insideApplication || hasSignedOut()) { setLoading(false); setReconnecting(false); return; }
    let disposed = false;
    let pending = false;
    let attemptId = 0;
    let controller: AbortController | null = null;
    let retryDelay = 2000;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let profileRevision: string | undefined;
    const generation = recoveryGeneration();
    const current = () => !disposed && canRecoverSession() && generation === recoveryGeneration();
    if (!currentUserRef.current) setLoading(true);
    if (sessionStorage.getItem('isSessionLocked') === 'true') setIsSessionLocked(true);
    const verifySession = async () => {
      if (!current() || pending) return;
      const attempt = ++attemptId;
      const requestController = new AbortController();
      controller = requestController;
      const currentAttempt = () => current() && attempt === attemptId && !requestController.signal.aborted;
      pending = true;
      clearTimeout(retryTimer);
      try {
        const token = tokenStore.get('accessToken');
        const previous = currentUserRef.current;
        const session = await authApi.checkSession(previous ? profileRevision : undefined, { signal: requestController.signal });
        if (!currentAttempt()) return;
        let profile = session.profile;
        if (!profile) {
          if (!previous || !profileRevision || session.revision !== profileRevision) throw new Error('Invalid session profile response.');
          setLoading(false);
          setReconnecting(false);
          retryDelay = 2000;
          return;
        }
        let nextRevision = session.revision;
        let extras = await loadSessionExtras(profile, { signal: requestController.signal });
        if (!currentAttempt()) return;
        if (!previous) {
          const lastActivity = readSessionActivity(profile.id);
          const minutes = extras.idleLockMinutes ?? DEFAULT_IDLE_LOCK_MINUTES;
          setIdleLockMinutes(minutes);
          lastActivityRef.current = lastActivity ?? Date.now();
          if (lastActivity && Date.now() - lastActivity >= minutes * 60_000 && !profile.requiresPasswordChange) {
            sessionStorage.setItem('isSessionLocked', 'true');
            setIsSessionLocked(true);
          } else if (!lastActivity) {
            rememberSessionActivity(profile.id, lastActivityRef.current);
          }
        }
        let previousRole = previous?.role;
        try {
          if (token) previousRole = parseJwt(token)?.role || previousRole;
        } catch { /* Identity authority remains with the server. */ }
        if (previousRole && previousRole !== profile.role) {
          enqueueSnackbar('Your role has been updated. Please log in again to apply changes.', { variant: 'info' });
          await logout('role_changed');
          return;
        }
        if (previous) {
          const oldUnits = (previous.units || []).map(unit => Number(unit.id)).sort((a, b) => a - b).join(',');
          const newUnits = (profile.units || []).map(unit => Number(unit.id)).sort((a, b) => a - b).join(',');
          if (oldUnits !== newUnits) {
            profile = await refreshSession({ signal: requestController.signal });
            nextRevision = undefined;
            if (!currentAttempt()) return;
            extras = await loadSessionExtras(profile, { signal: requestController.signal });
            if (!currentAttempt()) return;
            enqueueSnackbar('Your unit access was updated from the personnel directory.', { variant: 'info' });
          }
        }
        // Keep equal values stable so a successful recheck does not rerun reads
        // for unchanged identity and capabilities in the workspace.
        profileRevision = nextRevision;
        setUser((currentProfile) => replaceEqualDeep(currentProfile, profile));
        setMyCap((currentCapabilities) => replaceEqualDeep(currentCapabilities, extras.capabilities));
        if (extras.idleLockMinutes !== null) setIdleLockMinutes(extras.idleLockMinutes);
        setRequiresPasswordChange(!!profile.requiresPasswordChange);
        setRequiresMfa(!!profile.requiresMfa);
        setLoading(false);
        setReconnecting(false);
        retryDelay = 2000;
      } catch (error) {
        if (!currentAttempt()) return;
        profileRevision = undefined;
        if (isRejectedSession(error)) { await logout('session_expired'); return; }
        setReconnecting(true);
        retryTimer = setTimeout(() => {
          if (document.visibilityState === 'visible') void verifySession();
        }, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30_000);
      } finally { if (attempt === attemptId) { pending = false; controller = null; } }
    };
    const retry = () => { void verifySession(); };
    retrySessionRef.current = retry;
    void verifySession();
    const heartbeat = setInterval(() => {
      if (document.visibilityState === 'visible') void verifySession();
    }, SESSION_CHECK_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') retry();
    };
    window.addEventListener('online', retry);
    window.addEventListener('focus', retry);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      disposed = true;
      ++attemptId;
      controller?.abort();
      clearTimeout(retryTimer);
      clearInterval(heartbeat);
      window.removeEventListener('online', retry);
      window.removeEventListener('focus', retry);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (retrySessionRef.current === retry) retrySessionRef.current = () => {};
    };
  }, [insideApplication, enqueueSnackbar, logout, refreshSession]);

  useEffect(() => {
    if (reconnecting && user) {
      enqueueSnackbar('We couldn’t connect right now. Please try again in a moment.', {
        key: 'session-reconnecting', variant: 'warning', persist: true,
        action: <Button color="inherit" onClick={retrySession}>Retry</Button>,
      });
    } else closeSnackbar('session-reconnecting');
    return () => closeSnackbar('session-reconnecting');
  }, [reconnecting, !!user, enqueueSnackbar, retrySession]);

  useEffect(() => {
    if (!authenticatedUserId || loading || requiresPasswordChange) {
      clearInactivityTimer();
      return;
    }

    const activityHandler = () => {
      if (!isSessionLocked && !requiresPasswordChange) {
        if (Date.now() < lastActivityRef.current + idleLockMinutes * 60_000) {
          lastActivityRef.current = Date.now();
          if (lastActivityRef.current - lastActivitySavedRef.current >= 5000) {
            rememberSessionActivity(authenticatedUserId, lastActivityRef.current);
            lastActivitySavedRef.current = lastActivityRef.current;
          }
        }
        scheduleInactivityLock();
      }
    };

    const persistActivity = () => {
      if (!isSessionLocked) rememberSessionActivity(authenticatedUserId, lastActivityRef.current);
    };
    const visibilityHandler = () => {
      if (document.visibilityState !== 'visible') { persistActivity(); return; }
      if (isSessionLocked || requiresPasswordChange) return;
      scheduleInactivityLock();
    };

    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
    ];
    events.forEach((eventName) =>
      window.addEventListener(eventName, activityHandler, { passive: true }),
    );
    document.addEventListener('visibilitychange', visibilityHandler);
    window.addEventListener('pagehide', persistActivity);
    scheduleInactivityLock();

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, activityHandler));
      document.removeEventListener('visibilitychange', visibilityHandler);
      window.removeEventListener('pagehide', persistActivity);
      clearInactivityTimer();
    };
  }, [
    authenticatedUserId,
    clearInactivityTimer,
    idleLockMinutes,
    isSessionLocked,
    loading,
    requiresPasswordChange,
    scheduleInactivityLock,
  ]);

  const login = async (email: string, password: string, redirectTo?: string) => {
    sessionStorage.removeItem('changelog-prompt-checked');
    const response = await authApi.login({ email, password });
    
    if (response.mfaRequired) {
      sessionStorage.setItem('mfaTempToken', response.tempToken);
      sessionStorage.removeItem('mfaResendAvailableAt');
      if (response.testModeCode) {
        sessionStorage.setItem('mfaTestModeCode', response.testModeCode);
      } else sessionStorage.removeItem('mfaTestModeCode');
      navigate('/mfa-verify', { replace: true, state: { returnTo: signInDestination(redirectTo) } });
      return;
    }

    if (response.accessToken && response.refreshToken) {
      tokenStore.set('accessToken', response.accessToken);
      tokenStore.set('refreshToken', response.refreshToken);
    }
    completeInteractiveSignIn(response.user.id);
    lastActivityRef.current = Date.now();
    clearExpiredDestination();
    queryClient.clear();
    // Set user from login response first (includes units now)
    setUser(response.user as any);
    if (response.requiresPasswordChange) {
      setRequiresPasswordChange(true);
    }
    // Then fetch full profile to guarantee units and all relations are populated
    let profileSnapshotLoaded = false;
    try {
      const profile = await authApi.getProfile();
      const extras = await loadSessionExtras(profile);
      setUser(profile);
      setMyCap(extras.capabilities);
      if (extras.idleLockMinutes !== null) setIdleLockMinutes(extras.idleLockMinutes);
      profileSnapshotLoaded = true;
    } catch (err) {
      // Non-blocking: login response user data is still valid
    }
    if (!profileSnapshotLoaded) {
      const [capabilities, policy] = await Promise.all([
        usersApi.getMyCapabilities().catch(() => null),
        usersApi.getSessionPolicy().catch(() => null),
      ]);
      setMyCap(capabilities);
      if (isValidIdleLockMinutes(policy?.idleLockMinutes)) setIdleLockMinutes(policy.idleLockMinutes);
    }

    navigate(signInDestination(redirectTo) ?? '/dashboard', { replace: true });
  };

  const loginWithGoogle = async (idToken: string, redirectTo?: string) => {
    sessionStorage.removeItem('changelog-prompt-checked');
    const response = await authApi.loginWithGoogle({ idToken });
    if (response.mfaRequired) {
      sessionStorage.setItem('mfaTempToken', response.tempToken);
      sessionStorage.removeItem('mfaResendAvailableAt');
      if (response.testModeCode) sessionStorage.setItem('mfaTestModeCode', response.testModeCode);
      else sessionStorage.removeItem('mfaTestModeCode');
      navigate('/mfa-verify', { replace: true, state: { returnTo: signInDestination(redirectTo) } });
      return;
    }
    if (response.accessToken && response.refreshToken) {
      tokenStore.set('accessToken', response.accessToken);
      tokenStore.set('refreshToken', response.refreshToken);
    }
    if (!response.requiresMfa) {
      completeInteractiveSignIn(response.user.id);
      lastActivityRef.current = Date.now();
      clearExpiredDestination();
      queryClient.clear();
    }
    setUser(response.user as any);
    if (response.requiresPasswordChange) {
      setRequiresPasswordChange(true);
    }
    if (response.requiresMfa) {
      setRequiresMfa(true);
    }
    let profileSnapshotLoaded = false;
    try {
      const profile = await authApi.getProfile();
      const extras = await loadSessionExtras(profile);
      setUser(profile);
      setMyCap(extras.capabilities);
      if (extras.idleLockMinutes !== null) setIdleLockMinutes(extras.idleLockMinutes);
      profileSnapshotLoaded = true;
    } catch (err) { /* ignore */ }
    if (!profileSnapshotLoaded) {
      const [capabilities, policy] = await Promise.all([
        usersApi.getMyCapabilities().catch(() => null),
        usersApi.getSessionPolicy().catch(() => null),
      ]);
      setMyCap(capabilities);
      if (isValidIdleLockMinutes(policy?.idleLockMinutes)) setIdleLockMinutes(policy.idleLockMinutes);
    }

    if (response.requiresMfa) {
      navigate('/mfa-verify', { replace: true, state: { returnTo: signInDestination(redirectTo) } });
    } else {
      navigate(signInDestination(redirectTo) ?? '/dashboard', { replace: true });
    }
  };

  const handleUnlock = async () => {
    setUnlocking(true);
    setUnlockError(null);
    try {
      if (user?.authProvider === 'google') {
        throw new Error('Google-authenticated accounts require sign-in again after inactivity.');
      }
      await unlockSession(unlockPassword);
    } catch (error: any) {
      setUnlockError(
        error?.response?.data?.message || error?.message || 'Unable to unlock session',
      );
    } finally {
      setUnlocking(false);
    }
  };

  const handleLockedSessionLogout = async () => {
    await logout();
  };

  const handleGoogleUnlock = async (response: CredentialResponse) => {
    const idToken = response.credential;
    if (!idToken) {
      setUnlockError('Google sign-in did not return a valid token.');
      return;
    }
    setUnlocking(true);
    setUnlockError(null);
    try {
      const res = await authApi.loginWithGoogle({ idToken });

      if (res.mfaRequired) {
        if (user && res.user.email !== user.email) throw new Error('You must sign in with the exact same Google account to unlock.');
        sessionStorage.setItem('mfaTempToken', res.tempToken);
        sessionStorage.removeItem('mfaResendAvailableAt');
        if (res.testModeCode) sessionStorage.setItem('mfaTestModeCode', res.testModeCode);
        else sessionStorage.removeItem('mfaTestModeCode');
        window.location.assign('/mfa-verify');
        return;
      }

      if (user && res.user && (res.user as any).email !== user.email) {
        throw new Error('You must sign in with the exact same Google account to unlock.');
      }

      if (res.accessToken && res.refreshToken) {
        tokenStore.set('accessToken', res.accessToken);
        tokenStore.set('refreshToken', res.refreshToken);
      }
      lastActivityRef.current = Date.now();
      if (user) rememberSessionActivity(user.id, lastActivityRef.current);
      sessionStorage.removeItem('isSessionLocked');
      setIsSessionLocked(false);
      scheduleInactivityLock();
    } catch (err: any) {
      setUnlockError(err.response?.data?.message || err.message || 'Google sign-in failed');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <>
      <AuthContext.Provider
        value={{
          user,
          myCap,
          loading,
          reconnecting,
          retrySession,
          login,
          loginWithGoogle,
           logout,
          refreshSession,
           isSessionLocked,
           requiresPasswordChange,
           unlockSession,
          isAuthenticated: !!user,
          requiresMfa,
          setRequiresMfa,
        }}
      >
        {children}
      </AuthContext.Provider>

      <Dialog open={isSessionLocked} disableEscapeKeyDown fullWidth maxWidth="xs">
        <DialogTitle>Session Locked</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            For security, your session was locked after {idleLockMinutes} {idleLockMinutes === 1 ? 'minute' : 'minutes'} of inactivity.
          </Typography>
          <Box mt={2} mb={2} display="flex" flexDirection="column" alignItems="center">
            <Alert severity="info" sx={{ width: '100%', mb: 2 }}>
              Please re-authenticate to unlock your session.
            </Alert>
            <TextField
              fullWidth
              type={showUnlockPassword ? 'text' : 'password'}
              label="Enter Password"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !unlocking) {
                  handleUnlock();
                }
              }}
              autoFocus
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showUnlockPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowUnlockPassword((visible) => !visible)}
                      edge="end"
                    >
                      {showUnlockPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />
            {googleSignInEnabled && (
              <>
                <Divider sx={{ width: '100%', mb: 2 }}>OR</Divider>
                <GoogleLogin
                  onSuccess={handleGoogleUnlock}
                  onError={() => setUnlockError('Google sign-in failed')}
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  locale="en"
                />
              </>
            )}
          </Box>
          {unlockError && (
            <Box mt={2}>
              <Alert severity="error">{unlockError}</Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleUnlock} variant="contained" disabled={unlocking}>
            {unlocking ? 'Verifying...' : 'Unlock'}
          </Button>
          <Button onClick={handleLockedSessionLogout}>Sign In Again</Button>
        </DialogActions>
      </Dialog>

      {user && (
        <PasswordChangeModal
          open={requiresPasswordChange}
          onClose={() => {
            // Re-fetch profile to confirm password was actually changed server-side
            authApi.getProfile().then(async (profile) => {
              const extras = await loadSessionExtras(profile);
              setUser(profile);
              setMyCap(extras.capabilities);
              if (extras.idleLockMinutes !== null) setIdleLockMinutes(extras.idleLockMinutes);
              if (!profile.requiresPasswordChange) {
                setRequiresPasswordChange(false);
              }
            }).catch(() => {
              if (!user.demoRole) setRequiresPasswordChange(false);
            });
          }}
          user={user}
        />
      )}
    </>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
