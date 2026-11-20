// ===== แจ้งเตือน: กล่องแจ้งเตือนในเว็บ + Web Push (ตั้ง VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) =====
import crypto from 'node:crypto';
import { config } from './config.js';
import { db, newId } from './db.js';

let webpush;
async function wp() {
  if (!config.vapid) return null;
  if (!webpush) {
    webpush = (await import('web-push')).default;
    webpush.setVapidDetails(config.vapid.subject, config.vapid.pub, config.vapid.priv);
  }
  return webpush;
}

export async function notify(userId, { title, body, link = '', order_no = '' }) {
  const store = await db();
  await store.put('notif', { id: newId('n'), user_id: userId, title, body, link, order_no, read: false, created_at: Date.now() });
  await pushTo(userId, { title, body, link });
}

export async function pushTo(userId, payload) {
  const w = await wp();
  if (!w) return 0;
  const store = await db();
  const { rows } = await store.list('push', { user_id: userId, limit: 10 });
  let sent = 0;
  await Promise.all(rows.map(async (s) => {
    try { await w.sendNotification(s.sub, JSON.stringify(payload), { TTL: 86400 }); sent += 1; } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await store.del('push', s.id); // ยกเลิกการแจ้งเตือนแล้ว
    }
  }));
  return sent;
}

export async function savePush(userId, sub) {
  if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || !sub.keys) return false;
  const store = await db();
  const id = crypto.createHash('sha256').update(sub.endpoint).digest('hex').slice(0, 32);
  await store.put('push', { id, user_id: userId, sub: { endpoint: sub.endpoint, keys: { p256dh: String(sub.keys.p256dh || ''), auth: String(sub.keys.auth || '') } }, created_at: Date.now() });
  return true;
}
