import { isApplicationPath } from './session-recovery';

const EXPIRED_DESTINATION = 'compliance-hub:expired-session-destination';

/** Accept only paths inside the signed-in app. Reject ambiguous or external URLs. */
export function signInDestination(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value)) return;
  const path = value.split(/[?#]/, 1)[0];
  if (/%(?:2f|5c|25|2e|0[0-9a-f]|1[0-9a-f]|7f)/i.test(path)) return;
  try {
    const origin = 'https://application.invalid';
    const url = new URL(value, origin);
    if (url.origin === origin && isApplicationPath(url.pathname)) return url.pathname + url.search + url.hash;
  } catch { /* Invalid links fall back to the dashboard. */ }
}

export function rememberExpiredDestination(location: Pick<Location, 'pathname' | 'search' | 'hash'>) {
  const destination = signInDestination(location.pathname + location.search + location.hash);
  try {
    if (destination) sessionStorage.setItem(EXPIRED_DESTINATION, destination);
    else clearExpiredDestination();
  } catch { /* Sign-in still works when browser storage is unavailable. */ }
}

export function readExpiredDestination() {
  try { return signInDestination(sessionStorage.getItem(EXPIRED_DESTINATION)); }
  catch { return undefined; }
}

export function clearExpiredDestination() {
  try { sessionStorage.removeItem(EXPIRED_DESTINATION); } catch { /* Optional state. */ }
}
