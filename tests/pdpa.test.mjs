// PDPA: ลูกค้าดาวน์โหลด/ลบข้อมูลเอง · ผู้ดูแลส่งออก/ลบแทนได้ (ต้องมีเลขอ้างอิง + พิมพ์เบอร์ยืนยัน) · ลบแล้วไม่เหลือข้อมูลส่วนตัว
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5191;
const BASE = `http://127.0.0.1:${PORT}/api/v1/`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mohdoo-pdpa-'));
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
const raw = (p, cookie) => fetch(BASE + p, { headers: { cookie } });

// ลูกค้าที่มีคำสั่งซื้อ พร้อมฟอร์ม ที่อยู่ และรูป
async function customerWithOrder(phone, name) {
  const c = client();
  const v = await c.login(phone, name);
  const { order } = await c('orders', { key: 'shop:coin', qty: 1, place: '99/9 ถ.สุขุมวิท กรุงเทพฯ' });
  await c(`orders/${order.no}/demo-pay`, {});
  const r = await c(`orders/${order.no}/intake`, { form: {}, fields: [['ชื่อบนวัตถุมงคล', name]], photos: [{ slot: 'palm', data: PNG }], photo_consent_at: Date.now() });
  assert.equal(r.status, 200, JSON.stringify(r));
  return { c, id: v.user.id, order: r.order };
}

test('ลูกค้าดาวน์โหลดข้อมูลตัวเอง และลบบัญชีเอง', async () => {
  const { c, id, order } = await customerWithOrder('+66880000001', 'ลูกค้าเอ');
  const r = await fetch(BASE + 'me/export', { headers: { cookie: c.cookie() } });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-disposition'), /attachment; filename="mohdoo-my-data-/);
  const d = await r.json();
  assert.equal(d.account.phone, '+66880000001');
  assert.equal(d.profile.first, 'ลูกค้าเอ');
  assert.equal(d.orders[0].no, order.no);
  assert.equal(d.orders[0].place, '99/9 ถ.สุขุมวิท กรุงเทพฯ');
  assert.deepEqual(d.orders[0].fields, [['ชื่อบนวัตถุมงคล', 'ลูกค้าเอ']]);
  assert.match(d.account.created_at, /^\d{4}-\d\d-\d\dT/); // เวลาอ่านออก
  assert.equal(d.orders[0].qr, undefined);

  const photo = order.photos[0].url;
  assert.equal((await raw(photo.replace('/api/v1/', ''), c.cookie())).status, 200);
  assert.equal((await c('me', null, 'DELETE')).ok, true);

  const admin = client();
  await admin.login('+66812345678', 'แอดมิน');
  const { order: o } = await admin(`admin/orders/${order.no}`);
  assert.equal(o.phone, ''); assert.equal(o.place, ''); assert.deepEqual(o.fields, []); assert.deepEqual(o.photos, []);
  assert.equal(o.amount, order.amount); // ยอดเงินยังอยู่ (ทำบัญชี)
  assert.equal((await raw(photo.replace('/api/v1/', ''), admin.cookie())).status, 404); // ไฟล์รูปถูกลบจริง
  const log = await admin(`admin/audit?user=${id}`);
  assert.ok(log.items.some((x) => x.action === 'pdpa_self_erase'));
  assert.ok(log.items.every((x) => !JSON.stringify(x).includes('880000001') && !JSON.stringify(x).includes('ลูกค้าเอ')), 'ประวัติต้องไม่เหลือชื่อ/เบอร์');
});

test('ผู้ดูแลส่งออก/ลบแทนลูกค้า: ต้องมีเลขอ้างอิง พิมพ์เบอร์ตรง และลบทีมงานไม่ได้', async () => {
  const admin = client(), staffC = client();
  await admin.login('+66812345678', 'แอดมิน');
  const { id, order } = await customerWithOrder('+66880000002', 'ลูกค้าบี');
  // สมัครเป็นหมอดูไว้ด้วย → ลบแล้วใบสมัครต้องหาย
  await client()('seer-apply', { name: 'ลูกค้าบี', phone: '0880000002', cats: ['cards|0'], about: 'ดูไพ่ทาโรต์มา 5 ปี ถนัดเรื่องความรักและการงาน', consent: true });
  await admin(`admin/users/${id}`, { note: 'โทรมาขอลบข้อมูล เบอร์ 0880000002' });

  // ส่งออก: ไม่มีเลขอ้างอิง = ไม่ได้ · มี = ได้ไฟล์ และบันทึกประวัติ
  assert.equal((await admin(`admin/users/${id}/export`)).error, 'ref_required');
  const ex = await fetch(BASE + `admin/users/${id}/export?ref=${encodeURIComponent('LINE 24/11 ยืนยันเลขคำสั่งซื้อ')}`, { headers: { cookie: admin.cookie() } });
  assert.equal(ex.status, 200);
  const d = await ex.json();
  assert.equal(d.account.phone, '+66880000002');
  assert.equal(d.seer_application.name, 'ลูกค้าบี');

  // ลบ: เบอร์ไม่ตรง = ไม่ลบ · ทีมงานลบไม่ได้ · ทีมงานลบตัวเองไม่ได้
  assert.equal((await admin(`admin/users/${id}/erase`, { ref: 'LINE 24/11', confirm_phone: '0899999999' })).error, 'confirm_mismatch');
  const s = await staffC.login('+66880000003', 'พนักงาน');
  await admin(`admin/users/${s.user.id}`, { role: 'staff' });
  assert.equal((await admin(`admin/users/${s.user.id}/erase`, { ref: 'x x x', confirm_phone: '+66880000003' })).error, 'is_staff');
  await staffC.login('+66880000003');
  assert.equal((await staffC('me', null, 'DELETE')).error, 'staff_cannot_self_delete');
  // ทีมงานใช้เครื่องมือนี้ไม่ได้ (ผู้ดูแลเท่านั้น)
  assert.equal((await staffC(`admin/users/${id}/erase`, { ref: 'xxx', confirm_phone: '0880000002' })).status, 403);

  const ok = await admin(`admin/users/${id}/erase`, { ref: 'LINE 24/11', confirm_phone: '0880000002' });
  assert.equal(ok.ok, true); assert.equal(ok.orders, 1); assert.equal(ok.files, 1);
  assert.equal((await admin(`admin/users/${id}`)).status, 404);
  assert.equal((await admin('admin/seer-apps')).apps.filter((a) => a.phone === '+66880000002').length, 0);
  const { order: o } = await admin(`admin/orders/${order.no}`);
  assert.equal(o.name, 'บัญชีที่ลบแล้ว'); assert.deepEqual(o.notes, []);

  const log = await admin(`admin/audit?user=${id}`);
  const acts = log.items.map((x) => x.action);
  assert.ok(acts.includes('pdpa_export') && acts.includes('pdpa_erase'), acts.join());
  assert.equal(log.items.find((x) => x.action === 'pdpa_erase').detail.ref, 'LINE 24/11');
  assert.ok(log.items.every((x) => !JSON.stringify(x).includes('880000002') && !JSON.stringify(x).includes('ลูกค้าบี')), 'ประวัติต้องไม่เหลือชื่อ/เบอร์');
});
