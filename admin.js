// ===== หลังบ้าน หมอดู.com =====
// ภาพรวม · คำสั่งซื้อ (ตอบคำถาม / อัปเดตขั้นตอน / แนบรูปยืนยัน / เลขพัสดุ / คืนเงิน) · ลูกค้า · ประกาศ · ตำราดูดวง · ตั้งค่าระบบ
// สิทธิ์: admin ทำได้ทุกอย่าง · staff ไม่เปลี่ยนสิทธิ์/ไม่คืนเงิน/ไม่ประกาศ · seer เห็นเฉพาะงานดูดวงที่ต้องตอบ
const $ = (id) => document.getElementById(id);
const view = $('view');
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const baht = (n) => `${Number(n || 0).toLocaleString('th-TH')} ฿`;
const dt = (t) => (t ? new Date(t).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
const day = (t) => new Date(t).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

const STATUS = {
  pending: 'รอชำระเงิน', paid: 'รอกรอกข้อมูล', submitted: 'รอตอบ', in_progress: 'กำลังทำ', answered: 'ตอบแล้ว',
  shipped: 'จัดส่งแล้ว', done: 'เสร็จสิ้น', cancelled: 'ยกเลิก', expired: 'QR หมดอายุ', refunded: 'คืนเงินแล้ว',
};
const KIND = { ask: 'ถามแล้วรู้ผลทันที', instant: 'ดูเองทันที', reading: 'หมอดูตอบ', photo: 'อ่านรูป', merit: 'บริการมงคล', shop: 'สินค้า', digital: 'สินค้าดิจิทัล', ai: 'สมาชิก AI' };
const ROLE = { customer: 'ลูกค้า', seer: 'หมอดู (ตอบผ่านหน้าเว็บ)', staff: 'ทีมงาน', admin: 'ผู้ดูแลระบบ' };
const TABS = [
  ['งานที่ต้องทำ', 'submitted,in_progress,paid'], ['รอตอบ', 'submitted'], ['กำลังทำ', 'in_progress'], ['รอกรอกข้อมูล', 'paid'],
  ['ตอบแล้ว/ส่งแล้ว', 'answered,shipped'], ['เสร็จสิ้น', 'done'], ['รอชำระ', 'pending'], ['ยกเลิก/คืนเงิน', 'cancelled,expired,refunded'], ['ทั้งหมด', ''],
];
const CARRIERS = ['ไปรษณีย์ไทย', 'Kerry Express', 'Flash Express', 'J&T Express', 'Best Express', 'Ninja Van', 'ส่งเอง'];
const pill = (s) => `<span class="pill s-${s}">${STATUS[s] || s}</span>`;
let me = null;
const can = (...roles) => me && roles.includes(me.role);

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { t.hidden = true; }, 2800);
}
const ERR = {
  login_required: 'กรุณาเข้าสู่ระบบ', forbidden: 'ไม่มีสิทธิ์ทำรายการนี้', wrong_code: 'รหัส OTP ไม่ถูกต้อง', code_expired: 'รหัสหมดอายุ ขอรหัสใหม่',
  wait: 'รอสักครู่ก่อนขอรหัสใหม่', bad_phone: 'เบอร์โทรไม่ถูกต้อง', bad_state: 'สถานะงานตอนนี้ทำรายการนี้ไม่ได้', empty: 'กรุณากรอกข้อมูล',
  file_too_large: 'ไฟล์ใหญ่เกิน 8 MB', bad_file: 'ชนิดไฟล์ไม่รองรับ (รูป JPG/PNG/WebP หรือวิดีโอ MP4/MOV)', too_many_requests: 'ทำรายการถี่เกินไป รอสักครู่',
  otp_not_configured: 'ยังไม่ได้ตั้งค่าระบบ OTP', bad_price: 'ราคาต้องอยู่ระหว่าง 20–10,000 บาท', bad_qty: 'จำนวนไม่ถูกต้อง', is_staff: 'เบอร์นี้เป็นทีมงาน/ผู้ดูแลอยู่แล้ว', unknown_seer: 'ไม่พบโปรไฟล์หมอดูนี้', cannot_demote_self: 'ลดสิทธิ์ตัวเองไม่ได้',
  conflict: 'มีคนแก้รายการนี้ไปก่อนคุณ · โหลดข้อมูลล่าสุดให้แล้ว ตรวจแล้วทำอีกครั้ง', not_team: 'มอบหมายได้เฉพาะทีมงาน/หมอดู', base_profile: 'โปรไฟล์ตั้งต้นลบไม่ได้ ใช้ซ่อนแทน', in_use: 'โปรไฟล์นี้เชื่อมกับบัญชีหมอดูอยู่ ยกเลิกการเชื่อมก่อน', bad_img: 'ลิงก์รูปต้องขึ้นต้นด้วย https://', out_of_stock: 'สินค้าหมด', busy: 'ระบบไม่ว่าง ลองอีกครั้ง',
};
let routeCtl = null; // เปลี่ยนหน้า → ยกเลิกคำขอของหน้าก่อน (กันข้อมูลเก่าทับหน้าใหม่)
async function api(path, { method = 'GET', body, keep } = {}) {
  const signal = method === 'GET' && !keep && routeCtl ? routeCtl.signal : undefined;
  const r = await fetch(`/api/v1/${path}`, { method, signal, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && !path.startsWith('auth/')) { showLogin(); throw new Error('login'); }
  if (!r.ok) { const e = new Error(j.message || ERR[j.error] || j.error || 'เกิดข้อผิดพลาด'); e.code = j.error; e.data = j; throw e; }
  return j;
}
const run = (fn) => async (...a) => {
  try { await fn(...a); } catch (e) {
    if (e.message === 'login' || e.name === 'AbortError') return;
    toast(e.message);
    if (e.code === 'conflict') route(); // ข้อมูลบนจอเก่าแล้ว → โหลดใหม่
  }
};

// ---------- เข้าสู่ระบบ ----------
let loginPhone = '';
function showLogin() {
  $('shell').hidden = true;
  $('login').hidden = false;
}
$('loginForm').addEventListener('submit', run(async (e) => {
  e.preventDefault();
  const f = e.target;
  $('loginErr').hidden = true;
  try {
    if (!$('stepPhone').hidden) {
      loginPhone = `+${f.cc.value}${f.phone.value.replace(/\D/g, '').replace(/^0+/, '')}`;
      const r = await api('auth/otp', { method: 'POST', body: { phone: loginPhone } });
      $('stepPhone').hidden = true;
      $('stepCode').hidden = false;
      $('codeTo').textContent = `ส่งรหัสไปที่ ${loginPhone} แล้ว${r.demo ? ' (โหมดทดลอง: 123456)' : ''}`;
      f.code.focus();
    } else {
      await api('auth/verify', { method: 'POST', body: { phone: loginPhone, code: f.code.value } });
      await boot();
    }
  } catch (err) {
    $('loginErr').textContent = err.code === 'wait' ? `ขอรหัสใหม่ได้ใน ${err.data.wait} วินาที` : err.message;
    $('loginErr').hidden = false;
  }
}));
$('backPhone').addEventListener('click', () => { $('stepCode').hidden = true; $('stepPhone').hidden = false; });
// โหมดสี: มืด (ม่วง ค่าเริ่มต้น) / สว่าง (ขาว) · จำไว้ในเบราว์เซอร์นี้
const themeBtns = document.querySelectorAll('[data-theme-set]');
function paintTheme() {
  const cur = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  themeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === cur)));
}
themeBtns.forEach((b) => b.addEventListener('click', () => {
  const light = b.dataset.themeSet === 'light';
  if (light) document.documentElement.dataset.theme = 'light'; else delete document.documentElement.dataset.theme;
  try { localStorage.setItem('admin-theme', light ? 'light' : 'dark'); } catch (_) {}
  paintTheme();
}));
paintTheme();
$('logout').addEventListener('click', run(async () => { await api('auth/logout', { method: 'POST' }); me = null; showLogin(); }));

async function boot() {
  let r;
  try { r = await api('admin/me', { keep: true }); } catch (e) {
    if (e.code === 'forbidden' || e.code === 'seer_use_web') { $('loginErr').innerHTML = e.code === 'seer_use_web' ? 'บัญชีหมอดูตอบคำถามได้ที่หน้าเว็บ <a href="/">หมอดู.com</a> → แท็บ “บัญชี” → “งานตอบคำถาม”' : 'เบอร์นี้ไม่มีสิทธิ์เข้าหลังบ้าน'; $('loginErr').hidden = false; $('stepCode').hidden = true; $('stepPhone').hidden = false; showLogin(); }
    return;
  }
  me = r.user;
  $('login').hidden = true;
  $('shell').hidden = false;
  $('meName').textContent = me.name || me.phone;
  $('meRole').textContent = ROLE[me.role];
  document.querySelectorAll('#nav a[data-r]').forEach((a) => { a.hidden = !a.dataset.r.split(' ').includes(me.role); });
  if (!location.hash || (me.role === 'seer' && !location.hash.startsWith('#order'))) location.hash = me.role === 'seer' ? '#orders' : '#dash';
  route();
  refreshBadge();
}
async function refreshBadge() {
  try {
    const r = await api('admin/orders?status=submitted&limit=1', { keep: true });
    $('qBadge').hidden = !r.total;
    $('qBadge').textContent = r.total;
  } catch (_) {}
}
setInterval(() => { if (me) refreshBadge(); }, 60e3);

// ---------- เส้นทางในหน้า ----------
addEventListener('hashchange', () => me && route());
function route() {
  const [v, arg] = location.hash.slice(1).split('/');
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.v === (v === 'order' ? 'orders' : v === 'user' ? 'users' : v)));
  routeCtl?.abort();
  routeCtl = new AbortController();
  view.innerHTML = '<p class="empty">กำลังโหลด…</p>';
  const views = { stock: viewStock, seers: viewSeers, dash: viewDash, orders: viewOrders, order: viewOrder, users: viewUsers, user: viewUser, broadcast: viewBroadcast, settings: viewSettings, kb: viewKB };
  run((views[v] || viewOrders))(decodeURIComponent(arg || ''));
  scrollTo(0, 0);
}

