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
  service?: 'users' | 'ticketing' | 'compliance' | 'core';
  /** Optional roleCode values that also grant access (e.g. 'section_head') */
  roleCodes?: string[];
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const { isCollapsed, drawerWidth } = useSidebar();

  const mainNavItems: NavItem[] = [
    { label: 'Dashboard', icon: DashboardIcon, path: '/dashboard', roles: ['all'], service: 'core' },
    { label: 'Tickets', icon: TicketsIcon, path: '/dashboard/tickets', roles: ['all'], service: 'ticketing' },
    { label: 'Documents', icon: DocumentsIcon, path: '/dashboard/documents', roles: ['super_admin', 'reviewer', 'compliance_officer', 'section_head', 'focal', 'technician', 'technician_desktop', 'technician_it_support', 'desktop_sr', 'it_support_sr', 'pantawid_ict', 'auditor'], service: 'compliance', roleCodes: ['focal', 'section_head'] },
    { label: 'Repository', icon: RepositoryIcon, path: '/dashboard/repository', roles: ['super_admin', 'reviewer', 'compliance_officer', 'section_head', 'focal', 'technician', 'technician_desktop', 'technician_it_support', 'desktop_sr', 'it_support_sr', 'pantawid_ict', 'auditor'], service: 'compliance', roleCodes: ['focal', 'section_head'] },
    { label: 'Issuances', icon: IssuancesIcon, path: '/dashboard/issuances', roles: ['super_admin', 'reviewer', 'compliance_officer'], service: 'compliance' },
  ];

  const adminNavItems: NavItem[] = [
    { label: 'Units', icon: UnitsIcon, path: '/dashboard/units', roles: ['super_admin', 'section_head'], service: 'users' },
    { label: 'Metrics', icon: MetricsIcon, path: '/dashboard/metrics', roles: ['super_admin', 'reviewer', 'compliance_officer'], service: 'compliance' },
    { label: 'KPI', icon: KpiIcon, path: '/dashboard/kpi', roles: ['super_admin', 'reviewer', 'compliance_officer', 'section_head', 'focal', 'auditor'], service: 'compliance', roleCodes: ['focal', 'section_head'] },
    { label: 'Ticket Settings', icon: TicketSettingsIcon, path: '/dashboard/ticket-settings', roles: ['super_admin', 'section_head', 'technician', 'technician_desktop', 'technician_it_support', 'desktop_sr', 'it_support_sr', 'pantawid_ict'], service: 'ticketing', roleCodes: ['focal', 'section_head'] },
    { label: 'Ticket Reports', icon: TicketReportsIcon, path: '/dashboard/ticket-reports', roles: ['super_admin', 'focal', 'reviewer', 'section_head', 'compliance_officer', 'technician_it_support', 'technician_desktop', 'it_support_sr', 'desktop_sr', 'pantawid_ict', 'technician'], service: 'ticketing', roleCodes: ['focal'] },
    { label: 'Attendance', icon: AttendanceIcon, path: '/dashboard/attendance', roles: ['super_admin', 'section_head', 'focal', 'reviewer', 'compliance_officer', 'technician', 'technician_desktop', 'technician_it_support', 'technician_it_staff', 'technician_desktop_staff', 'desktop_sr', 'it_support_sr', 'desktop_jr', 'it_support_jr', 'pantawid_ict'], service: 'ticketing', roleCodes: ['focal', 'section_head'] },
    { label: 'Reviews', icon: SecurityIcon, path: '/dashboard/reviews', roles: ['super_admin', 'reviewer', 'compliance_officer'], service: 'compliance' },
    { label: 'Reports', icon: ReportsIcon, path: '/dashboard/reports', roles: ['super_admin', 'reviewer', 'compliance_officer'], service: 'compliance', roleCodes: ['section_head', 'compliance_officer'] },
    { label: 'MoV Builder', icon: MovIcon, path: '/dashboard/mov', roles: ['super_admin', 'reviewer', 'compliance_officer'], service: 'compliance' },
  ];

  const settingsNavItems: NavItem[] = [
    { label: 'User Manual', icon: ManualIcon, path: '/dashboard/user-manual', roles: ['super_admin', 'reviewer', 'compliance_officer', 'focal', 'technician', 'technician_desktop', 'technician_it_support', 'technician_it_staff', 'technician_desktop_staff', 'desktop_sr', 'it_support_sr', 'desktop_jr', 'it_support_jr', 'pantawid_ict', 'auditor', 'user'], roleCodes: ['focal'] },
    { label: 'Settings', icon: SettingsIcon, path: '/dashboard/settings', roles: ['super_admin', 'reviewer', 'compliance_officer', 'focal', 'technician', 'technician_desktop', 'technician_it_support', 'desktop_sr', 'it_support_sr', 'pantawid_ict', 'auditor'], roleCodes: ['focal'] },
  ];

  const hasAccess = (roles: string[], roleCodes?: string[], _service?: NavItem['service']) => {
    if (roles.includes('all')) return true;
    if (user?.role === 'super_admin') return true;
    if (!user) return false;
    if (roles.includes(user.role)) return true;
    if (roleCodes && user.roleCode && roleCodes.includes(user.roleCode)) return true;
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
    // Dashboard: exact match only — sub-routes like /dashboard/documents should NOT highlight it
    const isActive = item.path === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname === item.path || location.pathname?.startsWith(`${item.path}/`);

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
        {mainNavItems.filter((item) => hasAccess(item.roles, item.roleCodes, item.service)).map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            {renderNavItem(item)}
          </ListItem>
        ))}
      </List>

      {adminNavItems.some((item) => hasAccess(item.roles, item.roleCodes, item.service)) && (
        <>
          <Divider sx={{ mx: isCollapsed ? 1 : 2, my: 1 }} />
          {!isCollapsed && (
            <Typography variant="overline" sx={{ px: 3, py: 1, color: 'text.secondary', fontWeight: 600 }}>
              Administration
            </Typography>
          )}
          <List sx={{ px: isCollapsed ? 1 : 2, py: 1 }}>
            {adminNavItems.filter((item) => hasAccess(item.roles, item.roleCodes, item.service)).map((item) => (
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
        {settingsNavItems.filter((item) => hasAccess(item.roles, item.roleCodes, item.service)).map((item) => (
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
