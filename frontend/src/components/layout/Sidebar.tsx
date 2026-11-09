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
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import type { ElementType } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import type { RoleCapabilityRecord } from '@/lib/api/users';
import { usersApi } from '@/lib/api/users';
import { formatPersonName } from '@/lib/utils/person-name';
import { useState, useEffect } from 'react';

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

interface NavItem {
  label: string;
  icon: ElementType;
  path: string;
  service?: 'users' | 'ticketing' | 'compliance' | 'core';
  /** If set, also grant access when any of myCap[capabilityKey] is true */
  capabilityKeys?: (keyof RoleCapabilityRecord)[];
  /** Show this entry to authenticated staff accounts regardless of ticket-management capabilities. */
  staffOnly?: boolean;
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
      service: 'core',
    },
    {
      label: 'Tickets',
      icon: TicketsIcon,
      path: '/operations/tickets',
      service: 'ticketing',
      staffOnly: true,
      capabilityKeys: ['isTicketModuleAccess'],
    },
    {
      label: 'My Tickets',
      icon: TicketsIcon,
      path: '/operations/my-tickets',
      service: 'ticketing',
    },
    {
      label: 'Knowledge Base',
      icon: KBIcon,
      path: '/operations/knowledge-base',
      service: 'ticketing',
      capabilityKeys: ['isTicketModuleAccess'],
    },
    {
      label: 'Duties',
      icon: DutiesIcon,
      path: '/operations/duties',
      service: 'core',
      capabilityKeys: ['isDutyViewerAccess', 'isDutyAdminAccess'],
    },
    {
      label: 'Staff Directory',
      icon: UnitsIcon,
      path: '/operations/staff-directory',
      service: 'users',
      capabilityKeys: ['isStaffDirectoryAccess'],
    },
    {
      label: 'Documents',
      icon: DocumentsIcon,
      path: '/governance/documents',
      service: 'compliance',
      capabilityKeys: ['isDocumentsAccess'],
    },
    {
      label: 'Repository',
      icon: RepositoryIcon,
      path: '/governance/repository',
      service: 'compliance',
      capabilityKeys: ['isRepositoryAccess'],
    },
    {
      label: 'Issuances',
      icon: IssuancesIcon,
      path: '/governance/issuances',
      service: 'compliance',
      capabilityKeys: ['isIssuancesAccess'],
    },
  ];

  const adminNavItems: NavItem[] = [
    {
      label: 'Units',
      icon: UnitsIcon,
      path: '/admin/units',
      service: 'core',
      capabilityKeys: ['isUnitsAccess'],
    },
    {
      label: 'Metrics',
      icon: MetricsIcon,
      path: '/governance/metrics',
      service: 'compliance',
      capabilityKeys: ['isMetricsAccess'],
    },
    {
      label: 'KPI',
      icon: KpiIcon,
      path: '/governance/kpi',
      service: 'compliance',
      capabilityKeys: ['isKpiAccess'],
    },
    {
      label: 'Ticket Settings',
      icon: TicketSettingsIcon,
      path: '/operations/settings',
      service: 'ticketing',
      capabilityKeys: ['isTicketSettingsFocal'],
    },
    {
      label: 'Ticket Reports',
      icon: TicketReportsIcon,
      path: '/operations/reports',
      service: 'ticketing',
      capabilityKeys: ['isTicketReportsAccess'],
    },
    {
      label: 'Attendance',
      icon: AttendanceIcon,
      path: '/admin/attendance',
      service: 'ticketing',
      capabilityKeys: ['isAttendanceAccess'],
    },
    {
      label: 'Reviews',
      icon: SecurityIcon,
      path: '/governance/reviews',
      service: 'compliance',
      capabilityKeys: ['isReviewsAccess'],
    },
    {
      label: 'Reports',
      icon: ReportsIcon,
      path: '/governance/reports',
      service: 'compliance',
      capabilityKeys: ['isReportsAccess'],
    },
    {
      label: 'MoV Builder',
      icon: MovIcon,
      path: '/governance/mov',
      service: 'compliance',
      capabilityKeys: ['isMovAccess'],
    },
    {
      label: 'Audit Logs',
      icon: HistoryIcon,
      path: '/admin/audit-logs',
      service: 'users',
      capabilityKeys: ['isAuditAccess'],
    },
  ];

  const settingsNavItems: NavItem[] = [
    { label: 'User Manual', icon: ManualIcon, path: '/admin/user-manual' },
    { label: 'Settings', icon: SettingsIcon, path: '/admin/settings' },
  ];

  const allNavItems = [...mainNavItems, ...adminNavItems];
  const navigationSections = [
    { id: 'overview', label: 'Overview', items: allNavItems.filter((item) => item.label === 'Dashboard') },
    {
      id: 'service-desk',
      label: 'Service Desk',
      items: allNavItems.filter((item) => ['Tickets', 'My Tickets', 'Knowledge Base', 'Ticket Reports', 'Ticket Settings'].includes(item.label)),
    },
    {
      id: 'operations',
      label: 'Operations',
      items: allNavItems.filter((item) => ['Duties', 'Attendance', 'Staff Directory'].includes(item.label)),
    },
    {
      id: 'governance',
      label: 'Governance & Records',
      items: allNavItems.filter((item) => ['Documents', 'Repository', 'Issuances', 'Metrics', 'KPI', 'Reviews', 'Reports', 'MoV Builder'].includes(item.label)),
    },
    {
      id: 'administration',
      label: 'Administration',
      items: allNavItems.filter((item) => ['Units', 'Audit Logs'].includes(item.label)),
    },
    { id: 'help-settings', label: 'Help & Settings', items: settingsNavItems },
  ];
  const activeSection = navigationSections.find((section) =>
    section.items.some((item) =>
      item.path === '/dashboard'
        ? location.pathname === item.path
        : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
    ),
  );
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    'service-desk': true,
    operations: true,
    governance: true,
    administration: true,
    'help-settings': true,
  });

  useEffect(() => {
    if (!activeSection) return;
    setExpandedSections((current) => ({ ...current, [activeSection.id]: true }));
  }, [activeSection?.id, location.pathname]);

  const hasAccess = (
    capabilityKeys?: (keyof RoleCapabilityRecord)[],
    service?: NavItem['service'],
    staffOnly?: boolean,
  ) => {
    // Application Mode filter: hide strictly unrelated services
    // Shared services (users, core) are always visible
    if (appMode === 'loading' && service !== 'core' && service !== 'users' && service !== undefined) return false;
    if (service === 'ticketing' && appMode === 'compliance_only') return false;
    if (service === 'compliance' && appMode === 'ticketing_only') return false;

    if (!user) return false;
    if (staffOnly && user.role === 'user') return false;
    if (!capabilityKeys || capabilityKeys.length === 0) return true;
    if (capabilityKeys && myCap && capabilityKeys.some((k) => !!myCap[k])) return true;
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
    // Dashboard: exact match only Ã¢â‚¬â€ sub-routes like /governance/documents should NOT highlight it
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
          borderRadius: '12px',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          px: isCollapsed ? '8px' : '12px',
          minHeight: 42,
          borderLeft: isActive ? '3px solid' : '3px solid transparent',
          borderColor: isActive ? 'primary.main' : 'transparent',
          '&.Mui-selected': {
            bgcolor: 'action.selected',
            color: 'primary.main',
            '&:hover': {
              bgcolor: 'action.hover',
            },
            '& .MuiListItemIcon-root': {
              color: 'primary.main',
            },
          },
        }}
        aria-current={isActive ? 'page' : undefined}
      >
        <ListItemIcon sx={{ minWidth: isCollapsed ? 'auto' : 36, color: isActive ? 'primary.main' : 'text.secondary' }}>
          <Icon />
        </ListItemIcon>
        {!isCollapsed && <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2', fontSize: '0.875rem', fontFamily: 'inherit', fontWeight: isActive ? 700 : 500 }} />}
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

  const visibleNavigationSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => hasAccess(item.capabilityKeys, item.service, item.staffOnly)),
    }))
    .filter((section) => section.items.length > 0);

  const drawerContent = (
    <Box sx={{
      display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0,
      fontFamily: 'Inter, "Segoe UI", Roboto, sans-serif',
      '& .MuiTypography-root': { fontFamily: 'Inter, "Segoe UI", Roboto, sans-serif' },
    }}>
      <Toolbar
        sx={{
          px: isCollapsed ? '8px' : '16px',
          py: '16px',
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
            mr: isCollapsed ? 0 : '12px'
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

      <Box component="nav" aria-label="Main navigation" sx={{ flex: 1, minHeight: 0, overflowY: 'auto', py: '8px' }}>
        {visibleNavigationSections.map((section) => {
          const expanded = isCollapsed || expandedSections[section.id];
          return (
            <Box key={section.id} sx={{ mb: '6px' }}>
              {isCollapsed ? (
                <Divider sx={{ mx: '12px', my: '8px' }} />
              ) : (
                <ListItemButton
                  component="button"
                  onClick={() => setExpandedSections((current) => ({ ...current, [section.id]: !current[section.id] }))}
                  aria-expanded={!!expandedSections[section.id]}
                  aria-controls={expandedSections[section.id] ? `navigation-section-${section.id}` : undefined}
                  sx={{
                    minHeight: 34,
                    px: '18px',
                    borderRadius: '8px',
                    color: 'text.secondary',
                    justifyContent: 'space-between',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Typography variant="overline" component="span" sx={{ fontSize: '10px', letterSpacing: '0.11em', fontWeight: 800, fontFamily: 'inherit' }}>
                    {section.label}
                  </Typography>
                  {expandedSections[section.id] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </ListItemButton>
              )}
              {expanded && (
                <List id={`navigation-section-${section.id}`} sx={{ px: isCollapsed ? '8px' : '12px', py: '2px' }}>
                  {section.items.map((item) => (
                    <ListItem key={item.path} disablePadding sx={{ mb: '2px' }}>
                      {renderNavItem(item)}
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          );
        })}
      </Box>

      {!isCollapsed && (
        <Box sx={{ px: '24px', py: '16px', bgcolor: 'background.default' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', fontFamily: 'inherit' }}>
            {formatPersonName(user, '—')}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', fontFamily: 'inherit' }}>
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
