const SIGNED_OUT_KEY = 'compliance-hub:session-signed-out';
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

/** Called only after a successful interactive sign-in, including MFA completion. */
export function completeInteractiveSignIn(): void {
  signedOut = false;
  generation++;
  try { localStorage.removeItem(SIGNED_OUT_KEY); } catch { /* Storage may be unavailable. */ }
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
