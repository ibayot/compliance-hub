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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Avatar,
  Divider,
  Badge,
  Switch,
  Button,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  MenuOpen as MenuOpenIcon,
  ArrowBack as BackIcon,
  Logout as LogoutIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Feedback as FeedbackIcon,
  Notifications as NotificationsIcon,
  NewReleases as NewReleasesIcon,
  Devices as DevicesIcon,
  Smartphone as SmartphoneIcon,
} from '@mui/icons-material';
import PaletteIcon from '@mui/icons-material/Palette';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { usersApi } from '@/lib/api/users';
import { normalizeAppAppearance } from '@/lib/appearance';
import { useSse } from '@/lib/utils/useSse';
import { formatPersonName } from '@/lib/utils/person-name';
import React, { useState, useEffect } from 'react';
import FeedbackModal from '../FeedbackModal';
import EnvironmentOverlay from './EnvironmentOverlay';
import { attendanceApi, notificationsApi, AttendanceStatus, BrowserPushConfig, type BrowserPushFailure } from '@/app/api/references';
import { getActiveWebPushWorker, isAndroidBrowser, isHomeScreenApp, promptToInstallWebApp } from '@/lib/install-web-app';
import { Capacitor } from '@capacitor/core';
import { useSnackbar } from 'notistack';
import { useMobileNavigation } from '@/contexts/MobileNavigationContext';
import { getNativeFcmHandoff, getNotificationDeviceId, isNativeFcmClient } from '@/lib/native-fcm-handoff';

interface AppBarProps {
  onMenuClick: () => void;
  onOpenChangelog: () => void;
}

interface AppNotification {
  id: number;
  ticketId?: string | null;
  targetPath?: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

/** Detect UUID-like or numeric-id-like segments that shouldn't show verbatim in breadcrumbs */
const isIdSegment = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) || /^\d+$/.test(s);

function isAppleMobileDevice(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (/Mac/i.test(`${navigator.platform} ${navigator.userAgent}`) && navigator.maxTouchPoints > 1);
}

const hostedAndroidApk = '/downloads/FO2-iCare.apk';

async function getAndroidApkUrl(signal: AbortSignal): Promise<string | null> {
  const configured = import.meta.env.VITE_ANDROID_APK_URL?.trim();
  try {
    const url = configured ? new URL(configured) : null;
    if (url?.protocol === 'https:' && !url.username && !url.password && !url.search &&
      !url.hash && /\.apk$/i.test(url.pathname)) return url.href;
  } catch { /* Check the same-origin download if the override is invalid. */ }

  try {
    const response = await fetch(hostedAndroidApk, { method: 'HEAD', redirect: 'error', cache: 'no-store', signal });
    const mimeType = response.headers.get('Content-Type')?.split(';')[0];
    return response.ok && mimeType === 'application/vnd.android.package-archive' ? hostedAndroidApk : null;
  } catch { return null; }
}

function decodeApplicationServerKey(key: string): Uint8Array {
  const padding = '='.repeat((4 - (key.length % 4)) % 4);
  const decoded = window.atob(key.replace(/-/g, '+').replace(/_/g, '/') + padding);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function applicationServerKeysMatch(actual: ArrayBuffer, expected: Uint8Array): boolean {
  const actualBytes = new Uint8Array(actual);
  return actualBytes.length === expected.length && actualBytes.every((value, index) => value === expected[index]);
}

function getHttpErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const status = (error as { response?: { status?: unknown } }).response?.status;
  return typeof status === 'number' && Number.isInteger(status) ? status : null;
}

function pushSetupMessage(config: BrowserPushConfig | null): string {
  switch (config?.configurationIssue) {
    case 'signing-key-pair': return 'Ticketing has mismatched or invalid Web Push signing keys. Ask an administrator to restore a matching key pair.';
    case 'encryption-or-subject': return 'Ticketing has an invalid Web Push encryption key or contact subject. Ask an administrator to check its settings.';
    case 'proxy-url': return 'Ticketing has an invalid Web Push proxy address. Ask an administrator to check its settings.';
    default: return 'Ticketing has not confirmed valid Web Push settings. An administrator should check the four Web Push values and recreate the service.';
  }
}

function fcmSetupMessage(issue?: string): string {
  switch (issue) {
    case 'missing-service-account': return 'Android alerts are not configured on this server. An administrator must mount the Firebase service-account file in Ticketing.';
    case 'invalid-service-account': return 'Ticketing could not read the Firebase service-account file. Ask an administrator to check the mounted file.';
    case 'project-mismatch': return 'The Firebase service-account file belongs to a different project. Ask an administrator to check the FO2 iCare Firebase project settings.';
    case 'missing-encryption-key': return 'Ticketing cannot securely store Android alert registrations. Ask an administrator to check its Web Push encryption key.';
    default: return 'Ticketing has not confirmed its Android alert settings. Ask an administrator to check the Firebase project and service-account setup.';
  }
}

const pushFailureMessages: Record<BrowserPushFailure, string> = {
  authentication: 'The push provider rejected Ticketing’s signing credentials. Ask an administrator to check the VAPID keys and server clock. If the keys changed, enable alerts again on this device.',
  'rate-limit': 'The push provider is limiting requests. Wait a few minutes and try the test again.',
  'provider-unavailable': 'The push provider is temporarily unavailable. Try the test again later.',
  'provider-request': 'The push provider rejected the request. Ask an administrator to check Ticketing’s push logs.',
  dns: 'Ticketing could not look up the push provider. Ask an administrator to check the server’s DNS or outbound proxy.',
  tls: 'Ticketing could not verify the push provider’s HTTPS certificate. Ask an administrator to check the server’s certificate trust and proxy.',
  timeout: 'Ticketing timed out connecting to the push provider. Ask an administrator to check the server’s outbound HTTPS or proxy.',
  connection: 'Ticketing could not establish an HTTPS connection to the push provider. Ask an administrator to check the server’s outbound firewall or proxy.',
};

