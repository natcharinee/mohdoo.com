// ===== หน้า “ศาสตร์ดูดวงทั่วโลก” =====
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const svcOf = (id) => SERVICES.find((s) => s.id === id);
const sciOf = (id) => WORLD_SCIENCES.find((s) => s.id === id);
const methodName = (id) => WORLD_METHODS.find((m) => m.id === id)?.name || id;
const regionIcon = (s) => WORLD_REGIONS.find((r) => r.id === s.regions[0])?.icon || '🌐';
const inPhone = window.parent !== window;

// ราคาเริ่มต้นจากแพ็กเกจเดิม (services-data.js)
function minPrice(ids = []) {
  const p = ids.flatMap((id) => (svcOf(id)?.prices || []).filter((x) => x.price != null && !x.soon).map((x) => x.price));
  return p.length ? Math.min(...p) : null;
}
const baht = (n) => `${Number(n).toLocaleString('th-TH')} ฿`;

// ---------- สถานะตัวกรอง (จำใน URL เพื่อส่งลิงก์ต่อได้) ----------
const params = new URLSearchParams(location.search);
const state = {
  mode: params.get('mode') === 'method' ? 'method' : 'region',
  filter: params.get('f') || 'all',
};
function syncURL(extra = {}) {
  const u = new URL(location);
  u.searchParams.set('mode', state.mode);
  state.filter === 'all' ? u.searchParams.delete('f') : u.searchParams.set('f', state.filter);
  ['sci', 'opt'].forEach((k) => (extra[k] ? u.searchParams.set(k, extra[k]) : u.searchParams.delete(k)));
  history.replaceState(null, '', u);
}
const matches = (s) => state.filter === 'all' ||
  (state.mode === 'region' ? s.regions.includes(state.filter) : s.methods.includes(state.filter));

// ---------- ตัวกรอง ----------
document.querySelectorAll('.wm').forEach((b) => b.addEventListener('click', () => {
  state.mode = b.dataset.mode;
  state.filter = 'all';
  render();
}));
$('worldChips').addEventListener('click', (e) => {
  const c = e.target.closest('[data-f]');
  if (!c) return;
  state.filter = c.dataset.f;
  burst(e.clientX, e.clientY, 12, 70);
  render();
});

function render() {
  document.querySelectorAll('.wm').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === state.mode)));
  const list = state.mode === 'region' ? WORLD_REGIONS : WORLD_METHODS;
  const count = (id) => WORLD_SCIENCES.filter((s) => (state.mode === 'region' ? s.regions : s.methods).includes(id)).length;
  $('worldChips').innerHTML = [{ id: 'all', icon: '✦', name: 'ทั้งหมด' }, ...list]
    .filter((x) => x.id === 'all' || count(x.id))
    .map((x) => `<button class="chip" role="tab" data-f="${x.id}" aria-selected="${x.id === state.filter}"><span class="ci">${x.icon}</span>${x.name}<em class="cnt-s">${x.id === 'all' ? WORLD_SCIENCES.length : count(x.id)}</em></button>`)
    .join('');
  const sel = $('worldChips').querySelector('[aria-selected="true"]');
  if (sel) $('worldChips').scrollTo({ left: sel.offsetLeft - $('worldChips').clientWidth / 2 + sel.clientWidth / 2, behavior: 'smooth' });

  const m = state.mode === 'method' && WORLD_METHODS.find((x) => x.id === state.filter);
  $('worldNote').textContent = m ? m.desc : '';
  $('worldNote').hidden = !m;

  // หมวดหมู่หมอดู (เดิมอยู่หน้าแรก) แสดงในโหมด “ตามวิธีดู” หน้ารวม
  const showCats = state.mode === 'method' && state.filter === 'all';
  $('worldCats').hidden = !showCats;
  if (showCats) $('worldCats').innerHTML = `<div class="sec-head"><h3>หมวดหมู่หมอดู</h3><span class="sec-note">เลือกหมวด แล้วเลือกหมอดูที่ใช่</span></div>
    <div class="w-cat-grid">${CATEGORIES.map((c) => `<button class="w-cat" data-cat="${c.id}"><span class="cat-ico">${c.icon}</span><b>${esc(c.name)}</b><small>${esc(c.desc)}</small><em>${c.types.length} ประเภท ›</em></button>`).join('')}</div>
    <div class="sec-head w-sci-head"><h3>ศาสตร์ทั้งหมด</h3></div>`;

  // หมวดบริการรวม (เช่น เบอร์และทะเบียน)
  const showGroup = (g) => state.filter === 'all' ||
    (state.mode === 'method' && g.methods.includes(state.filter)) ||
    (state.mode === 'region' && g.sciences.some((id) => sciOf(id)?.regions.includes(state.filter)));
  $('worldGroups').innerHTML = WORLD_GROUPS.filter(showGroup).map(groupCard).join('');

  const items = WORLD_SCIENCES.filter(matches);
  $('worldList').innerHTML = items.length ? items.map(scienceCard).join('') : '<p class="empty">ยังไม่มีศาสตร์ในหมวดนี้</p>';
  syncURL();
}

