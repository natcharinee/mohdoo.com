// ===== เข้าสู่ระบบ: OTP ทาง SMS (Twilio Verify) + session cookie ที่เซ็นด้วย HMAC =====
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { db, newId } from './db.js';
import { fail, cookies, setCookie } from './http.js';

const COOKIE = 'md_s';
const SESSION_DAYS = 60;
// ทีมงาน/ผู้ดูแลทำคืนเงิน เปลี่ยนสิทธิ์ ส่งประกาศได้ → อยู่ในระบบได้สั้นกว่า (เครื่องหายจะเสี่ยงน้อยลง)
export const TEAM_SESSION_DAYS = 7;
export const DEMO_CODE = '123456';
export const ROLES = ['customer', 'seer', 'staff', 'admin'];
export const STAFF = ['seer', 'staff', 'admin'];
export const BACKOFFICE = ['staff', 'admin']; // หมอดูไม่เข้าหลังบ้าน · ตอบคำถามผ่านหน้าเว็บ (/api/v1/seer/...)

// ไม่มี SESSION_SECRET (เครื่องพัฒนา) → สร้างเก็บไว้ในโฟลเดอร์ข้อมูล · บนเว็บจริงต้องตั้งเสมอ
let secret = config.sessionSecret;
function key() {
  if (secret) return secret;
  if (config.prod) fail(503, 'session_secret_missing');
  const f = path.join(config.dataDir, 'secret');
  try { secret = fs.readFileSync(f, 'utf8').trim(); } catch (_) {
    secret = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(config.dataDir, { recursive: true });
    fs.writeFileSync(f, secret);
  }
  return secret;
}
const sign = (s) => crypto.createHmac('sha256', key()).update(s).digest('base64url');
const safeEq = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function startSession(res, user) {
  const days = BACKOFFICE.includes(user.role) ? TEAM_SESSION_DAYS : SESSION_DAYS;
  const now = Date.now();
  const payload = Buffer.from(JSON.stringify({ uid: user.id, v: user.sv || 0, iat: now, exp: now + days * 864e5 })).toString('base64url');
  setCookie(res, COOKIE, `${payload}.${sign(payload)}`, { maxAge: days * 86400, secure: config.prod });
}
export const endSession = (res) => setCookie(res, COOKIE, '', { maxAge: 0, secure: config.prod });

export async function sessionUser(req) {
  const raw = cookies(req)[COOKIE];
  if (!raw || !raw.includes('.')) return null;
  const [payload, sig] = raw.split('.');
  if (!safeEq(sign(payload), sig)) return null;
  let s;
  try { s = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch (_) { return null; }
  if (!s.uid || s.exp < Date.now()) return null;
  const u = await (await db()).get('user', s.uid);
  if (!u || u.blocked || (u.sv || 0) !== s.v) return null; // sv เปลี่ยน = ออกจากระบบทุกเครื่อง
  // ทีมงาน/ผู้ดูแล: เข้าสู่ระบบใหม่ทุก 7 วัน (รวมบัญชีที่เพิ่งได้สิทธิ์ทีมงานแต่ยังใช้คุกกี้ลูกค้า 60 วันเดิม)
  const iat = s.iat || s.exp - SESSION_DAYS * 864e5;
  if (BACKOFFICE.includes(u.role) && Date.now() - iat > TEAM_SESSION_DAYS * 864e5) return null;
  return u;
}
export async function needUser(req) {
  const u = await sessionUser(req);
  if (!u) fail(401, 'login_required');
  return u;
}
export async function needRole(req, roles = BACKOFFICE) {
  const u = await needUser(req);
  if (!roles.includes(u.role)) fail(403, 'forbidden');
  return u;
}

// ---------- เบอร์โทร ----------
export function normPhone(p) {
  const d = String(p || '').replace(/[^\d+]/g, '');
  if (/^\+\d{8,15}$/.test(d)) return d;
  if (/^0\d{9}$/.test(d)) return `+66${d.slice(1)}`; // 08xxxxxxxx
  fail(400, 'bad_phone');
}

// ---------- OTP ----------
const hashCode = (phone, code) => crypto.createHmac('sha256', key()).update(`${phone}:${code}`).digest('hex');
const twilioAuth = () => `Basic ${Buffer.from(`${config.twilio.sid}:${config.twilio.token}`).toString('base64')}`;
async function twilio(pathname, form) {
  const r = await fetch(`https://verify.twilio.com/v2/Services/${config.twilio.verify}/${pathname}`, {
    method: 'POST', headers: { Authorization: twilioAuth(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) fail(r.status === 429 ? 429 : 502, 'sms_failed', { detail: j.message });
  return j;
}

export async function sendOtp(phone) {
  if (config.otp === 'off') fail(503, 'otp_not_configured');
  const store = await db();
  const o = await store.get('otp', phone);
  if (o && Date.now() - o.sent_at < 55e3) fail(429, 'wait', { wait: Math.ceil((60e3 - (Date.now() - o.sent_at)) / 1000) });
  if (config.otp === 'twilio') await twilio('Verifications', { To: phone, Channel: 'sms', Locale: 'th' });
  await store.put('otp', { id: phone, k: phone, hash: config.otp === 'demo' ? hashCode(phone, DEMO_CODE) : null, sent_at: Date.now(), exp: Date.now() + 5 * 60e3, tries: 0 });
  return { demo: config.otp === 'demo' };
}

export async function checkOtp(phone, code) {
  code = String(code || '').replace(/\D/g, '');
  if (code.length !== 6) fail(400, 'bad_code');
  const store = await db();
  const o = await store.get('otp', phone);
  if (!o || o.exp < Date.now()) fail(400, 'code_expired');
  if (o.tries >= 5) fail(429, 'too_many_tries');
  o.tries += 1;
  await store.put('otp', o);
  let ok = false;
  if (config.otp === 'twilio') {
    const j = await twilio('VerificationCheck', { To: phone, Code: code });
    ok = j.status === 'approved';
  } else ok = !!o.hash && safeEq(o.hash, hashCode(phone, code));
  if (!ok) fail(400, 'wrong_code');
  await store.del('otp', phone);
}

// หา/สร้างบัญชีจากเบอร์ · เบอร์ใน ADMIN_PHONES ได้สิทธิ์ผู้ดูแลอัตโนมัติ
export async function userForPhone(phone) {
  const store = await db();
  let u = await store.byKey('user', phone);
  const isNew = !u;
  if (!u) u = { id: newId('u'), phone, role: 'customer', name: '', profile: null, ai_until: 0, created_at: Date.now() };
  if (config.adminPhones.includes(phone) && u.role !== 'admin') u.role = 'admin';
  u.last_login = Date.now();
  u.updated_at = Date.now();
  await store.put('user', u);
  return { user: u, isNew: isNew || !u.profile };
}
