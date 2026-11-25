const HANDOFF_STORAGE_KEY = 'fo2-icare-native-fcm-handoff-v1';
const NATIVE_FCM_FRAGMENT_KEY = 'fo2_fcm=';
const handoffListeners = new Set<() => void>();

export interface NativeFcmHandoff {
  version: 1 | 2 | 3 | 4;
  deviceId: string;
  fid?: string;
  notificationsGranted: boolean;
  routineBadgeAllowed?: boolean;
  routineUsesAppSound?: boolean;
  badgeLauncher?: string;
  badgeTarget?: string;
  badgeAlert?: 'COUNTED' | 'UNCOUNTED' | 'MISSING';
  previewAlert?: 'PREVIEW' | 'GENERIC';
  badgeRequest?: 'READY' | 'REQUESTED' | 'BLOCKED' | 'UNAVAILABLE' | 'STANDARD';
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isAndroidPackage(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 150 &&
    /^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)+$/.test(value);
}

function parseHandoff(value: unknown): NativeFcmHandoff | null {
  if (!value || typeof value !== 'object') return null;
  const parsed = value as Partial<NativeFcmHandoff>;
  if ((parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3 && parsed.version !== 4) || !isUuid(parsed.deviceId) ||
      typeof parsed.notificationsGranted !== 'boolean') return null;
  if (parsed.fid !== undefined && (typeof parsed.fid !== 'string' || !/^[A-Za-z0-9_-]{22}$/.test(parsed.fid))) return null;
  return {
    version: parsed.version,
    deviceId: parsed.deviceId,
    fid: parsed.version >= 2 ? parsed.fid : undefined,
    notificationsGranted: parsed.notificationsGranted,
    routineBadgeAllowed: typeof parsed.routineBadgeAllowed === 'boolean' ? parsed.routineBadgeAllowed : undefined,
    routineUsesAppSound: typeof parsed.routineUsesAppSound === 'boolean' ? parsed.routineUsesAppSound : undefined,
    badgeLauncher: isAndroidPackage(parsed.badgeLauncher) ? parsed.badgeLauncher : undefined,
    badgeTarget: isAndroidPackage(parsed.badgeTarget) ? parsed.badgeTarget : undefined,
    badgeAlert: parsed.badgeAlert === 'COUNTED' || parsed.badgeAlert === 'UNCOUNTED' || parsed.badgeAlert === 'MISSING'
      ? parsed.badgeAlert : undefined,
    previewAlert: parsed.previewAlert === 'PREVIEW' || parsed.previewAlert === 'GENERIC' ? parsed.previewAlert : undefined,
    badgeRequest: parsed.badgeRequest === 'READY' || parsed.badgeRequest === 'REQUESTED' ||
      parsed.badgeRequest === 'BLOCKED' || parsed.badgeRequest === 'UNAVAILABLE' || parsed.badgeRequest === 'STANDARD'
      ? parsed.badgeRequest : undefined,
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

let currentHandoff = readStoredHandoff();

function setNativeHandoff(handoff: NativeFcmHandoff): void {
  if (JSON.stringify(handoff) === JSON.stringify(currentHandoff)) return;
  currentHandoff = handoff;
  try { sessionStorage.setItem(HANDOFF_STORAGE_KEY, JSON.stringify(handoff)); }
  catch { /* The handoff remains available in the current page even without session storage. */ }
  handoffListeners.forEach(listener => listener());
}

function captureNativeHandoff(): void {
  if (typeof window === 'undefined' || !window.location.hash.startsWith(`#${NATIVE_FCM_FRAGMENT_KEY}`)) return;
  const encoded = window.location.hash.slice(NATIVE_FCM_FRAGMENT_KEY.length + 1);
  const handoff = decodeHandoff(encoded);
  try {
    // Strip the routing fragment before notifying the application, including on warm TWA launches.
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
  } catch { /* Some browser contexts restrict history changes. */ }
  if (handoff) setNativeHandoff(handoff);
}

captureNativeHandoff();
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', captureNativeHandoff);
  window.addEventListener('pageshow', captureNativeHandoff);
}

export function getNativeFcmHandoff(): NativeFcmHandoff | null {
  return currentHandoff;
}

export function subscribeNativeFcmHandoff(listener: () => void): () => void {
  handoffListeners.add(listener);
  return () => { handoffListeners.delete(listener); };
}

export function getNotificationDeviceId(): string {
  const nativeHandoff = getNativeFcmHandoff();
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
