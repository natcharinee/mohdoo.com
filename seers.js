// ===== แท็บ “หมอดู”: รวมหมอดูบนแพลตฟอร์ม (ข้อมูลจริงจาก seers-data.js) =====

// แปลงข้อมูลดิบ → ศาสตร์ที่ใช้ (ชื่อประเภท) และหมวดที่เด่น (เรียงตามจำนวนประเภทที่ลงไว้)
const SEERS = SEER_DATA.map((d) => {
  const types = [], count = {};
  d.cats.forEach((key) => {
    const [catId, idx] = key.split('|');
    const c = CATEGORIES.find((x) => x.id === catId);
    if (!c) return;
    types.push(c.types[+idx].name);
    count[c.name] = (count[c.name] || 0) + 1;
  });
  const strong = Object.keys(count).sort((a, b) => count[b] - count[a]);
  return { ...d, types, strong, catIds: [...new Set(d.cats.map((k) => k.split('|')[0]))] };
});
// บนเว็บ: ส่งคำถามแล้วรอหมอดูตอบเป็นข้อความเท่านั้น (ราคามาตรฐาน)
// คุยสดแบบเรียลไทม์ (โทร / วิดีโอคอล) ใช้บนแอปหมอดู.com · ราคาตามที่หมอดูตั้งบนแพลตฟอร์มเดิม (1 เหรียญ = 1 บาท ชั่วคราว)
// ราคาถาม 1 เรื่อง: หมอดูแต่ละท่านตั้งเอง (จากระบบหลังบ้าน) · ยังไม่ตั้ง = ราคากลาง
let SEER_PRICES = {};
const seerPrice = (s) => SEER_PRICES[s.id] || CATEGORY_PRICE;
const seerTiers = (s) => [{ label: 'ถาม 1 เรื่อง (ตอบเป็นข้อความ)', price: seerPrice(s) }];
async function loadSeerPrices() {
  if (typeof serverReady !== 'undefined') await serverReady;
  if (!window.SERVER) return;
  try {
    const r = await srv('seers/prices');
    const changed = JSON.stringify(r.prices || {}) !== JSON.stringify(SEER_PRICES);
    SEER_PRICES = r.prices || {};
    if (changed && seersPanel.classList.contains('open')) renderSeers();
  } catch (_) {}
}
// ลิงก์ดาวน์โหลดแอปอยู่ที่ APP_LINKS ใน common.js (ใช้ร่วมกันทุกหน้า)
function appCard(s) {
  const btn = (os, icon, label) => APP_LINKS[os]
    ? `<a class="app-dl" href="${APP_LINKS[os]}" target="_blank" rel="noopener"><span>${icon}</span>${label}</a>`
    : `<button type="button" class="app-dl" data-app-soon><span>${icon}</span>${label}</button>`;
  return `<div class="pf-card app-card">
      <div class="app-card-head"><span class="app-ico">📱</span><div>
        <h3>คุยสดกับหมอดูแบบเรียลไทม์</h3>
        <p>โทรหรือวิดีโอคอลกับ <span translate="no">${esc(s.name)}</span> ได้บนแอปหมอดู.com${s.callCoin ? ` · ${s.callMin} นาที ${s.callCoin.toLocaleString('th-TH')} ฿` : ''}</p></div></div>
      <div class="app-dls">${btn('ios', '', 'App Store')}${btn('android', '▶', 'Google Play')}</div>
    </div>`;
}
// เลือกหมอดูตาม “เรื่องที่อยากรู้” (แบบหมวดดวงที่เว็บดูดวงไทยนิยม: ความรัก การงาน การเงิน สุขภาพ …)
// แต่ละเรื่องจับคู่กับศาสตร์ที่ใช้อ่านเรื่องนั้นได้ดี → หมอดูที่มีศาสตร์เหล่านี้จะขึ้นในรายการ
const SEER_TOPICS = [
  ['ทั้งหมด', '✦', null],
  ['ดวงชะตาชีวิต', '🌟', ['astrology', 'palm-face', 'psychic']],
  ['ความรัก · คู่ครอง', '💞', ['cards', 'astrology', 'psychic']],
  ['การงาน · ธุรกิจ', '💼', ['astrology', 'numbers', 'cards']],
  ['การเงิน · โชคลาภ', '💰', ['numbers', 'fengshui', 'astrology']],
  ['สุขภาพ', '🌿', ['astrology', 'palm-face']],
  ['ครอบครัว', '👨‍👩‍👧', ['astrology', 'psychic', 'cards']],
  ['บ้าน · ฮวงจุ้ย', '🏯', ['fengshui', 'numbers']],
];
const topicCats = (name) => (SEER_TOPICS.find(([n]) => n === name) || [])[2];
// ชื่อที่ลูกค้าคุ้นเคย (ใช้ค้นหา เช่น พิมพ์ “เบอร์มือถือ” แล้วเจอหมอดูที่ดูหมายเลขโทรศัพท์)
const SKILL_LABEL = { 'หมายเลขโทรศัพท์': 'ดูเบอร์มือถือ', 'ชื่อ สกุล': 'ชื่อ-สกุล · เปลี่ยนชื่อ', 'เลขบัตรประชาชน': 'เลขบัตรประชาชน', 'ดูดวงลายมือ': 'ดูลายมือ', 'ลายเซ็น': 'ลายเซ็นมงคล', 'บ้านเลขที่': 'บ้านเลขที่มงคล', 'ใบไม้': 'เสี่ยงทายใบไม้' };
const skillLabel = (n) => SKILL_LABEL[n] || n;
const seerMatches = (s, f) => f === 'ทั้งหมด' || (topicCats(f) ? topicCats(f).some((c) => s.catIds.includes(c)) : s.types.includes(f));

