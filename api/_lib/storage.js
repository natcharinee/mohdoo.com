// ===== เก็บไฟล์รูป/วิดีโอ: Vercel Blob (ตั้ง BLOB_READ_WRITE_TOKEN) หรือโฟลเดอร์ .data/uploads =====
// ไฟล์ในเครื่อง: เปิดผ่าน /api/v1/files/<ชื่อ> ต้องเข้าสู่ระบบเป็นเจ้าของหรือทีมงาน
// Vercel Blob: ไฟล์ทุกชนิดอัปโหลดแบบ private (ต้องใช้ Blob store ชนิด private) แล้วเปิดผ่าน /api/v1/files/<ชื่อ>
//   · photo-/proof- (ลายมือ/ใบหน้า/หลักฐานพิธี): ต้องเข้าสู่ระบบเป็นเจ้าของหรือทีมงาน · seerimg-/shopimg- (รูปหมอดู/สินค้า): เปิดได้ทุกคน
//   · ถ้า store เป็นชนิด public → อัปโหลด private ไม่ได้ → สำรองเป็นลิงก์สาธารณะแบบเดิมพร้อมเตือนใน log (รูปส่วนตัวจะไม่ปลอดภัย)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';
import { fail } from './http.js';

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' };
// รูปสินค้า/โปรไฟล์หมอดู = ข้อมูลสาธารณะ (เปิดโดยไม่ต้องล็อกอิน) · โฟลเดอร์อื่นเป็นของส่วนตัว
export const PUBLIC_FOLDERS = ['seerimg', 'shopimg'];
const FOLDERS = ['photo', 'proof', ...PUBLIC_FOLDERS];
export const MAX_BYTES = 8 * 1024 * 1024;

export function parseDataUrl(s) {
  const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(s || ''));
  if (!m || !TYPES[m[1]]) fail(400, 'bad_file');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > MAX_BYTES) fail(413, 'file_too_large');
  return { type: m[1], ext: TYPES[m[1]], buf };
}

// owner = user id เจ้าของไฟล์ (ใช้ตรวจสิทธิ์ไฟล์ในเครื่อง)
export async function saveFile(dataUrl, { folder, owner }) {
  const f = parseDataUrl(dataUrl);
  const name = `${folder}-${owner}-${crypto.randomBytes(9).toString('base64url')}.${f.ext}`;
  if (config.storage === 'blob') {
    const { put } = await import('@vercel/blob');
    try {
      await put(`${folder}/${name}`, f.buf, { access: 'private', contentType: f.type, addRandomSuffix: false });
      return { url: `/api/v1/files/${name}`, type: f.type };
    } catch (e) { console.warn('[storage] อัปโหลดแบบ private ไม่ได้ (Blob store ต้องเป็นชนิด private) ใช้ลิงก์สาธารณะแทน:', e.message); }
    const b = await put(`${folder}/${name}`, f.buf, { access: 'public', contentType: f.type, addRandomSuffix: true });
    return { url: b.url, type: f.type };
  }
  const dir = path.join(config.dataDir, 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), f.buf);
  return { url: `/api/v1/files/${name}`, type: f.type };
}

// ลบไฟล์ที่เราเก็บไว้ (ใช้ตอนลบบัญชีตาม PDPA) · ลิงก์ภายนอกไม่แตะ · ลบไม่สำเร็จไม่ทำให้งานหลักล้ม
export async function deleteFile(url) {
  try {
    const m = /^\/api\/v1\/files\/([A-Za-z0-9_.-]+)$/.exec(String(url || ''));
    if (m) {
      fs.rmSync(path.join(config.dataDir, 'uploads', m[1]), { force: true });
      const folder = m[1].split('-')[0];
      if (config.storage === 'blob' && FOLDERS.includes(folder)) { const { del } = await import('@vercel/blob'); await del(`${folder}/${m[1]}`); }
      return true;
    }
    if (config.storage === 'blob' && /^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//.test(String(url || ''))) {
      const { del } = await import('@vercel/blob');
      await del(url);
      return true;
    }
  } catch (e) { console.error('[deleteFile]', e.message); }
  return false;
}

export function readLocalFile(name) {
  if (!/^[a-z]+-u[a-z0-9]+-[A-Za-z0-9_-]+\.[a-z0-9]+$/.test(name)) fail(404, 'not_found');
  const p = path.join(config.dataDir, 'uploads', name);
  if (!fs.existsSync(p)) fail(404, 'not_found');
  const ext = name.split('.').pop();
  const type = Object.keys(TYPES).find((t) => TYPES[t] === ext) || 'application/octet-stream';
  return { buf: fs.readFileSync(p), type, owner: name.split('-')[1] };
}

// อ่านไฟล์: ในเครื่องก่อน ไม่มีแล้วค่อยไป Blob (private) · เจ้าของดูจากชื่อไฟล์
// วิดีโอคืนเป็น stream (ฟังก์ชัน Vercel ตอบแบบก้อนเดียวได้ไม่เกิน ~4.5 MB แต่แบบ stream ไม่ติดขีดนี้) · รูปภาพคืนเป็น buf
export async function readFile(name) {
  try { return readLocalFile(name); } catch (e) { if (config.storage !== 'blob') throw e; }
  const folder = name.split('-')[0];
  if (!FOLDERS.includes(folder)) fail(404, 'not_found');
  const { get } = await import('@vercel/blob');
  const r = await get(`${folder}/${name}`, { access: 'private' }).catch(() => null);
  if (!r || !r.stream) fail(404, 'not_found');
  const ext = name.split('.').pop();
  const type = Object.keys(TYPES).find((t) => TYPES[t] === ext) || 'application/octet-stream';
  const out = { type, owner: name.split('-')[1], size: r.blob.size };
  if (type.startsWith('video/')) out.stream = r.stream; else out.buf = Buffer.from(await new Response(r.stream).arrayBuffer());
  return out;
}
