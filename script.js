// ===== หมอดู.com — หน้าแรก (เว็บเต็มจอ) =====
const $ = (id) => document.getElementById(id);

// ---------- วงแหวนไพ่รอบศีรษะหมอดู ----------
// การ์ดลาเวนเดอร์ขอบทอง เว้นช่องด้านหน้าไว้ให้เห็นใบหน้า (เหมือน reference)
const ringCards = [['☾', 40], ['✦', 75], ['☀', 110], ['♄', 145], ['👁', 180], ['♀', 215], ['✶', 250], ['♃', 285], ['☽', 320]];
ringCards.forEach(([sym, ang], i) => {
  const c = document.createElement('span');
  c.className = 'rcard';
  c.style.setProperty('--a', `${ang}deg`);
  c.style.setProperty('--d', `${-i * 0.4}s`);
  c.innerHTML = ringCardSVG(sym, i);
  $('ring').appendChild(c);
});
// หน้าไพ่แบบทาโรต์: พื้นม่วงเข้ม ขอบทองสองชั้น ลายตาข่าย ดวงอาทิตย์รัศมีทองตรงกลาง และพระจันทร์หัว-ท้าย
function ringCardSVG(sym, i) {
  const id = `rc${i}`;
  const rays = Array.from({ length: 16 }, (_, k) => {
    const a = (k * Math.PI) / 8, r1 = 10.5, r2 = k % 2 ? 13 : 15;
    return `M${(22 + r1 * Math.cos(a)).toFixed(2)} ${(33 + r1 * Math.sin(a)).toFixed(2)} L${(22 + r2 * Math.cos(a)).toFixed(2)} ${(33 + r2 * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
  return `<svg class="rface" viewBox="0 0 44 66" aria-hidden="true">
    <defs>
      <linearGradient id="${id}b" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#3b1a7a"/><stop offset=".55" stop-color="#1e0b4a"/><stop offset="1" stop-color="#2b0f5e"/></linearGradient>
      <linearGradient id="${id}g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff1c2"/><stop offset=".5" stop-color="#f5c96b"/><stop offset="1" stop-color="#b8862e"/></linearGradient>
      <pattern id="${id}p" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 3 H6" stroke="#7a52c0" stroke-width=".5" opacity=".55"/></pattern>
      <radialGradient id="${id}c"><stop offset="0" stop-color="#6a3cc0"/><stop offset="1" stop-color="#1e0b4a"/></radialGradient>
    </defs>
    <rect x="1" y="1" width="42" height="64" rx="4" fill="url(#${id}b)" stroke="url(#${id}g)" stroke-width="2"/>
    <rect x="4" y="4" width="36" height="58" rx="2.5" fill="url(#${id}p)" stroke="url(#${id}g)" stroke-width=".8"/>
    <path d="M4 9 Q9 9 9 4 M40 9 Q35 9 35 4 M4 57 Q9 57 9 62 M40 57 Q35 57 35 62" fill="none" stroke="url(#${id}g)" stroke-width=".8"/>
    <path d="M22 7.5 a4 4 0 1 0 0 8 a3.1 3.1 0 1 1 0 -8 Z" fill="url(#${id}g)" transform="rotate(-30 22 11.5)"/>
    <path d="M22 50.5 a4 4 0 1 0 0 8 a3.1 3.1 0 1 1 0 -8 Z" fill="url(#${id}g)" transform="rotate(150 22 54.5)"/>
    <path d="M8 20 l.9 1.9 1.9.9 -1.9.9 -.9 1.9 -.9-1.9 -1.9-.9 1.9-.9 Z M36 20 l.9 1.9 1.9.9 -1.9.9 -.9 1.9 -.9-1.9 -1.9-.9 1.9-.9 Z M8 42 l.9 1.9 1.9.9 -1.9.9 -.9 1.9 -.9-1.9 -1.9-.9 1.9-.9 Z M36 42 l.9 1.9 1.9.9 -1.9.9 -.9 1.9 -.9-1.9 -1.9-.9 1.9-.9 Z" fill="#ffe7a8"/>
    <path d="${rays}" stroke="url(#${id}g)" stroke-width="1.1" stroke-linecap="round"/>
    <circle cx="22" cy="33" r="9.5" fill="url(#${id}c)" stroke="url(#${id}g)" stroke-width="1.2"/>
    <circle cx="22" cy="33" r="7.4" fill="none" stroke="#f5c96b" stroke-width=".4" stroke-dasharray="1 1.2"/>
    <text x="22" y="36.3" text-anchor="middle" font-size="9" fill="#ffe7a8" font-family="serif">${sym}&#xFE0E;</text>
  </svg>`;
}

// ---------- วงเวทมนตร์ (ใช้บนไพ่ 3 ใบและบนผ้าปูโต๊ะ) ----------
function magicCircle(runes = '✦ ☾ ✧ ☉ ✦ ☽ ✧ ★ ✦ ☾ ✧ ☉ ✦ ☽ ✧ ★') {
  const id = `rp${Math.random().toString(36).slice(2, 8)}`;
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <defs><path id="${id}" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0"/></defs>
    <circle cx="50" cy="50" r="46" fill="none" stroke="#ffd0f0" stroke-width="1.2"/>
    <circle cx="50" cy="50" r="33" fill="none" stroke="#9fe6ff" stroke-width=".8" stroke-dasharray="2 3"/>
    <polygon points="50,18 68.8,75.9 19.6,40.1 80.4,40.1 31.2,75.9" fill="none" stroke="#ffd0f0" stroke-width="1"/>
    <circle cx="50" cy="50" r="9" fill="#fff" opacity=".85"/>
    <text font-size="6.5" fill="#ffe7a8"><textPath href="#${id}">${runes}</textPath></text>
  </svg>`;
}
document.querySelectorAll('.mc').forEach((el) => (el.innerHTML = magicCircle()));

// ไพ่บนโต๊ะ: ประกายก่อนเปลี่ยนหน้า
document.querySelectorAll('.tcard3').forEach((a) =>
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const r = a.querySelector('.card-face').getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 40, 160);
    const href = a.getAttribute('href');
    // ไพ่ทาโรต์ / เซียมซี → จ่ายก่อน (checkout.js ขอเข้าสู่ระบบเอง) · ศาสตร์ทั่วโลก → เปิดหน้าได้เลย
    setTimeout(() => (isAppPage(href) && !['services.html', 'world.html'].includes(pageOf(href)) ? startCheckout(itemFromHref(href)) : openFrame(href)), 380);
  })
);

