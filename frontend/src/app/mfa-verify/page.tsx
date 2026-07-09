'use client';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { authApi } from '@/lib/api/auth';
import { enqueueSnackbar } from 'notistack';
import { tokenStore } from '@/lib/api/client';

export default function MfaVerifyPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempToken, setTempToken] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem('mfaTempToken');
    if (!token) {
      navigate('/login');
    } else {
      setTempToken(token);
    }
  }, [navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }
    if (!tempToken) return;

    setLoading(true);
    setError(null);
    try {
      const response = await authApi.verifyMfaCode(tempToken, code, rememberDevice);
      enqueueSnackbar('MFA Verification successful.', { variant: 'success' });
      
      // Store standard tokens
      tokenStore.set('accessToken', response.accessToken);
      tokenStore.set('refreshToken', response.refreshToken);
      if (response.deviceToken) {
        localStorage.setItem('deviceToken', response.deviceToken);
      }
      
      // Clear temp token
      sessionStorage.removeItem('mfaTempToken');
      
      // Force reload to let AuthContext pick up the tokens
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  if (!tempToken) {
    return null;
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
            We've sent a 6-digit verification code to your registered email address.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

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
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  color="primary"
                />
              }
              label="Remember this device for 7 days"
              sx={{ mb: 3, display: 'block' }}
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
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