function scienceCard(s, i) {
  const price = minPrice(s.packages);
  const hasPkg = !!(s.packages && s.packages.length);
  return `<article class="svc w-card" style="--delay:${Math.min(i, 8) * 0.04}s">
    <div class="svc-top">
      <span class="svc-icon">${regionIcon(s)}</span>
      <div><h3>${esc(s.th)}</h3><p class="w-intl">${esc(s.intl)}</p></div>
    </div>
    <div class="w-tags"><span>📍 ${esc(s.region)}</span>${s.methods.map((m) => `<span>${WORLD_METHODS.find((x) => x.id === m).icon} ${methodName(m)}</span>`).join('')}</div>
    <p class="w-desc">${esc(s.desc)}</p>
    <div class="svc-foot">
      <span class="price">${hasPkg ? (price != null ? `เริ่มต้น<strong>${baht(price)}</strong>` : 'แพ็กเกจ<strong>สอบถาม</strong>') : '<span class="info-only">มีเฉพาะข้อมูล</span>'}</span>
      ${hasPkg
        ? `<button class="btn-gold" data-sci="${s.id}">ดูแพ็กเกจ</button>`
        : `<button class="btn-ghost" data-sci="${s.id}">รู้จักศาสตร์นี้</button>`}
    </div>
  </article>`;
}

function groupCard(g) {
  const sci = g.sciences.map((id) => sciOf(id)).filter(Boolean);
  return `<article class="w-group">
    <div class="svc-top"><span class="svc-icon">${g.icon}</span><div><p class="w-kicker">หมวดบริการ</p><h3>${esc(g.name)}</h3></div></div>
    <p class="w-desc">${esc(g.desc)}</p>
    <p class="w-uses">ศาสตร์ที่ใช้: ${sci.map((s) => `<button class="link-chip" data-sci="${s.id}">${esc(s.th)}</button>`).join(' ')}</p>
    <div class="w-pkgs">${g.packages.map((id) => pkgRow(id)).join('')}</div>
  </article>`;
}

// แพ็กเกจ 1 รายการ (ดึงจาก services-data.js)
function pkgRow(id, optName = '') {
  const p = svcOf(id);
  if (!p) return '';
  const tiers = p.prices.map((t) => `<li><span>${esc(t.label)}${t.soon ? ' <small>เร็ว ๆ นี้</small>' : ''}</span><b>${t.price == null ? 'สอบถาม' : baht(t.price)}</b></li>`).join('');
  const title = optName && optName !== p.name ? `${p.name} · ${optName}` : p.name;
  return `<div class="w-pkg">
    <div class="w-pkg-head"><span>${p.icon}</span><b>${esc(title)}</b>${p.open ? '<em class="badge-s open">จองได้</em>' : '<em class="badge-s soon">เร็ว ๆ นี้</em>'}</div>
    <ul class="w-tiers">${tiers}</ul>
    <div class="w-pkg-actions">
      <button class="btn-ghost" data-pkg="${id}">ดูแพ็กเกจ</button>
      ${p.open ? `<button class="btn-gold" data-book="${id}" data-title="${esc(title)}">จองบริการ</button>` : ''}
    </div>
  </div>`;
}

