import { Capacitor } from '@capacitor/core';
import { getNativeFcmHandoff, subscribeNativeFcmHandoff } from './native-fcm-handoff';
import { getMobileDevicePlatform } from './mobile-device';

export function isAndroidBrowser(): boolean {
  return !Capacitor.isNativePlatform() && getMobileDevicePlatform() === 'android';
}

export function isHomeScreenApp(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function registerWebPushWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
}

export async function getActiveWebPushWorker(): Promise<ServiceWorkerRegistration> {
  let timeout: number | undefined;
  try {
    return await Promise.race([
      registerWebPushWorker().then(() => navigator.serviceWorker.ready),
      new Promise<never>((_, reject) => {
        timeout = window.setTimeout(() => reject(new Error('Notification service did not start in time.')), 10_000);
      }),
    ]);
  } finally {
    window.clearTimeout(timeout);
  }
}

window.addEventListener('beforeinstallprompt', (event) => {
  if (isAndroidBrowser()) event.preventDefault();
});

function updateInstalledTouchGestures() {
  const installed = Capacitor.isNativePlatform() || isHomeScreenApp() || !!getNativeFcmHandoff();
  document.documentElement.toggleAttribute('data-installed-app', installed);
}

updateInstalledTouchGestures();
subscribeNativeFcmHandoff(updateInstalledTouchGestures);
window.addEventListener('pageshow', updateInstalledTouchGestures);
window.addEventListener('appinstalled', updateInstalledTouchGestures);
const preventInstalledPinch = (event: Event) => {
  if (event.cancelable && document.documentElement.hasAttribute('data-installed-app')) event.preventDefault();
};
window.addEventListener('gesturestart', preventInstalledPinch, { passive: false });
window.addEventListener('gesturechange', preventInstalledPinch, { passive: false });

// Give Android Chrome the push-only worker before installation. Permission and
// subscription still happen only when the user enables alerts.
if (isAndroidBrowser() && window.isSecureContext && 'serviceWorker' in navigator) {
  void registerWebPushWorker().catch(() => undefined);
}
