import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth, tokenStore } from '@/contexts/AuthContext';

export type SseEventType =
  | 'TICKET_UPDATED'
  | 'SYSTEM_STATUS_CHANGED'
  | 'ATTENDANCE_UPDATED'
  | 'NOTIFICATION_CREATED'
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

type SseListener = {
  types: SseEventType[];
  callback: (payload?: any) => void;
};
const activeListeners = new Set<SseListener>();

function scheduleReconnect(authKey: string, accessToken?: string) {
  if (activeListeners.size === 0 || reconnectTimer) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (activeListeners.size > 0) {
      void connectSse(authKey, accessToken, true).catch(() => undefined);
    }
  }, 5000);
}

async function connectSse(authKey: string, accessToken?: string, force = false) {
  const hasLiveConnection =
    currentAuthKey === authKey &&
    masterEventSource !== null &&
    masterEventSource.readyState !== EventSource.CLOSED;

  if (!force && hasLiveConnection) return;
  if (!force && connectionPromise && connectionPromiseAuthKey === authKey) return connectionPromise;

  const generation = ++connectionGeneration;

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
    const ticketResponse = await fetch('/api/events/token', {
      credentials: 'include',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      signal: abortController.signal,
    });
    if (!ticketResponse.ok) throw new Error('Unable to obtain SSE connection ticket.');
    const { token: ticket } = await ticketResponse.json();
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
    const source = new EventSource(`/api/events?ticket=${encodeURIComponent(ticket)}`);
    masterEventSource = source;

    source.onopen = () => {
      console.log('[SSE] Connected', new Date().toISOString());
    };

    source.onmessage = (event) => {
      let data: SsePayload;

      try {
        data = JSON.parse(event.data);
      } catch (err) {
        console.error('[SSE] Invalid message:', event.data, err);
        return;
      }

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

      if (source.readyState === EventSource.CLOSED && masterEventSource === source) {
        masterEventSource = null;
        currentAuthKey = null;
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
        // Logout, forced reauthentication, and account lockout all clear the token.
        // Close the shared stream immediately instead of waiting for EventSource retry.
        disconnectSse();
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
