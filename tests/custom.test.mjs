// สร้างบริการ/สินค้าใหม่จากหลังบ้าน → หน้าเว็บ (site-config.js) · สั่งซื้อได้ · เข้าคิวหมอดู/ทีมงาน · กติกาการลบ
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5187;
const BASE = `http://127.0.0.1:${PORT}/api/v1/`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mohdoo-custom-'));
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

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const siteCfg = async () => JSON.parse((await (await fetch(BASE + 'site-config.js')).text()).replace(/^window\.SITE_CFG=/, '').replace(/;$/, ''));

test('บริการใหม่ (หมอดูตอบ): สร้าง → ลูกค้าสั่ง → เข้าคิวหมอดู → ตอบ → ลูกค้าเห็นคำตอบ', async () => {
  const admin = client(), cust = client(), seer = client();
  await admin.login('+66812345678', 'แอดมิน');
  await cust.login('+66880000031', 'ลูกค้า');
  assert.equal((await cust('admin/custom', { type: 'service', op: 'create', data: { name: 'x' } })).status, 403);

  // ตรวจข้อมูล: ไม่มีชื่อ / ช่องไม่มีป้าย / เลือกจากรายการต้องมีตัวเลือก ≥ 2
  assert.equal((await admin('admin/custom', { type: 'service', op: 'create', data: { name: '' } })).error, 'name_required');
  assert.equal((await admin('admin/custom', { type: 'service', op: 'create', data: { name: 'ก', fields: [{ label: '' }] } })).error, 'field_label_required');
  assert.equal((await admin('admin/custom', { type: 'service', op: 'create', data: { name: 'ก', fields: [{ label: 'เลือก', type: 'select', options: ['a'] }] } })).error, 'select_needs_options');
  assert.equal((await admin('admin/custom', { type: 'service', op: 'create', data: { name: 'ก', state: 'open' } })).error, 'about_required');

  const r = await admin('admin/custom', { type: 'service', op: 'create', data: {
    icon: '🔭', name: 'ดูดวง<b>ปีเกิด</b>', about: 'หมอดูวิเคราะห์ดวงตามปีเกิด', get: 'คำทำนายเป็นข้อความ', duration: '24 ชม.', science: 'thai-astro', state: 'open', price: 120,
    fields: [{ label: 'ปีเกิด', type: 'text', required: true }, { label: 'เรื่องที่อยากรู้', type: 'select', options: ['การงาน', 'ความรัก'] }, { label: 'รายละเอียด', type: 'textarea' }],
  } });
  assert.equal(r.ok, true, JSON.stringify(r));
  const id = r.id;
  assert.match(id, /^x-[a-z0-9]{6}$/);

  // หน้าเว็บเห็น: ชื่อไม่มี HTML · ราคา 120 · ช่องฟอร์ม f1–f3
  const cfg = await siteCfg();
  const s = cfg.custom_services.find((x) => x.id === id);
  assert.equal(s.name, 'ดูดวงbปีเกิด/b');
  assert.equal(s.price, 120);
  assert.equal(s.science, 'thai-astro');
  assert.deepEqual(s.fields.map((f) => f.name), ['f1', 'f2', 'f3']);
  assert.equal(s.state, 'open');

  // สั่งซื้อ → ราคาที่เก็บเงิน = 120 · ประเภทหมอดูตอบ
  const { order } = await cust('orders', { key: id });
  assert.equal(order.amount, 120);
  assert.equal(order.kind, 'reading');
  await cust(`orders/${order.no}/demo-pay`, {});
  const intake = await cust(`orders/${order.no}/intake`, { form: { f1: '2535', f2: 'ความรัก', f3: 'ขอดูปีหน้า' }, fields: [['f1', 'ปีเกิด'], ['f2', 'เรื่องที่อยากรู้'], ['f3', 'รายละเอียด']] });
  assert.equal(intake.order.status, 'submitted');

  // เข้าคิวหมอดู: หมอดูเห็นงานและตอบได้ → ลูกค้าเห็นคำตอบ
  await admin('admin/seers', { name: 'หมอดูทดสอบ', phone: '+66880000032' });
  await seer.login('+66880000032', 'หมอดูทดสอบ');
  const jobs = await seer('seer/jobs');
  assert.ok(JSON.stringify(jobs).includes(order.no), 'งานต้องขึ้นในคิวหมอดู');
  const ans = await seer(`seer/jobs/${order.no}`, { action: 'answer', answer: 'ปีหน้าดวงการงานดี ควรระวังเรื่องเงิน', summary: 'การงานดี' });
  assert.equal(ans.status, 200, JSON.stringify(ans));
  const mine = await cust(`orders/${order.no}`);
  assert.match(mine.order.answer, /ปีหน้า/);

  // ปิด (เร็ว ๆ นี้) → สั่งไม่ได้ · ราคาว่าง → ใช้ราคากลาง · ลบไม่ได้เพราะเคยมีคนสั่ง
  await admin('admin/custom', { type: 'service', op: 'update', id, data: { ...s, state: 'soon', price: null } });
  assert.equal((await cust('orders', { key: id })).error, 'service_closed');
  await admin('admin/custom', { type: 'service', op: 'update', id, data: { ...s, state: 'open', price: null } });
  assert.equal((await cust('orders', { key: id })).order.amount, 40);
  assert.equal((await admin('admin/custom', { type: 'service', op: 'delete', id })).error, 'has_orders');
  await admin('admin/custom', { type: 'service', op: 'update', id, data: { ...s, state: 'hidden' } });
  assert.equal((await cust('orders', { key: id })).error, 'service_closed');
});