// ---------- หมวดหมู่ → ประเภทย่อย → รายชื่อหมอดู ----------
// (หมวดหมู่ย้ายไปอยู่ในหน้า “ดูดวงตามประเภท” world.html?mode=method)

function openPanel(id) {
  const p = $(id);
  p.classList.add('open');
  p.setAttribute('aria-hidden', 'false');
  p.scrollTop = 0;
  setTimeout(() => p.querySelector('.back').focus({ preventScroll: true }), 350);
}
function closePanel(id) {
  const p = $(id);
  p.classList.remove('open');
  p.setAttribute('aria-hidden', 'true');
  if (id === 'catPanel' || id === 'framePanel') $('framePanel').style.zIndex = ''; // คืนลำดับชั้นหน้าบริการ
  // ปิดแผงสุดท้ายแล้ว → กลับมาไฮไลต์ “หน้าแรก”
  if (!document.querySelector('.panel.open') && typeof setActiveTab === 'function') setActiveTab('home');
}
document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => closePanel(b.dataset.back)));

function openCat(id) {
  const c = CATEGORIES.find((x) => x.id === id);
  $('catBody').innerHTML = `
    <div class="cat-hero"><span class="cat-ico big">${c.icon}</span><div><h3>${c.name}</h3><p>${c.desc}</p></div></div>
    <ul class="type-list">
      ${c.types.map((t, i) => `<li><button class="type-row" data-cat="${c.id}" data-type="${i}">
        <span class="type-ico">${t.icon}</span><span class="type-txt"><b>${t.name}</b><small>${t.desc}</small></span><span class="chev">›</span>
      </button></li>`).join('')}
    </ul>`;
  openPanel('catPanel');
}
function openType(catId, idx) {
  const c = CATEGORIES.find((x) => x.id === catId);
  const t = c.types[idx];
  $('typeBody').innerHTML = `
    <div class="cat-hero"><span class="cat-ico big">${t.icon}</span><div><p class="crumb">${c.name}</p><h3>${t.name}</h3><p>${t.desc}</p></div></div>
    <div class="buy-row"><div><small>ราคาเริ่มต้น</small><b>${(() => { const it = itemFromType(catId, idx); const p = it.tiers.filter((x) => x.price != null).map((x) => x.price); return p.length ? `${Math.min(...p).toLocaleString('th-TH')} ฿` : 'สอบถาม'; })()}</b></div>
      <button class="btn-gold" data-buy="${catId}|${idx}">ดูดวงประเภทนี้ ›</button></div>
    <div class="sec-head"><h3>รายชื่อหมอดู</h3><span class="filters"><span>ตัวกรอง</span><span>เรียงตาม</span></span></div>
    <div class="empty-seers">
      <span class="es-ico">🔮</span>
      <b>ยังไม่มีหมอดูในประเภทนี้</b>
      <p>เมื่อหมอดูเปิดรับงานในหมวด “${t.name}” รายชื่อ ราคา และเวลาคิวจะแสดงที่นี่</p>
      <button class="btn-ghost full" data-notify="${t.name}">แจ้งเตือนฉันเมื่อมีหมอดู</button>
    </div>`;
  $('typeBody').querySelector('[data-notify]').addEventListener('click', (e) =>
    toast(`เราจะแจ้งเตือนเมื่อมีหมอดู “${e.currentTarget.dataset.notify}” (ตัวอย่าง — ยังไม่เชื่อมระบบหลังบ้าน)`));
  openPanel('typePanel');
}
$('catBody').addEventListener('click', (e) => { const b = e.target.closest('[data-type]'); if (b) openType(b.dataset.cat, +b.dataset.type); });

