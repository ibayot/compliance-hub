import { useEffect, useRef } from 'react';

/**
 * Automatically calls `callback` every `intervalMs` milliseconds (default: 30s).
 * When the page becomes visible after being hidden (switching tabs), triggers an
 * immediate refresh so data is never stale when the user returns.
 *
 * Usage:
 *   useAutoRefresh(fetchData);          // refresh every 30 s
 *   useAutoRefresh(fetchData, 60_000);  // refresh every 60 s
 */
export function useAutoRefresh(callback: () => void, intervalMs: number = 30_000): void {
  // Keep a stable ref so the interval closure always calls the latest version
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const tick = () => cbRef.current();

    const id = setInterval(tick, intervalMs);

    // Immediate refresh when the tab becomes visible again
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [intervalMs]);
}
