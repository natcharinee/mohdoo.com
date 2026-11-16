// ===== หมอดู.com — หน้าแรก (phone mockup) =====
const $ = (id) => document.getElementById(id);

// ---------- ปรับขนาดโทรศัพท์ให้พอดีจอ ----------
function fitPhone() {
  const s = Math.min(1, (innerHeight - 40) / 872, (innerWidth - 32) / 418);
  document.documentElement.style.setProperty('--s', Math.max(0.5, s).toFixed(3));
}
addEventListener('resize', fitPhone);
fitPhone();

// ---------- วงแหวนไพ่รอบศีรษะหมอดู ----------
// การ์ดลาเวนเดอร์ขอบทอง เว้นช่องด้านหน้าไว้ให้เห็นใบหน้า (เหมือน reference)
const ringCards = [['☾', 40], ['✦', 75], ['☀', 110], ['♄', 145], ['👁', 180], ['♀', 215], ['✶', 250], ['♃', 285], ['☽', 320]];
ringCards.forEach(([sym, ang], i) => {
  const c = document.createElement('span');
  c.className = 'rcard';
  c.style.setProperty('--a', `${ang}deg`);
  c.style.setProperty('--d', `${-i * 0.4}s`);
  c.innerHTML = `<i>${sym}</i>`;
  $('ring').appendChild(c);
});

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
    // ยังไม่เข้าสู่ระบบ → ชวนสมัครก่อน
    if (!currentUser()) { setTimeout(() => openSheet('register'), 300); return; }
    setTimeout(() => openFrame(a.getAttribute('href')), 380);
  })
);

// ---------- บริการแนะนำ + ศาสตร์ (จาก services-data.js) ----------
$('popular').innerHTML = SERVICES.filter((s) => s.open).map((s) => {
  const priced = s.prices.filter((p) => p.price != null).map((p) => p.price);
  const href = s.link || 'services.html';
  // ยังไม่มีราคา → ไม่แสดงบรรทัดราคา (แค่ไอคอน + ชื่อบริการ)
  const price = priced.length ? `<span class="pp">เริ่ม <b>${Math.min(...priced).toLocaleString('th-TH')} ฿</b></span>` : '';
  return `<a class="pop" href="${href}"><span class="pi">${s.icon}</span><span class="pn">${s.name}</span>${price}</a>`;
}).join('');

// ---------- หมวดหมู่ → ประเภทย่อย → รายชื่อหมอดู ----------
$('catGrid').innerHTML = CATEGORIES.map((c) =>
  `<button class="cat" data-cat="${c.id}"><span class="cat-ico">${c.icon}</span><b>${c.name}</b><small>${c.desc}</small><em>${c.types.length} ประเภท ›</em></button>`
).join('');

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
    ${t.action ? `<a class="btn-gold full" href="${t.action.href}">${t.action.label}</a>` : ''}
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
$('catGrid').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) openCat(b.dataset.cat); });
$('catBody').addEventListener('click', (e) => { const b = e.target.closest('[data-type]'); if (b) openType(b.dataset.cat, +b.dataset.type); });

// ---------- Bottom sheet: เข้าสู่ระบบ / สมัคร ----------
const screen = $('screen');
const sheet = $('sheet');
const tabs = document.querySelector('.tabs');
const copy = {
  login: ['ยินดีต้อนรับกลับ', 'ดวงดาวรอคุณอยู่'],
  register: ['เปิดดวงครั้งแรก', 'ใส่วันเกิดเพื่อให้คำทำนายแม่นยำขึ้น'],
};
function setTab(name) {
  tabs.dataset.active = name;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== name));
  $('authTitle').textContent = copy[name][0];
  $('authSub').textContent = copy[name][1];
}
let lastFocus = null;
function openSheet(name) {
  setTab(name);
  lastFocus = document.activeElement;
  screen.classList.add('sheet-open');
  sheet.setAttribute('aria-hidden', 'false');
  $('app').inert = true;
  document.querySelector('.tabbar').inert = true;
  setTimeout(() => sheet.querySelector(`[data-panel="${name}"] input`)?.focus({ preventScroll: true }), 450);
}
function closeSheet() {
  screen.classList.remove('sheet-open');
  sheet.setAttribute('aria-hidden', 'true');
  $('app').inert = false;
  document.querySelector('.tabbar').inert = false;
  lastFocus?.focus?.({ preventScroll: true });
}
document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openSheet(b.dataset.open)));
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => setTab(t.dataset.tab)));
$('closeAuth').addEventListener('click', closeSheet);
$('sheetBackdrop').addEventListener('click', closeSheet);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && screen.classList.contains('sheet-open')) closeSheet(); });