// ---------- Bottom sheet: เข้าสู่ระบบ / สมัคร ----------
const screen = $('screen');
const sheet = $('sheet');
const tabs = document.querySelector('.tabs');
const copy = {
  login: ['ยินดีต้อนรับกลับ', 'เข้าสู่ระบบด้วยเบอร์โทรศัพท์'],
  register: ['เปิดดวงครั้งแรก', 'สมัครด้วยเบอร์โทรศัพท์ รับรหัส OTP ทาง SMS'],
};
// แผ่นสมัคร/เข้าสู่ระบบ: เบอร์โทร → OTP → (สมัครใหม่) ข้อมูลส่วนตัว
let authMode = 'login';
function showStep(step) {
  document.querySelectorAll('#sheet [data-step]').forEach((f) => (f.hidden = f.dataset.step !== step));
  const first = document.querySelector(`#sheet [data-step="${step}"] input`);
  if (first) setTimeout(() => first.focus({ preventScroll: true }), 50);
}
function setTab(name) {
  authMode = name;
  tabs.dataset.active = name;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  $('authTitle').textContent = copy[name][0];
  $('authSub').textContent = copy[name][1];
  $('phoneNotice').hidden = true;
  showStep('phone');
}
let lastFocus = null;
let afterAuth = null;
// เรียกก่อนเริ่มดูดวง: เข้าสู่ระบบแล้ว → ทำต่อทันที · ยังไม่เข้าสู่ระบบ → เปิดแผ่นสมัคร แล้วทำต่อให้หลังสำเร็จ
function requireLogin(action, why = 'สมัครหรือเข้าสู่ระบบด้วยเบอร์โทร เพื่อเริ่มดูดวง') {
  if (currentUser()) { action && action(); return true; }
  afterAuth = action || null;
  openSheet('register', why);
  return false;
}
function resumeAfterAuth() {
  const go = afterAuth;
  afterAuth = null;
  if (go && currentUser()) setTimeout(go, 350);
}
function openSheet(name, why) {
  setTab(name);
  if (why) $('authSub').textContent = why;
  lastFocus = document.activeElement;
  screen.classList.add('sheet-open');
  sheet.setAttribute('aria-hidden', 'false');
  $('app').inert = true;
  document.querySelector('.tabbar').inert = true;
  setTimeout(() => $('phoneForm').phone.focus({ preventScroll: true }), 450);
}
function closeSheet(keepPending) {
  if (!keepPending) afterAuth = null;
  screen.classList.remove('sheet-open');
  sheet.setAttribute('aria-hidden', 'true');
  $('app').inert = false;
  document.querySelector('.tabbar').inert = false;
  lastFocus?.focus?.({ preventScroll: true });
}
document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openSheet(b.dataset.open)));
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => setTab(t.dataset.tab)));
$('closeAuth').addEventListener('click', () => closeSheet());
$('sheetBackdrop').addEventListener('click', () => closeSheet());
addEventListener('keydown', (e) => { if (e.key === 'Escape' && screen.classList.contains('sheet-open')) closeSheet(); });

