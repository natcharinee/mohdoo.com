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
// ราคาในแอปใหม่: ถาม 1 เรื่องใช้ราคามาตรฐาน · โทร/นัดคุยใช้ราคาที่หมอดูตั้งบนแพลตฟอร์มเดิม (1 เหรียญ = 1 บาท ชั่วคราว)
const seerTiers = (s) => [
  { label: 'ถาม 1 เรื่อง (ตอบเป็นข้อความ)', price: CATEGORY_PRICE },
  s.callCoin ? { label: `โทรดูดวง ${s.callMin} นาที`, price: s.callCoin } : { label: 'โทรดูดวง', price: null },
];
const SEER_FILTERS = ['ทั้งหมด', ...CATEGORIES.map((c) => c.name)];

const seerAvatar = (s, cls = '') =>
  `<span class="seer-av photo ${cls}"><img src="${s.img}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('i'),{textContent:'${s.name.replace(/'/g, '').charAt(0)}'}))"></span>`;
const seerCard = (s) => `<button class="seer-row" data-seer="${s.id}">
    ${seerAvatar(s)}
    <span class="seer-txt"><b>${esc(s.name)}</b>
      <small>เด่นเรื่อง ${s.strong.slice(0, 2).join(' · ')}</small>
      <small class="seer-sci">${s.types.slice(0, 3).join(' · ')}${s.types.length > 3 ? ' …' : ''}</small></span>
    <span class="seer-price"><small>เริ่ม</small>${CATEGORY_PRICE} ฿</span>
  </button>`;

// ---------- หน้าแท็บหมอดู ----------
let seerFilter = 'ทั้งหมด';
let seerQuery = '';
function renderSeers() {
  const body = seersPanel.querySelector('.panel-body');
  const featured = [...SEERS].sort((a, b) => b.types.length - a.types.length).slice(0, 6);
  const list = SEERS.filter((s) =>
    (seerFilter === 'ทั้งหมด' || s.strong.includes(seerFilter)) &&
    (!seerQuery || `${s.name} ${s.strong.join(' ')} ${s.types.join(' ')}`.toLowerCase().includes(seerQuery.toLowerCase())));
  body.innerHTML = `
    <label class="seer-search"><span>🔍</span><input id="seerQ" type="search" placeholder="ค้นหาหมอดู หรือศาสตร์ เช่น ไพ่ทาโรต์" value="${esc(seerQuery)}"></label>

    <div class="sec-head"><h3>หมอดูบนแอป</h3><span class="sec-note">${SEERS.length} ท่าน</span></div>
    <div class="hscroll seer-feat">${featured.map((s) => `<button class="feat-card" data-seer="${s.id}">
        ${seerAvatar(s, 'big')}
        <b>${esc(s.name)}</b><small>เด่นเรื่อง${s.strong[0]}</small>
        <span class="feat-meta">${s.types.length} ศาสตร์</span>
      </button>`).join('')}</div>

    <div class="sec-head"><h3>เลือกตามเรื่องที่เด่น</h3></div>
    <div class="strong-chips">${SEER_FILTERS.map((f) => `<button class="chip-s ${f === seerFilter ? 'on' : ''}" data-strong="${f}">${f}</button>`).join('')}</div>

    <div class="sec-head"><h3>${seerFilter === 'ทั้งหมด' ? 'หมอดูทั้งหมด' : `เด่นเรื่อง${seerFilter}`}</h3><span class="sec-note">${list.length} ท่าน</span></div>
    <div class="seer-list">${list.length ? list.map(seerCard).join('') : '<p class="pf-empty">ไม่พบหมอดูที่ตรงกับการค้นหา</p>'}</div>

    <div class="sec-head"><h3>เลือกตามศาสตร์</h3></div>
    <div class="cat-grid">${CATEGORIES.map((c) =>
      `<button class="cat" data-cat="${c.id}"><span class="cat-ico">${c.icon}</span><b>${c.name}</b><small>${c.desc}</small><em>${c.types.length} ประเภท ›</em></button>`).join('')}</div>`;
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
  const s = e.target.closest('[data-seer]');
  if (s) openSeer(s.dataset.seer);
});
$('tabSeers').addEventListener('click', renderSeers);
renderSeers();

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
      <h3>${esc(s.name)}</h3>
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
      <ul class="order-info">${tiers.map((t) => `<li><small>${t.label}</small><b>${t.price == null ? 'ยังไม่เปิดรับ' : `${t.price.toLocaleString('th-TH')} ฿`}</b></li>`).join('')}</ul>
    </div>
    <button class="btn-gold full" id="bookSeer">ดูดวงกับ ${esc(s.name)} ›</button>
    <p class="pay-note">ชำระเงินด้วย QR ก่อน แล้วกรอกคำถามให้หมอดู</p>`;
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
