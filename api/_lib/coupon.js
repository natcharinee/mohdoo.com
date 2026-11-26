// ===== โค้ดส่วนลด =====
// เอกสาร coupon (id = โค้ดตัวพิมพ์ใหญ่) · ตัวนับการใช้: couponuse (id = โค้ด ทั้งระบบ · id = โค้ด:รหัสลูกค้า ต่อคน)
// นับตอนสร้าง QR (จองสิทธิ์) และคืนเมื่อ QR หมดอายุ/ยกเลิก · ตัวนับเปลี่ยนแบบกันบันทึกทับ (rev) → กดพร้อมกันก็ไม่เกินโควตา
import { db } from './db.js';
import { fail } from './http.js';

export const MIN_PAY = 20; // ยอดค่าบริการหลังลดต่ำสุด (Omise/พร้อมเพย์ไม่รับยอดต่ำกว่า 20 บาท)
export const COUPON_SCOPES = { all: 'ทุกอย่าง', service: 'บริการดูดวง/บริการมงคล', shop: 'สินค้า', ai: 'สมาชิก AI' };
export const COUPON_MAX = 200;
const SCOPE_KINDS = { service: ['ask', 'instant', 'reading', 'photo', 'merit'], shop: ['shop', 'digital'], ai: ['ai'] };
export const normCode = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 20);

export async function getCoupon(code) { return code ? (await (await db()).get('coupon', code)) : null; }

// it = รายการจาก priceOf (price = ค่าบริการ/สินค้า ไม่รวมเงินทำบุญ) → คืนส่วนลด (บาท) หรือ throw
export function evalCoupon(c, it, now = Date.now()) {
  if (!c || !c.active) fail(400, 'coupon_invalid');
  if (c.starts_at && now < c.starts_at) fail(400, 'coupon_not_started');
  if (c.ends_at && now >= c.ends_at) fail(400, 'coupon_expired');
  if (c.scope !== 'all' && !(SCOPE_KINDS[c.scope] || []).includes(it.kind)) fail(400, 'coupon_scope');
  if (c.min_amount && it.price < c.min_amount) fail(400, 'coupon_min', { min: c.min_amount });
  let d = c.type === 'percent' ? Math.floor((it.price * c.value) / 100) : c.value;
  d = Math.min(d, it.price - MIN_PAY);
  if (!(d > 0)) fail(400, 'coupon_na');
  return d;
}
export function applyDiscount(it, d) {
  it.original_price = it.price;
  it.discount = d;
  it.price -= d;
  it.amount -= d;
}

const useDoc = async (id) => (await (await db()).get('couponuse', id)) || { n: 0 };
// ตรวจโควตาโดยไม่จอง (ใช้ตอนลูกค้ากด "ใช้โค้ด" เพื่อดูตัวอย่างราคา)
export async function checkCouponLimits(c, userId) {
  if (c.max_uses > 0 && (await useDoc(c.id)).n >= c.max_uses) fail(400, 'coupon_used_up');
  if (c.per_user > 0 && (await useDoc(`${c.id}:${userId}`)).n >= c.per_user) fail(400, 'coupon_user_limit');
}

// เพิ่ม/ลดตัวนับแบบกันทับ · limit > 0 และเกิน → คืน false · ลดแล้วไม่ติดลบ
async function bump(id, delta, limit = 0) {
  const store = await db();
  for (let i = 0; i < 10; i++) {
    const d = await store.get('couponuse', id);
    if (!d && delta < 0) return true;
    const n = d?.n || 0;
    if (delta > 0 && limit > 0 && n + delta > limit) return false;
    const rev = d?.rev || 0;
    if (await store.putIf('couponuse', { ...(d || {}), id, n: Math.max(0, n + delta), rev: rev + 1, created_at: d?.created_at || Date.now(), updated_at: Date.now() }, rev)) return true;
  }
  fail(503, 'busy');
}
export async function reserveCoupon(c, userId) {
  if (c.per_user > 0 && !(await bump(`${c.id}:${userId}`, 1, c.per_user))) fail(400, 'coupon_user_limit');
  if (!(await bump(c.id, 1, c.max_uses || 0))) {
    if (c.per_user > 0) await bump(`${c.id}:${userId}`, -1);
    fail(400, 'coupon_used_up');
  }
}
export async function releaseCoupon(code, userId) {
  await bump(code, -1);
  await bump(`${code}:${userId}`, -1);
}
export const couponUsed = async (code) => (await useDoc(code)).n;
