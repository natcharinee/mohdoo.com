// ทดสอบระบบหลังบ้านจริงผ่าน dev-server (ฐานข้อมูลชั่วคราว ไม่แตะ .data/db.json)
// ศาสตร์ที่ต้องใช้หมอดูจริง: ซ่อนจนมีหมอดูลงทะเบียน → ขายได้ → งานไปถึงเฉพาะหมอดูที่ชำนาญ → ลูกค้าได้คำตอบ
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}/api/v1/`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mohdoo-test-'));
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

// ผู้ใช้หนึ่งคน = เก็บคุกกี้ของตัวเอง
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
    const j = await r.json().catch(() => ({}));
    return { status: r.status, ...j };
  };
  call.login = async (phone, profile) => {
    await call('auth/otp', { phone });
    const r = await call('auth/verify', { phone, code: '123456' });
    assert.equal(r.status, 200, JSON.stringify(r));
    if (profile) await call('me', { profile: { name: profile, first: profile, birthdate: '1990-01-01' } }, 'PUT');
    return r;
  };
  return call;
}

test('ศาสตร์ที่ต้องใช้หมอดูจริง ทำงานครบวงจร', async () => {
  const admin = client(), cust = client(), seerA = client(), seerB = client();
  await admin.login('+66812345678', 'แอดมิน');
  await cust.login('+66811111111', 'ลูกค้า');

  // 1) ยังไม่มีหมอดู → ไพ่ออราเคิล (cards|1) ซ่อนและสั่งไม่ได้
  assert.deepEqual((await cust('health')).human_open, []);
  assert.equal((await cust('orders', { key: 'cards:1' })).error, 'unavailable');

  // 2) เพิ่มหมอดู A (โปรไฟล์ Poney Queen ลงทะเบียนไพ่ออราเคิล) และ B (โปรไฟล์ที่ไม่มีศาสตร์นี้)
  assert.equal((await admin('admin/seers', { name: 'A', phone: '+66822222222', seer_id: '8e7e5637' })).ok, true);
  assert.equal((await admin('admin/seers', { name: 'B', phone: '+66833333333', seer_id: '85516112' })).ok, true);
  assert.deepEqual((await cust('health')).human_open, [], 'เชิญแล้วแต่ยังไม่สมัคร ต้องยังไม่เปิด');
  await seerA.login('+66822222222', 'หมอดู A');
  await seerB.login('+66833333333', 'หมอดู B');
  const open = (await cust('health')).human_open;
  assert.ok(open.includes('cards|1') && open.includes('psychic|6'), JSON.stringify(open));
  assert.ok(!open.includes('cards|4'), 'ไพ่วิญญาณไม่มีโปรไฟล์ไหนลงทะเบียน');
  assert.equal((await cust('orders', { key: 'cards:4' })).error, 'unavailable');

  const hs = (await admin('admin/seers')).human;
  assert.deepEqual(hs.find((h) => h.key === 'cards|1').seers, ['หมอดู A']);

  // 3) ลูกค้าสั่ง → จ่าย (โหมดทดลอง) → ส่งคำถาม
  const { order } = await cust('orders', { key: 'cards:1', title: 'ไพ่ออราเคิล' });
  assert.equal(order.kind, 'reading');
  await cust(`orders/${order.no}/demo-pay`, {});
  const sub = await cust(`orders/${order.no}/intake`, { form: { topic: 'การงาน', question: 'ปีหน้างานจะดีขึ้นไหม' }, fields: [['question', 'คำถาม']] });
  assert.equal(sub.order.status, 'submitted');

  // 4) งานไปถึงเฉพาะหมอดู A
  assert.ok((await seerA('seer/jobs')).jobs.some((j) => j.no === order.no));
  assert.ok(!(await seerB('seer/jobs')).jobs.some((j) => j.no === order.no));
  assert.equal((await seerB(`seer/jobs/${order.no}`, { action: 'take' })).status, 404);

  // 5) หมอดู A ตอบ → ลูกค้าเห็นคำตอบ
  await seerA(`seer/jobs/${order.no}`, { action: 'take' });
  const ans = await seerA(`seer/jobs/${order.no}`, { action: 'answer', answer: 'ไพ่ออกใบแห่งการเริ่มต้นใหม่ งานช่วงต้นปีมีโอกาสเข้ามา ให้เตรียมตัวให้พร้อม', summary: 'งานมีโอกาสใหม่' });
  assert.equal(ans.job.status, 'answered');
  const mine = await cust(`orders/${order.no}`);
  assert.equal(mine.order.status, 'answered');
  assert.match(mine.order.answer, /เริ่มต้นใหม่/);

  // 6) ระงับหมอดู A → ศาสตร์ที่มีแค่ A กลับไปซ่อน
  const uid = (await admin('admin/seers')).seers.find((s) => s.phone === '+66822222222').id;
  await admin(`admin/users/${uid}`, { blocked: true });
  assert.ok(!(await cust('health')).human_open.includes('cards|1'));
});
