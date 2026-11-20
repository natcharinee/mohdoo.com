// ===== ระบบหลังบ้าน หมอดู.com · API เดียวรวมทุกเส้นทาง (/api/v1/...) =====
// vercel.json ส่ง /api/v1/<path> มาที่ไฟล์นี้ (?p=<path>) · เครื่องพัฒนาใช้ dev-server.mjs
// ทุกอย่างทำงานได้โดยไม่ต้องตั้งค่า (โหมดทดลอง) และเปลี่ยนเป็นของจริงเมื่อใส่ Environment Variables (ดู BACKEND.md)
import { config } from './_lib/config.js';
import { db, newId } from './_lib/db.js';
import { HttpError, fail, send, bodyOf, str, int, ipOf, rateLimit } from './_lib/http.js';
import { startSession, endSession, sessionUser, needUser, needRole, normPhone, sendOtp, checkOtp, userForPhone, ROLES, STAFF, DEMO_CODE } from './_lib/auth.js';
import { priceOf, catalog, addMonth, KIND_NAME } from './_lib/catalog.js';
import { createPayment, paymentStatus, chargeIdFromEvent, refundPayment } from './_lib/pay.js';
import { saveFile, readLocalFile } from './_lib/storage.js';
import { notify, savePush } from './_lib/notify.js';

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
    steps: o.steps, step: o.step || 0, answer: o.answer || '', summary: o.summary || '', answered_by: o.answered_by ? (o.answered_by === 'ai' ? 'ai' : 'seer') : '',
    proof: o.proof || [], tracking: o.tracking || null, qr: o.status === 'pending' ? o.pay?.qr || null : null,
    expires_at: o.status === 'pending' ? o.pay?.expires_at : null, demo: o.pay?.provider === 'demo', form: o.form || null, photos: o.photos || [],
  };
}
const pubUser = (u) => ({ id: u.id, phone: u.phone, role: u.role, seer_id: u.seer_id || null, name: u.name, ai_until: u.ai_until || 0, profile: u.profile, created_at: u.created_at });
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
async function saveOrder(o) { o.updated_at = Date.now(); await (await db()).put('order', o); return o; }

// ---------- สต๊อกวัตถุมงคล: ไม่มีข้อมูล = ไม่จำกัด · จองตอนสร้าง QR · คืนเมื่อ QR หมดอายุหรือยกเลิกก่อนส่ง ----------
async function takeStock(o) {
  if (o.kind !== 'shop') return;
  const store = await db();
  const d = await store.get('stock', o.item_id);
  if (d && d.qty != null) {
    if (d.qty < o.qty) fail(409, 'out_of_stock', { left: d.qty });
    d.qty -= o.qty; d.updated_at = Date.now();
    await store.put('stock', d);
  }
  o.stock_held = true;
}
async function releaseStock(o) {
  if (!o.stock_held || o.stock_released) return;
  const store = await db();
  const d = await store.get('stock', o.item_id);
  if (d && d.qty != null) { d.qty += o.qty; d.updated_at = Date.now(); await store.put('stock', d); }
  o.stock_released = true;
}
async function stockMap() {
  const { rows } = await (await db()).list('stock', { limit: 500 });
  return Object.fromEntries(rows.map((d) => [d.id, d.qty]));
}

// ชำระเงินสำเร็จ → เปลี่ยนสถานะตามประเภทงาน
async function markPaid(o, by, via) {
  if (o.status !== 'pending' && o.status !== 'expired') return o;
  const store = await db();
  o.status = 'paid';
  o.paid_at = Date.now();
  log(o, by, 'paid', { via });
  if (o.kind === 'instant') o.status = 'done';
  if (o.kind === 'ai') {
    const u = await store.get('user', o.user_id);
    if (u) {
      u.ai_until = addMonth(Math.max(u.ai_until || 0, Date.now())); // ต่อจากวันหมดอายุเดิมถ้ายังไม่หมด
      u.ai_reminded = 0;
      await store.put('user', u);
      o.ai_until = u.ai_until;
    }
    o.status = 'done';
  }
  await saveOrder(o);
  await notify(o.user_id, { title: 'ชำระเงินสำเร็จ ✓', body: `${o.title} · ${o.amount.toLocaleString('th-TH')} ฿ · ${o.no}`, order_no: o.no });
  return o;
}
async function refreshPayment(o) {
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
  };
});

