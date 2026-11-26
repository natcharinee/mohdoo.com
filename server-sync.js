// ===== เชื่อมหน้าเว็บกับระบบหลังบ้าน (/api/v1) =====
// มีเซิร์ฟเวอร์ (health ตอบ ok) → เข้าสู่ระบบด้วย OTP จริง · บันทึกโปรไฟล์/แฟ้มดวงขึ้นเซิร์ฟเวอร์ · สั่งซื้อและชำระเงินผ่านเซิร์ฟเวอร์
//   · คำตอบหมอดู / ขั้นตอนงาน / รูปยืนยัน / เลขพัสดุ ไหลกลับมาที่ “ประวัติการดูดวง” · กล่องแจ้งเตือน + Push
// ไม่มีเซิร์ฟเวอร์ (เปิดไฟล์ตรง ๆ หรือ http.server) → ใช้โหมดทดลองในเบราว์เซอร์แบบเดิมทั้งหมด
window.SERVER = null;
const serverReady = fetch('/api/v1/health', { cache: 'no-store' })
  .then((r) => (r.ok ? r.json() : null))
  // ใช้ระบบหลังบ้านเมื่อพร้อมจริงเท่านั้น (ตั้งค่า OTP และการชำระเงินแล้ว) · ยังไม่ตั้ง = โหมดทดลองในเบราว์เซอร์เหมือนเดิม
  .then((j) => { window.SERVER = j && j.ok && j.otp !== 'off' && j.pay !== 'off' ? j : null; if (window.SERVER) setHumanOpen(j.human_open); return window.SERVER; })
  .catch(() => null);

// ศาสตร์ที่ต้องใช้หมอดูจริง: เปิด/ปิดตามที่เซิร์ฟเวอร์บอก แล้วอัปเดตจำนวนประเภทที่แสดงบนการ์ดหมวด
function setHumanOpen(list) {
  if (!Array.isArray(list) || typeof HUMAN_OPEN === 'undefined') return;
  const next = list.filter((k) => typeof k === 'string');
  if (next.length === HUMAN_OPEN.size && next.every((k) => HUMAN_OPEN.has(k))) return;
  HUMAN_OPEN.clear(); next.forEach((k) => HUMAN_OPEN.add(k));
  try { localStorage.setItem('mohdoo_human_open', JSON.stringify(next)); } catch (_) {}
  document.querySelectorAll('.cat[data-cat] em').forEach((em) => {
    const c = CATEGORIES.find((x) => x.id === em.closest('[data-cat]').dataset.cat);
    if (c) em.textContent = `${c.types.filter(typeOn).length} ประเภท ›`;
  });
}