export default function AppBar({ onMenuClick, onOpenChangelog }: AppBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, myCap, logout } = useAuth();
  const { isCollapsed, toggleSidebar, drawerWidth } = useSidebar();
  const { pageTitle } = usePageTitle();
  const { mode, setAppearance, layoutMode, toggleLayoutMode } = useThemeMode();
  const { canGoBack, goBack } = useMobileNavigation();
  const theme = useTheme();
  const compactHeader = useMediaQuery(theme.breakpoints.down('sm'));
  const { enqueueSnackbar } = useSnackbar();
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [canChooseLayout, setCanChooseLayout] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [myShift, setMyShift] = useState<{
    clockIn: Date | null;
    clockOut: Date | null;
    attendanceStatus?: AttendanceStatus | null;
  } | null>(null);

  // Notifications
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifLoading, setIsNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [pushConfig, setPushConfig] = useState<BrowserPushConfig | null>(null);
  const [fcmConfigEnabled, setFcmConfigEnabled] = useState(false);
  const [fcmConfigurationIssue, setFcmConfigurationIssue] = useState<string | undefined>();
  const [fcmPermissionGranted, setFcmPermissionGranted] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushNeedsHomeScreen, setPushNeedsHomeScreen] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [sendingTestAlert, setSendingTestAlert] = useState(false);
  const [pushMessage, setPushMessage] = useState('');
  const [pushConfigCheckFailed, setPushConfigCheckFailed] = useState(false);
  const [pushConfigChecking, setPushConfigChecking] = useState(false);
  const [showDownloadApp, setShowDownloadApp] = useState(false);
  const [showIosProfileDownload, setShowIosProfileDownload] = useState(false);
  const [androidApkUrl, setAndroidApkUrl] = useState<string | null>(null);
  const [appInstallAnchor, setAppInstallAnchor] = useState<HTMLElement | null>(null);
  const [installHelp, setInstallHelp] = useState<'ios' | 'android' | 'browser' | null>(null);
  const notificationRequestRef = React.useRef(0);
  const nativeFcmClient = isNativeFcmClient();
  const nativeFcmHandoff = getNativeFcmHandoff();

  useEffect(() => {
    const availabilityCheck = new AbortController();
    const updateInstallAvailability = () => {
      const installed = isHomeScreenApp();
      const browser = !Capacitor.isNativePlatform();
      setShowDownloadApp(browser && !installed);
      setShowIosProfileDownload(browser && !installed && isAppleMobileDevice());
    };
    updateInstallAvailability();
    if (isAndroidBrowser() && !isHomeScreenApp() && window.location.protocol === 'https:') {
      void getAndroidApkUrl(availabilityCheck.signal).then((url) => {
        if (!availabilityCheck.signal.aborted) setAndroidApkUrl(url);
      });
    }
    window.addEventListener('appinstalled', updateInstallAvailability);
    window.addEventListener('pageshow', updateInstallAvailability);
    return () => {
      availabilityCheck.abort();
      window.removeEventListener('appinstalled', updateInstallAvailability);
      window.removeEventListener('pageshow', updateInstallAvailability);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setPushEnabled(false);
      setPushConfig(null);
      setFcmConfigEnabled(false);
      setFcmConfigurationIssue(undefined);
      setFcmPermissionGranted(false);
      setPushConfigCheckFailed(false);
      setPushConfigChecking(false);
      return;
    }
    let current = true;
    const initializePush = async () => {
      setPushConfigChecking(true);
      setPushConfigCheckFailed(false);
      setPushMessage('');
      const appleHomeScreenRequired = isAppleMobileDevice() && !isHomeScreenApp();
      const supported = window.isSecureContext && 'serviceWorker' in navigator &&
        'PushManager' in window && 'Notification' in window;
      setPushNeedsHomeScreen(appleHomeScreenRequired);
      setPushSupported(supported);
      try {
        const config = await notificationsApi.getPushConfig();
        if (!current) return;
        setPushConfig(config);
          if (nativeFcmClient) {
            const fcmConfig = await notificationsApi.getFcmConfig();
            const deviceId = nativeFcmHandoff?.deviceId;
            let fcmStatus = deviceId
              ? await notificationsApi.getFcmDeviceStatus(deviceId)
              : { enabled: false, registered: false };
            if (!current) return;
            setFcmConfigEnabled(fcmConfig.enabled && fcmStatus.enabled);
            setFcmConfigurationIssue(fcmConfig.configurationIssue || fcmStatus.configurationIssue);
            setFcmPermissionGranted(!!nativeFcmHandoff?.notificationsGranted);

            // Keep an already-authorized browser subscription associated with this same Android
            // device so FCM can take precedence without creating duplicate lock-screen alerts.
            if (supported && config.enabled && config.publicKey && deviceId) {
              const registration = await navigator.serviceWorker.getRegistration('/');
              const subscription = await registration?.pushManager.getSubscription();
              if (subscription && Notification.permission === 'granted') {
                const existingKey = subscription.options.applicationServerKey;
                const expectedKey = decodeApplicationServerKey(config.publicKey);
                if (existingKey && !applicationServerKeysMatch(existingKey, expectedKey)) {
                  await notificationsApi.removePushSubscription(subscription.endpoint).catch(() => undefined);
                  await subscription.unsubscribe().catch(() => false);
                } else {
                  await notificationsApi.savePushSubscription({
                    ...subscription.toJSON(),
                    deviceId,
                  });
                }
              }
            }

            const notificationPermissionGranted = !!nativeFcmHandoff?.notificationsGranted;
            if (deviceId && fcmStatus.registered && !notificationPermissionGranted) {
              // Android permissions can be revoked outside FO2 iCare. Remove the stale FCM
              // registration so an accepted-but-hidden push cannot suppress browser fallback.
              await notificationsApi.removeFcmDevice(deviceId).catch(() => undefined);
              fcmStatus = { ...fcmStatus, registered: false };
            }
            if (fcmStatus.registered && fcmConfig.enabled && notificationPermissionGranted && nativeFcmHandoff?.fid && deviceId) {
              await notificationsApi.saveFcmDevice({ deviceId, fid: nativeFcmHandoff.fid });
            }
            if (!current) return;
            const enabled = fcmStatus.registered && fcmConfig.enabled && notificationPermissionGranted;
            setPushEnabled(enabled);
            if (!fcmConfig.enabled) {
              setPushMessage(fcmSetupMessage(fcmConfig.configurationIssue));
            } else if (!notificationPermissionGranted) {
              setPushMessage('Android notifications are off for FO2 iCare. Allow them in Android Settings → Apps → FO2 iCare → Notifications, then reopen the app.');
            } else if (!nativeFcmHandoff?.fid && !fcmStatus.registered) {
              setPushMessage('FO2 iCare could not read its Firebase installation. Close and reopen the Android app while connected to the internet, then try again.');
            } else if (!fcmStatus.registered) {
              setPushMessage('Android app alerts are off on this device. Choose Enable to register this device.');
            }
            return;
          }

          if (supported) {
          const registration = await navigator.serviceWorker.getRegistration('/');
          const subscription = await registration?.pushManager.getSubscription();
          if (!current) return;
          const enabled = !!subscription && Notification.permission === 'granted' && config.enabled;
          if (enabled && subscription) {
            const existingKey = subscription.options.applicationServerKey;
            const expectedKey = decodeApplicationServerKey(config.publicKey || '');
            if (existingKey && !applicationServerKeysMatch(existingKey, expectedKey)) {
              await notificationsApi.removePushSubscription(subscription.endpoint).catch(() => undefined);
              await subscription.unsubscribe().catch(() => false);
              if (current) {
                setPushEnabled(false);
                setPushMessage('Browser alert security settings changed. Enable alerts again on this device.');
              }
              return;
            }
            // Keep endpoint ownership aligned with the account authenticated on this device.
            await notificationsApi.savePushSubscription({
              ...subscription.toJSON(),
              deviceId: getNotificationDeviceId(),
            });
          }
          if (current) setPushEnabled(enabled);
        }
      } catch {
        if (current) {
          setPushConfig({ enabled: false, publicKey: null });
          setPushConfigCheckFailed(true);
        }
      } finally {
        if (current) setPushConfigChecking(false);
      }
    };
    void initializePush();
    return () => { current = false; };
  }, [user]);

  const retryPushConfigCheck = async () => {
    if (pushConfigChecking || pushBusy) return;
    setPushConfigChecking(true);
    setPushConfigCheckFailed(false);
    setPushMessage('');
    try {
      if (nativeFcmClient && nativeFcmHandoff?.deviceId) {
        const [config, status] = await Promise.all([
          notificationsApi.getFcmConfig(),
          notificationsApi.getFcmDeviceStatus(nativeFcmHandoff.deviceId),
        ]);
        setFcmConfigEnabled(config.enabled && status.enabled);
        setFcmConfigurationIssue(config.configurationIssue || status.configurationIssue);
        setPushEnabled(config.enabled && status.registered && nativeFcmHandoff.notificationsGranted);
        setFcmPermissionGranted(nativeFcmHandoff.notificationsGranted);
      } else {
        setPushConfig(await notificationsApi.getPushConfig());
      }
    } catch {
      setPushConfig({ enabled: false, publicKey: null });
      setPushConfigCheckFailed(true);
    } finally {
      setPushConfigChecking(false);
    }
  };

  const handleInstallWebApp = async () => {
    setAppInstallAnchor(null);
    if (showIosProfileDownload) {
      setInstallHelp('ios');
      return;
    }
    if (isAndroidBrowser()) {
      setInstallHelp('android');
      return;
    }
    if (!await promptToInstallWebApp()) {
      setInstallHelp('browser');
    }
  };

  const handleFcmToggle = async () => {
    const device = getNativeFcmHandoff();
    if (!device?.deviceId) {
      setPushMessage('Reopen FO2 iCare from its Android app icon, then try again.');
      return;
    }
    if (pushEnabled) {
      setPushBusy(true);
      try {
        await notificationsApi.removeFcmDevice(device.deviceId);
        setPushEnabled(false);
        setPushMessage('Android app alerts are off on this device.');
      } catch {
        setPushMessage('Could not turn off Android app alerts. Please try again.');
      } finally { setPushBusy(false); }
      return;
    }
    if (!fcmConfigEnabled) {
      setPushMessage(fcmSetupMessage(fcmConfigurationIssue));
      return;
    }
    if (!device.notificationsGranted) {
      setPushMessage('Android notifications are off for FO2 iCare. Allow them in Android Settings → Apps → FO2 iCare → Notifications, then reopen the app.');
      return;
    }
    if (!device.fid) {
      setPushMessage('FO2 iCare could not read its Firebase installation. Close and reopen the Android app while connected to the internet, then try again.');
      return;
    }

    setPushBusy(true);
    try {
      await notificationsApi.saveFcmDevice({ deviceId: device.deviceId, fid: device.fid });
      setPushEnabled(true);
      setPushMessage('Android app alerts are enabled. Use Send test alert to check delivery.');
    } catch (error) {
      const status = getHttpErrorStatus(error);
      setPushMessage(status === 401
        ? 'Your sign-in expired before alerts could be enabled. Sign in again, then retry.'
        : status === 503
          ? 'Android alerts are not configured on this server. Ask an administrator to mount the Firebase service-account file in Ticketing.'
          : status === 403
            ? 'Your account is not approved to receive app alerts. Contact your administrator.'
            : status === 429
              ? 'This account has reached its Android alert device limit. Turn alerts off on an old device and retry.'
              : 'FO2 iCare could not register this Android device. Check the connection and try again.');
    } finally { setPushBusy(false); }
  };

  const handleBrowserPushToggle = async () => {
    if (pushBusy) return;
    if (nativeFcmClient) {
      await handleFcmToggle();
      return;
    }
    if (pushEnabled) {
      setPushBusy(true);
      try {
        await notificationsApi.unsubscribeCurrentPushSubscription();
        setPushEnabled(false);
        setPushMessage('Browser alerts are off on this device.');
        const badgeNavigator = navigator as Navigator & { clearAppBadge?: () => Promise<void> };
        await badgeNavigator.clearAppBadge?.().catch(() => undefined);
      } catch {
        setPushMessage('Could not turn off browser alerts. Please try again.');
      } finally { setPushBusy(false); }
      return;
    }
    if (pushNeedsHomeScreen) {
      setPushMessage('In Safari, add FO2 iCare to the Home Screen as a web app, then enable alerts from its icon.');
      return;
    }
    if (pushConfigCheckFailed) {
      setPushMessage('Could not check browser alert setup. Use Retry to check again.');
      return;
    }
    if (!pushSupported || !pushConfig?.enabled || !pushConfig.publicKey) {
      setPushMessage(pushSetupMessage(pushConfig));
      return;
    }

    setPushBusy(true);
    let newSubscription: PushSubscription | null = null;
    let pushStep: 'permission' | 'service-worker' | 'subscription' | 'server-save' = 'permission';
    try {
      // Call the permission API directly from this button gesture, as required by browsers.
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushMessage(permission === 'denied'
          ? isAppleMobileDevice()
            ? 'iOS denied notifications for this Home Screen icon. If it is listed in Settings → Notifications, allow alerts there. If the profile icon is absent from Settings and no prompt appears, use the Safari-installed web app for alerts.'
            : isAndroidBrowser()
              ? 'Allow notifications for the site in Chrome or Brave, and for FO2 iCare and its browser in Android settings. Then retry here.'
              : 'Notifications are blocked in browser settings. Allow them for this site to continue.'
          : 'Notification permission was not granted.');
        return;
      }
      pushStep = 'service-worker';
      const activeRegistration = await getActiveWebPushWorker();
      pushStep = 'subscription';
      let subscription = await activeRegistration.pushManager.getSubscription();
      if (subscription?.options.applicationServerKey &&
        !applicationServerKeysMatch(subscription.options.applicationServerKey, decodeApplicationServerKey(pushConfig.publicKey))) {
        await notificationsApi.removePushSubscription(subscription.endpoint).catch(() => undefined);
        await subscription.unsubscribe();
        subscription = null;
      }
      if (!subscription) {
        subscription = await activeRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationServerKey(pushConfig.publicKey) as BufferSource,
        });
        newSubscription = subscription;
      }
      const payload = subscription.toJSON();
      if (!payload.endpoint || !payload.keys?.auth || !payload.keys?.p256dh) {
        throw new Error('The browser returned an incomplete push subscription.');
      }
      pushStep = 'server-save';
      await notificationsApi.savePushSubscription({ ...payload, deviceId: getNotificationDeviceId() });
      setPushEnabled(true);
      setPushMessage('Browser alerts are enabled on this device.');
    } catch (error) {
      await newSubscription?.unsubscribe().catch(() => false);
      if (pushStep === 'service-worker') {
        setPushMessage('This app could not prepare its notification service. Close and reopen the app, then try again.');
      } else if (pushStep === 'subscription') {
        setPushMessage('The browser could not register this device with its push service. Check the connection and browser site permissions, then retry. In Brave, also check that Google services for push messaging are enabled.');
      } else if (pushStep === 'server-save') {
        const status = getHttpErrorStatus(error);
        if (status === 401) {
          setPushMessage('Your sign-in expired before alerts could be enabled. Sign in again, then retry.');
        } else if (status === 503) {
          setPushMessage('The Ticketing service is not ready for browser alerts. Ask an administrator to check its Web Push settings.');
        } else if (status === 500) {
          setPushMessage('The phone created its alert subscription, but the Ticketing service could not save it (HTTP 500). Ask an administrator to check the service logs and web_push_subscriptions table.');
        } else if (status === 404) {
          setPushMessage('The Ticketing service does not recognize the alert registration endpoint (HTTP 404). Ask an administrator to update the service.');
        } else if (status !== null) {
          setPushMessage(`The Ticketing service rejected the alert subscription (HTTP ${status}). Ask an administrator to check the service.`);
        } else {
          setPushMessage('The app could not reach the Ticketing service to save this device. Check the connection, then retry.');
        }
      } else {
        setPushMessage('The browser could not request notification permission. Check Android notification settings, then retry.');
      }
    } finally { setPushBusy(false); }
  };

  const handleTestAlert = async () => {
    if (!pushEnabled || pushBusy || sendingTestAlert) return;
    setSendingTestAlert(true);
    setPushMessage('');
    try {
      if (nativeFcmClient) {
        const device = getNativeFcmHandoff();
        if (!device?.deviceId) {
          setPushEnabled(false);
          setPushMessage('Reopen FO2 iCare from its Android app icon, then enable Android app alerts again.');
          return;
        }
        if (!device.notificationsGranted) {
          setPushEnabled(false);
          setPushMessage('Android notifications are off for FO2 iCare. Allow them in Android Settings → Apps → FO2 iCare → Notifications, then reopen the app.');
          return;
        }
        const result = await notificationsApi.sendFcmTestAlert(device.deviceId);
        if (result.outcome === 'accepted') {
          setPushMessage('Firebase accepted the test alert. Check the Android notification panel for FO2 iCare.');
        } else if (result.outcome === 'expired' || result.outcome === 'not-enabled') {
          if (result.outcome === 'expired') await notificationsApi.removeFcmDevice(device.deviceId).catch(() => undefined);
          setPushEnabled(false);
          setPushMessage('This Android device registration is no longer active. Reopen FO2 iCare and enable app alerts again.');
        } else if (result.outcome === 'failed') {
          const message = result.failure === 'authentication'
            ? 'Firebase rejected Ticketing’s service credentials. Ask an administrator to check the Firebase service-account permissions.'
            : result.failure === 'provider-unavailable'
              ? 'Firebase is temporarily unavailable or the server timed out. Try the test again later.'
              : result.failure === 'connection'
                ? 'Ticketing could not connect to Firebase. Ask an administrator to check outbound HTTPS access.'
                : 'Firebase rejected the test request. Ask an administrator to check Ticketing’s FCM logs.';
          setPushMessage(message);
        }
        return;
      }
      const registration = await getActiveWebPushWorker();
      const subscription = await registration.pushManager.getSubscription();
      if (Notification.permission !== 'granted' || !subscription) {
        setPushEnabled(false);
        setPushMessage('Enable browser alerts again on this device before sending a test.');
        return;
      }
      const config = await notificationsApi.getPushConfig();
      setPushConfig(config);
      if (!config.enabled || !config.publicKey) {
        setPushEnabled(false);
        setPushMessage(pushSetupMessage(config));
        return;
      }
      const subscriptionKey = subscription.options.applicationServerKey;
      if (subscriptionKey && !applicationServerKeysMatch(subscriptionKey, decodeApplicationServerKey(config.publicKey))) {
        await notificationsApi.removePushSubscription(subscription.endpoint).catch(() => undefined);
        await subscription.unsubscribe().catch(() => false);
        setPushEnabled(false);
        setPushMessage('The server’s signing key changed. Enable browser alerts again on this device, then retry the test.');
        return;
      }
      const result = await notificationsApi.sendTestAlert(subscription.endpoint);
      if (result.outcome === 'accepted') {
        setPushMessage('The push provider accepted the test. Check your device’s notification panel for FO2 iCare.');
      } else if (result.outcome === 'expired' || result.outcome === 'not-enabled') {
        if (result.outcome === 'expired') await subscription.unsubscribe().catch(() => false);
        setPushEnabled(false);
        setPushMessage('This device’s subscription is no longer active. Enable browser alerts again, then retry the test.');
      } else if (result.outcome === 'failed') {
        const message = result.failure && pushFailureMessages[result.failure];
        setPushMessage(`${message || 'The push provider did not accept the test. Ask an administrator to check Ticketing’s push logs.'}${result.providerStatus ? ` (HTTP ${result.providerStatus})` : ''}`);
      }
    } catch (error) {
      const status = getHttpErrorStatus(error);
      setPushMessage(status === 429 ? 'Wait 30 seconds before sending another test alert.'
        : status === 401 || status === 403 ? 'Your account could not send the test alert. Sign in again and retry.'
          : 'The app could not send a test alert. Check the connection or ask an administrator to verify Web Push settings.');
    } finally {
      setSendingTestAlert(false);
    }
  };

  const fetchMyShift = React.useCallback(() => {
    if (myCap?.isAttendanceEligible) {
      attendanceApi
        .getMyShift()
        .then((shift) => {
          if (shift.clockIn && shift.clockOut) {
            setMyShift(shift);
          } else if (shift.attendanceStatus) {
            setMyShift(shift);
          } else {
            setMyShift(null);
          }
        })
        .catch(console.error);
    }
  }, [myCap?.isAttendanceEligible]);

  useEffect(() => {
    fetchMyShift();
  }, [fetchMyShift]);

  useEffect(() => {
    const desktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const refresh = () => setCanChooseLayout(!Capacitor.isNativePlatform() && desktopPointer.matches);
    refresh();
    desktopPointer.addEventListener('change', refresh);
    return () => desktopPointer.removeEventListener('change', refresh);
  }, []);

  // Audio fallback plus a Web Audio context for a more noticeable multi-tone chime.
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  React.useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.preload = 'auto';
  }, []);

  const notificationAudioUnlockedRef = React.useRef(false);
  const getNotificationAudioContext = React.useCallback(() => {
    if (typeof window === 'undefined') return null;
    const AudioContextConstructor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return null;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextConstructor();
    }
    return audioContextRef.current;
  }, []);

  const playNotificationSound = React.useCallback(() => {
    const audioContext = getNotificationAudioContext();
    if (audioContext && audioContext.state === 'running') {
      const startedAt = audioContext.currentTime + 0.02;
      const notes = [
        { frequency: 659.25, offset: 0 },
        { frequency: 783.99, offset: 0.16 },
        { frequency: 1046.5, offset: 0.34 },
        { frequency: 783.99, offset: 0.62 },
      ];

      notes.forEach(({ frequency, offset }) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const noteStart = startedAt + offset;
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency, noteStart);
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.2, noteStart + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.22);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(noteStart);
        oscillator.stop(noteStart + 0.24);
      });
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.volume = 1;
    void audio.play().catch(() => {
      // Browsers may block sound until the user interacts with the page.
    });
  }, [getNotificationAudioContext]);

  const unlockNotificationAudio = React.useCallback(async () => {
    if (notificationAudioUnlockedRef.current) return;
    try {
      const audioContext = getNotificationAudioContext();
      if (audioContext?.state === 'suspended') {
        await audioContext.resume();
      }
      if (!audioContext && audioRef.current) {
        audioRef.current.volume = 0;
        await audioRef.current.play();
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 1;
      }
      notificationAudioUnlockedRef.current = true;
    } catch {
      // Ignore autoplay policy failures; the next user gesture can retry.
    }
  }, [getNotificationAudioContext]);

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
  const originalDocumentTitleRef = React.useRef<string | null>(null);
  const originalFaviconHrefRef = React.useRef<string | null>(null);
  const faviconLinkRef = React.useRef<HTMLLinkElement | null>(null);
  const faviconCreatedRef = React.useRef(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (originalDocumentTitleRef.current === null) {
      originalDocumentTitleRef.current = document.title;
    }

    let favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
      faviconCreatedRef.current = true;
    }
    faviconLinkRef.current = favicon;
    if (originalFaviconHrefRef.current === null) {
      originalFaviconHrefRef.current = favicon.getAttribute('href') || '';
    }

    const baseTitle = originalDocumentTitleRef.current || 'FO2 iCare';
    const originalFavicon = originalFaviconHrefRef.current;
    let animationTimer: ReturnType<typeof setInterval> | null = null;
    let animationStopTimer: ReturnType<typeof setTimeout> | null = null;

    const badgeText = unreadCount > 99 ? '99+' : String(unreadCount);
    const drawBadge = (context: CanvasRenderingContext2D) => {
      context.beginPath();
      context.arc(47, 17, 17, 0, Math.PI * 2);
      context.fillStyle = '#d32f2f';
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = '#ffffff';
      context.stroke();
      context.fillStyle = '#ffffff';
      context.font = `700 ${badgeText.length > 2 ? 10 : 14}px Arial, sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(badgeText, 47, 17);
    };
    const bellFavicon = () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1565c0"/><path d="M16 45h32l-5-7V27a11 11 0 0 0-22 0v11l-5 7Z" fill="white"/><path d="M27 49h10a5 5 0 0 1-10 0Z" fill="white"/><circle cx="47" cy="17" r="17" fill="#d32f2f" stroke="white" stroke-width="2"/><text x="47" y="18" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-size="${badgeText.length > 2 ? 10 : 14}" font-weight="700" fill="white">${badgeText}</text></svg>`;
      return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    };
    const createAppBadgeFavicon = () =>
      new Promise<string>((resolve) => {
        if (!originalFavicon) {
          resolve(bellFavicon());
          return;
        }
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 64;
          const context = canvas.getContext('2d');
          if (!context) {
            resolve(originalFavicon);
            return;
          }
          context.drawImage(image, 0, 0, 64, 64);
          drawBadge(context);
          resolve(canvas.toDataURL('image/png'));
        };
        image.onerror = () => resolve(originalFavicon);
        image.src = originalFavicon;
      });

    let appBadgeFavicon = originalFavicon || bellFavicon();
    let cancelled = false;
    const renderAttention = (showBell: boolean) => {
      const countLabel = unreadCount > 99 ? '99+' : unreadCount;
      document.title = `${showBell ? '🔔 ' : ''}(${countLabel}) ${baseTitle}`;
      favicon.href = showBell ? bellFavicon() : appBadgeFavicon;
    };

    if (unreadCount > 0) {
      renderAttention(true);
      void createAppBadgeFavicon().then((generatedFavicon) => {
        if (cancelled) return;
        appBadgeFavicon = generatedFavicon;
        let showBell = false;
        renderAttention(showBell);
        animationTimer = setInterval(() => {
          showBell = !showBell;
          renderAttention(showBell);
        }, 700);
        animationStopTimer = setTimeout(() => {
          if (animationTimer) clearInterval(animationTimer);
          animationTimer = null;
          renderAttention(false);
        }, 10000);
      });
    } else {
      document.title = baseTitle;
      if (faviconCreatedRef.current && !originalFavicon) {
        favicon.remove();
        faviconLinkRef.current = null;
      } else if (originalFavicon) {
        favicon.href = originalFavicon;
      }
    }

    return () => {
      cancelled = true;
      if (animationTimer) clearInterval(animationTimer);
      if (animationStopTimer) clearTimeout(animationStopTimer);
    };
  }, [unreadCount]);

  useEffect(
    () => () => {
      if (originalDocumentTitleRef.current !== null) {
        document.title = originalDocumentTitleRef.current;
      }
      if (faviconCreatedRef.current && faviconLinkRef.current) {
        faviconLinkRef.current.remove();
      } else if (faviconLinkRef.current && originalFaviconHrefRef.current) {
        faviconLinkRef.current.href = originalFaviconHrefRef.current;
      }
      void audioContextRef.current?.close();
    },
    [],
  );

  const attendanceStatusLabel: Record<AttendanceStatus, string> = {
    present: 'Present',
    absent: 'Absent',
    half_day: 'Half Day',
    out_of_office: 'Out of Office',
  };

  const fetchNotificationSummary = React.useCallback(
    async (playSound = false) => {
      if (!user) return null;
      const requestId = ++notificationRequestRef.current;
      try {
        const summary = await notificationsApi.getSummary();
        if (requestId !== notificationRequestRef.current) return null;
        if (playSound && !pushEnabled && summary.unreadCount > prevUnreadCountRef.current) {
          playNotificationSound();
        }
        prevUnreadCountRef.current = summary.unreadCount;
        setUnreadCount(summary.unreadCount);
        setNotifications(summary.notifications);
        setNotifError(null);
        return summary;
      } catch {
        if (requestId !== notificationRequestRef.current) return null;
        setNotifError(
          navigator.onLine
            ? 'Notifications could not be loaded. Select here to retry.'
            : 'You are offline. Notifications will refresh when your connection returns.',
        );
        return null;
      }
    },
    [playNotificationSound, pushEnabled, user],
  );

  // Notifications Polling with Page Visibility API
  useEffect(() => {
    if (!user) return;

    // Load initially
    void fetchNotificationSummary();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchNotificationSummary(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, fetchNotificationSummary]);

  // A reconnect may have missed SSE events while the browser was offline.
  // Refresh the authoritative summary immediately so the badge and list catch up.
  useEffect(() => {
    const handleOffline = () => {
      setNotifError('You are offline. Notifications will refresh when your connection returns.');
    };
    const handleOnline = () => {
      void fetchNotificationSummary(true);
    };

    if (!navigator.onLine) handleOffline();
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchNotificationSummary]);

  // Live updates – listen for SSE changes
  useSse(['NOTIFICATION_CREATED', 'NOTIFICATIONS_READ'], (payload, eventType) => {
    if (eventType === 'NOTIFICATION_CREATED' && !payload?.reconnected && !pushEnabled) {
      playNotificationSound();
    }
    void fetchNotificationSummary();
  });

  useEffect(() => {
    if (!pushEnabled || !('setAppBadge' in navigator)) return;
    const badgeNavigator = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    const updateBadge = unreadCount > 0
      ? badgeNavigator.setAppBadge?.(unreadCount)
      : badgeNavigator.clearAppBadge?.();
    void updateBadge?.catch(() => undefined);
  }, [pushEnabled, unreadCount]);

  const handleMarkAllRead = async () => {
    if (markingAllRead || unreadCount === 0) return;
    setMarkingAllRead(true);
    ++notificationRequestRef.current;
    try {
      await notificationsApi.markAllRead();
      // Refetch rather than assuming zero: a new notification may arrive during the write.
      await fetchNotificationSummary();
    } catch {
      setNotifError(navigator.onLine
        ? 'Notifications could not be marked as read. Please try again.'
        : 'You are offline. Reconnect before marking notifications as read.');
    } finally { setMarkingAllRead(false); }
  };

  useSse(['ATTENDANCE_UPDATED', 'SYSTEM_STATUS_CHANGED'], () => {
    fetchMyShift();
  });

  const handleNotifOpen = async (event: React.MouseEvent<HTMLElement>) => {
    void unlockNotificationAudio();
    setNotifAnchorEl(event.currentTarget);
    setIsNotifLoading(true);
    try {
      await fetchNotificationSummary();
    } finally {
      setIsNotifLoading(false);
    }
  };

  const handleNotifClose = () => {
    setNotifAnchorEl(null);
  };

  const handleNotifClick = (notification: AppNotification) => {
    if (!notification.isRead) {
      ++notificationRequestRef.current;
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
      prevUnreadCountRef.current = Math.max(0, prevUnreadCountRef.current - 1);
      void notificationsApi
        .markRead(notification.id)
        .then((result) => {
          if (!result.success) void fetchNotificationSummary();
        })
        .catch(() => void fetchNotificationSummary());
    }
    handleNotifClose();
    const target =
      notification.targetPath ||
      (notification.ticketId ? `/operations/tickets/${notification.ticketId}` : null);
    if (target) router.push(target);
  };

  // Generate breadcrumbs from pathname
  // Skip 'dashboard' segment — all pages are inside dashboard already
  const generateBreadcrumbs = () => {
    const paths: string[] = pathname?.split('/').filter(Boolean) || [];
    const breadcrumbs: { label: string; path: string }[] = [];
    const routeLabels: Record<string, string> = {
      dashboard: 'Dashboard',
      operations: 'Operations',
      governance: 'Governance',
      admin: 'Administration',
      tickets: 'Tickets',
      'my-tickets': 'My Tickets',
      'knowledge-base': 'Knowledge Base',
      duties: 'Duties',
      attendance: 'Attendance',
      'staff-directory': 'Staff Directory',
      reports: 'Reports',
      settings: 'Settings',
      documents: 'Documents',
      archived: 'Archived',
      repository: 'Repository',
      issuances: 'Issuances',
      incidents: 'Incidents',
      metrics: 'Metrics',
      kpi: 'KPI',
      reviews: 'Reviews',
      mov: 'MoV Builder',
      units: 'Units',
      'audit-logs': 'Audit Logs',
      'user-manual': 'User Manual',
      changelog: 'Changelog',
      upload: 'Upload Document',
    };

    let currentPath = '';
    paths.forEach((segment: string, index: number) => {
      currentPath += `/${segment}`;

      // Skip [bracket] template segments
      if (segment.startsWith('[')) return;

      // Skip the root 'dashboard' segment when there are other segments
      if (segment === 'dashboard' && paths.length > 1) return;

      // Format label
      let label = routeLabels[segment] || segment
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
  const visibleBreadcrumbs = compactHeader ? breadcrumbs.slice(-1) : breadcrumbs;
  const handleBack = () => {
    goBack();
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

  const handleThemeToggle = async () => {
    if (savingAppearance || !user) return;
    setSavingAppearance(true);
    try {
      const preferences = await usersApi.updateUiPreferences({
        mode: mode === 'dark' ? 'light' : 'dark',
      });
      setAppearance(normalizeAppAppearance(preferences));
      handleProfileMenuClose();
    } catch {
      enqueueSnackbar('Unable to save your appearance preference. Please try again.', {
        variant: 'error',
      });
    } finally {
      setSavingAppearance(false);
    }
  };

  return (
    <MuiAppBar
      id="app-top-bar"
      className="app-global-appbar"
      position="fixed"
      data-app-layout-mode={layoutMode}
      sx={{
        top: 0,
        left: { xs: 0, md: `${drawerWidth}px` },
        width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottomWidth: 'var(--app-header-divider-height)',
        pt: 'var(--app-header-safe-top)',
        '& .MuiToolbar-root': {
          minHeight: 'var(--app-toolbar-height)',
          px: { xs: 1, sm: 2 },
          gap: { xs: 0.25, sm: 0.5 },
          paddingLeft: { xs: 'max(8px, env(safe-area-inset-left))', sm: 'max(16px, env(safe-area-inset-left))' },
          paddingRight: { xs: 'max(8px, env(safe-area-inset-right))', sm: 'max(16px, env(safe-area-inset-right))' },
        },
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
          sx={{ mr: { xs: 0.25, sm: 1 }, flexShrink: 0, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        {/* Desktop toggle button */}
        <IconButton
          color="inherit"
          aria-label="toggle sidebar"
          edge="start"
          onClick={toggleSidebar}
          sx={{ mr: 2, flexShrink: 0, display: { xs: 'none', md: 'inline-flex' } }}
        >
          {isCollapsed ? <MenuIcon /> : <MenuOpenIcon />}
        </IconButton>

        {/* Back button */}
        {canGoBack && (
          <IconButton
            color="inherit"
            aria-label="Go back"
            edge="start"
            onClick={handleBack}
            sx={{ mr: { xs: 0.25, sm: 1 }, flexShrink: 0, minWidth: 44, minHeight: 44 }}
          >
            <BackIcon />
          </IconButton>
        )}

        {/* Breadcrumbs */}
        <Box sx={{ flex: '1 1 0%', minWidth: 0, overflow: 'hidden' }}>
          <Breadcrumbs
            aria-label="Breadcrumb"
            maxItems={compactHeader ? 2 : 3}
            itemsBeforeCollapse={compactHeader ? 0 : 1}
            itemsAfterCollapse={1}
            sx={{
              minWidth: 0,
              overflow: 'hidden',
              '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap', minWidth: 0, overflow: 'hidden' },
              '& .MuiBreadcrumbs-li': { minWidth: 0, whiteSpace: 'nowrap' },
              '& .MuiTypography-root, & .MuiLink-root': {
                display: 'block',
                maxWidth: compactHeader ? 104 : 180,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
            }}
          >
            {visibleBreadcrumbs.map((crumb, index) => {
              const isLast = index === visibleBreadcrumbs.length - 1;

              if (isLast) {
                return (
                  <Typography key={crumb.path} color="text.primary" fontWeight={600} aria-current="page">
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

        <EnvironmentOverlay compact />

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
              Shift:{' '}
              {new Intl.DateTimeFormat('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              }).format(myShift.clockIn)}{' '}
              -{' '}
              {new Intl.DateTimeFormat('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              }).format(myShift.clockOut)}
            </Typography>
          </Box>
        ) : null}

        {showDownloadApp && (
          <Button
            className="app-download-app-cta"
            variant="contained"
            color="primary"
            size="small"
            startIcon={<SmartphoneIcon className="app-download-app-icon" sx={{ fontSize: { xs: 18, sm: 20 } }} />}
            id="app-install-button"
            onClick={(event) => setAppInstallAnchor(event.currentTarget)}
            aria-haspopup="menu"
            aria-expanded={Boolean(appInstallAnchor)}
            aria-controls={appInstallAnchor ? 'app-install-menu' : undefined}
            sx={{
              flexShrink: 0,
              minWidth: 0,
              minHeight: 44,
              px: { xs: 0.8, sm: 1.25 },
              fontSize: { xs: '0.65rem', sm: '0.8125rem' },
              fontWeight: 700,
              whiteSpace: 'nowrap',
              boxShadow: 'none',
              '&:hover': { boxShadow: 'none' },
              '& .MuiButton-startIcon': { display: 'inline-flex', mr: { xs: 0.4, sm: 0.75 } },
            }}
          >
            Download App
          </Button>
        )}
        <Menu
          anchorEl={appInstallAnchor}
          open={showDownloadApp && Boolean(appInstallAnchor)}
          onClose={() => setAppInstallAnchor(null)}
          MenuListProps={{ id: 'app-install-menu', 'aria-labelledby': 'app-install-button' }}
        >
          {androidApkUrl && (
            <MenuItem
              component="a"
              href={androidApkUrl}
              download="FO2-iCare.apk"
              onClick={() => {
                setAppInstallAnchor(null);
                enqueueSnackbar('When the download finishes, open FO2-iCare.apk from Downloads to install.', { variant: 'info' });
              }}
            >
              Download FO2 iCare for Android
            </MenuItem>
          )}
          {isAndroidBrowser() && !androidApkUrl && (
            <MenuItem disabled>Android app download is not available on this server</MenuItem>
          )}
          {!isAndroidBrowser() && <MenuItem onClick={() => void handleInstallWebApp()}>Install web app</MenuItem>}
          {showIosProfileDownload && (
            <MenuItem component="a" href="/api/ios-profile.mobileconfig" onClick={() => setAppInstallAnchor(null)}>
              Download iOS profile (icon + secure connection)
            </MenuItem>
          )}
        </Menu>
        <Dialog
          open={installHelp !== null}
          onClose={() => setInstallHelp(null)}
          aria-labelledby="app-install-help-title"
          aria-describedby="app-install-help-description"
        >
          <DialogTitle id="app-install-help-title">Install FO2 iCare</DialogTitle>
          <DialogContent>
            <DialogContentText id="app-install-help-description">
              {installHelp === 'ios'
                ? 'On iPhone, download and install the FO2 iCare profile. Then open Settings > General > About > Certificate Trust Settings and enable full trust for the internal root certificate included with the FO2 iCare profile. Open the new Home Screen icon and enable Browser alerts from the bell menu.'
                : installHelp === 'android'
                  ? 'Choose Download FO2 iCare for Android from Download App, install the APK, and trust the approved internal root certificate when prompted. Open the FO2 iCare app and enable Android app alerts from the bell menu.'
                  : 'Open your browser menu and choose Install app or Add to Home screen if available.'}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            {installHelp === 'ios' && <Button href="/api/ios-profile.mobileconfig">Download iOS profile</Button>}
            {installHelp === 'android' && androidApkUrl && <Button href={androidApkUrl} download="FO2-iCare.apk">Download Android APK</Button>}
            <Button onClick={() => setInstallHelp(null)} autoFocus>Done</Button>
          </DialogActions>
        </Dialog>

        {/* Notifications */}
        <Box sx={{ mr: { xs: 0, sm: 1.5 }, flexShrink: 0 }}>
          <IconButton color="inherit" aria-label="Notifications" onClick={handleNotifOpen} sx={{ minWidth: 44, minHeight: 44 }}>
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
                width: { xs: 'min(320px, calc(100vw - 16px))', sm: 320 },
                maxWidth: 'calc(100vw - 16px)',
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
            <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Notifications
              </Typography>
              <Button size="small" onClick={handleMarkAllRead}
                disabled={markingAllRead || isNotifLoading || unreadCount === 0 || !navigator.onLine}>
                {markingAllRead ? 'Marking…' : 'Mark All as Read'}
              </Button>
            </Box>
            <Divider />
            <Box sx={{ px: 2, py: 1.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="body2" fontWeight={600}>{nativeFcmClient ? 'Android app alerts' : 'Browser alerts'}</Typography>
                <Button
                  size="small"
                  onClick={() => void (pushConfigCheckFailed ? retryPushConfigCheck() : handleBrowserPushToggle())}
                  disabled={pushBusy || sendingTestAlert || pushConfigChecking || !user || (!pushConfigCheckFailed && !pushEnabled && (nativeFcmClient
                    ? (!fcmConfigEnabled || !fcmPermissionGranted)
                    : (!pushSupported || !pushConfig?.enabled || pushNeedsHomeScreen)))}
                >
                  {pushConfigChecking ? 'Checking…' : pushConfigCheckFailed ? 'Retry' : pushBusy ? 'Working…' : pushEnabled ? 'Turn off' : 'Enable'}
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary" aria-live="polite" sx={{ display: 'block', lineHeight: 1.35 }}>
                {pushMessage || (nativeFcmClient
                  ? pushConfigCheckFailed
                    ? 'Could not check Android app alerts. Tap Retry to try again.'
                    : !fcmConfigEnabled
                    ? fcmSetupMessage(fcmConfigurationIssue)
                    : !fcmPermissionGranted
                      ? 'Allow notifications in Android Settings → Apps → FO2 iCare → Notifications, then reopen the app.'
                      : pushConfigChecking
                        ? 'Checking Android app alert setup…'
                        : pushEnabled
                            ? 'Android app alerts are enabled on this device. Sound and badges follow Android notification settings.'
                            : 'Enable Android app alerts on this device to receive notifications when FO2 iCare is closed.'
                  : pushNeedsHomeScreen
                  ? 'In Safari, add FO2 iCare to the Home Screen as a web app to use alerts.'
                  : !window.isSecureContext
                    ? 'Open FO2 iCare at its HTTPS address before enabling browser alerts.'
                  : !pushSupported
                    ? 'This browser or connection does not support background alerts.'
                    : pushConfigChecking
                      ? 'Checking browser alert setup…'
                      : pushConfigCheckFailed
                        ? 'Could not check server alert settings. Tap Retry to try again.'
                    : !pushConfig?.enabled
                      ? pushSetupMessage(pushConfig)
                      : pushEnabled
                        ? 'This device is subscribed. Send a test to check delivery. Sound and badges follow device settings.'
                        : 'Enable alerts here as well as in your device and browser settings.')}
              </Typography>
              {pushEnabled && <Button size="small" onClick={() => void handleTestAlert()} disabled={sendingTestAlert || pushBusy || !user}>
                {sendingTestAlert ? 'Sending test…' : 'Send test alert'}
              </Button>}
            </Box>
            <Divider />
            {isNotifLoading ? (
              <MenuItem disabled>
                <Typography variant="body2">Loading...</Typography>
              </MenuItem>
            ) : notifError ? (
              <MenuItem onClick={() => void fetchNotificationSummary()}>
                <Typography variant="body2" color="error">
                  {notifError}
                </Typography>
              </MenuItem>
            ) : notifications.length === 0 ? (
              <MenuItem disabled>
                <Typography variant="body2">No notifications</Typography>
              </MenuItem>
            ) : (
              notifications.map((notif) => (
                <MenuItem
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  sx={{
                    whiteSpace: 'normal',
                    bgcolor: notif.isRead ? 'transparent' : 'action.hover',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
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
            sx={{ flexShrink: 0, p: 0.75 }}
          >
            <Avatar
              sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
              src={
                import.meta.env.VITE_PROFILE_IMAGE_URL
                  ? `${import.meta.env.VITE_PROFILE_IMAGE_URL}/${user?.staffId}.jpg`
                  : undefined
              }
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
            PaperProps={{ sx: { maxWidth: 'calc(100vw - 16px)' } }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {formatPersonName(user, '—')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => void handleThemeToggle()} disabled={savingAppearance}>
              {mode === 'dark' ? <LightModeIcon sx={{ mr: 1 }} /> : <DarkModeIcon sx={{ mr: 1 }} />}
              {mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </MenuItem>
            {canChooseLayout && (
              <MenuItem
                onClick={(event) => {
                  event.preventDefault();
                  toggleLayoutMode();
                  handleProfileMenuClose();
                }}
              >
                <DevicesIcon sx={{ mr: 1 }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2">Mobile View</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Use tablet-style cards and navigation
                  </Typography>
                </Box>
                <Switch
                  edge="end"
                  size="small"
                  checked={layoutMode === 'mobile'}
                  inputProps={{ 'aria-label': 'Use Mobile View' }}
                />
              </MenuItem>
            )}
            <MenuItem onClick={handleSettings}>
              <PaletteIcon sx={{ mr: 1 }} />
              Appearance & Settings
            </MenuItem>
            <MenuItem
              onClick={() => {
                onOpenChangelog();
                handleProfileMenuClose();
              }}
            >
              <NewReleasesIcon sx={{ mr: 1 }} />
              What&apos;s New
            </MenuItem>
            {Boolean(myCap?.isChangelogManagement) && (
              <MenuItem
                onClick={() => {
                  router.push('/admin/changelog');
                  handleProfileMenuClose();
                }}
              >
                <NewReleasesIcon sx={{ mr: 1 }} />
                Manage Changelog
              </MenuItem>
            )}
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
