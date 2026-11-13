'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Container,
  Divider,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { useSnackbar } from 'notistack';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api/auth';
import { readExpiredDestination, signInDestination } from '@/lib/auth/sign-in-destination';
import { Fingerprint as FingerprintIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import {
  getBiometricCredentials,
  hasBiometricCredentials,
  isBiometricAvailable,
  isNativeApp,
} from '@/lib/auth/biometric';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricChecked, setBiometricChecked] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricSaved, setBiometricSaved] = useState(false);
  const [googleSignInEnabled, setGoogleSignInEnabled] = useState(false);
  const submitting = useRef(false);
  const { login, loginWithGoogle } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { search, state } = useLocation();
  const reason = new URLSearchParams(search).get('reason');
  const redirect = signInDestination(state?.returnTo) ?? signInDestination(new URLSearchParams(search).get('redirect'))
    ?? (reason === 'session_expired' ? readExpiredDestination() : undefined);
  const hasGoogleClient = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim().length > 0;

  useEffect(() => {
    authApi.getPublicConfig()
      .then((config) => setGoogleSignInEnabled(config.googleSignInEnabled !== false))
      .catch(() => setGoogleSignInEnabled(false));
  }, []);

  useEffect(() => {
    let active = true;
    if (!isNativeApp()) {
      setBiometricChecked(true);
      return () => { active = false; };
    }

    Promise.all([isBiometricAvailable(), hasBiometricCredentials()])
      .then(([available, saved]) => {
        if (!active) return;
        setBiometricAvailable(available);
        setBiometricSaved(saved);
        setBiometricChecked(true);
      })
      .catch(() => {
        if (!active) return;
        setBiometricAvailable(false);
        setBiometricSaved(false);
        setBiometricChecked(true);
      });

    return () => { active = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !/^\S+@\S+\.\S{2,}$/.test(normalizedEmail)) {
      enqueueSnackbar('Invalid email or password.', { variant: 'error' });
      return;
    }
    if (!password) {
      enqueueSnackbar('Enter your password to sign in.', { variant: 'error' });
      return;
    }
    submitting.current = true;
    setLoading(true);

    try {
      await login(normalizedEmail, password, redirect);
    } catch (err: any) {
      const responseData = err?.response?.data;
      const rawServerMessage = typeof responseData === 'string' ? responseData : responseData?.message;
      const serverMessage = typeof rawServerMessage === 'string' && rawServerMessage.trim()
        ? rawServerMessage
        : '';
      const msg =
        serverMessage ||
        (err?.message === 'Network Error' || !err?.response
          ? navigator.onLine
            ? 'Compliance Hub is temporarily unreachable. Please try again shortly.'
            : 'You are offline. Check your internet connection and try again.'
          : 'Invalid email or password.');
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (submitting.current) return;
    if (!biometricSaved) {
      enqueueSnackbar('Sign in with your email and password first, then enable biometric login from Mobile Settings.', { variant: 'info' });
      return;
    }

    submitting.current = true;
    setBiometricLoading(true);
    try {
      const credentials = await getBiometricCredentials();
      await login(credentials.username, credentials.password, redirect);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Biometric login failed. You can sign in with email and password instead.';
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      submitting.current = false;
      setBiometricLoading(false);
    }
  };

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (submitting.current) return;
    const idToken = response.credential;
    if (!idToken) {
      enqueueSnackbar('Google sign-in did not return a valid token.', { variant: 'error' });
      return;
    }

    submitting.current = true;
    setLoading(true);
    try {
      await loginWithGoogle(idToken, redirect ?? undefined);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Google sign-in failed', { variant: 'error' });
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <Card sx={{
          width: '100%',
          maxWidth: 450,
          position: 'relative',
          overflow: 'visible',
          boxShadow: 3
        }}>
          {/* Seamless Watermark */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              height: '150%',
              aspectRatio: '1 / 1',
              backgroundImage: 'url(/images/logos/app-logo.png)',
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: 0.3,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          <CardContent sx={{ p: 4, position: 'relative', zIndex: 1 }}>
            <Box textAlign="center" mb={4}>
              <Typography variant="h4" component="h1" gutterBottom>
                RICTMS Compliance Hub
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in to your account
              </Typography>
            </Box>

            {reason === 'session_expired' && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Your session has expired. Please try again.
              </Alert>
            )}

            {reason === 'unit_not_approved' && <Alert severity="warning" sx={{ mb: 2 }}>
              Application access is not approved for your account. Please contact your administrator.
            </Alert>}

            {reason === 'mfa_failed' && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                MFA attempts for that login were exhausted. Please sign in again.
              </Alert>
            )}

            {reason === 'mfa_restart' && <Alert severity="warning" sx={{ mb: 2 }}>
              Please sign in again to request a fresh verification code.
            </Alert>}
            {reason === 'mfa_locked' && <Alert severity="warning" sx={{ mb: 2 }}>
              Your account is temporarily locked after repeated MFA failures. Wait for the 15-minute lock to expire or contact an authorized account manager.
            </Alert>}

            {reason === 'deactivated' && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Account is deactivated. Please contact the RICTMS for reactivation.
              </Alert>
            )}

            {reason === 'role_changed' && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Your account's role has been updated. Please sign in again to apply the new
                capabilities.
              </Alert>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <TextField
                label="Email"
                type="email"
                variant="outlined"
                fullWidth
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ mb: 2 }}
                autoComplete="email"
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                fullWidth
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((value) => !value)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3, '& input::-ms-reveal, & input::-ms-clear': { display: 'none' } }}
              />

              <Button type="submit" variant="contained" fullWidth size="large" disabled={loading || biometricLoading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>

              {isNativeApp() && biometricChecked && (
                <>
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {biometricAvailable
                      ? biometricSaved
                        ? 'Biometric login is enabled on this device.'
                        : 'Biometric login is not enabled on this device. Sign in with your email and password, then enable it from Mobile Settings.'
                      : 'Biometric login is not available on this device. You can continue with email and password.'}
                  </Alert>

                  {biometricAvailable && (
                    <>
                  <Divider sx={{ my: 2 }}>or</Divider>
                  <Button
                    type="button"
                    variant="outlined"
                    fullWidth
                    size="large"
                    startIcon={<FingerprintIcon />}
                    onClick={handleBiometricLogin}
                    disabled={loading || biometricLoading || !biometricSaved}
                  >
                    {biometricLoading
                      ? 'Verifying...'
                      : biometricSaved
                        ? 'Biometric Login'
                        : 'Biometric Login (Not enabled)'}
                  </Button>
                    </>
                  )}
                </>
              )}

              {hasGoogleClient && googleSignInEnabled && (
                <>
                  <Divider sx={{ my: 2 }}>or</Divider>
                  <Box display="flex" justifyContent="center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => enqueueSnackbar('Google sign-in failed', { variant: 'error' })}
                      useOneTap={false}
                      theme="outline"
                      size="large"
                      locale="en"
                    />
                  </Box>
                </>
              )}
            </form>

            <Box mt={3} textAlign="center">
              <Typography variant="caption" color="text.secondary">
                RICTMS Internal Use Only
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