const SRV_ERR = {
  unavailable: 'ประเภทนี้ยังไม่เปิดให้บริการ',
  wrong_code: 'รหัส OTP ไม่ถูกต้อง', code_expired: 'รหัสหมดอายุแล้ว กด “ขอรหัสใหม่”', too_many_tries: 'ใส่รหัสผิดหลายครั้ง กรุณาขอรหัสใหม่',
  bad_phone: 'เบอร์โทรไม่ถูกต้อง', too_many_requests: 'ทำรายการถี่เกินไป รอสักครู่แล้วลองใหม่', sms_failed: 'ส่ง SMS ไม่สำเร็จ ลองใหม่อีกครั้ง',
  otp_not_configured: 'ระบบ OTP ยังไม่พร้อม', payment_not_configured: 'ระบบชำระเงินยังไม่พร้อม', payment_failed: 'สร้าง QR ไม่สำเร็จ ลองใหม่อีกครั้ง',
  service_closed: 'บริการนี้ยังไม่เปิดให้จอง', bad_donation: 'กรุณาเลือกจำนวนเงินทำบุญ', login_required: 'กรุณาเข้าสู่ระบบอีกครั้ง',
  file_too_large: 'รูปใหญ่เกินไป', out_of_stock: 'สินค้าเหลือไม่พอ ปรับจำนวนใหม่อีกครั้งนะคะ', conflict: 'ข้อมูลเพิ่งถูกอัปเดต ลองอีกครั้งนะคะ', coupon_invalid: 'ไม่พบโค้ดนี้ หรือโค้ดปิดใช้งานแล้ว', coupon_expired: 'โค้ดนี้หมดอายุแล้ว', coupon_not_started: 'โค้ดนี้ยังไม่ถึงวันเริ่มใช้', coupon_used_up: 'โค้ดนี้ถูกใช้ครบจำนวนแล้ว', coupon_user_limit: 'คุณใช้สิทธิ์โค้ดนี้ครบแล้ว', coupon_scope: 'โค้ดนี้ใช้กับรายการนี้ไม่ได้', coupon_na: 'ราคารายการนี้ต่ำเกินไปที่จะลดด้วยโค้ดนี้', staff_cannot_self_delete: 'บัญชีทีมงานลบเองไม่ได้ ติดต่อผู้ดูแลระบบ', busy: 'ระบบไม่ว่าง ลองอีกครั้งนะคะ', bad_file: 'ไฟล์รูปไม่ถูกต้อง', blocked: 'บัญชีนี้ถูกระงับ ติดต่อทีมงาน',
};
async function srv(path, { method = 'GET', body } = {}) {
  const r = await fetch(`/api/v1/${path}`, {
    method, credentials: 'same-origin', cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(j.error === 'wait' ? `ขอรหัสใหม่ได้ใน ${j.wait} วินาที` : SRV_ERR[j.error] || 'เชื่อมต่อระบบไม่สำเร็จ ลองใหม่อีกครั้ง');
    if (j.error === 'coupon_min') e.message = `โค้ดนี้ใช้ได้เมื่อยอดตั้งแต่ ${Number(j.min).toLocaleString('th-TH')} บาทขึ้นไป`;
    e.code = j.error; e.status = r.status;
    throw e;
  }
  return j;
}

// ---------- เข้าสู่ระบบ ----------
const srvSendOtp = (phone, mode) => srv('auth/otp', { method: 'POST', body: { phone, mode } });
let srvSession = null; // เบอร์ของเซสชันบนเซิร์ฟเวอร์ (บันทึกโปรไฟล์ได้เฉพาะบัญชีนี้)
let srvLast = null; // ผู้ใช้จากการยืนยัน OTP ล่าสุด (สิทธิ์หมอดูที่ทีมงานลงไว้ก่อน)
const srvVerify = (phone, code) => srv('auth/verify', { method: 'POST', body: { phone, code } }).then((r) => { srvSession = r.user.phone; srvLast = r.user; return r; });
const srvLogout = () => { srvSession = null; seerKnown = null; notes = { items: [], unread: 0 }; setTimeout(() => { if (typeof paintBell === 'function') paintBell(); if (typeof seerAlert === 'function') seerAlert(); const t = document.querySelector('#tabAccount span'); if (t) t.dataset.badge = ''; }, 0); return window.SERVER ? srv('auth/logout', { method: 'POST' }).catch(() => {}) : null; };

// โปรไฟล์จากเซิร์ฟเวอร์ + รูปในแฟ้มดวงที่เก็บในเครื่องนี้ (รูปไม่ขึ้นเซิร์ฟเวอร์กับโปรไฟล์ · ส่งเฉพาะตอนสั่งดูดวง)
function srvUserFrom(su) {
  const local = (typeof findAccount === 'function' && findAccount(su.phone)) || {};
  return { ...su.profile, phone: su.phone, photos: local.photos || su.profile.photos, photoLog: local.photoLog, aiUntil: su.ai_until || 0, role: su.role, seerId: su.seer_id || null };
}

// ---------- บันทึกโปรไฟล์ขึ้นเซิร์ฟเวอร์ (เรียกจาก persistUser) ----------
let saveTimer = null;
let lastSaved = '';
function srvSaveProfile(u) {
  if (!window.SERVER || !u || !u.phone || u.phone !== srvSession) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (u.phone !== srvSession) return;
    const { photos, photoLog, aiUntil, role, seerId, ...profile } = u;
    const json = JSON.stringify(profile);
    if (json === lastSaved) return;
    srv('me', { method: 'PUT', body: { profile } }).then(() => { lastSaved = json; }).catch((e) => {
      if (e.status === 401) toast('กรุณาเข้าสู่ระบบอีกครั้ง เพื่อบันทึกข้อมูลขึ้นระบบ');
    });
  }, 800);
}

// ---------- คำสั่งซื้อ ----------
const orderBody = (o) => ({ key: o.item.key, tier: o.tier, qty: o.qty || 1, donation: o.donation || 0, title: o.item.title, ...(o.item.variant ? { variant: o.item.variant.key } : {}), place: (o.item.preset || {}).place || '' });
const srvCreateOrder = (o) => srv('orders', { method: 'POST', body: { ...orderBody(o), ...(o.coupon ? { coupon: o.coupon.code } : {}) } });
const srvCheckCoupon = (o, code) => srv('coupons/check', { method: 'POST', body: { ...orderBody(o), coupon: code } });
const srvOrder = (no) => srv(`orders/${encodeURIComponent(no)}`);
const srvDemoPay = (no) => srv(`orders/${encodeURIComponent(no)}/demo-pay`, { method: 'POST' });
const srvCancel = (no) => srv(`orders/${encodeURIComponent(no)}/cancel`, { method: 'POST' }).catch(() => {});
const srvIntake = (no, body) => srv(`orders/${encodeURIComponent(no)}/intake`, { method: 'POST', body });

