// ===== ของขวัญต้อนรับ: วงล้อสุ่มดวงฟรี 1 อย่าง หลังสมัครสมาชิก =====
// ใช้ข้อมูลที่ลูกค้ากรอกตอนสมัคร (ชื่อ นามสกุล วันเกิด) — เก็บในเบราว์เซอร์ (ตัวอย่าง ยังไม่มีระบบหลังบ้าน)

const GIFTS = [
  { id: 'daily',  icon: '☀️', name: 'ดูดวงวันนี้',      short: 'ดวงวันนี้',   desc: 'เปิดไพ่ทาโรต์ 1 ใบ รับคำแนะนำสำหรับวันนี้', href: 'tarot.html?spread=one' },
  { id: 'color',  icon: '🎨', name: 'สีมงคลประจำตัว',  short: 'สีมงคล',     desc: 'สีเสริมการงาน การเงิน ความรัก จากวันเกิดของคุณ' },
  { id: 'love',   icon: '💞', name: 'ดูดวงความรัก',     short: 'ดวงความรัก',  desc: 'เปิดไพ่ 3 ใบ ดูตัวคุณ คนที่คุณคิดถึง และอนาคตความรัก', href: 'tarot.html?spread=love' },
  { id: 'name',   icon: '✍️', name: 'ทำนายชื่อ-นามสกุล', short: 'ทำนายชื่อ',   desc: 'ถอดพลังตัวเลขจากชื่อและนามสกุลที่คุณลงทะเบียน' },
  { id: 'number', icon: '🔢', name: 'เลขมงคลประจำตัว', short: 'เลขมงคล',    desc: 'เลขนำโชคและเลขเส้นทางชีวิตจากวันเกิด' },
  { id: 'zodiac', icon: '♈&#xFE0E;', name: 'ราศีและนิสัยของคุณ', short: 'ราศีของคุณ', desc: 'ราศีเกิด ธาตุประจำตัว และนิสัยเด่น' },
];
const COUPON_DAYS = 30;

