// รายงานยอดขายตามช่วงวันที่ · กรองคำสั่งซื้อ/ส่งออก CSV ตามวันที่
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5188;
const BASE = `http://127.0.0.1:${PORT}/api/v1/`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mohdoo-report-'));
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
  call.cookie = () => cookie;
  return call;
}

const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

test('รายงานยอดขาย: ยอดรับชำระ คืนเงิน สุทธิ แยกประเภท ขายดี และช่วงวันที่', async () => {
  const admin = client(), cust = client(), cust2 = client();
  await admin.login('+66812345678', 'แอดมิน');
  await cust.login('+66880000021', 'ลูกค้าเอ');
  await cust2.login('+66880000022', 'ลูกค้าบี');
  const buy = async (c, body) => { const { order } = await c('orders', body); await c(`orders/${order.no}/demo-pay`, {}); return order; };
  const a = await buy(cust, { key: 'love-free' });            // 40
  const b = await buy(cust, { key: 'shop:amethyst', qty: 2 }); // 780
  await buy(cust2, { key: 'shop:amethyst', qty: 1 });          // 390
  await cust2('orders', { key: 'daily-free' });                // ยังไม่จ่าย → ไม่นับ
  await admin(`admin/orders/${b.no}`, { action: 'refund', reason: 'ทดสอบ' }); // คืน 780

  // ลูกค้าดูไม่ได้
  assert.equal((await cust('admin/report')).status, 403);

  const r = await admin(`admin/report?from=${today}&to=${today}`);
  assert.equal(r.from, today);
  assert.equal(r.summary.orders, 3);
  assert.equal(r.summary.gross, 40 + 780 + 390);
  assert.equal(r.summary.refunds, 780);
  assert.equal(r.summary.net, 430);
  assert.equal(r.summary.refunded_orders, 1);
  assert.equal(r.summary.customers, 2);
  assert.equal(r.days.length, 1);
  assert.equal(r.days[0].net, 430);
  const shop = r.by_kind.find((k) => k.kind === 'shop');
  assert.equal(shop.orders, 2); assert.equal(shop.net, 390);
  const top = r.top_items.find((x) => x.key === 'shop:amethyst');
  assert.equal(top.qty, 3); assert.equal(top.net, 390);
  assert.equal(r.top_items.find((x) => x.key === 'love-free').net, a.amount);

  // ค่าเริ่มต้น 30 วัน · ช่วงในอนาคตไม่มียอด · เกิน 366 วันไม่ได้
  assert.equal((await admin('admin/report')).days.length, 30);
  assert.equal((await admin(`admin/report?from=${addDays(today, 1)}&to=${addDays(today, 3)}`)).summary.orders, 0);
  assert.equal((await admin(`admin/report?from=${addDays(today, -400)}&to=${today}`)).error, 'range_too_long');

  // กรองรายการคำสั่งซื้อตามวันที่สั่ง
  assert.equal((await admin(`admin/orders?status=&from=${today}&to=${today}`)).total, 4);
  assert.equal((await admin(`admin/orders?from=${addDays(today, -10)}&to=${addDays(today, -1)}`)).total, 0);

  // ส่งออก CSV ตามช่วง (ชื่อไฟล์บอกช่วงวันที่)
  const csv = await fetch(BASE + `admin/export/orders?from=${today}&to=${today}`, { headers: { cookie: admin.cookie() } });
  assert.match(csv.headers.get('content-disposition'), new RegExp(`mohdoo-orders-${today}_${today}\\.csv`));
  assert.equal((await csv.text()).trim().split('\r\n').length, 1 + 4);
  const bad = await fetch(BASE + 'admin/export/orders?from=x"%0d%0aevil&to=' + today, { headers: { cookie: admin.cookie() } });
  assert.equal(bad.status, 200); // วันที่ผิดรูปแบบ → ใช้ค่าเริ่มต้น ไม่ทำให้ header เสีย
  assert.ok(!/evil/.test(bad.headers.get('content-disposition')));
});
