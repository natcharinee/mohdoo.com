// ===== ระบบหลังบ้าน หมอดู.com · API เดียวรวมทุกเส้นทาง (/api/v1/...) =====
// vercel.json ส่ง /api/v1/<path> มาที่ไฟล์นี้ (?p=<path>) · เครื่องพัฒนาใช้ dev-server.mjs
// ทุกอย่างทำงานได้โดยไม่ต้องตั้งค่า (โหมดทดลอง) และเปลี่ยนเป็นของจริงเมื่อใส่ Environment Variables (ดู BACKEND.md)
import { config } from './_lib/config.js';
import { db, newId, updateDoc } from './_lib/db.js';
import { HttpError, fail, send, bodyOf, str, int, ipOf } from './_lib/http.js';
import { rateLimit, cleanRate } from './_lib/ratelimit.js';
import { MIN_PAY, COUPON_SCOPES, COUPON_MAX, normCode, getCoupon, evalCoupon, applyDiscount, checkCouponLimits, reserveCoupon, releaseCoupon, couponUsed } from './_lib/coupon.js';
import { aiDay, bkkDay, ALERT_USD, CAP_USD } from './_lib/aiusage.js';
import { startSession, endSession, sessionUser, needUser, needRole, normPhone, sendOtp, checkOtp, userForPhone, ROLES, STAFF, BACKOFFICE, DEMO_CODE } from './_lib/auth.js';
import { priceOf, catalog, addMonth, KIND_NAME, syncSeerProfiles, resetSeerProfiles, publicSiteCfg, PRICE_RANGE, CUSTOM_MAX, CUSTOM_KINDS, FIELD_TYPES } from './_lib/catalog.js';
import { createPayment, paymentStatus, chargeIdFromEvent, refundPayment } from './_lib/pay.js';
import { saveFile, readFile, deleteFile, PUBLIC_FOLDERS } from './_lib/storage.js';
import { notify, savePush } from './_lib/notify.js';
import { kbOverrides, kbDoc, saveKB } from './_lib/kb.js';
import { KB_TABLES, DEFAULT_KB, PAIR_LEVELS, KB_SCHEMA } from '../lib/calc/kb.js';

export const STATUS = {
  pending: 'รอชำระเงิน', paid: 'ชำระแล้ว · รอกรอกข้อมูล', submitted: 'รอหมอดูตอบ', in_progress: 'กำลังดำเนินการ',
  answered: 'หมอดูตอบแล้ว', shipped: 'จัดส่งแล้ว', done: 'เสร็จสิ้น', cancelled: 'ยกเลิก', expired: 'QR หมดอายุ', refunded: 'คืนเงินแล้ว',
};
const PAID = ['paid', 'submitted', 'in_progress', 'answered', 'shipped', 'done'];
const SEER_KINDS = ['reading', 'photo'];

// ---------- ข้อมูลที่ส่งให้ลูกค้า (ไม่รวมบันทึกภายใน) ----------
function pubOrder(o) {
  return {
    no: o.no, key: o.key, kind: o.kind, title: o.title, icon: o.icon, label: o.label, amount: o.amount, price: o.price, donation: o.donation,
    status: o.status, status_text: STATUS[o.status], created_at: o.created_at, paid_at: o.paid_at || null, updated_at: o.updated_at,
    variant: o.variant || null, original_price: o.original_price || null, discount: o.discount || 0, coupon: o.coupon || '', // ส่วนลด: ราคาเดิม · ส่วนลด · โค้ด (amount = ยอดจ่ายจริง)
    steps: o.steps, step: o.step || 0, answer: o.answer || '', summary: o.summary || '', answered_by: o.answered_by ? (o.answered_by === 'ai' ? 'ai' : 'seer') : '',
    proof: o.proof || [], tracking: o.tracking || null, qr: o.status === 'pending' ? o.pay?.qr || null : null,
    expires_at: o.status === 'pending' ? o.pay?.expires_at : null, demo: o.pay?.provider === 'demo', form: o.form || null, photos: o.photos || [],
  };
}
const pubUser = (u) => ({ id: u.id, phone: u.phone, role: u.role, seer_id: u.seer_id || null, name: u.name, ai_until: u.ai_until || 0, profile: u.profile, created_at: u.created_at });
// ---------- ประวัติการทำงานของทีมงาน (audit log) · ดูได้ที่หลังบ้าน → ประวัติการทำงาน (ผู้ดูแลเท่านั้น) ----------
// บันทึกว่าใครทำอะไรกับใคร เมื่อไร · บันทึกไม่สำเร็จจะไม่ทำให้งานหลักล้ม · เก็บ 1 ปี (ลบเก่าในงานประจำวัน)
export const AUDIT_ACTIONS = {
  login: 'เข้าสู่ระบบหลังบ้าน', role: 'เปลี่ยนสิทธิ์', block: 'ระงับบัญชี', unblock: 'ยกเลิกการระงับ', kick: 'ให้ออกจากระบบทุกเครื่อง',
  ai_days: 'ให้/ปรับสมาชิก AI', seer_link: 'เชื่อมโปรไฟล์หมอดู', user_note: 'บันทึกในบัญชีลูกค้า',
  mark_paid: 'ยืนยันรับเงินเอง', refund: 'คืนเงิน', cancel: 'ยกเลิกคำสั่งซื้อ',
  seer_invite: 'เพิ่มหมอดู', seer_price: 'ตั้งราคาหมอดู', seer_profile: 'แก้โปรไฟล์หมอดู', seer_profile_new: 'เพิ่มโปรไฟล์หมอดู',
  seer_profile_reset: 'คืนค่าโปรไฟล์หมอดู', seer_profile_delete: 'ลบโปรไฟล์หมอดู', coupon: 'โค้ดส่วนลด', team_invite: 'เพิ่มทีมงาน', pricing: 'แก้ราคาและบริการ', custom: 'สร้าง/แก้/ลบ บริการและสินค้าใหม่', seer_app: 'ตรวจใบสมัครหมอดู', seer_app_delete: 'ลบใบสมัครหมอดู',
  pdpa_export: 'ส่งออกข้อมูลลูกค้า (PDPA)', pdpa_erase: 'ลบบัญชีตามคำขอ (PDPA)', pdpa_self_export: 'ลูกค้าดาวน์โหลดข้อมูลตัวเอง', pdpa_self_erase: 'ลูกค้าลบบัญชีเอง',
  broadcast: 'ส่งประกาศ', export: 'ส่งออกข้อมูลคำสั่งซื้อ', stock: 'แก้สต๊อก', kb: 'แก้ตำราดูดวง', kb_restore: 'ย้อนเวอร์ชันตำรา', cron: 'สั่งงานประจำวันเอง',
};
const AUDIT_DAYS = 365;
async function audit(staff, action, target = {}, detail = {}) {
  try {
    await (await db()).put('audit', {
      id: newId('a'), created_at: Date.now(), action, status: action, // status = ช่องค้นหาตามประเภทการกระทำ
      by: staff?.id || 'system', who: staff ? staff.name || staff.phone : 'ระบบ', role: staff?.role || '',
      target: { type: target.type || '', id: target.id || '', label: str(target.label, 80) }, user_id: target.type === 'user' ? target.id : null,
      detail,
    });
  } catch (e) { console.error('[audit]', e); }
}
const userLabel = (u) => u.name || u.profile?.first || u.phone;
const log = (o, by, action, extra = {}) => { (o.log ||= []).push({ at: Date.now(), by: by ? by.id : 'system', who: by ? by.name || by.phone : 'ระบบ', action, ...extra }); };

async function orderNo(store) {
  const d = new Date(Date.now() + 7 * 3600e3).toISOString().slice(2, 10).replace(/-/g, '');
  for (;;) {
    const no = `MD${d}${String(Math.floor(Math.random() * 1e4)).padStart(4, '0')}`;
    if (!(await store.get('order', no))) return no;
  }
}
async function getOrder(no) {
  const o = await (await db()).get('order', str(no, 20));
  if (!o) fail(404, 'order_not_found');
  return o;
}
async function ownOrder(req, no) {
  const u = await needUser(req);
  const o = await getOrder(no);
  if (o.user_id !== u.id) fail(404, 'order_not_found');
  return { u, o };
}
// บันทึกคำสั่งซื้อแบบกันเขียนทับ: rev = เลขเวอร์ชัน ถ้ามีคน/ระบบอื่นแก้ไปก่อน → 409 conflict (ให้โหลดใหม่แล้วทำอีกครั้ง)
const stockBack = new WeakMap(); // สต๊อกที่รอคืน · คืนจริงหลังบันทึกคำสั่งซื้อสำเร็จเท่านั้น (กันคืนซ้ำ)
async function saveOrder(o) {
  const prev = o.rev || 0;
  o.rev = prev + 1; o.updated_at = Date.now();
  if (!(await (await db()).putIf('order', o, prev))) { o.rev = prev; stockBack.delete(o); fail(409, 'conflict'); }
  const back = stockBack.get(o);
  if (back) {
    stockBack.delete(o);
    if (back.stock) await adjustStock(back.stock.id, back.stock.qty);
    if (back.coupon) await releaseCoupon(back.coupon.code, back.coupon.user);
  }
  return o;
}
// แก้คำสั่งซื้อที่อาจชนกับระบบอื่น (webhook / งานประจำวัน / หน้าเว็บลูกค้า): ชนกัน → โหลดใหม่แล้วลองอีกครั้ง
async function withOrder(o, fn) {
  for (let i = 0; ; i++) {
    try { return await fn(o); } catch (e) {
      if (e.status !== 409 || i >= 2) throw e;
      o = await getOrder(o.no);
    }
  }
}

// ---------- สต๊อกวัตถุมงคล: ไม่มีข้อมูล = ไม่จำกัด · จองตอนสร้าง QR · คืนเมื่อ QR หมดอายุหรือยกเลิกก่อนส่ง ----------
// ปรับสต๊อกแบบกันขายเกิน: อ่าน → ตรวจ → เขียนเฉพาะเมื่อไม่มีใครแก้แทรก (ไม่งั้นอ่านใหม่แล้วลองอีก)
async function adjustStock(id, delta) {
  const store = await db();
  for (let i = 0; i < 8; i++) {
    const d = await store.get('stock', id);
    if (!d || d.qty == null) return null; // ไม่จำกัดจำนวน
    if (d.qty + delta < 0) fail(409, 'out_of_stock', { left: d.qty });
    const rev = d.rev || 0;
    if (await store.putIf('stock', { ...d, qty: d.qty + delta, rev: rev + 1, updated_at: Date.now() }, rev)) return d.qty + delta;
  }
  fail(503, 'busy');
}
async function takeStock(o) {
  if (o.kind !== 'shop') return;
  await adjustStock(o.stock_key || o.item_id, -o.qty); // สินค้ามีตัวเลือก: สต๊อกแยกตามแบบ (stock_key = รหัสสินค้า:รหัสแบบ)
  o.stock_held = true;
}
// ทำเครื่องหมายว่าคืนสต๊อกแล้ว · คืนจริงตอน saveOrder สำเร็จ
async function releaseStock(o) {
  const back = stockBack.get(o) || {};
  if (o.coupon_held) { o.coupon_held = false; back.coupon = { code: o.coupon, user: o.user_id }; } // คืนสิทธิ์โค้ดส่วนลดด้วย
  if (o.stock_held && !o.stock_released) { o.stock_released = true; back.stock = { id: o.stock_key || o.item_id, qty: o.qty }; }
  if (back.coupon || back.stock) stockBack.set(o, back);
}
// คืนทันที (ใช้เมื่อคำสั่งซื้อยังไม่ถูกบันทึก เช่น สร้าง QR ไม่สำเร็จ)
async function releaseNow(o) {
  await releaseStock(o);
  const back = stockBack.get(o);
  if (!back) return;
  stockBack.delete(o);
  if (back.stock) await adjustStock(back.stock.id, back.stock.qty);
  if (back.coupon) await releaseCoupon(back.coupon.code, back.coupon.user);
}
async function stockMap() {
  const { rows } = await (await db()).list('stock', { limit: 5000 }); // รวมสต๊อกแยกตามแบบของสินค้าที่มีตัวเลือก
  return Object.fromEntries(rows.map((d) => [d.id, d.qty]));
}

// ชำระเงินสำเร็จ → เปลี่ยนสถานะตามประเภทงาน
// webhook กับหน้าเว็บลูกค้าอาจยืนยันพร้อมกัน → ชนกันแล้วโหลดใหม่ จะเห็นว่าจ่ายแล้ว ไม่ทำซ้ำ
const markPaid = (o, by, via) => withOrder(o, (x) => markPaidOnce(x, by, via));
async function markPaidOnce(o, by, via) {
  if (o.status !== 'pending' && o.status !== 'expired') return o;
  const store = await db();
  o.status = 'paid';
  o.paid_at = Date.now();
  log(o, by, 'paid', { via });
  if (o.kind === 'instant') o.status = 'done';
  let u = null;
  if (o.kind === 'ai') {
    u = await store.get('user', o.user_id);
    if (u) o.ai_until = addMonth(Math.max(u.ai_until || 0, Date.now())); // ต่อจากวันหมดอายุเดิมถ้ายังไม่หมด
    o.status = 'done';
  }
  await saveOrder(o); // บันทึกคำสั่งซื้อก่อน แล้วค่อยต่ออายุสมาชิก (ชนกันจะไม่ต่อซ้ำ)
  // ต่ออายุจากค่าล่าสุดในฐานข้อมูล (ผู้ดูแลอาจแถมวันไปพร้อมกัน) · บันทึกแบบกันทับ
  if (u) await updateDoc('user', u.id, (x) => { x.ai_until = addMonth(Math.max(x.ai_until || 0, Date.now())); x.ai_reminded = 0; x.updated_at = Date.now(); });
  await notify(o.user_id, { title: 'ชำระเงินสำเร็จ ✓', body: `${o.title} · ${o.amount.toLocaleString('th-TH')} ฿ · ${o.no}`, order_no: o.no });
  await notifyTeam(o).catch((e) => console.error('[notifyTeam]', e)); // แจ้งทีมไม่สำเร็จ ไม่ให้กระทบการชำระเงิน
  return o;
}
// งานที่ต้องใช้คน (หมอดูตอบ · อ่านรูป · บริการมงคล · ส่งสินค้า/ไฟล์) → แจ้งทีมงานและผู้ดูแลทุกคน
// ดูเองทันที / สมาชิก AI / ถามแล้วรู้ผลทันที ระบบทำให้อัตโนมัติ ไม่ต้องแจ้ง
const TEAM_KINDS = { reading: 'งานหมอดูตอบ', photo: 'งานอ่านรูป', merit: 'บริการมงคล', shop: 'สินค้าต้องจัดส่ง', digital: 'สินค้าดิจิทัล' };
async function notifyTeam(o) {
  if (!TEAM_KINDS[o.kind]) return 0;
  const store = await db();
  const team = (await Promise.all(BACKOFFICE.map((r) => store.list('user', { status: r, limit: 200 })))).flatMap((x) => x.rows).filter((u) => !u.blocked);
  for (const u of team) await notify(u.id, { title: `คำสั่งซื้อใหม่ · ${TEAM_KINDS[o.kind]} 🧾`, body: `${o.title} · ${o.amount.toLocaleString('th-TH')} ฿ · ${o.no}`, link: `/admin.html#order/${o.no}` });
  return team.length;
}
const refreshPayment = (o) => withOrder(o, refreshPaymentOnce);
async function refreshPaymentOnce(o) {
  if (o.status !== 'pending') return o;
  if (o.pay?.provider === 'omise') {
    const s = await paymentStatus(o.pay).catch(() => 'pending');
    if (s === 'paid') return markPaid(o, null, 'omise');
    if (s === 'failed') { o.status = 'expired'; await releaseStock(o); log(o, null, 'payment_failed'); return saveOrder(o); }
  }
  if (o.pay?.expires_at && o.pay.expires_at < Date.now() - 60e3 && o.pay.provider !== 'omise') { o.status = 'expired'; await releaseStock(o); return saveOrder(o); }
  return o;
}

// ---------- ฟอร์มจากลูกค้า ----------
function cleanForm(form) {
  const out = {};
  Object.entries(form && typeof form === 'object' ? form : {}).slice(0, 40).forEach(([k, v]) => {
    const key = str(k, 40).replace(/[^\w-]/g, '');
    if (key) out[key] = str(v, 3000);
  });
  return out;
}
const cleanFields = (f) => (Array.isArray(f) ? f.slice(0, 40).map((x) => [str(x?.[0], 40), str(x?.[1], 120)]).filter((x) => x[0]) : []);

// =====================================================================
//                               เส้นทาง
// =====================================================================
const routes = [];
const on = (method, pattern, fn) => {
  const keys = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
  routes.push({ method, re, keys, fn });
};

