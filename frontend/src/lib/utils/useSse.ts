import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth, tokenStore } from '@/contexts/AuthContext';
import { apiUrl } from '@/lib/api/client';
import { boundedGet } from '@/lib/api/bounded-read';
import { canRecoverSession } from '@/lib/auth/session-recovery';

export type SseEventType =
  | 'TICKET_UPDATED'
  | 'SYSTEM_STATUS_CHANGED'
  | 'ATTENDANCE_UPDATED'
  | 'NOTIFICATION_CREATED'
  | 'NOTIFICATIONS_READ'
  | 'GLOBAL_SETTINGS_UPDATED'
  | 'USER_DIRECTORY_UPDATED'
  | 'DUTY_UPDATED'
  | 'INCIDENT_SNAPSHOT_CREATED'
  | 'HEARTBEAT';

interface SsePayload {
  type: SseEventType;
  payload?: any;
}

// --- SINGLETON STATE ---
let masterEventSource: EventSource | null = null;
let currentAuthKey: string | null = null;
let connectionGeneration = 0;
let connectionAbortController: AbortController | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let connectionPromise: Promise<void> | null = null;
let connectionPromiseAuthKey: string | null = null;
let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
const SSE_STALE_MS = 75_000; // Server heartbeat is every 20 seconds.

type SseListener = {
  types: SseEventType[];
  callback: (payload?: any) => void;
};
const activeListeners = new Set<SseListener>();

function scheduleReconnect(authKey: string, accessToken?: string) {
  if (activeListeners.size === 0 || reconnectTimer || !canRecoverSession()) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (activeListeners.size > 0 && canRecoverSession()) {
      void connectSse(authKey, accessToken, true).catch(() => undefined);
    }
  }, 5000);
}

async function connectSse(authKey: string, accessToken?: string, force = false) {
  if (!activeListeners.size || !canRecoverSession()) return;
  const hasLiveConnection =
    currentAuthKey === authKey &&
    masterEventSource !== null &&
    masterEventSource.readyState !== EventSource.CLOSED;

  if (!force && hasLiveConnection) return;
  if (!force && connectionPromise && connectionPromiseAuthKey === authKey &&
    currentAuthKey === authKey && !connectionAbortController?.signal.aborted) return connectionPromise;

  const generation = ++connectionGeneration;
  if (heartbeatTimer) clearTimeout(heartbeatTimer);
  heartbeatTimer = null;

  if (masterEventSource) {
    masterEventSource.onmessage = null;
    masterEventSource.onerror = null;
    masterEventSource.onopen = null;
    masterEventSource.close();
  }

  connectionAbortController?.abort();
  const abortController = new AbortController();
  connectionAbortController = abortController;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  currentAuthKey = authKey;
  const attempt = (async () => {
    const { token: ticket } = await boundedGet<{ token: string }>('/events/token', {
      signal: abortController.signal,
    });
    if (!ticket || typeof ticket !== 'string') throw new Error('Live update connection unavailable.');
    // The component may have unmounted, logged out, or changed users while the
    // connection ticket was loading. Do not create a listener-less EventSource
    // from that stale async attempt.
    if (
      abortController.signal.aborted ||
      generation !== connectionGeneration ||
      currentAuthKey !== authKey ||
      activeListeners.size === 0
    ) {
      return;
    }
    const source = new EventSource(apiUrl(`/events?ticket=${encodeURIComponent(ticket)}`), {
      withCredentials: !Capacitor.isNativePlatform(),
    });
    masterEventSource = source;
    const armWatchdog = () => {
      if (heartbeatTimer) clearTimeout(heartbeatTimer);
      heartbeatTimer = setTimeout(() => {
        heartbeatTimer = null;
        if (generation !== connectionGeneration || masterEventSource !== source || !activeListeners.size) return;
        if (document.visibilityState === 'hidden') { armWatchdog(); return; }
        void connectSse(authKey, accessToken, true).catch(() => undefined);
      }, SSE_STALE_MS);
    };
    armWatchdog();

    source.onopen = () => {
      if (masterEventSource !== source || generation !== connectionGeneration) return;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      armWatchdog();
      console.log('[SSE] Connected', new Date().toISOString());
      // Reconcile missed changes after backgrounding or a disconnected interval.
      // Notify each query owner once; it remains responsible for authorized refetch.
      for (const listener of [...activeListeners]) {
        try {
          void Promise.resolve(listener.callback({ reconnected: true })).catch(() => console.warn('[SSE] Reconciliation failed.'));
        } catch { console.warn('[SSE] Reconciliation failed.'); }
      }
    };

    source.onmessage = (event) => {
      let data: SsePayload;

      try {
        data = JSON.parse(event.data);
      } catch (err) {
        console.warn('[SSE] Invalid message.');
        return;
      }

      if (!data || typeof data.type !== 'string' || masterEventSource !== source) return;
      armWatchdog();

      if (data.type === 'HEARTBEAT') {
        return;
      }

      console.log('[SSE RECEIVE]', new Date().toISOString(), data.type);

      for (const listener of [...activeListeners]) {
        if (!listener.types.includes(data.type)) {
          continue;
        }

        try {
          listener.callback(data.payload);
        } catch (err) {
          console.error(`[SSE] Listener failed for ${data.type}:`, err);
        }
      }
    };

    source.onerror = () => {
      console.warn('[SSE] Connection error', new Date().toISOString(), {
        readyState: source.readyState,
      });

      if (masterEventSource === source) {
        // A fresh connection ticket is needed if EventSource keeps reconnecting.
        scheduleReconnect(authKey, accessToken);
      }
    };
  })();

  connectionPromise = attempt;
  connectionPromiseAuthKey = authKey;

  try {
    await attempt;
  } catch (error) {
    if (generation === connectionGeneration && currentAuthKey === authKey) {
      currentAuthKey = null;
      connectionAbortController = null;
      masterEventSource = null;
      scheduleReconnect(authKey, accessToken);
    }
    throw error;
  } finally {
    if (connectionPromise === attempt) {
      connectionPromise = null;
      connectionPromiseAuthKey = null;
    }
  }
}

