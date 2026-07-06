'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api/auth';
import { enqueueSnackbar } from 'notistack';

export default function MfaVerifyPage() {
  const router = useRouter();
  const { user, requiresMfa, setRequiresMfa } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    // If not requires MFA, redirect away
    if (user && requiresMfa === false) {
      router.push('/dashboard');
    }
  }, [user, requiresMfa, router]);

  const handleSendCode = async () => {
    setSending(true);
    setError(null);
    try {
      await authApi.sendMfaCode();
      setSent(true);
      enqueueSnackbar('Verification code sent to your email.', { variant: 'success' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send code.');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authApi.verifyMfaCode(code);
      enqueueSnackbar('MFA Verification successful.', { variant: 'success' });
      setRequiresMfa(false);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null; // Not logged in
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
        padding: 2,
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%', boxShadow: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" component="h1" gutterBottom fontWeight="bold" textAlign="center">
            Security Verification
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
            For your security, please verify your identity for the first login of the day.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {!sent ? (
            <Box textAlign="center">
              <Typography variant="body2" sx={{ mb: 3 }}>
                Click below to receive a 6-digit verification code sent to your registered email address (<b>{user.email}</b>).
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={handleSendCode}
                disabled={sending}
              >
                {sending ? <CircularProgress size={24} color="inherit" /> : 'Send Code'}
              </Button>
            </Box>
          ) : (
            <form onSubmit={handleVerify}>
              <TextField
                fullWidth
                label="6-Digit Code"
                variant="outlined"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                sx={{ mb: 3 }}
                required
                autoFocus
                inputProps={{
                  maxLength: 6,
                  style: { textAlign: 'center', letterSpacing: '8px', fontSize: '1.5rem' },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading || code.length !== 6}
                sx={{ mb: 2 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify Code'}
              </Button>
              <Box textAlign="center">
                <Button
                  variant="text"
                  color="secondary"
                  size="small"
                  onClick={handleSendCode}
                  disabled={sending}
                >
                  Resend Code
                </Button>
              </Box>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
