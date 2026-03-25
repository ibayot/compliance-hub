'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Container,
  Divider,
} from '@mui/material';
import { CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const hasGoogleClient = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Invalid email or password', { variant: 'error' });
    } finally {
      setLoading(false);
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
      await loginWithGoogle(idToken);
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
        <Card sx={{ width: '100%', maxWidth: 450 }}>
          <CardContent sx={{ p: 4 }}>
            <Box textAlign="center" mb={4}>
              <Typography variant="h4" component="h1" gutterBottom>
                RICTMS Compliance Hub
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in to your account
              </Typography>
            </Box>
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

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>

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