function disconnectSse() {
  // Invalidate any in-flight ticket request before closing the current stream.
  connectionGeneration += 1;
  if (heartbeatTimer) clearTimeout(heartbeatTimer);
  heartbeatTimer = null;
  // A remount must not reuse a token request that this disconnect aborts.
  connectionPromise = null;
  connectionPromiseAuthKey = null;
  connectionAbortController?.abort();
  connectionAbortController = null;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (!masterEventSource) {
    currentAuthKey = null;
    return;
  }

  masterEventSource.onmessage = null;
  masterEventSource.onerror = null;
  masterEventSource.onopen = null;
  masterEventSource.close();
  masterEventSource = null;
  currentAuthKey = null;
}

// Global listener for token refresh
if (typeof window !== 'undefined') {
  const reconnectVisibleSession = () => {
    if (!activeListeners.size || document.visibilityState === 'hidden') return;
    const native = Capacitor.isNativePlatform(), token = tokenStore.get('accessToken');
    if (native && !token) return;
    void connectSse(native ? `native:${token}` : 'browser-cookie', native ? token! : undefined, true).catch(() => undefined);
  };
  window.addEventListener('online', reconnectVisibleSession);
  document.addEventListener('visibilitychange', reconnectVisibleSession);
  window.addEventListener('auth:tokenChanged', (e: any) => {
      const newToken = e.detail;
      // If we have active listeners, immediately reconnect with new token
      if (activeListeners.size > 0 && newToken) {
        const isNative = Capacitor.isNativePlatform();
        void connectSse(
          isNative ? `native:${newToken}` : 'browser-cookie',
          isNative ? newToken : undefined,
          true,
        ).catch(() => undefined);
      } else if (!newToken) {
        if (Capacitor.isNativePlatform() || !canRecoverSession()) disconnectSse();
        // Cookie-only browser renewal clears the obsolete in-memory token too.
        // It is not a logout; preserve/reconcile the authenticated live stream.
        else reconnectVisibleSession();
      }
  });
}

/**
 * useSse (Hardened Singleton Version)
 */
export function useSse(eventTypes: SseEventType[], callback: (payload?: any) => void) {
  const { isSessionLocked, requiresPasswordChange, user } = useAuth();
  
  const callbackRef = useRef(callback);
  callbackRef.current = callback; // Update synchronously during render

  // Sort and deduplicate to ensure stable dependency array
  const typesString = [...new Set(eventTypes)].sort().join(',');

  useEffect(() => {
    if (!user || isSessionLocked || requiresPasswordChange || !typesString) {
      return;
    }

    const accessToken = tokenStore.get('accessToken');
    const isNative = Capacitor.isNativePlatform();
    // Browser sessions are authenticated by HttpOnly cookies, so a hard refresh
    // or a newly opened window can be authenticated even though its in-memory
    // token store is empty. Native clients still authenticate with a bearer token.
    if (isNative && !accessToken) return;

    // Register this component's listener
    const listener: SseListener = {
      types: typesString.split(',') as SseEventType[],
      callback: (payload) => callbackRef.current(payload),
    };

    activeListeners.add(listener);
    void connectSse(
      isNative ? `native:${accessToken}` : 'browser-cookie',
      isNative ? accessToken! : undefined,
    ).catch(() => undefined);

    return () => {
      activeListeners.delete(listener);
      // Close the master connection if no components are listening anymore
      if (activeListeners.size === 0) {
        disconnectSse();
      }
    };
  }, [isSessionLocked, requiresPasswordChange, user?.id, typesString]);
}
