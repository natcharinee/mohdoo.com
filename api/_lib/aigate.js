// ===== สิทธิ์ใช้แม่หมอ AI: จ่ายแล้วใช้ได้ (ไม่ต้องใช้รหัสทดลอง) =====
// ปุ่ม 1 ดูดวง (40 บาท)  → คำสั่งซื้อที่ชำระแล้วของผู้ใช้คนนั้น (order_no) · ใช้ได้ไม่เกิน MAX_USES ครั้งต่อคำสั่งซื้อ
// ปุ่ม 3 ดูดวงรายวัน      → สมาชิกรายเดือนที่ยังไม่หมดอายุ (ai_until)
// รหัสทดลอง MOHDOO_AI_CODE (header X-AI-Code) ยังใช้ได้สำหรับทีมงาน/ทดสอบ
import { timingSafeEqual } from 'node:crypto';
import { sessionUser } from './auth.js';
import { db } from './db.js';

const MAX_USES = 4; // แต่งใบผลดวงซ้ำ/อ่านรูปซ้ำได้เล็กน้อย (กันใช้ฟรีไม่จำกัด)
const PAID = ['paid', 'submitted', 'in_progress', 'answered', 'done'];

export function codeAllowed(given) {
  const codes = (process.env.MOHDOO_AI_CODE || '').split(',').map((c) => c.trim()).filter(Boolean);
  const g = Buffer.from(String(given || '').trim());
  return codes.some((c) => {
    const b = Buffer.from(c);
    return b.length === g.length && timingSafeEqual(b, g);
  });
}

// need: 'chat' (สมาชิกรายเดือน) · 'order' (คำสั่งซื้อที่จ่ายแล้ว หรือสมาชิกรายเดือน)
export async function aiAllowed(req, { need, orderNo, kinds }) {
  if (codeAllowed(req.headers['x-ai-code'])) return true;
  let u = null;
  try { u = await sessionUser(req); } catch (_) { return false; }
  if (!u) return false;
  const member = (u.ai_until || 0) > Date.now();
  if (need === 'chat') return member;
  if (orderNo) {
    const store = await db();
    const o = await store.get('order', String(orderNo).slice(0, 20));
    if (o && o.user_id === u.id && PAID.includes(o.status) && (!kinds || kinds.includes(o.kind)) && (o.ai_uses || 0) < MAX_USES) {
      o.ai_uses = (o.ai_uses || 0) + 1;
      await store.put('order', o);
      return true;
    }
  }
  return member; // สมาชิกรายเดือนใช้ใบผลดวงประจำวันได้
}

// ===== แชทแม่หมอ AI: จำกัดคำถามต่อวันแบบ fair use (สมาชิกรายวัน/รายเดือน) =====
// นับต่อผู้ใช้ต่อวัน (เวลาไทย) · รหัสทดลองของทีม (X-AI-Code) ไม่นับ
// ตั้งจำนวนได้ที่ MOHDOO_CHAT_DAILY (ค่าเริ่มต้น 30 คำถาม/วัน)
export const CHAT_DAILY = Math.max(1, parseInt(process.env.MOHDOO_CHAT_DAILY, 10) || 30);
const bkkDay = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const quota = (used) => ({ used, limit: CHAT_DAILY, left: Math.max(0, CHAT_DAILY - used) });

// → { ok:false } | { ok:true, team:true } | { ok:true, user, quota }
export async function chatAccess(req) {
  if (codeAllowed(req.headers['x-ai-code'])) return { ok: true, team: true };
  let u = null;
  try { u = await sessionUser(req); } catch (_) { return { ok: false }; }
  if (!u || !((u.ai_until || 0) > Date.now())) return { ok: false };
  const store = await db();
  const doc = await store.get('aiuse', `${u.id}:${bkkDay()}`);
  return { ok: true, user: u, quota: quota(doc?.n ?? doc?.count ?? 0) }; // n = ตัวนับแบบใหม่ (incr) · count = เอกสารแบบเดิม
}

// นับหลังตอบสำเร็จเท่านั้น (ถามแล้ว AI ล่ม ไม่เสียสิทธิ์)
export async function chatCount(user) {
  const store = await db();
  const id = `${user.id}:${bkkDay()}`;
  // นับเพิ่มแบบทำในครั้งเดียว (ถามพร้อมกันหลายคำถามก็นับครบ ไม่เกินโควตา)
  const n = await store.incr('aiuse', id, Date.now());
  return quota(n);
}