// ---------- รายละเอียดศาสตร์ ----------
const dlg = $('worldDlg');
let current = null;
function openDetail(id, opt = '') {
  const s = sciOf(id);
  if (!s) return;
  current = s;
  const option = s.options && s.options.items.find((o) => o.name === opt);
  const pkgs = option ? [option.pkg] : (s.packages || []);
  $('wdBody').innerHTML = `
    <div class="book-head">
      <div class="book-icon">${regionIcon(s)}</div>
      <h2 id="wdTitle">${esc(s.th)}</h2>
      <p class="w-intl">${esc(s.intl)}</p>
    </div>
    <div class="w-tags center"><span>📍 ${esc(s.region)}</span>${s.methods.map((m) => `<span>${WORLD_METHODS.find((x) => x.id === m).icon} ${methodName(m)}</span>`).join('')}</div>
    <dl class="book-detail">
      <dt>ศาสตร์นี้คืออะไร</dt><dd>${esc(s.desc)}</dd>
      ${s.forms ? `<dt>รูปแบบ</dt><dd>${esc(s.forms)}</dd>` : ''}
      <dt>ข้อมูลที่ต้องใช้</dt><dd><ul class="w-needs">${s.needs.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></dd>
    </dl>
    ${s.options ? `<p class="w-sub">${esc(s.options.label)}</p>
      <div class="w-opts">${s.options.items.map((o) => `<button class="w-opt" data-opt="${esc(o.name)}" aria-pressed="${o.name === opt}"><span>${o.icon}</span>${esc(o.name)}</button>`).join('')}</div>` : ''}
    ${pkgs.length
      ? `<p class="w-sub">${option ? `แพ็กเกจสำหรับ “${esc(option.name)}”` : 'แพ็กเกจที่เกี่ยวข้อง'}</p>
         ${s.pkgNote ? `<p class="book-note">${esc(s.pkgNote)}</p>` : ''}
         <div class="w-pkgs">${pkgs.map((id) => pkgRow(id, option ? option.name : '')).join('')}</div>`
      : `<p class="book-note">ศาสตร์นี้มีเฉพาะข้อมูลให้รู้จัก ยังไม่เปิดเป็นบริการบนหมอดู.com</p>`}
    <p class="book-foot">ราคาเสนอทดลองตามแคตตาล็อก · โหมดทดลอง ยังไม่มีการเก็บเงินจริง</p>`;
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
  syncURL({ sci: s.id, opt: option ? option.name : '' });
}
function closeDetail() { dlg.close(); }
dlg.addEventListener('close', () => { current = null; syncURL(); });
$('wdClose').addEventListener('click', closeDetail);
dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDetail(); });

// ---------- คลิกทั้งหน้า ----------
document.addEventListener('click', (e) => {
  const cat = e.target.closest('[data-cat]');
  if (cat) {
    if (inPhone) window.parent.postMessage({ type: 'mohdoo-cat', id: cat.dataset.cat }, location.origin);
    return;
  }
  const sci = e.target.closest('[data-sci]');
  if (sci) { openDetail(sci.dataset.sci); return; }
  const opt = e.target.closest('[data-opt]');
  if (opt && current) { openDetail(current.id, opt.dataset.opt); return; }
  const pkg = e.target.closest('[data-pkg]');
  if (pkg) { location.href = `services.html?pkg=${pkg.dataset.pkg}`; return; }
  const book = e.target.closest('[data-book]');
  if (book) {
    if (inPhone) {
      dlg.close();
      window.parent.postMessage({ type: 'mohdoo-checkout', service: book.dataset.book, title: book.dataset.title }, location.origin);
    } else {
      location.href = `index.html?app=${encodeURIComponent(`services.html?pkg=${book.dataset.book}`)}`;
    }
  }
});

render();
// เปิดจากลิงก์ เช่น world.html?mode=region&f=china&sci=fengshui&opt=บ้าน
if (params.get('sci')) openDetail(params.get('sci'), params.get('opt') || '');
