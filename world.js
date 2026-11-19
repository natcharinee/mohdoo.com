// ===== ดูดวงตามประเภท / ดูดวงตามประเทศ (ตาม Mohdoo-Navigation-Claude-Spec) =====
// ข้อมูลกลาง: NAV_CATEGORIES · WORLD_REGIONS · WORLD_SCIENCES (world-data.js) และ SERVICES · TOPICS (services-data.js)
// ทั้งสองเมนูชี้ไปแพ็กเกจ id เดียวกัน → ราคาเดียวกันทุกเส้นทาง
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const svcOf = (id) => SERVICES.find((s) => s.id === id);
const sciOf = (id) => WORLD_SCIENCES.find((s) => s.id === id);
const catOf = (id) => NAV_CATEGORIES.find((c) => c.id === id);
const regionOf = (id) => WORLD_REGIONS.find((r) => r.id === id);
const topicOf = (id) => TOPICS.find((t) => t.id === id);
const methodName = (id) => WORLD_METHODS.find((m) => m.id === id)?.name || id;
const regionIcon = (s) => regionOf(s.regions[0])?.icon || '🌐';
const regionText = (s) => (s.regions.length ? s.regions.map((r) => regionOf(r)?.name).filter(Boolean).join(' · ') : 'หลายภูมิภาค / รอข้อมูลยืนยัน');
const inPhone = window.parent !== window;
const baht = (n) => `${Number(n).toLocaleString('th-TH')} ฿`;
function minPrice(ids = []) {
  const p = ids.flatMap((id) => (svcOf(id)?.prices || []).filter((x) => x.price != null && !x.soon).map((x) => x.price));
  return p.length ? Math.min(...p) : null;
}

// ---------- สถานะ (อยู่ใน URL · ย้อนกลับด้วยปุ่ม Back ได้ตามลำดับ) ----------
const state = {};
function readURL() {
  const q = new URLSearchParams(location.search);
  state.mode = q.get('mode') === 'method' ? 'method' : 'region';
  state.f = q.get('f') || 'all';
  state.sub = q.get('sub');
  state.topic = q.get('topic') || 'all';
}
function go(patch, push = true) {
  Object.assign(state, patch);
  const u = new URL(location);
  u.search = '';
  u.searchParams.set('mode', state.mode);
  if (state.f !== 'all') u.searchParams.set('f', state.f);
  if (state.sub != null) u.searchParams.set('sub', state.sub);
  if (state.topic !== 'all') u.searchParams.set('topic', state.topic);
  history[push ? 'pushState' : 'replaceState'](null, '', u);
  render();
  if (push) scrollTo({ top: 0, behavior: 'smooth' });
}
addEventListener('popstate', () => { readURL(); render(); });

// ---------- หัวหน้า ----------
const PAGE_HEAD = {
  region: { eyebrow: '✦ BY COUNTRY ✦', title: 'ดูดวงตามประเทศ', sub: 'ศาสตร์ตามสายประเพณีของแต่ละพื้นที่ เลือกประเทศแล้วดูว่าเหมาะกับเรื่องอะไร' },
  method: { eyebrow: '✦ BY TYPE ✦', title: 'ดูดวงตามประเภท', sub: 'เลือกสิ่งที่อยากดู แล้วเลือกแพ็กเกจหรืออ่านศาสตร์ที่เกี่ยวข้อง' },
};

// ---------- ชิ้นส่วน ----------
const topicChips = () => `<div class="wt-topics" role="tablist" aria-label="เรื่องที่อยากถาม"><small>เรื่องที่อยากถาม</small>${
  [{ id: 'all', icon: '✦', name: 'ทั้งหมด' }, ...TOPICS].map((t) =>
    `<button class="wt-topic" role="tab" data-topic="${t.id}" aria-selected="${state.topic === t.id}">${t.icon} ${esc(t.name)}</button>`).join('')}</div>`;
