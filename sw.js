// ===== Service worker: แจ้งเตือน Push ของหมอดู.com (หมอดูตอบแล้ว · ดวงประจำวัน · สถานะงาน) =====
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: 'หมอดู.com', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'หมอดู.com', {
    body: d.body || '', icon: 'assets/seer.webp', badge: 'assets/seer.webp', lang: 'th', tag: d.tag || undefined,
    data: { link: d.link || '/' },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL('/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => c.url.startsWith(url));
    return open ? open.focus() : self.clients.openWindow(url);
  }));
});
