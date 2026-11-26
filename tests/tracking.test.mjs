// เลขพัสดุ: แอดมินใส่ → ลูกค้าเห็นในคำสั่งซื้อ · ตรวจรูปแบบ · ใส่ซ้ำไม่แจ้งซ้ำ · สิทธิ์
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5183;
const BASE = `http://127.0.0.1:${PORT}/api/v1/`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mohdoo-tracking-'));
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
  };
  return call;
}

test('เลขพัสดุ: ใส่ได้เฉพาะสินค้าที่จ่ายแล้ว · ตรวจรูปแบบ · ลูกค้าเห็น · แก้ได้', async () => {
  const admin = client(); await admin.login('+66812345678', 'แอดมิน');
  const cust = client(); await cust.login('+66899990001', 'ลูกค้า');
  const o = (await cust('orders', { key: 'shop:coin' })).order;
  // ยังไม่จ่าย → ใส่เลขพัสดุไม่ได้
  assert.equal((await admin(`admin/orders/${o.no}`, { action: 'tracking', carrier: 'Kerry Express', no: 'KEX12345678' })).error, 'bad_state');
  await cust(`orders/${o.no}/demo-pay`, {});
  // รูปแบบผิด / ว่าง
  assert.equal((await admin(`admin/orders/${o.no}`, { action: 'tracking', carrier: 'Kerry Express', no: '<b>1</b>' })).error, 'bad_tracking');
  assert.equal((await admin(`admin/orders/${o.no}`, { action: 'tracking', carrier: 'Kerry Express', no: 'AB1' })).error, 'bad_tracking');
  assert.equal((await admin(`admin/orders/${o.no}`, { action: 'tracking', carrier: 'Kerry Express', no: '  ' })).error, 'empty');
  // ลูกค้าใส่เองไม่ได้
  assert.equal((await cust(`admin/orders/${o.no}`, { action: 'tracking', carrier: 'ส่งเอง', no: 'ABC12345' })).status, 403);
  // ใส่ถูกต้อง (ช่องว่าง/ตัวพิมพ์เล็กถูกจัดให้) → สถานะ "จัดส่งแล้ว" และลูกค้าเห็น
  const r = await admin(`admin/orders/${o.no}`, { action: 'tracking', carrier: 'Kerry Express', no: ' kex 1234 5678 ' });
  assert.equal(r.order.status, 'shipped');
  const mine = (await cust(`orders/${o.no}`)).order;
  assert.deepEqual(mine.tracking, { carrier: 'Kerry Express', no: 'KEX12345678' });
  assert.equal(mine.status, 'shipped');
  // แก้เลขได้ (พิมพ์ผิด)
  await admin(`admin/orders/${o.no}`, { action: 'tracking', carrier: 'Flash Express', no: 'TH0123456789' });
  assert.deepEqual((await cust(`orders/${o.no}`)).order.tracking, { carrier: 'Flash Express', no: 'TH0123456789' });
  // คนอื่นดูคำสั่งซื้อนี้ไม่ได้
  const other = client(); await other.login('+66899990002', 'คนอื่น');
  assert.notEqual((await other(`orders/${o.no}`)).status, 200);
});
