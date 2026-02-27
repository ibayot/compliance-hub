'use client';

import { usePathname } from 'next/navigation';
import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Breadcrumbs,
  Link,
  Menu,
  MenuItem,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  MenuOpen as MenuOpenIcon,
  ArrowBack as BackIcon,
  AccountCircle,
  Logout as LogoutIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { useState } from 'react';

interface AppBarProps {
  onMenuClick: () => void;
}

/** Detect UUID-like or numeric-id-like segments that shouldn't show verbatim in breadcrumbs */
const isIdSegment = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ||
  /^\d+$/.test(s);

export default function AppBar({ onMenuClick }: AppBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isCollapsed, toggleSidebar, drawerWidth } = useSidebar();
  const { pageTitle } = usePageTitle();
  const { mode, toggleMode } = useThemeMode();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Generate breadcrumbs from pathname
  // Skip 'dashboard' segment — all pages are inside dashboard already
  const generateBreadcrumbs = () => {
    const paths: string[] = pathname?.split('/').filter(Boolean) || [];
    const breadcrumbs: { label: string; path: string }[] = [];

    let currentPath = '';
    paths.forEach((segment: string, index: number) => {
      currentPath += `/${segment}`;

      // Skip [bracket] template segments
      if (segment.startsWith('[')) return;

      // Skip the root 'dashboard' segment when there are other segments
      if (segment === 'dashboard' && paths.length > 1) return;

      // Format label
      let label = segment
        .split('-')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // For UUID / numeric ID segments: replace with context title or generic label
      if (isIdSegment(segment)) {
        // Check if this is the last segment and we have a page title
        const isLast = index === paths.length - 1;
        if (isLast && pageTitle) {
          label = pageTitle;
        } else {
          // Don't add ID-only breadcrumb if no label available
          return;
        }
      }

      if (segment === 'dashboard') label = 'Dashboard';

      breadcrumbs.push({ label, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();
  const canGoBack = breadcrumbs.length > 1;

  const handleBack = () => {
    router.back();
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
  };

  const handleSettings = () => {
    handleProfileMenuClose();
    router.push('/dashboard/settings');
  };

  return (
    <MuiAppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        bgcolor: 'background.paper',
        color: 'text.primary',
        boxShadow: 1,
        transition: (theme) => theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      }}
    >
      <Toolbar>
        {/* Mobile menu button */}
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        {/* Desktop toggle button */}
        <IconButton
          color="inherit"
          aria-label="toggle sidebar"
          edge="start"
          onClick={toggleSidebar}
          sx={{ mr: 2, display: { xs: 'none', md: 'inline-flex' } }}
        >
          {isCollapsed ? <MenuIcon /> : <MenuOpenIcon />}
        </IconButton>

        {/* Back button */}
        {canGoBack && (
          <IconButton
            color="inherit"
            aria-label="go back"
            edge="start"
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            <BackIcon />
          </IconButton>
        )}

        {/* Breadcrumbs */}
        <Box sx={{ flexGrow: 1 }}>
          <Breadcrumbs aria-label="breadcrumb">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              
              if (isLast) {
                return (
                  <Typography key={crumb.path} color="text.primary" fontWeight={600}>
                    {crumb.label}
                  </Typography>
                );
              }

              return (
                <Link
                  key={crumb.path}
                  underline="hover"
                  color="inherit"
                  href={crumb.path}
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(crumb.path);
                  }}
                  sx={{ cursor: 'pointer' }}
                >
                  {crumb.label}
                </Link>
              );
            })}
          </Breadcrumbs>
        </Box>

        {/* User menu */}
        <Box>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </Avatar>
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={toggleMode}>
              {mode === 'dark' ? <LightModeIcon sx={{ mr: 1 }} /> : <DarkModeIcon sx={{ mr: 1 }} />}
              {mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </MenuItem>
            <MenuItem onClick={handleSettings}>
              <AccountCircle sx={{ mr: 1 }} />
              Settings
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </MuiAppBar>
  );
}
