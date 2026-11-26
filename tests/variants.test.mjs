// สินค้าหลายรูป + ตัวเลือก (สี/ขนาด): ราคา/สต๊อกตามแบบ · กดพร้อมกัน · กติกาแก้/ลบค่าตัวเลือก
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5184;
const BASE = `http://127.0.0.1:${PORT}/api/v1/`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mohdoo-variants-'));
let srv;
before(async () => {
  srv = spawn(process.execPath, ['dev-server.mjs'], {
    env: { ...process.env, PORT: String(PORT), MOHDOO_DATA_DIR: dataDir, MOHDOO_DB_LAG_MS: '6', ADMIN_PHONES: '+66812345678', ANTHROPIC_API_KEY: '', PAY_DEMO: '1', OTP_DEMO: '1' },
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

const png = (n) => `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`; // ทุกรูปเหมือนกัน (ชื่อไฟล์สุ่มไม่ซ้ำ)
const OPTS = [
  { name: 'สี', values: [{ label: 'แดง' }, { label: 'ดำ' }] },
  { name: 'ขนาด', values: [{ label: 'S' }, { label: 'M' }] },
];
const siteCfg = async () => JSON.parse((await (await fetch(BASE + 'site-config.js')).text()).replace(/^window\.SITE_CFG=/, '').replace(/;$/, ''));
const urlOk = async (u) => (await fetch(`http://127.0.0.1:${PORT}${u}`)).status;
let seq = 0;
const newCust = async () => { const c = client(); await c.login(`+668800020${String(++seq).padStart(2, '0')}`, `ลูกค้า${seq}`); return c; };

test('สินค้าหลายรูป + ตัวเลือก: สร้าง · ราคาตามแบบ · ปิดขายแบบ · สต๊อกแยกตามแบบ (กดพร้อมกัน)', async () => {
  const admin = client(); await admin.login('+66812345678', 'แอดมิน');
  const cust = await newCust();

  // รูปเกิน 5 ไม่ได้ · ตัวเลือกต้องมีชื่อ/ค่า
  assert.equal((await admin('admin/custom', { type: 'item', op: 'create', data: { name: 'ก', price: 100, new_images: [...Array(6)].map(png) } })).error, 'too_many_images');
  assert.equal((await admin('admin/custom', { type: 'item', op: 'create', data: { name: 'ก', price: 100, options: [{ name: '', values: [{ label: 'a' }] }] } })).error, 'option_name_required');
  assert.equal((await admin('admin/custom', { type: 'item', op: 'create', data: { name: 'ก', price: 100, options: [{ name: 'สี', values: [{ label: 'a' }, { label: 'A' }] }] } })).error, 'option_value_duplicate');

  const r = await admin('admin/custom', { type: 'item', op: 'create', data: { icon: '👕', name: 'เสื้อมงคล', desc: 'ผ้าฝ้าย', price: 300, new_images: [png(1), png(2)], options: OPTS } });
  assert.equal(r.ok, true, JSON.stringify(r));
  const id = r.id;
  let item = (await admin('admin/pricing')).custom.items.find((x) => x.id === id);
  assert.equal(item.images.length, 2);
  assert.equal(item.img, item.images[0]);
  assert.deepEqual(item.options.map((g) => [g.id, g.values.map((v) => v.id)]), [['o1', ['v1', 'v2']], ['o2', ['v3', 'v4']]]);
  assert.deepEqual(item.variants_list.map((v) => v.key), ['v1.v3', 'v1.v4', 'v2.v3', 'v2.v4']);
  for (const u of item.images) assert.equal(await urlOk(u), 200);

  // ราคาเฉพาะแบบ + ปิดขายบางแบบ + ผูกรูปกับค่าตัวเลือก
  const opts = item.options.map((g, i) => (i === 0 ? { ...g, values: g.values.map((v, j) => ({ ...v, img: j === 0 ? item.images[1] : '' })) } : g));
  await admin('admin/custom', { type: 'item', op: 'update', id, data: { ...item, options: opts, variants: { 'v1.v4': { price: 320 }, 'v2.v3': { off: true } } } });
  const cfg = (await siteCfg()).custom_shop.find((x) => x.id === id);
  assert.equal(cfg.variants['v1.v4'].price, 320);
  assert.equal(cfg.options[0].values[0].img, item.images[1]);

  // สั่งซื้อ: ต้องเลือกแบบ · แบบที่ไม่มี/ปิดขายไม่ได้ · ราคาและป้ายตามแบบ
  assert.equal((await cust('orders', { key: `shop:${id}`, qty: 1 })).error, 'variant_required');
  assert.equal((await cust('orders', { key: `shop:${id}`, variant: 'v9.v9' })).error, 'variant_unknown');
  assert.equal((await cust('orders', { key: `shop:${id}`, variant: 'v2.v3' })).error, 'variant_unavailable');
  const o = (await cust('orders', { key: `shop:${id}`, variant: 'v1.v4', qty: 2 })).order;
  assert.equal(o.amount, 640);
  assert.deepEqual(o.variant, { key: 'v1.v4', label: 'สี: แดง · ขนาด: M' });
  assert.match(o.label, /สี: แดง · ขนาด: M/);
  assert.equal((await cust('orders', { key: `shop:${id}`, variant: 'v1.v3' })).order.amount, 300); // แบบอื่นยังราคาปกติ

  // สต๊อกแยกตามแบบ: ตั้งเฉพาะ แดง/S = 2 → ผู้ซื้อ 5 คนพร้อมกัน ได้ 2 คน · แบบอื่นไม่จำกัด ไม่กระทบ
  assert.equal((await admin('admin/stock', { id, qty: 5 })).error, 'unknown_item'); // สินค้ามีตัวเลือก ต้องระบุแบบ
  assert.equal((await admin('admin/stock', { id: `${id}:v9.v9`, qty: 5 })).error, 'unknown_item');
  assert.equal((await admin('admin/stock', { id: `${id}:v1.v3`, qty: 2 })).qty, 2);
  const buyers = []; for (let i = 0; i < 5; i++) buyers.push(await newCust());
  const rs = await Promise.all(buyers.map((b) => b('orders', { key: `shop:${id}`, variant: 'v1.v3', qty: 1 })));
  assert.equal(rs.filter((x) => x.order).length, 2, JSON.stringify(rs.map((x) => x.error || 'ok')));
  assert.ok(rs.filter((x) => !x.order).every((x) => x.error === 'out_of_stock'));
  assert.equal((await client()('shop/stock')).stock[`${id}:v1.v3`], 0);
  assert.equal((await buyers[0]('orders', { key: `shop:${id}`, variant: 'v1.v4', qty: 3 })).order.amount, 960); // แบบอื่นไม่จำกัด ซื้อได้ตามปกติ
  // ยกเลิกคำสั่งซื้อ → คืนสต๊อกของแบบนั้น (ไม่ใช่แบบอื่น)
  const got = rs.find((x) => x.order);
  const owner = buyers[rs.indexOf(got)];
  await owner(`orders/${got.order.no}/cancel`, {});
  assert.equal((await client()('shop/stock')).stock[`${id}:v1.v3`], 1);
});

test('ตัวเลือก: แก้ชื่อค่าได้ (รหัสคงที่) · ลบค่าที่เคยมีคนสั่งไม่ได้ · ลบค่าที่ไม่เคยใช้ได้ (สต๊อกถูกล้าง) · รูป', async () => {
  const admin = client(); await admin.login('+66812345678', 'แอดมิน');
  const cust = await newCust();
  const id = (await admin('admin/custom', { type: 'item', op: 'create', data: { name: 'กำไลหิน', price: 200, new_images: [png(1), png(2), png(3)], options: [{ name: 'สี', values: [{ label: 'ม่วง' }, { label: 'ขาว' }, { label: 'ชมพู' }] }] } })).id;
  const get = async () => (await admin('admin/pricing')).custom.items.find((x) => x.id === id);
  let it = await get();
  assert.deepEqual(it.options[0].values.map((v) => v.id), ['v1', 'v2', 'v3']);
  await admin('admin/stock', { id: `${id}:v3`, qty: 4 });
  await cust('orders', { key: `shop:${id}`, variant: 'v1' }); // มีคนสั่ง "ม่วง"

  // แก้ชื่อ "ม่วง" → "ม่วงเข้ม" รหัสยังเป็น v1 · ลบ "ชมพู" (ไม่เคยมีคนสั่ง) ได้ และสต๊อกของ "ชมพู" ถูกล้าง
  let vals = it.options[0].values.map((v) => (v.id === 'v1' ? { ...v, label: 'ม่วงเข้ม' } : v)).filter((v) => v.id !== 'v3');
  assert.equal((await admin('admin/custom', { type: 'item', op: 'update', id, data: { ...it, options: [{ ...it.options[0], values: vals }] } })).ok, true);
  it = await get();
  assert.deepEqual(it.options[0].values.map((v) => [v.id, v.label]), [['v1', 'ม่วงเข้ม'], ['v2', 'ขาว']]);
  assert.equal((await client()('shop/stock')).stock[`${id}:v3`], undefined);
  // ค่าใหม่ได้รหัสว่างถัดไป (v3 ที่ลบไปไม่เคยมีคนสั่งและสต๊อกถูกล้างแล้ว จึงใช้ซ้ำได้)
  vals = [...it.options[0].values, { label: 'ฟ้า' }];
  await admin('admin/custom', { type: 'item', op: 'update', id, data: { ...it, options: [{ ...it.options[0], values: vals }] } });
  assert.deepEqual((await get()).options[0].values.map((v) => v.id), ['v1', 'v2', 'v3']);
  it = await get();

  // ลบ "ม่วงเข้ม" (เคยมีคนสั่ง) ไม่ได้ → ให้ตั้ง off แทน · ลบทั้งกลุ่มตัวเลือกก็ไม่ได้
  const without = it.options[0].values.filter((v) => v.id !== 'v1');
  assert.equal((await admin('admin/custom', { type: 'item', op: 'update', id, data: { ...it, options: [{ ...it.options[0], values: without }] } })).error, 'option_in_use');
  assert.equal((await admin('admin/custom', { type: 'item', op: 'update', id, data: { ...it, options: [] } })).error, 'option_in_use');
  const off = it.options[0].values.map((v) => (v.id === 'v1' ? { ...v, off: true } : v));
  assert.equal((await admin('admin/custom', { type: 'item', op: 'update', id, data: { ...it, options: [{ ...it.options[0], values: off }] } })).ok, true);
  assert.equal((await cust('orders', { key: `shop:${id}`, variant: 'v1' })).error, 'variant_unavailable');

  // รูป: เอาออก 1 รูป → ไฟล์ถูกลบ · ลำดับใหม่ = รูปหลักเปลี่ยน · เพิ่มรูปใหม่ได้ไม่เกิน 5
  it = await get();
  const [a, b, c] = it.images;
  await admin('admin/custom', { type: 'item', op: 'update', id, data: { ...it, images: [c, a], new_images: [png(4)] } }); // ตัด b ออก · c เป็นรูปหลัก · เพิ่มรูปใหม่
  it = await get();
  assert.equal(it.images.length, 3); assert.equal(it.images[0], c); assert.equal(it.img, c);
  assert.equal(await urlOk(b), 404); assert.equal(await urlOk(a), 200);
  assert.equal((await admin('admin/custom', { type: 'item', op: 'update', id, data: { ...it, new_images: [png(5), png(6), png(7)] } })).error, 'too_many_images');
  assert.equal(await urlOk(it.images[0]), 200); // อัปโหลดล้มเหลว → รูปเดิมยังอยู่ครบ

  // ลบสินค้า (ยังไม่เคยมีคนสั่ง) → รูปทุกรูปถูกลบ · สินค้าที่เคยมีคนสั่งแล้วลบไม่ได้
  assert.equal((await admin('admin/custom', { type: 'item', op: 'delete', id })).error, 'has_orders');
  const id2 = (await admin('admin/custom', { type: 'item', op: 'create', data: { name: 'ลองลบ', price: 90, new_images: [png(1), png(2)] } })).id;
  const imgs2 = (await admin('admin/pricing')).custom.items.find((x) => x.id === id2).images;
  assert.equal((await admin('admin/custom', { type: 'item', op: 'delete', id: id2 })).ok, true);
  for (const u of imgs2) assert.equal(await urlOk(u), 404);
});

test('สินค้าเดิม (ในไฟล์): เพิ่มรูป/ตัวเลือกได้ · สั่งตามแบบ · คืนค่าเดิมได้เมื่อไม่มีคนสั่ง', async () => {
  const admin = client(); await admin.login('+66812345678', 'แอดมิน');
  const cust = await newCust();
  assert.equal((await admin('admin/pricing', { item: { id: 'coin', new_images: [png(1)], options: [{ name: 'ลาย', values: [{ label: 'พระจันทร์' }, { label: 'ดวงดาว' }] }], variants: { v2: { price: 249 } } } })).ok, true);
  const p = (await admin('admin/pricing')).shop.find((x) => x.id === 'coin');
  assert.equal(p.images.length, 1); assert.equal(p.variants_list.length, 2);
  const cfg = (await siteCfg()).shop.coin;
  assert.equal(cfg.options[0].values.length, 2);
  assert.equal((await cust('orders', { key: 'shop:coin' })).error, 'variant_required');
  assert.equal((await cust('orders', { key: 'shop:coin', variant: 'v2' })).order.amount, 249);
  assert.equal((await cust('orders', { key: 'shop:coin', variant: 'v1' })).order.amount, 199);
  // ตั้งสต๊อกแยกแบบ + แดชบอร์ดเตือนของใกล้หมดแยกตามแบบ
  await admin('admin/stock', { id: 'coin:v1', qty: 2 });
  const low = (await admin('admin/stats')).lowStock.find((x) => x.id === 'coin:v1');
  assert.equal(low.qty, 2); assert.match(low.name, /ลาย: พระจันทร์/);
  // เคยมีคนสั่ง "ดวงดาว" แล้ว → คืนค่าเดิมไม่ได้ (จะลบตัวเลือก) · ต้องปิดขายแทน
  assert.equal((await admin('admin/pricing', { item: { id: 'coin', reset: true } })).error, 'option_in_use');
  assert.equal(await urlOk(p.images[0]), 200);
  // สินค้าที่ไม่เคยมีคนสั่งแบบ → คืนค่าเดิมได้ รูปถูกลบ
  await admin('admin/pricing', { item: { id: 'cloth', new_images: [png(2)], options: [{ name: 'ขนาด', values: [{ label: 'เล็ก' }, { label: 'ใหญ่' }] }] } });
  const img = (await admin('admin/pricing')).shop.find((x) => x.id === 'cloth').images[0];
  assert.equal((await admin('admin/pricing', { item: { id: 'cloth', reset: true } })).ok, true);
  assert.equal(await urlOk(img), 404);
  assert.equal((await cust('orders', { key: 'shop:cloth' })).order.amount, 250); // กลับเป็นสินค้าไม่มีตัวเลือก
});
