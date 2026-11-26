import { useState, type MouseEvent } from 'react';
import { AppBar, Avatar, Badge, Box, Breadcrumbs, Button, Chip, IconButton, Menu, MenuItem, Toolbar, Typography } from '@mui/material';
import { ArrowBack, Menu as MenuIcon, MenuOpen, Notifications } from '@mui/icons-material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileNavigation } from '@/contexts/MobileNavigationContext';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { demoUserPaths } from '@/lib/api/demo';
import type { AppRelease } from '@/lib/api/changelog';
import ChangelogDialog from '@/components/ChangelogDialog';
import FeedbackModal from '@/components/FeedbackModal';
import { useDemoDashboard } from './useDemoDashboard';

const labels: Record<string, string> = {
  [demoUserPaths.dashboard]: 'Dashboard',
  [demoUserPaths.tickets]: 'My Tickets',
  [demoUserPaths.knowledge]: 'Knowledge Base',
  [demoUserPaths.settings]: 'Settings',
  [demoUserPaths.manual]: 'User Manual',
};
const sampleReleases: AppRelease[] = [{
  id: 'demo-release', version: '1.0.0-demo', title: 'Sample release notes',
  displayDays: 1, status: 'published', notes: [{
    id: 'demo-workspace-note', category: 'feature', audience: 'end_user', capabilityKeys: [],
    title: 'Track your ICT requests', description: 'Open My Tickets to see progress, read resolution notes and rate the service.',
  }],
}];

export default function DemoUserAppBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { logout } = useAuth();
  const { drawerWidth, toggleSidebar } = useSidebar();
  const { layoutMode, mode, colorTheme, layoutPreset, mobileView, setAppearance, setMobileView } = useThemeMode();
  const { canGoBack, goBack } = useMobileNavigation();
  const { pageTitle } = usePageTitle();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dashboard = useDemoDashboard();
  const detail = pathname.startsWith('/operations/tickets/');
  const [profile, setProfile] = useState<HTMLElement | null>(null);
  const [notifications, setNotifications] = useState<HTMLElement | null>(null);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [readCount, setReadCount] = useState(0);
  const pending = dashboard.data?.pendingCount ?? 0;

  return (
    <AppBar id="app-top-bar" className="app-global-appbar" position="fixed" data-app-layout-mode={layoutMode}
      sx={{ left: { xs: 0, md: drawerWidth }, width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
        bgcolor: 'background.paper', color: 'text.primary', borderBottomWidth: 'var(--app-header-divider-height)', pt: 'var(--app-header-safe-top)',
        '& .MuiToolbar-root': { minHeight: 'var(--app-toolbar-height)', px: { xs: 1, sm: 2 }, gap: 0.5 },
      }}>
      <Toolbar>
        <IconButton aria-label="Open menu" onClick={onMenuClick} sx={{ display: { md: 'none' } }}><MenuIcon /></IconButton>
        <IconButton aria-label="Toggle sidebar" onClick={toggleSidebar} sx={{ display: { xs: 'none', md: 'inline-flex' } }}><MenuOpen /></IconButton>
        {canGoBack && <IconButton aria-label="Go back" onClick={goBack}><ArrowBack /></IconButton>}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Breadcrumbs aria-label="Breadcrumb" sx={{ '& ol': { flexWrap: 'nowrap' } }}>
            {detail && <Button component={Link} to={demoUserPaths.tickets} size="small" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>My Tickets</Button>}
            <Typography color="text.primary" fontWeight={600} noWrap aria-current="page">
              {detail ? pageTitle ?? 'Ticket Details' : labels[pathname] ?? 'Dashboard'}
            </Typography>
          </Breadcrumbs>
        </Box>
        <Chip size="small" label="Demo" color="warning" variant="outlined" />
        <IconButton aria-label="Notifications" aria-haspopup="menu" aria-expanded={Boolean(notifications)}
          onClick={(event: MouseEvent<HTMLElement>) => setNotifications(event.currentTarget)}>
          <Badge badgeContent={Math.max(0, pending - readCount)} color="error"><Notifications /></Badge>
        </IconButton>
        <IconButton aria-label="Profile and preferences" aria-haspopup="menu" aria-expanded={Boolean(profile)}
          onClick={(event: MouseEvent<HTMLElement>) => setProfile(event.currentTarget)}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13 }}>DU</Avatar>
        </IconButton>
        <Menu anchorEl={profile} open={Boolean(profile)} onClose={() => setProfile(null)}>
          <MenuItem disabled>Demo User</MenuItem>
          <MenuItem onClick={() => { setProfile(null); navigate(demoUserPaths.settings); }}>Appearance &amp; Settings</MenuItem>
          <MenuItem onClick={() => { setProfile(null); setAppearance({ colorTheme, layoutPreset, mode: mode === 'dark' ? 'light' : 'dark' }); }}>
            {mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </MenuItem>
          <MenuItem onClick={() => { setMobileView(!mobileView); setProfile(null); }}>{mobileView ? 'Desktop View' : 'Mobile View'}</MenuItem>
          <MenuItem onClick={() => { setProfile(null); setChangelogOpen(true); }}>What&apos;s New</MenuItem>
          <MenuItem onClick={() => { setProfile(null); setFeedbackOpen(true); }}>Suggestions</MenuItem>
          <MenuItem onClick={() => void logout()}>Sign out</MenuItem>
        </Menu>
        <Menu anchorEl={notifications} open={Boolean(notifications)} onClose={() => setNotifications(null)}>
          <Typography sx={{ px: 2, py: 1 }} fontWeight={700}>Notifications</Typography>
          {pending > 0 ? [
            <MenuItem key="ratings" onClick={() => {
              setNotifications(null); navigate(`${demoUserPaths.tickets}?filter=pending_satisfaction`);
            }}>{pending} demo {pending === 1 ? 'ticket needs' : 'tickets need'} a rating</MenuItem>,
            <MenuItem key="read" onClick={() => { setReadCount(pending); setNotifications(null); }}>Mark All as Read</MenuItem>,
          ] : <MenuItem disabled>No demo notifications</MenuItem>}
        </Menu>
        <ChangelogDialog open={changelogOpen} releases={sampleReleases} manual onClose={() => setChangelogOpen(false)} onAcknowledge={() => setChangelogOpen(false)} />
        <FeedbackModal demo manualOpen={feedbackOpen} onManualClose={() => setFeedbackOpen(false)} />
      </Toolbar>
    </AppBar>
  );
}