// ---------- สถานะผู้ใช้ (ตัวอย่าง: เก็บในเบราว์เซอร์ ยังไม่มีระบบหลังบ้าน) ----------
const USER_KEY = 'mohdooUser';        // ผู้ใช้ที่เข้าสู่ระบบอยู่
const ACCOUNTS_KEY = 'mohdooAccounts'; // บัญชีทั้งหมดในเบราว์เซอร์นี้ (key = เบอร์โทร) — ตัวอย่างแทนฐานข้อมูล
function currentUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch (_) { return null; }
}
function accounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || {}; } catch (_) { return {}; }
}
// บันทึกผู้ใช้ปัจจุบัน + เก็บลงบัญชีตามเบอร์ (ออกจากระบบแล้วประวัติ/คูปองไม่หาย)
function persistUser(u) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    if (u.phone) { const all = accounts(); all[u.phone] = u; localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(all)); }
    if (typeof srvSaveProfile === 'function') srvSaveProfile(u); // มีระบบหลังบ้าน → บันทึกขึ้นเซิร์ฟเวอร์ด้วย
    return true;
  } catch (_) { return false; } // พื้นที่เบราว์เซอร์เต็ม (มักเกิดจากรูป) → ให้ผู้เรียกจัดการ
}
function applyUser() {
  const u = currentUser();
  // ทุกคนเห็นหน้าแรกแบบเดียวกัน (app-ui) · สมัคร/เข้าสู่ระบบเมื่อเริ่มดูดวงเท่านั้น (requireLogin)
  document.body.classList.add('app-ui');
  document.body.classList.toggle('member', !!u);
  if (u) {
    if (typeof avatarInner === 'function') $('avatarBtn').innerHTML = avatarInner(u);
    else $('avatarBtn').textContent = displayName(u).charAt(0).toUpperCase() || '✦';
    $('hello').innerHTML = `<span class="hello-line"><span class="hello-hi">สวัสดี</span> <b class="hello-name" translate="no">${(window.LANG || 'th') === 'th' ? 'คุณ' : ''}${escapeHTML(displayName(u))}</b><i class="hello-spark">✦</i></span><small><i class="fl"></i>วันนี้อยากรู้เรื่องอะไร เลือกบริการหรือศาสตร์ด้านล่างได้เลย<i class="fl r"></i></small>`;
  } else {
    $('avatarBtn').textContent = '👤';
    $('hello').innerHTML = `<span class="hello-line"><span class="hello-hi">ยินดีต้อนรับสู่</span> <b class="hello-name">หมอดู.com</b><i class="hello-spark">✦</i></span><small><i class="fl"></i>เลือกดูดวงที่สนใจได้เลย สมัครด้วยเบอร์โทรตอนเริ่มดูดวง<i class="fl r"></i></small>`;
  }
  $('app').scrollTop = 0;
}
function escapeHTML(t) {
  return String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function closeAllPanels() {
  document.querySelectorAll('.panel.open').forEach((p) => closePanel(p.id));
}
// แถบเมนูล่าง: ไฮไลต์แท็บที่กำลังเปิด
function setActiveTab(id) {
  document.querySelectorAll('.tabbar [data-tab-id]').forEach((t) =>
    t.dataset.tabId === id ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current'));
}
// ไอคอนมุมขวาบน / แท็บบัญชี → หน้าโปรไฟล์ (profile.js)
function toggleAccount() {
  if (!currentUser()) { afterAuth = openProfile; return openSheet('login', 'เข้าสู่ระบบด้วยเบอร์โทร เพื่อดูบัญชีและประวัติดูดวง'); }
  openProfile();
}
function logout() {
  if (typeof srvLogout === 'function') srvLogout();
  try { localStorage.removeItem(USER_KEY); } catch (_) {}
  closeAllPanels();
  setActiveTab('home');
  applyUser();
  toast('ออกจากระบบแล้ว แล้วพบกันใหม่ ✦');
}
$('avatarBtn').addEventListener('click', toggleAccount);
$('tabAccount').addEventListener('click', toggleAccount);
applyUser();

const DEMO_OTP = '123456'; // ระบบทดสอบ — เปลี่ยนเป็นการส่ง/ตรวจ OTP จากระบบหลังบ้านเมื่อพร้อม
let pendingPhone = '';
let resendTimer = null;
// ---------- เบอร์โทร: เลือกประเทศ + เบอร์ไม่ต้องมี 0 นำหน้า → เก็บเป็น +รหัสประเทศ (เช่น +66812345678) ----------
const PHONE_COUNTRIES = [
  ['66', '🇹🇭', 'ไทย'], ['856', '🇱🇦', 'ลาว'], ['95', '🇲🇲', 'เมียนมา'], ['855', '🇰🇭', 'กัมพูชา'], ['84', '🇻🇳', 'เวียดนาม'],
  ['60', '🇲🇾', 'มาเลเซีย'], ['65', '🇸🇬', 'สิงคโปร์'], ['62', '🇮🇩', 'อินโดนีเซีย'], ['63', '🇵🇭', 'ฟิลิปปินส์'],
  ['86', '🇨🇳', 'จีน'], ['852', '🇭🇰', 'ฮ่องกง'], ['886', '🇹🇼', 'ไต้หวัน'], ['81', '🇯🇵', 'ญี่ปุ่น'], ['82', '🇰🇷', 'เกาหลีใต้'],
  ['91', '🇮🇳', 'อินเดีย'], ['61', '🇦🇺', 'ออสเตรเลีย'], ['44', '🇬🇧', 'สหราชอาณาจักร'], ['1', '🇺🇸', 'สหรัฐฯ / แคนาดา'],
];
$('phoneCc').innerHTML = PHONE_COUNTRIES.map(([cc, flag, name]) => `<option value="${cc}" title="${name}">${flag} +${cc}</option>`).join('');
const nationalDigits = (v) => String(v).replace(/\D/g, '').replace(/^0+/, '');
const cleanPhone = (v, cc = $('phoneCc').value) => `+${cc}${nationalDigits(v)}`;
const ccOf = (p) => PHONE_COUNTRIES.map(([cc]) => cc).sort((a, b) => b.length - a.length).find((cc) => String(p).startsWith(`+${cc}`));
// เบอร์แบบในประเทศ (ไทย: 0812345678) ใช้แสดงผล เติมฟอร์ม และคำนวณเลขศาสตร์ · รองรับบัญชีเก่าที่เก็บเป็น 08…
function localPhone(p) {
  p = String(p || '');
  if (p.startsWith('+66')) return `0${p.slice(3)}`;
  return p;
}
function prettyPhone(p) {
  p = String(p || '');
  const cc = ccOf(p);
  if (!cc) return p.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  const n = p.slice(cc.length + 1);
  if (cc === '66') return `+66 ${n.replace(/(\d{2})(\d{3})(\d+)/, '$1 $2 $3')}`;
  return `+${cc} ${n.replace(/(\d{3})(?=\d{4})/, '$1 ')}`;
}
// บัญชีเก่า (ก่อนมีรหัสประเทศ) เก็บด้วยคีย์ 08xxxxxxxx
const legacyKey = (full) => (full.startsWith('+66') ? `0${full.slice(3)}` : null);
function findAccount(full) {
  const all = accounts();
  return all[full] || (legacyKey(full) && all[legacyKey(full)]) || null;
}
$('phoneForm').phone.addEventListener('input', (e) => {
  // พิมพ์ 0 นำหน้ามา → ตัดออกให้อัตโนมัติ
  const v = e.target.value.replace(/[^\d\s-]/g, '').replace(/^0+/, '');
  if (v !== e.target.value) e.target.value = v;
});

$('phoneForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (e.target.dataset.busy) return;
  pendingPhone = cleanPhone(e.target.phone.value);
  const nat = nationalDigits(e.target.phone.value);
  const okLen = $('phoneCc').value === '66' ? nat.length === 9 : nat.length >= 6 && nat.length <= 13;
  if (!okLen) { toast($('phoneCc').value === '66' ? 'กรุณากรอกเบอร์มือถือ 9 หลัก (ไม่ต้องใส่ 0 ข้างหน้า)' : 'กรุณากรอกเบอร์มือถือให้ถูกต้อง'); return; }
  // มีระบบหลังบ้าน → ส่ง OTP จริงผ่านเซิร์ฟเวอร์ (เซิร์ฟเวอร์บอกว่าเบอร์นี้มีบัญชีแล้วหรือยัง)
  let hasAccount = !!findAccount(pendingPhone);
  let demoOtp = true;
  if (typeof serverReady !== 'undefined') await serverReady; // ไม่มี server-sync.js → โหมดทดลองต่อได้
  if (window.SERVER) {
    e.target.dataset.busy = '1';
    try {
      const r = await srvSendOtp(pendingPhone, authMode);
      hasAccount = r.exists && !r.sent;
      demoOtp = !!r.demo;
    } catch (err) { toast(err.message); return; } finally { delete e.target.dataset.busy; }
  }
  // สมัครด้วยเบอร์ที่มีบัญชีแล้ว → ไม่ให้สมัครซ้ำ เปลี่ยนเป็นเข้าสู่ระบบ
  if (authMode === 'register' && hasAccount) {
    const phone = e.target.phone.value;
    const cc = $('phoneCc').value;
    setTab('login');
    e.target.phone.value = phone;
    $('phoneCc').value = cc;
    $('phoneNotice').innerHTML = `เบอร์ <b>${prettyPhone(pendingPhone)}</b> มีบัญชีอยู่แล้ว<br>กรุณาเข้าสู่ระบบ กด “ขอรหัส OTP” เพื่อเข้าสู่ระบบได้เลย`;
    $('phoneNotice').hidden = false;
    return;
  }
  $('phoneNotice').hidden = true;
  $('otpPhone').textContent = prettyPhone(pendingPhone);
  $('otpError').hidden = true;
  $('otpForm').reset();
  startResend();
  showStep('otp');
  toast(`ส่งรหัส OTP ไปที่ ${prettyPhone(pendingPhone)} แล้ว${demoOtp ? ` (ทดสอบ: ${DEMO_OTP})` : ''}`);
});
function startResend() {
  let left = 60;
  const btn = $('otpResend');
  btn.disabled = true;
  btn.innerHTML = 'ขอรหัสใหม่ได้ใน <span id="otpWait">60</span> วินาที';
  clearInterval(resendTimer);
  resendTimer = setInterval(() => {
    left -= 1;
    if (left > 0) { $('otpWait').textContent = left; return; }
    clearInterval(resendTimer);
    btn.disabled = false;
    btn.textContent = 'ขอรหัส OTP ใหม่';
  }, 1000);
}
$('otpResend').addEventListener('click', async () => {
  if (window.SERVER) {
    try { const r = await srvSendOtp(pendingPhone, 'login'); startResend(); toast(`ส่งรหัสใหม่แล้ว${r.demo ? ` (ทดสอบ: ${DEMO_OTP})` : ''}`); } catch (err) { toast(err.message); }
    return;
  }
  startResend();
  toast(`ส่งรหัสใหม่แล้ว (ทดสอบ: ${DEMO_OTP})`);
});
$('otpChange').addEventListener('click', () => { clearInterval(resendTimer); showStep('phone'); });
$('otpForm').otp.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); $('otpError').hidden = true; });

