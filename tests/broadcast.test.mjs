// ประกาศส่งเป็นรอบ: ทำต่อได้ ไม่ส่งซ้ำแม้เรียกพร้อมกัน · กระดิ่งหลังบ้านได้แจ้งเตือนทีม
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5190;
const BASE = `http://127.0.0.1:${PORT}/api/v1/`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mohdoo-bc-'));
let srv;
before(async () => {
  srv = spawn(process.execPath, ['dev-server.mjs'], {
    env: { ...process.env, PORT: String(PORT), MOHDOO_DATA_DIR: dataDir, ADMIN_PHONES: '+66812345678', ANTHROPIC_API_KEY: '', PAY_DEMO: '1', OTP_DEMO: '1', MOHDOO_BC_CHUNK: '5', MOHDOO_BC_BUDGET_MS: '0', MOHDOO_DB_LAG_MS: '5' },
    stdio: process.env.TEST_LOG ? 'inherit' : 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE + 'health')).ok) return; } catch (_) {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('dev-server ไม่ขึ้น');
});
after(() => { srv?.kill(); });

function client() {
  let cookie = '';
  const call = async (p, body, method) => {
    const r = await fetch(BASE + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.getSetCookie?.() || [];
    if (sc.length) cookie = sc.map((c) => c.split(';')[0]).join('; ');
    return { status: r.status, ...(await r.json().catch(() => ({}))) };
  };
  call.login = async (phone, name) => {
    await call('auth/otp', { phone });
    const r = await call('auth/verify', { phone, code: '123456' });
    assert.equal(r.status, 200, JSON.stringify(r));
    if (name) await call('me', { profile: { name, first: name, birthdate: '1990-01-01' } }, 'PUT');
    return r;
  };
  return call;
}

test('ประกาศถึงลูกค้า 13 คน ส่งรอบละ 5 → ทำต่อจนครบ ทุกคนได้ 1 ครั้งพอดี', async () => {
  const admin = client();
  await admin.login('+66812345678', 'แอดมิน');
  const users = [...Array(13)].map(() => client());
  for (let i = 0; i < users.length; i++) await users[i].login(`+668900000${String(i).padStart(2, '0')}`, `ลูกค้า${i}`);

  const r = await admin('admin/broadcast', { title: 'โปรใหม่', body: 'ลด 20%', target: 'all' });
  assert.equal(r.job.status, 'running');
  assert.equal(r.job.total, 14); // ลูกค้า 13 + แอดมิน (มีโปรไฟล์)
  assert.equal(r.job.delivered, 5);
  assert.equal(r.job.ids, undefined); // ไม่ส่งรายชื่อผู้รับกลับไปหน้าเว็บ

  // หน้าหลังบ้านเปิด 2 แท็บ กดส่งต่อพร้อมกันหลายครั้ง → ต้องไม่มีใครได้ซ้ำ
  let job = r.job;
  while (job.status === 'running') {
    const rs = await Promise.all([...Array(3)].map(() => admin(`admin/broadcast/${job.id}/continue`, {})));
    job = rs.map((x) => x.job).sort((a, b) => b.delivered - a.delivered)[0];
  }
  const list = await admin('admin/broadcasts');
  const done = list.items.find((x) => x.id === job.id);
  assert.equal(done.status, 'done');
  assert.equal(done.delivered, 14);
  assert.equal(done.failed, 0);
  for (const u of users) {
    const n = await u('me/notifications');
    assert.equal(n.items.filter((x) => x.title === 'โปรใหม่').length, 1);
  }
});

test('งานประจำวันส่งประกาศที่ค้างต่อจนครบ', async () => {
  const admin = client();
  await admin.login('+66812345678', 'แอดมิน');
  const r = await admin('admin/broadcast', { title: 'ค้างไว้', body: 'ทดสอบ', target: 'all' });
  assert.equal(r.job.status, 'running');
  // ทดสอบตั้งเวลาต่อรอบไว้ 0 → งานประจำวันแต่ละครั้งส่งได้ 1 รอบ ต้องคืบหน้าทุกครั้งจนครบ
  let prev = r.job.delivered;
  for (let i = 0; i < 5; i++) {
    await admin('admin/cron/daily', {});
    const j = (await admin('admin/broadcasts')).items.find((x) => x.id === r.job.id);
    if (j.status === 'done') break;
    assert.ok(j.delivered > prev, 'ต้องส่งเพิ่มทุกครั้ง');
    prev = j.delivered;
  }
  const done = (await admin('admin/broadcasts')).items.find((x) => x.id === r.job.id);
  assert.equal(done.status, 'done');
  assert.equal(done.delivered, done.total);
});

test('กระดิ่งหลังบ้าน: ทีมได้แจ้งเตือนคำสั่งซื้อใหม่ · เปิดอ่านแล้วตัวเลขหาย', async () => {
  const admin = client(), cust = client();
  await admin.login('+66812345678', 'แอดมิน');
  await admin('me/notifications/read', {});
  await cust.login('+66891111111', 'ผู้ซื้อ');
  const { order } = await cust('orders', { key: 'shop:coin', qty: 1 });
  await cust(`orders/${order.no}/demo-pay`, {});
  const n = await admin('me/notifications');
  assert.ok(n.unread >= 1);
  assert.equal(n.items[0].link, `/admin.html#order/${order.no}`);
  await admin('me/notifications/read', {});
  assert.equal((await admin('me/notifications')).unread, 0);
});