const seerAvatar = (s, cls = '') =>
  `<span class="seer-av photo ${cls}"><img src="${s.img}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('i'),{textContent:'${s.name.replace(/'/g, '').charAt(0)}'}))"></span>`;
// ศาสตร์ที่ตรงกับคำค้นหา → ขึ้นก่อนและเน้นสีทอง
const qHit = (t, q) => typeof q === 'string' && !!q && `${t} ${skillLabel(t)}`.toLowerCase().includes(q.toLowerCase());
const seerCard = (s, q = '') => `<button class="seer-row" data-seer="${s.id}">
    ${seerAvatar(s)}
    <span class="seer-txt"><b translate="no">${esc(s.name)}</b>
      <small>เด่นเรื่อง ${s.strong.join(', ')}</small>
      <span class="seer-sci">${[...s.types].sort((a, b) => qHit(b, q) - qHit(a, q)).map((t) => `<i class="${qHit(t, q) ? 'hit' : ''}">${esc(qHit(t, q) ? skillLabel(t) : t)}</i>`).join('')}</span></span>
    <span class="seer-price"><small>ถาม 1 เรื่อง</small>${seerPrice(s).toLocaleString('th-TH')} ฿</span>
  </button>`;

// ---------- หน้าแท็บหมอดู ----------
let seerFilter = 'ทั้งหมด';
let seerQuery = '';
function renderSeers() {
  const body = seersPanel.querySelector('.panel-body');
  const featured = [...SEERS].sort((a, b) => b.types.length - a.types.length).slice(0, 6);
  const list = SEERS.filter((s) =>
    seerMatches(s, seerFilter) &&
    (!seerQuery || `${s.name} ${s.strong.join(' ')} ${s.types.join(' ')} ${s.types.map(skillLabel).join(' ')}`.toLowerCase().includes(seerQuery.toLowerCase())));
  const search = `<label class="seer-search"><span>🔍</span><input id="seerQ" type="search" placeholder="ค้นหาหมอดู หรือเรื่องที่อยากดู เช่น ไพ่ทาโรต์ เบอร์มือถือ" value="${esc(seerQuery)}"></label>`;
  // กำลังค้นหา → แสดงผลลัพธ์ทันทีใต้ช่องค้นหา (ไม่ต้องเลื่อนหา)
  if (seerQuery) {
    body.innerHTML = `${search}
      <div class="sec-head"><h3>ผลการค้นหา “${esc(seerQuery)}”</h3><span class="sec-note">${list.length} ท่าน</span></div>
      <div class="seer-list">${list.length ? list.map((s) => seerCard(s, seerQuery)).join('')
        : `<div class="seer-noresult"><p>ไม่พบหมอดูที่ตรงกับ “${esc(seerQuery)}”</p><small>ลองค้นด้วยคำอื่น เช่น ความรัก ไพ่ทาโรต์ เบอร์มือถือ ชื่อ ฮวงจุ้ย</small>
          <button class="btn-ghost" data-clear-q>ดูหมอดูทั้งหมด</button></div>`}</div>`;
    bindSearch(body);
    return;
  }
  body.innerHTML = `
    ${search}

    <div class="sec-head"><h3>หมอดูแนะนำ ✦</h3><span class="sec-note">คัดมาให้คุณ</span></div>
    <div class="hscroll seer-feat">${featured.map((s) => `<button class="feat-card" data-seer="${s.id}">
        ${seerAvatar(s, 'big')}
        <b translate="no">${esc(s.name)}</b><small>เด่นเรื่อง${s.strong[0]}</small>
        <span class="feat-meta">${s.types.length} ศาสตร์</span>
      </button>`).join('')}</div>

    <div class="sec-head"><h3>เลือกตามศาสตร์</h3></div>
    <div class="cat-grid">${CATEGORIES.map((c) =>
      `<button class="cat" data-cat="${c.id}"><span class="cat-ico">${c.icon}</span><b>${c.name}</b><small>${c.desc}</small><em>${c.types.filter(typeOn).length} ประเภท ›</em></button>`).join('')}</div>

    <div class="sec-head"><h3>เลือกตามเรื่องที่อยากรู้</h3></div>
    <div class="strong-chips">${SEER_TOPICS.map(([f, icon]) => `<button class="chip-s ${f === seerFilter ? 'on' : ''}" data-strong="${f}"><span>${icon}</span>${f}</button>`).join('')}</div>

    <div class="sec-head"><h3>${seerFilter === 'ทั้งหมด' ? 'หมอดูทั้งหมด' : `หมอดูเรื่อง${skillLabel(seerFilter)}`}</h3><span class="sec-note">${list.length} ท่าน</span></div>
    <div class="seer-list">${list.length ? list.map((x) => seerCard(x)).join('') : '<p class="pf-empty">ไม่พบหมอดูที่ตรงกับการค้นหา</p>'}</div>
`;
  bindSearch(body);
}
function bindSearch(body) {
  const q = body.querySelector('#seerQ');
  q.addEventListener('input', () => {
    seerQuery = q.value.trim();
    const pos = q.selectionStart;
    renderSeers();
    const nq = seersPanel.querySelector('#seerQ');
    nq.focus(); nq.setSelectionRange(pos, pos);
  });
}
seersPanel.addEventListener('click', (e) => {
  const f = e.target.closest('[data-strong]');
  if (f) { seerFilter = f.dataset.strong; renderSeers(); return; }
  if (e.target.closest('[data-clear-q]')) { seerQuery = ''; renderSeers(); return; }
  const s = e.target.closest('[data-seer]');
  if (s) openSeer(s.dataset.seer);
});
$('tabSeers').addEventListener('click', () => { renderSeers(); loadSeerPrices(); });
renderSeers();
addEventListener('DOMContentLoaded', loadSeerPrices); // รอ server-sync.js โหลดก่อน

