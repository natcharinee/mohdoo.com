// จำกัดจำนวนครั้งเก็บในฐานข้อมูล: เปิดเซิร์ฟเวอร์ใหม่ (เหมือน Vercel สลับเครื่อง) ตัวนับต้องยังอยู่
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5193;
const BASE = `http://127.0.0.1:${PORT}/api/v1/`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mohdoo-rate-'));
let srv;

async function start() {
  srv = spawn(process.execPath, ['dev-server.mjs'], {
    env: { ...process.env, PORT: String(PORT), MOHDOO_DATA_DIR: dataDir, OTP_DEMO: '1', OTP_HOURLY_CAP: '10', ANTHROPIC_API_KEY: '' },
    stdio: process.env.TEST_LOG ? 'inherit' : 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE + 'health')).ok) return; } catch (_) {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('dev-server ไม่ขึ้น');
}
async function stop() {
  if (!srv) return;
  const done = new Promise((r) => srv.once('exit', r));
  srv.kill();
  await done;
  srv = null;
}
after(stop);
const otp = (phone) => fetch(BASE + 'auth/otp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone }) })
  .then(async (r) => ({ status: r.status, ...(await r.json()) }));

test('เพดาน OTP ทั้งระบบต่อชั่วโมง นับต่อเนื่องแม้เปิดเซิร์ฟเวอร์ใหม่', async () => {
  await start();
  for (let i = 0; i < 10; i++) assert.equal((await otp(`+668700000${String(i).padStart(2, '0')}`)).status, 200, `ครั้งที่ ${i + 1}`);
  const over = await otp('+66870000099');
  assert.equal(over.status, 429);
  assert.equal(over.error, 'too_many_requests');
  assert.ok(over.retry > 0);

  // เปิดเซิร์ฟเวอร์ใหม่ (หน่วยความจำว่าง) → ตัวนับในฐานข้อมูลยังอยู่ ยังส่งไม่ได้
  await stop();
  await start();
  assert.equal((await otp('+66870000098')).status, 429);
});
