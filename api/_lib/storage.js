// ===== เก็บไฟล์รูป/วิดีโอ: Vercel Blob (ตั้ง BLOB_READ_WRITE_TOKEN) หรือโฟลเดอร์ .data/uploads =====
// ไฟล์ในเครื่อง: เปิดผ่าน /api/v1/files/<ชื่อ> ต้องเข้าสู่ระบบเป็นเจ้าของหรือทีมงาน
// Vercel Blob: ลิงก์สุ่มเดายาก (addRandomSuffix) · รูปลายมือ/ใบหน้าเป็นข้อมูลส่วนบุคคล อย่าเผยแพร่ลิงก์
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';
import { fail } from './http.js';

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' };
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
    const b = await put(`${folder}/${name}`, f.buf, { access: 'public', contentType: f.type, addRandomSuffix: true });
    return { url: b.url, type: f.type };
  }
  const dir = path.join(config.dataDir, 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), f.buf);
  return { url: `/api/v1/files/${name}`, type: f.type };
}

export function readLocalFile(name) {
  if (!/^[a-z]+-u[a-z0-9]+-[A-Za-z0-9_-]+\.[a-z0-9]+$/.test(name)) fail(404, 'not_found');
  const p = path.join(config.dataDir, 'uploads', name);
  if (!fs.existsSync(p)) fail(404, 'not_found');
  const ext = name.split('.').pop();
  const type = Object.keys(TYPES).find((t) => TYPES[t] === ext) || 'application/octet-stream';
  return { buf: fs.readFileSync(p), type, owner: name.split('-')[1] };
}
