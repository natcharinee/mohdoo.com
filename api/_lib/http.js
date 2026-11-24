// ===== ตัวช่วย HTTP ของระบบหลังบ้าน (ใช้ได้ทั้งบน Vercel และ dev-server.mjs) =====
export class HttpError extends Error {
  constructor(status, code, extra) { super(code); this.status = status; this.code = code; this.extra = extra; }
}
export const fail = (status, code, extra) => { throw new HttpError(status, code, extra); };

export function send(res, status, body, headers = {}) {
  res.statusCode = status;
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  if (typeof body === 'string' || Buffer.isBuffer(body)) return res.end(body);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

// Vercel แปลง JSON ให้แล้ว (req.body) · dev-server ก็ทำแบบเดียวกัน · กันกรณีเป็น string
export function bodyOf(req) {
  const b = req.body;
  if (b == null || b === '') return {};
  if (typeof b === 'string') { try { return JSON.parse(b); } catch (_) { fail(400, 'bad_json'); } }
  if (Buffer.isBuffer(b)) { try { return JSON.parse(b.toString('utf8') || '{}'); } catch (_) { fail(400, 'bad_json'); } }
  return b;
}

export function cookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

export function setCookie(res, name, value, { maxAge, secure } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (maxAge != null) parts.push(`Max-Age=${maxAge}`);
  if (secure) parts.push('Secure');
  const prev = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', [...(Array.isArray(prev) ? prev : prev ? [prev] : []), parts.join('; ')]);
}

// Vercel ใส่ x-real-ip / x-vercel-forwarded-for เอง (ผู้ใช้ปลอมไม่ได้) · x-forwarded-for ใช้สำรองตอนพัฒนาในเครื่อง
export const ipOf = (req) => String(req.headers['x-real-ip'] || req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();

// ข้อความจากผู้ใช้: ตัดความยาว ตัดอักขระควบคุม
export const str = (v, max = 200) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
export const int = (v) => (Number.isFinite(+v) ? Math.trunc(+v) : NaN);

// จำกัดจำนวนครั้งในหน่วยความจำ (ต่อเครื่อง) · ใช้สำรองเมื่อฐานข้อมูลมีปัญหา · ตัวหลักอยู่ที่ ratelimit.js
const buckets = new Map();
export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.t > windowMs) { buckets.set(key, { t: now, n: 1 }); return; }
  b.n += 1;
  if (b.n > max) fail(429, 'too_many_requests');
}