// ---------- สถานะระบบ ----------
on('GET', 'health', async () => {
  const store = await db();
  return {
    ok: true, version: 1, db: store.kind, otp: config.otp, pay: config.pay, storage: config.storage,
    push: config.vapid ? config.vapid.pub : null, ai: config.ai, demo_code: config.otp === 'demo' ? DEMO_CODE : undefined,
    human_open: [...(await humanOpen())], // ศาสตร์ที่ตอนนี้มีหมอดูจริงรับงาน (หน้าเว็บใช้เปิดประเภทที่ซ่อนไว้)
  };
});

// ---------- เข้าสู่ระบบ ----------
on('POST', 'auth/otp', async (req) => {
  const b = bodyOf(req);
  const phone = normPhone(b.phone);
  await rateLimit(`otp-ip:${ipOf(req)}`, 30, 10 * 60e3); // เครือข่ายมือถือไทยใช้ IP ร่วมกัน · ต่อเบอร์จำกัด 1 ครั้ง/นาทีอยู่แล้ว
  const exists = !!(await (await db()).byKey('user', phone))?.profile;
  // สมัครด้วยเบอร์ที่มีบัญชีแล้ว → ให้หน้าเว็บเปลี่ยนเป็นเข้าสู่ระบบ (ยังไม่ส่ง SMS)
  if (b.mode === 'register' && exists) return { exists: true, sent: false };
  // ค่า SMS: ต่อเบอร์ไม่เกิน 8 ครั้ง/วัน · ทั้งระบบไม่เกิน OTP_HOURLY_CAP (ค่าเริ่มต้น 300) ครั้ง/ชม. กันถูกยิงจนบิลบาน
  await rateLimit(`otp-phone:${phone}`, 8, 864e5);
  await rateLimit('otp-all', config.otpHourlyCap, 3600e3);
  const r = await sendOtp(phone);
  return { exists, sent: true, demo: r.demo || undefined };
});
on('POST', 'auth/verify', async (req, res) => {
  const b = bodyOf(req);
  const phone = normPhone(b.phone);
  await rateLimit(`verify-ip:${ipOf(req)}`, 30, 10 * 60e3);
  await rateLimit(`verify-phone:${phone}`, 20, 3600e3); // ขอรหัสใหม่ได้ แต่เดารหัสรวมไม่เกิน 20 ครั้ง/ชม. ต่อเบอร์
  await checkOtp(phone, b.code);
  const { user, isNew } = await userForPhone(phone);
  if (user.blocked) fail(403, 'blocked');
  startSession(res, user);
  if (BACKOFFICE.includes(user.role)) await audit(user, 'login', { type: 'user', id: user.id, label: userLabel(user) }, { ip: ipOf(req) });
  return { isNew, user: pubUser(user) };
});
on('POST', 'auth/logout', async (req, res) => { endSession(res); return { ok: true }; });

// ---------- บัญชีของฉัน ----------
on('GET', 'me', async (req) => {
  const u = await sessionUser(req);
  return { user: u ? pubUser(u) : null };
});
on('PUT', 'me', async (req) => {
  const u = await needUser(req);
  const b = bodyOf(req);
  const p = b.profile;
  if (!p || typeof p !== 'object' || Array.isArray(p)) fail(400, 'bad_profile');
  const { photos, photoLog, aiUntil, phone, role, seerId, ...rest } = p; // รูปเก็บแยก · สิทธิ์/วันหมดอายุเป็นของเซิร์ฟเวอร์
  if (phone && phone !== u.phone) fail(409, 'account_mismatch'); // กันโปรไฟล์ของอีกบัญชีมาทับ
  const json = JSON.stringify(rest);
  if (json.length > 600_000) fail(413, 'profile_too_large');
  // แก้เฉพาะโปรไฟล์ · สิทธิ์ บันทึกของทีม วันสมาชิก ที่ผู้ดูแลแก้พร้อมกันไม่หาย
  const saved = await updateDoc('user', u.id, (x) => { x.profile = JSON.parse(json); x.name = str(rest.name || rest.first, 60); x.updated_at = Date.now(); });
  if (!saved) fail(401, 'login_required');
  Object.assign(u, saved);
  if (u.role === 'seer') resetHumanOpen(); // หมอดูสมัครครบ → ศาสตร์ของท่านเปิดขายได้
  return { ok: true, updated_at: u.updated_at };
});
// =====================================================================
// PDPA: ขอสำเนาข้อมูล (มาตรา 30–31) และขอลบ (มาตรา 33)
// ลูกค้าทำเองได้ในหน้า "บัญชี" (ยืนยันตัวตนด้วย OTP แล้ว) · ผู้ดูแลทำแทนได้ในหลังบ้าน เมื่อลูกค้าเข้าบัญชีไม่ได้
// =====================================================================
const isoTimes = (k, v) => (typeof v === 'number' && v > 1e12 && /(_at|_until|^at)$/.test(k) ? new Date(v).toISOString() : v);
async function userData(u) {
  const store = await db();
  const { rows: orders } = await store.list('order', { user_id: u.id, limit: 5000 });
  const { rows: notifs } = await store.list('notif', { user_id: u.id, limit: 1000 });
  const app = await store.byKey('seerapp', u.phone);
  return {
    about: 'ข้อมูลส่วนบุคคลของคุณที่หมอดู.com เก็บไว้ (สำเนาตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล)',
    controller: 'บริษัท ยูนิเวอร์ซ่า จำกัด · LINE @mohdoo',
    exported_at: Date.now(),
    account: { id: u.id, phone: u.phone, name: u.name || '', role: u.role, created_at: u.created_at, last_login_at: u.last_login, ai_until: u.ai_until || 0, blocked: !!u.blocked },
    profile: u.profile || null, // ข้อมูลเกิด ประวัติการดูดวง และค่าที่ตั้งไว้
    orders: orders.map((o) => {
      const { qr, expires_at: _e, ...p } = pubOrder(o);
      return { ...p, fields: o.fields || [], place: o.place || '', photo_consent_at: o.photo_consent_at || null, refund: o.refund ? { amount: o.refund.amount, at: o.refund.at } : null };
    }),
    notifications: notifs.map((n) => ({ title: n.title, body: n.body, created_at: n.created_at, read: !!n.read })),
    seer_application: app ? { name: app.name, alias: app.alias, phone: app.phone, line: app.line, years: app.years, links: app.links, cats: app.cats, about: app.about, sample: app.sample, status: app.status, created_at: app.created_at, consent_at: app.consent_at } : null,
    not_included: [
      'รูปร่างกายในหน้า "บัญชี" (โหงวเฮ้ง/ลายมือ) เก็บในเครื่องของคุณเท่านั้น ไม่ได้ส่งมาที่เซิร์ฟเวอร์',
      'ข้อมูลการชำระเงิน (เลขบัญชี/บัตร) อยู่ที่ผู้ให้บริการชำระเงิน เราไม่ได้เก็บ',
    ],
  };
}
const dataFile = (res, data, name) => {
  send(res, 200, JSON.stringify(data, isoTimes, 2), {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'Content-Disposition': `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.json"`,
  });
};
// ลบบัญชี: ลบโปรไฟล์ แจ้งเตือน ใบสมัครหมอดู รูปที่อัปโหลด · คำสั่งซื้อเหลือเฉพาะยอดเงิน/วันที่/สถานะ สำหรับทำบัญชีตามกฎหมาย
async function eraseUser(u) {
  const store = await db();
  const { rows } = await store.list('order', { user_id: u.id, limit: 5000 });
  let files = 0;
  for (const o of rows) {
    for (const f of [...(o.photos || []), ...(o.proof || [])]) if (await deleteFile(f.url)) files += 1;
    o.phone = ''; o.name = 'บัญชีที่ลบแล้ว'; o.form = null; o.fields = []; o.place = ''; o.photos = []; o.proof = [];
    o.answer = ''; o.summary = ''; o.notes = []; o.user_deleted = true; o.deleted_at = Date.now();
    o.log = (o.log || []).map((l) => (l.by === u.id ? { ...l, who: 'ลูกค้า' } : l));
    o.rev = (o.rev || 0) + 1; // หน้าหลังบ้านที่เปิดค้างไว้จะบันทึกทับ (คืนข้อมูลส่วนตัว) ไม่ได้
    await store.put('order', o);
  }
  // ประวัติการทำงานที่อ้างถึงบัญชีนี้: เก็บว่าทีมทำอะไร แต่ลบชื่อ/เบอร์/ข้อความออก
  const { rows: logs } = await store.list('audit', { user_id: u.id, limit: 5000 });
  for (const a of logs) {
    const { phone, text, body, ...detail } = a.detail || {};
    await store.put('audit', { ...a, target: { ...a.target, label: 'บัญชีที่ลบแล้ว' }, detail });
  }
  await store.delWhere('notif', { user_id: u.id });
  await store.delWhere('push', { user_id: u.id });
  if (u.phone) {
    await store.del('otp', u.phone);
    const app = await store.byKey('seerapp', u.phone);
    if (app) await store.del('seerapp', app.id);
  }
  await store.del('user', u.id);
  return { orders: rows.length, files };
}
const last4 = (p) => `•••${String(p || '').slice(-4)}`;

on('GET', 'me/export', async (req, res) => {
  const u = await needUser(req);
  await rateLimit(`export:${u.id}`, 5, 3600e3);
  const data = await userData(u);
  await audit({ id: u.id, name: 'ลูกค้า', role: u.role }, 'pdpa_self_export', { type: 'user', id: u.id, label: userLabel(u) });
  dataFile(res, data, 'mohdoo-my-data');
  return undefined;
});
on('DELETE', 'me', async (req, res) => {
  const u = await needUser(req);
  if (BACKOFFICE.includes(u.role)) fail(400, 'staff_cannot_self_delete'); // ทีมงาน: ให้ผู้ดูแลลดสิทธิ์ก่อน
  const r = await eraseUser(u);
  await audit({ id: u.id, name: 'ลูกค้า (ลบเอง)', role: u.role }, 'pdpa_self_erase', { type: 'user', id: u.id, label: 'บัญชีที่ลบแล้ว' }, { phone_last4: last4(u.phone), ...r });
  endSession(res);
  return { ok: true };
});
on('GET', 'me/orders', async (req) => {
  const u = await needUser(req);
  const { rows } = await (await db()).list('order', { user_id: u.id, limit: 200 });
  return { orders: rows.filter((o) => o.status !== 'pending' || o.pay?.expires_at > Date.now()).map(pubOrder) };
});
on('GET', 'me/notifications', async (req) => {
  const u = await needUser(req);
  const store = await db();
  const { rows } = await store.list('notif', { user_id: u.id, limit: 50 });
  return { items: rows, unread: rows.filter((n) => !n.read).length };
});
on('POST', 'me/notifications/read', async (req) => {
  const u = await needUser(req);
  const store = await db();
  const { rows } = await store.list('notif', { user_id: u.id, limit: 200 });
  for (const n of rows.filter((x) => !x.read)) { n.read = true; await store.put('notif', n); }
  return { ok: true };
});
on('POST', 'me/push', async (req) => {
  const u = await needUser(req);
  if (!config.vapid) fail(503, 'push_not_configured');
  if (!(await savePush(u.id, bodyOf(req).subscription))) fail(400, 'bad_subscription');
  return { ok: true };
});
on('DELETE', 'me/push', async (req) => {
  const u = await needUser(req);
  await (await db()).delWhere('push', { user_id: u.id });
  return { ok: true };
});

// ---------- คำสั่งซื้อ ----------
// ราคาของรายการที่ลูกค้าเลือก (รวมราคาที่หมอดูตั้งเอง) · ใช้ทั้งตอนสร้างคำสั่งซื้อและตอนตรวจโค้ดส่วนลด
async function quoteOrder(b) {
  const it = priceOf(b, { humanOpen: await humanOpen() });
  // หมอดูตั้งราคาเองได้ (ถาม 1 เรื่อง) · ไม่ได้ตั้ง = ราคากลาง
  if (it.seer) {
    const sp = await (await db()).get('seerprice', it.seer);
    if (sp && sp.price) { it.price = sp.price; it.amount = sp.price; }
  }
  return it;
}
on('POST', 'coupons/check', async (req) => {
  const u = await needUser(req);
  await rateLimit(`coupon:${u.id}`, 20, 10 * 60e3); // กันเดาโค้ด
  await rateLimit(`coupon-ip:${ipOf(req)}`, 60, 10 * 60e3);
  const b = bodyOf(req);
  const it = await quoteOrder(b);
  const c = await getCoupon(normCode(b.coupon));
  const d = evalCoupon(c, it);
  await checkCouponLimits(c, u.id);
  return { ok: true, code: c.id, discount: d, original: it.price, price: it.price - d, amount: it.amount - d };
});
on('POST', 'orders', async (req) => {
  const u = await needUser(req);
  await rateLimit(`order:${u.id}`, 30, 10 * 60e3);
  const b = bodyOf(req);
  const it = await quoteOrder(b);
  const store = await db();
  let coupon = null;
  const code = normCode(b.coupon);
  if (code) { coupon = await getCoupon(code); applyDiscount(it, evalCoupon(coupon, it)); }
  const no = await orderNo(store);
  const o = {
    id: no, no, user_id: u.id, phone: u.phone, name: u.name, ...it,
    title: str(b.title, 90) || it.title, // ชื่อที่แสดง (เช่น ชื่อประเภทศาสตร์) · ราคาไม่เปลี่ยน
    place: str(b.place, 160) || undefined, status: 'pending', step: 0, created_at: Date.now(), updated_at: Date.now(), log: [],
  };
  log(o, u, 'created');
  if (coupon) { // จองสิทธิ์โค้ด (ครบโควตา/ใช้ครบแล้ว → ตอบ error ก่อนสร้าง QR)
    await reserveCoupon(coupon, u.id);
    o.coupon = coupon.id; o.coupon_held = true;
    log(o, u, 'coupon', { code: coupon.id, discount: o.discount });
  }
  try { await takeStock(o); } catch (e) { await releaseNow(o); throw e; }
  try { o.pay = await createPayment(o); } catch (e) { await releaseNow(o); throw e; }
  await store.put('order', o);
  return { order: pubOrder(o) };
});
on('GET', 'orders/:no', async (req, res, { no }) => {
  let { o } = await ownOrder(req, no);
  o = await refreshPayment(o);
  return { order: pubOrder(o), ai_until: o.kind === 'ai' ? o.ai_until || 0 : undefined };
});
on('POST', 'orders/:no/demo-pay', async (req, res, { no }) => {
  if (config.pay !== 'demo') fail(403, 'not_demo');
  const { u, o } = await ownOrder(req, no);
  if (o.pay?.provider !== 'demo') fail(400, 'not_demo');
  const done = await markPaid(o, u, 'demo');
  return { order: pubOrder(done), ai_until: done.ai_until };
});
on('POST', 'orders/:no/cancel', async (req, res, { no }) => {
  const { u, o } = await ownOrder(req, no);
  if (o.status !== 'pending') fail(400, 'cannot_cancel');
  o.status = 'cancelled';
  await releaseStock(o);
  log(o, u, 'cancelled');
  await saveOrder(o);
  return { order: pubOrder(o) };
});
on('POST', 'orders/:no/intake', async (req, res, { no }) => {
  const { u, o } = await ownOrder(req, no);
  if (o.status !== 'paid') fail(400, o.status === 'pending' ? 'not_paid' : 'already_submitted');
  const b = bodyOf(req);
  o.form = cleanForm(b.form);
  o.fields = cleanFields(b.fields);
  o.photos = [];
  const photos = (Array.isArray(b.photos) ? b.photos : []).slice(0, 6);
  // รูปใบหน้า/ฝ่ามือ: ต้องได้ความยินยอมโดยชัดแจ้งในการส่งครั้งนี้ (PDPA · นโยบายความเป็นส่วนตัวข้อ 3)
  const consentAt = Number(b.photo_consent_at) || 0;
  if (photos.length && !(consentAt > Date.now() - 864e5 && consentAt <= Date.now() + 60e3)) fail(400, 'photo_consent_required');
  if (photos.length) o.photo_consent_at = consentAt;
  for (const p of photos) {
    const f = await saveFile(p.data, { folder: 'photo', owner: u.id });
    o.photos.push({ slot: str(p.slot, 20), url: f.url });
  }
  if (o.steps) { o.status = 'in_progress'; o.step = 1; } else o.status = o.kind === 'ask' ? 'done' : 'submitted'; // ถามแล้วรู้ผลทันที → จบงาน
  if (o.kind === 'ask') { o.answered_by = 'ai'; o.answered_at = Date.now(); }
  log(o, u, 'intake');
  await saveOrder(o);
  // งานใหม่ให้หมอดู: งานที่ลูกค้าเลือกหมอดูไว้ → แจ้งท่านนั้น · งานทั่วไป → แจ้งหมอดูทุกท่าน (อ่านรูป: เฉพาะตอน AI ยังไม่พร้อม)
  if (o.kind === 'reading' || (o.kind === 'photo' && !config.ai)) await notifySeers(o);
  return { order: pubOrder(o) };
});
// คำอ่านจากแม่หมอ AI (อ่านรูปลายมือ/ใบหน้าบนหน้าเว็บแล้ว) → บันทึกเป็นคำตอบของคำสั่งซื้อ
on('POST', 'orders/:no/ai-result', async (req, res, { no }) => {
  const { u, o } = await ownOrder(req, no);
  if (o.kind !== 'photo' || o.status !== 'submitted') fail(400, 'bad_state');
  const b = bodyOf(req);
  o.answer = str(b.reading, 10000);
  o.summary = str(b.summary, 300);
  if (!o.answer) fail(400, 'empty');
  o.answered_by = 'ai';
  o.answered_at = Date.now();
  o.status = 'answered';
  log(o, u, 'ai_answer');
  await saveOrder(o);
  return { order: pubOrder(o) };
});

