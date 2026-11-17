'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isHomeScreenApp } from '@/lib/install-web-app';
import { Box, CircularProgress } from '@mui/material';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      // Existing Home Screen icons may still launch /. Start at the protected
      // route so it can check for an existing cookie before showing sign-in.
      if (!isAuthenticated && isHomeScreenApp()) {
        // A fresh document lets auth begin in its protected-route loading state.
        window.location.replace('/dashboard');
        return;
      }
      router.replace(isAuthenticated ? '/dashboard' : '/login');
    }
  }, [isAuthenticated, loading, router]);

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <CircularProgress />
    </Box>
  );
}
