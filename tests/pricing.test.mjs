// ราคาและบริการ: ผู้ดูแลแก้ในหลังบ้าน → หน้าเว็บ (site-config.js) และราคาที่เก็บเงินจริงเปลี่ยนตาม
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5189;
const BASE = `http://127.0.0.1:${PORT}/api/v1/`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mohdoo-price-'));
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

const siteCfg = async () => {
  const t = await (await fetch(BASE + 'site-config.js')).text();
  assert.match(t, /^window\.SITE_CFG=/);
  return JSON.parse(t.replace(/^window\.SITE_CFG=/, '').replace(/;$/, ''));
};

test('ราคาหลัก ราคาเฉพาะบริการ สถานะบริการ และสินค้า มีผลทั้งหน้าเว็บและราคาที่เก็บเงิน', async () => {
  const admin = client(), cust = client();
  await admin.login('+66812345678', 'แอดมิน');
  await cust.login('+66880000011', 'ลูกค้า');
  const order = async (body) => cust('orders', body);

  // ค่าเริ่มต้น
  let cfg = await siteCfg();
  assert.equal(cfg.service_price, 40);
  assert.equal(cfg.ai_price, 150);
  assert.equal((await order({ key: 'love-free' })).order.amount, 40);

  // ลูกค้าแก้ไม่ได้
  assert.equal((await cust('admin/pricing')).status, 403);
  assert.equal((await cust('admin/pricing', { service_price: 1 })).status, 403);

  // ราคากลาง 55 → บริการทั่วไป + ศาสตร์ในหมวด ใช้ 55 · สมาชิก AI 199
  assert.equal((await admin('admin/pricing', { service_price: 0 })).error, 'bad_price');
  assert.equal((await admin('admin/pricing', { service_price: 55, ai_price: 199 })).ok, true);
  cfg = await siteCfg();
  assert.equal(cfg.service_price, 55);
  assert.equal(cfg.services['love-free'].prices[0], 55);
  assert.equal((await order({ key: 'love-free' })).order.amount, 55);
  assert.equal((await order({ key: 'cards:0' })).order.amount, 55);
  assert.equal((await order({ key: 'ai-month' })).order.amount, 199);

  // ราคาเฉพาะบริการ → คืนค่าเดิม = กลับไปใช้ราคากลาง
  await admin('admin/pricing', { service: { id: 'daily-free', price: 99 } });
  assert.equal((await order({ key: 'daily-free' })).order.amount, 99);
  assert.equal((await order({ key: 'love-free' })).order.amount, 55);
  await admin('admin/pricing', { service: { id: 'daily-free', reset: true } });
  assert.equal((await order({ key: 'daily-free' })).order.amount, 55);

  // ปิด (เร็ว ๆ นี้) / ซ่อน → สั่งไม่ได้ · เปิดกลับได้
  await admin('admin/pricing', { service: { id: 'siamsi', state: 'soon' } });
  assert.equal((await order({ key: 'siamsi' })).error, 'service_closed');
  await admin('admin/pricing', { service: { id: 'siamsi', state: 'hidden' } });
  cfg = await siteCfg();
  assert.equal(cfg.services.siamsi.hidden, true);
  assert.equal((await order({ key: 'siamsi' })).error, 'service_closed');
  await admin('admin/pricing', { service: { id: 'siamsi', state: 'open' } });
  assert.equal((await order({ key: 'siamsi' })).order.amount, 55);

  // บริการที่ไฟล์ยังไม่เปิด (ยังไม่มีขั้นตอนรองรับ) เปิดจองไม่ได้
  const p = await admin('admin/pricing');
  const closed = p.services.find((x) => !x.can_open);
  if (closed) assert.equal((await admin('admin/pricing', { service: { id: closed.id, state: 'open' } })).error, 'cannot_open');

  // สินค้า: เปลี่ยนชื่อ/ราคา · ซ่อน = ซื้อไม่ได้ · คืนค่าเดิม
  await admin('admin/pricing', { item: { id: 'amethyst', name: 'กำไลอเมทิสต์ รุ่นพิเศษ', price: 450 } });
  cfg = await siteCfg();
  assert.equal(cfg.shop.amethyst.name, 'กำไลอเมทิสต์ รุ่นพิเศษ');
  const o = (await order({ key: 'shop:amethyst', qty: 2 })).order;
  assert.equal(o.amount, 900);
  assert.equal(o.title, 'กำไลอเมทิสต์ รุ่นพิเศษ');
  await admin('admin/pricing', { item: { id: 'coin', hidden: true } });
  assert.equal((await order({ key: 'shop:coin' })).error, 'unknown_item');
  await admin('admin/pricing', { item: { id: 'coin', reset: true } });
  assert.ok((await order({ key: 'shop:coin' })).order);

  // หลังบ้านเห็นค่าปัจจุบัน + ค่าเดิม · ทุกการแก้อยู่ในประวัติการทำงาน
  const after = await admin('admin/pricing');
  assert.equal(after.service_price, 55);
  assert.equal(after.base.service_price, 40);
  assert.equal(after.shop.find((x) => x.id === 'amethyst').price, 450);
  assert.ok(after.shop.find((x) => x.id === 'amethyst').edited);
  const log = await admin('admin/audit?action=pricing');
  assert.ok(log.items.length >= 8);
  assert.ok(log.items.some((x) => x.detail.changes.some((c) => c.what === 'ราคากลางบริการ' && c.from === 40 && c.to === 55)));
});
