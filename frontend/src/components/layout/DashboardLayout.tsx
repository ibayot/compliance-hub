'use client';

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert, Box, CircularProgress, Paper, Toolbar, Typography } from '@mui/material';
import Sidebar from './Sidebar';
import AppBar from './AppBar';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { PageTitleProvider } from '@/contexts/PageTitleContext';
import { useServiceAvailability } from '@/lib/utils/useServiceAvailability';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <PageTitleProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </PageTitleProvider>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { drawerWidth } = useSidebar();
  const location = useLocation();
  const { services, loaded } = useServiceAvailability();

  const compliancePaths = [
    '/dashboard/documents',
    '/dashboard/repository',
    '/dashboard/issuances',
    '/dashboard/metrics',
    '/dashboard/kpi',
    '/dashboard/reviews',
    '/dashboard/reports',
    '/dashboard/mov',
  ];
  const isComplianceRoute = compliancePaths.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`));
  const showComplianceUnavailable = isComplianceRoute && loaded && services.compliance === false;
  const isComplianceLoading = isComplianceRoute && !loaded;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar onMenuClick={handleDrawerToggle} />

      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          minHeight: '100vh',
          overflow: 'auto',
          ml: { md: `${drawerWidth}px` },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          transition: (theme) =>
            theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
        }}
      >
        {/* Toolbar spacing */}
        <Toolbar />

        {/* Page content with 90% width */}
        <Box
          sx={{
            width: '90%',
            mx: 'auto',
            py: 4,
          }}
        >
          {isComplianceLoading ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress size={24} />
              <Typography variant="body2" color="text.secondary" mt={1}>
                Checking service availability...
              </Typography>
            </Paper>
          ) : showComplianceUnavailable ? (
            <Paper sx={{ p: 3 }}>
              <Alert severity="warning">
                Service currently unavailable. Please try again later.
              </Alert>
            </Paper>
          ) : (
            children
          )}
        </Box>
      </Box>
    </Box>
  );
}
