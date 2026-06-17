'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeedbackModal from '@/components/FeedbackModal';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <DashboardLayout>{children}</DashboardLayout>
      <AutoFeedback />
    </>
  );
}

function AutoFeedback() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if we already showed it today
    const lastPrompt = localStorage.getItem('lastFeedbackPromptDate');
    const today = new Date().toISOString().split('T')[0];

    if (lastPrompt !== today) {
      // 5 minutes = 300,000 ms
      const timerId = setTimeout(
        () => {
          setOpen(true);
          localStorage.setItem('lastFeedbackPromptDate', today);
        },
        5 * 60 * 1000,
      );

      return () => clearTimeout(timerId);
    }
  }, []);

  return <FeedbackModal manualOpen={open} onManualClose={() => setOpen(false)} />;
}