// ---------- ภาพรวม ----------
async function viewDash() {
  const s = await api('admin/stats');
  const max = Math.max(1, ...s.series.map((d) => d.revenue));
  view.innerHTML = `
    <div class="head"><h1>ภาพรวม</h1><span class="muted small">อัปเดต ${dt(Date.now())}</span><button class="btn sm" onclick="route()">↻ รีเฟรช</button></div>
    <div class="kpis">
      <div class="kpi"><small>ยอดขายวันนี้</small><b>${baht(s.today.revenue)}</b><em>${s.today.orders} รายการ</em></div>
      <div class="kpi"><small>7 วันล่าสุด</small><b>${baht(s.d7.revenue)}</b><em>${s.d7.orders} รายการ</em></div>
      <div class="kpi"><small>30 วันล่าสุด</small><b>${baht(s.d30.revenue)}</b><em>${s.d30.orders} รายการ · เงินทำบุญ ${baht(s.d30.donation)}</em></div>
      <a class="kpi ${s.queue.reading ? 'alert' : ''}" href="#orders/submitted"><small>รอหมอดูตอบ</small><b>${s.queue.reading}</b><em>เกิน 24 ชม. ลูกค้าจะรอนาน</em></a>
      <a class="kpi" href="#orders/in_progress"><small>กำลังดำเนินการ</small><b>${s.queue.in_progress}</b><em>บริการมงคล · สินค้า</em></a>
      <a class="kpi" href="#orders/paid"><small>จ่ายแล้ว ยังไม่กรอกข้อมูล</small><b>${s.queue.paid_no_intake}</b><em>อาจต้องติดต่อลูกค้า</em></a>
      <div class="kpi"><small>ลูกค้าทั้งหมด</small><b>${s.users.total.toLocaleString('th-TH')}</b><em>วันนี้ +${s.users.today}</em></div>
      <div class="kpi"><small>สมาชิก AI รายเดือน</small><b>${s.users.ai}</b><em>ยังไม่หมดอายุ</em></div>
      ${s.aiCost ? `<div class="kpi ${s.aiCost.today.usd >= s.aiCost.alert ? 'alert' : ''}" title="ประมาณจากจำนวนโทเคน ไม่ใช่ใบแจ้งหนี้จริง"><small>ค่า AI วันนี้ (ประมาณ)</small><b>$${s.aiCost.today.usd.toFixed(2)}</b>
        <em>${s.aiCost.today.calls} ครั้ง · 7 วัน $${s.aiCost.d7.usd.toFixed(2)} · แจ้งเตือนที่ $${s.aiCost.alert}${s.aiCost.cap ? ` · เพดาน $${s.aiCost.cap}` : ''}</em></div>` : ''}
    </div>
    <div class="grid2">
      <section class="card"><h3>ยอดขาย 14 วัน</h3>
        <div class="chart">${s.series.map((d) => `<div class="bar"><span style="height:${(d.revenue / max) * 100}%" data-v="${baht(d.revenue)} · ${d.orders} รายการ"></span><small>${day(d.day).split(' ')[0]}</small></div>`).join('')}</div>
      </section>
      <section class="card"><h3>แยกตามประเภท (30 วัน)</h3>
        ${s.byKind.length ? `<table class="table"><tr><th>ประเภท</th><th class="num">รายการ</th><th class="num">ยอดขาย</th></tr>
          ${s.byKind.map((k) => `<tr><td>${esc(k.name)}</td><td class="num">${k.orders}</td><td class="num">${baht(k.revenue)}</td></tr>`).join('')}</table>` : '<p class="empty">ยังไม่มียอดขาย</p>'}
      </section>
    </div>
    ${s.lowStock.length ? `<a class="card" href="#stock" style="display:block;margin-top:16px;text-decoration:none;color:inherit;border-color:var(--warn)"><h3 style="color:var(--warn)">📦 สินค้าใกล้หมด</h3>
      <div class="chips">${s.lowStock.map((p) => `<span class="chip ${p.qty ? 'warn' : 'bad'}">${p.icon} ${esc(p.name)} · ${p.qty ? `เหลือ ${p.qty}` : 'หมดแล้ว'}</span>`).join('')}</div></a>` : ''}
    <section class="card" style="margin-top:16px"><h3>สถานะระบบ</h3>${configChips(s.config)}</section>`;
}
function configChips(c) {
  const chip = (ok, warn, label, txt) => `<span class="chip ${ok ? 'ok' : warn ? 'warn' : 'bad'}">${label}: ${txt}</span>`;
  return `<div class="chips">
    ${chip(c.db === 'postgres', true, 'ฐานข้อมูล', c.db === 'postgres' ? 'Postgres' : 'ไฟล์ทดลอง')}
    ${chip(c.otp === 'twilio', c.otp === 'demo', 'OTP', { twilio: 'SMS จริง', demo: 'ทดลอง 123456', off: 'ปิด' }[c.otp])}
    ${chip(c.pay === 'omise', c.pay === 'demo', 'ชำระเงิน', { omise: 'PromptPay (Omise)', demo: 'ทดลอง', off: 'ปิด' }[c.pay])}
    ${chip(c.storage === 'blob', true, 'ไฟล์รูป', c.storage === 'blob' ? 'Vercel Blob' : 'ในเครื่อง')}
    ${chip(c.push, true, 'แจ้งเตือน Push', c.push ? 'พร้อม' : 'ยังไม่ตั้ง')}
    ${chip(c.cron, true, 'งานประจำวัน', c.cron ? 'พร้อม' : 'ยังไม่ตั้ง')}
    ${chip(c.ai, true, 'แม่หมอ AI', c.ai ? 'พร้อม' : 'ยังไม่ตั้ง')}
  </div>`;
}

// ---------- รายการคำสั่งซื้อ ----------
const oq = { status: TABS[0][1], q: '', kind: '', mine: false, offset: 0 };
async function viewOrders(arg) {
  if (arg !== undefined && arg !== '') { oq.status = arg; oq.offset = 0; history.replaceState(null, '', '#orders'); }
  const params = new URLSearchParams({ limit: 30, offset: oq.offset });
  if (oq.status) params.set('status', oq.status);
  if (oq.q) params.set('q', oq.q);
  if (oq.kind) params.set('kind', oq.kind);
  if (oq.mine) params.set('mine', 1);
  const r = await api(`admin/orders?${params}`);
  const kinds = me.role === 'seer' ? ['reading', 'photo'] : Object.keys(KIND);
  view.innerHTML = `
    <div class="head"><h1>คำสั่งซื้อ</h1>
      ${can('staff', 'admin') ? '<a class="btn sm" href="/api/v1/admin/export/orders?days=31">⬇︎ ส่งออก CSV 31 วัน</a>' : ''}</div>
    <div class="tabs">${TABS.map(([l, s]) => `<button data-st="${s}" class="${s === oq.status ? 'on' : ''}">${l}</button>`).join('')}</div>
    <form class="row" id="oFilter" style="margin-bottom:12px">
      <input class="grow" name="q" value="${esc(oq.q)}" placeholder="ค้นหา เลขที่ ชื่อ เบอร์ หรือคำในฟอร์ม">
      <select name="kind" style="width:auto"><option value="">ทุกประเภท</option>${kinds.map((k) => `<option value="${k}" ${k === oq.kind ? 'selected' : ''}>${KIND[k]}</option>`).join('')}</select>
      <label class="row" style="display:flex"><input type="checkbox" name="mine" ${oq.mine ? 'checked' : ''} style="width:auto"> งานของฉัน</label>
      <button class="btn">ค้นหา</button>
    </form>
    ${r.orders.length ? `<div class="tscroll"><table class="table">
      <tr><th>เลขที่ / เวลา</th><th>รายการ</th><th class="hide-m">ลูกค้า</th><th>สถานะ</th><th class="num">ยอด</th></tr>
      ${r.orders.map((o) => `<tr data-href="#order/${o.no}">
        <td><b>${o.no}</b><span class="sub">${dt(o.paid_at || o.created_at)}</span></td>
        <td>${o.icon || ''} ${esc(o.title)}<span class="sub">${KIND[o.kind] || o.kind}${o.steps ? ` · ขั้นที่ ${Math.min(o.step + 1, o.steps.length)}/${o.steps.length}` : ''}${o.assignee_name || o.assignee ? ' · มีผู้รับงาน' : ''}</span></td>
        <td class="hide-m">${esc(o.name || '—')}<span class="sub">${esc(o.phone || '')}</span></td>
        <td>${pill(o.status)}</td><td class="num">${baht(o.amount)}</td></tr>`).join('')}
    </table></div>
    <div class="pager"><span>${oq.offset + 1}–${oq.offset + r.orders.length} จาก ${r.total}</span>
      <span class="row"><button class="btn sm" id="prev" ${oq.offset ? '' : 'disabled'}>‹ ก่อนหน้า</button><button class="btn sm" id="next" ${oq.offset + 30 < r.total ? '' : 'disabled'}>ถัดไป ›</button></span></div>`
    : '<p class="empty">ไม่มีรายการในหมวดนี้ ✦</p>'}`;
  view.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => { oq.status = b.dataset.st; oq.offset = 0; route(); }));
  $('oFilter').addEventListener('submit', (e) => { e.preventDefault(); const f = e.target; oq.q = f.q.value.trim(); oq.kind = f.kind.value; oq.mine = f.mine.checked; oq.offset = 0; route(); });
  $('prev')?.addEventListener('click', () => { oq.offset = Math.max(0, oq.offset - 30); route(); });
  $('next')?.addEventListener('click', () => { oq.offset += 30; route(); });
  view.querySelectorAll('tr[data-href]').forEach((tr) => tr.addEventListener('click', () => { location.hash = tr.dataset.href; }));
}

// ---------- รายละเอียดคำสั่งซื้อ ----------
const media = (list, cap) => `<div class="photos">${list.map((p) => `<figure>${/video/.test(p.type || '') || /\.(mp4|mov|webm)(\?|$)/.test(p.url) ? `<video src="${esc(p.url)}" data-view muted></video>` : `<img src="${esc(p.url)}" alt="" data-view loading="lazy">`}<figcaption>${esc(cap(p))}</figcaption></figure>`).join('')}</div>`;
const SLOT = { palmL: 'มือซ้าย', palmR: 'มือขวา', face: 'ใบหน้า', faceSide: 'ใบหน้าด้านข้าง', wrist: 'ข้อมือ', foot: 'ฝ่าเท้า', plan: 'ผัง/พื้นที่' };