// ---------- สถานะผู้ใช้ (ตัวอย่าง: เก็บในเบราว์เซอร์ ยังไม่มีระบบหลังบ้าน) ----------
const USER_KEY = 'mohdooUser';
function currentUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch (_) { return null; }
}
function applyUser() {
  const u = currentUser();
  document.body.classList.toggle('logged-in', !!u);
  $('accountPop').hidden = true;
  $('avatarBtn').setAttribute('aria-expanded', 'false');
  if (u) {
    $('avatarBtn').textContent = u.name.trim().charAt(0).toUpperCase() || '✦';
    $('apName').textContent = u.name;
    $('hello').innerHTML = `สวัสดี คุณ${escapeHTML(u.name)} ✦<small>วันนี้อยากรู้เรื่องอะไร เลือกบริการหรือศาสตร์ด้านล่างได้เลย</small>`;
  } else {
    $('avatarBtn').textContent = '👤';
  }
  $('app').scrollTop = 0;
}
function escapeHTML(t) {
  return t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function toggleAccount() {
  if (!currentUser()) return openSheet('login');
  const pop = $('accountPop');
  pop.hidden = !pop.hidden;
  $('avatarBtn').setAttribute('aria-expanded', String(!pop.hidden));
}
$('avatarBtn').addEventListener('click', toggleAccount);
$('tabAccount').addEventListener('click', () => { $('app').scrollTop = 0; toggleAccount(); });
$('logoutBtn').addEventListener('click', () => {
  try { localStorage.removeItem(USER_KEY); } catch (_) {}
  closePanel('typePanel'); closePanel('catPanel');
  applyUser();
  toast('ออกจากระบบแล้ว แล้วพบกันใหม่ ✦');
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('#accountPop, #avatarBtn, #tabAccount')) $('accountPop').hidden = true;
});
applyUser();

document.querySelectorAll('.form').forEach((f) =>
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const isLogin = f.id === 'loginForm';
    const data = new FormData(f);
    const prev = currentUser() || {};
    const user = isLogin
      ? { ...prev, name: prev.name || String(data.get('email')).split('@')[0] }
      : {
          name: String(data.get('first')).trim(),
          first: String(data.get('first')).trim(),
          last: String(data.get('last')).trim(),
          birthdate: String(data.get('birthdate')),
          birthtime: String(data.get('birthtime') || ''),
          coupons: [],
          wheelSpun: false,
        };
    try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch (_) {}
    closeSheet();
    applyUser();
    // สมัครใหม่ → วงล้อของขวัญต้อนรับ (welcome-gift.js)
    if (!isLogin && typeof startWelcomeGift === 'function') setTimeout(startWelcomeGift, 900);
    toast(isLogin ? 'เข้าสู่ระบบสำเร็จ (ตัวอย่าง — ยังไม่เชื่อมระบบหลังบ้าน)' : 'สมัครสำเร็จ! ยินดีต้อนรับสู่หมอดู.com ✦');
    const r = screen.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 60, 260);
    f.reset();
  })
);
document.querySelectorAll('.social').forEach((s) =>
  s.addEventListener('click', () => toast('การเข้าสู่ระบบผ่านโซเชียลจะเปิดให้ใช้เร็ว ๆ นี้'))
);

// ---------- อินโทร: ประตูแห่งโชคชะตา ----------
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
$('sigilBig').innerHTML = sigilSVG([44, 38, 30], 8, 'ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ✦ ☉ ☽ ♂ ☿ ♃ ♀ ♄ ✦ ᚷ ᚹ ᚺ ᚾ ᛁ ᛃ ✦ ☉ ☽ ♂ ☿ ♃ ♀ ♄ ✦');
$('sigilMid').innerHTML = sigilSVG([40, 34], 6, '✧ ☾ ✧ ☀ ✧ ☾ ✧ ☀ ✧ ☾ ✧ ☀ ✧ ☾ ✧ ☀ ✧ ☾ ✧ ☀ ✧');

// ไพ่โคจรรอบประตู
['☾', '✦', '☀', '♃', '✧', '☿', '♀', '✶'].forEach((sym, i, arr) => {
  const c = document.createElement('span');
  c.className = 'g-card';
  c.style.setProperty('--a', `${(360 / arr.length) * i}deg`);
  c.style.setProperty('--y', `${Math.sin(i * 1.7) * 22}px`);
  c.style.setProperty('--d', `${1.1 + i * 0.12}s`);
  c.textContent = sym;
  $('cardOrbit').appendChild(c);
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
  setTimeout(() => intro.classList.add('zooming'), 1150);
  setTimeout(revealSite, 2200);
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
  // มือค่อย ๆ เลื่อนมาแตะประตู แล้วประตูเปิดเอง (ผู้ใช้ไม่ต้องกด)
  setTimeout(() => !opened && intro.classList.add('hand-in'), 2100);
  setTimeout(() => {
    if (opened) return;
    intro.classList.add('tap');
    const d = document.querySelector('.doorway').getBoundingClientRect();
    burst(d.left + d.width / 2, d.top + d.height * 0.55, 30, 120);
  }, 3300);
  setTimeout(openGate, 3700);
}


// ---------- เปิดหน้าบริการภายในโทรศัพท์ ----------
const APP_PAGES = { 'tarot.html': 'ไพ่ทาโรต์', 'siamsi.html': 'เสี่ยงเซียมซี', 'services.html': 'บริการ' };
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
});
$('frameBack').addEventListener('click', closeFrame);
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
  if (isAppPage(href)) { e.preventDefault(); openFrame(href); return; }
  if (pageOf(href) === 'index.html' && a.closest('.tabbar')) {
    e.preventDefault();
    closeFrame(); closePanel('typePanel'); closePanel('catPanel');
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