const fitTopic = (topics) => state.topic === 'all' || (topics || []).includes(state.topic);
const pkgFits = (id) => fitTopic(svcOf(id)?.topics);
const sciFits = (s) => fitTopic(s.topics);
const heading = (icon, title, sub) => `<div class="wl-head"><span>${icon}</span><div><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}</div></div>`;

function categoryCard(c) {
  const tags = c.subs.map((x) => x.name);
  return `<button class="wc-card wt-card" data-go-cat="${c.id}"><span class="wc-bg" aria-hidden="true">${c.icon}</span>
    <span class="wc-left"><span class="wc-flag">${c.icon}</span></span>
    <span class="wc-tx"><b>${esc(c.name)}</b><small>${esc(c.desc)}</small>
      <span class="wc-sci">${tags.slice(0, 4).map((n) => `<i>${esc(n)}</i>`).join('')}${tags.length > 4 ? `<i class="more">อีก ${tags.length - 4}</i>` : ''}</span></span></button>`;
}
function subCard(c, x, i) {
  const pk = x.pkg.filter(pkgFits);
  const price = minPrice(pk);
  const sci = x.sci.map(sciOf).filter(Boolean);
  return `<button class="ws-card" data-go-sub="${i}">
    <b>${esc(x.name)}</b>
    ${sci.length ? `<span class="ws-sci">${sci.map((s) => `<i>${regionIcon(s)} ${esc(s.th)}</i>`).join('')}</span>` : ''}
    <span class="ws-foot">${x.pkg.length ? (price != null ? `${pk.length} แพ็กเกจ · เริ่ม <strong>${baht(price)}</strong>` : `${x.pkg.length} แพ็กเกจ · รอเปิดจอง`) : '<span class="info-only">มีเฉพาะหน้ารู้จักศาสตร์</span>'}<em>›</em></span>
  </button>`;
}
function countryCard(x) {
  const names = WORLD_SCIENCES.filter((sc) => sc.regions.includes(x.id)).map((sc) => sc.th);
  return `<button class="wc-card" data-go-region="${x.id}"><span class="wc-bg" aria-hidden="true">${x.icon}</span>
    <span class="wc-left"><span class="wc-flag">${x.icon}</span><b>${esc(x.name)}</b></span>
    <span class="wc-tx"><span class="wc-sci">${names.map((n) => `<i>${esc(n)}</i>`).join('')}</span></span></button>`;
}
function scienceCard(s, i) {
  const price = minPrice(s.packages);
  const hasPkg = !!(s.packages && s.packages.length);
  return `<article class="svc w-card" style="--delay:${Math.min(i, 8) * 0.04}s">
    <div class="svc-top"><span class="svc-icon">${regionIcon(s)}</span>
      <div><h3>${esc(s.th)}</h3><p class="w-intl">${esc(s.intl)}</p></div></div>
    <p class="w-short">${esc(s.short || s.desc)}</p>
    ${s.good ? `<div class="w-good"><small>เหมาะกับ</small>${s.good.map((g) => `<span>${GOOD_ICON[g] || '✦'} ${esc(g)}</span>`).join('')}</div>` : ''}
    <div class="w-tags"><span>📍 ${esc(regionText(s))}</span>${s.methods.map((m) => `<span>${WORLD_METHODS.find((x) => x.id === m).icon} ${methodName(m)}</span>`).join('')}</div>
    <div class="svc-foot">
      <span class="price">${hasPkg ? (price != null ? `เริ่มต้น<strong>${baht(price)}</strong>` : 'แพ็กเกจ<strong>รอเปิดจอง</strong>') : '<span class="info-only">มีเฉพาะข้อมูล</span>'}</span>
      ${hasPkg ? `<button class="btn-gold" data-sci="${s.id}">ดูแพ็กเกจ</button>` : `<button class="btn-ghost" data-sci="${s.id}">รู้จักศาสตร์นี้</button>`}
    </div>
  </article>`;
}
// แพ็กเกจ 1 รายการ: ราคา · เวลาส่ง · สถานะ (ดึงจาก SERVICES ชุดเดียว)
function pkgRow(id, optName = '') {
  const p = svcOf(id);
  if (!p) return '';
  const tiers = p.prices.map((t) => `<li><span>${esc(t.label)}</span><b>${t.price == null ? 'ตามใบเสนอราคา' : baht(t.price)}</b></li>`).join('');
  const title = optName && !p.name.includes(optName) ? `${p.name} · ${optName}` : p.name;
  return `<div class="w-pkg">
    <div class="w-pkg-head"><span>${p.icon}</span><b>${esc(title)}</b>${p.open ? '<em class="badge-s open">จองได้</em>' : '<em class="badge-s soon">รอเปิดจอง</em>'}</div>
    <p class="w-pkg-get">${esc(p.get)}</p>
    <ul class="w-tiers">${tiers}<li><span>เวลาส่งผล</span><b class="${p.delivery ? '' : 'tbd'}">${esc(p.delivery || 'รอระบุ')}</b></li></ul>
    <div class="w-pkg-actions">
      <button class="btn-ghost" data-pkg="${id}">ดูรายละเอียด</button>
      ${p.open ? `<button class="btn-gold" data-book="${id}" data-title="${esc(title)}">จองบริการ</button>` : ''}
    </div>
  </div>`;
}

