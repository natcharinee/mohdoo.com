// โปรไฟล์หมอดูบนหน้าเว็บ: ผู้ดูแลแก้/ซ่อน/เพิ่ม/ลบ จากหลังบ้าน → แท็บหมอดูบนเว็บเปลี่ยนตาม
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5197;
const BASE = `http://127.0.0.1:${PORT}/api/v1/`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mohdoo-prof-'));
let srv;

before(async () => {
  srv = spawn(process.execPath, ['dev-server.mjs'], {
    env: { ...process.env, PORT: String(PORT), MOHDOO_DATA_DIR: dataDir, ADMIN_PHONES: '+66812345678', ANTHROPIC_API_KEY: '' },
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
  return call;
}


// รูป PNG 1×1 จุด
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const pub = async () => (await fetch(BASE + 'seers/prices').then((r) => r.json())).profiles;

test('โปรไฟล์หมอดู: แก้ · ซ่อน · เพิ่ม · ลบ · คืนค่าเดิม', async () => {
  const admin = client(), cust = client();
  const before = await pub();
  assert.ok(before.length > 5);
  const base = before[0];

  // ลูกค้าแก้ไม่ได้
  await cust.login('+66811111111', 'ลูกค้า');
  assert.equal((await cust(`admin/seer-profiles/${base.id}`, { name: 'x' })).status, 403);
  await admin.login('+66812345678', 'แอดมิน');

  // 1) แก้ชื่อ + ศาสตร์ (ศาสตร์ที่ไม่มีจริงถูกตัด) → หน้าเว็บเห็นทันที
  const r1 = await admin(`admin/seer-profiles/${base.id}`, { name: 'ชื่อใหม่', cats: ['cards|8', 'nope|1'] });
  assert.equal(r1.profile.name, 'ชื่อใหม่');
  assert.deepEqual(r1.profile.cats, ['cards|8']);
  assert.equal(r1.profile.edited, true);
  assert.equal((await pub()).find((p) => p.id === base.id).name, 'ชื่อใหม่');

  // 2) ซ่อน → หายจากหน้าเว็บ และสั่งซื้อไม่ได้ · หลังบ้านยังเห็น
  await admin(`admin/seer-profiles/${base.id}`, { hidden: true });
  assert.ok(!(await pub()).some((p) => p.id === base.id));
  const list = await admin('admin/seers');
  assert.equal(list.all.find((p) => p.id === base.id).hidden, true);
  assert.ok(list.cats.length > 0);
  // ลิงก์รูปต้องเป็น https เท่านั้น · โปรไฟล์ตั้งต้นลบไม่ได้
  assert.equal((await admin(`admin/seer-profiles/${base.id}`, { img: 'javascript:alert(1)' })).error, 'bad_img');
  assert.equal((await admin(`admin/seer-profiles/${base.id}`, { delete: true })).error, 'base_profile');

  // 3) คืนค่าเดิม
  const r3 = await admin(`admin/seer-profiles/${base.id}`, { reset: true });
  assert.equal(r3.profile.name, base.name);
  assert.equal(r3.profile.edited, false);
  assert.ok((await pub()).some((p) => p.id === base.id && p.name === base.name));

  // 4) เพิ่มโปรไฟล์ใหม่พร้อมรูป → รูปเปิดได้โดยไม่ต้องเข้าสู่ระบบ
  assert.equal((await admin('admin/seer-profiles', { cats: ['cards|0'] })).error, 'empty');
  const r4 = await admin('admin/seer-profiles', { name: 'แม่หมอใหม่', cats: ['cards|0', 'psychic|0'], image: PNG, callCoin: 199, callMin: 15 });
  const np = r4.profile;
  assert.equal(np.base, false);
  assert.match(np.img, /seerimg-/);
  assert.equal((await fetch(`http://127.0.0.1:${PORT}${np.img}`)).status, 200);
  assert.ok((await pub()).some((p) => p.id === np.id && p.callCoin === 199));

  // 5) เชื่อมบัญชีหมอดูแล้วลบไม่ได้ · ยกเลิกเชื่อมแล้วลบได้
  await admin('admin/seers', { name: 'แม่หมอใหม่', phone: '+66855555555', seer_id: np.id });
  assert.equal((await admin(`admin/seer-profiles/${np.id}`, { delete: true })).error, 'in_use');
  const u = (await admin('admin/seers')).seers.find((x) => x.phone === '+66855555555');
  await admin(`admin/users/${u.id}`, { seer_id: '' });
  assert.equal((await admin(`admin/seer-profiles/${np.id}`, { delete: true })).ok, true);
  assert.ok(!(await pub()).some((p) => p.id === np.id));
});

test('อนุมัติใบสมัครแบบ "สร้างโปรไฟล์ใหม่" → ได้โปรไฟล์ชื่อและศาสตร์ตามใบสมัคร', async () => {
  const guest = client(), admin = client();
  await guest('seer-apply', { name: 'สมชาย ดีมาก', alias: 'อ.ชาย', phone: '0877777777', cats: ['numbers|0'], about: 'ดูเลขศาสตร์มากว่า 10 ปี ถนัดเบอร์มือถือและชื่อ', consent: true });
  await admin.login('+66812345678', 'แอดมิน');
  const app = (await admin('admin/seer-apps?status=new')).apps.find((a) => a.phone === '+66877777777');
  const ok = await admin(`admin/seer-apps/${app.id}`, { status: 'approved', seer_id: 'new' });
  assert.equal(ok.app.status, 'approved');
  const prof = (await pub()).find((p) => p.name === 'อ.ชาย');
  assert.ok(prof);
  assert.deepEqual(prof.cats, ['numbers|0']);
  const seer = (await admin('admin/seers')).seers.find((x) => x.phone === '+66877777777');
  assert.equal(seer.seer_id, prof.id);
});