// ---------- สต๊อกสินค้า (หน้าเว็บใช้แสดงจำนวนที่เหลือ) ----------
on('GET', 'shop/stock', async () => ({ stock: await stockMap() })); // ไม่มีในรายการ = ไม่จำกัด

// ---------- ราคาหมอดู (หน้าเว็บใช้แสดงราคาของแต่ละท่าน) ----------
export const SEER_PRICE = { min: 20, max: 10000 };
async function seerPrices() {
  const { rows } = await (await db()).list('seerprice', { limit: 1000 });
  return Object.fromEntries(rows.filter((r) => r.price).map((r) => [r.id, r.price]));
}
async function setSeerPrice(seerId, price, by) {
  const store = await db();
  if (price === null || price === '') { await store.del('seerprice', seerId); return null; }
  const p = int(price);
  if (!(p >= SEER_PRICE.min && p <= SEER_PRICE.max)) fail(400, 'bad_price', SEER_PRICE);
  const prev = await store.get('seerprice', seerId);
  await store.put('seerprice', { id: seerId, price: p, updated_at: Date.now(), updated_by: by, created_at: prev?.created_at || Date.now() });
  return p;
}
on('GET', 'seers/prices', async () => ({ prices: await seerPrices(), base: catalog().CATEGORY_PRICE, profiles: publicSeers() }));
// โปรไฟล์หมอดูที่แสดงบนหน้าเว็บ (แท็บหมอดู) · ไม่รวมที่ซ่อนไว้
const publicSeers = () => catalog().SEER_IDS.map(({ id, name, img, cats, callCoin, callMin }) => ({ id, name, img, cats, callCoin, callMin }));

// ---------- Omise webhook ----------
on('POST', 'webhooks/omise', async (req) => {
  const id = chargeIdFromEvent(bodyOf(req));
  if (!id || config.pay !== 'omise') return { ok: true };
  const store = await db();
  const { rows } = await store.list('order', { status: 'pending', limit: 500 });
  const o = rows.find((x) => x.pay?.charge_id === id);
  if (o) await refreshPayment(o); // ไม่เชื่อข้อมูลใน webhook · ถามสถานะจาก Omise อีกครั้งเสมอ
  return { ok: true };
});

// ---------- ไฟล์ในเครื่อง (โหมดพัฒนา) ----------
on('GET', 'files/:name', async (req, res, { name }) => {
  const isPublic = PUBLIC_FOLDERS.some((f) => name.startsWith(`${f}-`)); // รูปโปรไฟล์หมอดู / รูปสินค้า = ข้อมูลสาธารณะ
  let cache = 'public, max-age=86400';
  if (!isPublic) {
    const u = await needUser(req);
    const f0 = await readFile(name);
    if (f0.owner !== u.id && !STAFF.includes(u.role)) { f0.stream?.cancel?.(); fail(404, 'not_found'); }
    return sendFile(res, f0, 'private, max-age=3600');
  }
  return sendFile(res, await readFile(name), cache);
});
async function sendFile(res, f, cache) {
  if (f.stream) { // วิดีโอ: ส่งเป็น stream
    res.statusCode = 200;
    res.setHeader('Content-Type', f.type); res.setHeader('Cache-Control', cache);
    if (f.size) res.setHeader('Content-Length', String(f.size));
    const { Readable } = await import('node:stream');
    const { pipeline } = await import('node:stream/promises');
    await pipeline(Readable.fromWeb(f.stream), res).catch(() => {});
    return undefined;
  }
  send(res, 200, f.buf, { 'Content-Type': f.type, 'Cache-Control': cache });
  return undefined;
}

// ---------- งานประจำวัน (Vercel Cron 06:00 น. เวลาไทย) ----------
on('GET', 'cron/daily', async (req) => {
  const bearer = String(req.headers.authorization || '');
  const okCron = config.cronSecret && bearer === `Bearer ${config.cronSecret}`;
  if (!okCron) await needRole(req, ['admin']);
  return runDaily();
});
async function runDaily() {
  const store = await db();
  const now = Date.now();
  let expired = 0; let daily = 0; let reminded = 0;
  const { rows: pend } = await store.list('order', { status: 'pending', limit: 2000 });
  for (const o of pend) {
    try {
      if (o.pay?.provider === 'omise') { await refreshPayment(o); continue; }
      if ((o.pay?.expires_at || 0) < now - 60e3) { o.status = 'expired'; await releaseStock(o); await saveOrder(o); expired += 1; }
    } catch (e) { if (e.status !== 409) throw e; } // ลูกค้า/ทีมงานแก้พร้อมกัน → ข้ามไป รอบหน้าค่อยดูใหม่
  }
  const { rows: users } = await store.list('user', { limit: 20000 });
  for (const u of users) {
    if ((u.ai_until || 0) > now) {
      // ส่งดวงโดยรวมวันนี้จากทุกศาสตร์ · ตอนนี้ส่งในเว็บ (+ Push)
      // แผนถัดไป: ส่งข้อความเดียวกันทาง LINE OA พร้อมกัน (ผูกบัญชี LINE ของลูกค้า แล้วเรียก LINE Messaging API ตรงนี้)
      await notify(u.id, { title: 'ดวงวันนี้มาแล้ว ☀️', body: 'ดวงโดยรวมวันนี้จากทุกศาสตร์พร้อมแล้ว แตะเพื่อดู · ถามแม่หมอ AI ต่อได้ไม่จำกัด', link: '#daily' });
      daily += 1;
      if (u.ai_until - now < 3 * 864e5 && !u.ai_reminded) {
        await notify(u.id, { title: 'สมาชิกใกล้หมดอายุ', body: `สมาชิกดูดวงรายเดือนหมดอายุ ${new Date(u.ai_until).toLocaleDateString('th-TH')} ต่ออายุเพื่อรับรายงานต่อเนื่อง`, link: '#ai' });
        await updateDoc('user', u.id, (x) => { x.ai_reminded = now; });
        reminded += 1;
      }
    }
  }
  const { rows: bcs } = await store.list('broadcast', { status: 'running', limit: 20 });
  for (const j of bcs) await runBroadcast(j.id).catch((e) => console.error('[broadcast resume]', e));
  await cleanRate().catch((e) => console.error('[cleanRate]', e));
  await store.delWhere('audit', { before: now - AUDIT_DAYS * 864e5 }).catch((e) => console.error('[audit clean]', e));
  return { ok: true, expired, daily, reminded };
}

// =====================================================================
//              หมอดู: ดูคำถามและตอบลูกค้าผ่านหน้าเว็บ (ไม่ต้องเข้าหลังบ้าน)
// =====================================================================
// งานที่หมอดูเห็น: งานที่ตัวเองรับไว้ + งานที่ลูกค้าเลือกท่านนี้ + งานทั่วไปที่ยังไม่มีใครรับ
// หมอดูเห็นเฉพาะข้อมูลที่ใช้ทำนาย (ชื่อ วันเกิด คำถาม รูป) ไม่เห็นเบอร์โทร ที่อยู่ หรือยอดขาย
const OPEN_JOB = ['submitted', 'in_progress'];
function seerCanSee(u, o) {
  if (!SEER_KINDS.includes(o.kind) || !o.form) return false;
  if (o.assignee) return o.assignee === u.id;
  if (o.seer) return o.seer === u.seer_id;
  if (o.need && u.role === 'seer') return seerCats(u).includes(o.need); // ศาสตร์เฉพาะ: เห็นเฉพาะหมอดูที่ลงทะเบียนศาสตร์นี้
  return true;
}
const seerCats = (u) => catalog().SEER_IDS.find((x) => x.id === u.seer_id)?.cats || [];
// ศาสตร์ที่ AI ตอบไม่ได้ จะเปิดขายเมื่อมีบัญชีหมอดูที่สมัครครบแล้ว ไม่ถูกระงับ และโปรไฟล์ลงทะเบียนศาสตร์นั้นไว้
let humanCache = { at: 0, set: new Set() };
async function humanOpen() {
  if (Date.now() - humanCache.at < 60e3) return humanCache.set;
  const set = new Set();
  try {
    const human = new Set(catalog().CATEGORIES.flatMap((c) => c.types.map((t, i) => (t.off && t.human ? `${c.id}|${i}` : null))).filter(Boolean));
    for (const u of await seerUsers()) if (u.profile) seerCats(u).forEach((k) => human.has(k) && set.add(k));
  } catch (_) { /* ฐานข้อมูลยังไม่พร้อม → ถือว่ายังไม่เปิด */ }
  humanCache = { at: Date.now(), set };
  return set;
}
const resetHumanOpen = () => { humanCache.at = 0; };
async function seerUsers() {
  const { rows } = await (await db()).list('user', { status: 'seer', limit: 1000 });
  return rows.filter((u) => !u.blocked);
}
async function notifySeers(o) {
  const all = await seerUsers();
  const to = o.seer ? all.filter((u) => u.seer_id === o.seer) : o.need ? all.filter((u) => seerCats(u).includes(o.need)) : all;
  for (const s of to) await notify(s.id, { title: 'มีคำถามใหม่รอตอบ 🔮', body: `${o.title} · แตะเพื่อดูคำถาม`, link: '#seer', order_no: o.no, seer_job: true });
}
async function needSeer(req) {
  const u = await needUser(req);
  if (u.role !== 'seer' && u.role !== 'admin') fail(403, 'forbidden');
  return u;
}
async function jobView(u, o) {
  const c = await (await db()).get('user', o.user_id);
  const p = c?.profile || {};
  const label = Object.fromEntries((o.fields || []).map(([k, l]) => [k, l]));
  return {
    no: o.no, title: o.title, icon: o.icon, label: o.label, kind: o.kind, status: o.status, status_text: STATUS[o.status],
    paid_at: o.paid_at, created_at: o.created_at, direct: !!o.seer, // ลูกค้าเลือกหมอดูท่านนี้โดยตรง
    form: Object.entries(o.form || {}).filter(([k, v]) => v && !['tel', 'address', 'receiver'].includes(k)).map(([k, v]) => ({ label: label[k] || k, value: v })),
    photos: o.photos || [],
    customer: { first: p.first || p.name || o.name || '', birthdate: p.birthdate || '', birthtime: p.birthtime || '', birthplace: p.birthplace || '', gender: p.gender || '' },
    mine: o.assignee === u.id, taken: !!o.assignee && o.assignee !== u.id,
    answer: o.answered_by === u.id || u.role === 'admin' ? o.answer || '' : '', summary: o.answered_by === u.id ? o.summary || '' : '',
    answered_at: o.answered_at || null,
  };
}
on('GET', 'seer/me', async (req) => {
  const u = await needSeer(req);
  const prices = await seerPrices();
  const prof = catalog().SEER_ALL.find((x) => x.id === u.seer_id);
  return { seer_id: u.seer_id || null, seer_name: prof?.name || '', price: (u.seer_id && prices[u.seer_id]) || null, base: catalog().CATEGORY_PRICE, limits: SEER_PRICE };
});
on('POST', 'seer/price', async (req) => {
  const u = await needSeer(req);
  if (!u.seer_id) fail(400, 'no_seer_profile');
  const price = await setSeerPrice(u.seer_id, bodyOf(req).price, u.name || u.phone);
  await audit(u, 'seer_price', { type: 'seer', id: u.seer_id, label: catalog().SEER_ALL.find((x) => x.id === u.seer_id)?.name }, { price, self: true });
  return { ok: true, price };
});
on('GET', 'seer/jobs', async (req) => {
  const u = await needSeer(req);
  const store = await db();
  if ((req.query || {}).tab === 'done') {
    const { rows } = await store.list('order', { where: { answered_by: u.id }, limit: 100 });
    return { jobs: await Promise.all(rows.map((o) => jobView(u, o))) };
  }
  const { rows } = await store.list('order', { status: OPEN_JOB, limit: 1000, asc: true }); // เก่าสุดก่อน
  const jobs = rows.filter((o) => seerCanSee(u, o));
  const waits = jobs.filter((o) => o.status === 'submitted' || o.assignee === u.id).map((o) => o.paid_at || o.created_at);
  return { jobs: await Promise.all(jobs.map((o) => jobView(u, o))), open: jobs.length, oldest: waits.length ? Math.min(...waits) : null };
});
on('GET', 'seer/jobs/:no', async (req, res, { no }) => {
  const u = await needSeer(req);
  const o = await getOrder(no);
  if (!seerCanSee(u, o) && o.answered_by !== u.id) fail(404, 'order_not_found');
  return { job: await jobView(u, o) };
});
on('POST', 'seer/jobs/:no', async (req, res, { no }) => {
  const u = await needSeer(req);
  const o = await getOrder(no);
  const mineDone = o.answered_by === u.id && o.status === 'answered';
  if (!seerCanSee(u, o) && !mineDone) fail(404, 'order_not_found');
  const b = bodyOf(req);
  const act = str(b.action, 20);
  let msg = null;
  if (act === 'take') {
    if (o.assignee && o.assignee !== u.id) fail(409, 'taken');
    if (!OPEN_JOB.includes(o.status)) fail(400, 'bad_state');
    o.assignee = u.id; o.assignee_name = u.name || 'หมอดู'; o.status = 'in_progress';
  } else if (act === 'release') {
    if (o.assignee !== u.id || o.status === 'answered') fail(400, 'bad_state');
    o.assignee = null; o.assignee_name = null; o.status = 'submitted';
  } else if (act === 'answer') {
    if (o.assignee && o.assignee !== u.id) fail(409, 'taken');
    if (!OPEN_JOB.includes(o.status) && !mineDone) fail(400, 'bad_state');
    o.answer = str(b.answer, 10000);
    o.summary = str(b.summary, 300);
    if (o.answer.length < 20) fail(400, 'answer_too_short');
    const first = o.status !== 'answered';
    o.assignee = u.id; o.assignee_name = u.name || 'หมอดู';
    o.answered_by = u.id; o.answered_name = u.name || 'หมอดู'; o.answered_at = Date.now();
    o.status = 'answered';
    if (first) msg = { title: 'หมอดูตอบแล้ว 🔮', body: `${o.title} · แตะเพื่ออ่านคำทำนาย` };
  } else fail(400, 'bad_action');
  log(o, u, act === 'take' ? 'start' : act);
  await saveOrder(o);
  if (msg) await notify(o.user_id, { ...msg, order_no: o.no });
  return { job: await jobView(u, o) };
});

// =====================================================================
//                         หลังบ้าน (ทีมงาน / หมอดู)
// =====================================================================
const adminOrder = (o) => ({ ...pubOrder(o), user_id: o.user_id, phone: o.phone, name: o.name, fields: o.fields || [], place: o.place, notes: o.notes || [], log: o.log || [], assignee: o.assignee || null, assignee_name: o.assignee_name || null, answered_name: o.answered_name || null, pay: o.pay ? { provider: o.pay.provider, charge_id: o.pay.charge_id } : null, refund: o.refund || null, kind_text: KIND_NAME[o.kind], qty: o.qty || null, unit: o.unit || null });
const canSee = (staff, o) => staff.role !== 'seer' || SEER_KINDS.includes(o.kind);

on('GET', 'admin/me', async (req) => {
  const u = await needUser(req);
  if (u.role === 'seer') fail(403, 'seer_use_web'); // หมอดูตอบคำถามที่หน้าเว็บ
  if (!['staff', 'admin'].includes(u.role)) fail(403, 'forbidden');
  return { user: pubUser(u) };
});