// ---------- โปรไฟล์หมอดู ----------
const seerPanel = makePanel('seerPanel', 'โปรไฟล์หมอดู');
seerPanel.style.zIndex = 20;
function openSeer(id) {
  const s = SEERS.find((x) => x.id === id);
  const tiers = seerTiers(s);
  const byCat = s.catIds.map((cid) => {
    const c = CATEGORIES.find((x) => x.id === cid);
    const names = s.cats.filter((k) => k.startsWith(`${cid}|`)).map((k) => c.types[+k.split('|')[1]].name);
    return `<div class="seer-cat"><small>${c.icon} ${c.name}</small><div>${names.map((n) => `<span class="sci-chip">${n}</span>`).join('')}</div></div>`;
  }).join('');
  seerPanel.querySelector('.panel-body').innerHTML = `
    <div class="seer-hero">
      ${seerAvatar(s, 'xl')}
      <h3 translate="no">${esc(s.name)}</h3>
      <p>หมอดูบนแพลตฟอร์ม หมอดู.com · ${s.types.length} ศาสตร์</p>
    </div>
    <div class="pf-card">
      <div class="sec-head"><h3>เด่นเรื่อง</h3></div>
      <div class="pf-interest"><div>${s.strong.map((x) => `<span>${x}</span>`).join('')}</div></div>
    </div>
    <div class="pf-card">
      <div class="sec-head"><h3>ศาสตร์ที่ให้บริการ</h3></div>
      <div class="pf-interest">${byCat}</div>
    </div>
    <div class="pf-card">
      <div class="sec-head"><h3>บริการและราคา</h3></div>
      <ul class="order-info">${tiers.map((t) => `<li><small>${t.label}</small><b>${t.price.toLocaleString('th-TH')} ฿</b></li>`).join('')}
        <li><small>คุยสด โทร / วิดีโอคอล${s.callCoin ? ` ${s.callMin} นาที` : ''}</small><b>${s.callCoin ? `${s.callCoin.toLocaleString('th-TH')} ฿ · บนแอป` : 'บนแอป'}</b></li></ul>
    </div>
    <button class="btn-gold full" id="bookSeer">ส่งคำถามถึง <span translate="no">${esc(s.name)}</span> ›</button>
    <p class="pay-note">ชำระเงินด้วย QR แล้วพิมพ์คำถาม หมอดูจะตอบกลับเป็นข้อความภายใน 24 ชั่วโมง</p>
    ${appCard(s)}`;
  seerPanel.querySelector('[data-app-soon]')?.closest('.app-dls').addEventListener('click', (e) => {
    if (e.target.closest('[data-app-soon]')) toast('ลิงก์ดาวน์โหลดแอปหมอดู.com จะเปิดให้เร็ว ๆ นี้ ✦');
  });
  seerPanel.querySelector('#bookSeer').addEventListener('click', () => startCheckout({
    key: `seer:${s.id}`, icon: '🔮', title: `ดูดวงกับ ${s.name}`, sub: `เด่นเรื่อง ${s.strong.join(' · ')}`,
    tiers, next: { kind: 'form', fields: ASK_FIELDS },
  }));
  openPanel('seerPanel');
}

// ---------- หน้า “รายชื่อหมอดู” ของแต่ละประเภท ----------
const _openType = openType;
openType = function (catId, idx) {
  _openType(catId, idx);
  const list = SEERS.filter((s) => s.cats.includes(`${catId}|${idx}`));
  const box = $('typeBody').querySelector('.empty-seers');
  if (box && list.length) {
    const wrap = document.createElement('div');
    wrap.className = 'seer-list';
    wrap.innerHTML = list.map(seerCard).join('');
    box.replaceWith(wrap);
  }
};
$('typeBody').addEventListener('click', (e) => {
  const s = e.target.closest('[data-seer]');
  if (s) openSeer(s.dataset.seer);
});