// ---------- วาดหน้า ----------
function render() {
  const head = PAGE_HEAD[state.mode];
  document.querySelector('.world-mode').hidden = true;
  $('worldChips').hidden = true;
  $('worldCats').hidden = true;
  $('worldNote').hidden = true;
  $('worldGroups').innerHTML = '';
  $('worldCountries').hidden = false;
  document.querySelector('.page-head .eyebrow').textContent = head.eyebrow;
  document.querySelector('.page-head .page-title').textContent = head.title;
  document.querySelector('.page-head .subtitle').textContent = head.sub;
  document.title = `${head.title} — หมอดู.com`;
  if (inPhone) { try { window.parent.document.getElementById('frameTitle').textContent = head.title; } catch (_) {} }
  state.mode === 'method' ? renderTypes() : renderCountries();
}

// ดูดวงตามประเภท: หมวด → หมวดย่อย → แพ็กเกจ
function renderTypes() {
  const c = catOf(state.f);
  const sub = c && state.sub != null ? c.subs[+state.sub] : null;
  const top = $('worldCountries');
  const list = $('worldList');
  if (!c) {
    top.innerHTML = `<div class="wc-grid wt-grid">${NAV_CATEGORIES.map(categoryCard).join('')}</div>`;
    list.hidden = true;
    return;
  }
  list.hidden = false;
  if (!sub) {
    top.innerHTML = `<button class="wc-back" data-back>‹ ทุกประเภท</button>
      <div class="wc-hero"><span class="wc-flag">${c.icon}</span><div><h2>${esc(c.name)}</h2><p>${esc(c.desc)}</p></div></div>${topicChips()}`;
    const subs = c.subs.map((x, i) => [x, i]).filter(([x]) => state.topic === 'all' || x.pkg.some(pkgFits) || x.sci.map(sciOf).filter(Boolean).some(sciFits));
    list.innerHTML = `<div class="ws-grid wl-full">${subs.length ? subs.map(([x, i]) => subCard(c, x, i)).join('') : '<p class="empty">ยังไม่มีรายการสำหรับเรื่องนี้</p>'}</div>`;
    return;
  }
  top.innerHTML = `<button class="wc-back" data-back>‹ ${esc(c.name)}</button>
    <div class="wc-hero"><span class="wc-flag">${c.icon}</span><div><p class="wc-crumb">${esc(c.name)}</p><h2>${esc(sub.name)}</h2>${sub.note ? `<p>${esc(sub.note)}</p>` : ''}</div></div>${topicChips()}`;
  const pk = sub.pkg.filter(pkgFits);
  const sci = sub.sci.map(sciOf).filter(Boolean);
  const sciShown = sci.filter(sciFits);
  list.innerHTML =
    heading('🛎️', 'แพ็กเกจ', sub.pkg.length ? `ค่าบริการ ${baht(SERVICE_PRICE)} · ราคาเดียวกันทุกเส้นทาง` : '') +
    (sub.pkg.length
      ? (pk.length ? `<div class="w-pkgs wl-full">${pk.map((id) => pkgRow(id, c.subs.filter((x) => x.pkg.includes(id)).length > 1 ? sub.name : '')).join('')}</div>` : '<p class="empty wl-full">ไม่มีแพ็กเกจสำหรับเรื่องนี้ ลองเลือก “ทั้งหมด”</p>')
      : '<p class="book-note wl-full">ยังไม่มีแพ็กเกจที่เปิดรับ อ่านหน้ารู้จักศาสตร์ด้านล่างได้</p>') +
    (sci.length ? heading('📚', 'ศาสตร์ที่ใช้', 'แต่ละศาสตร์เหมาะกับเรื่องไหน กดอ่านรายละเอียดได้') + (sciShown.length ? sciShown : sci).map(scienceCard).join('') : '');
}