on('GET', 'admin/stats', async (req) => {
  await needRole(req, ['staff', 'admin']); // ยอดขายไม่แสดงให้หมอดู
  const store = await db();
  const now = Date.now();
  const day0 = new Date(new Date(now + 7 * 3600e3).toISOString().slice(0, 10)).getTime() - 7 * 3600e3; // เที่ยงคืนเวลาไทย
  const { rows } = await store.list('order', { since: now - 60 * 864e5, limit: 50000 });
  const paid = rows.filter((o) => o.paid_at && o.status !== 'refunded');
  const sum = (list) => list.reduce((a, o) => a + (o.amount || 0), 0);
  const series = Array.from({ length: 14 }, (_, i) => {
    const a = day0 - (13 - i) * 864e5;
    const list = paid.filter((o) => o.paid_at >= a && o.paid_at < a + 864e5);
    return { day: a, orders: list.length, revenue: sum(list) };
  });
  const byKind = {};
  paid.filter((o) => o.paid_at >= now - 30 * 864e5).forEach((o) => {
    const k = (byKind[o.kind] ||= { kind: o.kind, name: KIND_NAME[o.kind], orders: 0, revenue: 0 });
    k.orders += 1; k.revenue += o.amount;
  });
  const queue = {
    reading: await store.count('order', { status: 'submitted' }),
    in_progress: await store.count('order', { status: 'in_progress' }),
    paid_no_intake: await store.count('order', { status: 'paid' }),
  };
  const { rows: users } = await store.list('user', { limit: 50000 });
  const stock = await stockMap();
  const lowStock = catalog().SHOP_ITEMS.flatMap((p) => {
    const vs = variantsOf(p);
    if (!vs.length) return stock[p.id] != null && stock[p.id] <= 3 ? [{ id: p.id, name: p.name, icon: p.icon, qty: stock[p.id] }] : [];
    return vs.filter((v) => !v.off && stock[`${p.id}:${v.key}`] != null && stock[`${p.id}:${v.key}`] <= 3)
      .map((v) => ({ id: `${p.id}:${v.key}`, name: `${p.name} (${v.label})`, icon: p.icon, qty: stock[`${p.id}:${v.key}`] }));
  });
  // ค่าใช้จ่าย AI (ประมาณการ) วันนี้และ 7 วัน
  const aiDays = await Promise.all([...Array(7)].map((_, k) => aiDay(bkkDay(now - k * 864e5))));
  const aiCost = { today: aiDays[0], d7: { usd: Math.round(aiDays.reduce((a, d) => a + d.usd, 0) * 100) / 100, calls: aiDays.reduce((a, d) => a + d.calls, 0) }, alert: ALERT_USD, cap: CAP_USD };
  return { lowStock, aiCost,
    today: { orders: paid.filter((o) => o.paid_at >= day0).length, revenue: sum(paid.filter((o) => o.paid_at >= day0)) },
    d7: { orders: paid.filter((o) => o.paid_at >= now - 7 * 864e5).length, revenue: sum(paid.filter((o) => o.paid_at >= now - 7 * 864e5)) },
    d30: { orders: paid.filter((o) => o.paid_at >= now - 30 * 864e5).length, revenue: sum(paid.filter((o) => o.paid_at >= now - 30 * 864e5)),
      donation: paid.filter((o) => o.paid_at >= now - 30 * 864e5).reduce((a, o) => a + (o.donation || 0), 0) },
    queue, series, byKind: Object.values(byKind).sort((a, b) => b.revenue - a.revenue),
    users: { total: users.filter((u) => u.profile).length, today: users.filter((u) => u.created_at >= day0 && u.profile).length, ai: users.filter((u) => (u.ai_until || 0) > now).length },
    config: { db: store.kind, otp: config.otp, pay: config.pay, storage: config.storage, push: !!config.vapid, ai: config.ai, cron: !!config.cronSecret },
  };
});

// ---------- รายงานยอดขายตามช่วงวันที่ (เวลาไทย · นับตามวันที่ชำระเงิน) ----------
// from/to = YYYY-MM-DD (รวมทั้งสองวัน) · ไม่เกิน 366 วัน
const BKK = 7 * 3600e3;
const bkkDayStart = (d) => Date.parse(`${d}T00:00:00+07:00`);
const bkkDate = (t) => new Date(t + BKK).toISOString().slice(0, 10);
function dateRange(q, defDays = 30) {
  const ok = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && !Number.isNaN(bkkDayStart(d));
  const today = bkkDate(Date.now());
  const to = ok(q.to) ? q.to : today;
  const from = ok(q.from) ? q.from : bkkDate(bkkDayStart(to) - (defDays - 1) * 864e5);
  const a = bkkDayStart(from); const b = bkkDayStart(to) + 864e5;
  if (b <= a) fail(400, 'bad_range');
  if (b - a > 366 * 864e5) fail(400, 'range_too_long', { max_days: 366 });
  return { from, to, a, b };
}
on('GET', 'admin/report', async (req) => {
  await needRole(req, ['staff', 'admin']);
  const { from, to, a, b } = dateRange(req.query || {});
  // คำสั่งซื้อสร้างก่อนชำระไม่นาน (QR หมดอายุ 15 นาที · ยืนยันรับเงินเองอาจช้ากว่า) → ดึงย้อนไป 7 วันแล้วกรองตามวันที่ชำระ
  const { rows } = await (await db()).list('order', { since: a - 7 * 864e5, before: b, limit: 100000, asc: true });
  const paid = rows.filter((o) => o.paid_at >= a && o.paid_at < b);
  const refundOf = (o) => (o.refund && !o.refund.pending ? o.refund.amount || 0 : 0);
  const sum = (list, f) => list.reduce((s, o) => s + (f(o) || 0), 0);
  const days = [];
  for (let t = a; t < b; t += 864e5) days.push({ day: bkkDate(t), orders: 0, gross: 0, refunds: 0, net: 0 });
  const dayIdx = Object.fromEntries(days.map((d, i) => [d.day, i]));
  const byKind = {}; const byItem = {};
  for (const o of paid) {
    const r = refundOf(o);
    const d = days[dayIdx[bkkDate(o.paid_at)]];
    if (d) { d.orders += 1; d.gross += o.amount; d.refunds += r; d.net += o.amount - r; }
    const k = (byKind[o.kind] ||= { kind: o.kind, name: KIND_NAME[o.kind] || o.kind, orders: 0, gross: 0, refunds: 0, net: 0 });
    k.orders += 1; k.gross += o.amount; k.refunds += r; k.net += o.amount - r;
    const ik = o.item_id ? `shop:${o.item_id}` : o.key || o.title;
    const it = (byItem[ik] ||= { key: ik, title: o.title, icon: o.icon || '', kind: o.kind, orders: 0, qty: 0, net: 0 });
    it.orders += 1; it.qty += o.qty || 1; it.net += o.amount - r;
  }
  const gross = sum(paid, (o) => o.amount);
  const refunds = sum(paid, refundOf);
  const donation = sum(paid.filter((o) => !refundOf(o)), (o) => o.donation);
  return {
    from, to,
    summary: {
      orders: paid.length, gross, refunds, net: gross - refunds,
      refunded_orders: paid.filter((o) => refundOf(o)).length,
      donation, // เงินทำบุญที่ลูกค้าฝากไปถวาย (ไม่ใช่รายได้ของบริษัท)
      discount: sum(paid, (o) => o.discount), discount_orders: paid.filter((o) => o.discount).length, // ส่วนลดที่ให้ (ยอดรับชำระเป็นยอดหลังลดแล้ว)
      service_net: gross - refunds - donation,
      avg: paid.length ? Math.round((gross - refunds) / paid.length) : 0,
      customers: new Set(paid.map((o) => o.user_id)).size,
    },
    by_coupon: Object.values(paid.filter((o) => o.coupon).reduce((m, o) => { const x = (m[o.coupon] ||= { code: o.coupon, orders: 0, discount: 0, net: 0 }); x.orders += 1; x.discount += o.discount || 0; x.net += o.amount - refundOf(o); return m; }, {})).sort((x, y) => y.discount - x.discount),
    days, by_kind: Object.values(byKind).sort((x, y) => y.net - x.net),
    top_items: Object.values(byItem).sort((x, y) => y.net - x.net).slice(0, 15),
  };
});
on('GET', 'admin/orders', async (req) => {
  const staff = await needRole(req);
  const q = req.query || {};
  const store = await db();
  const f = { limit: Math.min(int(q.limit) || 30, 200), offset: int(q.offset) || 0, q: str(q.q, 60) || undefined };
  if (q.status) f.status = str(q.status, 80).split(',');
  if (q.kind) f.where = { kind: str(q.kind, 20) };
  if (q.mine) f.where = { ...(f.where || {}), assignee: staff.id };
  if (q.from || q.to) { const r = dateRange(q, 3650); f.since = r.a; f.before = r.b; } // วันที่สั่ง (เวลาไทย)
  let { rows, total } = await store.list('order', f);
  if (staff.role === 'seer') rows = rows.filter((o) => canSee(staff, o)).map((o) => ({ ...o, phone: '' }));
  return { orders: rows.map(adminOrder), total };
});
on('GET', 'admin/orders/:no', async (req, res, { no }) => {
  const staff = await needRole(req);
  const o = await getOrder(no);
  if (!canSee(staff, o)) fail(403, 'forbidden');
  const u = await (await db()).get('user', o.user_id);
  if (staff.role === 'seer') { // หมอดูเห็นเฉพาะข้อมูลที่ใช้ทำนาย ไม่เห็นเบอร์โทร
    const order = { ...adminOrder(o), phone: '' };
    return { order, customer: u ? { id: u.id, name: u.name, profile: pickBirth(u.profile) } : null };
  }
  return { order: adminOrder(o), customer: u ? { ...pubUser(u), profile: u.profile } : null };
});
const pickBirth = (p) => (p ? { first: p.first, last: p.last, name: p.name, birthdate: p.birthdate, birthtime: p.birthtime, birthplace: p.birthplace, gender: p.gender } : null);

on('POST', 'admin/orders/:no', async (req, res, { no }) => {
  const staff = await needRole(req);
  const o = await getOrder(no);
  if (!canSee(staff, o)) fail(403, 'forbidden');
  const b = bodyOf(req);
  const act = str(b.action, 20);
  const seerOk = ['answer', 'note', 'assign', 'start'];
  if (staff.role === 'seer' && !seerOk.includes(act)) fail(403, 'forbidden');
  const isPaid = PAID.includes(o.status);
  let msg = null;
  switch (act) {
    case 'start': // รับงาน
      if (!['submitted', 'paid'].includes(o.status)) fail(400, 'bad_state');
      o.assignee = staff.id; o.assignee_name = staff.name || staff.phone;
      if (o.status === 'submitted') o.status = 'in_progress';
      break;
    case 'answer': {
      if (!['submitted', 'in_progress', 'answered'].includes(o.status) || !SEER_KINDS.includes(o.kind)) fail(400, 'bad_state');
      o.answer = str(b.answer, 10000);
      o.summary = str(b.summary, 300);
      if (!o.answer) fail(400, 'empty');
      const first = o.status !== 'answered';
      o.answered_by = staff.id; o.answered_name = staff.name || 'หมอดู'; o.answered_at = Date.now();
      o.status = 'answered';
      if (first) msg = { title: 'หมอดูตอบแล้ว 🔮', body: `${o.title} · แตะเพื่ออ่านคำทำนาย` };
      break;
    }
    case 'step': {
      if (!o.steps || !isPaid) fail(400, 'bad_state');
      const s = Math.max(0, Math.min(o.steps.length, int(b.step)));
      if (Number.isNaN(s)) fail(400, 'bad_step');
      o.step = s;
      o.status = s >= o.steps.length ? 'done' : 'in_progress';
      msg = { title: `อัปเดตสถานะ · ${o.title}`, body: s >= o.steps.length ? 'ดำเนินการเสร็จเรียบร้อย ✓' : `ตอนนี้: ${o.steps[s]}` };
      break;
    }
    case 'tracking': {
      if (!['shop'].includes(o.kind) || !isPaid) fail(400, 'bad_state');
      const next = { carrier: str(b.carrier, 40), no: str(b.no, 60).replace(/\s+/g, '').toUpperCase() };
      if (!next.no) fail(400, 'empty');
      if (!/^[A-Z0-9-]{5,40}$/.test(next.no)) fail(400, 'bad_tracking'); // เลขพัสดุมีแค่ตัวอักษรอังกฤษ ตัวเลข และขีด
      const changed = !o.tracking || o.tracking.no !== next.no || o.tracking.carrier !== next.carrier;
      o.tracking = next;
      o.step = o.steps.length; o.status = 'shipped';
      if (changed) msg = { title: o.tracking_sent ? 'อัปเดตเลขพัสดุ 📦' : 'จัดส่งสินค้าแล้ว 📦', body: `${next.carrier} ${next.no}` }; // บันทึกซ้ำโดยไม่เปลี่ยน = ไม่แจ้งลูกค้าซ้ำ
      o.tracking_sent = true;
      break;
    }
    case 'status': {
      const s = str(b.status, 20);
      if (!['submitted', 'in_progress', 'answered', 'shipped', 'done'].includes(s) || !isPaid) fail(400, 'bad_status');
      o.status = s;
      if (s === 'done') msg = { title: `เสร็จสิ้น · ${o.title}`, body: 'ขอบคุณที่ใช้บริการหมอดู.com ✦' };
      break;
    }
    case 'note':
      (o.notes ||= []).push({ at: Date.now(), by: staff.name || staff.phone, text: str(b.text, 1000) });
      break;
    case 'assign':
      if (b.to === 'me' || staff.role === 'seer') { o.assignee = staff.id; o.assignee_name = staff.name || staff.phone; } else {
        const t = b.to ? await (await db()).get('user', str(b.to, 40)) : null;
        if (b.to && (!t || !STAFF.includes(t.role) || t.blocked)) fail(400, 'not_team'); // มอบหมายได้เฉพาะทีมงาน/หมอดู
        o.assignee = t ? t.id : null; o.assignee_name = t ? t.name || t.phone : null;
      }
      break;
    case 'mark-paid': // ลูกค้าโอนเข้าบัญชีโดยตรง → ผู้ดูแลยืนยันเอง
      if (staff.role !== 'admin') fail(403, 'forbidden');
      await markPaid(o, staff, 'manual');
      await audit(staff, 'mark_paid', { type: 'order', id: o.no, label: o.title }, { amount: o.amount });
      return { order: adminOrder(await getOrder(o.no)) };
    case 'cancel':
      if (o.status !== 'pending' && staff.role !== 'admin') fail(403, 'forbidden');
      if (o.status !== 'shipped') await releaseStock(o); // ยังไม่ส่งของ → คืนสต๊อก
      o.status = 'cancelled';
      msg = isPaid ? { title: `ยกเลิกคำสั่งซื้อ ${o.no}`, body: str(b.reason, 200) || 'ทีมงานจะติดต่อกลับเรื่องการคืนเงิน' } : null;
      break;
    case 'refund': {
      if (staff.role !== 'admin' || !o.paid_at || o.status === 'refunded' || o.refund) fail(400, 'bad_state');
      const amt = Math.min(o.amount, int(b.amount) || o.amount);
      // 1) จองการคืนเงินไว้ในคำสั่งซื้อก่อน (ถ้ามีคนแก้แทรก จะหยุดตรงนี้ ยังไม่มีเงินออก) · กันกดคืนซ้ำ
      o.refund = { at: Date.now(), amount: amt, reason: str(b.reason, 200), by: staff.id, pending: true };
      await saveOrder(o);
      // 2) คืนเงินจริง · ไม่สำเร็จ → ยกเลิกการจอง ให้กดใหม่ได้
      let r;
      try { r = await refundPayment(o.pay, amt); } catch (e) {
        o.refund = null;
        await saveOrder(o).catch(() => {});
        throw e;
      }
      o.refund = { ...o.refund, ...r, pending: false };
      o.status = 'refunded';
      msg = { title: 'คืนเงินแล้ว', body: `${o.no} · ${amt.toLocaleString('th-TH')} ฿` };
      break;
    }
    default: fail(400, 'bad_action');
  }
  log(o, staff, act, act === 'status' || act === 'step' ? { to: o.status, step: o.step } : {});
  await saveOrder(o);
  if (act === 'refund') await audit(staff, 'refund', { type: 'order', id: o.no, label: o.title }, { amount: o.refund.amount, reason: o.refund.reason, provider: o.refund.provider });
  if (act === 'cancel') await audit(staff, 'cancel', { type: 'order', id: o.no, label: o.title }, { amount: o.amount, paid: !!o.paid_at, reason: str(b.reason, 200) });
  if (msg) await notify(o.user_id, { ...msg, order_no: o.no });
  return { order: adminOrder(o) };
});
// แนบรูป/วิดีโอยืนยัน (บริการมงคล) หรือไฟล์ดิจิทัล
on('POST', 'admin/orders/:no/files', async (req, res, { no }) => {
  const staff = await needRole(req, ['staff', 'admin']);
  const o = await getOrder(no);
  if (!PAID.includes(o.status)) fail(400, 'bad_state');
  const b = bodyOf(req);
  const files = (Array.isArray(b.files) ? b.files : []).slice(0, 6);
  if (!files.length) fail(400, 'empty');
  for (const f of files) {
    const s = await saveFile(f.data, { folder: 'proof', owner: o.user_id });
    (o.proof ||= []).push({ url: s.url, type: s.type, at: Date.now(), caption: str(f.caption, 120) });
  }
  if (b.finish && o.steps) { o.step = o.steps.length; o.status = 'done'; }
  log(o, staff, 'files', { n: files.length });
  await saveOrder(o);
  await notify(o.user_id, { title: o.kind === 'digital' ? 'ไฟล์ของคุณพร้อมแล้ว 🖼️' : 'รูปยืนยันพิธีมาแล้ว 🙏', body: `${o.title} · แตะเพื่อดู`, order_no: o.no });
  return { order: adminOrder(o) };
});

