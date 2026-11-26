// รายงานยอดขายตามช่วงวันที่ · กรองคำสั่งซื้อ/ส่งออก CSV ตามวันที่
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5186;
const BASE = `http://127.0.0.1:${PORT}/api/v1/`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mohdoo-coupon-'));
let srv;
before(async () => {
  srv = spawn(process.execPath, ['dev-server.mjs'], {
    env: { ...process.env, PORT: String(PORT), MOHDOO_DATA_DIR: dataDir, MOHDOO_DB_LAG_MS: '8', ADMIN_PHONES: '+66812345678', ANTHROPIC_API_KEY: '', PAY_DEMO: '1', OTP_DEMO: '1' },
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
  call.cookie = () => cookie;
  return call;
}

const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const mk = (admin, code, over = {}) => admin('admin/coupons', { op: 'create', data: { code, type: 'percent', value: 20, scope: 'all', per_user: 1, ...over } });
let seq = 0;
const newCust = async () => { const c = client(); await c.login(`+668800010${String(++seq).padStart(2, '0')}`, `ลูกค้า${seq}`); return c; };

test('โค้ดส่วนลด: ตรวจข้อมูล · สิทธิ์ · เงื่อนไขทุกแบบ', async () => {
  const admin = client(); await admin.login('+66812345678', 'แอดมิน');
  const cust = await newCust();
  assert.equal((await cust('admin/coupons')).status, 403);
  assert.equal((await client()('coupons/check', { key: 'love-free', coupon: 'X' })).status, 401);

  // ตรวจข้อมูลตอนสร้าง
  assert.equal((await mk(admin, 'a')).error, 'bad_code');
  assert.equal((await mk(admin, 'BADPCT', { value: 95 })).error, 'bad_value');
  assert.equal((await mk(admin, 'BADRANGE', { starts: today, ends: addDays(today, -3) })).error, 'bad_range');
  assert.equal((await mk(admin, 'ok1')).ok, true);
  assert.equal((await mk(admin, 'OK1')).error, 'code_exists'); // ตัวพิมพ์เล็กใหญ่ถือเป็นโค้ดเดียวกัน

  // ลด 20% ของบริการ 40 บาท = 8 บาท → จ่าย 32 · พิมพ์เล็กก็ใช้ได้ · ดูตัวอย่างแล้วยังไม่ตัดสิทธิ์
  const q = await cust('coupons/check', { key: 'love-free', coupon: ' ok1 ' });
  assert.equal(q.discount, 8); assert.equal(q.amount, 32); assert.equal(q.original, 40);
  assert.equal((await admin('admin/coupons')).coupons.find((c) => c.id === 'OK1').used, 0);
  const o = (await cust('orders', { key: 'love-free', coupon: 'ok1' })).order;
  assert.equal(o.amount, 32); assert.equal(o.discount, 8); assert.equal(o.original_price, 40); assert.equal(o.coupon, 'OK1');
  assert.equal((await admin('admin/coupons')).coupons.find((c) => c.id === 'OK1').used, 1);

  // ลดเป็นบาท: ยอดค่าบริการหลังลดต้องไม่ต่ำกว่า 20 บาท · ไม่ลดเงินทำบุญ
  await mk(admin, 'BIG50', { type: 'amount', value: 50, per_user: 0 });
  const c2 = await newCust();
  assert.equal((await c2('orders', { key: 'love-free', coupon: 'BIG50' })).order.amount, 20);
  const m = (await c2('orders', { key: 'pray', donation: 100, coupon: 'BIG50' })).order; // บริการมงคล: ค่าบริการ 40 + ทำบุญ 100
  assert.equal(m.discount, 20); assert.equal(m.amount, 20 + 100);

  // ขอบเขต · ยอดขั้นต่ำ · วันที่ · หยุดใช้ · ไม่มีโค้ด
  await mk(admin, 'SHOPONLY', { scope: 'shop', per_user: 0 });
  assert.equal((await cust('coupons/check', { key: 'love-free', coupon: 'SHOPONLY' })).error, 'coupon_scope');
  assert.equal((await cust('coupons/check', { key: 'shop:coin', coupon: 'SHOPONLY' })).discount, 39);
  await mk(admin, 'MIN500', { min_amount: 500, per_user: 0 });
  const mn = await cust('coupons/check', { key: 'shop:coin', coupon: 'MIN500' });
  assert.equal(mn.error, 'coupon_min'); assert.equal(mn.min, 500);
  await mk(admin, 'FUTURE', { starts: addDays(today, 2) });
  assert.equal((await cust('coupons/check', { key: 'love-free', coupon: 'FUTURE' })).error, 'coupon_not_started');
  await mk(admin, 'OLD', { starts: addDays(today, -5), ends: addDays(today, -1) });
  assert.equal((await cust('coupons/check', { key: 'love-free', coupon: 'OLD' })).error, 'coupon_expired');
  await mk(admin, 'ENDTODAY', { ends: today }); // หมดอายุสิ้นวันที่เลือก → วันนี้ยังใช้ได้
  assert.equal((await cust('coupons/check', { key: 'love-free', coupon: 'ENDTODAY' })).discount, 8);
  await admin('admin/coupons', { op: 'update', code: 'ok1', data: { type: 'percent', value: 20, per_user: 1, active: false } });
  assert.equal((await (await newCust())('coupons/check', { key: 'love-free', coupon: 'OK1' })).error, 'coupon_invalid');
  assert.equal((await cust('coupons/check', { key: 'love-free', coupon: 'NOPE' })).error, 'coupon_invalid');
  assert.equal((await cust('orders', { key: 'love-free', coupon: 'NOPE' })).error, 'coupon_invalid'); // โค้ดผิดตอนสั่ง = ไม่สร้างคำสั่งซื้อ

  // ลบ: เคยมีคนใช้ → ลบไม่ได้ · ยังไม่เคยใช้ → ลบได้
  assert.equal((await admin('admin/coupons', { op: 'delete', code: 'OK1' })).error, 'has_orders');
  assert.equal((await admin('admin/coupons', { op: 'delete', code: 'FUTURE' })).ok, true);
  assert.ok(!(await admin('admin/coupons')).coupons.some((c) => c.id === 'FUTURE'));
});

test('โค้ดส่วนลด: ลูกค้าละ 1 ครั้ง (กดพร้อมกัน) · ยกเลิกแล้วได้สิทธิ์คืน', async () => {
  const admin = client(); await admin.login('+66812345678', 'แอดมิน');
  await mk(admin, 'ONCE', { per_user: 1 });
  const cust = await newCust();
  const rs = await Promise.all([...Array(4)].map(() => cust('orders', { key: 'love-free', coupon: 'ONCE' })));
  assert.equal(rs.filter((r) => r.order).length, 1, JSON.stringify(rs.map((r) => r.error || 'ok')));
  assert.ok(rs.filter((r) => !r.order).every((r) => r.error === 'coupon_user_limit'));
  assert.equal((await admin('admin/coupons')).coupons.find((c) => c.id === 'ONCE').used, 1);

  // ยกเลิกคำสั่งซื้อ (ยังไม่จ่าย) → คืนสิทธิ์ → ใช้ใหม่ได้
  const no = rs.find((r) => r.order).order.no;
  await cust(`orders/${no}/cancel`, {});
  assert.equal((await admin('admin/coupons')).coupons.find((c) => c.id === 'ONCE').used, 0);
  assert.ok((await cust('orders', { key: 'love-free', coupon: 'ONCE' })).order);
});

test('โค้ดส่วนลด: จำกัดจำนวนครั้งรวม · ลูกค้า 6 คนกดพร้อมกัน ได้ 2 คนพอดี', async () => {
  const admin = client(); await admin.login('+66812345678', 'แอดมิน');
  await mk(admin, 'FIRST2', { max_uses: 2, per_user: 0 });
  const custs = []; for (let i = 0; i < 6; i++) custs.push(await newCust());
  const rs = await Promise.all(custs.map((c) => c('orders', { key: 'love-free', coupon: 'FIRST2' })));
  assert.equal(rs.filter((r) => r.order).length, 2, JSON.stringify(rs.map((r) => r.error || 'ok')));
  assert.ok(rs.filter((r) => !r.order).every((r) => r.error === 'coupon_used_up'));
  assert.equal((await admin('admin/coupons')).coupons.find((c) => c.id === 'FIRST2').used, 2);
});

test('โค้ดส่วนลด: จ่ายแล้วขึ้นรายงาน · คืนเงินไม่เกินยอดที่จ่ายจริง', async () => {
  const admin = client(); await admin.login('+66812345678', 'แอดมิน');
  await mk(admin, 'REPORT10', { value: 25, per_user: 0 });
  const cust = await newCust();
  const o = (await cust('orders', { key: 'shop:amethyst', qty: 2, coupon: 'REPORT10' })).order; // 780 → ลด 25% = 195 → 585
  assert.equal(o.amount, 585); assert.equal(o.discount, 195);
  await cust(`orders/${o.no}/demo-pay`, {});
  const rep = await admin(`admin/report?from=${today}&to=${today}`);
  assert.equal(rep.summary.discount >= 195, true);
  assert.equal(rep.by_coupon.find((x) => x.code === 'REPORT10').discount, 195);
  const rf = await admin(`admin/orders/${o.no}`, { action: 'refund', amount: 9999, reason: 'ทดสอบ' });
  assert.equal(rf.order.refund.amount, 585); // ไม่เกินยอดที่จ่ายจริง
  const c = (await admin('admin/coupons')).coupons.find((x) => x.id === 'REPORT10');
  assert.equal(c.paid_orders, 0); // คืนเงินแล้วไม่นับเป็นยอดใช้
  assert.equal(c.discount_given, 0);
  const log = await admin('admin/audit?action=coupon');
  assert.ok(log.items.length >= 5);
});
