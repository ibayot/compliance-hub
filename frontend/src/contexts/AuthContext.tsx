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
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { usersApi, RoleCapabilityRecord } from '@/lib/api/users';
import ForcePasswordChangeModal from '@/components/ForcePasswordChangeModal';
import { cancelSessionRenewal, tokenStore } from '@/lib/api/client';
import { DEFAULT_IDLE_LOCK_MINUTES, isValidIdleLockMinutes } from '@/lib/utils/session-policy';
import { canRecoverSession, completeInteractiveSignIn, hasSignedOut, isApplicationPath, isRejectedSession, isSignOutStorageEvent, markSessionSignedOut, observeSessionSignOut, recoveryGeneration } from '@/lib/auth/session-recovery';

export { tokenStore } from '@/lib/api/client';

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
  const [user, setUser] = useState<User | null>(null);
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
  const currentUserRef = useRef<User | null>(null);
  const retrySessionRef = useRef<() => void>(() => {});
  const navigate = useNavigate();
  const location = useLocation();
  const insideApplication = isApplicationPath(location.pathname);
  const authenticatedUserId = user?.id ?? null;
  useEffect(() => { currentUserRef.current = user; }, [user]);
  const retrySession = useCallback(() => retrySessionRef.current(), []);

  const refreshSession = useCallback(async (): Promise<User> => {
    const generation = recoveryGeneration();
    await authApi.refresh(tokenStore.get('refreshToken') || '');
    const profile = await authApi.getProfile();
    if (!canRecoverSession() || generation !== recoveryGeneration()) throw new Error('Session recovery cancelled.');
    setUser(profile);
    return profile;
  }, []);

  useEffect(() => {
    authApi.getPublicConfig()
      .then((config) => setGoogleSignInEnabled(config.googleSignInEnabled !== false))
      .catch(() => setGoogleSignInEnabled(false));
  }, [isSessionLocked]);

  useEffect(() => {
    let active = true;
    let pending = false;
    lastActivityRef.current = Date.now();
    setIdleLockMinutes(DEFAULT_IDLE_LOCK_MINUTES);
    if (!authenticatedUserId) return;
    const refreshPolicy = async () => {
      if (pending) return;
      pending = true;
      try {
        const policy = await usersApi.getSessionPolicy();
        if (active) setIdleLockMinutes(isValidIdleLockMinutes(policy.idleLockMinutes)
          ? policy.idleLockMinutes : DEFAULT_IDLE_LOCK_MINUTES);
      } catch { /* Retain the last known policy; initial failures keep the 15-minute default. */ }
      finally { pending = false; }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void refreshPolicy(); };
    void refreshPolicy();
    const interval = setInterval(() => void refreshPolicy(), 60_000);
    document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, [authenticatedUserId]);

  
  const saveTokensToPreferences = async (accessToken: string, refreshToken: string) => {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: 'accessToken', value: accessToken });
      await Preferences.set({ key: 'refreshToken', value: refreshToken });
    }
  };

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
      await authApi.reauthenticate({ password: trimmed });
      lastActivityRef.current = Date.now();
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
      setUser(null);
      setMyCap(null);
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
  }, [clearInactivityTimer, navigate]);

  const logout = useCallback(async (reason?: string) => {
    markSessionSignedOut();
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
    let retryDelay = 2000;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const generation = recoveryGeneration();
    const current = () => !disposed && canRecoverSession() && generation === recoveryGeneration();
    if (!currentUserRef.current) setLoading(true);
    if (sessionStorage.getItem('isSessionLocked') === 'true') setIsSessionLocked(true);
    const verifySession = async () => {
      if (pending || !current()) return;
      pending = true;
      clearTimeout(retryTimer);
      try {
        const token = tokenStore.get('accessToken');
        let profile = await authApi.getProfile();
        const capabilities = await usersApi.getMyCapabilities();
        if (!current()) return;
        const previous = currentUserRef.current;
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
            profile = await refreshSession();
            if (!current()) return;
            enqueueSnackbar('Your unit access was updated from the personnel directory.', { variant: 'info' });
          }
        }
        setUser(profile);
        setMyCap(capabilities);
        setRequiresPasswordChange(!!profile.requiresPasswordChange);
        setRequiresMfa(!!profile.requiresMfa);
        setLoading(false);
        setReconnecting(false);
        retryDelay = 2000;
      } catch (error) {
        if (!current()) return;
        if (isRejectedSession(error)) { await logout('session_expired'); return; }
        setReconnecting(true);
        retryTimer = setTimeout(() => void verifySession(), retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30_000);
      } finally { pending = false; }
    };
    const retry = () => { void verifySession(); };
    retrySessionRef.current = retry;
    void verifySession();
    const heartbeat = setInterval(retry, 60_000);
    window.addEventListener('online', retry);
    window.addEventListener('focus', retry);
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      clearInterval(heartbeat);
      window.removeEventListener('online', retry);
      window.removeEventListener('focus', retry);
      if (retrySessionRef.current === retry) retrySessionRef.current = () => {};
    };
  }, [insideApplication, enqueueSnackbar, logout, refreshSession]);

  useEffect(() => {
    if (reconnecting && user) {
      enqueueSnackbar('Connection temporarily unavailable. Reconnecting without signing you out.', {
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
        }
        scheduleInactivityLock();
      }
    };

    const visibilityHandler = () => {
      if (document.visibilityState !== 'visible' || isSessionLocked || requiresPasswordChange) return;
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
    scheduleInactivityLock();

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, activityHandler));
      document.removeEventListener('visibilitychange', visibilityHandler);
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
    
    if ((response as any).mfaRequired) {
      sessionStorage.setItem('mfaTempToken', (response as any).tempToken);
      if ((response as any).testModeCode) {
        sessionStorage.setItem('mfaTestModeCode', (response as any).testModeCode);
      }
      navigate('/mfa-verify');
      return;
    }

    if (response.accessToken && response.refreshToken) {
      tokenStore.set('accessToken', response.accessToken);
      tokenStore.set('refreshToken', response.refreshToken);
      saveTokensToPreferences(response.accessToken, response.refreshToken);
    }
    completeInteractiveSignIn();
    // Set user from login response first (includes units now)
    setUser(response.user as any);
    if (response.requiresPasswordChange) {
      setRequiresPasswordChange(true);
    }
    // Then fetch full profile to guarantee units and all relations are populated
    try {
      const profile = await authApi.getProfile();
      setUser(profile);
    } catch (err) {
      // Non-blocking: login response user data is still valid
    }
    await usersApi
      .getMyCapabilities()
      .then(setMyCap)
      .catch(() => { setMyCap(null); });

    navigate(redirectTo ?? '/dashboard');
  };

  const loginWithGoogle = async (idToken: string, redirectTo?: string) => {
    sessionStorage.removeItem('changelog-prompt-checked');
    const response = await authApi.loginWithGoogle({ idToken });
    if (response.accessToken && response.refreshToken) {
      tokenStore.set('accessToken', response.accessToken);
      tokenStore.set('refreshToken', response.refreshToken);
      saveTokensToPreferences(response.accessToken, response.refreshToken);
    }
    if (!response.requiresMfa) completeInteractiveSignIn();
    setUser(response.user as any);
    if (response.requiresPasswordChange) {
      setRequiresPasswordChange(true);
    }
    if (response.requiresMfa) {
      setRequiresMfa(true);
    }
    try {
      const profile = await authApi.getProfile();
      setUser(profile);
    } catch (err) { /* ignore */ }
    await usersApi
      .getMyCapabilities()
      .then(setMyCap)
      .catch(() => { setMyCap(null); });

    if (response.requiresMfa) {
      navigate('/mfa-verify');
    } else {
      navigate(redirectTo ?? '/dashboard');
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

      if (user && res.user && (res.user as any).email !== user.email) {
        throw new Error('You must sign in with the exact same Google account to unlock.');
      }

      if (res.accessToken && res.refreshToken) {
        tokenStore.set('accessToken', res.accessToken);
        tokenStore.set('refreshToken', res.refreshToken);
      }
      lastActivityRef.current = Date.now();
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
        <ForcePasswordChangeModal
          open={requiresPasswordChange}
          onClose={() => {
            // Re-fetch profile to confirm password was actually changed server-side
            authApi.getProfile().then((profile) => {
              setUser(profile);
              if (!profile.requiresPasswordChange) {
                setRequiresPasswordChange(false);
              }
            }).catch(() => setRequiresPasswordChange(false));
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