// ---------- รายชื่อหมอดู: ผู้ดูแลลงชื่อ+เบอร์ไว้ก่อน → หมอดูสมัครที่หน้าเว็บด้วยเบอร์นั้น ได้สิทธิ์หมอดูทันที ----------
on('GET', 'admin/seers', async (req) => {
  await needRole(req);
  const store = await db();
  const { rows } = await store.list('user', { status: 'seer', limit: 1000 });
  const names = Object.fromEntries(catalog().SEER_ALL.map((x) => [x.id, x.name]));
  const { rows: open } = await store.list('order', { status: OPEN_JOB, limit: 5000 });
  const prices = await seerPrices();
  const seers = await Promise.all(rows.map(async (u) => ({
    price: (u.seer_id && prices[u.seer_id]) || null,
    id: u.id, phone: u.phone, name: u.profile ? [u.profile.first || u.name, u.profile.last].filter(Boolean).join(' ') : u.name,
    seer_id: u.seer_id || null, seer_name: names[u.seer_id] || '', registered: !!u.profile, invited_at: u.invited_at || u.created_at,
    last_login: u.profile ? u.last_login : null, blocked: !!u.blocked,
    open: open.filter((o) => seerCanSee(u, o)).length,
    answered: await store.count('order', { where: { answered_by: u.id } }),
  })));
  // ศาสตร์ที่ต้องใช้หมอดูจริง: มีกี่ท่านพร้อมรับงาน (0 = ยังซ่อนจากหน้าเว็บ)
  const ready = rows.filter((u) => u.profile && !u.blocked);
  const human = catalog().CATEGORIES.flatMap((c) => c.types.map((t, i) => (t.off && t.human ? { key: `${c.id}|${i}`, cat: c.name, name: t.name, icon: t.icon,
    seers: ready.filter((u) => seerCats(u).includes(`${c.id}|${i}`)).map((u) => u.name || u.phone),
    profiles: catalog().SEER_IDS.filter((p) => p.cats.includes(`${c.id}|${i}`)).map((p) => p.name) } : null))).filter(Boolean);
  return { seers, profiles: catalog().SEER_ALL.map(({ id, name, hidden }) => ({ id, name, hidden })), all: catalog().SEER_ALL, cats: catalog().CATEGORIES.map((c) => ({ id: c.id, name: c.name, icon: c.icon, types: c.types.map((t) => t.name) })), base: catalog().CATEGORY_PRICE, human };
});
on('POST', 'admin/seers/price', async (req) => {
  const staff = await needRole(req, ['admin']);
  const b = bodyOf(req);
  const sid = str(b.seer_id, 40);
  if (!catalog().SEER_ALL.some((x) => x.id === sid)) fail(400, 'unknown_seer');
  const price = await setSeerPrice(sid, b.price, staff.name || staff.phone);
  await audit(staff, 'seer_price', { type: 'seer', id: sid, label: catalog().SEER_ALL.find((x) => x.id === sid)?.name }, { price });
  return { ok: true, price };
});
// ---------- โปรไฟล์หมอดูบนหน้าเว็บ (ชื่อ รูป ศาสตร์ที่ถนัด ค่าโทรบนแอป) ----------
// โปรไฟล์ตั้งต้นใน seers-data.js แก้ได้ (บันทึกทับในฐานข้อมูล) ซ่อนได้ และคืนค่าเดิมได้ · ลบได้เฉพาะโปรไฟล์ที่เพิ่มในหลังบ้าน
const validCats = (list) => {
  const all = new Set(catalog().CATEGORIES.flatMap((c) => c.types.map((_, i) => `${c.id}|${i}`)));
  return [...new Set((Array.isArray(list) ? list : []).map((k) => str(k, 40)))].filter((k) => all.has(k)).slice(0, 40);
};
async function saveSeerProfile(staff, id, b) {
  const store = await db();
  const cur = id ? catalog().SEER_ALL.find((x) => x.id === id) : null;
  if (id && !cur) fail(404, 'not_found');
  const prev = id ? await store.get('seerprof', id) : null;
  const doc = { ...(prev || {}), id: id || newId('sp'), created_at: prev?.created_at || Date.now() };
  if (b.name !== undefined) { doc.name = str(b.name, 60); if (!doc.name) fail(400, 'empty'); }
  else if (!id) fail(400, 'empty');
  if (b.cats !== undefined) doc.cats = validCats(b.cats);
  if (b.hidden !== undefined) doc.hidden = b.hidden === true;
  for (const k of ['callCoin', 'callMin']) if (b[k] !== undefined) doc[k] = Math.max(0, Math.min(100000, int(b[k]) || 0));
  if (b.image) doc.img = (await saveFile(b.image, { folder: 'seerimg', owner: staff.id })).url;
  else if (b.img !== undefined) {
    const u = str(b.img, 500);
    if (u && !/^(https:\/\/|\/api\/v1\/files\/seerimg-)/.test(u)) fail(400, 'bad_img');
    doc.img = u;
  }
  doc.updated_at = Date.now(); doc.updated_by = staff.name || staff.phone;
  await store.put('seerprof', doc);
  resetSeerProfiles(); resetHumanOpen();
  await syncSeerProfiles(store);
  return catalog().SEER_ALL.find((x) => x.id === doc.id);
}
on('POST', 'admin/seer-profiles', async (req) => {
  const staff = await needRole(req, ['admin']);
  const profile = await saveSeerProfile(staff, null, bodyOf(req));
  await audit(staff, 'seer_profile_new', { type: 'seer', id: profile.id, label: profile.name });
  return { ok: true, profile };
});
on('POST', 'admin/seer-profiles/:id', async (req, res, { id }) => {
  const staff = await needRole(req, ['admin']);
  const b = bodyOf(req);
  const sid = str(id, 40);
  const cur = catalog().SEER_ALL.find((x) => x.id === sid);
  if (!cur) fail(404, 'not_found');
  if (b.reset === true || b.delete === true) {
    if (b.delete === true && cur.base) fail(400, 'base_profile'); // โปรไฟล์ตั้งต้น: ใช้ซ่อนแทน
    if (b.delete === true) {
      const { rows } = await (await db()).list('user', { status: 'seer', limit: 1000 });
      if (rows.some((u) => u.seer_id === sid)) fail(400, 'in_use');
    }
    await (await db()).del('seerprof', sid);
    resetSeerProfiles(); resetHumanOpen();
    await syncSeerProfiles(await db());
    await audit(staff, b.delete === true ? 'seer_profile_delete' : 'seer_profile_reset', { type: 'seer', id: sid, label: cur.name });
    return { ok: true, profile: catalog().SEER_ALL.find((x) => x.id === sid) || null };
  }
  const profile = await saveSeerProfile(staff, sid, b);
  const changed = ['name', 'img', 'cats', 'callCoin', 'callMin', 'hidden'].filter((k) => JSON.stringify(cur[k]) !== JSON.stringify(profile[k]));
  await audit(staff, 'seer_profile', { type: 'seer', id: sid, label: profile.name }, { changed, ...(changed.includes('hidden') ? { hidden: profile.hidden } : {}) });
  return { ok: true, profile };
});
// ลงชื่อหมอดูไว้ก่อน (ใช้ทั้งปุ่ม "เพิ่มหมอดู" และตอนอนุมัติใบสมัคร)
async function inviteSeer(staff, { phone: rawPhone, name, seer_id }) {
  const phone = normPhone(rawPhone);
  const sid = str(seer_id, 40);
  if (sid && !catalog().SEER_ALL.some((x) => x.id === sid)) fail(400, 'unknown_seer');
  const store = await db();
  const found = await store.byKey('user', phone);
  const apply = (u) => {
    if (['staff', 'admin'].includes(u.role)) fail(400, 'is_staff');
    u.role = 'seer';
    u.seer_id = sid || u.seer_id || null;
    if (!u.profile) u.name = str(name, 60) || u.name;
    u.updated_at = Date.now();
  };
  let u;
  if (found) u = await updateDoc('user', found.id, apply); // บัญชีเดิม: แก้แบบกันทับ (ลูกค้าอาจแก้โปรไฟล์อยู่)
  else {
    u = { id: newId('u'), phone, name: '', profile: null, ai_until: 0, created_at: Date.now(), invited_at: Date.now(), invited_by: staff.id };
    apply(u);
    await store.put('user', u);
  }
  resetHumanOpen();
  return u;
}
on('POST', 'admin/seers', async (req) => {
  const staff = await needRole(req, ['admin']);
  const u = await inviteSeer(staff, bodyOf(req));
  await audit(staff, 'seer_invite', { type: 'user', id: u.id, label: userLabel(u) }, { phone: u.phone, seer_id: u.seer_id });
  return { ok: true, registered: !!u.profile };
});

// ---------- ใบสมัครหมอดู: หน้าเว็บ seer-apply.html ส่งมา (ไม่ต้องเข้าสู่ระบบ) → ผู้ดูแลตรวจ → อนุมัติ = ลงชื่อหมอดูให้ ----------
const APP_STATUS = { new: 'ใบสมัครใหม่', contacted: 'ติดต่อแล้ว', approved: 'อนุมัติแล้ว', rejected: 'ไม่ผ่าน' };
const typeKeys = () => new Set(catalog().CATEGORIES.flatMap((c) => c.types.map((t, i) => `${c.id}|${i}`)));
const typeNames = () => Object.fromEntries(catalog().CATEGORIES.flatMap((c) => c.types.map((t, i) => [`${c.id}|${i}`, t.name])));
on('POST', 'seer-apply', async (req) => {
  const b = bodyOf(req);
  if (str(b.website, 200)) return { ok: true }; // ช่องดักบอท (มนุษย์มองไม่เห็น)
  await rateLimit(`apply-ip:${ipOf(req)}`, 20, 60 * 60e3); // มือถือไทยใช้ IP ร่วมกัน จึงไม่ตั้งต่ำเกินไป
  const phone = normPhone(b.phone);
  const name = str(b.name, 80), about = str(b.about, 2000);
  const keys = typeKeys();
  const cats = [...new Set((Array.isArray(b.cats) ? b.cats : []).map((k) => str(k, 30)).filter((k) => keys.has(k)))].slice(0, 40);
  if (!name || !cats.length || about.length < 20) fail(400, 'empty');
  if (b.consent !== true) fail(400, 'consent_required');
  await rateLimit(`apply-phone:${phone}`, 5, 24 * 3600e3); // นับเฉพาะใบที่กรอกครบ
  const years = int(b.years);
  const store = await db();
  const u = await store.byKey('user', phone);
  if (u && STAFF.includes(u.role)) fail(409, 'already_seer');
  const prev = await store.byKey('seerapp', phone);
  const app = prev && ['new', 'contacted'].includes(prev.status) ? prev : { id: newId('sa'), phone, status: 'new', created_at: Date.now(), notes: [] };
  Object.assign(app, {
    name, alias: str(b.alias, 60), line: str(b.line, 60),
    cats, years: years >= 0 && years <= 80 ? years : null, about, sample: str(b.sample, 2000), links: str(b.links, 300),
    consent_at: Date.now(), updated_at: Date.now(),
  });
  await store.put('seerapp', app);
  if (!prev || prev.id !== app.id) {
    const { rows: admins } = await store.list('user', { status: 'admin', limit: 50 });
    for (const a of admins) await notify(a.id, { title: 'มีใบสมัครหมอดูใหม่ 🔮', body: `${name}${app.alias ? ` (${app.alias})` : ''} · ${cats.length} ศาสตร์`, link: '/admin.html#seers' });
  }
  return { ok: true, updated: !!prev && prev.id === app.id };
});
on('GET', 'admin/seer-apps', async (req) => {
  await needRole(req, ['staff', 'admin']);
  const q = req.query || {};
  const st = str(q.status, 20);
  const { rows, total } = await (await db()).list('seerapp', { status: APP_STATUS[st] ? st : undefined, limit: 200 });
  const counts = {};
  for (const k of Object.keys(APP_STATUS)) counts[k] = await (await db()).count('seerapp', { status: k });
  return { apps: rows, total, counts, status: APP_STATUS, types: typeNames(), profiles: catalog().SEER_ALL.map(({ id, name }) => ({ id, name })) };
});
on('POST', 'admin/seer-apps/:id', async (req, res, { id }) => {
  const staff = await needRole(req, ['staff', 'admin']);
  const store = await db();
  const app = await store.get('seerapp', str(id, 40));
  if (!app) fail(404, 'not_found');
  const b = bodyOf(req);
  if (b.delete === true) { // ผู้สมัครขอลบข้อมูล (PDPA)
    if (staff.role !== 'admin') fail(403, 'forbidden');
    await store.del('seerapp', app.id);
    await audit(staff, 'seer_app_delete', { type: 'seerapp', id: app.id, label: app.alias || app.name });
    return { ok: true, deleted: true };
  }
  const who = staff.name || staff.phone;
  if (b.note) (app.notes ||= []).push({ at: Date.now(), who, text: str(b.note, 1000) });
  if (b.status !== undefined) {
    if (!APP_STATUS[b.status]) fail(400, 'bad_state');
    if (b.status === 'approved') {
      if (staff.role !== 'admin') fail(403, 'forbidden');
      let sid = b.seer_id;
      if (sid === 'new') { // สร้างโปรไฟล์บนเว็บจากใบสมัคร (ชื่อที่ใช้ + ศาสตร์ที่ถนัด) แก้รายละเอียด/รูปต่อได้ที่หน้าหมอดู
        const prof = await saveSeerProfile(staff, null, { name: app.alias || app.name, cats: app.cats || [], hidden: false });
        sid = prof.id;
      }
      const u = await inviteSeer(staff, { phone: app.phone, name: app.alias || app.name, seer_id: sid });
      app.user_id = u.id;
    }
    app.status = b.status;
    app.reviewed_at = Date.now(); app.reviewed_by = who;
  }
  app.updated_at = Date.now();
  await store.put('seerapp', app);
  if (b.status !== undefined) await audit(staff, 'seer_app', { type: 'seerapp', id: app.id, label: app.alias || app.name }, { status: app.status, seer_id: app.status === 'approved' ? b.seer_id : undefined });
  return { ok: true, app };
});

