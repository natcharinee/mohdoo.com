// ความปลอดภัยเพิ่มเติม: รูปส่วนตัวห้ามสำรองเป็นสาธารณะบนเว็บจริง · health ไม่เปิดข้อมูลวินิจฉัยบนเว็บจริง · รหัสผู้ใช้สุ่มแบบปลอดภัย
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5181;
const BASE = `http://127.0.0.1:${PORT}/api/v1/`;
const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

function saveWith(env, folder) {
  // Blob จำลองในโปรเซสลูก: ตอบ 403 ทันที (ไม่ให้ไลบรารีลองซ้ำนาน) เพื่อจำลอง "อัปโหลด private ไม่ได้"
  const code = `import http from 'node:http';
    const fake = http.createServer((q, r) => { r.statusCode = 403; r.setHeader('content-type', 'application/json'); r.end(JSON.stringify({ error: { code: 'forbidden', message: 'x' } })); });
    fake.listen(0, '127.0.0.1', async () => {
      process.env.VERCEL_BLOB_API_URL = 'http://127.0.0.1:' + fake.address().port;
      const m = await import('./api/_lib/storage.js');
      try { await m.saveFile(process.env.JPG, { folder: ${JSON.stringify(folder)}, owner: 'u1' }); console.log('SAVED'); } catch (e) { console.log('ERR:' + (e.code || e.message)); }
      fake.close(); process.exit(0);
    });`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
    env: { ...process.env, JPG, BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_test_x', MOHDOO_DATA_DIR: os.tmpdir(), ...env },
    encoding: 'utf8', timeout: 30000,
  });
  return (r.stdout || '').trim().split('\n').pop();
}

test('เว็บจริง: อัปโหลด private ไม่ได้ → รูปลายมือ/หลักฐานพิธีถูกปฏิเสธ ไม่สำรองเป็นสาธารณะ', () => {
  const prod = { VERCEL_ENV: 'production', VERCEL: '1', SESSION_SECRET: 'x'.repeat(40) };
  assert.equal(saveWith(prod, 'photo'), 'ERR:storage_private_required');
  assert.equal(saveWith(prod, 'proof'), 'ERR:storage_private_required');
  // รูปสินค้า/โปรไฟล์หมอดูเป็นข้อมูลสาธารณะ → ยังลองสำรองได้ (ล้มเพราะต่อ Blob จำลองไม่ได้ แต่ไม่ใช่ข้อผิดพลาดนี้)
  assert.notEqual(saveWith(prod, 'shopimg'), 'ERR:storage_private_required');
  assert.notEqual(saveWith(prod, 'photo'), 'SAVED');
});

test('ไม่ใช่เว็บจริง (Preview/dev): ยังสำรองได้เหมือนเดิม', () => {
  const out = saveWith({ VERCEL_ENV: 'preview', VERCEL: '1' }, 'photo');
  assert.ok(out && out !== 'ERR:storage_private_required', out); // พยายามสำรอง (ล้มเพราะ Blob จำลองตอบ 403 ซ้ำ) ไม่ใช่ถูกปฏิเสธ
});

test('รหัสผู้ใช้สุ่มแบบปลอดภัย · ชื่อไฟล์ยังเข้ารูปแบบเดิม', async () => {
  const { newId } = await import('../api/_lib/db.js');
  const ids = new Set(Array.from({ length: 200 }, () => newId('u')));
  assert.equal(ids.size, 200);
  for (const id of ids) assert.match(id, /^u[a-z0-9]+$/);
});

let srv;
before(async () => {
  srv = spawn(process.execPath, ['dev-server.mjs'], {
    env: { ...process.env, PORT: String(PORT), MOHDOO_DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'mohdoo-hard-')), VERCEL_ENV: 'production', SESSION_SECRET: 'y'.repeat(40), ANTHROPIC_API_KEY: '' },
    stdio: process.env.TEST_LOG ? 'inherit' : 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE + 'health')).ok) return; } catch (_) {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('dev-server ไม่ขึ้น');
});
after(() => { srv?.kill(); });

test('health บนเว็บจริงไม่มี diag และไม่มีรหัสทดลอง', async () => {
  const h = await (await fetch(BASE + 'health')).json();
  assert.equal(h.ok, true);
  assert.equal(h.diag, undefined);
  assert.equal(h.demo_code, undefined);
  assert.equal(h.session_key, 'env');
});

test('Preview บน Vercel ที่ไม่มี PREVIEW_DATABASE_URL แต่มี DATABASE_URL ของเว็บจริง → ปฏิเสธ ไม่แตะฐานข้อมูลจริง', async () => {
  const port = 5180;
  const p = spawn(process.execPath, ['dev-server.mjs'], {
    env: { ...process.env, PORT: String(port), MOHDOO_DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'mohdoo-pv-')), VERCEL: '1', VERCEL_ENV: 'preview', DATABASE_URL: 'postgres://u:p@127.0.0.1:1/x', SESSION_SECRET: 'z'.repeat(40), ANTHROPIC_API_KEY: '' },
    stdio: 'ignore',
  });
  try {
    let r;
    for (let i = 0; i < 50; i++) {
      try { r = await fetch(`http://127.0.0.1:${port}/api/v1/health`); break; } catch (_) { await new Promise((x) => setTimeout(x, 100)); }
    }
    assert.equal(r.status, 503);
    assert.equal((await r.json()).error, 'preview_database_missing');
  } finally { p.kill(); }
});