// ดูดวงตามประเทศ: โซน → ประเทศ → ศาสตร์
const COUNTRY_ZONES = [
  { name: 'แนะนำ', icon: '✦', ids: ['thailand', 'china'], feature: true },
  { name: 'เอเชีย', icon: '⛩️', ids: ['japan', 'korea', 'india', 'himalaya'] },
  { name: 'เพื่อนบ้านอาเซียน', icon: '🛕', ids: ['myanmar', 'laos', 'cambodia'] },
  { name: 'ตะวันตก ตะวันออกกลาง และแอฟริกา', icon: '🌐', ids: ['europe', 'turkey', 'arab-persian', 'west-africa', 'madagascar'] },
];
function renderCountries() {
  const r = regionOf(state.f);
  const top = $('worldCountries');
  const list = $('worldList');
  const count = (id) => WORLD_SCIENCES.filter((s) => s.regions.includes(id)).length;
  if (!r) {
    top.innerHTML = COUNTRY_ZONES.map((z) => {
      const regions = z.ids.map(regionOf).filter((x) => x && count(x.id));
      if (!regions.length) return '';
      return `<section class="wc-zone ${z.feature ? 'feature' : ''} ${regions.length === 4 ? 'quad' : ''}">
        <h3 class="wc-zh"><span>${z.icon}</span>${z.name}</h3><div class="wc-grid">${regions.map(countryCard).join('')}</div></section>`;
    }).join('') + '<p class="wc-note">ชื่อประเทศสื่อถึงสายประเพณีที่ใช้ในพื้นที่นั้น หลายศาสตร์มีประวัติถ่ายทอดข้ามประเทศ</p>';
    list.hidden = true;
    return;
  }
  const sci = WORLD_SCIENCES.filter((s) => s.regions.includes(r.id));
  const cats = [...new Set(sci.flatMap((s) => s.categoryIds))].map(catOf).filter(Boolean);
  top.innerHTML = `<button class="wc-back" data-back>‹ ทุกประเทศ</button>
    <div class="wc-hero"><span class="wc-flag">${r.icon}</span><div><h2>${esc(r.name)}</h2><p>${sci.map((s) => esc(s.th)).join(' · ')}</p></div></div>
    ${cats.length ? `<div class="wc-cats"><small>หมวดที่เกี่ยวข้อง</small>${cats.map((c) => `<button data-go-cat="${c.id}">${c.icon} ${esc(c.name)}</button>`).join('')}</div>` : ''}
    ${topicChips()}`;
  const shown = sci.filter(sciFits);
  list.hidden = false;
  list.innerHTML = shown.length ? shown.map(scienceCard).join('') : '<p class="empty wl-full">ไม่มีศาสตร์สำหรับเรื่องนี้ในประเทศนี้ ลองเลือก “ทั้งหมด”</p>';
}