on('GET', 'admin/audit', async (req) => {
  await needRole(req, ['admin']);
  const q = req.query || {};
  const f = { limit: Math.min(int(q.limit) || 50, 200), offset: int(q.offset) || 0, q: str(q.q, 60) || undefined };
  if (q.action && AUDIT_ACTIONS[q.action]) f.status = q.action;
  if (q.user) f.user_id = str(q.user, 40);
  if (q.by) f.where = { by: str(q.by, 40) };
  const { rows, total } = await (await db()).list('audit', f);
  return { items: rows, total, actions: AUDIT_ACTIONS };
});
on('GET', 'admin/users', async (req) => {
  await needRole(req, ['staff', 'admin']);
  const q = req.query || {};
  const f = { limit: Math.min(int(q.limit) || 30, 200), offset: int(q.offset) || 0, q: str(q.q, 60) || undefined };
  if (q.role) f.status = str(q.role, 20);
  let rows, total;
  if (q.ai) { // กรองสมาชิก AI จากลูกค้าทั้งหมดก่อน แล้วค่อยแบ่งหน้า (ไม่ใช่กรองแค่หน้าที่ดึงมา)
    const all = (await (await db()).list('user', { ...f, limit: 50000, offset: 0 })).rows.filter((u) => (u.ai_until || 0) > Date.now());
    total = all.length; rows = all.slice(f.offset, f.offset + f.limit);
  } else ({ rows, total } = await (await db()).list('user', f));
  return { users: rows.map((u) => ({ id: u.id, phone: u.phone, name: u.name || u.profile?.name || '', role: u.role, ai_until: u.ai_until || 0, created_at: u.created_at, last_login: u.last_login, blocked: !!u.blocked, history: (u.profile?.history || []).length })), total };
});
on('GET', 'admin/users/:id', async (req, res, { id }) => {
  await needRole(req, ['staff', 'admin']);
  const store = await db();
  const u = await store.get('user', str(id, 40));
  if (!u) fail(404, 'not_found');
  const { rows } = await store.list('order', { user_id: u.id, limit: 200 });
  return { user: { ...pubUser(u), blocked: !!u.blocked, last_login: u.last_login, notes: u.notes || [], seer_id: u.seer_id || null }, orders: rows.map(adminOrder), seers: catalog().SEER_ALL };
});
// ผู้ดูแลทำแทนลูกค้า (PDPA) · ต้องระบุเลขอ้างอิง/เหตุผลของคำขอ เพื่อเป็นหลักฐานว่าตอบคำขอภายใน 30 วัน
const pdpaRef = (v) => { const r = str(v, 120); if (r.length < 3) fail(400, 'ref_required'); return r; };
on('GET', 'admin/users/:id/export', async (req, res, { id }) => {
  const staff = await needRole(req, ['admin']);
  const ref = pdpaRef(req.query?.ref);
  const u = await (await db()).get('user', str(id, 40));
  if (!u) fail(404, 'not_found');
  const data = await userData(u);
  await audit(staff, 'pdpa_export', { type: 'user', id: u.id, label: userLabel(u) }, { ref });
  dataFile(res, data, `mohdoo-data-${u.phone.replace(/\D/g, '').slice(-4)}`);
  return undefined;
});
on('POST', 'admin/users/:id/erase', async (req, res, { id }) => {
  const staff = await needRole(req, ['admin']);
  const b = bodyOf(req);
  const ref = pdpaRef(b.ref);
  const u = await (await db()).get('user', str(id, 40));
  if (!u) fail(404, 'not_found');
  if (BACKOFFICE.includes(u.role)) fail(400, 'is_staff'); // ลดสิทธิ์ทีมงานก่อน
  let typed = '';
  try { typed = normPhone(b.confirm_phone); } catch (_) { /* พิมพ์ไม่ครบ = ไม่ตรง */ }
  if (typed !== u.phone) fail(400, 'confirm_mismatch'); // พิมพ์เบอร์ยืนยัน กันกดผิดคน
  const r = await eraseUser(u);
  await audit(staff, 'pdpa_erase', { type: 'user', id: u.id, label: 'บัญชีที่ลบแล้ว' }, { ref, phone_last4: last4(u.phone), ...r });
  return { ok: true, ...r };
});
on('POST', 'admin/users/:id', async (req, res, { id }) => {
  const staff = await needRole(req, ['staff', 'admin']);
  const b = bodyOf(req);
  let before;
  // แก้แบบกันทับ: ผู้ดูแลอีกคน หรือลูกค้าที่แก้โปรไฟล์อยู่ จะไม่ทำให้การแก้ของกันและกันหาย
  const u = await updateDoc('user', str(id, 40), async (u) => {
  before = { role: u.role, seer_id: u.seer_id || null, blocked: !!u.blocked, ai_until: u.ai_until || 0 };
  if (b.role !== undefined) {
    if (staff.role !== 'admin' || !ROLES.includes(b.role)) fail(403, 'forbidden');
    if (u.id === staff.id && b.role !== 'admin') fail(400, 'cannot_demote_self');
    if (u.role === 'admin' && b.role !== 'admin' && !(await adminsLeft(u.id))) fail(400, 'last_admin'); // ต้องเหลือผู้ดูแลอย่างน้อย 1 คน
    u.role = b.role;
  }
  if (b.seer_id !== undefined) { // เชื่อมบัญชีกับโปรไฟล์หมอดู (รับงานที่ลูกค้าเลือกท่านนี้)
    if (staff.role !== 'admin') fail(403, 'forbidden');
    const sid = str(b.seer_id, 40);
    if (sid && !catalog().SEER_ALL.some((x) => x.id === sid)) fail(400, 'unknown_seer');
    u.seer_id = sid || null;
  }
  if (b.ai_days !== undefined) { // ให้/ต่ออายุสมาชิก AI (ชดเชยลูกค้า)
    const d = int(b.ai_days);
    if (!(d >= -365 && d <= 365)) fail(400, 'bad_days');
    u.ai_until = Math.max(u.ai_until || 0, Date.now()) + d * 864e5;
  }
  if (b.blocked !== undefined) {
    if (staff.role !== 'admin') fail(403, 'forbidden');
    if (b.blocked && u.id === staff.id) fail(400, 'cannot_block_self');
    if (b.blocked && u.role === 'admin' && !(await adminsLeft(u.id))) fail(400, 'last_admin');
    u.blocked = !!b.blocked; u.sv = (u.sv || 0) + 1;
  }
  if (b.logout) u.sv = (u.sv || 0) + 1;
  if (b.note) (u.notes ||= []).push({ at: Date.now(), by: staff.name || staff.phone, text: str(b.note, 1000) });
  u.updated_at = Date.now();
  });
  if (!u) fail(404, 'not_found');
  resetHumanOpen();
  const t = { type: 'user', id: u.id, label: userLabel(u) };
  if (u.role !== before.role) await audit(staff, 'role', t, { from: before.role, to: u.role });
  if ((u.seer_id || null) !== before.seer_id) await audit(staff, 'seer_link', t, { from: before.seer_id, to: u.seer_id || null });
  if (!!u.blocked !== before.blocked) await audit(staff, u.blocked ? 'block' : 'unblock', t);
  if (b.ai_days !== undefined) await audit(staff, 'ai_days', t, { days: int(b.ai_days), until: u.ai_until });
  if (b.logout) await audit(staff, 'kick', t);
  if (b.note) await audit(staff, 'user_note', t, { text: str(b.note, 200) });
  return { ok: true };
});

// ---------- ประกาศถึงลูกค้า: ส่งเป็นรอบ ๆ (รอบละ BC_CHUNK คน) ไม่ให้เกินเวลาของ Vercel ----------
// แต่ละคำขอส่งได้ไม่เกิน BC_BUDGET_MS แล้วหยุด → หน้าหลังบ้านเรียก continue ต่อ / งานประจำวันเก็บตกที่ค้าง
// รับช่วงด้วย putIf (rev) ก่อนส่ง: สองเครื่องทำพร้อมกันจะไม่ส่งซ้ำคนเดิม
const BC_CHUNK = Math.max(1, Number(process.env.MOHDOO_BC_CHUNK) || 40);
const BC_BUDGET_MS = Number(process.env.MOHDOO_BC_BUDGET_MS ?? 20e3);
const pubBroadcast = ({ ids, ...j }) => j;
async function bumpBroadcast(id, patch) { // นับยอดส่งสำเร็จ/ไม่สำเร็จ (ลองใหม่ถ้าชนกับเครื่องอื่น)
  const store = await db();
  for (let i = 0; i < 10; i++) {
    const j = await store.get('broadcast', id);
    const rev = j.rev || 0;
    const next = { ...j, rev: rev + 1, updated_at: Date.now() };
    for (const [k, v] of Object.entries(patch)) next[k] = (j[k] || 0) + v;
    if (await store.putIf('broadcast', next, rev)) return next;
  }
}
async function runBroadcast(id) {
  const store = await db();
  const t0 = Date.now();
  for (let first = true; ; first = false) {
    const job = await store.get('broadcast', id);
    if (!job || job.status !== 'running') return job;
    if (!first && Date.now() - t0 > BC_BUDGET_MS) return job; // หมดเวลารอบนี้ (ทำอย่างน้อย 1 รอบเสมอ)
    const start = job.claimed || 0;
    const end = Math.min(start + BC_CHUNK, job.ids.length);
    const rev = job.rev || 0;
    const last = end >= job.ids.length;
    if (!(await store.putIf('broadcast', { ...job, claimed: end, rev: rev + 1, status: last ? 'done' : 'running', ...(last ? { done_at: Date.now() } : {}), updated_at: Date.now() }, rev))) continue; // เครื่องอื่นรับช่วงนี้ไปแล้ว
    const res = await Promise.allSettled(job.ids.slice(start, end).map((uid) => notify(uid, { title: job.title, body: job.body, link: job.link })));
    const failed = res.filter((r) => r.status === 'rejected').length;
    await bumpBroadcast(id, { delivered: res.length - failed, failed });
  }
}
on('POST', 'admin/broadcast', async (req) => {
  const staff = await needRole(req, ['admin']);
  const b = bodyOf(req);
  const title = str(b.title, 80); const body = str(b.body, 300);
  if (!title || !body) fail(400, 'empty');
  const store = await db();
  const { rows } = await store.list('user', { limit: 50000 });
  const ids = rows.filter((u) => u.profile && !u.blocked && (b.target !== 'ai' || (u.ai_until || 0) > Date.now())).map((u) => u.id);
  const job = { id: newId('bc'), title, body, link: str(b.link, 200), target: b.target === 'ai' ? 'ai' : 'all', ids, total: ids.length,
    claimed: 0, delivered: 0, failed: 0, status: ids.length ? 'running' : 'done', by: staff.id, who: staff.name || staff.phone, created_at: Date.now(), rev: 0 };
  await store.put('broadcast', job);
  await audit(staff, 'broadcast', { type: 'broadcast', id: job.id, label: title }, { body, target: job.target, sent: ids.length });
  return { job: pubBroadcast((await runBroadcast(job.id)) || job) };
});
on('POST', 'admin/broadcast/:id/continue', async (req, res, { id }) => {
  await needRole(req, ['admin']);
  const job = await runBroadcast(str(id, 40));
  if (!job) fail(404, 'not_found');
  return { job: pubBroadcast(job) };
});
on('GET', 'admin/broadcasts', async (req) => {
  await needRole(req, ['admin']);
  const { rows } = await (await db()).list('broadcast', { limit: 30 });
  return { items: rows.map(pubBroadcast) };
});
on('POST', 'admin/cron/daily', async (req) => { const staff = await needRole(req, ['admin']); await audit(staff, 'cron'); return runDaily(); });