// คำอ่านจากแม่หมอ AI (ลายมือ/โหงวเฮ้ง) → ส่งเป็นคำตอบของคำสั่งซื้อด้วย
if (typeof updateHistory === 'function') {
  const _upd = updateHistory;
  updateHistory = function (id, patch) {
    _upd(id, patch);
    const h = ((currentUser() || {}).history || []).find((x) => x.id === id);
    if (window.SERVER && h && h.no && patch && patch.reading) {
      srv(`orders/${encodeURIComponent(h.no)}/ai-result`, { method: 'POST', body: { reading: patch.reading, summary: patch.summary || '' } }).catch(() => {});
    }
  };
}

// ---------- สถานะงานจากเซิร์ฟเวอร์ → ประวัติการดูดวง ----------
function orderStatusText(o) {
  if (o.status === 'in_progress' && o.steps) return o.steps[Math.min(o.step, o.steps.length - 1)];
  if (o.status === 'submitted') return 'รอหมอดูตอบ';
  return o.status_text;
}
async function srvSyncOrders() {
  const u = currentUser();
  if (!window.SERVER || !u) return;
  let list;
  try { ({ orders: list } = await srv('me/orders')); } catch (_) { return; }
  const before = JSON.stringify(u.history || []);
  u.history = u.history || [];
  list.filter((o) => o.form && !['instant', 'ai', 'ask'].includes(o.kind)).forEach((o) => {
    let h = u.history.find((x) => x.no === o.no);
    if (!h) { // สั่งจากอีกเครื่อง → เพิ่มเข้าประวัติ
      h = { id: `h${o.no}`, at: o.paid_at || o.created_at, kind: 'order', svc: o.key, icon: o.icon, title: o.title, no: o.no, amount: o.amount, label: o.label, data: o.form, fields: o.fields || [] };
      u.history.push(h);
    }
    h.status = orderStatusText(o);
    h.srv = o.status;
    if (o.steps) { h.steps = o.steps; h.stepNow = o.step; }
    if (o.answer && o.answered_by !== 'ai') { h.reading = o.answer; h.summary = o.summary || h.summary; }
    if (o.proof.length) h.proof = o.proof;
    if (o.tracking) h.tracking = o.tracking;
  });
  u.history.sort((a, b) => b.at - a.at);
  if (JSON.stringify(u.history) !== before) persistUser(u);
}

// ---------- แจ้งเตือน ----------
let notes = { items: [], unread: 0 };
async function srvNotes(showToast) {
  if (!window.SERVER || !currentUser()) return;
  try { notes = await srv('me/notifications'); } catch (_) { return; }
  paintBell();
  if (showToast && notes.unread) toast(`🔔 ${notes.items.find((n) => !n.read).title}`);
}
function srvProfileHTML() {
  if (!window.SERVER) return '';
  return isSeer() ? seerCardHTML() : ''; // การแจ้งเตือนย้ายไปที่กระดิ่งมุมขวาบน
}

// ---------- กระดิ่งแจ้งเตือนมุมขวาบน (ข้างปุ่มเลือกภาษา) ----------
const noteTime = (ts) => new Date(ts).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
function ensureBell() {
  let bell = document.getElementById('noteBell');
  if (bell) return bell;
  const lang = document.getElementById('langSwitch');
  if (!lang) return null;
  const bar = document.createElement('div');
  bar.className = 'top-actions';
  lang.parentNode.insertBefore(bar, lang);
  bar.innerHTML = '<button class="note-bell" id="noteBell" type="button" aria-label="การแจ้งเตือน" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v3.6L4.4 15.3A1 1 0 0 0 5.3 17h13.4a1 1 0 0 0 .9-1.7L18 12.6V9a6 6 0 0 0-6-6z"/><path d="M9.5 19a2.5 2.5 0 0 0 5 0"/></svg><b></b></button>';
  bar.appendChild(lang);
  bell = document.getElementById('noteBell');
  bell.addEventListener('click', openNotes);
  return bell;
}
function paintBell() {
  const bell = ensureBell();
  if (!bell) return;
  bell.hidden = !(window.SERVER && currentUser());
  const n = notes.unread || 0;
  bell.querySelector('b').textContent = n ? (n > 9 ? '9+' : n) : '';
  bell.classList.toggle('has-new', !!n);
}
let notesPanel = null;
function renderNotes() {
  const push = window.SERVER && window.SERVER.push && 'serviceWorker' in navigator && 'PushManager' in window;
  const pushOn = push && Notification.permission === 'granted' && localStorage.getItem('mohdooPush') === '1';
  notesPanel.querySelector('.panel-body').innerHTML = `
    ${push ? `<div class="note-push"><span>📱 แจ้งเตือนบนมือถือ<small>${pushOn ? 'เปิดอยู่ · ได้รับแม้ปิดเว็บ' : 'เปิดไว้ จะได้รู้ทันทีเมื่อหมอดูตอบ'}</small></span><button class="btn-ghost sm" id="pushBtn">${pushOn ? 'ปิด' : 'เปิด'}</button></div>` : ''}
    ${notes.items.length ? `<ul class="note-list">${notes.items.slice(0, 30).map((n) => `<li class="${n.read ? '' : 'new'}" ${n.order_no ? `data-note-order="${esc(n.order_no)}"` : ''} ${n.link === '#seer' ? 'data-note-seer="1"' : ''}>
        <b>${esc(n.title)}</b><span>${esc(n.body)}</span><small>${noteTime(n.created_at)}</small></li>`).join('')}</ul>`
      : '<div class="note-empty"><span>🔔</span><p>ยังไม่มีการแจ้งเตือน</p><small>เมื่อชำระเงิน หมอดูตอบ หรืองานคืบหน้า จะแจ้งที่นี่</small></div>'}`;
}
async function openNotes() {
  if (!notesPanel) { notesPanel = makePanel('notesPanel', 'การแจ้งเตือน'); notesPanel.style.zIndex = 19; }
  renderNotes();
  openPanel('notesPanel');
  await srvNotes(false);
  renderNotes(); // รายการล่าสุด (รายการใหม่ยังเน้นสีให้เห็นในรอบนี้)
  if (notes.unread) {
    srv('me/notifications/read', { method: 'POST' }).then(() => { notes.unread = 0; notes.items.forEach((n) => { n.read = true; }); paintBell(); }).catch(() => {});
  }
}

