// แก้พร้อมกันหลายคน: ไม่เขียนทับกัน · สต๊อกไม่ขายเกิน · กดคืนเงินซ้ำไม่คืนสองครั้ง
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const PORT = 5195;
const BASE = `http://127.0.0.1:${PORT}/api/v1/`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mohdoo-race-'));
let srv;

before(async () => {
  srv = spawn(process.execPath, ['dev-server.mjs'], {
    env: { ...process.env, PORT: String(PORT), MOHDOO_DATA_DIR: dataDir, ADMIN_PHONES: '+66812345678', ANTHROPIC_API_KEY: '', PAY_DEMO: '1', OTP_DEMO: '1', MOHDOO_DB_LAG_MS: '15' },
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

test('บันทึกในคำสั่งซื้อพร้อมกัน 12 ครั้ง → ที่สำเร็จต้องอยู่ครบ ไม่หายเพราะเขียนทับ', async () => {
  await loginAdmin();
  const cust = client();
  await cust.login('+66840000001', 'ลูกค้า');
  const { order } = await cust('orders', { key: 'shop:amethyst', qty: 1 });
  await cust(`orders/${order.no}/demo-pay`, {});
  const rs = await Promise.all([...Array(12)].map((_, i) => admin(`admin/orders/${order.no}`, { action: 'note', text: `n${i}` })));
  const ok = rs.filter((r) => r.status === 200).length;
  assert.ok(rs.every((r) => r.status === 200 || r.error === 'conflict'), JSON.stringify(rs.map((r) => r.error)));
  assert.ok(ok >= 1);
  const { order: o } = await admin(`admin/orders/${order.no}`);
  assert.equal(o.notes.length, ok, 'จำนวนบันทึกต้องเท่ากับคำขอที่สำเร็จ');
});

test('สต๊อกเหลือ 3 ชิ้น ลูกค้า 8 คนกดซื้อพร้อมกัน → ขายได้ 3 ชิ้นพอดี', async () => {
  await loginAdmin();
  assert.equal((await admin('admin/stock', { id: 'coin', qty: 3 })).qty, 3);
  const buyers = [...Array(8)].map(() => client());
  await Promise.all(buyers.map((b, i) => b.login(`+6685000000${i}`, `ผู้ซื้อ${i}`)));
  const rs = await Promise.all(buyers.map((b) => b('orders', { key: 'shop:coin', qty: 1 })));
  const ok = rs.filter((r) => r.order).length;
  assert.equal(ok, 3, JSON.stringify(rs.map((r) => r.error || 'ok')));
  assert.ok(rs.filter((r) => !r.order).every((r) => r.error === 'out_of_stock'));
  assert.equal((await fetch(BASE + 'shop/stock').then((r) => r.json())).stock.coin, 0);

  // ยกเลิก 1 รายการ → คืน 1 ชิ้น (ครั้งเดียว แม้กดยกเลิกซ้ำพร้อมกัน)
  const i = rs.findIndex((r) => r.order);
  const no = rs[i].order.no;
  await Promise.all([buyers[i](`orders/${no}/cancel`, {}), buyers[i](`orders/${no}/cancel`, {})]);
  assert.equal((await fetch(BASE + 'shop/stock').then((r) => r.json())).stock.coin, 1);
});

test('กดคืนเงินซ้ำพร้อมกัน → คืนได้ครั้งเดียว', async () => {
  await loginAdmin();
  const cust = client();
  await cust.login('+66860000001', 'ลูกค้าคืนเงิน');
  const { order } = await cust('orders', { key: 'shop:amethyst', qty: 1 });
  await cust(`orders/${order.no}/demo-pay`, {});
  const rs = await Promise.all([...Array(4)].map(() => admin(`admin/orders/${order.no}`, { action: 'refund', reason: 'ทดสอบ' })));
  assert.equal(rs.filter((r) => r.status === 200).length, 1, JSON.stringify(rs.map((r) => r.error || 'ok')));
  const { order: o } = await admin(`admin/orders/${order.no}`);
  assert.equal(o.status, 'refunded');
  assert.equal(o.refund.pending, false);
  assert.equal(o.log.filter((l) => l.act === 'refund' || l.action === 'refund').length, 1);
});