on('GET', 'admin/export/orders', async (req, res) => {
  const staff = await needRole(req, ['staff', 'admin']);
  const q = req.query || {};
  let since = q.days ? Date.now() - Math.min(int(q.days) || 30, 3650) * 864e5 : 0;
  let before; let range = null;
  if (q.from || q.to) { range = dateRange(q); since = range.a; before = range.b; } // ช่วงวันที่สั่ง (เวลาไทย)
  const { rows } = await (await db()).list('order', { since, before, limit: 100000, asc: true });
  // ข้อความที่ขึ้นต้นด้วย = + - @ (หรือ tab/ขึ้นบรรทัด) Excel จะตีความเป็นสูตร → ใส่ ' นำหน้า (ตัวเลขติดลบยังเป็นตัวเลข)
  const cell = (v) => {
    let t = String(v ?? '');
    if (typeof v !== 'number' && /^[=+\-@\t\r]/.test(t)) t = `'${t}`;
    return `"${t.replace(/"/g, '""')}"`;
  };
  const head = ['เลขที่', 'วันที่สั่ง', 'วันที่ชำระ', 'สถานะ', 'ประเภท', 'รายการ', 'แพ็กเกจ', 'ค่าบริการ', 'เงินทำบุญ', 'ยอดรวม', 'ลูกค้า', 'เบอร์', 'ชำระผ่าน', 'คืนเงิน'];
  const th = (t) => (t ? new Date(t).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : '');
  await audit(staff, 'export', { type: 'export', label: 'คำสั่งซื้อ (CSV)' }, { days: q.days ? int(q.days) : 'all', rows: rows.length }); // มีเบอร์/ชื่อลูกค้า = ข้อมูลส่วนบุคคล
  const lines = rows.map((o) => [o.no, th(o.created_at), th(o.paid_at), STATUS[o.status], KIND_NAME[o.kind], o.title, o.label, o.price, o.donation || 0, o.amount, o.name, o.phone, o.pay?.provider, o.refund?.amount || ''].map(cell).join(','));
  send(res, 200, `﻿${[head.map(cell).join(','), ...lines].join('\r\n')}`, {
    'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="mohdoo-orders-${range ? `${range.from}_${range.to}` : new Date().toISOString().slice(0, 10)}.csv"`,
  });
  return undefined;
});
on('POST', 'admin/stock', async (req) => {
  const staff = await needRole(req);
  const b = bodyOf(req);
  // id = รหัสสินค้า (สินค้าไม่มีตัวเลือก) หรือ "รหัสสินค้า:รหัสแบบ" (สินค้าที่มีตัวเลือก สต๊อกแยกตามแบบ)
  const [pid, vkey] = str(b.id, 60).split(':');
  const p = catalog().SHOP_ITEMS.find((x) => x.id === pid);
  if (!p || p.digital) fail(400, 'unknown_item');
  const vs = variantsOf(p);
  const v = vkey ? vs.find((x) => x.key === vkey) : null;
  if (vs.length ? !v : vkey) fail(400, 'unknown_item'); // สินค้ามีตัวเลือกต้องระบุแบบ · สินค้าไม่มีตัวเลือกห้ามระบุแบบ
  const sid = v ? `${p.id}:${v.key}` : p.id;
  const label = v ? `${p.name} (${v.label})` : p.name;
  const store = await db();
  const prevQty = (await store.get('stock', sid))?.qty ?? null;
  if (b.qty === null || b.qty === '') { await store.del('stock', sid); await audit(staff, 'stock', { type: 'item', id: p.id, label }, { from: prevQty, to: null }); return { ok: true, qty: null }; } // ไม่จำกัด
  const q = int(b.qty);
  if (!(q >= 0 && q <= 100000)) fail(400, 'bad_qty');
  const prev = await store.get('stock', sid);
  await store.put('stock', { id: sid, qty: q, rev: (prev?.rev || 0) + 1, updated_at: Date.now(), updated_by: staff.name || staff.phone, created_at: prev?.created_at || Date.now() });
  await audit(staff, 'stock', { type: 'item', id: p.id, label }, { from: prevQty, to: q });
  return { ok: true, qty: q };
});
// ---------- ราคาและบริการ (แก้ในหลังบ้าน · หน้าเว็บอ่านผ่าน /api/v1/site-config.js) ----------
// หน้าเว็บโหลดไฟล์นี้ก่อนไฟล์ข้อมูล (services-data.js ฯลฯ) → ราคา/สถานะบนหน้าเว็บตรงกับที่เซิร์ฟเวอร์คิดเงินเสมอ
on('GET', 'site-config.js', async (req, res) => {
  send(res, 200, `window.SITE_CFG=${JSON.stringify(publicSiteCfg())};`, {
    'Content-Type': 'text/javascript; charset=utf-8',
    // ไฟล์นี้ต้องโหลดก่อนสคริปต์อื่น (หน้าเว็บรอ) → ต้องตอบเร็วเสมอ:
    // CDN ของ Vercel ส่งสำเนาที่มีอยู่ทันที แล้วไปดึงค่าใหม่เบื้องหลัง (ฐานข้อมูลที่หลับอยู่ปลุกนาน 1–3 วินาที ลูกค้าไม่ต้องรอ)
    // ค่าใหม่ใช้หลัง 30 วินาที: คนแรกหลังจากนั้นยังเห็นค่าเดิม 1 ครั้ง แล้วคนถัดไปเห็นค่าใหม่ · เบราว์เซอร์ถาม CDN ทุกครั้ง
    'Cache-Control': 'public, max-age=0, must-revalidate, s-maxage=30, stale-while-revalidate=604800',
  });
  return undefined;
});
const priceVal = (v) => {
  if (v === null || v === '') return null; // ล้างค่า = กลับไปใช้ราคากลาง/ค่าเดิม
  const n = int(v);
  if (!(n >= PRICE_RANGE.min && n <= PRICE_RANGE.max)) fail(400, 'bad_price', PRICE_RANGE);
  return n;
};
on('GET', 'admin/pricing', async (req) => {
  await needRole(req, ['admin']);
  const c = catalog();
  const cfg = (await (await db()).get('sitecfg', 'main')) || {};
  const stk = await stockMap();
  const stockOf = (p) => (variantsOf(p).length ? Object.fromEntries(variantsOf(p).map((v) => [v.key, stk[`${p.id}:${v.key}`] ?? null])) : stk[p.id] ?? null);
  return {
    base: { service_price: c.BASE.service_price, ai_price: c.BASE.ai_price },
    service_price: c.SERVICE_PRICE, ai_price: c.AI_PRICE, range: PRICE_RANGE, updated_at: cfg.updated_at || null, updated_by: cfg.updated_by || null,
    custom: { max: CUSTOM_MAX, kinds: CUSTOM_KINDS, field_types: FIELD_TYPES, sciences: c.SCIENCES.map((x) => ({ id: x.id, icon: x.icon, name: x.name })),
      services: (cfg.custom_services || []).map((x) => ({ ...x, price_now: x.price ?? c.SERVICE_PRICE })),
      items: c.SHOP_ITEMS.filter((p) => p.custom).map((p) => ({ ...p, variants_list: variantsOf(p), stock: stockOf(p) })), max_images: MAX_IMAGES },
    services: c.SERVICES.filter((s) => !s.custom).map((s, i) => {
      const b = c.BASE.services[i]; const o = (cfg.services || {})[s.id] || {};
      return { id: s.id, icon: s.icon, name: s.name, group: s.group || '', app: !!s.app, can_open: !!b.open, state: s.state,
        price: s.prices.find((t) => t.price != null)?.price ?? null, custom_price: o.price ?? null, priced: s.prices.some((t) => t.price != null), edited: !!(o.state || o.price != null) };
    }),
    shop: c.SHOP_ITEMS.filter((p) => !p.custom).map((p, i) => {
      const b = c.BASE.shop[i]; const o = (cfg.shop || {})[p.id] || {};
      return { id: p.id, icon: p.icon, name: p.name, desc: p.desc, price: p.price, hidden: p.hidden, digital: !!p.digital,
        images: p.images, options: p.options, variants: p.variants || {}, variants_list: variantsOf(p), stock: stockOf(p),
        base: { name: b.name, desc: b.desc, price: b.price }, edited: !!Object.keys(o).length };
    }),
  };
});
on('POST', 'admin/pricing', async (req) => {
  const staff = await needRole(req, ['admin']);
  const b = bodyOf(req);
  const c = catalog();
  const store = await db();
  const upl = b.item ? await uploadShopImages(b.item, staff) : { lead: null, adds: [], all: [] };
  let media = null; let saved = false;
  try {
  for (let attempt = 0; attempt < 5; attempt++) {
    const prev = (await store.get('sitecfg', 'main')) || { id: 'main', created_at: Date.now() };
    const cfg = JSON.parse(JSON.stringify(prev));
    cfg.services ||= {}; cfg.shop ||= {};
    const changes = [];
    if (b.service_price !== undefined) {
      const v = priceVal(b.service_price);
      changes.push({ what: 'ราคากลางบริการ', from: c.SERVICE_PRICE, to: v ?? c.BASE.service_price });
      if (v == null) delete cfg.service_price; else cfg.service_price = v;
    }
    if (b.ai_price !== undefined) {
      const v = priceVal(b.ai_price);
      changes.push({ what: 'สมาชิก AI / เดือน', from: c.AI_PRICE, to: v ?? c.BASE.ai_price });
      if (v == null) delete cfg.ai_price; else cfg.ai_price = v;
    }
    if (b.service) {
      const id = str(b.service.id, 40);
      const i = c.BASE.services.findIndex((x) => x.id === id);
      if (i < 0) fail(404, 'not_found');
      const base = c.BASE.services[i];
      const o = { ...(cfg.services[id] || {}) };
      if (b.service.reset === true) { delete cfg.services[id]; changes.push({ what: base.name, to: 'คืนค่าเดิม' }); } else {
        if (b.service.state !== undefined) {
          const st = str(b.service.state, 10);
          if (!['open', 'soon', 'hidden'].includes(st)) fail(400, 'bad_state');
          if (st === 'open' && !base.open) fail(400, 'cannot_open'); // บริการที่ยังไม่มีขั้นตอนรองรับบนเว็บ (บริการบนแอปสั่งบนเว็บไม่ได้อยู่แล้ว)
          changes.push({ what: base.name, field: 'สถานะ', from: c.SERVICES[i].state, to: st });
          if (st === (base.open ? 'open' : 'soon')) delete o.state; else o.state = st;
        }
        if (b.service.price !== undefined) {
          if (!base.prices.some((t) => t.price != null)) fail(400, 'not_priced'); // เช่น บริการที่ "สอบถามราคา"
          const v = priceVal(b.service.price);
          changes.push({ what: base.name, field: 'ราคา', from: c.SERVICES[i].prices.find((t) => t.price != null)?.price, to: v ?? 'ราคากลาง' });
          if (v == null) delete o.price; else o.price = v;
        }
        if (Object.keys(o).length) cfg.services[id] = o; else delete cfg.services[id];
      }
    }
    if (b.item) {
      const id = str(b.item.id, 40);
      const i = c.BASE.shop.findIndex((x) => x.id === id);
      if (i < 0) fail(404, 'not_found');
      const base = c.BASE.shop[i];
      const o = { ...(cfg.shop[id] || {}) };
      if (b.item.reset === true) {
        media = await cleanMedia({ images: [], options: [], variants: {} }, o, { lead: null, adds: [], all: [] }, id); // คืนค่าเดิม = ลบรูป/ตัวเลือกที่ตั้งไว้ (ถ้ามีคนสั่งแบบนั้นแล้วจะไม่ให้ลบ)
        delete cfg.shop[id]; changes.push({ what: base.name, to: 'คืนค่าเดิม' });
      } else {
        if (['images', 'new_images', 'image', 'img', 'options', 'variants'].some((k) => b.item[k] !== undefined)) {
          media = await cleanMedia(b.item, o, upl, id);
          for (const k of ['images', 'options', 'variants']) { if (Array.isArray(media[k]) ? media[k].length : Object.keys(media[k]).length) o[k] = media[k]; else delete o[k]; }
          changes.push({ what: base.name, field: 'รูป/ตัวเลือก', to: `${media.images.length} รูป · ${variantsOf({ price: 0, options: media.options }).length || 'ไม่มี'} แบบ` });
        }
        if (b.item.name !== undefined) { const v = str(b.item.name, 80); if (!v) fail(400, 'empty'); if (v === base.name) delete o.name; else o.name = v; changes.push({ what: base.name, field: 'ชื่อ', to: v }); }
        if (b.item.desc !== undefined) { const v = str(b.item.desc, 200); if (v === base.desc) delete o.desc; else o.desc = v; changes.push({ what: base.name, field: 'คำอธิบาย' }); }
        if (b.item.price !== undefined) { const v = priceVal(b.item.price); if (v == null || v === base.price) delete o.price; else o.price = v; changes.push({ what: base.name, field: 'ราคา', from: c.SHOP_ITEMS[i].price, to: v ?? base.price }); }
        if (b.item.hidden !== undefined) { if (b.item.hidden === true) o.hidden = true; else delete o.hidden; changes.push({ what: base.name, field: 'ซ่อน', to: b.item.hidden === true }); }
        if (Object.keys(o).length) cfg.shop[id] = o; else delete cfg.shop[id];
      }
    }
    if (!changes.length) fail(400, 'empty');
    const rev = prev.rev || 0;
    cfg.rev = rev + 1; cfg.updated_at = Date.now(); cfg.updated_by = staff.name || staff.phone;
    if (!(await store.putIf('sitecfg', cfg, rev))) continue; // มีผู้ดูแลอีกคนแก้พร้อมกัน → อ่านใหม่แล้วใช้การแก้ของเราซ้ำ
    saved = true;
    await afterMedia(media, upl, true);
    resetSeerProfiles(); await syncSeerProfiles(store);
    await audit(staff, 'pricing', { type: 'pricing', label: changes.map((x) => x.what).join(', ').slice(0, 80) }, { changes });
    return { ok: true };
  }
  fail(409, 'conflict');
  } finally { if (!saved) await afterMedia(null, upl, false); }
});
// ---------- รูป (สูงสุด 5) และตัวเลือก สี/ขนาด ของสินค้า ----------
// ตัวเลือก: สูงสุด 2 กลุ่ม กลุ่มละ 10 ค่า (ทุกแบบรวมกันไม่เกิน 60) · ค่าแต่ละค่ามีรหัสคงที่ (v1, v2 …) แก้ชื่อได้โดยสต๊อก/คำสั่งซื้อไม่เพี้ยน
// แบบ (variant) = ผลคูณของตัวเลือก มีราคาเฉพาะ/ปิดขายได้ · สต๊อกแยกตามแบบ (คอลเลกชัน stock id = "รหัสสินค้า:รหัสแบบ")
const MAX_IMAGES = 5; const MAX_GROUPS = 2; const MAX_VALUES = 10; const MAX_COMBOS = 60;
const variantsOf = (p) => catalog().shopVariants(p);
const valueIds = (opts) => new Set((opts || []).flatMap((g) => g.values.map((v) => v.id)));
// อัปโหลดรูปใหม่ก่อนเข้าลูปบันทึก (ลูปอาจวนซ้ำเมื่อมีผู้ดูแลแก้พร้อมกัน → ไม่ให้อัปโหลดซ้ำ)
async function uploadShopImages(d, staff) {
  const toUp = [...(d.image ? [d.image] : []), ...(Array.isArray(d.new_images) ? d.new_images : [])];
  if (toUp.length > MAX_IMAGES) fail(400, 'too_many_images', { max: MAX_IMAGES });
  const urls = [];
  try { for (const x of toUp) urls.push((await saveFile(x, { folder: 'shopimg', owner: staff.id })).url); } catch (e) { await Promise.all(urls.map(deleteFile)); throw e; }
  return { lead: d.image ? urls[0] : null, adds: d.image ? urls.slice(1) : urls, all: urls };
}
function cleanOptions(list, prevOptions) {
  if (!Array.isArray(list)) fail(400, 'bad_options');
  const groups = list.slice(0, MAX_GROUPS);
  const taken = new Set(); let seq = 1;
  for (const id of valueIds(prevOptions)) seq = Math.max(seq, int(id.slice(1)) + 1);
  for (const g of groups) for (const v of g?.values || []) { const m = /^v(\d{1,3})$/.exec(str(v?.id, 5)); if (m) seq = Math.max(seq, +m[1] + 1); }
  const gids = new Set();
  const out = groups.map((g, gi) => {
    let id = /^o[12]$/.test(str(g?.id, 3)) && !gids.has(g.id) ? g.id : ['o1', 'o2'].find((x) => !gids.has(x) && !groups.some((y, yi) => yi !== gi && y?.id === x)) || ['o1', 'o2'].find((x) => !gids.has(x));
    gids.add(id);
    const name = safeText(g?.name, 20);
    if (!name) fail(400, 'option_name_required');
    const labels = new Set();
    const values = (Array.isArray(g?.values) ? g.values : []).slice(0, MAX_VALUES).map((v) => {
      const label = safeText(v?.label, 30);
      if (!label) fail(400, 'option_value_required');
      if (labels.has(label.toLowerCase())) fail(400, 'option_value_duplicate');
      labels.add(label.toLowerCase());
      let vid = str(v?.id, 5);
      if (!/^v\d{1,3}$/.test(vid) || taken.has(vid)) vid = `v${seq++}`;
      taken.add(vid);
      return { id: vid, label, img: str(v?.img, 300), off: v?.off === true };
    });
    if (!values.length) fail(400, 'option_needs_values');
    return { id, name, values };
  }).sort((x, y) => (x.id < y.id ? -1 : 1)); // เรียงกลุ่มตามรหัส → รหัสแบบ (key) คงที่
  const combos = out.reduce((n, g) => n * g.values.length, out.length ? 1 : 0);
  if (combos > MAX_COMBOS) fail(400, 'too_many_variants', { max: MAX_COMBOS });
  return out;
}
// คืน { images, options, variants, dropped, prune } จากข้อมูลที่ส่งมา + ของเดิม
async function cleanMedia(d, prev, upl, pid) {
  prev = prev || {};
  const prevImages = prev.images || (prev.img ? [prev.img] : []);
  let kept = Array.isArray(d.images) ? [...new Set(d.images.filter((u) => prevImages.includes(u)))] : [...prevImages];
  if (d.img === '') kept = []; // (รูปแบบเดิม) ลบรูปทั้งหมด
  const images = [...(upl.lead ? [upl.lead] : []), ...kept, ...upl.adds];
  if (images.length > MAX_IMAGES) fail(400, 'too_many_images', { max: MAX_IMAGES });
  const dropped = prevImages.filter((u) => !images.includes(u));
  const options = (d.options !== undefined ? cleanOptions(d.options, prev.options) : JSON.parse(JSON.stringify(prev.options || [])))
    .map((g) => ({ ...g, values: g.values.map((v) => ({ ...v, img: images.includes(v.img) ? v.img : '' })) })); // รูปที่ผูกไว้ถูกลบ → ล้างการผูก
  const keys = variantsOf({ price: 0, options }).map((v) => v.key);
  const src = d.variants !== undefined ? d.variants : prev.variants;
  const variants = {};
  for (const [k, o] of Object.entries(src && typeof src === 'object' ? src : {})) {
    if (!keys.includes(k)) continue;
    const price = o?.price === null || o?.price === '' || o?.price === undefined ? null : priceVal(o.price);
    if (price != null || o?.off === true) variants[k] = { ...(price != null ? { price } : {}), ...(o.off === true ? { off: true } : {}) };
  }
  // ค่าตัวเลือกที่หายไป แต่เคยมีคนสั่งแบบนั้น → ลบไม่ได้ (ให้ตั้ง "ไม่มีจำหน่าย" แทน)
  const removed = [...valueIds(prev.options)].filter((id) => !valueIds(options).has(id));
  if (removed.length) {
    const { rows } = await (await db()).list('order', { where: { item_id: pid }, limit: 5000 });
    const used = new Set(rows.flatMap((o) => (o.variant?.key || '').split('.').filter(Boolean)));
    if (removed.some((id) => used.has(id))) fail(400, 'option_in_use');
  }
  const prevKeys = variantsOf({ price: 0, options: prev.options || [] }).map((v) => v.key);
  return { images, options, variants, dropped, prune: prevKeys.filter((k) => !keys.includes(k)).map((k) => `${pid}:${k}`) };
}
async function afterMedia(m, upl, ok) { // ok = บันทึกสำเร็จ → ลบรูปเก่า/สต๊อกแบบที่หายไป · ไม่สำเร็จ → ลบรูปที่เพิ่งอัปโหลด
  if (!ok) { await Promise.all(upl.all.map(deleteFile)); return; }
  await Promise.all((m?.dropped || []).map(deleteFile));
  const store = await db();
  for (const id of m?.prune || []) await store.del('stock', id);
}
// ---------- บริการ/สินค้าที่ผู้ดูแลสร้างเองในหลังบ้าน (เก็บใน sitecfg.custom_services / custom_shop) ----------
// บริการ: หมอดูตอบเป็นข้อความ (เข้าคิวงานเดิม) หรือ บริการมงคล (ทีมทำพิธี + เงินทำบุญ) · สินค้า: ของจัดส่ง/ไฟล์ดิจิทัล + รูป 1 รูป
// ข้อความที่ผู้ดูแลกรอกจะถูกตัด < > " ` ออก เพราะหน้าเว็บนำไปแสดงในหน้า (กัน HTML แทรก)
const safeText = (v, n) => str(v, n).replace(/[<>"`]/g, '').trim();
const newCustomId = () => `x-${Math.random().toString(36).slice(2, 8)}`;
const FIELD_NAME = /^f[1-8]$/;
function cleanCustomFields(list) {
  const arr = Array.isArray(list) ? list.slice(0, 8) : [];
  const used = new Set(arr.map((f) => str(f?.name, 4)).filter((n, i, a) => FIELD_NAME.test(n) && a.indexOf(n) === i));
  const free = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'].filter((n) => !used.has(n));
  const seen = new Set();
  return arr.map((f) => {
    const label = safeText(f?.label, 60);
    if (!label) fail(400, 'field_label_required');
    const type = Object.keys(FIELD_TYPES).includes(f?.type) ? f.type : 'text';
    let name = str(f?.name, 4);
    if (!FIELD_NAME.test(name) || seen.has(name)) name = free.shift();
    seen.add(name);
    const out = { name, label, type, required: f?.required === true };
    if (type === 'select') {
      out.options = [...new Set((Array.isArray(f?.options) ? f.options : String(f?.options || '').split('\n')).map((o) => safeText(o, 40)).filter(Boolean))].slice(0, 12);
      if (out.options.length < 2) fail(400, 'select_needs_options');
    }
    return out;
  });
}
function cleanCustomService(d, prev) {
  const x = {
    id: prev?.id || newCustomId(), created_at: prev?.created_at || Date.now(), updated_at: Date.now(),
    icon: safeText(d.icon, 8) || prev?.icon || '✨',
    name: safeText(d.name, 60), about: safeText(d.about, 240), get: safeText(d.get, 240), duration: safeText(d.duration, 40),
    kind: prev?.kind || (d.kind === 'merit' ? 'merit' : 'reading'), // ประเภทเปลี่ยนภายหลังไม่ได้ (คำสั่งซื้อเดิมอ้างถึง)
    science: (catalog().SCIENCES.some((s) => s.id === d.science) ? d.science : '') || '',
    state: ['open', 'soon', 'hidden'].includes(d.state) ? d.state : 'soon',
    price: d.price === null || d.price === '' || d.price === undefined ? null : priceVal(d.price),
    fields: cleanCustomFields(d.fields),
  };
  if (!x.name) fail(400, 'name_required');
  if (x.state === 'open' && !x.about) fail(400, 'about_required'); // เปิดจองต้องมีคำอธิบายให้ลูกค้าอ่าน
  return x;
}
async function cleanCustomItem(d, prev, upl) {
  const x = {
    id: prev?.id || newCustomId(), created_at: prev?.created_at || Date.now(), updated_at: Date.now(),
    icon: safeText(d.icon, 8) || prev?.icon || '🎁', name: safeText(d.name, 80), desc: safeText(d.desc, 200),
    digital: prev ? !!prev.digital : d.digital === true, // ชนิดเปลี่ยนภายหลังไม่ได้
    hidden: d.hidden === true,
    price: priceVal(d.price),
  };
  if (!x.name) fail(400, 'name_required');
  if (x.price == null) fail(400, 'bad_price', PRICE_RANGE);
  const m = await cleanMedia(d, prev, upl, x.id);
  Object.assign(x, { images: m.images, img: m.images[0] || '', options: m.options, variants: m.variants });
  return { def: x, media: m };
}
on('POST', 'admin/custom', async (req) => {
  const staff = await needRole(req, ['admin']);
  const b = bodyOf(req);
  const type = b.type === 'service' ? 'service' : b.type === 'item' ? 'item' : fail(400, 'bad_type');
  const op = ['create', 'update', 'delete'].includes(b.op) ? b.op : fail(400, 'bad_op');
  const key = type === 'service' ? 'custom_services' : 'custom_shop';
  const store = await db();
  let result = null; let media = null;
  const upl = type === 'item' && op !== 'delete' ? await uploadShopImages(b.data || {}, staff) : { lead: null, adds: [], all: [] };
  let saved = false;
  try {
  for (let attempt = 0; attempt < 5; attempt++) {
    const prevCfg = (await store.get('sitecfg', 'main')) || { id: 'main', created_at: Date.now() };
    const cfg = JSON.parse(JSON.stringify(prevCfg));
    const list = (cfg[key] ||= []);
    const idx = op === 'create' ? -1 : list.findIndex((x) => x.id === str(b.id, 40));
    if (op !== 'create' && idx < 0) fail(404, 'not_found');
    if (op === 'delete') {
      const ref = type === 'service' ? str(b.id, 40) : `shop:${str(b.id, 40)}`;
      if (await store.count('order', { where: { key: ref } })) fail(400, 'has_orders'); // เคยมีคนสั่งแล้ว → ซ่อนแทนการลบ
      [result] = list.splice(idx, 1);
      if (type === 'item') media = { dropped: result.images || (result.img ? [result.img] : []), prune: variantsOf(result).map((v) => `${result.id}:${v.key}`) };
    } else {
      if (op === 'create' && list.length >= CUSTOM_MAX) fail(400, 'too_many', { max: CUSTOM_MAX });
      const prev = op === 'update' ? list[idx] : null;
      let def;
      if (type === 'service') def = cleanCustomService(b.data || {}, prev);
      else { ({ def, media } = await cleanCustomItem(b.data || {}, prev, upl)); }
      if (op === 'create') list.push(def); else list[idx] = def;
      result = def;
    }
    const rev = prevCfg.rev || 0;
    cfg.rev = rev + 1; cfg.updated_at = Date.now(); cfg.updated_by = staff.name || staff.phone;
    if (!(await store.putIf('sitecfg', cfg, rev))) continue;
    saved = true;
    await afterMedia(media, upl, true);
    if (op === 'delete' && type === 'item') await store.del('stock', result.id);
    resetSeerProfiles(); await syncSeerProfiles(store);
    await audit(staff, 'custom', { type: type === 'service' ? 'service' : 'item', id: result.id, label: result.name }, { op, kind: type === 'service' ? result.kind : result.digital ? 'digital' : 'shop', name: result.name, ...(op !== 'delete' ? { price: result.price ?? 'ราคากลาง', state: result.state ?? (result.hidden ? 'hidden' : 'open') } : {}) });
    return { ok: true, id: result.id };
  }
  fail(409, 'conflict');
  } finally { if (!saved) await afterMedia(null, upl, false); } // บันทึกไม่สำเร็จ → ลบรูปที่เพิ่งอัปโหลด
});
// ---------- โค้ดส่วนลด (หลังบ้าน · admin) ----------
const dayStartTH = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d || '') ? Date.parse(`${d}T00:00:00+07:00`) : null);
const dayStr = (t) => (t ? new Date(t + 7 * 3600e3).toISOString().slice(0, 10) : '');
function cleanCoupon(d, prev) {
  const type = d.type === 'amount' ? 'amount' : 'percent';
  const value = int(d.value);
  if (type === 'percent' ? !(value >= 1 && value <= 90) : !(value >= 1 && value <= PRICE_RANGE.max)) fail(400, 'bad_value');
  const from = dayStartTH(d.starts); const to = dayStartTH(d.ends);
  if ((d.starts && from == null) || (d.ends && to == null)) fail(400, 'bad_range');
  const ends_at = to == null ? null : to + 864e5; // หมดอายุสิ้นวันที่เลือก
  if (from != null && ends_at != null && ends_at <= from) fail(400, 'bad_range');
  const num = (v, max) => { const n = int(v); return Number.isFinite(n) && n >= 0 && n <= max ? n : fail(400, 'bad_value'); };
  return {
    ...(prev || {}), type, value,
    scope: Object.keys(COUPON_SCOPES).includes(d.scope) ? d.scope : 'all',
    min_amount: num(d.min_amount ?? 0, 100000), max_uses: num(d.max_uses ?? 0, 1e6), per_user: num(d.per_user ?? 1, 100),
    starts_at: from, ends_at, active: d.active !== false, note: safeText(d.note, 100), updated_at: Date.now(),
  };
}
on('GET', 'admin/coupons', async (req) => {
  await needRole(req, ['admin']);
  const store = await db();
  const { rows } = await store.list('coupon', { limit: COUPON_MAX });
  const out = [];
  for (const c of rows) {
    const { rows: os } = await store.list('order', { where: { coupon: c.id }, limit: 5000 });
    const paid = os.filter((o) => o.paid_at && o.status !== 'refunded');
    out.push({ ...c, starts: dayStr(c.starts_at), ends: dayStr(c.ends_at ? c.ends_at - 864e5 : null), used: await couponUsed(c.id),
      orders: os.length, paid_orders: paid.length, discount_given: paid.reduce((s, o) => s + (o.discount || 0), 0) });
  }
  return { coupons: out, scopes: COUPON_SCOPES, max: COUPON_MAX, min_pay: MIN_PAY, today: dayStr(Date.now()) };
});
on('POST', 'admin/coupons', async (req) => {
  const staff = await needRole(req, ['admin']);
  const b = bodyOf(req);
  const op = ['create', 'update', 'delete'].includes(b.op) ? b.op : fail(400, 'bad_op');
  const store = await db();
  const code = op === 'create' ? normCode(b.data?.code) : normCode(b.code);
  if (op === 'create' && !/^[A-Z0-9][A-Z0-9_-]{2,19}$/.test(code)) fail(400, 'bad_code');
  const prev = await store.get('coupon', code);
  if (op === 'create' && prev) fail(409, 'code_exists');
  if (op !== 'create' && !prev) fail(404, 'not_found');
  if (op === 'delete') {
    if ((await couponUsed(code)) || (await store.count('order', { where: { coupon: code } }))) fail(400, 'has_orders'); // เคยมีคนใช้ → ให้หยุดใช้แทน
    await store.del('coupon', code);
    await store.del('couponuse', code);
  } else {
    if (op === 'create' && (await store.count('coupon')) >= COUPON_MAX) fail(400, 'too_many', { max: COUPON_MAX });
    const doc = cleanCoupon(b.data || {}, prev || { id: code, code, created_at: Date.now(), created_by: staff.name || staff.phone });
    await store.put('coupon', doc);
  }
  const c = op === 'delete' ? prev : await store.get('coupon', code);
  await audit(staff, 'coupon', { type: 'coupon', id: code, label: code }, { op, value: c.type === 'percent' ? `${c.value}%` : `${c.value} บาท`, scope: COUPON_SCOPES[c.scope], active: !!c.active });
  return { ok: true, code };
});
// ---------- ทีมงาน: รวมผู้ดูแล · ทีมงาน · หมอดู ในที่เดียว (หลังบ้าน → 👥 ทีมงาน) ----------
const STALE_DAYS = 30; // ไม่เข้าระบบเกินนี้ = ควรทบทวนสิทธิ์
const adminsLeft = async (exceptId) => (await (await db()).list('user', { status: 'admin', limit: 200 })).rows.filter((x) => x.id !== exceptId && !x.blocked).length;
on('GET', 'admin/team', async (req) => {
  await needRole(req, ['staff', 'admin']);
  const store = await db();
  const now = Date.now();
  const members = (await Promise.all(STAFF.map((r) => store.list('user', { status: r, limit: 300 })))).flatMap((x) => x.rows);
  const names = Object.fromEntries(catalog().SEER_ALL.map((x) => [x.id, x.name]));
  const rows = await Promise.all(members.map(async (u) => {
    const since = (d) => store.count('order', { where: { answered_by: u.id }, since: now - d * 864e5 });
    const [a7, a30, aAll, open, [last]] = await Promise.all([
      since(7), since(30), store.count('order', { where: { answered_by: u.id } }),
      store.count('order', { where: { assignee: u.id }, status: OPEN_JOB }),
      store.list('audit', { where: { by: u.id }, limit: 1 }).then((r) => r.rows),
    ]);
    const registered = !!(u.profile || u.last_login); // เคยเข้าระบบแล้ว (ผู้ดูแลที่ยังไม่กรอกโปรไฟล์ก็นับ)
    const lastLogin = u.last_login || null;
    return {
      id: u.id, phone: u.phone, name: u.profile ? [u.profile.first || u.name, u.profile.last].filter(Boolean).join(' ') : u.name || '', role: u.role,
      seer_name: names[u.seer_id] || '', blocked: !!u.blocked, registered, invited_at: u.invited_at || u.created_at || null,
      last_login: lastLogin, stale: !u.blocked && registered && now - lastLogin > STALE_DAYS * 864e5,
      answered: { d7: a7, d30: a30, all: aAll }, open_jobs: open, last_action: last ? { at: last.created_at, action: last.action } : null,
    };
  }));
  const order = { admin: 0, staff: 1, seer: 2 };
  rows.sort((x, y) => order[x.role] - order[y.role] || (y.last_login || 0) - (x.last_login || 0));
  return {
    members: rows, stale_days: STALE_DAYS, me: (await needUser(req)).id,
    counts: { admin: rows.filter((x) => x.role === 'admin').length, staff: rows.filter((x) => x.role === 'staff').length, seer: rows.filter((x) => x.role === 'seer').length,
      blocked: rows.filter((x) => x.blocked).length, stale: rows.filter((x) => x.stale).length, pending: rows.filter((x) => !x.registered).length },
    actions: AUDIT_ACTIONS,
  };
});
// เพิ่มทีมงานใหม่ (สิทธิ์ "ทีมงาน"): ใส่เบอร์ → คนนั้นสมัครที่หน้าเว็บด้วยเบอร์นี้แล้วได้สิทธิ์ทันที · ผู้ดูแล/หมอดู: ใช้หน้าลูกค้า/หน้าหมอดู
on('POST', 'admin/team/invite', async (req) => {
  const staff = await needRole(req, ['admin']);
  const b = bodyOf(req);
  const phone = normPhone(b.phone);
  const store = await db();
  const found = await store.byKey('user', phone);
  const apply = (u) => {
    if (u.role === 'admin' || u.role === 'staff') fail(400, 'already_team');
    u.role = 'staff';
    if (!u.profile) u.name = safeText(b.name, 60) || u.name;
    u.invited_at = u.invited_at || Date.now(); u.invited_by = u.invited_by || staff.id;
    u.sv = (u.sv || 0) + 1; u.updated_at = Date.now();
  };
  let u;
  if (found) u = await updateDoc('user', found.id, apply);
  else { u = { id: newId('u'), phone, name: '', profile: null, ai_until: 0, created_at: Date.now() }; apply(u); u.role = 'staff'; await store.put('user', u); }
  await audit(staff, 'team_invite', { type: 'user', id: u.id, label: userLabel(u) }, { phone: u.phone, registered: !!u.profile });
  return { ok: true, registered: !!u.profile };
});
on('GET', 'admin/catalog', async (req) => {
  await needRole(req, ['staff', 'admin']);
  const c = catalog();
  const stock = await stockMap();
  return { stock, services: c.SERVICES.map((s) => ({ id: s.id, name: s.name, icon: s.icon, open: s.open, app: !!s.app, group: s.group || '', prices: s.prices })), shop: c.SHOP_ITEMS.map((p) => ({ ...p, variants_list: variantsOf(p) })), price: c.SERVICE_PRICE };
});