// เปิดหน้าบัญชี → อ่านแจ้งเตือนแล้ว
function srvProfileOpened() {
  if (isSeer()) seerCount(); // อัปเดตจำนวนคำถามรอตอบบนการ์ด
}
document.addEventListener('click', async (e) => {
  const li = e.target.closest('[data-note-order]');
  if (li && li.dataset.noteSeer) { openSeerJobs(li.dataset.noteOrder); return; }
  if (li) {
    const h = ((currentUser() || {}).history || []).find((x) => x.no === li.dataset.noteOrder);
    if (h && typeof openHistory === 'function') openHistory(h.id);
    return;
  }
  if (e.target.closest('#pushBtn')) {
    const on = localStorage.getItem('mohdooPush') === '1' && Notification.permission === 'granted';
    try {
      if (on) await srvPushOff(); else await srvPushOn();
    } catch (err) { toast(err.message || 'เปิดการแจ้งเตือนไม่สำเร็จ'); }
    if (notesPanel) renderNotes();
  }
});

// ---------- Web Push ----------
const b64ToBytes = (s) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
async function srvPushOn() {
  if (await Notification.requestPermission() !== 'granted') throw new Error('ยังไม่ได้อนุญาตการแจ้งเตือนในเบราว์เซอร์');
  const reg = await navigator.serviceWorker.register('sw.js');
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(window.SERVER.push) });
  await srv('me/push', { method: 'POST', body: { subscription: sub.toJSON() } });
  localStorage.setItem('mohdooPush', '1');
  toast('เปิดการแจ้งเตือนแล้ว ✦ จะแจ้งเมื่อหมอดูตอบและดวงประจำวันมาถึง');
}
async function srvPushOff() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && (await reg.pushManager.getSubscription());
  if (sub) await sub.unsubscribe();
  await srv('me/push', { method: 'DELETE' });
  localStorage.removeItem('mohdooPush');
  toast('ปิดการแจ้งเตือนแล้ว');
}

// ---------- เริ่มต้น ----------
(async () => {
  await serverReady;
  if (!window.SERVER) return;
  document.documentElement.dataset.server = window.SERVER.pay;
  let me = null;
  try { ({ user: me } = await srv('me')); } catch (_) { return; }
  const local = currentUser();
  srvSession = me ? me.phone : null;
  if (me && me.profile) {
    // เซสชันบนเซิร์ฟเวอร์คือของจริง → ใช้ข้อมูลจากเซิร์ฟเวอร์
    const u = srvUserFrom(me);
    lastSaved = JSON.stringify(me.profile);
    try { localStorage.setItem(USER_KEY, JSON.stringify(u)); } catch (_) {}
    applyUser();
  } else if (local) {
    // ข้อมูลในเครื่องแต่ไม่มีเซสชัน → ออกจากระบบในเครื่อง (ประวัติยังอยู่ในบัญชีเครื่องนี้ เข้าสู่ระบบด้วย OTP แล้วกลับมา)
    try { localStorage.removeItem(USER_KEY); } catch (_) {}
    applyUser();
  }
  if (!currentUser()) return;
  await srvSyncOrders();
  await srvNotes(!isSeer());
  if (isSeer()) {
    await seerCount();
  }
  setInterval(() => { if (!document.hidden && currentUser()) { srvNotes(false); srvSyncOrders(); } }, 60e3);
})();