$('otpForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (window.SERVER) {
    // ตรวจรหัสที่เซิร์ฟเวอร์ → ได้เซสชัน + โปรไฟล์ (ถ้ามีบัญชีแล้ว)
    if (e.target.dataset.busy) return;
    e.target.dataset.busy = '1';
    let r;
    try { r = await srvVerify(pendingPhone, e.target.otp.value); } catch (err) {
      $('otpError').textContent = err.message; $('otpError').hidden = false; e.target.otp.select(); return;
    } finally { delete e.target.dataset.busy; }
    clearInterval(resendTimer);
    const local = findAccount(pendingPhone);
    if (!r.isNew) { finishAuth(srvUserFrom(r.user), false); return; }
    // บัญชีจากช่วงทดลองในเครื่องนี้ → ย้ายขึ้นเซิร์ฟเวอร์ (ประวัติ/คูปองไม่หาย)
    if (local && local.birthdate) { finishAuth({ ...local, phone: pendingPhone, role: r.user.role, seerId: r.user.seer_id || null }, false); return; }
    // ทีมงานลงชื่อหมอดูไว้แล้ว → เติมชื่อให้ในหน้ากรอกข้อมูล
    if (r.user.name && !$('infoForm').first.value) $('infoForm').first.value = r.user.name;
  } else {
    if (e.target.otp.value !== DEMO_OTP) { $('otpError').hidden = false; e.target.otp.select(); return; }
    clearInterval(resendTimer);
  }
  const existing = !window.SERVER && findAccount(pendingPhone);
  if (existing) {
    // บัญชีเก่าที่เก็บเป็น 08… → ย้ายไปเก็บแบบมีรหัสประเทศ
    if (existing.phone !== pendingPhone) {
      const all = accounts();
      delete all[existing.phone];
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(all));
      existing.phone = pendingPhone;
    }
    // มีบัญชีอยู่แล้ว → เข้าสู่ระบบ (หน้ากรอกเบอร์เปลี่ยนเป็นแท็บเข้าสู่ระบบให้แล้ว)
    finishAuth(existing, false);
  } else {
    if (authMode === 'login') toast('ยังไม่มีบัญชีสำหรับเบอร์นี้ กรอกข้อมูลเพื่อสมัครได้เลย');
    authMode = 'register';
    tabs.dataset.active = 'register';
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === 'register'));
    $('authTitle').textContent = 'อีกนิดเดียว';
    $('authSub').textContent = 'กรอกข้อมูลเพื่อใช้ทำนายดวงของคุณ';
    showStep('info');
  }
});

$('infoForm').addEventListener('submit', (e) => {
  e.preventDefault();
  // มีระบบหลังบ้าน: ต้องยืนยัน OTP ของเบอร์นี้ก่อนจึงสร้างบัญชีได้
  if (window.SERVER && typeof srvSession !== 'undefined' && srvSession !== pendingPhone) { toast('กรุณายืนยันรหัส OTP ก่อนนะคะ'); showStep('phone'); return; }
  const d = new FormData(e.target);
  const first = String(d.get('first')).trim();
  finishAuth({
    phone: pendingPhone, name: first, first, last: String(d.get('last')).trim(),
    firstEn: String(d.get('firstEn') || '').trim(), lastEn: String(d.get('lastEn') || '').trim(),
    birthdate: String(d.get('birthdate')), birthtime: String(d.get('birthtime') || ''),
    created: Date.now(), coupons: [], history: [], wheelSpun: false,
    ...(window.SERVER && typeof srvLast !== 'undefined' && srvLast ? { role: srvLast.role, seerId: srvLast.seer_id || null } : {}),
  }, true);
  e.target.reset();
});

