// ===== เซิร์ฟเวอร์สำหรับพัฒนาในเครื่อง: หน้าเว็บ + /api/* แบบเดียวกับ Vercel =====
// ใช้: npm run dev   (ค่าเริ่มต้น: OTP_DEMO=1 PAY_DEMO=1 ADMIN_PHONES=+66812345678 · รหัส OTP ทดลอง 123456 · ข้อมูลอยู่ใน .data/)
// ADMIN_PHONES=+66812345678 npm run dev  → เบอร์นี้เข้า admin.html ได้
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

process.env.OTP_DEMO ??= '1';
process.env.PAY_DEMO ??= '1';
process.env.ADMIN_PHONES ??= '+66812345678'; // เครื่องตัวเองเท่านั้น: เบอร์ 0812345678 เข้าหลังบ้านได้ (บน Vercel ตั้งเองใน Environment Variables)
const PORT = +(process.env.PORT || 5174);
const ROOT = process.cwd();
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8' };
// header ความปลอดภัยแบบเดียวกับบนเว็บจริง (อ่านจาก vercel.json) · รองรับ source แบบ "/(.*)" และ path ตรงตัว
const VERCEL_HEADERS = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')).headers || []; } catch (_) { return []; } })();
function applyHeaders(res, pathname) {
  for (const h of VERCEL_HEADERS) {
    if (h.source === '/(.*)' || h.source === pathname) for (const { key, value } of h.headers) res.setHeader(key, value);
  }
}
const API = { '/api/v1': './api/v1.js', '/api/chat': './api/chat.js', '/api/reading': './api/reading.js', '/api/slip': './api/slip.js' };

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > 20 * 1024 * 1024) { reject(new Error('too_large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
// res แบบ Vercel: res.status().json()
function vercelRes(res) {
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); return res; };
  return res;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const base = Object.keys(API).find((p) => url.pathname === p || url.pathname.startsWith(`${p}/`));
  if (base) {
    try {
      const raw = await readBody(req);
      const ct = String(req.headers['content-type'] || '');
      req.body = ct.includes('application/json') ? (raw.length ? JSON.parse(raw.toString('utf8')) : {}) : raw.toString('utf8');
      req.query = Object.fromEntries(url.searchParams);
      const mod = await import(API[base]);
      await mod.default(req, vercelRes(res));
    } catch (e) {
      console.error(e);
      if (!res.headersSent) { res.statusCode = 400; res.end('{"error":"bad_request"}'); }
    }
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, path.normalize(p));
  // ไม่เปิดไฟล์ระบบ/ข้อมูล (.data, .git, api, node_modules)
  if (!file.startsWith(ROOT) || /\/(\.|api\/|node_modules\/)/.test(file.slice(ROOT.length))) { res.statusCode = 404; return res.end('not found'); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    applyHeaders(res, url.pathname);
    res.end(buf);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`หมอดู.com dev → http://localhost:${PORT}  ·  หลังบ้าน → http://localhost:${PORT}/admin.html`);
  console.log(`OTP_DEMO=${process.env.OTP_DEMO} PAY_DEMO=${process.env.PAY_DEMO} ADMIN_PHONES=${process.env.ADMIN_PHONES || '(ไม่ได้ตั้ง)'}`);
});