// =====================================================================
//       หมอดู: กล่องคำถามบนหน้าเว็บ (บัญชี → งานตอบคำถาม) · ไม่ต้องเข้าหลังบ้าน
// =====================================================================
const isSeer = () => !!window.SERVER && (currentUser() || {}).role === 'seer';
let seerOpen = 0;
let seerTab = 'open';
let jobsPanel = null;
const ago = (t) => {
  const m = Math.round((Date.now() - t) / 60000);
  return m < 60 ? `${Math.max(1, m)} นาทีที่แล้ว` : m < 1440 ? `${Math.round(m / 60)} ชม.ที่แล้ว` : `${Math.round(m / 1440)} วันที่แล้ว`;
};
let seerOldest = null;
let seerKnown = null; // จำนวนครั้งก่อน (ใช้ดูว่ามีคำถามใหม่เข้ามา)
async function seerCount() {
  try { const r = await srv('seer/jobs'); seerOpen = r.open || 0; seerOldest = r.oldest; } catch (_) { return; }
  seerAlert();
}
// ---------- แจ้งเตือนหมอดูให้เห็นชัด: แถบบนหน้าแรก · ป้ายแดงที่แท็บบัญชี · ชื่อแท็บเบราว์เซอร์ · เด้งเตือนเมื่อมีคำถามใหม่ ----------
const TITLE = document.title;
function seerAlert() {
  if (!isSeer()) { // ออกจากระบบ/ไม่ใช่หมอดู → ซ่อนทั้งหมด
    const b = document.getElementById('seerAlert');
    if (b) b.hidden = true;
    document.title = TITLE;
    return;
  }
  let bar = document.getElementById('seerAlert');
  if (!bar) {
    const hello = document.getElementById('hello');
    if (!hello) return;
    hello.insertAdjacentHTML('beforebegin', '<button class="seer-alert" id="seerAlert" data-seer-open hidden></button>');
    bar = document.getElementById('seerAlert');
  }
  const hrs = seerOldest ? (Date.now() - seerOldest) / 3600e3 : 0;
  const urgent = seerOpen && hrs >= 18; // ใกล้ครบ 24 ชม. ที่สัญญากับลูกค้า
  bar.hidden = !seerOpen;
  bar.classList.toggle('urgent', !!urgent);
  bar.innerHTML = `<span class="sa-ico">🔮</span><span class="sa-txt"><b>มีคำถามลูกค้ารอตอบ ${seerOpen} ข้อ</b>
    <small>${urgent ? `⚠️ รอนานแล้ว ${Math.floor(hrs)} ชม. · ต้องตอบภายใน 24 ชม.` : seerOldest ? `คำถามแรกรอมา ${ago(seerOldest).replace('ที่แล้ว', '')} · ตอบภายใน 24 ชม.` : 'ตอบภายใน 24 ชม.'}</small></span><span class="sa-go">ตอบเลย ›</span>`;
  const tab = document.querySelector('#tabAccount span');
  if (tab) tab.dataset.badge = seerOpen ? (seerOpen > 9 ? '9+' : seerOpen) : '';
  document.title = seerOpen ? `(${seerOpen}) คำถามรอตอบ · ${TITLE}` : TITLE;
  const card = document.querySelector('.seer-card');
  if (card) {
    card.classList.toggle('has-jobs', !!seerOpen);
    const el = card.querySelector('small');
    if (el) el.textContent = seerOpen ? `มีคำถามรอตอบ ${seerOpen} ข้อ` : 'ตอนนี้ยังไม่มีคำถามใหม่';
  }
  // คำถามใหม่เข้ามาระหว่างเปิดเว็บ → เด้งเตือน + สั่น + แจ้งเตือนเบราว์เซอร์ (ถ้าอนุญาตไว้)
  if (seerKnown !== null && seerOpen > seerKnown) {
    const n = seerOpen - seerKnown;
    toast(`🔔 มีคำถามใหม่ ${n} ข้อ รอคุณตอบ`);
    try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (_) {}
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification('หมอดู.com · มีคำถามใหม่', { body: `มีคำถามลูกค้ารอตอบ ${seerOpen} ข้อ`, icon: 'assets/seer.webp', tag: 'seer-jobs' }); } catch (_) {}
    }
  }
  seerKnown = seerOpen;
}
setInterval(() => { if (isSeer()) seerCount(); }, 45e3);
let seerMe = null; // { seer_id, seer_name, price, base, limits }
async function loadSeerMe() {
  try { seerMe = await srv('seer/me'); } catch (_) { seerMe = null; }
  const box = document.getElementById('seerPriceBox');
  if (box) box.outerHTML = seerPriceHTML();
}
function seerPriceHTML() {
  if (!seerMe) return '<div id="seerPriceBox"></div>';
  if (!seerMe.seer_id) return '<div id="seerPriceBox" class="seer-price-box"><p class="pf-note">ยังไม่ได้เชื่อมโปรไฟล์หมอดู · ติดต่อทีมงานเพื่อตั้งราคาและรับงานที่ลูกค้าเลือกคุณ</p></div>';
  return `<form id="seerPriceBox" class="seer-price-box">
      <label>💰 ราคาถาม 1 เรื่องของคุณ <small>(${seerMe.limits.min}–${seerMe.limits.max.toLocaleString('th-TH')} บาท · ไม่ตั้ง = ${seerMe.base} บาท)</small></label>
      <div class="spb-row"><input name="price" type="number" inputmode="numeric" min="${seerMe.limits.min}" max="${seerMe.limits.max}" value="${seerMe.price || ''}" placeholder="${seerMe.base}"><span>บาท</span>
        <button class="btn-gold" type="submit">บันทึกราคา</button></div>
      <small class="spb-note">ลูกค้าจะเห็นราคานี้ในหน้าหมอดูของคุณทันที · งานที่สั่งไปแล้วใช้ราคาเดิม</small>
    </form>`;
}
document.addEventListener('submit', async (e) => {
  const f = e.target.closest('#seerPriceBox');
  if (!f) return;
  e.preventDefault();
  const v = f.price.value.trim();
  try {
    const r = await srv('seer/price', { method: 'POST', body: { price: v === '' ? null : +v } });
    seerMe.price = r.price;
    toast(r.price ? `ตั้งราคาเป็น ${r.price.toLocaleString('th-TH')} บาทแล้ว ✓` : 'กลับไปใช้ราคากลางแล้ว');
  } catch (err) { toast(err.code === 'bad_price' ? `ราคาต้องอยู่ระหว่าง ${seerMe.limits.min}–${seerMe.limits.max.toLocaleString('th-TH')} บาท` : err.message); }
});
function seerCardHTML() {
  if (!seerMe) setTimeout(loadSeerMe, 0);
  return `<section class="pf-card seer-card ${seerOpen ? 'has-jobs' : ''}">
      <div class="seer-card-in"><span class="seer-ico">🔮</span><div><b>งานตอบคำถาม</b><small>${seerOpen ? `มีคำถามรอตอบ ${seerOpen} ข้อ` : 'ตอนนี้ยังไม่มีคำถามใหม่'}</small></div>
      <button class="btn-gold" data-seer-open>เปิดกล่องคำถาม ›</button></div>
      ${seerPriceHTML()}
      ${'Notification' in window && Notification.permission === 'default' ? '<button class="btn-ghost full seer-notify" data-seer-notify>🔔 เปิดการแจ้งเตือน เมื่อมีคำถามใหม่จะเด้งเตือนทันที</button>' : ''}
    </section>`;
}
document.addEventListener('click', async (e) => {
  if (e.target.closest('[data-seer-open]')) { openSeerJobs(); return; }
  const nb = e.target.closest('[data-seer-notify]');
  if (nb) {
    try {
      if (window.SERVER.push && 'PushManager' in window) await srvPushOn(); // แจ้งเตือนแม้ปิดเว็บ
      else if (await Notification.requestPermission() === 'granted') toast('เปิดการแจ้งเตือนแล้ว ✦ (ขณะเปิดเว็บค้างไว้)');
    } catch (err) { toast(err.message); }
    nb.remove();
  }
});

