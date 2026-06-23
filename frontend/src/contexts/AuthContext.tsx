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
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  TextField,
  Typography,
} from '@mui/material';
import { CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { useSnackbar } from 'notistack';
import { User } from '@/lib/types/auth';
import { authApi } from '@/lib/api/auth';
import { usersApi, RoleCapabilityRecord } from '@/lib/api/users';
import ForcePasswordChangeModal from '@/components/ForcePasswordChangeModal';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

const tokenStore = {
  get: (key: 'accessToken' | 'refreshToken'): string | null => {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(key);
  },
  set: (key: 'accessToken' | 'refreshToken', value: string) => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(key, value);
  },
  remove: (key: 'accessToken' | 'refreshToken') => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(key);
  },
};

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
  login: (email: string, password: string, redirectTo?: string) => Promise<void>;
  loginWithGoogle: (idToken: string, redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  isSessionLocked: boolean;
  unlockSession: (password: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { enqueueSnackbar } = useSnackbar();
  const [user, setUser] = useState<User | null>(null);
  const [myCap, setMyCap] = useState<RoleCapabilityRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const scheduleInactivityLock = useCallback(() => {
    clearInactivityTimer();
    if (!user || isSessionLocked) return;
    inactivityTimerRef.current = setTimeout(() => {
      sessionStorage.setItem('isSessionLocked', 'true');
      setIsSessionLocked(true);
      setUnlockPassword('');
      setUnlockError(null);
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearInactivityTimer, isSessionLocked, user]);

  const unlockSession = useCallback(
    async (password: string) => {
      if (!user) throw new Error('No active session');
      const trimmed = password.trim();
      if (!trimmed) {
        throw new Error('Password is required');
      }
      await authApi.reauthenticate({ password: trimmed });
      sessionStorage.removeItem('isSessionLocked');
      setIsSessionLocked(false);
      setUnlockPassword('');
      setUnlockError(null);
      scheduleInactivityLock();
    },
    [scheduleInactivityLock, user],
  );

  useEffect(() => {
    // Check for existing token and fetch user profile
    const initAuth = async () => {
      const token = tokenStore.get('accessToken');
      if (token) {
        if (sessionStorage.getItem('isSessionLocked') === 'true') {
          setIsSessionLocked(true);
        }
        try {
          const profile = await authApi.getProfile();

          let jwtRole = null;
          try {
            const payload = parseJwt(token);
            if (payload) jwtRole = payload.role;
          } catch {}

          const roleChanged = jwtRole && jwtRole !== profile.role;

          setUser(profile);

          if (roleChanged) {
            enqueueSnackbar('Your role has been updated. Please log in again to apply changes.', {
              variant: 'info',
            });
            setTimeout(() => logout('role_changed'), 1500);
          } else {
            usersApi
              .getMyCapabilities()
              .then(setMyCap)
              .catch(() => {});
          }
        } catch (error) {
          tokenStore.remove('accessToken');
          tokenStore.remove('refreshToken');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [enqueueSnackbar]);

  useEffect(() => {
    if (!user || loading) {
      clearInactivityTimer();
      return;
    }

    const activityHandler = () => {
      if (!isSessionLocked) {
        scheduleInactivityLock();
      }
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
    scheduleInactivityLock();

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, activityHandler));
      clearInactivityTimer();
    };
  }, [clearInactivityTimer, isSessionLocked, loading, scheduleInactivityLock, user]);

  // ── Heartbeat: verify session every 60 s while logged in ─────────────────
  // If the account is deactivated server-side, getProfile() returns 401 →
  // the axios interceptor attempts a token refresh → refresh also fails for
  // deactivated users → tokens are cleared and the user is redirected to
  // /login?reason=session_expired automatically.
  useEffect(() => {
    if (!user) return;

    const id = setInterval(async () => {
      try {
        const profile = await authApi.getProfile();
        let jwtRole = user?.role;
        const token = tokenStore.get('accessToken');
        try {
          if (token) {
            const payload = parseJwt(token);
            if (payload) jwtRole = payload.role;
          }
        } catch {}

        const roleChanged = jwtRole && jwtRole !== profile.role;

        setUser(profile); // Immediately reflect visual changes to account

        if (roleChanged) {
          enqueueSnackbar('Your role has been updated. Please log in again to apply changes.', {
            variant: 'info',
          });
          setTimeout(() => logout('role_changed'), 1500);
        } else {
          try {
            const caps = await usersApi.getMyCapabilities();
            setMyCap(caps);
          } catch {}
        }
      } catch {
        // 401 is handled by the axios interceptor; other errors are safe to ignore
      }
    }, 60_000); // 60 s

    return () => clearInterval(id);
  }, [!!user, enqueueSnackbar]);

  const login = async (email: string, password: string, redirectTo?: string) => {
    try {
      const response = await authApi.login({ email, password });
      tokenStore.set('accessToken', response.accessToken);
      tokenStore.set('refreshToken', response.refreshToken);
      // Set user from login response first (includes units now)
      setUser(response.user as any);
      // Then fetch full profile to guarantee units and all relations are populated
      try {
        const profile = await authApi.getProfile();
        setUser(profile);
      } catch {
        // Non-blocking: login response user data is still valid
      }
      usersApi
        .getMyCapabilities()
        .then(setMyCap)
        .catch(() => {});
      router.push(redirectTo ?? '/dashboard');
    } catch (error) {
      throw error;
    }
  };

  const loginWithGoogle = async (idToken: string, redirectTo?: string) => {
    try {
      const response = await authApi.loginWithGoogle({ idToken });
      tokenStore.set('accessToken', response.accessToken);
      tokenStore.set('refreshToken', response.refreshToken);
      setUser(response.user as any);
      try {
        const profile = await authApi.getProfile();
        setUser(profile);
      } catch {}
      usersApi
        .getMyCapabilities()
        .then(setMyCap)
        .catch(() => {});
      router.push(redirectTo ?? '/dashboard');
    } catch (error) {
      throw error;
    }
  };

  const logout = async (reason?: string) => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      tokenStore.remove('accessToken');
      tokenStore.remove('refreshToken');
      sessionStorage.removeItem('isSessionLocked');
      setUser(null);
      setMyCap(null);
      setIsSessionLocked(false);
      clearInactivityTimer();
      router.push(reason ? `/login?reason=${reason}` : '/login');
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
      
      tokenStore.set('accessToken', res.accessToken);
      tokenStore.set('refreshToken', res.refreshToken);
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
          login,
          loginWithGoogle,
          logout,
          isSessionLocked,
          unlockSession,
          isAuthenticated: !!user,
        }}
      >
        {children}
      </AuthContext.Provider>

      <Dialog open={isSessionLocked} disableEscapeKeyDown fullWidth maxWidth="xs">
        <DialogTitle>Session Locked</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            For security, your session was locked after 15 minutes of inactivity.
          </Typography>
          <Box mt={2} mb={2} display="flex" flexDirection="column" alignItems="center">
            <Alert severity="info" sx={{ width: '100%', mb: 2 }}>
              Please re-authenticate to unlock your session.
            </Alert>
            <TextField
              fullWidth
              type="password"
              label="Enter Password"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !unlocking) {
                  handleUnlock();
                }
              }}
              autoFocus
              sx={{ mb: 2 }}
            />
            <Divider sx={{ width: '100%', mb: 2 }}>OR</Divider>
            <GoogleLogin
              onSuccess={handleGoogleUnlock}
              onError={() => setUnlockError('Google sign-in failed')}
              useOneTap={false}
              theme="outline"
              size="large"
              locale="en"
            />
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

      <ForcePasswordChangeModal 
        open={requiresPasswordChange} 
        onClose={() => setRequiresPasswordChange(false)} 
      />
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