test('บริการมงคลใหม่ · ลบได้เมื่อยังไม่มีคนสั่ง · จำกัดจำนวน', async () => {
  const admin = client(), cust = client();
  await admin.login('+66812345678', 'แอดมิน');
  await cust.login('+66880000033', 'ลูกค้า');
  const r = await admin('admin/custom', { type: 'service', op: 'create', data: { name: 'ถวายสังฆทานออนไลน์', about: 'ทีมถวายแทนที่วัด', kind: 'merit', state: 'open', price: 80, fields: [{ label: 'ชื่อผู้รับบุญ', required: true }] } });
  const id = r.id;
  const need = await cust('orders', { key: id });
  assert.equal(need.error, 'bad_donation'); // ต้องเลือกเงินทำบุญ
  const { order } = await cust('orders', { key: id, donation: 200 });
  assert.equal(order.kind, 'merit');
  assert.equal(order.amount, 280);
  assert.ok(order.steps && order.steps.length >= 3);

  // ยังไม่มีคนสั่ง → ลบได้
  const r2 = await admin('admin/custom', { type: 'service', op: 'create', data: { name: 'ลองลบ', state: 'soon' } });
  assert.equal((await admin('admin/custom', { type: 'service', op: 'delete', id: r2.id })).ok, true);
  assert.ok(!(await siteCfg()).custom_services.some((x) => x.id === r2.id));
  assert.equal((await admin('admin/custom', { type: 'service', op: 'delete', id: r2.id })).error, 'not_found');

  // จำกัดจำนวน: บริการที่สร้างเองสูงสุด 30 รายการ
  const have = (await admin('admin/pricing')).custom.services.length;
  for (let i = have; i < 30; i++) assert.equal((await admin('admin/custom', { type: 'service', op: 'create', data: { name: `ทดสอบ${i}`, state: 'soon' } })).ok, true);
  assert.equal((await admin('admin/custom', { type: 'service', op: 'create', data: { name: 'เกิน', state: 'soon' } })).error, 'too_many');

  // ประเภทเปลี่ยนภายหลังไม่ได้
  await admin('admin/custom', { type: 'service', op: 'update', id, data: { name: 'ถวายสังฆทานออนไลน์', about: 'x', kind: 'reading', state: 'open' } });
  assert.equal((await siteCfg()).custom_services.find((x) => x.id === id).kind, 'merit');
});

test('สินค้าใหม่: รูป · ราคา · สต๊อก · สั่งซื้อ · ซ่อน · ลบ', async () => {
  const admin = client(), cust = client();
  await admin.login('+66812345678', 'แอดมิน');
  await cust.login('+66880000034', 'ลูกค้า');
  assert.equal((await admin('admin/custom', { type: 'item', op: 'create', data: { name: 'ผ้ายันต์', price: 0 } })).error, 'bad_price');
  const r = await admin('admin/custom', { type: 'item', op: 'create', data: { icon: '🧿', name: 'ตาปีศาจกันเคราะห์', desc: 'พกติดตัว', price: 259, image: PNG } });
  assert.equal(r.ok, true, JSON.stringify(r));
  const id = r.id;
  const cfg = await siteCfg();
  const it = cfg.custom_shop.find((x) => x.id === id);
  assert.match(it.img, /shopimg-/);
  assert.equal((await fetch(`http://127.0.0.1:${PORT}${it.img}`)).status, 200); // รูปเปิดได้โดยไม่ต้องเข้าสู่ระบบ

  // สต๊อก (ระบบเดิมใช้ได้) + สั่งซื้อ
  assert.equal((await admin('admin/stock', { id, qty: 2 })).qty, 2);
  const o = (await cust('orders', { key: `shop:${id}`, qty: 2 })).order;
  assert.equal(o.amount, 518);
  assert.equal((await cust('orders', { key: `shop:${id}`, qty: 1 })).error, 'out_of_stock');

  // ซ่อน → สั่งไม่ได้ · ลบไม่ได้เพราะมีคำสั่งซื้อ
  await admin('admin/custom', { type: 'item', op: 'update', id, data: { ...it, hidden: true } });
  assert.equal((await cust('orders', { key: `shop:${id}`, qty: 1 })).error, 'unknown_item');
  assert.equal((await admin('admin/custom', { type: 'item', op: 'delete', id })).error, 'has_orders');

  // สินค้าที่ยังไม่มีคนสั่ง → ลบได้ รูปถูกลบด้วย สต๊อกถูกลบ
  const r2 = await admin('admin/custom', { type: 'item', op: 'create', data: { name: 'ลองลบ', price: 50, image: PNG, digital: true } });
  const img2 = (await siteCfg()).custom_shop.find((x) => x.id === r2.id).img;
  assert.equal((await fetch(`http://127.0.0.1:${PORT}${img2}`)).status, 200);
  assert.equal((await admin('admin/custom', { type: 'item', op: 'delete', id: r2.id })).ok, true);
  assert.equal((await fetch(`http://127.0.0.1:${PORT}${img2}`)).status, 404);

  // หลังบ้านเห็นรายการ + ประวัติการทำงาน
  const p = await admin('admin/pricing');
  assert.ok(p.custom.items.some((x) => x.id === id) && p.custom.sciences.length > 5);
  assert.ok(!p.shop.some((x) => x.id === id), 'สินค้าเดิมกับสินค้าใหม่แยกกัน');
  const log = await admin('admin/audit?action=custom');
  assert.ok(log.items.length >= 6);
});
