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
