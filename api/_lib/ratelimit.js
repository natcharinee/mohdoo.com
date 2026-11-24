// ===== จำกัดจำนวนครั้ง (rate limit) ที่ใช้ร่วมกันทุกเครื่อง =====
// Vercel เปิดหลายเครื่องพร้อมกันและล้างหน่วยความจำบ่อย → นับในฐานข้อมูล (คอลเลกชัน rate) แบบช่วงเวลาคงที่
// ฐานข้อมูลมีปัญหา → นับในหน่วยความจำแทน (ยังกันได้บางส่วน ไม่ทำให้ทั้งระบบล่ม)
import { db } from './db.js';
import { fail, rateLimit as memoryLimit } from './http.js';

export async function rateLimit(key, max, windowMs) {
  const start = Math.floor(Date.now() / windowMs) * windowMs;
  let n;
  try {
    n = await (await db()).incr('rate', `${key}@${start}`, start);
  } catch (e) {
    console.error('[ratelimit] ใช้หน่วยความจำแทน:', e.message);
    return memoryLimit(key, max, windowMs);
  }
  if (n > max) fail(429, 'too_many_requests', { retry: Math.ceil((start + windowMs - Date.now()) / 1000) });
}
// ลบตัวนับที่หมดช่วงแล้ว (เรียกจากงานประจำวัน)
export async function cleanRate(olderThanMs = 2 * 864e5) {
  await (await db()).delWhere('rate', { before: Date.now() - olderThanMs });
}
