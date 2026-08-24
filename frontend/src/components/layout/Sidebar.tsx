'use client';

import { useLocation, useNavigate } from 'react-router-dom';
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
  Insights as KpiIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  MenuBook as ManualIcon,
  FolderOpen as RepositoryIcon,
  Summarize as ReportsIcon,
  FactCheck as MovIcon,
  Tune as TicketSettingsIcon,
  EventAvailable as AttendanceIcon,
  BarChart as TicketReportsIcon,
  LibraryBooks as KBIcon,
  History as HistoryIcon,
  CalendarMonth as DutiesIcon,
} from '@mui/icons-material';
import type { ElementType } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import type { RoleCapabilityRecord } from '@/lib/api/users';
import { usersApi } from '@/lib/api/users';
import { useState, useEffect } from 'react';

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

interface NavItem {
  label: string;
  icon: ElementType;
  path: string;
  roles: string[];
  service?: 'users' | 'ticketing' | 'compliance' | 'core';
  /** If set, also grant access when any of myCap[capabilityKey] is true */
  capabilityKeys?: (keyof RoleCapabilityRecord)[];
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, myCap } = useAuth();
  const { isCollapsed, drawerWidth } = useSidebar();
  const [appMode, setAppMode] = useState<string>('loading');

  useEffect(() => {
    usersApi.getAppMode().then((res: any) => {
      setAppMode(res.appMode || 'full');
    }).catch(() => setAppMode('full'));
  }, []);

  const mainNavItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: DashboardIcon,
      path: '/dashboard',
      roles: ['all'],
      service: 'core',
    },
    {
      label: 'Tickets',
      icon: TicketsIcon,
      path: '/operations/tickets',
      roles: ['all'],
      service: 'ticketing',
    },
    {
      label: 'Knowledge Base',
      icon: KBIcon,
      path: '/operations/knowledge-base',
      roles: ['all'],
      service: 'ticketing',
    },
    {
      label: 'Duties',
      icon: DutiesIcon,
      path: '/operations/duties',
      roles: [],
      service: 'core',
      capabilityKeys: ['isDutyViewerAccess', 'isDutyAdminAccess'],
    },
    {
      label: 'Documents',
      icon: DocumentsIcon,
      path: '/governance/documents',
      roles: ['super_admin'],
      service: 'compliance',
      capabilityKeys: ['isDocumentsAccess'],
    },
    {
      label: 'Repository',
      icon: RepositoryIcon,
      path: '/governance/repository',
      roles: ['super_admin'],
      service: 'compliance',
      capabilityKeys: ['isRepositoryAccess'],
    },
    {
      label: 'Issuances',
      icon: IssuancesIcon,
      path: '/governance/issuances',
      roles: ['super_admin'],
      service: 'compliance',
      capabilityKeys: ['isIssuancesAccess'],
    },
  ];

  const adminNavItems: NavItem[] = [
    {
      label: 'Units',
      icon: UnitsIcon,
      path: '/admin/units',
      roles: ['super_admin', 'section_head'],
      service: 'core',
    },
    {
      label: 'Metrics',
      icon: MetricsIcon,
      path: '/governance/metrics',
      roles: ['super_admin'],
      service: 'compliance',
      capabilityKeys: ['isMetricsAccess'],
    },
    {
      label: 'KPI',
      icon: KpiIcon,
      path: '/governance/kpi',
      roles: ['super_admin'],
      service: 'compliance',
      capabilityKeys: ['isKpiAccess'],
    },
    {
      label: 'Ticket Settings',
      icon: TicketSettingsIcon,
      path: '/operations/settings',
      roles: ['super_admin'],
      service: 'ticketing',
      capabilityKeys: ['isTicketSettingsFocal'],
    },
    {
      label: 'Ticket Reports',
      icon: TicketReportsIcon,
      path: '/operations/reports',
      roles: ['super_admin', 'section_head'],
      service: 'ticketing',
      capabilityKeys: ['isTicketSettingsFocal', 'isDesktop', 'isItSupport', 'isPantawidIct'],
    },
    {
      label: 'Attendance',
      icon: AttendanceIcon,
      path: '/admin/attendance',
      roles: ['super_admin'],
      service: 'ticketing',
      capabilityKeys: ['isAttendanceAccess'],
    },
    {
      label: 'Reviews',
      icon: SecurityIcon,
      path: '/governance/reviews',
      roles: ['super_admin'],
      service: 'compliance',
      capabilityKeys: ['isReviewsAccess'],
    },
    {
      label: 'Reports',
      icon: ReportsIcon,
      path: '/governance/reports',
      roles: ['super_admin'],
      service: 'compliance',
      capabilityKeys: ['isReportsAccess'],
    },
    {
      label: 'MoV Builder',
      icon: MovIcon,
      path: '/governance/mov',
      roles: ['super_admin'],
      service: 'compliance',
      capabilityKeys: ['isMovAccess'],
    },
    {
      label: 'Audit Logs',
      icon: HistoryIcon,
      path: '/admin/audit-logs',
      roles: ['super_admin', 'compliance_officer'],
      service: 'users',
    },
  ];

  const settingsNavItems: NavItem[] = [
    { label: 'User Manual', icon: ManualIcon, path: '/admin/user-manual', roles: ['all'] },
    { label: 'Settings', icon: SettingsIcon, path: '/admin/settings', roles: ['all'] },
  ];

  const hasAccess = (
    roles: string[],
    capabilityKeys?: (keyof RoleCapabilityRecord)[],
    service?: NavItem['service'],
  ) => {
    // Application Mode filter: hide strictly unrelated services
    // Shared services (users, core) are always visible
    if (appMode === 'loading' && service !== 'core' && service !== 'users' && service !== undefined) return false;
    if (service === 'ticketing' && appMode === 'compliance_only') return false;
    if (service === 'compliance' && appMode === 'ticketing_only') return false;

    if (roles.includes('all')) return true;
    if (!user) return false;
    if (capabilityKeys && myCap && capabilityKeys.some((k) => !!myCap[k])) return true;
    if (roles.includes(user.role)) return true;
    return false;
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      onMobileClose();
    }
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    // Dashboard: exact match only — sub-routes like /governance/documents should NOT highlight it
    const isActive =
      item.path === '/dashboard'
        ? location.pathname === '/dashboard'
        : location.pathname === item.path || location.pathname?.startsWith(`${item.path}/`);

    const content = (
      <ListItemButton
        aria-label={item.label}
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

  let sidebarLogo = '/images/logos/app-logo.png';
  let sidebarTitle = 'RICTMS Compliance Hub';

  if (user?.role === 'user') {
    sidebarLogo = '/images/logos/ticketing-logo.png';
    sidebarTitle = 'RICTMS Helpdesk';
  } else {
    if (appMode === 'ticketing_only') {
      sidebarLogo = '/images/logos/ticketing-logo.png';
      sidebarTitle = 'RICTMS Helpdesk';
    } else if (appMode === 'compliance_only') {
      sidebarLogo = '/images/logos/compliance-logo.png';
      sidebarTitle = 'RICTMS Compliance';
    }
  }

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar
        sx={{
          px: isCollapsed ? 1 : 2,
          py: 2,
          justifyContent: isCollapsed ? 'center' : 'flex-start',
        }}
      >
        <Box 
          component="img" 
          src={sidebarLogo} 
          alt="Logo" 
          sx={{ 
            height: 32, 
            width: 'auto', 
            objectFit: 'contain', 
            mr: isCollapsed ? 0 : 1.5 
          }} 
        />
        {!isCollapsed && (
          <Typography
            variant="subtitle1"
            component="div"
            sx={{ fontWeight: 700, color: 'primary.main', lineHeight: 1.2, flexGrow: 1 }}
          >
            {sidebarTitle}
          </Typography>
        )}
      </Toolbar>

      <Divider />

      <List sx={{ px: isCollapsed ? 1 : 2, py: 1 }}>
        {mainNavItems
          .filter((item) => hasAccess(item.roles, item.capabilityKeys, item.service))
          .map((item) => (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              {renderNavItem(item)}
            </ListItem>
          ))}
      </List>

      {adminNavItems.some((item) =>
        hasAccess(item.roles, item.capabilityKeys, item.service),
      ) && (
        <>
          <Divider sx={{ mx: isCollapsed ? 1 : 2, my: 1 }} />
          {!isCollapsed && (
            <Typography
              variant="overline"
              sx={{ px: 3, py: 1, color: 'text.secondary', fontWeight: 600 }}
            >
              Administration
            </Typography>
          )}
          <List sx={{ px: isCollapsed ? 1 : 2, py: 1 }}>
            {adminNavItems
              .filter((item) =>
                hasAccess(item.roles, item.capabilityKeys, item.service),
              )
              .map((item) => (
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
        {settingsNavItems
          .filter((item) => hasAccess(item.roles, item.capabilityKeys, item.service))
          .map((item) => (
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
          width: drawerWidth,
          flexShrink: 0,
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
