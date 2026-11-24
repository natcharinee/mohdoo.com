// ประวัติการทำงานของทีมงาน: การกระทำสำคัญถูกบันทึก · ดูได้เฉพาะผู้ดูแล · กรองตามประเภท/บัญชีได้
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5192;
const BASE = `http://127.0.0.1:${PORT}/api/v1/`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mohdoo-audit-'));
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

test('บันทึกการกระทำสำคัญ และดูได้เฉพาะผู้ดูแล', async () => {
  const admin = client(), cust = client(), staff = client();
  const a = await admin.login('+66812345678', 'แอดมิน');
  const c = await cust.login('+66870000001', 'ลูกค้าเอ');
  const s = await staff.login('+66870000002', 'พนักงานบี');

  await admin(`admin/users/${s.user.id}`, { role: 'staff' });       // เปลี่ยนสิทธิ์
  await admin(`admin/users/${c.user.id}`, { ai_days: 30 });          // แถมสมาชิก AI
  await admin(`admin/users/${c.user.id}`, { blocked: true });        // ระงับ
  await admin(`admin/users/${c.user.id}`, { blocked: false });       // ยกเลิกระงับ
  await admin('admin/stock', { id: 'coin', qty: 5 });                // แก้สต๊อก
  await fetch(BASE + 'admin/export/orders', { headers: { cookie: '' } }); // ไม่ได้เข้าสู่ระบบ = ไม่บันทึก
  await cust.login('+66870000001'); // ระงับแล้ว = ถูกออกจากระบบ ต้องเข้าใหม่
  const { order } = await cust('orders', { key: 'shop:amethyst', qty: 1 });
  await cust(`orders/${order.no}/demo-pay`, {});
  await admin(`admin/orders/${order.no}`, { action: 'refund', reason: 'ลูกค้าขอ' }); // คืนเงิน

  // ทีมงาน (ไม่ใช่ผู้ดูแล) ดูประวัติไม่ได้
  await staff.login('+66870000002');
  assert.equal((await staff('admin/audit')).status, 403);

  const r = await admin('admin/audit?limit=200');
  const acts = r.items.map((x) => x.action);
  for (const k of ['login', 'role', 'ai_days', 'block', 'unblock', 'stock', 'refund']) assert.ok(acts.includes(k), `ต้องมี ${k} · มี ${acts}`);
  const role = r.items.find((x) => x.action === 'role');
  assert.deepEqual(role.detail, { from: 'customer', to: 'staff' });
  assert.equal(role.who, 'แอดมิน');
  assert.equal(role.by, a.user.id);
  const refund = r.items.find((x) => x.action === 'refund');
  assert.equal(refund.target.id, order.no);
  assert.equal(refund.detail.amount, order.amount);
  assert.ok(r.actions.refund);

  // กรองตามประเภท และตามบัญชีลูกค้า
  const onlyRefund = await admin('admin/audit?action=refund');
  assert.ok(onlyRefund.items.length >= 1 && onlyRefund.items.every((x) => x.action === 'refund'));
  const forCust = await admin(`admin/audit?user=${c.user.id}`);
  assert.deepEqual(new Set(forCust.items.map((x) => x.action)), new Set(['ai_days', 'block', 'unblock']));
});
