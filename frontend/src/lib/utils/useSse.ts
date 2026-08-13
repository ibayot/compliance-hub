import { useEffect, useRef } from 'react';
import { useAuth, tokenStore } from '@/contexts/AuthContext';

export type SseEventType =
  | 'TICKET_UPDATED'
  | 'SYSTEM_STATUS_CHANGED'
  | 'ATTENDANCE_UPDATED'
  | 'NOTIFICATION_CREATED'
  | 'GLOBAL_SETTINGS_UPDATED'
  | 'INCIDENT_SNAPSHOT_CREATED'
  | 'HEARTBEAT';

interface SsePayload {
  type: SseEventType;
  payload?: any;
}

// --- SINGLETON STATE ---
let masterEventSource: EventSource | null = null;
let currentToken: string | null = null;

type SseListener = {
  types: SseEventType[];
  callback: (payload?: any) => void;
};
const activeListeners = new Set<SseListener>();

function connectSse(token: string) {
  if (masterEventSource && currentToken === token) {
    return;
  }

  if (masterEventSource) {
    masterEventSource.onmessage = null;
    masterEventSource.onerror = null;
    masterEventSource.onopen = null;
    masterEventSource.close();
  }

  currentToken = token;
  const source = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
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

    if (source.readyState === 2) {
      setTimeout(() => {
        if (masterEventSource === source && currentToken) {
          console.log('[SSE] Forcing reconnection after fatal closure...');
          connectSse(currentToken);
        }
      }, 5000);
    }
  };
}

function disconnectSse() {
  if (!masterEventSource) {
    return;
  }

  masterEventSource.onmessage = null;
  masterEventSource.onerror = null;
  masterEventSource.onopen = null;
  masterEventSource.close();
  masterEventSource = null;
  currentToken = null;
}

// Global listener for token refresh
if (typeof window !== 'undefined') {
  window.addEventListener('auth:tokenChanged', (e: any) => {
    const newToken = e.detail;
    // If we have active listeners, immediately reconnect with new token
    if (activeListeners.size > 0 && newToken) {
      connectSse(newToken);
    }
  });
}

/**
 * useSse (Hardened Singleton Version)
 */
export function useSse(eventTypes: SseEventType[], callback: (payload?: any) => void) {
  const { isSessionLocked, user } = useAuth();
  
  const callbackRef = useRef(callback);
  callbackRef.current = callback; // Update synchronously during render

  // Sort and deduplicate to ensure stable dependency array
  const typesString = [...new Set(eventTypes)].sort().join(',');

  useEffect(() => {
    if (!user || isSessionLocked || !typesString) {
      return;
    }

    const token = tokenStore.get('accessToken');
    if (!token) return;

    // Register this component's listener
    const listener: SseListener = {
      types: typesString.split(',') as SseEventType[],
      callback: (payload) => callbackRef.current(payload),
    };

    activeListeners.add(listener);
    connectSse(token);

    return () => {
      activeListeners.delete(listener);
      // Close the master connection if no components are listening anymore
      if (activeListeners.size === 0) {
        disconnectSse();
      }
    };
  }, [isSessionLocked, user?.id, typesString]);
}