// ---------- ข้อมูลผู้ใช้ ----------
function saveUser(u) { return persistUser(u); }
// ประวัติการดูดวง (ล่าสุดอยู่บนสุด เก็บไม่เกิน 50 รายการ)
function addHistory(entry) {
  const u = currentUser();
  if (!u) return;
  // เก็บทุกประวัติการดูดวง (ไม่ตัดทิ้ง) · ยกเว้นรายงานประจำวันเก็บย้อนหลัง 120 วัน
  let daily = 0;
  const id = `h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  u.history = [{ id, at: Date.now(), ...entry }, ...(u.history || [])]
    .filter((h) => h.kind !== 'daily' || ++daily <= 120);
  saveUser(u);
  return id;
}
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const thDate = (ts) => new Date(ts).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

// ---------- สร้างหน้าจอวงล้อ (อยู่ในโทรศัพท์) ----------
const giftEl = document.createElement('div');
giftEl.className = 'gift';
giftEl.id = 'gift';
giftEl.setAttribute('role', 'dialog');
giftEl.setAttribute('aria-modal', 'true');
giftEl.setAttribute('aria-labelledby', 'giftTitle');
giftEl.innerHTML = `
  <div class="gift-inner">
    <p class="gift-eyebrow">✦ ของขวัญต้อนรับสมาชิกใหม่ ✦</p>
    <h2 id="giftTitle">หมุนวงล้อ รับดูดวงฟรี 1 ครั้ง</h2>
    <p class="gift-sub" id="giftSub">หมุนได้ 1 ครั้ง รางวัลที่ได้จะใช้ทันทีหรือเก็บเป็นคูปองก็ได้</p>
    <div class="wheel-wrap">
      <span class="wheel-pointer" aria-hidden="true"></span>
      <div class="wheel" id="wheel">${wheelSVG()}</div>
      <button class="wheel-hub" id="spinBtn">หมุน!</button>
    </div>
    <div class="gift-result" id="giftResult" hidden></div>
    <button class="gift-later" id="giftLater">ไว้ทีหลัง</button>
  </div>`;
$('screen').appendChild(giftEl);

function wheelSVG() {
  const n = GIFTS.length, R = 150, C = 160;
  const pt = (deg, r) => { const a = (deg * Math.PI) / 180; return [C + r * Math.sin(a), C - r * Math.cos(a)]; };
  const fills = ['#4b1f8f', '#7a2fb8', '#5a2399', '#8f3bb0', '#43207f', '#6c2aa8'];
  let segs = '', labels = '', bulbs = '';
  GIFTS.forEach((g, i) => {
    const a0 = (360 / n) * i, a1 = a0 + 360 / n, mid = a0 + 180 / n;
    const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R);
    segs += `<path d="M${C} ${C} L${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1} Z" fill="${fills[i % fills.length]}" stroke="#f5c96b" stroke-width="2"/>`;
    // ครึ่งล่างของวงล้อ: กลับข้อความ 180° ให้อ่านได้ไม่กลับหัว
    const flip = mid > 90 && mid < 270 ? `rotate(180 ${C} ${C - R + 53})` : '';
    labels += `<g transform="rotate(${mid} ${C} ${C})"><g transform="${flip}">
      <text x="${C}" y="${C - R + 40}" text-anchor="middle" class="w-ico">${g.icon}</text>
      <text x="${C}" y="${C - R + 66}" text-anchor="middle" class="w-txt">${g.short}</text></g></g>`;
  });
  for (let i = 0; i < 18; i++) {
    const [x, y] = pt(i * 20, R + 6);
    bulbs += `<circle cx="${x}" cy="${y}" r="3.6" class="bulb" style="animation-delay:${(i % 2) * 0.4}s"/>`;
  }
  return `<svg viewBox="0 0 320 320" aria-hidden="true">
    <circle cx="${C}" cy="${C}" r="${R + 10}" fill="#1a0b3d" stroke="#f5c96b" stroke-width="3"/>
    ${segs}${labels}${bulbs}
    <circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="#ffe7a8" stroke-width="1.5" opacity=".6"/>
  </svg>`;
}

// ---------- เปิด/ปิด ----------
let spinning = false;
function startWelcomeGift() {
  const u = currentUser();
  if (!u || u.wheelSpun) return;
  $('giftResult').hidden = true;
  $('spinBtn').disabled = false;
  $('giftLater').hidden = false;
  $('wheel').style.transition = 'none';
  $('wheel').style.transform = 'rotate(0deg)';
  giftEl.classList.add('open');
  setTimeout(() => $('spinBtn').focus({ preventScroll: true }), 400);
}
function closeGift() {
  giftEl.classList.remove('open');
  // ปิดวงล้อแล้ว → ทำสิ่งที่กดไว้ก่อนสมัครต่อ (ถ้าไม่ได้เปิดคำทำนายจากของขวัญ)
  if (typeof resumeAfterAuth === 'function' && !document.querySelector('.panel.open')) resumeAfterAuth();
}
$('giftLater').addEventListener('click', () => {
  const u = currentUser();
  if (u) { u.giftLaterAt = Date.now(); saveUser(u); }
  closeGift();
  renderCoupons();
  toast('หมุนวงล้อได้ภายหลังที่หน้าบัญชี ✦');
});

// ---------- หมุน ----------
$('spinBtn').addEventListener('click', () => {
  if (spinning) return;
  const u = currentUser();
  if (!u || u.wheelSpun) return;
  spinning = true;
  $('spinBtn').disabled = true;
  $('giftLater').hidden = true;
  const idx = Math.floor(Math.random() * GIFTS.length);
  const seg = 360 / GIFTS.length;
  const jitter = (Math.random() - 0.5) * seg * 0.6;
  const target = 360 * 6 - (idx * seg + seg / 2) + jitter;
  const w = $('wheel');
  void w.offsetWidth;
  w.style.transition = 'transform 4.6s cubic-bezier(.12, .7, .1, 1)';
  w.style.transform = `rotate(${target}deg)`;
  setTimeout(() => {
    spinning = false;
    u.wheelSpun = true;
    u.pendingGift = GIFTS[idx].id; // ได้รางวัลแล้ว รอเลือกใช้/เก็บ
    saveUser(u);
    const r = $('wheel').getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 70, 240);
    showWin(GIFTS[idx]);
  }, 4800);
});

function showWin(g) {
  const box = $('giftResult');
  box.innerHTML = `
    <div class="win-card">
      <span class="win-ico">${g.icon}</span>
      <div><p class="win-label">คุณได้รับ</p><h3>${g.name}</h3><p>${g.desc}</p></div>
    </div>
    <div class="win-actions">
      <button class="btn-gold full" id="useNow">✦ ใช้เลยตอนนี้</button>
      <button class="btn-ghost full" id="keepIt">🎟 เก็บเป็นคูปอง (ใช้ได้ ${COUPON_DAYS} วัน)</button>
    </div>`;
  box.hidden = false;
  $('giftSub').textContent = 'ยินดีด้วย! เลือกได้เลยว่าจะใช้ตอนนี้หรือเก็บไว้ก่อน';
  $('useNow').addEventListener('click', () => {
    const c = addCoupon(g.id);
    closeGift();
    useCoupon(c.id);
  });
  $('keepIt').addEventListener('click', () => {
    addCoupon(g.id);
    closeGift();
    renderCoupons();
    toast(`เก็บคูปอง “${g.name}” แล้ว ดูได้ที่หน้าบัญชี 🎟`);
  });
}

// ---------- คูปอง ----------
function addCoupon(giftId) {
  const u = currentUser();
  const c = { id: `c${Date.now().toString(36)}`, gift: giftId, created: Date.now(), expires: Date.now() + COUPON_DAYS * 864e5, used: false };
  u.coupons = [...(u.coupons || []), c];
  delete u.pendingGift;
  saveUser(u);
  return c;
}

// ส่วน "คูปองของฉัน" บนหน้าแรก (ใต้คำทักทาย)
// คูปองแสดงเฉพาะในหน้าบัญชี (profile.js) — หน้าแรกไม่มีส่วนนี้
function renderCoupons() {
  if (typeof renderProfile === 'function' && $('profilePanel')?.classList.contains('open')) renderProfile();
}
function claimPending() {
  const u = currentUser();
  if (!u || !u.pendingGift) return;
  giftEl.classList.add('open');
  showWin(GIFTS.find((x) => x.id === u.pendingGift));
  $('spinBtn').disabled = true;
  $('giftLater').hidden = true;
}

function useCoupon(id) {
  const u = currentUser();
  const c = (u.coupons || []).find((x) => x.id === id);
  if (!c || c.used) return;
  c.used = true;
  c.usedAt = Date.now();
  saveUser(u);
  renderCoupons();
  const g = GIFTS.find((x) => x.id === c.gift);
  if (g.href) { openFrame(`${g.href}${g.href.includes('?') ? '&' : '?'}paid=coupon`); return; }
  addHistory({ kind: 'personal', gift: g.id, title: g.name, icon: g.icon });
  openReading(g, currentUser());
}

// ---------- หน้าผลคำทำนาย (แผงในโทรศัพท์) ----------
const readingPanel = document.createElement('section');
readingPanel.className = 'panel';
readingPanel.id = 'readingPanel';
readingPanel.setAttribute('aria-hidden', 'true');
readingPanel.innerHTML = `<header class="panel-bar"><button class="back">‹ กลับ</button><h2 id="readingTitle">คำทำนายของคุณ</h2><span></span></header><div class="panel-body" id="readingBody"></div>`;
$('screen').insertBefore(readingPanel, $('framePanel'));
readingPanel.querySelector('.back').addEventListener('click', () => closePanel('readingPanel'));

function openReading(g, u) {
  const fn = { color: readColor, name: readName, number: readNumber, zodiac: readZodiac }[g.id];
  $('readingTitle').textContent = g.name;
  $('readingBody').innerHTML = `<div class="reading-head"><span class="win-ico">${g.icon}</span><div><p class="win-label">ของคุณ${esc(u.first || u.name)} ${esc(u.last || '')}</p><h3>${g.name}</h3></div></div>${fn(u)}
    <p class="reading-note">คำทำนายเพื่อความบันเทิงและเป็นกำลังใจ · อยากรู้ลึกกว่านี้ ปรึกษาหมอดูได้ที่หมวดหมู่</p>`;
  openPanel('readingPanel');
}

// ----- สีมงคล (จากวันเกิดในสัปดาห์) -----
const HEX = { แดง: '#e04848', เหลือง: '#f4c542', ชมพู: '#f28cc0', เขียว: '#3fae6a', ส้ม: '#f28c38', ฟ้า: '#5bb6f0', ม่วง: '#9b59d0', ดำ: '#2b2b2b', ทอง: '#d4a64a' };
const DAY_COLORS = [
  { day: 'อาทิตย์', birth: 'แดง', work: 'ม่วง', money: 'เขียว', love: 'ชมพู', avoid: 'ฟ้า' },
  { day: 'จันทร์', birth: 'เหลือง', work: 'ส้ม', money: 'ม่วง', love: 'เขียว', avoid: 'แดง' },
  { day: 'อังคาร', birth: 'ชมพู', work: 'ม่วง', money: 'ส้ม', love: 'ฟ้า', avoid: 'เหลือง' },
  { day: 'พุธ', birth: 'เขียว', work: 'ส้ม', money: 'ฟ้า', love: 'เหลือง', avoid: 'ชมพู' },
  { day: 'พฤหัสบดี', birth: 'ส้ม', work: 'เขียว', money: 'แดง', love: 'ฟ้า', avoid: 'ดำ' },
  { day: 'ศุกร์', birth: 'ฟ้า', work: 'เขียว', money: 'ทอง', love: 'ชมพู', avoid: 'ม่วง' },
  { day: 'เสาร์', birth: 'ม่วง', work: 'แดง', money: 'ฟ้า', love: 'ชมพู', avoid: 'เขียว' },
];
function birthParts(u) {
  const [y, m, d] = (u.birthdate || '2000-01-01').split('-').map(Number);
  return { y, m, d, date: new Date(y, m - 1, d) };
}
const swatch = (label, color) => `<li><span class="sw" style="background:${HEX[color]}"></span><span><small>${label}</small><b>${color}</b></span></li>`;
function readColor(u) {
  const { date } = birthParts(u);
  const c = DAY_COLORS[date.getDay()];
  return `<p class="reading-lead">คุณเกิดวัน<b>${c.day}</b> สีประจำวันเกิดคือ<b>สี${c.birth}</b></p>
    <ul class="swatches">${swatch('สีประจำวันเกิด', c.birth)}${swatch('เสริมการงาน', c.work)}${swatch('เสริมการเงิน', c.money)}${swatch('เสริมความรัก', c.love)}</ul>
    <p class="reading-tip">✦ ช่วงไหนอยากให้งานราบรื่น ลองใส่หรือพกของ<b>สี${c.work}</b> ส่วนวันที่มีนัดสำคัญเรื่องหัวใจ เลือก<b>สี${c.love}</b><br>✦ สีที่ควรเลี่ยงในวันสำคัญ: <b>สี${c.avoid}</b></p>`;
}

// ----- ตัวเลข (เส้นทางชีวิต / ชื่อ) -----
const NUM_MEANING = {
  1: ['ผู้นำ', 'มั่นใจในตัวเอง กล้าเริ่มต้นสิ่งใหม่ และมักเป็นคนแรกที่ลงมือทำ'],
  2: ['ผู้ประสานใจ', 'อ่อนโยน เข้าใจผู้อื่น ทำงานร่วมกับคนอื่นได้ดีเยี่ยม'],
  3: ['นักสร้างสรรค์', 'ร่าเริง สื่อสารเก่ง มีเสน่ห์ทางคำพูดและไอเดีย'],
  4: ['นักสร้างรากฐาน', 'ขยัน มั่นคง เชื่อถือได้ ทำอะไรเป็นขั้นเป็นตอน'],
  5: ['นักผจญภัย', 'รักอิสระ ปรับตัวเร็ว ชอบการเดินทางและเรื่องใหม่ ๆ'],
  6: ['ผู้ดูแล', 'รักครอบครัว มีความรับผิดชอบ เป็นที่พึ่งของคนรอบข้าง'],
  7: ['นักคิด', 'ลึกซึ้ง ช่างสังเกต ชอบค้นหาความจริงและความรู้'],
  8: ['นักบริหาร', 'มีพลัง มุ่งมั่นสู่ความสำเร็จ เก่งเรื่องเงินและการจัดการ'],
  9: ['ผู้ให้', 'เมตตา ใจกว้าง มองการณ์ไกล ชอบช่วยเหลือผู้อื่น'],
};
const reduce = (n) => { while (n > 9) n = String(n).split('').reduce((a, b) => a + +b, 0); return n || 9; };

// ค่าตัวอักษรไทยตามหลักเลขศาสตร์ที่นิยม + อังกฤษแบบพีทาโกรัส
const TH_VAL = {};
[['1', 'กดถทภฤุ่ำา'], ['2', 'ขชงบปแเู้'], ['3', 'ฆตฑฒ๋'], ['4', 'คธญรษะโัิ'], ['5', 'ฉณฌนมหฮฎึฬ'], ['6', 'จลวอใ็'], ['7', 'ซศสีื๊'], ['8', 'ยผฝพฟๆ'], ['9', 'ฏฐไ์']]
  .forEach(([v, chars]) => [...chars].forEach((ch) => (TH_VAL[ch] = +v)));
function letterSum(text) {
  let sum = 0;
  for (const ch of text.toLowerCase()) {
    if (TH_VAL[ch]) sum += TH_VAL[ch];
    else if (/[a-z]/.test(ch)) sum += ((ch.charCodeAt(0) - 97) % 9) + 1;
  }
  return sum;
}
function readName(u) {
  const f = letterSum(u.first || u.name || ''), l = letterSum(u.last || ''), total = f + l;
  const n = reduce(total);
  const [title, text] = NUM_MEANING[n];
  return `<div class="num-row">
      <div class="num-box"><small>ชื่อ</small><b>${f}</b><span>${esc(u.first || u.name)}</span></div>
      <div class="num-plus">+</div>
      <div class="num-box"><small>นามสกุล</small><b>${l}</b><span>${esc(u.last || '-')}</span></div>
      <div class="num-plus">=</div>
      <div class="num-box gold"><small>ผลรวม</small><b>${total}</b><span>พลังเลข ${n}</span></div>
    </div>
    <p class="reading-lead">ชื่อของคุณมีพลังของ<b>“${title}”</b></p>
    <p class="reading-tip">✦ ${text}<br>✦ ผลรวมที่ได้สะท้อนพลังชื่อในภาพรวม ถ้าอยากวิเคราะห์ละเอียดหรือเปลี่ยนชื่อ ดูแพ็กเกจได้ในหมวดศาสตร์แห่งเลข</p>`;
}
function readNumber(u) {
  const { y, m, d } = birthParts(u);
  const life = reduce([...`${y}${m}${d}`].reduce((a, b) => a + +b, 0));
  const dayNum = reduce(d);
  const third = reduce(life + dayNum);
  const lucky = [...new Set([life, dayNum, third])];
  while (lucky.length < 3) lucky.push(reduce(lucky[lucky.length - 1] + 3));
  const [title, text] = NUM_MEANING[life];
  return `<p class="reading-lead">เลขเส้นทางชีวิตของคุณคือ <b class="big-num">${life}</b> · ${title}</p>
    <p class="reading-tip">✦ ${text}</p>
    <div class="lucky-nums"><small>เลขนำโชคประจำตัว</small><div>${lucky.map((n) => `<span>${n}</span>`).join('')}</div></div>
    <p class="reading-tip">✦ ใช้เลขเหล่านี้เป็นเลขโปรด เช่น ตั้งรหัส เลือกที่นั่ง หรือวันนัดสำคัญที่ลงท้ายด้วยเลขนี้</p>`;
}

// ----- ราศี -----
const ZODIAC = [
  ['มังกร', '♑', 'ดิน', [12, 22], 'อดทน มีวินัย วางแผนเก่ง ทำอะไรจริงจังจนสำเร็จ'],
  ['กุมภ์', '♒', 'ลม', [1, 20], 'ความคิดสร้างสรรค์ รักอิสระ เป็นมิตรกับทุกคน'],
  ['มีน', '♓', 'น้ำ', [2, 19], 'อ่อนโยน มีจินตนาการ เข้าใจความรู้สึกคนอื่น'],
  ['เมษ', '♈', 'ไฟ', [3, 21], 'กล้าหาญ กระตือรือร้น ชอบเป็นผู้นำ'],
  ['พฤษภ', '♉', 'ดิน', [4, 20], 'มั่นคง ใจเย็น รักความสบายและความสวยงาม'],
  ['เมถุน', '♊', 'ลม', [5, 21], 'ช่างพูด ฉลาด ปรับตัวเก่ง อยากรู้อยากเห็น'],
  ['กรกฎ', '♋', 'น้ำ', [6, 21], 'รักครอบครัว อบอุ่น ใส่ใจคนรอบข้าง'],
  ['สิงห์', '♌', 'ไฟ', [7, 23], 'มั่นใจ มีเสน่ห์ ใจกว้าง ชอบเป็นจุดสนใจ'],
  ['กันย์', '♍', 'ดิน', [8, 23], 'ละเอียด รอบคอบ ช่างสังเกต ทำงานเนี้ยบ'],
  ['ตุลย์', '♎', 'ลม', [9, 23], 'รักความยุติธรรม มีรสนิยม ชอบความสมดุล'],
  ['พิจิก', '♏', 'น้ำ', [10, 23], 'ลึกซึ้ง มุ่งมั่น มีพลังดึงดูดในตัว'],
  ['ธนู', '♐', 'ไฟ', [11, 22], 'รักอิสระ มองโลกในแง่ดี ชอบผจญภัย'],
];
const ELEMENT_TIP = {
  ไฟ: 'เติมพลังด้วยการออกกำลังกายหรือทำสิ่งท้าทาย คู่ที่เข้ากันดีคือราศีธาตุลม',
  ดิน: 'เติมพลังด้วยธรรมชาติและต้นไม้ คู่ที่เข้ากันดีคือราศีธาตุน้ำ',
  ลม: 'เติมพลังด้วยการพูดคุยและเรียนรู้สิ่งใหม่ คู่ที่เข้ากันดีคือราศีธาตุไฟ',
  น้ำ: 'เติมพลังด้วยดนตรีหรือการอยู่ใกล้น้ำ คู่ที่เข้ากันดีคือราศีธาตุดิน',
};
// หาราศีจากเดือน/วันเกิด
function zodiacOf(m, d) {
  let z = ZODIAC[0];
  for (const item of ZODIAC.slice(1)) {
    const [sm, sd] = item[3];
    if (m > sm || (m === sm && d >= sd)) z = item;
  }
  if (m === 12 && d >= 22) z = ZODIAC[0];
  return z;
}
function lifeNumber(u) {
  const { y, m, d } = birthParts(u);
  return reduce([...`${y}${m}${d}`].reduce((a, b) => a + +b, 0));
}
function readZodiac(u) {
  const { m, d } = birthParts(u);
  const [name, sym, el, , trait] = zodiacOf(m, d);
  return `<div class="zodiac-badge"><span>${sym}&#xFE0E;</span><div><small>ราศีเกิด</small><b>ราศี${name}</b><em>ธาตุ${el}</em></div></div>
    <p class="reading-lead">นิสัยเด่นของคุณ</p>
    <p class="reading-tip">✦ ${trait}<br>✦ ${ELEMENT_TIP[el]}</p>`;
}

// แสดงคูปองเมื่อโหลดหน้า และทุกครั้งที่เข้า/ออกจากระบบ
renderCoupons();
const _applyUser = applyUser;
applyUser = function () { _applyUser(); renderCoupons(); };