function finishAuth(user, isNew) {
  persistUser(user);
  if (typeof srvAfterAuth === 'function') srvAfterAuth(); // สิทธิ์ (หมอดู) · สมาชิก AI · งานและแจ้งเตือนจากเซิร์ฟเวอร์
  closeSheet(true);
  applyUser();
  $('phoneForm').reset();
  $('phoneCc').value = (user.phone && ccOf(user.phone)) || '66';
  // ยังไม่เคยหมุนวงล้อของขวัญต้อนรับ (สมัครใหม่ หรือบัญชีเดิมที่ยังไม่ได้หมุน) → เปิดวงล้อก่อน แล้วค่อยทำสิ่งที่กดไว้ต่อ
  // บัญชีเดิมที่กด “ไว้ทีหลัง” จะไม่ถูกถามซ้ำภายใน 3 วัน (ยังหมุนได้จากหน้าบัญชี)
  const later = user.giftLaterAt && Date.now() - user.giftLaterAt < 3 * 864e5;
  if (!user.wheelSpun && user.role !== 'seer' && (isNew || !later) && typeof startWelcomeGift === 'function') setTimeout(startWelcomeGift, 900);
  else resumeAfterAuth();
  toast(user.role === 'seer' ? `ยินดีต้อนรับ ${user.name} ✦ บัญชีนี้เป็นบัญชีหมอดู ตอบคำถามลูกค้าได้ที่แท็บ “บัญชี”` : isNew ? 'สมัครสำเร็จ! ยินดีต้อนรับสู่หมอดู.com ✦' : `ยินดีต้อนรับกลับ คุณ${user.name} ✦`);
  const r = screen.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, 60, 260);
}
document.querySelectorAll('.social').forEach((s) =>
  s.addEventListener('click', () => toast('การเข้าสู่ระบบผ่านโซเชียลจะเปิดให้ใช้เร็ว ๆ นี้'))
);

// ---------- อินโทร: วงเวทหมุน → เข้าสู่ระบบ/สมัคร ----------
const intro = $('intro');
const hashAuth = ['register', 'login'].includes(location.hash.slice(1));

// วงเวทขนาดใหญ่หลังประตู
function sigilSVG(rings, star, text) {
  const id = `sg${Math.random().toString(36).slice(2, 7)}`;
  const n = star;
  const pts = Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 ? 22 : 46;
    const t = (Math.PI * i) / n - Math.PI / 2;
    return `${50 + Math.cos(t) * r},${50 + Math.sin(t) * r}`;
  }).join(' ');
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const t = (i / 72) * Math.PI * 2;
    const r2 = i % 6 ? 47.5 : 45.5;
    return `<line x1="${50 + Math.cos(t) * 49}" y1="${50 + Math.sin(t) * 49}" x2="${50 + Math.cos(t) * r2}" y2="${50 + Math.sin(t) * r2}" class="sg-line"/>`;
  }).join('');
  return `<svg viewBox="0 0 100 100">
    <defs><path id="${id}" d="M50,50 m-41,0 a41,41 0 1,1 82,0 a41,41 0 1,1 -82,0"/></defs>
    <circle cx="50" cy="50" r="49.5" class="sg-glow"/>
    ${ticks}
    ${rings.map((r, i) => `<circle cx="50" cy="50" r="${r}" class="${i % 2 ? 'sg-dash' : 'sg-line'}"/>`).join('')}
    <polygon points="${pts}" class="sg-line"/>
    <text class="sg-text"><textPath href="#${id}">${text}</textPath></text>
  </svg>`;
}
if ($('sigilBig')) $('sigilBig').innerHTML = sigilSVG([44, 38, 30], 8, 'ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ✦ ☉ ☽ ♂ ☿ ♃ ♀ ♄ ✦ ᚷ ᚹ ᚺ ᚾ ᛁ ᛃ ✦ ☉ ☽ ♂ ☿ ♃ ♀ ♄ ✦');
if ($('sigilMid')) $('sigilMid').innerHTML = sigilSVG([40, 34], 6, '✧ ☾ ✧ ☀ ✧ ☾ ✧ ☀ ✧ ☾ ✧ ☀ ✧ ☾ ✧ ☀ ✧ ☾ ✧ ☀ ✧');

// ไพ่โคจรรอบประตู
['☾', '✦', '☀', '♃', '✧', '☿', '♀', '✶'].forEach((sym, i, arr) => {
  const c = document.createElement('span');
  c.className = 'g-card';
  c.style.setProperty('--a', `${(360 / arr.length) * i}deg`);
  c.style.setProperty('--y', `${Math.sin(i * 1.7) * 22}px`);
  c.style.setProperty('--d', `${1.1 + i * 0.12}s`);
  c.textContent = sym;
  if ($('cardOrbit')) $('cardOrbit').appendChild(c);
});