function openSeerJobs(no) {
  if (!jobsPanel) {
    jobsPanel = makePanel('seerJobsPanel', 'งานตอบคำถาม');
    jobsPanel.style.zIndex = 21;
    jobsPanel.querySelector('.panel-body').addEventListener('click', seerClick);
    jobsPanel.querySelector('.panel-body').addEventListener('submit', seerSubmit);
    jobsPanel.querySelector('.panel-body').addEventListener('input', (e) => {
      const f = e.target.closest('#seerAns');
      if (f) try { localStorage.setItem(`mohdooDraft:${f.dataset.no}`, JSON.stringify({ a: f.answer.value, s: f.summary.value })); } catch (_) {}
    });
  }
  openPanel('seerJobsPanel');
  if (no) seerJob(no); else seerList();
}
const seerBody = () => jobsPanel.querySelector('.panel-body');
const seerLoading = () => { seerBody().innerHTML = '<div class="pay-wait"><span class="spinner"></span><p>กำลังโหลด…</p></div>'; };

async function seerList() {
  seerLoading();
  let r;
  try { r = await srv(`seer/jobs${seerTab === 'done' ? '?tab=done' : ''}`); } catch (err) { seerBody().innerHTML = `<p class="pf-note">${esc(err.message)}</p>`; return; }
  if (seerTab === 'open') seerOpen = r.open || 0;
  const q = (j) => (j.form.find((x) => /คำถาม|question/i.test(x.label)) || j.form[0] || {}).value || '';
  seerBody().innerHTML = `
    <div class="seer-tabs"><button class="${seerTab === 'open' ? 'on' : ''}" data-seer-tab="open">รอตอบ${seerOpen ? ` (${seerOpen})` : ''}</button><button class="${seerTab === 'done' ? 'on' : ''}" data-seer-tab="done">ตอบแล้ว</button><button class="seer-refresh" data-seer-tab="${seerTab}" aria-label="รีเฟรช">↻</button></div>
    ${r.jobs.length ? `<ul class="seer-list">${r.jobs.map((j) => `<li data-seer-job="${esc(j.no)}">
        <span class="sj-ico">${j.icon || '🔮'}</span>
        <div><b>${esc(j.title)}</b><p>${esc(q(j)).slice(0, 90) || 'ดูรายละเอียด'}</p>
        <small>${esc(j.customer.first || 'ลูกค้า')} · ${seerTab === 'done' ? `ตอบเมื่อ ${ago(j.answered_at)}` : ago(j.paid_at || j.created_at)}
          ${j.direct ? '<em class="sj-tag gold">ลูกค้าเลือกคุณ</em>' : ''}${j.mine && seerTab === 'open' ? '<em class="sj-tag">รับไว้แล้ว</em>' : ''}</small></div><span class="sj-go">›</span></li>`).join('')}</ul>`
    : `<p class="pf-note seer-empty">${seerTab === 'done' ? 'ยังไม่มีคำถามที่ตอบแล้ว' : 'ยังไม่มีคำถามรอตอบ ✦<br>เมื่อมีคำถามใหม่จะแจ้งเตือนในหน้าบัญชี'}</p>`}
    <p class="pf-note">ตอบภายใน 24 ชั่วโมงหลังลูกค้าส่งคำถาม · กด “รับงาน” ก่อนเพื่อไม่ให้หมอดูท่านอื่นตอบซ้ำ</p>`;
}

