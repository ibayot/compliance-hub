/* Web Push only. This worker deliberately does not cache pages or API responses. */
self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function safeTargetPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  try {
    const parsed = new URL(value, self.location.origin);
    return parsed.origin === self.location.origin ? `${parsed.pathname}${parsed.search}${parsed.hash}` : '/dashboard';
  } catch {
    return '/dashboard';
  }
}

async function playSlaSoundInOpenApp(kind) {
  const windows = await self.clients.matchAll({ type: 'window' });
  const client = windows.find(item => item.focused && item.visibilityState === 'visible');
  if (!client) return false;
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const finish = played => { clearTimeout(timeout); channel.port1.close(); resolve(played); };
    const timeout = setTimeout(() => finish(false), 250);
    channel.port1.onmessage = event => finish(event.data === true);
    client.postMessage({ type: 'FO2_SLA_SOUND', kind }, [channel.port2]);
  });
}

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let payload = {};
    try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
    const test = payload?.test === true;
    const slaSound = payload?.kind === 'nearing_sla' || payload?.kind === 'overdue_sla';
    const unreadCount = Number.isSafeInteger(payload?.unreadCount) && payload.unreadCount > 0
      ? payload.unreadCount
      : 0;
    // Show the OS notification independently of numeric app badge support.
    const playedInOpenApp = slaSound && await playSlaSoundInOpenApp(payload.kind).catch(() => false);
    await self.registration.showNotification('FO2 iCare', {
      body: test ? 'Your test alert arrived on this device.' : slaSound ? 'You have an SLA reminder.' : 'You have a new notification.',
      icon: '/icons/app-192.png',
      badge: '/icons/app-192.png',
      silent: playedInOpenApp,
      tag: test ? 'fo2-icare-test-alert' : slaSound ? `fo2-${payload.kind}` : 'rictms-new-notification',
      renotify: true,
      data: { targetPath: safeTargetPath(payload?.targetPath) },
    });
    if (test || slaSound) return;
    if (unreadCount && typeof self.navigator.setAppBadge === 'function') {
      await self.navigator.setAppBadge(unreadCount).catch(() => undefined);
    } else if (!unreadCount && typeof self.navigator.clearAppBadge === 'function') {
      await self.navigator.clearAppBadge().catch(() => undefined);
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetPath = safeTargetPath(event.notification.data?.targetPath);
  const targetUrl = new URL(targetPath, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      const target = await client.navigate(targetUrl).catch(() => null);
      return (target || client).focus();
    }
    return self.clients.openWindow(targetUrl);
  })());
});