// ---------- ตำราดูดวง: ตารางที่ใช้คำนวณ (คู่เลข · อักษรประจำดาว · ค่าอักษร) ----------
// หน้าเว็บดึงไปใช้คำนวณ · ทีมงาน/ผู้ดูแลแก้ได้ในหลังบ้าน (เก็บย้อนหลัง 20 เวอร์ชัน)
on('GET', 'kb', async () => {
  const o = await kbOverrides();
  return { kb: Object.fromEntries(Object.entries(o).map(([id, d]) => [id, { data: d.data, reviewed: d.reviewed }])) };
});
on('GET', 'admin/kb', async (req) => {
  await needRole(req, ['staff', 'admin']);
  const docs = {};
  for (const id of Object.keys(KB_TABLES)) {
    const d = await kbDoc(id);
    docs[id] = d ? { data: d.data, reviewed: !!d.reviewed, note: d.note || '', updated_at: d.updated_at, updated_by: d.updated_by,
      versions: (d.versions || []).map((v) => ({ at: v.at, by: v.by, reviewed: v.reviewed, note: v.note, size: v.data.length })) } : null;
  }
  return { tables: KB_TABLES, defaults: DEFAULT_KB, levels: PAIR_LEVELS, schema: KB_SCHEMA, docs };
});
on('POST', 'admin/kb/:id', async (req, res, { id }) => {
  const u = await needRole(req, ['staff', 'admin']);
  const b = bodyOf(req);
  const r = await saveKB(id, { data: b.reset ? null : b.data, reviewed: b.reviewed, note: b.reset ? 'คืนค่าเริ่มต้น' : b.note }, u.name || u.phone);
  if (!r.ok) fail(400, 'bad_kb', { message: r.error });
  await audit(u, 'kb', { type: 'kb', id: str(id, 40), label: KB_TABLES[id] || id }, { reset: !!b.reset, reviewed: !!b.reviewed, note: str(b.note, 200) });
  return { ok: true, updated_at: r.doc.updated_at };
});
on('POST', 'admin/kb/:id/restore', async (req, res, { id }) => {
  const u = await needRole(req, ['staff', 'admin']);
  const at = Number(bodyOf(req).at);
  const d = await kbDoc(id);
  const v = (d?.versions || []).find((x) => x.at === at);
  if (!v) fail(404, 'version_not_found');
  const r = await saveKB(id, { data: v.data, reviewed: v.reviewed, note: `ย้อนกลับเป็นเวอร์ชัน ${new Date(at).toISOString().slice(0, 16)}` }, u.name || u.phone);
  if (!r.ok) fail(400, 'bad_kb', { message: r.error });
  await audit(u, 'kb_restore', { type: 'kb', id: str(id, 40), label: KB_TABLES[id] || id }, { version: at });
  return { ok: true };
});

// =====================================================================
export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x');
    req.query = req.query && Object.keys(req.query).length ? req.query : Object.fromEntries(url.searchParams);
    const p = String(req.query.p || url.pathname.replace(/^\/api\/v1\/?/, '')).replace(/^\/+|\/+$/g, '');
    delete req.query.p;
    const method = req.method === 'HEAD' ? 'GET' : req.method;
    try { await syncSeerProfiles(await db()); } catch (_) { /* ฐานข้อมูลยังไม่พร้อม → ใช้ข้อมูลจาก seers-data.js */ }
    let found = false;
    for (const r of routes) {
      const m = r.re.exec(p);
      if (!m) continue;
      found = true;
      if (r.method !== method) continue;
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      if (method !== 'GET' && !sameOrigin(req, p)) fail(403, 'bad_origin');
      const out = await r.fn(req, res, params);
      if (out !== undefined) send(res, 200, out);
      return;
    }
    fail(found ? 405 : 404, found ? 'method_not_allowed' : 'not_found');
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.status, { error: e.code, ...(e.extra || {}) });
    console.error('[api]', e);
    return send(res, 500, { error: 'server_error' });
  }
}
// กัน CSRF: คำขอที่เปลี่ยนข้อมูลต้องมาจากเว็บเดียวกัน (ยกเว้น webhook จากผู้ให้บริการชำระเงิน)
function sameOrigin(req, p) {
  if (p.startsWith('webhooks/')) return true;
  const origin = req.headers.origin;
  if (!origin) return true; // เช่น curl / เซิร์ฟเวอร์ต่อเซิร์ฟเวอร์ (ไม่มีคุกกี้ของเบราว์เซอร์)
  try { return new URL(origin).host === req.headers.host || new URL(origin).host === req.headers['x-forwarded-host']; } catch (_) { return false; }
}
