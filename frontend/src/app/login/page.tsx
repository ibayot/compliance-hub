'use client';

import { useEffect, useState } from 'react';
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
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { useSnackbar } from 'notistack';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Fingerprint as FingerprintIcon } from '@mui/icons-material';
import {
  getBiometricCredentials,
  hasBiometricCredentials,
  isBiometricAvailable,
  isNativeApp,
} from '@/lib/auth/biometric';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricChecked, setBiometricChecked] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricSaved, setBiometricSaved] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { search } = useLocation();
  const reason = new URLSearchParams(search).get('reason');
  const redirect = new URLSearchParams(search).get('redirect');
  const hasGoogleClient = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim().length > 0;

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
    if (password.length < 12) {
      enqueueSnackbar('Password must be at least 12 characters long.', { variant: 'error' });
      return;
    }
    setLoading(true);

    try {
      await login(email, password, redirect ?? undefined);
    } catch (err: any) {
      console.error("LOGIN ERROR:", err);

      const responseData = err?.response?.data;
      const serverMessage = typeof responseData === 'string' ? responseData : responseData?.message;
      const msg =
        serverMessage ||
        (err?.message === 'Network Error' || !err?.response
          ? 'Cannot connect to server. Please make sure backend API is running on port 4000.'
          : 'Invalid credentials. Please try again.');
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!biometricSaved) {
      enqueueSnackbar('Sign in with your email and password first, then enable biometric login from Mobile Settings.', { variant: 'info' });
      return;
    }

    setBiometricLoading(true);
    try {
      const credentials = await getBiometricCredentials();
      await login(credentials.username, credentials.password, redirect ?? undefined);
    } catch (err: any) {
      console.error('BIOMETRIC LOGIN ERROR:', err);
      const message = err?.response?.data?.message || 'Biometric login failed. You can sign in with email and password instead.';
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    const idToken = response.credential;
    if (!idToken) {
      enqueueSnackbar('Google sign-in did not return a valid token.', { variant: 'error' });
      return;
    }

    setLoading(true);
    try {
      await loginWithGoogle(idToken, redirect ?? undefined);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Google sign-in failed', { variant: 'error' });
    } finally {
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

            {reason === 'mfa_failed' && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                MFA attempts for that login were exhausted. Please sign in again.
              </Alert>
            )}

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

            <form onSubmit={handleSubmit}>
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
                type="password"
                variant="outlined"
                fullWidth
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ mb: 3 }}
                autoComplete="current-password"
                InputLabelProps={{ shrink: true }}
              />

              <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
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

              {hasGoogleClient && (
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