// กระแสอนุภาคหมุนวนเข้าหาประตู
const vc = $('vortex');
const vx = vc.getContext('2d');
let parts = [], vW, vH, vDPR, vRun = true, vSpeed = 1;
function vResize() {
  vDPR = Math.min(devicePixelRatio || 1, 2);
  vW = vc.width = innerWidth * vDPR;
  vH = vc.height = innerHeight * vDPR;
}
vResize();
addEventListener('resize', vResize);
const hues = [280, 300, 320, 45, 200];
function spawn() {
  const maxR = Math.hypot(vW, vH) / 2;
  return { a: Math.random() * Math.PI * 2, r: maxR * (0.4 + Math.random() * 0.6), s: 0.002 + Math.random() * 0.004,
    size: (Math.random() * 1.8 + 0.4) * vDPR, h: hues[(Math.random() * hues.length) | 0] };
}
for (let i = 0; i < 260; i++) parts.push(spawn());
function vDraw() {
  if (!vRun) return;
  vx.fillStyle = 'rgba(7, 3, 26, 0.22)';
  vx.fillRect(0, 0, vW, vH);
  const cx = vW / 2, cy = vH * 0.52;
  for (const p of parts) {
    p.a += p.s * vSpeed * (1 + 120 / (p.r / vDPR + 30));
    p.r -= (0.25 + p.r * 0.0025) * vSpeed;
    if (p.r < 8 * vDPR || p.r > Math.hypot(vW, vH)) Object.assign(p, spawn());
    const x = cx + Math.cos(p.a) * p.r;
    const y = cy + Math.sin(p.a) * p.r * 0.62;
    vx.beginPath();
    vx.fillStyle = `hsla(${p.h}, 95%, ${p.h === 45 ? 75 : 80}%, ${Math.min(1, p.r / (200 * vDPR))})`;
    vx.arc(x, y, p.size, 0, Math.PI * 2);
    vx.fill();
  }
  requestAnimationFrame(vDraw);
}
vDraw();

function revealSite() {
  intro.classList.add('done');
  document.body.classList.add('ready');
  burst(innerWidth / 2, innerHeight / 2, 70, 360);
  // เข้าเว็บแล้ว: ยังไม่ล็อกอิน → เปิดหน้าสมัคร/เข้าสู่ระบบทันที
  if (hashAuth) setTimeout(() => openSheet(location.hash.slice(1)), 600);

  setTimeout(() => { vRun = false; intro.classList.add('gone'); }, 1000);
}

let opened = false;
function openGate() {
  if (opened) return;
  opened = true;
  try { sessionStorage.setItem('gateOpened', '1'); } catch (_) {}
  intro.classList.add('opening');
  vSpeed = -3; // อนุภาคพุ่งออกจากประตู
  const door = document.querySelector('.doorway').getBoundingClientRect();
  burst(door.left + door.width / 2, door.top + door.height / 2, 60, 260);
  // ซูมเข้าไปในประตู: ตั้งจุดศูนย์กลางการซูมให้ตรงกับประตู
  const stage = $('gateStage');
  const sr = stage.getBoundingClientRect();
  stage.style.transformOrigin = `${door.left + door.width / 2 - sr.left}px ${door.top + door.height * 0.55 - sr.top}px`;
  setTimeout(() => intro.classList.add('zooming'), 700);
  setTimeout(revealSite, 1700);
}
function skipGate() {
  if (opened) return;
  opened = true;
  try { sessionStorage.setItem('gateOpened', '1'); } catch (_) {}
  revealSite();
}
document.querySelector('.door').addEventListener('click', openGate);
$('skipIntro').addEventListener('click', skipGate);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !opened) skipGate(); });

// เปิดประตูไปแล้วในรอบนี้ หรือมาจากลิงก์สมัคร/เข้าสู่ระบบ → ไม่ต้องรออินโทร
let seen = false;
try { seen = sessionStorage.getItem('gateOpened') === '1'; } catch (_) {}
if (seen || hashAuth) {
  opened = true;
  intro.classList.add('gone');
  vRun = false;
  document.body.classList.add('ready');
  if (hashAuth) setTimeout(() => openSheet(location.hash.slice(1)), 500);
} else {
  // วงเวทหมุนสักครู่ แล้วเข้าเว็บเอง (ผู้ใช้ไม่ต้องกด)
  setTimeout(openGate, 2800);
}


// ---------- เปิดหน้าบริการภายในโทรศัพท์ ----------
const APP_PAGES = { 'tarot.html': 'ไพ่ทาโรต์', 'siamsi.html': 'เสี่ยงเซียมซี', 'services.html': 'บริการ', 'world.html': 'ศาสตร์ดูดวงทั่วโลก' };
const pageOf = (href) => (href || '').split(/[?#]/)[0].split('/').pop();
const isAppPage = (href) => pageOf(href) in APP_PAGES;
const frame = $('appFrame');

function openFrame(href) {
  if (!isAppPage(href)) return;
  $('frameTitle').textContent = APP_PAGES[pageOf(href)];
  frame.src = href;
  openPanel('framePanel');
}
function closeFrame() {
  closePanel('framePanel');
  setTimeout(() => { if (!$('framePanel').classList.contains('open')) frame.src = 'about:blank'; }, 450);
}
// ชื่อบนแถบ = ชื่อหน้าที่กำลังแสดง (หน้าย่อยกดลิงก์ไปหน้าอื่นได้ภายในโทรศัพท์)
frame.addEventListener('load', () => {
  try {
    const t = frame.contentDocument.title.split(' — ')[0];
    if (t && frame.src !== 'about:blank') $('frameTitle').textContent = t;
  } catch (_) {}
  // แถบหัว (‹ กลับ + ชื่อหน้า) เลื่อนหายไปพร้อมเนื้อหาในหน้าย่อย ไม่ค้างด้านบน
  const bar = $('framePanel').querySelector('.panel-bar');
  bar.style.marginTop = '0px';
  try {
    const w = frame.contentWindow;
    const onScroll = () => {
      const y = w.scrollY || w.document.scrollingElement?.scrollTop || 0;
      bar.style.marginTop = `${-Math.min(y, bar.offsetHeight)}px`;
    };
    w.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  } catch (_) {}
});
$('frameBack').addEventListener('click', closeFrame);
// หน้า “ดูดวงตามประเภท” ขอเปิดหมวดหมู่หมอดู → ซ้อนแผงหมวดหมู่ไว้บนหน้านั้น กดกลับแล้วกลับมาหน้าเดิม
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data || e.data.type !== 'mohdoo-cat') return;
  if (!CATEGORIES.some((c) => c.id === e.data.id)) return;
  $('framePanel').style.zIndex = '16';
  openCat(e.data.id);
});
// หน้าย่อยขอกลับหน้าแรก / เปิดสมัคร / เข้าสู่ระบบ
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data || e.data.type !== 'mohdoo-nav') return;
  closeFrame();
  closePanel('typePanel'); closePanel('catPanel');
  const h = (e.data.href.split('#')[1] || '');
  if (h === 'register' || h === 'login') setTimeout(() => openSheet(h), 300);
});

