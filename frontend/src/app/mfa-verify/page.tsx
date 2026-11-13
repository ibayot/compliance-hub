'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { enqueueSnackbar, closeSnackbar } from 'notistack';
import { tokenStore } from '@/lib/api/client';
import { completeInteractiveSignIn } from '@/lib/auth/session-recovery';
import { clearExpiredDestination, signInDestination } from '@/lib/auth/sign-in-destination';

export default function MfaVerifyPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const returnTo = signInDestination(state?.returnTo);
  const [code, setCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [temporaryCode, setTemporaryCode] = useState('');
  const temporaryMode = Boolean(temporaryCode);
  const [resending, setResending] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [resendSeconds, setResendSeconds] = useState(60);
  const [resendNotice, setResendNotice] = useState('');
  const pendingOperation = useRef(false);
  const challengeEnded = useRef(false);

  useEffect(() => {
    const token = sessionStorage.getItem('mfaTempToken');
    if (!token) {
      navigate('/login', { replace: true, state: { returnTo } });
    } else {
      setTempToken(token);
      
      const testCode = sessionStorage.getItem('mfaTestModeCode');
      setTemporaryCode(testCode || '');
      const savedDeadline = Number(sessionStorage.getItem('mfaResendAvailableAt'));
      const deadline = savedDeadline > 0 ? savedDeadline : Date.now() + 60000;
      sessionStorage.setItem('mfaResendAvailableAt', String(deadline));
      setResendAvailableAt(deadline);
    }
  }, [navigate, returnTo]);

  useEffect(() => {
    if (!temporaryCode) return;
    const snackbarId = enqueueSnackbar(`Temporary MFA Mode — Your MFA code is: ${temporaryCode}`, {
      variant: 'info', persist: true, anchorOrigin: { vertical: 'top', horizontal: 'center' },
    });
    return () => closeSnackbar(snackbarId);
  }, [temporaryCode]);

  useEffect(() => {
    if (!resendAvailableAt) return;
    const update = () => setResendSeconds(Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [resendAvailableAt]);

  const setCooldown = (seconds: number) => {
    const deadline = Date.now() + seconds * 1000;
    sessionStorage.setItem('mfaResendAvailableAt', String(deadline));
    setResendAvailableAt(deadline);
  };

  const handleChallengeError = (err: any) => {
    const data = err.response?.data;
    const failureCode = typeof data?.code === 'string' ? data.code : '';
    const rawMessage = typeof data === 'string' ? data : data?.message;
    const fallback = failureCode === 'MFA_ACCOUNT_LOCKED'
      ? 'Your account is locked after repeated MFA failures. Wait for the 15-minute lock to expire or contact an authorized account manager.'
      : 'Unable to complete verification. Please try again.';
    const message = typeof rawMessage === 'string' && rawMessage.trim() ? rawMessage : fallback;
    const attemptsExhausted = failureCode === 'MFA_CHALLENGE_EXHAUSTED' || /three MFA attempts/i.test(message);
    const mustReauthenticate = err.response?.status === 401
      || ([400, 403].includes(err.response?.status) && (/log in again|sign in again|no verification code|code has expired|expired temporary token/i.test(message)
        || ['MFA_CHALLENGE_UNAVAILABLE', 'MFA_CHALLENGE_EXPIRED', 'MFA_ACCOUNT_UNAVAILABLE'].includes(failureCode)));
    const accountLocked = err.response?.status === 429 && (failureCode === 'MFA_ACCOUNT_LOCKED' || /locked/i.test(message));
    if (mustReauthenticate || accountLocked) {
      challengeEnded.current = true;
      pendingOperation.current = true;
      for (const key of ['mfaTempToken', 'mfaTestModeCode', 'mfaResendAvailableAt']) sessionStorage.removeItem(key);
      setTempToken(null);
      setTemporaryCode('');
      setCode('');
      navigate(`/login?reason=${failureCode === 'UNIT_ACCESS_NOT_APPROVED' ? 'unit_not_approved' : accountLocked ? 'mfa_locked' : attemptsExhausted ? 'mfa_failed' : 'mfa_restart'}`, { replace: true, state: { returnTo } });
      return;
    }
    if (err.response?.status === 429) {
      const retry = Number(err.response?.data?.retryAfterSeconds);
      setCooldown(Number.isFinite(retry) && retry > 0 ? Math.min(3600, retry) : 60);
    }
    setError(message);
  };

  const handleResend = async () => {
    if (!tempToken || challengeEnded.current || pendingOperation.current || resendSeconds > 0) return;
    pendingOperation.current = true;
    setResending(true);
    setError(null);
    setResendNotice('');
    try {
      const response = await authApi.resendMfaCode(tempToken);
      setCode('');
      setTemporaryCode(response.testModeCode || '');
      if (response.testModeCode) sessionStorage.setItem('mfaTestModeCode', response.testModeCode);
      else sessionStorage.removeItem('mfaTestModeCode');
      const retry = Number(response.resendAfterSeconds);
      setCooldown(Number.isFinite(retry) && retry > 0 ? Math.min(3600, retry) : 60);
      setResendNotice(response.message);
    } catch (err: any) {
      handleChallengeError(err);
    } finally {
      if (!challengeEnded.current) pendingOperation.current = false;
      setResending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }
    if (!tempToken || challengeEnded.current || pendingOperation.current) return;

    pendingOperation.current = true;
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.verifyMfaCode(tempToken, code, rememberDevice);
      completeInteractiveSignIn();
      enqueueSnackbar('MFA Verification successful.', { variant: 'success' });
      
      // Native clients receive bearer tokens; browser clients use HttpOnly cookies.
      if (response.accessToken && response.refreshToken) {
        tokenStore.set('accessToken', response.accessToken);
        tokenStore.set('refreshToken', response.refreshToken);
      }
      if (response.deviceToken) {
        localStorage.setItem('deviceToken', response.deviceToken);
      }
      
      // Clear temp token
      sessionStorage.removeItem('mfaTempToken');
      sessionStorage.removeItem('mfaTestModeCode');
      sessionStorage.removeItem('mfaResendAvailableAt');
      sessionStorage.removeItem('isSessionLocked');
      clearExpiredDestination();
      
      // Force reload to let AuthContext pick up the tokens
      window.location.replace(returnTo ?? '/dashboard');
    } catch (err: any) {
      handleChallengeError(err);
    } finally {
      if (!challengeEnded.current) pendingOperation.current = false;
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
            {temporaryMode
              ? 'Enter the 6-digit code shown in the Temporary MFA Mode alert.'
              : 'Enter the 6-digit verification code sent to the configured email delivery destination.'}
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            You have 3 attempts for this login. After 3 failed attempts, you must log in again. After 9 total failed attempts, your account will be locked for 15 minutes.
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          {resendNotice && <Alert severity="success" sx={{ mb: 3 }}>{resendNotice}</Alert>}

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
                inputMode: 'numeric',
                autoComplete: 'one-time-code',
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
              disabled={loading || resending || code.length !== 6}
              sx={{ mb: 2 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify Code'}
            </Button>
          </form>
          <Button type="button" variant="outlined" fullWidth disabled={loading || resending || resendSeconds > 0} onClick={handleResend} sx={{ mb: 1 }}>
            {resending ? 'Requesting Code...' : resendSeconds > 0 ? `Resend Code in ${resendSeconds}s` : 'Resend Code'}
          </Button>
          <Typography variant="caption" color="text.secondary">
            Use the newest code. Requesting another code does not extend your current sign-in time limit.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