// ---------- หน้ารู้จักศาสตร์ / รายละเอียดแพ็กเกจ (หน้าต่างเดียวกัน) ----------
const dlg = $('worldDlg');
let current = null;
function openDetail(id, opt = '') {
  const s = sciOf(id);
  if (!s) return;
  current = s;
  const option = s.options && s.options.items.find((o) => o.name === opt);
  const pkgs = (option ? [option.pkg] : (s.packages || [])).filter(Boolean);
  const cats = s.categoryIds.map(catOf).filter(Boolean);
  $('wdBody').innerHTML = `
    <div class="book-head"><div class="book-icon">${regionIcon(s)}</div><h2 id="wdTitle">${esc(s.th)}</h2><p class="w-intl">${esc(s.intl)}</p></div>
    <div class="w-tags center"><span>📍 ${esc(regionText(s))}</span>${s.methods.map((m) => `<span>${WORLD_METHODS.find((x) => x.id === m).icon} ${methodName(m)}</span>`).join('')}</div>
    <dl class="book-detail">
      <dt>ศาสตร์นี้คืออะไร</dt><dd>${esc(s.desc)}</dd>
      <dt>วิธีดู</dt><dd>${s.methods.map(methodName).join(' · ')}${s.forms ? ` — ${esc(s.forms)}` : ''}</dd>
      <dt>ข้อมูลที่ต้องใช้</dt><dd><ul class="w-needs">${s.needs.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></dd>
      ${s.topics.length ? `<dt>เรื่องที่รับปรึกษา</dt><dd><div class="w-good">${s.topics.map((t) => `<span>${topicOf(t).icon} ${esc(topicOf(t).name)}</span>`).join('')}</div></dd>` : ''}
      ${cats.length ? `<dt>หมวดที่เกี่ยวข้อง</dt><dd>${cats.map((c) => `${c.icon} ${esc(c.name)}`).join(' · ')}</dd>` : ''}
    </dl>
    ${s.options ? `<p class="w-sub">${esc(s.options.label)}</p>
      <div class="w-opts">${s.options.items.map((o) => `<button class="w-opt" data-opt="${esc(o.name)}" aria-pressed="${o.name === opt}"><span>${o.icon}</span>${esc(o.name)}</button>`).join('')}</div>` : ''}
    ${pkgs.length
      ? `<p class="w-sub">${option ? `แพ็กเกจสำหรับ “${esc(option.name)}”` : 'แพ็กเกจที่เปิดรับ'}</p><div class="w-pkgs">${pkgs.map((pid) => pkgRow(pid, option ? option.name : '')).join('')}</div>`
      : '<p class="book-note">ศาสตร์นี้มีเฉพาะหน้ารู้จักศาสตร์ ยังไม่เปิดเป็นแพ็กเกจบนหมอดู.com</p>'}
    <p class="book-foot">ราคาเสนอทดลอง · โหมดทดลอง ยังไม่มีการเก็บเงินจริง</p>`;
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
}
function openPackage(id) {
  const p = svcOf(id);
  if (!p) return;
  const from = current;
  const sci = WORLD_SCIENCES.filter((s) => (s.packages || []).includes(id));
  const cats = NAV_CATEGORIES.filter((c) => c.subs.some((x) => x.pkg.includes(id)));
  $('wdBody').innerHTML = `
    ${from ? `<button class="wc-back" data-back-sci="${from.id}">‹ ${esc(from.th)}</button>` : ''}
    <div class="book-head"><div class="book-icon">${p.icon}</div><h2 id="wdTitle">${esc(p.name)}</h2>
      <p class="w-intl">${p.open ? '<span class="badge-s open">เปิดจอง</span>' : '<span class="badge-s soon">รอเปิดจอง</span>'}</p></div>
    <dl class="book-detail">
      <dt>รายละเอียด</dt><dd>${esc(p.about)}</dd>
      <dt>สิ่งที่ได้รับ</dt><dd>${esc(p.get)}</dd>
      <dt>ราคา</dt><dd>${p.prices.map((t) => `${esc(t.label)} · <b>${t.price == null ? 'ตามใบเสนอราคา' : baht(t.price)}</b>`).join('<br>')}</dd>
      ${p.duration ? `<dt>ระยะเวลา</dt><dd>${esc(p.duration)}</dd>` : ''}
      <dt>เวลาส่งผล</dt><dd>${esc(p.delivery || 'รอระบุ')}</dd>
      ${p.topics?.length ? `<dt>เรื่องที่รับปรึกษา</dt><dd><div class="w-good">${p.topics.map((t) => `<span>${topicOf(t).icon} ${esc(topicOf(t).name)}</span>`).join('')}</div></dd>` : ''}
      ${sci.length ? `<dt>ศาสตร์ที่ใช้</dt><dd>${sci.map((s) => `<button class="link-chip" data-sci="${s.id}">${esc(s.th)}</button>`).join(' ')}</dd>` : ''}
      ${cats.length ? `<dt>อยู่ในหมวด</dt><dd>${cats.map((c) => `${c.icon} ${esc(c.name)}`).join(' · ')}</dd>` : ''}
      ${p.note ? `<dt>หมายเหตุ</dt><dd>${esc(p.note)}</dd>` : ''}
    </dl>
    ${p.open
      ? `<button class="btn-gold full" data-book="${p.id}" data-title="${esc(p.name)}">จองบริการ ›</button>`
      : '<button class="btn-ghost full" data-notify>แจ้งเตือนฉันเมื่อเปิดจอง</button>'}
    <p class="book-foot">ผู้ให้บริการ ขอบเขต เวลาส่ง และราคาจริงรอทีมยืนยัน · โหมดทดลอง ยังไม่มีการเก็บเงินจริง</p>`;
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
}
dlg.addEventListener('close', () => { current = null; });
$('wdClose').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