// ทุกลิงก์ในโทรศัพท์ที่ไปหน้าบริการ → เปิดในโทรศัพท์
$('screen').addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a || a.classList.contains('tcard3')) return;
  const href = a.getAttribute('href');
  if (a.dataset.svc) { e.preventDefault(); startCheckout(itemFromService(a.dataset.svc)); return; }
  if (isAppPage(href)) {
    e.preventDefault();
    if (a.closest('.tabbar')) { closeAllPanels(); setActiveTab(a.dataset.tabId || 'services'); }
    openFrame(href);
    return;
  }
  if (pageOf(href) === 'index.html' && a.closest('.tabbar')) {
    e.preventDefault();
    closeAllPanels(); setActiveTab('home');
    setTimeout(() => (frame.src = 'about:blank'), 450);
    $('app').scrollTo({ top: 0, behavior: 'smooth' });
  }
});

// มาจากหน้าย่อยที่ถูกเปิดตรง ๆ บนจอใหญ่ เช่น index.html?app=tarot.html → เปิดในโทรศัพท์
const appParam = new URLSearchParams(location.search).get('app');
if (appParam && isAppPage(appParam)) {
  try { sessionStorage.setItem('gateOpened', '1'); } catch (_) {}
  if (!opened) skipGate();
  openFrame(appParam);
}

// ---------- หน้าแรกพอดี 1 หน้าจอ (ไม่ต้องเลื่อน) ----------
// วัดความสูงของส่วนอื่น แล้วย่อ/ขยายฉากแม่หมอให้พอดีพื้นที่ที่เหลือ
function fitHome() {
  const app = $('app');
  const scene = document.querySelector('.seer-scene');
  const bar = document.querySelector('.tabbar');
  if (!app || !scene) return;
  const member = document.body.classList.contains('app-ui');
  app.style.paddingBottom = `${member && bar ? bar.offsetHeight + 12 : 24}px`;
  scene.style.setProperty('--sz', 1);
  const h1 = scene.getBoundingClientRect().height;
  const others = app.scrollHeight - h1;
  // มือถือจอสูง (เช่น iPhone Pro Max) ขยายฉากได้เล็กน้อยตามความกว้างจอ ไม่ให้เหลือที่ว่างด้านล่าง
  const maxZ = innerWidth < 700 ? Math.min(1.2, innerWidth / 350) : 1;
  const z = Math.min(maxZ, (app.clientHeight - others) / h1);
  if (z >= 0.38) {
    scene.style.setProperty('--sz', z.toFixed(3));
    app.classList.add('fit');
  } else {                                   // จอเตี้ยมาก → ใช้ขนาดเล็กสุดแล้วให้เลื่อนได้
    scene.style.setProperty('--sz', 0.38);
    app.classList.remove('fit');
  }
  app.scrollTop = 0;
}
addEventListener('resize', fitHome);
addEventListener('load', fitHome);
if (document.fonts) document.fonts.ready.then(fitHome);
const _applyUserFit = applyUser;
applyUser = function () { _applyUserFit(); requestAnimationFrame(fitHome); };
fitHome();

// ---------- เลือกภาษา (i18n.js) ----------
const LANG_FLAG = { th: '🇹🇭', en: '🇬🇧', zh: '🇨🇳' };
const LANG_NAME = { th: 'ไทย', en: 'English', zh: '中文' };
const LANG_CODE = { th: 'TH', en: 'EN', zh: '中文' };
// หน้าแรก: ปุ่มภาษาแบบ dropdown (ธง + ชื่อภาษา)
(() => {
  const cur = window.LANG || 'th';
  const box = $('langSwitch');
  box.innerHTML = `<button type="button" class="lang-cur" aria-haspopup="listbox" aria-expanded="false" aria-label="Language">
      <span class="lf">${LANG_FLAG[cur]}</span><b>${LANG_CODE[cur]}</b><i class="lang-caret" aria-hidden="true"></i></button>
    <ul class="lang-menu" role="listbox" hidden>${Object.keys(LANG_NAME).map((l) =>
      `<li><button type="button" role="option" data-lang="${l}" aria-selected="${cur === l}" lang="${l}"><span class="lf">${LANG_FLAG[l]}</span>${LANG_NAME[l]}${cur === l ? '<em>✓</em>' : ''}</button></li>`).join('')}</ul>`;
  const btn = box.querySelector('.lang-cur');
  const menu = box.querySelector('.lang-menu');
  const toggle = (open) => { menu.hidden = !open; btn.setAttribute('aria-expanded', String(open)); box.classList.toggle('open', open); };
  btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(menu.hidden); });
  document.addEventListener('click', (e) => { if (!box.contains(e.target)) toggle(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
})();
document.addEventListener('click', (e) => { const b = e.target.closest('[data-lang]'); if (b && window.setLang) setLang(b.dataset.lang); });