async function viewOrder(no) {
  const { order: o, customer: c } = await api(`admin/orders/${encodeURIComponent(no)}`);
  const p = c?.profile || {};
  const label = Object.fromEntries((o.fields || []).map(([k, l]) => [k, l]));
  const form = o.form ? Object.entries(o.form).filter(([, v]) => v) : [];
  const paid = ['paid', 'submitted', 'in_progress', 'answered', 'shipped', 'done'].includes(o.status);
  const canAnswer = ['reading', 'photo'].includes(o.kind) && ['submitted', 'in_progress', 'answered'].includes(o.status);
  const ops = can('staff', 'admin');
  view.innerHTML = `
    <a class="back" href="#orders">‹ กลับไปรายการ</a>
    <div class="head" style="margin-top:8px"><h1>${o.icon || ''} ${esc(o.title)}</h1>${pill(o.status)}<span class="muted">${o.no}</span></div>
    <div class="detail">
      <div class="stack">
        <section class="card"><h3>ข้อมูลที่ลูกค้าส่งมา</h3>
          ${form.length ? `<dl class="kv">${form.map(([k, v]) => `<dt>${esc(label[k] || k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : `<p class="muted">${o.status === 'paid' ? 'ลูกค้าชำระแล้วแต่ยังไม่ได้กรอกข้อมูล' : 'ไม่มีข้อมูลฟอร์ม'}</p>`}
          ${o.place ? `<dl class="kv" style="margin-top:8px"><dt>สถานที่</dt><dd>${esc(o.place)}</dd></dl>` : ''}
          ${o.photos.length ? `<h3 style="margin-top:14px">รูปที่แนบ</h3>${media(o.photos, (x) => SLOT[x.slot] || x.slot || 'รูป')}` : ''}
        </section>
        ${['reading', 'photo'].includes(o.kind) ? `<section class="card"><h3>${o.answer ? (o.answered_by === 'ai' ? 'คำตอบจากแม่หมอ AI' : 'คำตอบที่ส่งแล้ว') : 'ตอบลูกค้า'}</h3>
          ${o.answer && !canAnswer ? `<div class="answer-view">${esc(o.answer)}</div>` : ''}
          ${canAnswer ? `<form class="stack" id="ansForm">
            ${o.status === 'submitted' ? '<button type="button" class="btn sm" id="takeJob" style="justify-self:start">✋ รับงานนี้</button>' : ''}
            <label>คำทำนาย (ลูกค้าเห็นใน “ประวัติการดูดวง”)<textarea name="answer" rows="10" required placeholder="อ่านดวงตามข้อมูลและคำถามของลูกค้า แบ่งเป็นหัวข้อสั้น ๆ อ่านบนมือถือได้ง่าย">${esc(o.answer)}</textarea></label>
            <label>สรุปสั้น 1 ประโยค (ใช้ในใบผลดวง/แฟ้มดวง)<input name="summary" maxlength="300" value="${esc(o.summary)}"></label>
            <button class="btn primary">${o.answer ? 'บันทึกการแก้ไข' : 'ส่งคำตอบให้ลูกค้า ›'}</button>
          </form>` : ''}
        </section>` : ''}
        ${o.steps ? `<section class="card"><h3>ขั้นตอนงาน</h3>
          <ol class="track">${o.steps.map((s, i) => `<li class="${i < o.step ? 'done' : i === o.step ? 'now' : ''}">${esc(s)}
            ${ops && paid && i === o.step ? `<button class="btn sm" data-step="${i + 1}">ทำเสร็จแล้ว ✓</button>` : ''}</li>`).join('')}</ol>
          ${ops && paid && o.step > 0 ? `<button class="btn ghost sm" data-step="${o.step - 1}" style="margin-top:8px">↶ ย้อนขั้นตอน</button>` : ''}
          ${o.kind === 'shop' && ops && paid ? `<form class="row" id="trkForm" style="margin-top:14px">
            <select name="carrier" style="width:auto">${CARRIERS.map((x) => `<option ${o.tracking?.carrier === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
            <input class="grow" name="no" placeholder="เลขพัสดุ" value="${esc(o.tracking?.no || '')}" required><button class="btn primary">บันทึกเลขพัสดุ</button></form>` : ''}
          ${['merit', 'digital'].includes(o.kind) && ops && paid ? `<form class="stack" id="fileForm" style="margin-top:14px">
            <label>${o.kind === 'merit' ? 'รูปถ่าย / วิดีโอยืนยันพิธี' : 'ไฟล์ที่ส่งให้ลูกค้า'} (สูงสุด 6 ไฟล์ · ไฟล์ละไม่เกิน 8 MB)<input type="file" name="files" multiple accept="image/*,video/mp4,video/quicktime,video/webm" required></label>
            <input name="caption" placeholder="คำอธิบาย เช่น ถวายสังฆทาน วัด… วันที่…">
            <label class="row" style="display:flex"><input type="checkbox" name="finish" checked style="width:auto"> ปิดงานเป็น “เสร็จสิ้น” และแจ้งลูกค้า</label>
            <button class="btn primary">อัปโหลดและส่งให้ลูกค้า</button></form>` : ''}
          ${o.proof.length ? `<h3 style="margin-top:14px">ไฟล์ที่ส่งให้ลูกค้าแล้ว</h3>${media(o.proof, (x) => x.caption || dt(x.at))}` : ''}
        </section>` : ''}
      </div>
      <div class="stack">
        <section class="card"><h3>คำสั่งซื้อ</h3><dl class="kv">
          <dt>ประเภท</dt><dd>${KIND[o.kind] || o.kind}</dd><dt>แพ็กเกจ</dt><dd>${esc(o.label)}</dd>
          ${o.qty ? `<dt>จำนวน</dt><dd>${o.qty} ชิ้น × ${baht(o.unit)}</dd>` : ''}
          <dt>ค่าบริการ</dt><dd>${baht(o.price)}</dd>${o.donation ? `<dt>เงินทำบุญ</dt><dd>${baht(o.donation)}</dd>` : ''}
          <dt>ยอดชำระ</dt><dd><b>${baht(o.amount)}</b></dd><dt>ช่องทาง</dt><dd>${esc(o.pay?.provider || '—')}${o.pay?.charge_id ? `<span class="muted small"> · ${esc(o.pay.charge_id)}</span>` : ''}</dd>
          <dt>สั่งเมื่อ</dt><dd>${dt(o.created_at)}</dd><dt>ชำระเมื่อ</dt><dd>${dt(o.paid_at)}</dd>
          ${o.tracking ? `<dt>เลขพัสดุ</dt><dd>${esc(o.tracking.carrier)} ${esc(o.tracking.no)}</dd>` : ''}
          ${o.refund ? `<dt>คืนเงิน</dt><dd>${baht(o.refund.amount)} · ${esc(o.refund.reason)}</dd>` : ''}
          <dt>ผู้รับงาน</dt><dd>${esc(o.assignee_name || (o.assignee ? 'มีผู้รับงาน' : '—'))}</dd>
        </dl></section>
        <section class="card"><h3>ลูกค้า</h3>${c ? `<dl class="kv">
          <dt>ชื่อ</dt><dd>${esc([p.first || p.name, p.last].filter(Boolean).join(' ') || c.name || '—')}</dd>
          ${ops ? `<dt>เบอร์</dt><dd>${esc(c.phone)}</dd>` : ''}
          <dt>วันเกิด</dt><dd>${p.birthdate ? new Date(p.birthdate).toLocaleDateString('th-TH', { dateStyle: 'long' }) : '—'}${p.birthtime ? ` · ${esc(p.birthtime)} น.` : ''}</dd>
          ${p.birthplace ? `<dt>สถานที่เกิด</dt><dd>${esc(p.birthplace)}</dd>` : ''}${p.gender ? `<dt>เพศ</dt><dd>${esc(p.gender)}</dd>` : ''}
        </dl>${ops ? `<a class="btn sm" href="#user/${c.id}" style="margin-top:10px;display:inline-block">ดูข้อมูลลูกค้า ›</a>` : ''}` : '<p class="muted">บัญชีถูกลบแล้ว</p>'}</section>
        ${ops ? `<section class="card stack"><h3>จัดการ</h3>
          ${paid ? `<label>เปลี่ยนสถานะ<span class="row"><select id="stSel" class="grow">${['submitted', 'in_progress', 'answered', 'shipped', 'done'].map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${STATUS[s]}</option>`).join('')}</select><button class="btn sm" id="stBtn">บันทึก</button></span></label>` : ''}
          <span class="row">${o.assignee !== me.id && paid ? '<button class="btn sm" id="assignMe">มอบหมายให้ฉัน</button>' : ''}
          ${o.status === 'pending' && can('admin') ? '<button class="btn sm gold" id="markPaid">ยืนยันรับเงินแล้ว (โอนตรง)</button>' : ''}
          ${(o.status === 'pending' || (can('admin') && paid)) ? '<button class="btn sm danger" id="cancelO">ยกเลิกคำสั่งซื้อ</button>' : ''}
          ${can('admin') && o.paid_at && o.status !== 'refunded' ? '<button class="btn sm danger" id="refundO">คืนเงิน</button>' : ''}</span>
        </section>` : ''}
        <section class="card"><h3>บันทึกภายใน (ลูกค้าไม่เห็น)</h3>
          <div class="notes">${(o.notes || []).map((n) => `<p>${esc(n.text)}<small>${esc(n.by)} · ${dt(n.at)}</small></p>`).join('') || '<p class="muted small" style="background:none;padding:0">ยังไม่มีบันทึก</p>'}</div>
          <form class="row" id="noteForm" style="margin-top:10px"><input class="grow" name="text" placeholder="เพิ่มบันทึก เช่น โทรยืนยันที่อยู่แล้ว" required><button class="btn sm">เพิ่ม</button></form>
        </section>
        <section class="card"><h3>ประวัติการทำรายการ</h3><ul class="timeline">${o.log.slice().reverse().map((l) => `<li>${dt(l.at)} · <b>${esc(l.who)}</b> ${esc(LOG[l.action] || l.action)}${l.to ? ` → ${STATUS[l.to] || l.to}` : ''}</li>`).join('')}</ul></section>
      </div>
    </div>`;
  const act = (body, okMsg) => run(async (e) => { e?.preventDefault?.(); await api(`admin/orders/${o.no}`, { method: 'POST', body }); toast(okMsg); route(); refreshBadge(); });
  $('ansForm')?.addEventListener('submit', (e) => act({ action: 'answer', answer: e.target.answer.value, summary: e.target.summary.value }, 'ส่งคำตอบให้ลูกค้าแล้ว ✓')(e));
  $('takeJob')?.addEventListener('click', act({ action: 'start' }, 'รับงานแล้ว'));
  view.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', act({ action: 'step', step: +b.dataset.step }, 'อัปเดตขั้นตอนและแจ้งลูกค้าแล้ว')));
  $('trkForm')?.addEventListener('submit', (e) => act({ action: 'tracking', carrier: e.target.carrier.value, no: e.target.no.value }, 'บันทึกเลขพัสดุและแจ้งลูกค้าแล้ว')(e));
  $('stBtn')?.addEventListener('click', () => act({ action: 'status', status: $('stSel').value }, 'เปลี่ยนสถานะแล้ว')());
  $('assignMe')?.addEventListener('click', act({ action: 'assign', to: 'me' }, 'มอบหมายให้คุณแล้ว'));
  $('noteForm').addEventListener('submit', (e) => act({ action: 'note', text: e.target.text.value }, 'เพิ่มบันทึกแล้ว')(e));
  $('markPaid')?.addEventListener('click', () => confirm(`ยืนยันว่าได้รับเงิน ${baht(o.amount)} สำหรับ ${o.no} แล้ว?`) && act({ action: 'mark-paid' }, 'ยืนยันการชำระเงินแล้ว')());
  $('cancelO')?.addEventListener('click', () => {
    const reason = prompt('เหตุผลที่ยกเลิก (ลูกค้าจะเห็นข้อความนี้)');
    if (reason !== null) act({ action: 'cancel', reason }, 'ยกเลิกคำสั่งซื้อแล้ว')();
  });
  $('refundO')?.addEventListener('click', () => {
    const amount = prompt(`จำนวนเงินที่คืน (สูงสุด ${o.amount} บาท)`, o.amount);
    if (amount === null) return;
    const reason = prompt('เหตุผลการคืนเงิน') || '';
    if (confirm(`คืนเงิน ${baht(amount)} ให้ ${o.no}?${o.pay?.provider === 'omise' ? ' (คืนผ่าน Omise จริง)' : ''}`)) act({ action: 'refund', amount: +amount, reason }, 'บันทึกการคืนเงินแล้ว')();
  });
  $('fileForm')?.addEventListener('submit', run(async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector('button');
    btn.disabled = true; btn.textContent = 'กำลังอัปโหลด…';
    try {
      const files = await Promise.all([...f.files.files].slice(0, 6).map((x) => (x.type.startsWith('image/') ? shrink(x, 1600) : readData(x))));
      await api(`admin/orders/${o.no}/files`, { method: 'POST', body: { files: files.map((data) => ({ data, caption: f.caption.value })), finish: f.finish.checked } });
      toast('ส่งไฟล์ให้ลูกค้าแล้ว ✓');
      route();
    } finally { btn.disabled = false; btn.textContent = 'อัปโหลดและส่งให้ลูกค้า'; }
  }));
}
const LOG = { created: 'สร้างคำสั่งซื้อ', paid: 'ชำระเงินแล้ว', intake: 'ลูกค้าส่งข้อมูล', ai_answer: 'แม่หมอ AI ตอบ', start: 'รับงาน', answer: 'ส่งคำตอบ', step: 'อัปเดตขั้นตอน', tracking: 'ใส่เลขพัสดุ', status: 'เปลี่ยนสถานะ', note: 'เพิ่มบันทึก', assign: 'มอบหมายงาน', cancel: 'ยกเลิก', cancelled: 'ลูกค้ายกเลิก', refund: 'คืนเงิน', files: 'แนบไฟล์', payment_failed: 'ชำระเงินไม่สำเร็จ' };

const readData = (file) => new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = bad; r.readAsDataURL(file); });
async function shrink(file, max) {
  const src = await readData(file);
  const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = src; });
  const k = Math.min(1, max / Math.max(img.width, img.height));
  if (k === 1 && file.size < 1.5e6) return src;
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.86);
}

