import { Capacitor } from '@capacitor/core';

interface InstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
}

let installPrompt: InstallPromptEvent | null = null;

export function isAndroidBrowser(): boolean {
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform;
  return !Capacitor.isNativePlatform() && /\bAndroid\b/i.test(`${platform ?? ''} ${navigator.userAgent}`);
}

export function isHomeScreenApp(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function registerWebPushWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
}

window.addEventListener('beforeinstallprompt', (event) => {
  if (Capacitor.isNativePlatform()) return;
  event.preventDefault();
  installPrompt = event as InstallPromptEvent;
});
window.addEventListener('appinstalled', () => { installPrompt = null; });

// Give Android Chrome the push-only worker before installation. Permission and
// subscription still happen only when the user enables alerts.
if (isAndroidBrowser() && window.isSecureContext && 'serviceWorker' in navigator) {
  void registerWebPushWorker().catch(() => undefined);
}

export async function promptToInstallWebApp(): Promise<boolean> {
  const prompt = installPrompt;
  if (!prompt) return false;
  installPrompt = null;
  try {
    await prompt.prompt();
    return true;
  } catch {
    return false;
  }
}
