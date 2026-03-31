import { useEffect, useRef } from 'react';

/**
 * Automatically calls `callback` every `intervalMs` milliseconds (default: 30s).
 * When the page becomes visible after being hidden (switching tabs), triggers an
 * immediate refresh — but only if the last refresh was more than `visibilityCooldownMs`
 * ago (default: 10s) to prevent burst requests caused by rapid tab switching.
 *
 * Usage:
 *   useAutoRefresh(fetchData);          // refresh every 30 s
 *   useAutoRefresh(fetchData, 60_000);  // refresh every 60 s
 */
export function useAutoRefresh(
  callback: () => void,
  intervalMs: number = 30_000,
  visibilityCooldownMs: number = 10_000,
): void {
  // Keep a stable ref so the interval closure always calls the latest version
  const cbRef = useRef(callback);
  cbRef.current = callback;

  // Track when the last auto-refresh fired to debounce visibility events
  const lastFiredRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      cbRef.current();
      lastFiredRef.current = Date.now();
    };

    const id = setInterval(tick, intervalMs);

    // Immediate refresh when the tab becomes visible again, but throttle bursts
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Skip if we refreshed very recently (protects against rapid tab-switches
        // that could push all polling components over the API rate limit)
        if (Date.now() - lastFiredRef.current > visibilityCooldownMs) {
          tick();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [intervalMs, visibilityCooldownMs]);
}
