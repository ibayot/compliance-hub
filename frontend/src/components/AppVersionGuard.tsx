import { useEffect } from 'react';

interface AppVersionManifest {
  buildId?: string;
}

const CHECK_INTERVAL_MS = 30_000;
const RELOAD_GUARD_KEY = 'compliance-hub:pending-build-reload';
const RELOAD_GUARD_TTL_MS = 2 * 60_000;

let reloadRequested = false;

const removeReloadGuard = () => {
  try {
    sessionStorage.removeItem(RELOAD_GUARD_KEY);
  } catch {
    // Reload detection must continue even when browser storage is unavailable.
  }
};

const readReloadGuard = () => {
  try {
    return sessionStorage.getItem(RELOAD_GUARD_KEY);
  } catch {
    return null;
  }
};

const writeReloadGuard = (buildId: string) => {
  try {
    sessionStorage.setItem(RELOAD_GUARD_KEY, JSON.stringify({ buildId, requestedAt: Date.now() }));
  } catch {
    // The cache-busting URL still prevents stale reloads when storage is unavailable.
  }
};

export default function AppVersionGuard() {
  useEffect(() => {
    let disposed = false;
    let checking = false;

    const checkForNewBuild = async () => {
      if (disposed || checking || reloadRequested) return;
      checking = true;
      try {
        const response = await fetch(`/app-version.json?_=${Date.now()}`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        if (disposed) return;
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
          return;
        }

        const manifest = (await response.json()) as AppVersionManifest;
        const deployedBuildId = String(manifest.buildId || '').trim();
        const loadedBuildId = String(import.meta.env.VITE_APP_BUILD_ID || '').trim();
        if (!deployedBuildId || !loadedBuildId) return;

        if (deployedBuildId === loadedBuildId) {
          removeReloadGuard();
          const currentUrl = new URL(window.location.href);
          if (currentUrl.searchParams.has('__appBuild')) {
            currentUrl.searchParams.delete('__appBuild');
            window.history.replaceState(window.history.state, '', currentUrl.toString());
          }
          return;
        }

        const previousReload = readReloadGuard();
        if (previousReload) {
          try {
            const parsed = JSON.parse(previousReload) as { buildId?: string; requestedAt?: number };
            if (
              parsed.buildId === deployedBuildId &&
              Number(parsed.requestedAt) > Date.now() - RELOAD_GUARD_TTL_MS
            ) {
              return;
            }
          } catch {
            removeReloadGuard();
          }
        }

        reloadRequested = true;
        writeReloadGuard(deployedBuildId);
        const reloadUrl = new URL(window.location.href);
        reloadUrl.searchParams.set('__appBuild', deployedBuildId);
        window.location.replace(reloadUrl.toString());
        window.setTimeout(() => {
          // If navigation was blocked, permit a guarded retry after the reload TTL.
          reloadRequested = false;
        }, 10_000);
      } catch {
        // A stopped or restarting container is expected to fail temporarily. The interval,
        // focus, visibility, or online event will retry once the deployment is healthy again.
      } finally {
        checking = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void checkForNewBuild();
    };
    const handleWindowFocus = () => void checkForNewBuild();
    const handleOnline = () => void checkForNewBuild();

    void checkForNewBuild();
    const interval = window.setInterval(checkForNewBuild, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return null;
}
