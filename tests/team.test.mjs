// รายงานยอดขายตามช่วงวันที่ · กรองคำสั่งซื้อ/ส่งออก CSV ตามวันที่
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5185;
const BASE = `http://127.0.0.1:${PORT}/api/v1/`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mohdoo-team-'));
let srv;
before(async () => {
  srv = spawn(process.execPath, ['dev-server.mjs'], {
    env: { ...process.env, PORT: String(PORT), MOHDOO_DATA_DIR: dataDir,  ADMIN_PHONES: '+66812345678', ANTHROPIC_API_KEY: '', PAY_DEMO: '1', OTP_DEMO: '1' },
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

test('หน้ารวมทีมงาน: ใครเห็น · เพิ่มทีมงาน · ผลงาน · ประวัติ', async () => {
  const admin = client(), cust = client(), staff = client(), seer = client();
  const a = await admin.login('+66812345678', 'แอดมินใหญ่');
  await cust.login('+66880000041', 'ลูกค้า');
  assert.equal((await cust('admin/team')).status, 403);
  assert.equal((await client()('admin/team')).status, 401);

  // เพิ่มทีมงาน: เฉพาะผู้ดูแล · เบอร์ซ้ำกับทีมงาน/ผู้ดูแลไม่ได้
  assert.equal((await cust('admin/team/invite', { phone: '0880000042' })).status, 403);
  assert.equal((await admin('admin/team/invite', { phone: '12' })).error, 'bad_phone');
  const inv = await admin('admin/team/invite', { name: 'คุณแพรว', phone: '0880000042' });
  assert.equal(inv.ok, true); assert.equal(inv.registered, false);
  assert.equal((await admin('admin/team/invite', { phone: '0880000042' })).error, 'already_team'); // เพิ่มซ้ำ (ยังเป็นทีมงานแล้ว)
  assert.equal((await admin('admin/team/invite', { phone: '+66812345678' })).error, 'already_team');
  let t = await admin('admin/team');
  const pending = t.members.find((m) => m.phone === '+66880000042');
  assert.equal(pending.role, 'staff'); assert.equal(pending.registered, false); assert.equal(pending.name, 'คุณแพรว');
  assert.ok(t.counts.pending >= 1);

  // คนนั้นสมัครด้วยเบอร์นี้ → ได้สิทธิ์ทีมงานทันที · เห็นหน้านี้ได้ แต่เพิ่ม/ระงับไม่ได้
  const s = await staff.login('+66880000042', 'คุณแพรว');
  assert.equal(s.user.role, 'staff');
  const tv = await staff('admin/team');
  assert.equal(tv.status, 200);
  assert.equal(tv.members.find((m) => m.phone === '+66880000042').registered, true);
  assert.equal((await staff('admin/team/invite', { phone: '0880000043' })).status, 403);
  assert.equal((await staff(`admin/users/${a.user.id}`, { blocked: true })).status, 403);

  // ผลงาน: หมอดูตอบงานแล้วขึ้นในตาราง (ตอบ 1 งาน · 7 วัน/30 วัน/ทั้งหมด)
  const first = (await client()('seers/prices')).profiles[0];
  await admin('admin/seers', { name: 'หมอดูทีม', phone: '+66880000044', seer_id: first.id });
  const sv = await seer.login('+66880000044', 'หมอดูทีม');
  const buyer = client(); await buyer.login('+66880000045', 'ผู้ซื้อ');
  const o2 = (await buyer('orders', { key: `seer:${first.id}` })).order;
  await buyer(`orders/${o2.no}/demo-pay`, {});
  await buyer(`orders/${o2.no}/intake`, { form: { topic: 'การงาน', question: 'ขอดูเรื่องงานปีหน้า' }, fields: [['topic', 'เรื่อง'], ['question', 'คำถาม']] });
  await admin(`admin/orders/${o2.no}`, { action: 'assign', to: sv.user.id }); // มอบหมายงานให้หมอดู → "กำลังรับ" 1
  t = await admin('admin/team');
  assert.equal(t.members.find((m) => m.id === sv.user.id).open_jobs, 1);
  assert.equal((await seer(`seer/jobs/${o2.no}`, { action: 'answer', answer: 'ปีหน้าการงานดี มีโอกาสก้าวหน้า', summary: 'การงานดี' })).status, 200);
  t = await admin('admin/team');
  const row = t.members.find((m) => m.id === sv.user.id);
  assert.deepEqual(row.answered, { d7: 1, d30: 1, all: 1 });
  assert.equal(row.open_jobs, 0); // ตอบแล้ว = ไม่ค้างงาน
  assert.equal(row.role, 'seer');
  assert.ok(t.members.find((m) => m.id === a.user.id).last_action, 'ผู้ดูแลมีการกระทำล่าสุดจากประวัติ');
  assert.equal(t.members.find((m) => m.id === a.user.id).role, 'admin');
  assert.equal(t.members[0].role, 'admin'); // เรียงผู้ดูแลก่อน
  assert.ok(t.counts.admin >= 1 && t.counts.staff >= 1 && t.counts.seer >= 1);

  // ประวัติการทำงานกรองรายคน · ระงับตัวเองไม่ได้ · ระงับคนอื่นได้และถูกบันทึก
  const log = await admin(`admin/audit?by=${a.user.id}`);
  assert.ok(log.items.length >= 1 && log.items.every((x) => x.by === a.user.id));
  assert.equal((await admin(`admin/users/${a.user.id}`, { blocked: true })).error, 'cannot_block_self');
  assert.equal((await admin(`admin/users/${s.user.id}`, { blocked: true })).ok, true);
  assert.equal((await staff('admin/team')).status, 401); // ถูกระงับ = ออกจากระบบทันที
  t = await admin('admin/team');
  assert.equal(t.members.find((m) => m.id === s.user.id).blocked, true);
  assert.ok(t.counts.blocked >= 1);
});
