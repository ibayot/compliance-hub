'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Description as DocumentsIcon,
  Gavel as IssuancesIcon,
  BugReport as TicketsIcon,
  Business as UnitsIcon,
  Assessment as MetricsIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  MenuBook as ManualIcon,
} from '@mui/icons-material';
import type { ElementType } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

interface NavItem {
  label: string;
  icon: ElementType;
  path: string;
  roles: string[];
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const { isCollapsed, drawerWidth } = useSidebar();

  const mainNavItems: NavItem[] = [
    { label: 'Dashboard', icon: DashboardIcon, path: '/dashboard', roles: ['all'] },
    { label: 'Documents', icon: DocumentsIcon, path: '/dashboard/documents', roles: ['all'] },
    { label: 'Issuances', icon: IssuancesIcon, path: '/dashboard/issuances', roles: ['all'] },
    { label: 'Issues', icon: TicketsIcon, path: '/dashboard/tickets', roles: ['all'] },
  ];

  const adminNavItems: NavItem[] = [
    { label: 'Units', icon: UnitsIcon, path: '/dashboard/units', roles: ['super_admin'] },
    { label: 'Metrics', icon: MetricsIcon, path: '/dashboard/metrics', roles: ['super_admin', 'reviewer'] },
    { label: 'Reviews', icon: SecurityIcon, path: '/dashboard/reviews', roles: ['super_admin', 'reviewer'] },
  ];

  const settingsNavItems: NavItem[] = [
    { label: 'User Manual', icon: ManualIcon, path: '/dashboard/user-manual', roles: ['all'] },
    { label: 'Settings', icon: SettingsIcon, path: '/dashboard/settings', roles: ['all'] },
  ];

  const hasAccess = (roles: string[]) => {
    if (roles.includes('all')) return true;
    if (!user) return false;
    return roles.includes(user.role);
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    if (isMobile) {
      onMobileClose();
    }
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = pathname === item.path || pathname?.startsWith(`${item.path}/`);

    const content = (
      <ListItemButton
        onClick={() => handleNavigate(item.path)}
        selected={isActive}
        sx={{
          borderRadius: 2,
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          px: isCollapsed ? 1 : 2,
          '&.Mui-selected': {
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            '& .MuiListItemIcon-root': {
              color: 'primary.contrastText',
            },
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: isCollapsed ? 'auto' : 40 }}>
          <Icon />
        </ListItemIcon>
        {!isCollapsed && <ListItemText primary={item.label} />}
      </ListItemButton>
    );

    if (isCollapsed) {
      return (
        <Tooltip title={item.label} placement="right" arrow>
          {content}
        </Tooltip>
      );
    }

    return content;
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: isCollapsed ? 1 : 3, py: 2, justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
        {isCollapsed ? (
          <Typography variant="h6" component="div" sx={{ fontWeight: 700, color: 'primary.main' }}>
            CH
          </Typography>
        ) : (
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, color: 'primary.main' }}>
            Compliance Hub
          </Typography>
        )}
      </Toolbar>

      <Divider />

      <List sx={{ px: isCollapsed ? 1 : 2, py: 1 }}>
        {mainNavItems.filter((item) => hasAccess(item.roles)).map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            {renderNavItem(item)}
          </ListItem>
        ))}
      </List>

      {adminNavItems.some((item) => hasAccess(item.roles)) && (
        <>
          <Divider sx={{ mx: isCollapsed ? 1 : 2, my: 1 }} />
          {!isCollapsed && (
            <Typography variant="overline" sx={{ px: 3, py: 1, color: 'text.secondary', fontWeight: 600 }}>
              Administration
            </Typography>
          )}
          <List sx={{ px: isCollapsed ? 1 : 2, py: 1 }}>
            {adminNavItems.filter((item) => hasAccess(item.roles)).map((item) => (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                {renderNavItem(item)}
              </ListItem>
            ))}
          </List>
        </>
      )}

      <Box sx={{ flexGrow: 1 }} />

      <Divider sx={{ mx: isCollapsed ? 1 : 2, my: 1 }} />

      <List sx={{ px: isCollapsed ? 1 : 2, py: 1 }}>
        {settingsNavItems.filter((item) => hasAccess(item.roles)).map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            {renderNavItem(item)}
          </ListItem>
        ))}
      </List>

      {!isCollapsed && (
        <Box sx={{ px: 3, py: 2, bgcolor: 'background.default' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.role.replace('_', ' ').toUpperCase()}
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 260,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            borderRight: '1px solid',
            borderColor: 'divider',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </>
  );
}
