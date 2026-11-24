const HANDOFF_STORAGE_KEY = 'fo2-icare-native-fcm-handoff-v1';
const NATIVE_FCM_FRAGMENT_KEY = 'fo2_fcm=';

export interface NativeFcmHandoff {
  version: 1 | 2;
  deviceId: string;
  fid?: string;
  notificationsGranted: boolean;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseHandoff(value: unknown): NativeFcmHandoff | null {
  if (!value || typeof value !== 'object') return null;
  const parsed = value as Partial<NativeFcmHandoff>;
  if ((parsed.version !== 1 && parsed.version !== 2) || !isUuid(parsed.deviceId) ||
      typeof parsed.notificationsGranted !== 'boolean') return null;
  if (parsed.fid !== undefined && (typeof parsed.fid !== 'string' || !/^[A-Za-z0-9_-]{22}$/.test(parsed.fid))) return null;
  return {
    version: parsed.version,
    deviceId: parsed.deviceId,
    fid: parsed.version === 2 ? parsed.fid : undefined,
    notificationsGranted: parsed.notificationsGranted,
  };
}

function decodeHandoff(encoded: string): NativeFcmHandoff | null {
  try {
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const binary = window.atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return parseHandoff(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

function readStoredHandoff(): NativeFcmHandoff | null {
  try {
    const value = sessionStorage.getItem(HANDOFF_STORAGE_KEY);
    if (!value) return null;
    return parseHandoff(JSON.parse(value));
  } catch {
    return null;
  }
}

function captureNativeHandoff(): void {
  if (typeof window === 'undefined' || !window.location.hash.startsWith(`#${NATIVE_FCM_FRAGMENT_KEY}`)) return;
  const encoded = window.location.hash.slice(NATIVE_FCM_FRAGMENT_KEY.length + 1);
  const handoff = decodeHandoff(encoded);
  if (!handoff) return;
  try {
    sessionStorage.setItem(HANDOFF_STORAGE_KEY, JSON.stringify(handoff));
    // The FID is a device routing identifier, not an authentication secret. Still, keep it out of
    // browser history and referrers by removing the handoff fragment before the app renders.
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
  } catch {
    // Continue the app if session storage is unavailable; the current fragment is not an auth token.
  }
}

captureNativeHandoff();

export function getNativeFcmHandoff(): NativeFcmHandoff | null {
  return readStoredHandoff();
}

export function isNativeFcmClient(): boolean {
  return !!readStoredHandoff();
}

export function clearNativeFcmFid(): void {
  const current = readStoredHandoff();
  if (!current) return;
  try {
    sessionStorage.setItem(HANDOFF_STORAGE_KEY, JSON.stringify({
      version: current.version,
      deviceId: current.deviceId,
      notificationsGranted: current.notificationsGranted,
    }));
  } catch { /* Storage is only a convenience for the one-time device handoff. */ }
}

export function getNotificationDeviceId(): string {
  const nativeHandoff = readStoredHandoff();
  if (nativeHandoff) return nativeHandoff.deviceId;
  const storageKey = 'fo2-icare-browser-push-device-id-v1';
  try {
    const existing = localStorage.getItem(storageKey);
    if (isUuid(existing)) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(storageKey, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}
