// หลังบ้าน: แจ้งทีมเมื่อมีคำสั่งซื้อ · CSV กันสูตร Excel · ทีมงานเข้าสู่ระบบใหม่ทุก 7 วัน · ตัวกรองสมาชิก AI · มอบหมายงานได้เฉพาะทีม
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const PORT = 5196;
const BASE = `http://127.0.0.1:${PORT}/api/v1/`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mohdoo-hard-'));
let srv;

before(async () => {
  srv = spawn(process.execPath, ['dev-server.mjs'], {
    env: { ...process.env, PORT: String(PORT), MOHDOO_DATA_DIR: dataDir, ADMIN_PHONES: '+66812345678', ANTHROPIC_API_KEY: '', PAY_DEMO: '1', OTP_DEMO: '1' },
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
    const r = await fetch(BASE + p, {
      method: method || (body ? 'POST' : 'GET'),
      headers: { 'content-type': 'application/json', cookie },
      body: body ? JSON.stringify(body) : undefined,
    });
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
  call.cookie = () => cookie;
  return call;
}


const admin = client();
let adminReady;
const loginAdmin = () => (adminReady ||= admin.login('+66812345678', 'แอดมิน'));

test('ลูกค้าจ่ายเงินสินค้า → ผู้ดูแลได้แจ้งเตือนคำสั่งซื้อใหม่ · CSV ไม่มีสูตร Excel', async () => {
  await loginAdmin();
  const cust = client();
  await cust.login('+66820000001', '=1+1');
  const { order } = await cust('orders', { key: 'shop:coin', qty: 1 });
  assert.ok(order?.no, 'สร้างคำสั่งซื้อได้');
  await cust(`orders/${order.no}/demo-pay`, {});
  const n = await admin('me/notifications');
  const hit = n.items.find((x) => x.link === `/admin.html#order/${order.no}`);
  assert.ok(hit, JSON.stringify(n.items.map((x) => x.title)));
  assert.match(hit.title, /คำสั่งซื้อใหม่/);

  const r = await fetch(BASE + 'admin/export/orders', { headers: { cookie: admin.cookie() } });
  const csv = await r.text();
  assert.ok(csv.includes(`"'=1+1"`), 'ชื่อที่ขึ้นต้นด้วย = ต้องมี \' นำหน้า');
  assert.ok(!csv.includes(`,"=1+1"`));
});

test('ทีมงาน: คุกกี้ 7 วัน · คุกกี้เก่ากว่า 7 วันใช้ไม่ได้ · ลูกค้ายัง 60 วัน', async () => {
  await loginAdmin();
  const r = await fetch(BASE + 'auth/otp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: '+66812345678' }) });
  assert.equal(r.status, 200);
  const v = await fetch(BASE + 'auth/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: '+66812345678', code: '123456' }) });
  assert.match(v.headers.get('set-cookie'), /Max-Age=604800/);
  const c = await fetch(BASE + 'auth/otp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: '+66820000009' }) });
  assert.equal(c.status, 200);
  const cv = await fetch(BASE + 'auth/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: '+66820000009', code: '123456' }) });
  assert.match(cv.headers.get('set-cookie'), /Max-Age=5184000/);

  // ปลอมคุกกี้ผู้ดูแลที่ออกเมื่อ 8 วันก่อน (เซ็นด้วยกุญแจในโฟลเดอร์ข้อมูลทดสอบ) → ต้องถูกปฏิเสธ
  const me = await admin('admin/me');
  const secret = fs.readFileSync(path.join(dataDir, 'secret'), 'utf8').trim();
  const mk = (iat) => {
    const payload = Buffer.from(JSON.stringify({ uid: me.user.id, v: 0, iat, exp: iat + 60 * 864e5 })).toString('base64url');
    return `md_s=${encodeURIComponent(`${payload}.${crypto.createHmac('sha256', secret).update(payload).digest('base64url')}`)}`;
  };
  assert.equal((await fetch(BASE + 'admin/me', { headers: { cookie: mk(Date.now() - 8 * 864e5) } })).status, 401);
  assert.equal((await fetch(BASE + 'admin/me', { headers: { cookie: mk(Date.now() - 864e5) } })).status, 200);
});

test('ตัวกรองสมาชิก AI เห็นครบทุกหน้า · มอบหมายงานได้เฉพาะทีมงาน', async () => {
  await loginAdmin();
  const a = client(), b = client(), c = client();
  const ra = await a.login('+66830000001', 'เอ'); await b.login('+66830000002', 'บี'); await c.login('+66830000003', 'ซี');
  // ให้สมาชิก AI กับคนที่สมัครก่อนสุด (อยู่ท้ายรายการ) แล้วขอหน้าละ 1 คน
  await admin(`admin/users/${ra.user.id}`, { ai_days: 30 });
  const list = await admin('admin/users?ai=1&limit=1');
  assert.equal(list.users.length, 1);
  assert.equal(list.users[0].id, ra.user.id);

  const { order } = await b('orders', { key: 'shop:coin', qty: 1 });
  await b(`orders/${order.no}/demo-pay`, {});
  assert.equal((await admin(`admin/orders/${order.no}`, { action: 'assign', to: ra.user.id })).error, 'not_team');
  const me = await admin('admin/me');
  const ok = await admin(`admin/orders/${order.no}`, { action: 'assign', to: me.user.id });
  assert.equal(ok.order.assignee, me.user.id);
});
