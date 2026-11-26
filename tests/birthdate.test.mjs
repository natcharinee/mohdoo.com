// วันเกิด: กรอก/เก็บเป็น พ.ศ. ได้ แต่ระบบเก็บและใช้ ค.ศ. เสมอ
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5182;
const BASE = `http://127.0.0.1:${PORT}/api/v1/`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mohdoo-birth-'));
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
  call.login = async (phone) => {
    await call('auth/otp', { phone });
    assert.equal((await call('auth/verify', { phone, code: '123456' })).status, 200);
  };
  return call;
}

test('วันเกิดที่ส่งมาเป็น พ.ศ. ถูกแปลงเป็น ค.ศ. · ค.ศ. อยู่เหมือนเดิม', async () => {
  const c = client(); await c.login('+66899990011');
  const put = (birthdate) => c('me', { profile: { first: 'ทดสอบ', last: 'ระบบ', name: 'ทดสอบ', birthdate } }, 'PUT');
  assert.equal((await put('2539-09-08')).status, 200);
  assert.equal((await c('me')).user.profile.birthdate, '1996-09-08'); // พ.ศ. 2539 → ค.ศ. 1996
  await put('1990-05-05');
  assert.equal((await c('me')).user.profile.birthdate, '1990-05-05');
  await put('2400-01-02'); // ขอบล่างของ พ.ศ.
  assert.equal((await c('me')).user.profile.birthdate, '1857-01-02');
});

test('ข้อมูลที่เคยบันทึกเป็น พ.ศ. ไว้ก่อนหน้านี้ ถูกแปลงตอนอ่านด้วย · ช่องวันเกิดในแบบฟอร์มสั่งซื้อก็แปลง', async () => {
  const admin = client(); await admin.login('+66812345678');
  const c = client(); await c.login('+66899990012');
  await c('me', { profile: { first: 'ก', name: 'ก', birthdate: '1995-03-04' } }, 'PUT');
  const o = (await c('orders', { key: 'shop:coin' })).order;
  await c(`orders/${o.no}/demo-pay`, {});
  const r = await c(`orders/${o.no}/intake`, { form: { partnerBirth: '2540-12-25', note: 'x', birth2: '2000-01-01' } });
  assert.equal(r.status, 200, JSON.stringify(r));
  const got = (await admin(`admin/orders/${o.no}`)).order;
  assert.equal(got.form.partnerBirth, '1997-12-25');
  assert.equal(got.form.birth2, '2000-01-01');
  assert.equal(got.form.note, 'x');
});
