/* Web Push only. This worker deliberately does not cache pages or API responses. */
function safeTargetPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  try {
    const parsed = new URL(value, self.location.origin);
    return parsed.origin === self.location.origin ? `${parsed.pathname}${parsed.search}${parsed.hash}` : '/dashboard';
  } catch {
    return '/dashboard';
  }
}

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let payload = {};
    try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
    const unreadCount = Number.isSafeInteger(payload.unreadCount) && payload.unreadCount > 0
      ? payload.unreadCount
      : 0;
    if (unreadCount && typeof self.navigator.setAppBadge === 'function') {
      await self.navigator.setAppBadge(unreadCount).catch(() => undefined);
    } else if (!unreadCount && typeof self.navigator.clearAppBadge === 'function') {
      await self.navigator.clearAppBadge().catch(() => undefined);
    }
    await self.registration.showNotification('RICTMS Compliance Hub', {
      body: 'You have a new notification.',
      icon: '/icons/app-192.png',
      badge: '/icons/app-192.png',
      tag: 'rictms-new-notification',
      renotify: true,
      data: { targetPath: safeTargetPath(payload.targetPath) },
    });
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