// ---------- เข้าสู่ระบบ ----------
on('POST', 'auth/otp', async (req) => {
  const b = bodyOf(req);
  const phone = normPhone(b.phone);
  rateLimit(`otp-ip:${ipOf(req)}`, 30, 10 * 60e3); // เครือข่ายมือถือไทยใช้ IP ร่วมกัน · ต่อเบอร์จำกัด 1 ครั้ง/นาทีอยู่แล้ว
  const exists = !!(await (await db()).byKey('user', phone))?.profile;
  // สมัครด้วยเบอร์ที่มีบัญชีแล้ว → ให้หน้าเว็บเปลี่ยนเป็นเข้าสู่ระบบ (ยังไม่ส่ง SMS)
  if (b.mode === 'register' && exists) return { exists: true, sent: false };
  const r = await sendOtp(phone);
  return { exists, sent: true, demo: r.demo || undefined };
});
on('POST', 'auth/verify', async (req, res) => {
  const b = bodyOf(req);
  const phone = normPhone(b.phone);
  rateLimit(`verify-ip:${ipOf(req)}`, 30, 10 * 60e3);
  await checkOtp(phone, b.code);
  const { user, isNew } = await userForPhone(phone);
  if (user.blocked) fail(403, 'blocked');
  startSession(res, user);
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
  u.profile = JSON.parse(json);
  u.name = str(rest.name || rest.first, 60);
  u.updated_at = Date.now();
  await (await db()).put('user', u);
  return { ok: true, updated_at: u.updated_at };
});
on('DELETE', 'me', async (req, res) => {
  // ลบบัญชี (PDPA): ลบโปรไฟล์ การแจ้งเตือน และปิดการเชื่อมคำสั่งซื้อกับตัวตน (เก็บยอดไว้ทำบัญชี)
  const u = await needUser(req);
  const store = await db();
  const { rows } = await store.list('order', { user_id: u.id, limit: 5000 });
  for (const o of rows) {
    o.phone = ''; o.name = 'บัญชีที่ลบแล้ว'; o.form = null; o.photos = []; o.user_deleted = true;
    await store.put('order', o);
  }
  await store.delWhere('notif', { user_id: u.id });
  await store.delWhere('push', { user_id: u.id });
  await store.del('user', u.id);
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
on('POST', 'orders', async (req) => {
  const u = await needUser(req);
  rateLimit(`order:${u.id}`, 30, 10 * 60e3);
  const b = bodyOf(req);
  const it = priceOf(b);
  const store = await db();
  // หมอดูตั้งราคาเองได้ (ถาม 1 เรื่อง) · ไม่ได้ตั้ง = ราคากลาง
  if (it.seer) {
    const sp = await store.get('seerprice', it.seer);
    if (sp && sp.price) { it.price = sp.price; it.amount = sp.price; }
  }
  const no = await orderNo(store);
  const o = {
    id: no, no, user_id: u.id, phone: u.phone, name: u.name, ...it,
    title: str(b.title, 90) || it.title, // ชื่อที่แสดง (เช่น ชื่อประเภทศาสตร์) · ราคาไม่เปลี่ยน
    place: str(b.place, 160) || undefined, status: 'pending', step: 0, created_at: Date.now(), updated_at: Date.now(), log: [],
  };
  log(o, u, 'created');
  await takeStock(o);
  try { o.pay = await createPayment(o); } catch (e) { await releaseStock(o); throw e; }
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
  for (const p of (Array.isArray(b.photos) ? b.photos : []).slice(0, 6)) {
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
on('GET', 'seers/prices', async () => ({ prices: await seerPrices(), base: catalog().CATEGORY_PRICE }));

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
  const u = await needUser(req);
  const f = readLocalFile(name);
  if (f.owner !== u.id && !STAFF.includes(u.role)) fail(404, 'not_found');
  send(res, 200, f.buf, { 'Content-Type': f.type, 'Cache-Control': 'private, max-age=3600' });
  return undefined;
});

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
    if (o.pay?.provider === 'omise') { await refreshPayment(o); continue; }
    if ((o.pay?.expires_at || 0) < now - 60e3) { o.status = 'expired'; await releaseStock(o); await saveOrder(o); expired += 1; }
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
        u.ai_reminded = now;
        await store.put('user', u);
        reminded += 1;
      }
    }
  }
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
  return true;
}
async function seerUsers() {
  const { rows } = await (await db()).list('user', { status: 'seer', limit: 1000 });
  return rows.filter((u) => !u.blocked);
}
async function notifySeers(o) {
  const all = await seerUsers();
  const to = o.seer ? all.filter((u) => u.seer_id === o.seer) : all;
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
  const prof = catalog().SEER_IDS.find((x) => x.id === u.seer_id);
  return { seer_id: u.seer_id || null, seer_name: prof?.name || '', price: (u.seer_id && prices[u.seer_id]) || null, base: catalog().CATEGORY_PRICE, limits: SEER_PRICE };
});
on('POST', 'seer/price', async (req) => {
  const u = await needSeer(req);
  if (!u.seer_id) fail(400, 'no_seer_profile');
  const price = await setSeerPrice(u.seer_id, bodyOf(req).price, u.name || u.phone);
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
  const lowStock = catalog().SHOP_ITEMS.filter((p) => stock[p.id] != null && stock[p.id] <= 3).map((p) => ({ id: p.id, name: p.name, icon: p.icon, qty: stock[p.id] }));
  return { lowStock,
    today: { orders: paid.filter((o) => o.paid_at >= day0).length, revenue: sum(paid.filter((o) => o.paid_at >= day0)) },
    d7: { orders: paid.filter((o) => o.paid_at >= now - 7 * 864e5).length, revenue: sum(paid.filter((o) => o.paid_at >= now - 7 * 864e5)) },
    d30: { orders: paid.filter((o) => o.paid_at >= now - 30 * 864e5).length, revenue: sum(paid.filter((o) => o.paid_at >= now - 30 * 864e5)),
      donation: paid.filter((o) => o.paid_at >= now - 30 * 864e5).reduce((a, o) => a + (o.donation || 0), 0) },
    queue, series, byKind: Object.values(byKind).sort((a, b) => b.revenue - a.revenue),
    users: { total: users.filter((u) => u.profile).length, today: users.filter((u) => u.created_at >= day0 && u.profile).length, ai: users.filter((u) => (u.ai_until || 0) > now).length },
    config: { db: store.kind, otp: config.otp, pay: config.pay, storage: config.storage, push: !!config.vapid, ai: config.ai, cron: !!config.cronSecret },
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
      o.tracking = { carrier: str(b.carrier, 40), no: str(b.no, 60) };
      if (!o.tracking.no) fail(400, 'empty');
      o.step = o.steps.length; o.status = 'shipped';
      msg = { title: 'จัดส่งสินค้าแล้ว 📦', body: `${o.tracking.carrier} ${o.tracking.no}` };
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
        o.assignee = t ? t.id : null; o.assignee_name = t ? t.name || t.phone : null;
      }
      break;
    case 'mark-paid': // ลูกค้าโอนเข้าบัญชีโดยตรง → ผู้ดูแลยืนยันเอง
      if (staff.role !== 'admin') fail(403, 'forbidden');
      await markPaid(o, staff, 'manual');
      return { order: adminOrder(await getOrder(o.no)) };
    case 'cancel':
      if (o.status !== 'pending' && staff.role !== 'admin') fail(403, 'forbidden');
      if (o.status !== 'shipped') await releaseStock(o); // ยังไม่ส่งของ → คืนสต๊อก
      o.status = 'cancelled';
      msg = isPaid ? { title: `ยกเลิกคำสั่งซื้อ ${o.no}`, body: str(b.reason, 200) || 'ทีมงานจะติดต่อกลับเรื่องการคืนเงิน' } : null;
      break;
    case 'refund': {
      if (staff.role !== 'admin' || !o.paid_at || o.status === 'refunded') fail(400, 'bad_state');
      const amt = Math.min(o.amount, int(b.amount) || o.amount);
      o.refund = { at: Date.now(), amount: amt, reason: str(b.reason, 200), by: staff.id, ...(await refundPayment(o.pay, amt)) };
      o.status = 'refunded';
      msg = { title: 'คืนเงินแล้ว', body: `${o.no} · ${amt.toLocaleString('th-TH')} ฿` };
      break;
    }
    default: fail(400, 'bad_action');
  }
  log(o, staff, act, act === 'status' || act === 'step' ? { to: o.status, step: o.step } : {});
  await saveOrder(o);
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
  const names = Object.fromEntries(catalog().SEER_IDS.map((x) => [x.id, x.name]));
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
  return { seers, profiles: catalog().SEER_IDS, base: catalog().CATEGORY_PRICE };
});
on('POST', 'admin/seers/price', async (req) => {
  const staff = await needRole(req, ['admin']);
  const b = bodyOf(req);
  const sid = str(b.seer_id, 40);
  if (!catalog().SEER_IDS.some((x) => x.id === sid)) fail(400, 'unknown_seer');
  const price = await setSeerPrice(sid, b.price, staff.name || staff.phone);
  return { ok: true, price };
});
on('POST', 'admin/seers', async (req) => {
  const staff = await needRole(req, ['admin']);
  const b = bodyOf(req);
  const phone = normPhone(b.phone);
  const sid = str(b.seer_id, 40);
  if (sid && !catalog().SEER_IDS.some((x) => x.id === sid)) fail(400, 'unknown_seer');
  const store = await db();
  let u = await store.byKey('user', phone);
  if (u && ['staff', 'admin'].includes(u.role)) fail(400, 'is_staff');
  if (!u) u = { id: newId('u'), phone, name: '', profile: null, ai_until: 0, created_at: Date.now(), invited_at: Date.now(), invited_by: staff.id };
  u.role = 'seer';
  u.seer_id = sid || u.seer_id || null;
  if (!u.profile) u.name = str(b.name, 60) || u.name;
  u.updated_at = Date.now();
  await store.put('user', u);
  return { ok: true, registered: !!u.profile };
});