// ---------- คลิกทั้งหน้า ----------
document.addEventListener('click', (e) => {
  const t = e.target;
  const back = t.closest('[data-back]');
  if (back) {
    if (state.sub != null) go({ sub: null }); else go({ f: 'all', sub: null, topic: 'all' });
    return;
  }
  const gc = t.closest('[data-go-cat]');
  if (gc) { go({ mode: 'method', f: gc.dataset.goCat, sub: null }); return; }
  const gs = t.closest('[data-go-sub]');
  if (gs) { go({ sub: gs.dataset.goSub }); return; }
  const gr = t.closest('[data-go-region]');
  if (gr) { go({ f: gr.dataset.goRegion, sub: null, topic: 'all' }); return; }
  const tp = t.closest('[data-topic]');
  if (tp) { go({ topic: tp.dataset.topic }, false); burst(e.clientX, e.clientY, 10, 60); return; }
  const bs = t.closest('[data-back-sci]');
  if (bs) { openDetail(bs.dataset.backSci); return; }
  const sci = t.closest('[data-sci]');
  if (sci) { openDetail(sci.dataset.sci); return; }
  const opt = t.closest('[data-opt]');
  if (opt && current) { openDetail(current.id, opt.dataset.opt); return; }
  const pkg = t.closest('[data-pkg]');
  if (pkg) { openPackage(pkg.dataset.pkg); return; }
  if (t.closest('[data-notify]')) { toast('เราจะแจ้งเตือนเมื่อเปิดจอง (ตัวอย่าง — ยังไม่เชื่อมระบบหลังบ้าน)'); return; }
  const book = t.closest('[data-book]');
  if (book) {
    if (inPhone) {
      dlg.close();
      window.parent.postMessage({ type: 'mohdoo-checkout', service: book.dataset.book, title: book.dataset.title }, location.origin);
    } else {
      location.href = `index.html?app=${encodeURIComponent(`services.html?pkg=${book.dataset.book}`)}`;
    }
  }
});

readURL();
render();
// ลิงก์ตรง เช่น world.html?mode=region&f=china&sci=fengshui&opt=คอนโด หรือ &pkg=fs-condo
const q0 = new URLSearchParams(location.search);
if (q0.get('sci')) openDetail(q0.get('sci'), q0.get('opt') || '');
else if (q0.get('pkg')) openPackage(q0.get('pkg'));
