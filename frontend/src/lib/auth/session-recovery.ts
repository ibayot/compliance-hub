const SIGNED_OUT_KEY = 'compliance-hub:session-signed-out';
const ACTIVITY_KEY = 'compliance-hub:session-activity:';
let signedOut = false;
let generation = 0;

export function isApplicationPath(pathname: string): boolean {
  return pathname.replace(/\/+$/, '') === '/dashboard' || ['/admin/', '/operations/', '/governance/'].some(prefix => pathname.startsWith(prefix));
}

export function hasSignedOut(): boolean {
  try { return signedOut || localStorage.getItem(SIGNED_OUT_KEY) !== null; }
  catch { return signedOut; }
}

export function observeSessionSignOut(): void {
  signedOut = true;
  generation++;
}

export function markSessionSignedOut(): void {
  observeSessionSignOut();
  try { localStorage.setItem(SIGNED_OUT_KEY, String(Date.now())); } catch { /* In-memory protection remains active. */ }
}

export function readSessionActivity(userId: number): number | undefined {
  try {
    const at = Number(localStorage.getItem(ACTIVITY_KEY + userId));
    return Number.isFinite(at) && at > 0 && at <= Date.now() ? at : undefined;
  } catch { return undefined; }
}

export function rememberSessionActivity(userId: number, at = Date.now()): void {
  try {
    if (at > (readSessionActivity(userId) ?? 0)) localStorage.setItem(ACTIVITY_KEY + userId, String(at));
  } catch { /* Continue enforcing the in-memory idle deadline when storage is unavailable. */ }
}

/** Called only after a successful interactive sign-in, including MFA completion. */
export function completeInteractiveSignIn(userId: number): void {
  signedOut = false;
  generation++;
  try { localStorage.removeItem(SIGNED_OUT_KEY); } catch { /* Storage may be unavailable. */ }
  rememberSessionActivity(userId);
}

export function recoveryGeneration(): number { return generation; }

export function canRecoverSession(): boolean {
  return typeof window !== 'undefined' && isApplicationPath(window.location.pathname) && !hasSignedOut();
}

export function isRejectedSession(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 401 || status === 403;
}

export function isSignOutStorageEvent(event: StorageEvent): boolean {
  return event.key === SIGNED_OUT_KEY && event.newValue !== null;
}