on('GET', 'admin/users', async (req) => {
  await needRole(req, ['staff', 'admin']);
  const q = req.query || {};
  const f = { limit: Math.min(int(q.limit) || 30, 200), offset: int(q.offset) || 0, q: str(q.q, 60) || undefined };
  if (q.role) f.status = str(q.role, 20);
  let { rows, total } = await (await db()).list('user', f);
  if (q.ai) { rows = rows.filter((u) => (u.ai_until || 0) > Date.now()); total = rows.length; }
  return { users: rows.map((u) => ({ id: u.id, phone: u.phone, name: u.name || u.profile?.name || '', role: u.role, ai_until: u.ai_until || 0, created_at: u.created_at, last_login: u.last_login, blocked: !!u.blocked, history: (u.profile?.history || []).length })), total };
});
on('GET', 'admin/users/:id', async (req, res, { id }) => {
  await needRole(req, ['staff', 'admin']);
  const store = await db();
  const u = await store.get('user', str(id, 40));
  if (!u) fail(404, 'not_found');
  const { rows } = await store.list('order', { user_id: u.id, limit: 200 });
  return { user: { ...pubUser(u), blocked: !!u.blocked, last_login: u.last_login, notes: u.notes || [], seer_id: u.seer_id || null }, orders: rows.map(adminOrder), seers: catalog().SEER_IDS };
});
on('POST', 'admin/users/:id', async (req, res, { id }) => {
  const staff = await needRole(req, ['staff', 'admin']);
  const store = await db();
  const u = await store.get('user', str(id, 40));
  if (!u) fail(404, 'not_found');
  const b = bodyOf(req);
  if (b.role !== undefined) {
    if (staff.role !== 'admin' || !ROLES.includes(b.role)) fail(403, 'forbidden');
    if (u.id === staff.id && b.role !== 'admin') fail(400, 'cannot_demote_self');
    u.role = b.role;
  }
  if (b.seer_id !== undefined) { // เชื่อมบัญชีกับโปรไฟล์หมอดู (รับงานที่ลูกค้าเลือกท่านนี้)
    if (staff.role !== 'admin') fail(403, 'forbidden');
    const sid = str(b.seer_id, 40);
    if (sid && !catalog().SEER_IDS.some((x) => x.id === sid)) fail(400, 'unknown_seer');
    u.seer_id = sid || null;
  }
  if (b.ai_days !== undefined) { // ให้/ต่ออายุสมาชิก AI (ชดเชยลูกค้า)
    const d = int(b.ai_days);
    if (!(d >= -365 && d <= 365)) fail(400, 'bad_days');
    u.ai_until = Math.max(u.ai_until || 0, Date.now()) + d * 864e5;
  }
  if (b.blocked !== undefined) { if (staff.role !== 'admin') fail(403, 'forbidden'); u.blocked = !!b.blocked; u.sv = (u.sv || 0) + 1; }
  if (b.logout) u.sv = (u.sv || 0) + 1;
  if (b.note) (u.notes ||= []).push({ at: Date.now(), by: staff.name || staff.phone, text: str(b.note, 1000) });
  u.updated_at = Date.now();
  await store.put('user', u);
  return { ok: true };
});