async function seerJob(no) {
  seerLoading();
  let j;
  try { ({ job: j } = await srv(`seer/jobs/${encodeURIComponent(no)}`)); } catch (err) { toast(err.message); seerList(); return; }
  const c = j.customer;
  const bd = c.birthdate ? new Date(c.birthdate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const answered = j.status === 'answered';
  let draft = {};
  try { draft = JSON.parse(localStorage.getItem(`mohdooDraft:${j.no}`) || '{}'); } catch (_) {}
  const SLOT = { palmL: 'มือซ้าย', palmR: 'มือขวา', face: 'ใบหน้า', wrist: 'ข้อมือ', foot: 'ฝ่าเท้า' };
  seerBody().innerHTML = `
    <button class="btn-ghost sm seer-back" data-seer-tab="${seerTab}">‹ กลับไปรายการ</button>
    <div class="cat-hero"><span class="cat-ico big">${j.icon || '🔮'}</span><div><h3>${esc(j.title)}</h3><p>${esc(j.label)} · ${j.no}${j.direct ? ' · ลูกค้าเลือกคุณ' : ''}</p></div></div>
    <section class="pf-card"><div class="sec-head"><h3>ข้อมูลลูกค้า</h3></div>
      <ul class="order-info">
        <li><small>ชื่อ</small><b translate="no">${esc(c.first || '—')}</b></li>
        <li><small>วันเกิด</small><b>${bd || '—'}${c.birthtime ? ` · ${esc(c.birthtime)} น.` : ''}</b></li>
        ${c.birthplace ? `<li><small>สถานที่เกิด</small><b>${esc(c.birthplace)}</b></li>` : ''}${c.gender ? `<li><small>เพศ</small><b>${esc(c.gender)}</b></li>` : ''}
        ${j.form.map((f) => `<li><small>${esc(f.label)}</small><b translate="no">${esc(f.value)}</b></li>`).join('')}
      </ul>
      ${j.photos.length ? `<div class="proof-media">${j.photos.map((p) => `<a href="${esc(p.url)}" target="_blank" rel="noopener"><img src="${esc(p.url)}" alt="${esc(SLOT[p.slot] || 'รูป')}"></a>`).join('')}</div>` : ''}
    </section>
    ${j.taken ? '<p class="pf-note">หมอดูท่านอื่นรับงานนี้แล้ว</p>' : `
    ${!j.mine && !answered ? `<button class="btn-ghost full" data-seer-act="take" data-no="${esc(j.no)}">✋ รับงานนี้</button>` : ''}
    <details class="seer-guide" open><summary>✍️ แนวเขียนคำทำนายของหมอดู.com</summary>
      <ol><li><b>เล่าตามพื้นดวงจริง</b> ภาษาสวย น่าฟัง แต่ไม่อวย เรื่องดีบอกดี เรื่องที่ต้องระวังบอกตรง ๆ อย่างสุภาพ</li>
        <li><b>อ้างอิงข้อมูลของลูกค้า</b> (วันเกิด ไพ่ ตัวเลข) ให้รู้สึกว่าดูดวง “ของเขา” จริง ๆ</li>
        <li><b>สรุปภาพรวม</b> สั้น ๆ จำง่าย ว่าช่วงไหนควรเดินหน้า ช่วงไหนควรรอ</li>
        <li><b>ทางเสริมดวง 2–3 ข้อ</b> ที่ทำได้จริง ไม่ต้องเสียเงิน และปิดด้วยกำลังใจ</li></ol>
      <small>ไม่ขู่ให้กลัว ไม่ฟันธงเรื่องความตายหรือโรคร้าย และไม่ชวนซื้อของเพื่อแก้ดวง</small></details>
    <form class="form seer-form" id="seerAns" data-no="${esc(j.no)}">
      <label>คำทำนาย <small>(ลูกค้าเห็นใน “ประวัติการดูดวง”)</small>
        <textarea name="answer" rows="11" required minlength="20" placeholder="• พื้นดวงเรื่องนี้ (อ้างอิงวันเกิด/ไพ่/ตัวเลข)&#10;• สิ่งที่ควรระวัง&#10;• สรุปภาพรวม&#10;• ทางเสริมดวง 2–3 ข้อ">${esc(draft.a ?? j.answer)}</textarea></label>
      <label>สรุปสั้น 1 ประโยค <small>(ใช้ในใบผลดวง)</small><input name="summary" maxlength="300" value="${esc(draft.s ?? j.summary)}" placeholder="เช่น การงานรุ่งช่วงกลางปี ระวังเรื่องเอกสาร"></label>
      <button class="btn-gold full" type="submit">${answered ? 'บันทึกการแก้ไข' : 'ส่งคำตอบให้ลูกค้า ›'}</button>
      ${j.mine && !answered ? `<button class="btn-ghost full" type="button" data-seer-act="release" data-no="${esc(j.no)}">ปล่อยงานให้หมอดูท่านอื่น</button>` : ''}
    </form>`}`;
}

async function seerClick(e) {
  const tab = e.target.closest('[data-seer-tab]');
  if (tab) { seerTab = tab.dataset.seerTab; seerList(); return; }
  const li = e.target.closest('[data-seer-job]');
  if (li) { seerJob(li.dataset.seerJob); return; }
  const act = e.target.closest('[data-seer-act]');
  if (act) {
    act.disabled = true;
    try {
      await srv(`seer/jobs/${encodeURIComponent(act.dataset.no)}`, { method: 'POST', body: { action: act.dataset.seerAct } });
      toast(act.dataset.seerAct === 'take' ? 'รับงานแล้ว ✦ ตอบได้เลย' : 'ปล่อยงานแล้ว');
      if (act.dataset.seerAct === 'take') seerJob(act.dataset.no); else seerList();
    } catch (err) { toast(err.code === 'taken' ? 'หมอดูท่านอื่นรับงานนี้ไปแล้ว' : err.message); act.disabled = false; }
  }
}
async function seerSubmit(e) {
  const f = e.target.closest('#seerAns');
  if (!f) return;
  e.preventDefault();
  const btn = f.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await srv(`seer/jobs/${encodeURIComponent(f.dataset.no)}`, { method: 'POST', body: { action: 'answer', answer: f.answer.value, summary: f.summary.value } });
    try { localStorage.removeItem(`mohdooDraft:${f.dataset.no}`); } catch (_) {}
    toast('ส่งคำตอบให้ลูกค้าแล้ว ✓');
    seerKnown = Math.max(0, (seerKnown || 1) - 1);
    seerCount();
    if (typeof burst === 'function') burst(innerWidth / 2, innerHeight / 2, 40, 200);
    seerTab = 'open';
    seerList();
  } catch (err) {
    toast(err.code === 'answer_too_short' ? 'คำทำนายสั้นเกินไป เขียนเพิ่มอีกนิดนะคะ' : err.code === 'taken' ? 'หมอดูท่านอื่นรับงานนี้ไปแล้ว' : err.message);
    btn.disabled = false;
  }
}

// หลังเข้าสู่ระบบ/สมัคร: ดึงสิทธิ์และวันหมดอายุสมาชิกจากเซิร์ฟเวอร์ แล้วซิงก์งาน/แจ้งเตือน
async function srvAfterAuth() {
  if (!window.SERVER) return;
  let me = null;
  try { ({ user: me } = await srv('me')); } catch (_) { return; }
  const u = currentUser();
  if (!me || !u) return;
  u.role = me.role;
  u.seerId = me.seer_id || null;
  if (me.ai_until) u.aiUntil = me.ai_until;
  try { localStorage.setItem(USER_KEY, JSON.stringify(u)); } catch (_) {}
  await srvSyncOrders();
  await srvNotes(false);
  if (isSeer()) await seerCount();
}