// ---------- ลูกค้า ----------
const uq = { q: '', role: '', ai: false, offset: 0 };
async function viewUsers() {
  const params = new URLSearchParams({ limit: 30, offset: uq.offset });
  if (uq.q) params.set('q', uq.q);
  if (uq.role) params.set('role', uq.role);
  if (uq.ai) params.set('ai', 1);
  const r = await api(`admin/users?${params}`);
  view.innerHTML = `
    <div class="head"><h1>ลูกค้าและทีมงาน</h1></div>
    <form class="row" id="uFilter" style="margin-bottom:12px">
      <input class="grow" name="q" value="${esc(uq.q)}" placeholder="ค้นหาชื่อหรือเบอร์">
      <select name="role" style="width:auto"><option value="">ทุกสิทธิ์</option>${Object.entries(ROLE).map(([k, v]) => `<option value="${k}" ${k === uq.role ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <label class="row" style="display:flex"><input type="checkbox" name="ai" ${uq.ai ? 'checked' : ''} style="width:auto"> เฉพาะสมาชิก AI</label>
      <button class="btn">ค้นหา</button>
    </form>
    ${r.users.length ? `<div class="tscroll"><table class="table"><tr><th>ชื่อ</th><th>เบอร์</th><th>สิทธิ์</th><th class="hide-m">สมาชิก AI</th><th class="hide-m">ประวัติดูดวง</th><th class="hide-m">สมัครเมื่อ</th></tr>
      ${r.users.map((u) => `<tr data-href="#user/${u.id}"><td>${esc(u.name || '—')}${u.blocked ? ' <span class="pill s-cancelled">ระงับ</span>' : ''}</td><td>${esc(u.phone)}</td><td>${ROLE[u.role]}</td>
        <td class="hide-m">${u.ai_until > Date.now() ? `ถึง ${day(u.ai_until)}` : '—'}</td><td class="hide-m num">${u.history}</td><td class="hide-m">${dt(u.created_at)}</td></tr>`).join('')}</table></div>
      <div class="pager"><span>${uq.offset + 1}–${uq.offset + r.users.length} จาก ${r.total}</span>
      <span class="row"><button class="btn sm" id="prev" ${uq.offset ? '' : 'disabled'}>‹ ก่อนหน้า</button><button class="btn sm" id="next" ${uq.offset + 30 < r.total ? '' : 'disabled'}>ถัดไป ›</button></span></div>`
    : '<p class="empty">ไม่พบผู้ใช้</p>'}`;
  $('uFilter').addEventListener('submit', (e) => { e.preventDefault(); uq.q = e.target.q.value.trim(); uq.role = e.target.role.value; uq.ai = e.target.ai.checked; uq.offset = 0; route(); });
  $('prev')?.addEventListener('click', () => { uq.offset = Math.max(0, uq.offset - 30); route(); });
  $('next')?.addEventListener('click', () => { uq.offset += 30; route(); });
  view.querySelectorAll('tr[data-href]').forEach((tr) => tr.addEventListener('click', () => { location.hash = tr.dataset.href; }));
}
async function viewUser(id) {
  const { user: u, orders, seers } = await api(`admin/users/${encodeURIComponent(id)}`);
  const p = u.profile || {};
  const hist = p.history || [];
  const spent = orders.filter((o) => o.paid_at && o.status !== 'refunded').reduce((a, o) => a + o.amount, 0);
  view.innerHTML = `
    <a class="back" href="#users">‹ กลับไปรายชื่อ</a>
    <div class="head" style="margin-top:8px"><h1>${esc([p.first || u.name, p.last].filter(Boolean).join(' ') || u.phone)}</h1><span class="chip">${ROLE[u.role]}</span>${u.blocked ? '<span class="chip bad">ระงับบัญชี</span>' : ''}</div>
    <div class="kpis">
      <div class="kpi"><small>ยอดใช้จ่ายรวม</small><b>${baht(spent)}</b><em>${orders.length} คำสั่งซื้อ</em></div>
      <div class="kpi"><small>ประวัติดูดวง</small><b>${hist.length}</b><em>รายการในแฟ้มดวง</em></div>
      <div class="kpi"><small>สมาชิก AI</small><b>${u.ai_until > Date.now() ? day(u.ai_until) : '—'}</b><em>${u.ai_until > Date.now() ? 'หมดอายุ' : 'ไม่ได้เป็นสมาชิก'}</em></div>
      <div class="kpi"><small>เข้าใช้ล่าสุด</small><b style="font-size:17px">${dt(u.last_login)}</b><em>สมัคร ${dt(u.created_at)}</em></div>
    </div>
    <div class="detail">
      <div class="stack">
        <section class="card"><h3>ข้อมูลส่วนตัว</h3><dl class="kv">
          <dt>เบอร์</dt><dd>${esc(u.phone)}</dd>
          <dt>วันเกิด</dt><dd>${p.birthdate ? new Date(p.birthdate).toLocaleDateString('th-TH', { dateStyle: 'long' }) : '—'}${p.birthtime ? ` · ${esc(p.birthtime)} น.` : ''}</dd>
          ${p.birthplace ? `<dt>สถานที่เกิด</dt><dd>${esc(p.birthplace)}</dd>` : ''}${p.gender ? `<dt>เพศ</dt><dd>${esc(p.gender)}</dd>` : ''}
          ${p.interests?.length ? `<dt>สนใจ</dt><dd>${esc(p.interests.join(', '))}</dd>` : ''}
          <dt>คูปอง</dt><dd>${(p.coupons || []).length} ใบ</dd>
        </dl></section>
        <section class="card"><h3>คำสั่งซื้อ</h3>${orders.length ? `<table class="table">${orders.map((o) => `<tr data-href="#order/${o.no}"><td>${o.no}<span class="sub">${dt(o.created_at)}</span></td><td>${esc(o.title)}</td><td>${pill(o.status)}</td><td class="num">${baht(o.amount)}</td></tr>`).join('')}</table>` : '<p class="muted">ยังไม่มีคำสั่งซื้อ</p>'}</section>
        <section class="card"><h3>ประวัติดูดวงล่าสุด</h3>${hist.length ? `<table class="table">${hist.slice(0, 15).map((h) => `<tr><td>${esc(h.icon || '')} ${esc(h.title || h.kind)}<span class="sub">${dt(h.at)}</span></td><td>${esc(h.summary || h.status || h.lv || '')}</td></tr>`).join('')}</table>` : '<p class="muted">ยังไม่มีประวัติ</p>'}</section>
      </div>
      <div class="stack">
        <section class="card stack"><h3>จัดการบัญชี</h3>
          ${can('admin') ? `<label>สิทธิ์<span class="row"><select id="roleSel" class="grow">${Object.entries(ROLE).map(([k, v]) => `<option value="${k}" ${k === u.role ? 'selected' : ''}>${v}</option>`).join('')}</select><button class="btn sm" id="roleBtn">บันทึก</button></span></label>` : ''}
          ${can('admin') && u.role === 'seer' ? `<label>โปรไฟล์หมอดูบนเว็บ (รับงานที่ลูกค้าเลือกท่านนี้)<span class="row"><select id="seerSel" class="grow"><option value="">— ไม่เชื่อม (รับเฉพาะงานทั่วไป) —</option>${seers.map((x) => `<option value="${esc(x.id)}" ${x.id === u.seer_id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select><button class="btn sm" id="seerBtn">บันทึก</button></span></label>
          <p class="muted small">หมอดูเข้าสู่ระบบที่หน้าเว็บด้วยเบอร์นี้ แล้วตอบคำถามได้ที่แท็บ “บัญชี” → “งานตอบคำถาม” (ไม่ต้องเข้าหลังบ้าน)</p>` : ''}
          <label>เพิ่มวันสมาชิก AI (ชดเชย/ของขวัญ)<span class="row"><input id="aiDays" type="number" value="7" min="-365" max="365" class="grow"><button class="btn sm" id="aiBtn">เพิ่มวัน</button></span></label>
          <span class="row"><button class="btn sm" id="kick">ออกจากระบบทุกเครื่อง</button>
          ${can('admin') ? `<button class="btn sm danger" id="block">${u.blocked ? 'ยกเลิกการระงับ' : 'ระงับบัญชี'}</button>` : ''}</span>
        </section>
        <section class="card"><h3>บันทึกภายใน</h3>
          <div class="notes">${u.notes.map((n) => `<p>${esc(n.text)}<small>${esc(n.by)} · ${dt(n.at)}</small></p>`).join('') || '<p class="muted small" style="background:none;padding:0">ยังไม่มีบันทึก</p>'}</div>
          <form class="row" id="unote" style="margin-top:10px"><input class="grow" name="text" required placeholder="เช่น ลูกค้าขอให้โทรก่อนส่งของ"><button class="btn sm">เพิ่ม</button></form>
        </section>
      </div>
    </div>`;
  const upd = (body, msg) => run(async (e) => { e?.preventDefault?.(); await api(`admin/users/${u.id}`, { method: 'POST', body }); toast(msg); route(); });
  $('roleBtn')?.addEventListener('click', () => confirm(`เปลี่ยนสิทธิ์เป็น “${ROLE[$('roleSel').value]}”?`) && upd({ role: $('roleSel').value }, 'เปลี่ยนสิทธิ์แล้ว')());
  $('seerBtn')?.addEventListener('click', () => upd({ seer_id: $('seerSel').value }, 'เชื่อมโปรไฟล์หมอดูแล้ว')());
  $('aiBtn').addEventListener('click', () => upd({ ai_days: +$('aiDays').value }, 'อัปเดตวันสมาชิกแล้ว')());
  $('kick').addEventListener('click', () => confirm('ให้บัญชีนี้ออกจากระบบทุกเครื่อง?') && upd({ logout: true }, 'ออกจากระบบทุกเครื่องแล้ว')());
  $('block')?.addEventListener('click', () => confirm(u.blocked ? 'ยกเลิกการระงับบัญชี?' : 'ระงับบัญชีนี้? (เข้าสู่ระบบไม่ได้จนกว่าจะยกเลิก)') && upd({ blocked: !u.blocked }, 'อัปเดตแล้ว')());
  $('unote').addEventListener('submit', (e) => upd({ note: e.target.text.value }, 'เพิ่มบันทึกแล้ว')(e));
  view.querySelectorAll('tr[data-href]').forEach((tr) => tr.addEventListener('click', () => { location.hash = tr.dataset.href; }));
}

// ---------- หมอดู: ลงชื่อไว้ก่อน → สมัครที่หน้าเว็บด้วยเบอร์นี้ได้สิทธิ์หมอดูทันที ----------
let appQ = 'new';
const APP_CHIP = { new: 'warn', contacted: '', approved: 'ok', rejected: 'bad' };
function appsHTML(r, opts) {
  const { apps, counts, status, types } = r;
  const tabs = [['new', status.new], ['contacted', status.contacted], ['approved', status.approved], ['rejected', status.rejected], ['', 'ทั้งหมด']];
  return `<section class="card" style="margin-bottom:16px">
    <h3>ใบสมัครหมอดู ${counts.new ? `<span class="chip warn">ใหม่ ${counts.new}</span>` : ''}</h3>
    <p class="muted small">มาจากหน้า <a href="seer-apply.html" target="_blank">ร่วมเป็นหมอดูกับเรา</a> · ติดต่อผู้สมัครทาง LINE หรือโทร ทดลองให้ตอบคำถาม แล้วกดอนุมัติ = ลงชื่อหมอดูให้เบอร์นี้ (หมอดูสมัครที่หน้าเว็บด้วยเบอร์นี้ได้สิทธิ์ทันที)</p>
    <div class="tabs">${tabs.map(([k, l]) => `<button data-app-st="${k}" class="${k === appQ ? 'on' : ''}">${esc(l)}${k && counts[k] ? ` (${counts[k]})` : ''}</button>`).join('')}</div>
    ${apps.length ? apps.map((a) => `<details class="app-item">
      <summary><b>${esc(a.alias || a.name)}</b>${a.alias ? ` <span class="muted small">${esc(a.name)}</span>` : ''} · ${esc(a.phone)}
        <span class="chip ${APP_CHIP[a.status] || ''}">${esc(status[a.status] || a.status)}</span> <span class="muted small">${dt(a.created_at)}</span></summary>
      <div class="stack" style="margin-top:10px">
        <p class="small">${a.line ? `LINE: <b>${esc(a.line)}</b> · ` : ''}${a.years != null ? `ประสบการณ์ ${a.years} ปี · ` : ''}${a.links ? `ผลงาน: ${esc(a.links)}` : ''}</p>
        <p class="small"><b>ศาสตร์:</b> ${a.cats.map((k) => esc(types[k] || k)).join(' · ')}</p>
        <p class="small" style="white-space:pre-wrap"><b>แนะนำตัว:</b> ${esc(a.about)}</p>
        ${a.sample ? `<p class="small" style="white-space:pre-wrap"><b>ตัวอย่างคำทำนาย:</b> ${esc(a.sample)}</p>` : ''}
        ${(a.notes || []).length ? `<div class="notes">${a.notes.map((n) => `<p>${esc(n.text)}<small>${esc(n.who)} · ${dt(n.at)}</small></p>`).join('')}</div>` : ''}
        ${a.reviewed_by ? `<p class="muted small">ดำเนินการล่าสุดโดย ${esc(a.reviewed_by)} · ${dt(a.reviewed_at)}</p>` : ''}
        <form class="row app-act" data-app="${esc(a.id)}" style="flex-wrap:wrap;gap:8px">
          <input name="note" class="grow" maxlength="1000" placeholder="บันทึก เช่น โทรคุยแล้ว นัดทดลองตอบ">
          <button class="btn sm" name="do" value="note">บันทึก</button>
          ${a.status === 'new' ? '<button class="btn sm" name="do" value="contacted">ติดต่อแล้ว</button>' : ''}
          ${a.status !== 'approved' && can('admin') ? `<select name="seer_id" title="โปรไฟล์หมอดูบนเว็บ"><option value="new" selected>＋ สร้างโปรไฟล์บนเว็บจากใบสมัครนี้</option>${opts('')}</select><button class="btn primary sm" name="do" value="approved">อนุมัติเป็นหมอดู</button>` : ''}
          ${a.status !== 'rejected' && a.status !== 'approved' ? '<button class="btn ghost sm" name="do" value="rejected">ไม่ผ่าน</button>' : ''}
          ${can('admin') ? '<button class="btn ghost sm" name="do" value="delete" title="ผู้สมัครขอลบข้อมูล">ลบใบสมัคร</button>' : ''}
        </form>
      </div></details>`).join('') : '<p class="empty">ไม่มีใบสมัครในหมวดนี้</p>'}
  </section>`;
}
// ---------- โปรไฟล์หมอดูบนหน้าเว็บ (แท็บ "หมอดู") ----------
const profAv = (p, cls = '') => `<span class="prof-av ${cls}">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy">` : esc([...String(p.name || '?')][0])}</span>`;
function profilesHTML(all) {
  const shown = all.filter((p) => !p.hidden).length;
  return `<section class="card" style="margin-top:16px">
    <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:4px">
      <h3 style="margin:0">โปรไฟล์หมอดูบนหน้าเว็บ <span class="muted small">แสดง ${shown} · ซ่อน ${all.length - shown}</span></h3>
      ${can('admin') ? '<button class="btn sm" id="profNew">＋ เพิ่มโปรไฟล์</button>' : ''}</div>
    <p class="muted small">สิ่งที่ลูกค้าเห็นในแท็บ "หมอดู" บนหน้าเว็บ (ชื่อ รูป ศาสตร์ที่ถนัด) · ซ่อน = ไม่แสดงบนเว็บ ลูกค้าเลือกท่านนี้ไม่ได้ และไม่ได้รับงานศาสตร์เฉพาะ · เปลี่ยนแล้วหน้าเว็บอัปเดตภายใน 1 นาที</p>
    <div class="prof-grid">${all.map((p) => `<button type="button" class="prof-item ${p.hidden ? 'off' : ''}" data-prof="${esc(p.id)}" ${can('admin') ? '' : 'disabled'}>
      ${profAv(p)}<b>${esc(p.name)}</b>
      <small>${p.cats.length} ศาสตร์${p.hidden ? ' · <span style="color:var(--warn)">ซ่อน</span>' : ''}${!p.base ? ' · เพิ่มในหลังบ้าน' : p.edited ? ' · แก้แล้ว' : ''}</small></button>`).join('')}</div>
    <div id="profEdit"></div>
  </section>`;
}
// ย่อรูปเหลือด้านยาวไม่เกิน 480px ก่อนอัปโหลด (รูปโปรไฟล์แสดงเล็ก ไม่ต้องใช้ไฟล์ใหญ่)
async function shrinkImage(file, max = 480) {
  const img = await createImageBitmap(file);
  const r = Math.min(1, max / Math.max(img.width, img.height));
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(img.width * r), height: Math.round(img.height * r) });
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.86);
}
function openProfile(p, cats) {
  const box = $('profEdit');
  const isNew = !p;
  p ||= { id: '', name: '', img: '', cats: [], callCoin: 0, callMin: 0, hidden: false, base: false, edited: false };
  const has = new Set(p.cats);
  box.innerHTML = `<form class="prof-form stack" id="profForm">
    <h3>${isNew ? 'เพิ่มโปรไฟล์หมอดู' : `แก้โปรไฟล์: ${esc(p.name)}`}</h3>
    <div class="row" style="align-items:center;gap:14px">
      <span id="profPrev">${profAv(p, 'big')}</span>
      <div class="stack" style="gap:6px">
        <label class="btn sm" style="justify-self:start">เลือกรูป…<input type="file" name="file" accept="image/jpeg,image/png,image/webp" hidden></label>
        ${p.img ? '<label class="row small" style="display:flex;gap:6px"><input type="checkbox" name="noimg" style="width:auto"> ลบรูป (แสดงอักษรแรกของชื่อแทน)</label>' : ''}
        <span class="muted small">รูปสี่เหลี่ยมจัตุรัส หน้าชัด ระบบย่อให้อัตโนมัติ</span>
      </div>
    </div>
    <div class="row">
      <label class="grow">ชื่อที่แสดงบนเว็บ<input name="name" required maxlength="60" value="${esc(p.name)}" placeholder="เช่น อ.วิน ดูดวงทะลุมิติ"></label>
      <label>ค่าโทรบนแอป (บาท)<input name="callCoin" type="number" min="0" max="100000" value="${p.callCoin || ''}" placeholder="0 = ไม่แสดง" style="width:130px"></label>
      <label>ต่อกี่นาที<input name="callMin" type="number" min="0" max="600" value="${p.callMin || ''}" style="width:100px"></label>
    </div>
    <div class="stack" style="gap:8px">
      <label><span>ศาสตร์ที่ถนัด <span id="profCount">(${has.size})</span></span>
        <select id="profAdd" aria-label="เพิ่มศาสตร์ที่ถนัด"></select></label>
      <div class="prof-picked" id="profPicked"></div>
    </div>
    <label class="row small" style="display:flex;gap:6px"><input type="checkbox" name="hidden" ${p.hidden ? 'checked' : ''} style="width:auto"> ซ่อนจากหน้าเว็บ (พักรับงาน)</label>
    <div class="row" style="gap:8px;flex-wrap:wrap">
      <button class="btn primary" name="do" value="save">${isNew ? 'เพิ่มโปรไฟล์' : 'บันทึก'}</button>
      <button type="button" class="btn ghost" id="profCancel">ยกเลิก</button>
      ${p.base && p.edited ? '<button class="btn ghost" name="do" value="reset" title="กลับไปใช้ข้อมูลเดิมจากระบบ">คืนค่าเดิม</button>' : ''}
      ${!isNew && !p.base ? '<button class="btn danger" name="do" value="delete">ลบโปรไฟล์</button>' : ''}
    </div>
    ${p.base ? '<p class="muted small">โปรไฟล์ตั้งต้นของระบบ ลบไม่ได้ ใช้ "ซ่อน" แทน</p>' : ''}
  </form>`;
  const f = $('profForm');
  let image = null;
  f.file.addEventListener('change', run(async () => {
    const file = f.file.files[0];
    if (!file) return;
    image = await shrinkImage(file);
    $('profPrev').innerHTML = profAv({ ...p, img: image }, 'big');
    if (f.noimg) f.noimg.checked = false;
  }));
  // เลือกศาสตร์จาก dropdown (จัดกลุ่มตามหมวด) → ขึ้นเป็นป้าย กด ✕ เพื่อเอาออก · ศาสตร์ที่เลือกแล้วจะไม่อยู่ใน dropdown
  const typeName = Object.fromEntries(cats.flatMap((c) => c.types.map((t, i) => [`${c.id}|${i}`, `${c.icon} ${t}`])));
  const drawCats = () => {
    $('profAdd').innerHTML = `<option value="">＋ เลือกศาสตร์เพื่อเพิ่ม…</option>${cats.map((c) => {
      const left = c.types.map((t, i) => [`${c.id}|${i}`, t]).filter(([k]) => !has.has(k));
      return left.length ? `<optgroup label="${c.icon} ${esc(c.name)}">${left.map(([k, t]) => `<option value="${esc(k)}">${esc(t)}</option>`).join('')}</optgroup>` : '';
    }).join('')}`;
    $('profPicked').innerHTML = has.size ? [...has].map((k) => `<span class="pchip-on">${esc(typeName[k] || k)}<button type="button" data-unpick="${esc(k)}" aria-label="เอา ${esc(typeName[k] || k)} ออก">✕</button></span>`).join('')
      : '<span class="muted small">ยังไม่ได้เลือก</span>';
    $('profCount').textContent = `(${has.size})`;
  };
  drawCats();
  $('profAdd').addEventListener('change', (e) => { if (e.target.value) { has.add(e.target.value); drawCats(); } });
  $('profPicked').addEventListener('click', (e) => { const k = e.target.dataset?.unpick; if (k) { has.delete(k); drawCats(); } });
  $('profCancel').addEventListener('click', () => { box.innerHTML = ''; });
  f.addEventListener('submit', run(async (e) => {
    e.preventDefault();
    const act = e.submitter?.value || 'save';
    const url = isNew ? 'admin/seer-profiles' : `admin/seer-profiles/${encodeURIComponent(p.id)}`;
    if (act === 'delete') {
      if (!confirm(`ลบโปรไฟล์ "${p.name}" ถาวร?`)) return;
      await api(url, { method: 'POST', body: { delete: true } });
      toast('ลบโปรไฟล์แล้ว'); route(); return;
    }
    if (act === 'reset') {
      if (!confirm('คืนค่าโปรไฟล์นี้เป็นข้อมูลเดิมของระบบ? (ชื่อ รูป ศาสตร์ที่แก้ไว้จะหาย)')) return;
      await api(url, { method: 'POST', body: { reset: true } });
      toast('คืนค่าเดิมแล้ว'); route(); return;
    }
    const body = { name: f.name.value.trim(), cats: [...has],
      callCoin: +f.callCoin.value || 0, callMin: +f.callMin.value || 0, hidden: f.hidden.checked };
    if (!body.cats.length && !confirm('ยังไม่ได้เลือกศาสตร์เลย บันทึกต่อไหม?')) return;
    if (image) body.image = image;
    else if (f.noimg?.checked) body.img = '';
    await api(url, { method: 'POST', body });
    toast(isNew ? 'เพิ่มโปรไฟล์แล้ว ✓' : 'บันทึกแล้ว ✓');
    route();
  }));
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  f.name.focus({ preventScroll: true });
}
async function viewSeers() {
  const [{ seers, profiles, all = [], cats = [], base, human = [] }, apps] = await Promise.all([api('admin/seers'), api(`admin/seer-apps?status=${appQ}`)]);
  const opts = (sel) => `<option value="">— ไม่เชื่อม (รับเฉพาะงานทั่วไป) —</option>${profiles.map((x) => `<option value="${esc(x.id)}" ${x.id === sel ? 'selected' : ''}>${esc(x.name)}${x.hidden ? ' (ซ่อน)' : ''}</option>`).join('')}`;
  view.innerHTML = `
    <div class="head"><h1>หมอดู</h1><span class="muted small">หมอดูตอบคำถามที่หน้าเว็บ (บัญชี → งานตอบคำถาม) ไม่ต้องเข้าหลังบ้าน</span></div>
    ${appsHTML(apps, opts)}
    ${can('admin') ? `<form class="card stack" id="seerForm" style="margin-bottom:16px">
      <h3>เพิ่มหมอดู</h3>
      <div class="row">
        <label class="grow">ชื่อที่ใช้เรียก<input name="name" required maxlength="60" placeholder="เช่น อาจารย์ภณ"></label>
        <label class="grow">เบอร์โทรที่หมอดูใช้สมัคร<span class="phone"><select name="cc"><option value="66">🇹🇭 +66</option><option value="856">🇱🇦 +856</option><option value="95">🇲🇲 +95</option><option value="855">🇰🇭 +855</option><option value="1">🇺🇸 +1</option></select><input name="phone" inputmode="tel" required placeholder="812345678"></span></label>
        <label class="grow">โปรไฟล์หมอดูบนเว็บ<select name="seer_id">${opts('')}</select></label>
      </div>
      <button class="btn primary" style="justify-self:start">เพิ่มหมอดู</button>
      <p class="muted small">หมอดูสมัครที่หน้าเว็บด้วยเบอร์นี้ จะได้สิทธิ์หมอดูทันที (ไม่มีวงล้อของขวัญ) ถ้าเบอร์นี้สมัครเป็นลูกค้าไว้แล้ว จะเปลี่ยนเป็นหมอดูให้เลย</p>
    </form>` : ''}
    ${seers.length ? `<div class="tscroll"><table class="table">
      <tr><th>หมอดู</th><th>เบอร์</th><th>โปรไฟล์บนเว็บ</th><th>ราคา/เรื่อง</th><th>สถานะ</th><th class="num">รอตอบ</th><th class="num">ตอบแล้ว</th></tr>
      ${seers.map((x) => `<tr data-href="#user/${x.id}"><td>${esc(x.name || '—')}</td><td>${esc(x.phone)}</td><td>${esc(x.seer_name || '—')}</td>
        <td>${!x.seer_id ? '<span class="muted small">เชื่อมโปรไฟล์ก่อน</span>' : can('admin') ? `<form class="row" data-price="${x.seer_id}" style="flex-wrap:nowrap" onclick="event.stopPropagation()"><input name="p" type="number" min="20" max="10000" value="${x.price || ''}" placeholder="${base}" style="width:84px"><button class="btn sm">บันทึก</button></form>` : baht(x.price || base)}</td>
        <td>${x.blocked ? '<span class="chip bad">ระงับ</span>' : x.registered ? `<span class="chip ok">สมัครแล้ว</span><span class="sub">เข้าล่าสุด ${dt(x.last_login)}</span>` : `<span class="chip warn">รอสมัครที่หน้าเว็บ</span><span class="sub">เพิ่มเมื่อ ${dt(x.invited_at)}</span>`}</td>
        <td class="num">${x.open ? `<b style="color:var(--warn)">${x.open}</b>` : 0}</td><td class="num">${x.answered}</td></tr>`).join('')}
    </table></div>` : '<p class="empty">ยังไม่มีหมอดู · เพิ่มชื่อและเบอร์ด้านบน</p>'}
    ${human.length ? `<section class="card" style="margin-top:16px"><h3>ศาสตร์ที่ต้องใช้หมอดูจริง</h3>
      <p class="muted small">แม่หมอ AI ไม่ตอบศาสตร์เหล่านี้ จะเปิดขายบนหน้าเว็บเองเมื่อมีหมอดูอย่างน้อย 1 ท่านที่สมัครครบ ไม่ถูกระงับ และเชื่อมกับโปรไฟล์ที่ลงทะเบียนศาสตร์นั้น · งานจะส่งให้เฉพาะหมอดูที่ชำนาญศาสตร์นั้น</p>
      <div class="tscroll"><table class="table">
        <tr><th>ศาสตร์</th><th>สถานะ</th><th>หมอดูที่พร้อมรับงาน</th><th class="hide-m">โปรไฟล์ที่ลงทะเบียนศาสตร์นี้</th></tr>
        ${human.map((h) => `<tr><td>${h.icon} ${esc(h.name)}<span class="sub">${esc(h.cat)}</span></td>
          <td>${h.seers.length ? '<span class="chip ok">เปิดขาย</span>' : '<span class="chip warn">ซ่อนอยู่</span>'}</td>
          <td>${h.seers.length ? esc(h.seers.join(', ')) : '<span class="muted small">ยังไม่มี</span>'}</td>
          <td class="hide-m small">${h.profiles.length ? esc(h.profiles.join(', ')) : '<span class="muted">ไม่มีโปรไฟล์ไหนลงทะเบียน</span>'}</td></tr>`).join('')}
      </table></div></section>` : ''}
    ${profilesHTML(all)}`;
  $('profNew')?.addEventListener('click', () => openProfile(null, cats));
  view.querySelectorAll('[data-prof]').forEach((b) => b.addEventListener('click', () => openProfile(all.find((p) => p.id === b.dataset.prof), cats)));
  $('seerForm')?.addEventListener('submit', run(async (e) => {
    e.preventDefault();
    const f = e.target;
    const phone = `+${f.cc.value}${f.phone.value.replace(/\D/g, '').replace(/^0+/, '')}`;
    const r = await api('admin/seers', { method: 'POST', body: { name: f.name.value, phone, seer_id: f.seer_id.value } });
    toast(r.registered ? 'เปลี่ยนบัญชีนี้เป็นหมอดูแล้ว ✓' : 'เพิ่มหมอดูแล้ว · รอสมัครที่หน้าเว็บด้วยเบอร์นี้');
    route();
  }));
  view.querySelectorAll('[data-price]').forEach((f) => f.addEventListener('submit', run(async (e) => {
    e.preventDefault();
    const r = await api('admin/seers/price', { method: 'POST', body: { seer_id: f.dataset.price, price: f.p.value === '' ? null : +f.p.value } });
    toast(r.price ? `ตั้งราคา ${baht(r.price)} แล้ว` : `กลับไปใช้ราคากลาง ${baht(base)}`);
  })));
  view.querySelectorAll('tr[data-href]').forEach((tr) => tr.addEventListener('click', () => { location.hash = tr.dataset.href; }));
  view.querySelectorAll('[data-app-st]').forEach((b) => b.addEventListener('click', () => { appQ = b.dataset.appSt; route(); }));
  view.querySelectorAll('form[data-app]').forEach((f) => f.addEventListener('submit', run(async (e) => {
    e.preventDefault();
    const act = e.submitter?.value || 'note';
    if (act === 'delete') {
      if (!confirm('ลบใบสมัครนี้ถาวร? (ใช้เมื่อผู้สมัครขอลบข้อมูล)')) return;
      await api(`admin/seer-apps/${f.dataset.app}`, { method: 'POST', body: { delete: true } });
      toast('ลบใบสมัครแล้ว'); route(); return;
    }
    const body = { note: f.note.value.trim() || undefined };
    if (act !== 'note') body.status = act;
    if (act === 'approved') {
      body.seer_id = f.seer_id?.value || '';
      if (!confirm('อนุมัติและลงชื่อเบอร์นี้เป็นหมอดู?')) return;
    }
    if (act === 'note' && !body.note) return toast('พิมพ์บันทึกก่อน');
    await api(`admin/seer-apps/${f.dataset.app}`, { method: 'POST', body });
    toast({ note: 'บันทึกแล้ว', contacted: 'ย้ายไป "ติดต่อแล้ว"', approved: 'อนุมัติแล้ว · ลงชื่อหมอดูให้เบอร์นี้แล้ว ✓', rejected: 'ย้ายไป "ไม่ผ่าน"' }[act]);
    route();
  })));
}

// ---------- สินค้า: สต๊อกวัตถุมงคล (เว้นว่าง = ไม่จำกัด) ----------
async function viewStock() {
  const { shop, stock } = await api('admin/catalog');
  view.innerHTML = `
    <div class="head"><h1>สินค้าและสต๊อก</h1><span class="muted small">ลูกค้าเลือกจำนวนได้ไม่เกินที่เหลือ · จองสต๊อกตอนสร้าง QR และคืนให้อัตโนมัติถ้า QR หมดอายุหรือยกเลิก</span></div>
    <div class="tscroll"><table class="table">
      <tr><th>สินค้า</th><th class="num">ราคา</th><th>คงเหลือ</th><th></th></tr>
      ${shop.map((p) => {
        const q = stock[p.id];
        const state = p.digital ? '<span class="chip">ไฟล์ดิจิทัล · ไม่ใช้สต๊อก</span>' : q == null ? '<span class="chip ok">ไม่จำกัด</span>' : q === 0 ? '<span class="chip bad">หมดแล้ว</span>' : q <= 3 ? `<span class="chip warn">เหลือ ${q}</span>` : `<span class="chip ok">เหลือ ${q}</span>`;
        return `<tr><td>${p.icon} ${esc(p.name)}<span class="sub">${p.id}</span></td><td class="num">${baht(p.price)}</td><td>${state}</td>
          <td>${p.digital ? '' : `<form class="row" data-stock="${p.id}" style="flex-wrap:nowrap"><input name="qty" type="number" min="0" max="100000" value="${q ?? ''}" placeholder="ไม่จำกัด" style="width:110px">
            <button class="btn sm">บันทึก</button>${q != null ? `<button type="button" class="btn sm ghost" data-unlimit="${p.id}">ไม่จำกัด</button>` : ''}</form>`}</td></tr>`;
      }).join('')}
    </table></div>
    <p class="muted small" style="margin-top:10px">ราคาสินค้าแก้ที่ไฟล์ shop-data.js แล้ว deploy</p>`;
  view.querySelectorAll('[data-stock]').forEach((f) => f.addEventListener('submit', run(async (e) => {
    e.preventDefault();
    await api('admin/stock', { method: 'POST', body: { id: f.dataset.stock, qty: f.qty.value === '' ? null : +f.qty.value } });
    toast('บันทึกสต๊อกแล้ว ✓'); route();
  })));
  view.querySelectorAll('[data-unlimit]').forEach((b) => b.addEventListener('click', run(async () => {
    await api('admin/stock', { method: 'POST', body: { id: b.dataset.unlimit, qty: null } });
    toast('ตั้งเป็นไม่จำกัดแล้ว'); route();
  })));
}

// ---------- ประกาศ ----------
async function viewBroadcast() {
  view.innerHTML = `
    <div class="head"><h1>ส่งประกาศถึงลูกค้า</h1></div>
    <div class="grid2">
      <form class="card stack" id="bcForm">
        <label>ส่งถึง<select name="target"><option value="all">ลูกค้าทุกคน</option><option value="ai">เฉพาะสมาชิก AI รายเดือน</option></select></label>
        <label>หัวข้อ<input name="title" maxlength="80" required placeholder="เช่น เปิดบริการใหม่ ฮวงจุ้ยคอนโด"></label>
        <label>ข้อความ<textarea name="body" maxlength="300" required placeholder="ข้อความสั้น ๆ ไม่เกิน 300 ตัวอักษร"></textarea></label>
        <button class="btn primary">ส่งประกาศ</button>
        <p class="muted small">ลูกค้าเห็นในกล่องแจ้งเตือนบนเว็บ และได้รับ Push ถ้าเปิดการแจ้งเตือนไว้</p>
      </form>
      <section class="card stack"><h3>งานประจำวัน</h3>
        <p class="muted small">ระบบรันอัตโนมัติทุกวัน 06:00 น. (Vercel Cron): ส่งดวงโดยรวมวันนี้ให้สมาชิกรายเดือน (ในเว็บ · LINE OA ในอนาคต) · เตือนสมาชิกใกล้หมดอายุ · ปิดคำสั่งซื้อที่ QR หมดอายุ</p>
        <button class="btn" id="runDaily">รันงานประจำวันตอนนี้</button>
      </section>
    </div>`;
  $('bcForm').addEventListener('submit', run(async (e) => {
    e.preventDefault();
    const f = e.target;
    if (!confirm(`ส่ง “${f.title.value}” ถึง${f.target.value === 'ai' ? 'สมาชิก AI' : 'ลูกค้าทุกคน'}?`)) return;
    const r = await api('admin/broadcast', { method: 'POST', body: { target: f.target.value, title: f.title.value, body: f.body.value } });
    toast(`ส่งแล้ว ${r.sent} คน`);
    f.reset();
  }));
  $('runDaily').addEventListener('click', run(async () => {
    const r = await api('admin/cron/daily', { method: 'POST' });
    toast(`แจ้งดวงวันนี้ ${r.daily} คน · เตือนต่ออายุ ${r.reminded} · ปิด QR หมดอายุ ${r.expired}`);
  }));
}

// ---------- ตำราดูดวง: ตารางที่ระบบใช้คำนวณ (คู่เลข · อักษรและสีประจำดาว · ค่าอักษรเลขศาสตร์) ----------
// แก้แล้วกดบันทึก มีผลกับหน้าเว็บและแม่หมอ AI ภายใน 1 นาที · เก็บย้อนหลัง 20 เวอร์ชัน
async function viewKB(arg) {
  const r = await api('admin/kb');
  const ids = Object.keys(r.tables);
  const id = ids.includes(arg) ? arg : ids[0];
  const doc = r.docs[id];
  const rows = structuredClone(doc ? doc.data : r.defaults[id]);
  const calc = await import('/lib/calc/browser.js').then(() => window.MohdooCalc).catch(() => null);
  const LV = r.levels;
  const status = doc
    ? `${doc.reviewed ? '<span class="chip ok">หมอดูตรวจแล้ว</span>' : '<span class="chip warn">ร่าง · ยังไม่ผ่านการตรวจ</span>'} <span class="muted small">แก้ล่าสุด ${dt(doc.updated_at)} โดย ${esc(doc.updated_by || '-')}</span>`
    : '<span class="chip warn">ใช้ค่าเริ่มต้นของระบบ · ยังไม่ผ่านการตรวจ</span>';
  view.innerHTML = `
    <div class="head"><h1>ตำราดูดวง</h1><span class="muted small">ตารางที่ระบบใช้คำนวณ · บันทึกแล้วมีผลกับหน้าเว็บและแม่หมอ AI ภายใน 1 นาที</span></div>
    <div class="tabs">${ids.map((k) => `<button data-kb="${k}" class="${k === id ? 'on' : ''}">${esc(r.tables[k])}</button>`).join('')}</div>
    <div class="grid2">
      <section class="card"><h3>${esc(r.tables[id])}</h3><p>${status}</p>
        <div class="guide small" style="margin:8px 0 12px">${esc(KB_HELP[id] || r.schema?.[id]?.help || '')}</div>
        <form id="kbForm"><div class="tscroll" id="kbTable"></div>
          ${id === 'pairs' ? '<button type="button" class="btn sm" id="kbAdd" style="margin-top:8px">+ เพิ่มคู่เลข</button>' : ''}
          <label class="check" style="margin-top:14px"><input type="checkbox" name="reviewed" ${doc?.reviewed ? 'checked' : ''}> หมอดู/โหรของทีมตรวจตารางนี้แล้ว</label>
          <label>บันทึกการแก้ไข (ไม่บังคับ)<input name="note" maxlength="200" placeholder="เช่น ปรับคู่ 78 ตามตำราอาจารย์..."></label>
          <p class="err" id="kbErr" hidden></p>
          <div class="row" style="margin-top:10px"><button class="btn primary">บันทึกตาราง</button>
            <button type="button" class="btn ghost" id="kbReset">คืนค่าเริ่มต้นของระบบ</button></div>
        </form>
      </section>
      <div class="stack">
        <section class="card"><h3>ทดลองกับตารางที่กำลังแก้</h3>
          <p class="muted small">ยังไม่บันทึก ใช้ทดลองดูผลก่อนได้</p>
          ${KB_TRY[id] || KB_TRY.planets}
          <pre class="guide small" id="kbOut" style="white-space:pre-wrap;margin-top:10px">${calc ? 'พิมพ์เพื่อดูผล' : 'โหลดชุดคำนวณไม่ได้'}</pre>
        </section>
        <section class="card"><h3>ประวัติเวอร์ชัน</h3>
          ${doc?.versions?.length ? `<table class="table">${doc.versions.map((v) => `<tr><td>${dt(v.at)}<span class="sub">${esc(v.by || '-')}${v.note ? ` · ${esc(v.note)}` : ''}</span></td>
            <td>${v.reviewed ? '<span class="chip ok">ตรวจแล้ว</span>' : '<span class="chip">ร่าง</span>'}</td>
            <td><button class="btn sm ghost" data-restore="${v.at}">ย้อนกลับ</button></td></tr>`).join('')}</table>` : '<p class="muted small">ยังไม่มีเวอร์ชันก่อนหน้า</p>'}
        </section>
      </div>
    </div>`;

  const table = $('kbTable');
  const draw = () => {
    if (id === 'pairs') {
      table.innerHTML = `<table class="table"><tr><th>คู่เลข</th><th>ระดับ</th><th>ความหมาย</th><th></th></tr>
        ${rows.map((x, i) => `<tr><td><input data-i="${i}" data-k="pair" value="${esc(x.pair)}" maxlength="2" inputmode="numeric" style="width:64px"></td>
          <td><select data-i="${i}" data-k="level">${Object.entries(LV).map(([k, l]) => `<option value="${k}" ${x.level === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
          <td><input data-i="${i}" data-k="text" value="${esc(x.text)}" maxlength="120"></td>
          <td><button type="button" class="btn sm ghost" data-del="${i}" aria-label="ลบ">✕</button></td></tr>`).join('')}</table>
        <p class="muted small">คู่กลับหน้า-หลัง (เช่น 41) ใช้ความหมายของ 14 อัตโนมัติ ถ้าต้องการความหมายต่างกันให้เพิ่มแยก · คู่ที่ไม่มีในตาราง = กลาง ๆ</p>`;
    } else if (id === 'planets') {
      table.innerHTML = `<table class="table"><tr><th>ดาว</th><th>สีประจำดาว</th><th>อักษรประจำดาว</th></tr>
        ${rows.map((x, i) => `<tr><td>${x.n} · ${esc(x.name)}</td><td><input data-i="${i}" data-k="color" value="${esc(x.color)}" maxlength="40"></td>
          <td><input data-i="${i}" data-k="letters" value="${esc(x.letters)}" maxlength="60"></td></tr>`).join('')}</table>`;
    } else if (r.schema?.[id]) {
      // ตารางแบบทั่วไป: คอลัมน์ล็อก = ข้อความธรรมดา · ข้อความยาว = textarea · ตัวเลข = number
      const sc = r.schema[id];
      const cell = (x, i, c) => c.fixed ? esc(x[c.k])
        : c.num ? `<input type="number" data-i="${i}" data-k="${c.k}" value="${esc(x[c.k])}" min="${c.num[0]}" max="${c.num[1]}" style="width:64px">`
        : c.long ? `<textarea data-i="${i}" data-k="${c.k}" maxlength="${c.max}" rows="${sc.single ? 26 : 2}" style="min-height:${sc.single ? '520px' : '54px'}">${esc(x[c.k])}</textarea>`
        : `<input data-i="${i}" data-k="${c.k}" value="${esc(x[c.k])}" maxlength="${c.max}">`;
      const cols = sc.cols.filter((c) => !(sc.single && c.fixed));
      table.innerHTML = `<table class="table">${sc.single ? '' : `<tr>${cols.map((c) => `<th>${esc(c.label)}</th>`).join('')}</tr>`}
        ${rows.map((x, i) => `<tr>${cols.map((c) => `<td>${cell(x, i, c)}</td>`).join('')}</tr>`).join('')}</table>`;
    } else {
      table.innerHTML = `<table class="table"><tr><th>ค่า</th><th>อักษรที่มีค่านี้</th></tr>
        ${rows.map((x, i) => `<tr><td>${x.v}</td><td><input data-i="${i}" data-k="chars" value="${esc(x.chars)}" maxlength="60"></td></tr>`).join('')}</table>`;
    }
  };
  draw();
  table.addEventListener('input', (e) => { const t = e.target; if (t.dataset.k) { rows[+t.dataset.i][t.dataset.k] = t.value; tryIt(); } });
  table.addEventListener('click', (e) => { const b = e.target.closest('[data-del]'); if (b) { rows.splice(+b.dataset.del, 1); draw(); tryIt(); } });
  $('kbAdd')?.addEventListener('click', () => { rows.push({ pair: '', level: 'good', text: '' }); draw(); table.querySelector(`[data-i="${rows.length - 1}"]`)?.focus(); });

  // ทดลอง: ใช้ตารางที่กำลังแก้ (ถ้าผ่านการตรวจ) แล้วคืนค่าที่ใช้จริงทันที
  function tryIt() {
    if (!calc) return;
    const out = $('kbOut');
    const v = calc.validateTable(id, rows);
    if (!v.ok) { out.textContent = `⚠️ ${v.error}`; return; }
    const val = ($('kbTry')?.value || '').trim();
    if (id === 'palm') { out.textContent = `ตำรายาว ${v.data[0].text.length.toLocaleString('th-TH')} ตัวอักษร · ส่งให้แม่หมอ AI ทุกครั้งที่อ่านลายมือ/ข้อมือ`; return; }
    if (!val && !['mahabote', 'mansions', 'stars'].includes(id)) { out.textContent = 'พิมพ์เพื่อดูผล'; return; }
    const live = Object.fromEntries(ids.map((k) => [k, r.docs[k] ? { data: r.docs[k].data } : undefined]).filter(([, x]) => x));
    calc.setKB({ ...live, [id]: { data: v.data } });
    try {
      if (id === 'iching') {
        const res = calc.castCoins(`ทดลอง|${val}`);
        out.textContent = calc.ichingText(res);
      } else if (id === 'mahabote') {
        const [y, m, d] = ($('kbTryDate').value || '1990-08-15').split('-').map(Number);
        out.textContent = calc.mahaboteText(calc.mahabote(y, m, d));
      } else if (id === 'mansions' || id === 'stars') {
        const y = Number($('kbTryYear').value) || 1990;
        out.textContent = calc.fengshuiText(y, $('kbTrySex').value === 'ชาย', new Date().getFullYear());
      } else if (id === 'pairs') {
        const isPlate = /[ก-ฮ]/.test(val);
        const res = isPlate ? calc.analyzePlate(val) : calc.analyzeNumber(val, 'phone');
        out.textContent = res ? `${calc.numberText(res)}\nระดับดวง: ${res.score}/5` : 'ไม่มีตัวเลข';
      } else {
        const [first, ...last] = val.split(/\s+/);
        const c = calc.computeChart({ birthdate: $('kbTryDate').value });
        const n = calc.analyzeName(first, last.join(' '), c ? c.thai.planet : null);
        out.textContent = n ? `${c ? `เกิดวัน${c.thai.astroDay} · กาลกิณี ${c.thai.taksa[7].planet} (${c.thai.taksa[7].letters})\n` : ''}${calc.nameText(n)}${n.score ? `\nระดับดวง: ${n.score}/5` : ''}` : '';
      }
    } finally { calc.setKB(live); }
  }
  view.querySelectorAll('#kbTry, #kbTryDate, #kbTryYear, #kbTrySex').forEach((x) => x.addEventListener('input', tryIt));
  tryIt();

  view.querySelectorAll('[data-kb]').forEach((b) => b.addEventListener('click', () => { location.hash = `kb/${b.dataset.kb}`; }));
  const showErr = (m) => { $('kbErr').textContent = m; $('kbErr').hidden = !m; };
  $('kbForm').addEventListener('submit', run(async (e) => {
    e.preventDefault();
    const f = e.target;
    const data = id === 'pairs' ? rows.filter((x) => x.pair || x.text) : rows;
    if (calc) { const v = calc.validateTable(id, data); if (!v.ok) { showErr(v.error); return; } }
    showErr('');
    try {
      await api(`admin/kb/${id}`, { method: 'POST', body: { data, reviewed: f.reviewed.checked, note: f.note.value } });
    } catch (err) { showErr(err.data?.message || err.message); return; }
    toast('บันทึกตารางแล้ว ✓ มีผลภายใน 1 นาที'); route();
  }));
  $('kbReset').addEventListener('click', run(async () => {
    if (!confirm('คืนค่าเริ่มต้นของระบบ? ตารางปัจจุบันจะเก็บไว้ในประวัติเวอร์ชัน ย้อนกลับได้')) return;
    await api(`admin/kb/${id}`, { method: 'POST', body: { reset: true } });
    toast('คืนค่าเริ่มต้นแล้ว'); route();
  }));
  view.querySelectorAll('[data-restore]').forEach((b) => b.addEventListener('click', run(async () => {
    if (!confirm('ย้อนกลับเป็นเวอร์ชันนี้? ตารางปัจจุบันจะเก็บไว้ในประวัติ')) return;
    await api(`admin/kb/${id}/restore`, { method: 'POST', body: { at: +b.dataset.restore } });
    toast('ย้อนกลับแล้ว ✓'); route();
  })));
}
const KB_TRY = {
  pairs: '<label>เบอร์โทร / ทะเบียน<input id="kbTry" placeholder="เช่น 0891456959 หรือ 1กข 9999"></label>',
  planets: '<label>ชื่อ นามสกุล<input id="kbTry" placeholder="เช่น ปิยะ ทองดี"></label><label>วันเกิด<input id="kbTryDate" type="date" value="1990-08-15"></label>',
  iching: '<label>คำถามทดลอง (คำถามเดิมได้ฉบับเดิม)<input id="kbTry" placeholder="เช่น ควรย้ายงานปีนี้ไหม"></label>',
  mahabote: '<label>วันเกิด<input id="kbTryDate" type="date" value="1990-08-15"></label>',
  mansions: '<label>ปีเกิด (ค.ศ. ตามปีจีน)<input id="kbTryYear" type="number" value="1990"></label><label>เพศ<select id="kbTrySex"><option>ชาย</option><option>หญิง</option></select></label>',
  palm: '<p class="muted small">ตำรานี้ไม่มีช่องทดลอง ลองอัปโหลดรูปฝ่ามือผ่านหน้าเว็บหลังบันทึก</p>',
};
KB_TRY.values = KB_TRY.planets;
KB_TRY.stars = KB_TRY.mansions;
const KB_HELP = {
  pairs: 'ใช้วิเคราะห์เบอร์โทร (7 หลักท้าย) ทะเบียนรถ และบ้านเลขที่ · ระดับดวงคิดจากสัดส่วนคู่ดีกับคู่ควรระวัง คู่สุดท้ายมีน้ำหนัก 1.5 เท่า · ความหมายจะส่งให้แม่หมอ AI ใช้อธิบาย (AI ไม่แต่งความหมายของคู่ที่ไม่มีในตาราง)',
  planets: 'ใช้ทำทักษาและดูอักษรกาลกิณีในชื่อ · อักษร 1 ตัวอยู่ได้ดาวเดียว · สีใช้เป็นสีประจำวันเกิดและสีกาลกิณีในผลคำนวณ',
  values: 'ใช้คิดผลรวมชื่อ-นามสกุล และค่าตัวอักษรบนป้ายทะเบียน · อักษร 1 ตัวมีได้ค่าเดียว · อักษรที่ไม่มีในตาราง = 0',
};

// ---------- ตั้งค่าระบบ ----------
async function viewSettings() {
  const [s, cat] = await Promise.all([api('admin/stats'), api('admin/catalog')]);
  view.innerHTML = `
    <div class="head"><h1>ตั้งค่าระบบ</h1></div>
    <div class="stack">
      <section class="card"><h3>สถานะการเชื่อมต่อ</h3>${configChips(s.config)}
        <div class="guide" style="margin-top:14px">
          <p>ตั้งค่าที่ Vercel → Project → Settings → Environment Variables แล้ว Redeploy (รายละเอียดใน <code>BACKEND.md</code>)</p>
          <p>• ฐานข้อมูล: <code>DATABASE_URL</code> (Postgres เช่น Neon / Supabase / Vercel Postgres)</p>
          <p>• เข้าสู่ระบบ: <code>SESSION_SECRET</code> · <code>ADMIN_PHONES</code> · SMS OTP: <code>TWILIO_ACCOUNT_SID</code> <code>TWILIO_AUTH_TOKEN</code> <code>TWILIO_VERIFY_SID</code></p>
          <p>• ชำระเงิน PromptPay: <code>OMISE_SECRET_KEY</code> และตั้ง Webhook ที่ Omise เป็น <code>${location.origin}/api/v1/webhooks/omise</code></p>
          <p>• รูปภาพ: <code>BLOB_READ_WRITE_TOKEN</code> · แจ้งเตือน: <code>VAPID_PUBLIC_KEY</code> <code>VAPID_PRIVATE_KEY</code> · งานประจำวัน: <code>CRON_SECRET</code></p>
          <p>• แม่หมอ AI: <code>ANTHROPIC_API_KEY</code> <code>MOHDOO_AI_CODE</code></p>
        </div>
      </section>
      <section class="card"><h3>บริการและราคา (อ่านจาก services-data.js · แก้ราคาที่ไฟล์แล้ว deploy)</h3>
        <div class="tscroll"><table class="table"><tr><th>บริการ</th><th>สถานะ</th><th class="num">ราคา</th></tr>
        ${cat.services.map((x) => `<tr><td>${x.icon} ${esc(x.name)}<span class="sub">${x.id}${x.group ? ` · ${x.group}` : ''}</span></td>
          <td>${x.app ? '<span class="chip">บนแอป</span>' : x.open ? '<span class="chip ok">เปิดจอง</span>' : '<span class="chip">เร็ว ๆ นี้</span>'}</td>
          <td class="num">${x.prices.map((t) => `${esc(t.label)}: ${t.price == null ? 'สอบถาม' : baht(t.price)}`).join('<br>')}</td></tr>`).join('')}
        ${cat.shop.map((x) => `<tr><td>${x.icon} ${esc(x.name)}<span class="sub">สินค้า · ${x.id}</span></td><td><span class="chip ok">ขาย</span></td><td class="num">${baht(x.price)}</td></tr>`).join('')}
        </table></div>
      </section>
    </div>`;
}

// ดูรูป/วิดีโอขนาดใหญ่
document.addEventListener('click', (e) => {
  const m = e.target.closest('[data-view]');
  if (!m) return;
  const d = $('viewer');
  const isV = m.tagName === 'VIDEO';
  d.querySelector('img').toggleAttribute('src', false);
  d.querySelector('video').toggleAttribute('src', false);
  if (isV) d.querySelector('video').src = m.src; else d.querySelector('img').src = m.src;
  d.showModal();
});
$('viewer').addEventListener('close', () => d0());
const d0 = () => { const v = $('viewer').querySelector('video'); v.pause(); };

boot();