on('POST', 'admin/broadcast', async (req) => {
  await needRole(req, ['admin']);
  const b = bodyOf(req);
  const title = str(b.title, 80); const body = str(b.body, 300);
  if (!title || !body) fail(400, 'empty');
  const { rows } = await (await db()).list('user', { limit: 50000 });
  const target = rows.filter((u) => u.profile && !u.blocked && (b.target !== 'ai' || (u.ai_until || 0) > Date.now()));
  for (const u of target) await notify(u.id, { title, body, link: str(b.link, 200) });
  return { ok: true, sent: target.length };
});
on('POST', 'admin/cron/daily', async (req) => { await needRole(req, ['admin']); return runDaily(); });

on('GET', 'admin/export/orders', async (req, res) => {
  await needRole(req, ['staff', 'admin']);
  const q = req.query || {};
  const since = q.days ? Date.now() - Math.min(int(q.days) || 30, 3650) * 864e5 : 0;
  const { rows } = await (await db()).list('order', { since, limit: 100000, asc: true });
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['เลขที่', 'วันที่สั่ง', 'วันที่ชำระ', 'สถานะ', 'ประเภท', 'รายการ', 'แพ็กเกจ', 'ค่าบริการ', 'เงินทำบุญ', 'ยอดรวม', 'ลูกค้า', 'เบอร์', 'ชำระผ่าน', 'คืนเงิน'];
  const th = (t) => (t ? new Date(t).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : '');
  const lines = rows.map((o) => [o.no, th(o.created_at), th(o.paid_at), STATUS[o.status], KIND_NAME[o.kind], o.title, o.label, o.price, o.donation || 0, o.amount, o.name, o.phone, o.pay?.provider, o.refund?.amount || ''].map(cell).join(','));
  send(res, 200, `﻿${[head.map(cell).join(','), ...lines].join('\r\n')}`, {
    'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="mohdoo-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
  });
  return undefined;
});
on('POST', 'admin/stock', async (req) => {
  const staff = await needRole(req);
  const b = bodyOf(req);
  const p = catalog().SHOP_ITEMS.find((x) => x.id === str(b.id, 40));
  if (!p || p.digital) fail(400, 'unknown_item');
  const store = await db();
  if (b.qty === null || b.qty === '') { await store.del('stock', p.id); return { ok: true, qty: null }; } // ไม่จำกัด
  const q = int(b.qty);
  if (!(q >= 0 && q <= 100000)) fail(400, 'bad_qty');
  const prev = await store.get('stock', p.id);
  await store.put('stock', { id: p.id, qty: q, updated_at: Date.now(), updated_by: staff.name || staff.phone, created_at: prev?.created_at || Date.now() });
  return { ok: true, qty: q };
});
on('GET', 'admin/catalog', async (req) => {
  await needRole(req, ['staff', 'admin']);
  const c = catalog();
  const stock = await stockMap();
  return { stock, services: c.SERVICES.map((s) => ({ id: s.id, name: s.name, icon: s.icon, open: s.open, app: !!s.app, group: s.group || '', prices: s.prices })), shop: c.SHOP_ITEMS, price: c.SERVICE_PRICE };
});

// =====================================================================
export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x');
    req.query = req.query && Object.keys(req.query).length ? req.query : Object.fromEntries(url.searchParams);
    const p = String(req.query.p || url.pathname.replace(/^\/api\/v1\/?/, '')).replace(/^\/+|\/+$/g, '');
    delete req.query.p;
    const method = req.method === 'HEAD' ? 'GET' : req.method;
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
