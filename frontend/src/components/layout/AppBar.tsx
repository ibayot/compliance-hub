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
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  MenuOpen as MenuOpenIcon,
  ArrowBack as BackIcon,
  AccountCircle,
  Logout as LogoutIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Feedback as FeedbackIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { useSse } from '@/lib/utils/useSse';
import React, { useState, useEffect } from 'react';
import FeedbackModal from '../FeedbackModal';
import { attendanceApi, notificationsApi, AttendanceStatus } from '@/app/api/references';

interface AppBarProps {
  onMenuClick: () => void;
}

/** Detect UUID-like or numeric-id-like segments that shouldn't show verbatim in breadcrumbs */
const isIdSegment = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) || /^\d+$/.test(s);

export default function AppBar({ onMenuClick }: AppBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isCollapsed, toggleSidebar, drawerWidth } = useSidebar();
  const { pageTitle } = usePageTitle();
  const { mode, toggleMode } = useThemeMode();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [myShift, setMyShift] = useState<{
    clockIn: Date | null;
    clockOut: Date | null;
    attendanceStatus?: AttendanceStatus | null;
  } | null>(null);

  // Notifications
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifLoading, setIsNotifLoading] = useState(false);

  const fetchMyShift = React.useCallback(() => {
    if (user?.role && user.role !== 'user' && user.role !== 'super_admin') {
      attendanceApi.getMyShift().then(shift => {
        if (shift.clockIn && shift.clockOut) {
          setMyShift(shift);
        } else if (shift.attendanceStatus) {
          setMyShift(shift);
        } else {
          setMyShift(null);
        }
      }).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    fetchMyShift();
  }, [fetchMyShift]);

  // Audio ref for notification sound
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  React.useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");
    audioRef.current.preload = 'auto';
  }, []);

  const notificationAudioUnlockedRef = React.useRef(false);
  const unlockNotificationAudio = React.useCallback(async () => {
    if (notificationAudioUnlockedRef.current || !audioRef.current) return;
    try {
      audioRef.current.volume = 0;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 1;
      notificationAudioUnlockedRef.current = true;
    } catch {
      // Ignore autoplay policy failures; the next user gesture can retry.
    }
  }, []);

  useEffect(() => {
    const unlock = () => {
      void unlockNotificationAudio();
    };
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [unlockNotificationAudio]);

  const prevUnreadCountRef = React.useRef(0);
  const attendanceStatusLabel: Record<AttendanceStatus, string> = {
    present: 'Present',
    absent: 'Absent',
    half_day: 'Half Day',
    out_of_office: 'Out of Office',
  };

  const fetchUnread = React.useCallback(() => {
    if (user) {
      notificationsApi.getUnreadCount()
        .then(res => {
          const currentCount = res.count;
          if (currentCount > prevUnreadCountRef.current) {
             audioRef.current?.play().catch(e => console.log("Audio play failed:", e));
          }
          prevUnreadCountRef.current = currentCount;
          setUnreadCount(currentCount);
        })
        .catch(() => {});
    }
  }, [user]);

  // Notifications Polling with Page Visibility API
  useEffect(() => {
    if (!user) return;

    // Load initially
    fetchUnread();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUnread();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, fetchUnread]);

  // Live updates – listen for SSE changes
  useSse(['NOTIFICATION_CREATED'], () => {
    fetchUnread();
  });

  useSse(['ATTENDANCE_UPDATED', 'SYSTEM_STATUS_CHANGED'], () => {
    fetchMyShift();
  });

  const handleNotifOpen = async (event: React.MouseEvent<HTMLElement>) => {
    void unlockNotificationAudio();
    setNotifAnchorEl(event.currentTarget);
    setIsNotifLoading(true);
    try {
      const notifs = await notificationsApi.getMyNotifications();
      setNotifications(notifs);
      if (unreadCount > 0) {
        await notificationsApi.markAllRead();
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setIsNotifLoading(false);
    }
  };

  const handleNotifClose = () => {
    setNotifAnchorEl(null);
  };

  const handleNotifClick = (ticketId: string) => {
    handleNotifClose();
    router.push(`/operations/tickets/${ticketId}`);
  };

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
    router.push('/admin/settings');
  };

  return (
    <MuiAppBar
      position="fixed"
      sx={{
        left: { xs: 0, md: `${drawerWidth}px` },
        width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
        bgcolor: 'background.paper',
        color: 'text.primary',
        boxShadow: 1,
        transition: (theme) =>
          theme.transitions.create(['left', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        '@media print': { display: 'none' },
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

        {/* Shift Indicator */}
        {myShift && myShift.attendanceStatus && myShift.attendanceStatus !== 'present' ? (
          <Box sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Attendance: {attendanceStatusLabel[myShift.attendanceStatus]}
            </Typography>
          </Box>
        ) : myShift && myShift.clockIn && myShift.clockOut ? (
          <Box sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Shift: {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(myShift.clockIn)} - {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(myShift.clockOut)}
            </Typography>
          </Box>
        ) : null}

        {/* Notifications */}
        <Box sx={{ mr: 2 }}>
          <IconButton color="inherit" onClick={handleNotifOpen}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Menu
            anchorEl={notifAnchorEl}
            open={Boolean(notifAnchorEl)}
            onClose={handleNotifClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                width: 320,
                maxHeight: 400,
                overflowY: 'auto',
                '& .MuiAvatar-root': {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">Notifications</Typography>
            </Box>
            <Divider />
            {isNotifLoading ? (
              <MenuItem disabled><Typography variant="body2">Loading...</Typography></MenuItem>
            ) : notifications.length === 0 ? (
              <MenuItem disabled><Typography variant="body2">No notifications</Typography></MenuItem>
            ) : (
              notifications.map((notif) => (
                <MenuItem
                  key={notif.id}
                  onClick={() => handleNotifClick(notif.ticketId)}
                  sx={{
                    whiteSpace: 'normal',
                    bgcolor: notif.isRead ? 'transparent' : 'action.hover',
                    flexDirection: 'column',
                    alignItems: 'flex-start'
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: notif.isRead ? 'normal' : 'bold' }}>
                    {notif.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(notif.createdAt).toLocaleString()}
                  </Typography>
                </MenuItem>
              ))
            )}
          </Menu>
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
            <Avatar 
              sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
              src={import.meta.env.VITE_PROFILE_IMAGE_URL ? `${import.meta.env.VITE_PROFILE_IMAGE_URL}/${user?.staffId}.jpg` : undefined}
              imgProps={{ style: { objectPosition: 'center 20%' } }}
            >
              {user?.firstName?.charAt(0)}
              {user?.lastName?.charAt(0)}
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
            <MenuItem
              onClick={() => {
                setFeedbackOpen(true);
                handleProfileMenuClose();
              }}
            >
              <FeedbackIcon sx={{ mr: 1 }} />
              Suggestions
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
          <FeedbackModal manualOpen={feedbackOpen} onManualClose={() => setFeedbackOpen(false)} />
        </Box>
      </Toolbar>
    </MuiAppBar>
  );
}
