import { Capacitor } from '@capacitor/core';

interface InstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
}

let installPrompt: InstallPromptEvent | null = null;

export function isAndroidBrowser(): boolean {
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform;
  return !Capacitor.isNativePlatform() && /\bAndroid\b/i.test(`${platform ?? ''} ${navigator.userAgent}`);
}

window.addEventListener('beforeinstallprompt', (event) => {
  if (!isAndroidBrowser()) return;
  event.preventDefault();
  installPrompt = event as InstallPromptEvent;
});
window.addEventListener('appinstalled', () => { installPrompt = null; });

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
