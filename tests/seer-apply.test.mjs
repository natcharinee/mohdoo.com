// ใบสมัครหมอดู: หน้าเว็บส่งใบสมัคร (ไม่ต้องเข้าสู่ระบบ) → ผู้ดูแลเห็น → อนุมัติ → เบอร์นั้นสมัครแล้วได้สิทธิ์หมอดู
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5198;
const BASE = `http://127.0.0.1:${PORT}/api/v1/`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mohdoo-apply-'));
let srv;

before(async () => {
  srv = spawn(process.execPath, ['dev-server.mjs'], {
    env: { ...process.env, PORT: String(PORT), MOHDOO_DATA_DIR: dataDir, ADMIN_PHONES: '+66812345678', ANTHROPIC_API_KEY: '' },
    stdio: 'ignore',
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

const form = (over = {}) => ({
  name: 'สมหญิง ใจดี', alias: 'แม่หมอหญิง', phone: '0898765432', line: '@somying', years: 12, links: 'https://facebook.com/x',
  cats: ['cards|8', 'psychic|0', 'nope|99'], about: 'ดูไพ่นาคราชและลูกแก้วมากว่า 12 ปี ถนัดเรื่องความรักและการงาน', sample: '', consent: true, ...over,
});

test('ใบสมัครหมอดู: ส่ง → ตรวจ → อนุมัติ → ได้สิทธิ์หมอดู', async () => {
  const guest = client(), admin = client(), cust = client();

  // 1) ตรวจข้อมูล: ไม่ยินยอม / ไม่เลือกศาสตร์ / เบอร์ผิด
  assert.equal((await guest('seer-apply', form({ consent: false }))).error, 'consent_required');
  assert.equal((await guest('seer-apply', form({ cats: ['nope|1'] }))).error, 'empty');
  assert.equal((await guest('seer-apply', form({ phone: '12' }))).error, 'bad_phone');

  // 2) บอทกรอกช่องดัก → ตอบ ok แต่ไม่บันทึก
  assert.equal((await guest('seer-apply', form({ website: 'spam', phone: '0800000000' }))).ok, true);

  // 3) ส่งจริง แล้วส่งซ้ำด้วยเบอร์เดิม = แก้ใบเดิม ไม่เพิ่มใบใหม่
  const r1 = await guest('seer-apply', form());
  assert.equal(r1.ok, true, JSON.stringify(r1)); assert.equal(r1.updated, false);
  const r2 = await guest('seer-apply', form({ years: 13 }));
  assert.equal(r2.updated, true);

  // 4) ลูกค้าดูรายการใบสมัครไม่ได้ · ผู้ดูแลเห็น 1 ใบ ศาสตร์ที่ไม่มีจริงถูกตัดออก
  await cust.login('+66811111111', 'ลูกค้า');
  assert.equal((await cust('admin/seer-apps')).status, 403);
  await admin.login('+66812345678', 'แอดมิน');
  const list = await admin('admin/seer-apps?status=new');
  assert.equal(list.apps.length, 1);
  const app = list.apps[0];
  assert.deepEqual(app.cats, ['cards|8', 'psychic|0']);
  assert.equal(app.years, 13);
  assert.equal(app.phone, '+66898765432');
  assert.equal(list.counts.new, 1);
  assert.ok(list.types['cards|8']);

  // 5) บันทึก + ติดต่อแล้ว → อนุมัติ
  await admin(`admin/seer-apps/${app.id}`, { note: 'โทรคุยแล้ว', status: 'contacted' });
  const ok = await admin(`admin/seer-apps/${app.id}`, { status: 'approved' });
  assert.equal(ok.app.status, 'approved');
  assert.equal(ok.app.notes[0].text, 'โทรคุยแล้ว');

  // 6) เบอร์นี้สมัครที่หน้าเว็บ → ได้สิทธิ์หมอดู · ส่งใบสมัครซ้ำไม่ได้แล้ว
  const seer = client();
  const v = await seer.login('+66898765432');
  assert.equal(v.user.role, 'seer');
  assert.equal((await guest('seer-apply', form())).error, 'already_seer');

  // 7) ลบใบสมัครตามคำขอ (PDPA)
  assert.equal((await admin(`admin/seer-apps/${app.id}`, { delete: true })).deleted, true);
  assert.equal((await admin('admin/seer-apps')).total, 0);
});
