// ===== แท็บ “มงคล”: 2 ส่วน → บริการมงคล (ทำบุญ · แก้ดวง) และ วัตถุมงคล (ร้านค้า) =====
// สัดส่วนตามแผนธุรกิจ: ดูดวง 80% · ขายของ 20% → ร้านค้าเป็นส่วนเสริมในแท็บนี้
// ราคาสินค้าเป็นราคาตัวอย่าง (ยังไม่มีสต็อกและระบบจัดส่งจริง)

// รายการสินค้าอยู่ใน shop-data.js (ใช้ร่วมกับเซิร์ฟเวอร์เพื่อคิดราคา)

const mongkolPanel = makePanel('mongkolPanel', 'มงคล');
const mongkolBody = mongkolPanel.querySelector('.panel-body');

let mkTab = 'service';
function renderMongkol() {
  if (Date.now() - (renderMongkol.at || 0) > 60e3) { // โหลดสต๊อกใหม่ (ไม่เกินนาทีละครั้ง) แล้ววาดใหม่
    renderMongkol.at = Date.now();
    loadShopStock().then(() => { if (window.SERVER) renderMongkol(); });
  }
  const u = currentUser();
  const day = u && u.birthdate ? DAY_COLORS[birthParts(u).date.getDay()] : null;
  const merit = SERVICES.filter((s) => s.group === 'merit' && !s.hidden);
  mongkolBody.innerHTML = `
    <div class="mk-switch" role="tablist" aria-label="มงคล">
      <button role="tab" data-mk="service" aria-selected="${mkTab === 'service'}"><span>🪷</span>บริการมงคล</button>
      <button role="tab" data-mk="items" aria-selected="${mkTab === 'items'}"><span>📿</span>วัตถุมงคล</button>
    </div>

    <section class="mk-sec" ${mkTab === 'service' ? '' : 'hidden'}>
      <div class="mk-hero">
        <span class="mk-ico">🪷</span>
        <div><h3>บริการมงคล</h3><p>ทำบุญ ไหว้พระ สะเดาะเคราะห์ และแก้ปีชงแทนคุณ ทีมงานทำพิธีที่สถานที่จริง แล้วส่งรูปและวิดีโอยืนยัน</p></div>
      </div>
      <section class="mk-steps">
        <h4>ขั้นตอนการทำพิธีแทนคุณ</h4>
        <ol>
          <li><span class="ms-ico">📝</span><em>1</em><b>จองและแจ้งชื่อ</b><small>ใส่ชื่อผู้รับบุญ คำอธิษฐาน และเลือกสถานที่</small></li>
          <li><span class="ms-ico">🛕</span><em>2</em><b>ทีมทำพิธีแทนคุณ</b><small>ทำพิธีที่วัดหรือสถานที่จริงตามที่เลือก</small></li>
          <li><span class="ms-ico">📸</span><em>3</em><b>รับรูปและวิดีโอยืนยัน</b><small>ส่งให้ภายใน 3 วัน ดูได้ใน “ประวัติบริการมงคล”</small></li>
        </ol>
      </section>
      <div class="sec-head"><h3>ทำบุญ · แก้ดวงออนไลน์</h3><span class="sec-note">ค่าบริการ ${baht(SERVICE_PRICE)}</span></div>
      <div class="mk-grid">${merit.map((s) => `
        <article class="mk-card">
          <span class="mk-ci">${s.icon}</span>
          <b>${esc(s.name)}</b>
          <p>${esc(s.about)}</p>
          <button class="btn-gold" data-merit="${s.id}">จองพิธี ›</button>
        </article>`).join('')}</div>
      ${placesHTML()}
    </section>

    <section class="mk-sec" ${mkTab === 'items' ? '' : 'hidden'}>
      <div class="mk-hero">
        <span class="mk-ico">📿</span>
        <div><h3>วัตถุมงคล</h3><p>เครื่องราง หินมงคล และของเสริมดวง เลือกสีและแบบตามวันเกิดของคุณ</p></div>
      </div>
      <div class="sec-head"><h3>สินค้าแนะนำ</h3><span class="sec-note">ราคาตัวอย่าง</span></div>
      ${day ? `<p class="mk-tip">✦ คุณเกิดวัน${day.day} สีประจำวันเกิดคือ <b>สี${day.birth}</b> · สีเสริมการเงิน <b>สี${day.money}</b></p>` : ''}
      ${shopOpen && SHOP_ITEMS.find((p) => p.id === shopOpen) ? shopDetail(SHOP_ITEMS.find((p) => p.id === shopOpen), day) : `<div class="mk-shop">${SHOP_ITEMS.filter((p) => !p.hidden).map((p) => shopCard(p, day)).join('')}</div>`}
    </section>

    <button class="btn-ghost full mk-all" data-all>ดูบริการดูดวงทั้งหมด ›</button>
    <p class="pf-note">โหมดทดลอง · ยังไม่มีการเก็บเงินและจัดส่งจริง รายชื่อสถานที่เป็นตัวอย่าง รอยืนยันพาร์ทเนอร์</p>`;
}

// ---------- สถานที่ทำพิธี: แยกตามภาค + เรื่องที่อยากขอ (places-data.js) ----------
let plRegion = 'feat';   // 'feat' = วัดแนะนำ หรือ id ภาค
let plWish = 'all';
let plMore = false;
let plOpen = null;       // สถานที่ที่กำลังเลือกพิธี
const PL_SHOW = 12;
const RITUALS = [['merit', '🙏', 'ทำบุญแทน'], ['pray', '🛕', 'ไหว้พระแทน'], ['sadoh', '🕊️', 'สะเดาะเคราะห์'], ['pichong', '🏮', 'แก้ปีชง']];
const wishOf = (id) => PLACE_WISHES.find((w) => w.id === id);
function placesHTML() {
  const inRegion = PLACES.filter((p) => (plRegion === 'feat' ? p.feat : p.region === plRegion));
  const list = inRegion.filter((p) => plWish === 'all' || p.tags.includes(plWish));
  const wishes = PLACE_WISHES.filter((w) => inRegion.some((p) => p.tags.includes(w.id)));
  const shown = plMore ? list : list.slice(0, PL_SHOW);
  const chip = (attr, id, label, on, n) => `<button class="pl-chip ${on ? 'on' : ''}" ${attr}="${id}" aria-pressed="${on}">${label}${n != null ? `<em>${n}</em>` : ''}</button>`;
  const card = (p) => `<article class="pl-card ${plOpen === p.no ? 'open' : ''}">
      <div class="pl-top"><span class="pl-ico">${p.icon}</span>
        <div class="pl-name"><b>${esc(p.name)}</b><small>📍 ${esc(p.loc)}</small></div>
        ${p.feat ? '<span class="pl-feat">✦ แนะนำ</span>' : ''}</div>
      <p class="pl-deity"><span>องค์สักการะ</span>${esc(p.deity)}</p>
      <p class="pl-good">${esc(p.good)}</p>
      <div class="pl-tags">${p.tags.filter((t) => t !== 'general').map((t) => `<span>${wishOf(t).icon} ${wishOf(t).name}</span>`).join('') || '<span>🙏 ขอพรทั่วไป</span>'}</div>
      ${plOpen === p.no
        ? `<div class="pl-pick"><small>เลือกพิธีที่ให้ทีมทำแทนที่นี่</small><div>${RITUALS
            .filter(([id]) => id !== 'pichong' || p.tags.includes('chong'))
            .map(([id, icon, name]) => `<button class="btn-gold" data-pl-book="${p.no}|${id}">${icon} ${name}</button>`).join('')}</div>
            <button class="link" data-pl-open="">ยกเลิก</button></div>`
        : `<button class="btn-ghost pl-book" data-pl-open="${p.no}">จองพิธีที่นี่ ›</button>`}
    </article>`;
  return `<section class="pl">
    <div class="sec-head"><h3>สถานที่ทำพิธี</h3><span class="sec-note">${PLACES.length} แห่งทั่วไทย</span></div>
    <p class="pl-lead">เลือกวัดหรือศาลที่อยากให้ทีมไปทำพิธีแทน แยกตามภาคและเรื่องที่อยากขอพร</p>
    <div class="pl-regions">${chip('data-pl-region', 'feat', '✦ วัดเด่นแนะนำ', plRegion === 'feat')}${PLACE_REGIONS.map((r) =>
      chip('data-pl-region', r.id, `${r.icon} ${r.name}`, plRegion === r.id, PLACES.filter((p) => p.region === r.id).length)).join('')}</div>
    <div class="pl-wishes">${chip('data-pl-wish', 'all', 'ทุกเรื่อง', plWish === 'all')}${wishes.map((w) =>
      chip('data-pl-wish', w.id, `${w.icon} ${w.name}`, plWish === w.id)).join('')}</div>
    ${list.length ? `<div class="pl-grid">${shown.map(card).join('')}</div>` : '<p class="pf-empty">ยังไม่มีสถานที่สำหรับเรื่องนี้ในภาคนี้ ลองเลือกภาคอื่นดูนะคะ</p>'}
    ${!plMore && list.length > PL_SHOW ? `<button class="btn-ghost full pl-more" data-pl-more>ดูเพิ่มอีก ${list.length - PL_SHOW} แห่ง ›</button>` : ''}
    <p class="pf-note">ข้อมูลสถานที่และเรื่องที่ขอพรเป็นความเชื่อของผู้ศรัทธา · ก่อนทำพิธี ทีมจะยืนยันเวลาเปิดและข้อกำหนดของสถานที่อีกครั้ง</p>
  </section>`;
}

// สต๊อกจากระบบหลังบ้าน (ไม่มีในรายการ = ไม่จำกัด) · โหมดทดลองไม่มีสต๊อก
let shopStock = {};
async function loadShopStock() {
  if (typeof serverReady !== 'undefined') await serverReady;
  if (!window.SERVER) return shopStock;
  try { shopStock = (await srv('shop/stock')).stock || {}; } catch (_) {}
  return shopStock;
}
const stockBadge = (p) => {
  const q = shopStock[p.id];
  if (p.digital || q == null) return '';
  return q > 0 && q <= 5 ? `<em class="mk-stock">เหลือ ${q} ชิ้น</em>` : ''; // หมดแล้ว → ปุ่มขึ้น “สินค้าหมด” แทน
};
// รูปสินค้าโหลดไม่ได้ → แสดงไอคอนอีโมจิแทน (ฟังที่ document แทน onerror ในหน้า เพื่อให้ CSP ห้ามสคริปต์ในหน้าได้)
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img && img.tagName === 'IMG' && img.dataset.fallback !== undefined && img.closest('.mk-pi')) img.replaceWith(document.createTextNode(img.dataset.fallback));
}, true);

// ---- สินค้า: การ์ด · หน้ารายละเอียด (รูปหลายรูป + ตัวเลือก) ----
let shopOpen = null, shopPick = {}; // shopPick: { [groupId]: valueId } ของสินค้าที่เปิดอยู่
const hasOpts = (p) => (p.options || []).some((g) => g.values && g.values.length);
const stockOfKey = (p, key) => (p.digital ? null : shopStock[key ? `${p.id}:${key}` : p.id] ?? null);
const priceRange = (p) => {
  const v = shopVariants(p).filter((x) => !x.off);
  if (!v.length) return baht(p.price);
  const lo = Math.min(...v.map((x) => x.price)), hi = Math.max(...v.map((x) => x.price));
  return lo === hi ? baht(lo) : `${baht(lo)} – ${baht(hi)}`;
};
const variantSoldOut = (p, v) => v.off || stockOfKey(p, v.key) === 0;
function shopCard(p, day) {
  const imgs = shopImages(p), opts = hasOpts(p);
  const allOut = opts ? shopVariants(p).every((v) => variantSoldOut(p, v)) : !p.digital && shopStock[p.id] === 0;
  const detail = opts || imgs.length > 1;
  return `<article class="mk-item">
    <span class="mk-pi">${imgs[0] ? `<img src="${esc(imgs[0])}" alt="" loading="lazy" width="56" height="56" data-fallback="${esc(p.icon)}">` : p.icon}</span>
    <div class="mk-it"><b>${esc(p.name)}</b><small>${esc(p.personal && day ? `${p.desc} · ของคุณ: สี${day.birth}` : p.desc)}</small>${imgs.length > 1 ? `<small class="mk-more">${imgs.length} รูป</small>` : ''}</div>
    <div class="mk-buy"><b>${priceRange(p)}</b>${opts ? '' : stockBadge(p)}<button class="btn-ghost" ${detail ? `data-shop-open="${p.id}"` : `data-shop="${p.id}"`} ${allOut ? 'disabled' : ''}>${allOut ? 'สินค้าหมด' : opts ? 'เลือกแบบ' : detail ? 'ดูรูป' : 'สั่งซื้อ'}</button></div>
  </article>`;
}
// เลือกแบบที่ผูกรูปไว้ → เลื่อนแกลเลอรีไปที่รูปนั้น (หลังวาดหน้าใหม่)
function showVariantImage() {
  const gal = mongkolBody.querySelector('.mk-gal'), w = gal && gal.querySelector('[data-want]');
  if (gal && w) gal.scrollLeft = gal.clientWidth * +w.dataset.gal;
}
function pickedVariant(p) {
  const groups = (p.options || []).filter((g) => g.values && g.values.length);
  if (!groups.length || groups.some((g) => !shopPick[g.id])) return null;
  const key = groups.map((g) => shopPick[g.id]).join('.');
  return shopVariants(p).find((v) => v.key === key) || null;
}
function shopDetail(p, day) {
  const imgs = shopImages(p), groups = (p.options || []).filter((g) => g.values && g.values.length);
  const v = pickedVariant(p);
  const q = v ? stockOfKey(p, v.key) : groups.length ? null : stockOfKey(p, '');
  const out = v ? variantSoldOut(p, v) : !groups.length && q === 0;
  const chips = groups.map((g) => `<fieldset class="mk-opt"><legend>${esc(g.name)}</legend><div>${g.values.map((x) => {
    // ค่านี้ปิดขายทั้งหมด/ของหมดทุกแบบที่มีค่านี้ → ทำเป็นสีจาง กดไม่ได้
    const dead = shopVariants(p).filter((y) => y.ids.includes(x.id)).every((y) => variantSoldOut(p, y));
    return `<button type="button" class="mk-chip ${shopPick[g.id] === x.id ? 'on' : ''}" data-shop-pick="${g.id}|${x.id}" aria-pressed="${shopPick[g.id] === x.id}" ${dead ? 'disabled' : ''}>${esc(x.label)}</button>`;
  }).join('')}</div></fieldset>`).join('');
  const shownImg = (v && v.img) || '';
  return `<article class="mk-detail">
    <button class="link mk-back" data-shop-open="">‹ กลับไปรายการสินค้า</button>
    ${imgs.length ? `<div class="mk-gal" tabindex="0" aria-label="รูปสินค้า ${imgs.length} รูป">${imgs.map((u, i) => `<img src="${esc(u)}" alt="${esc(p.name)} รูปที่ ${i + 1}" ${i ? 'loading="lazy"' : ''} data-gal="${i}" ${shownImg === u ? 'data-want="1"' : ''}>`).join('')}</div>
      ${imgs.length > 1 ? `<div class="mk-thumbs">${imgs.map((u, i) => `<button type="button" data-shop-img="${i}" aria-label="ดูรูปที่ ${i + 1}"><img src="${esc(u)}" alt="" width="44" height="44" loading="lazy"></button>`).join('')}</div>` : ''}`
      : `<div class="mk-noimg">${p.icon}</div>`}
    <h4>${esc(p.name)}</h4><p class="mk-desc">${esc(p.personal && day ? `${p.desc} · ของคุณ: สี${day.birth}` : p.desc)}</p>
    ${chips}
    <p class="mk-price"><b>${v ? baht(v.price) : priceRange(p)}</b>${q != null && q > 0 && q <= 5 ? `<em class="mk-stock">เหลือ ${q} ชิ้น</em>` : ''}${out ? '<em class="mk-stock">หมด</em>' : ''}</p>
    ${v ? `<p class="mk-sel">เลือก: ${esc(v.label)}</p>` : groups.length ? '<p class="mk-sel">เลือกให้ครบทุกตัวเลือกก่อนสั่งซื้อ</p>' : ''}
    <button class="btn-gold full" data-shop="${p.id}" ${out || (groups.length && !v) ? 'disabled' : ''}>${out ? 'สินค้าหมด' : 'สั่งซื้อ'}</button>
  </article>`;
}
function shopItem(p, variant) {
  const u = currentUser();
  const day = u && u.birthdate ? DAY_COLORS[birthParts(u).date.getDay()] : null;
  return {
    key: `shop:${p.id}`, icon: p.icon, title: p.name,
    sub: p.personal && day ? `${p.desc} · สีของคุณ: สี${day.birth}` : p.desc,
    tiers: [{ label: (p.digital ? '1 ไฟล์' : 'ราคาต่อชิ้น') + (variant ? ` · ${variant.label}` : ''), price: variant ? variant.price : p.price }],
    variant: variant ? { key: variant.key, label: variant.label } : undefined, stockKey: variant ? `${p.id}:${variant.key}` : p.id,
    qtyPick: !p.digital, shopId: p.id, // เลือกจำนวนได้ (ไม่เกินสต๊อกจากระบบหลังบ้าน)
    ship: !p.digital, shop: true, // จ่ายแล้วกรอกที่อยู่จัดส่งทันที
    next: { kind: 'form', fields: p.digital ? [{ name: 'note', label: 'ขอเพิ่มเติม (ถ้ามี)', type: 'textarea', placeholder: 'เช่น อยากได้โทนสีม่วง' }] : SHIP_FIELDS },
    done: p.digital
      ? { ...AFTER.shop, text: 'ทีมจะส่งไฟล์ให้ภายใน 24 ชั่วโมงใน “ประวัติการซื้อสินค้า”', steps: ['รับคำสั่งซื้อ', 'ออกแบบตามสีมงคลของคุณ', 'ส่งไฟล์ให้ดาวน์โหลด'] }
      : AFTER.shop,
  };
}

mongkolBody.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-mk]');
  if (tab) { mkTab = tab.dataset.mk; renderMongkol(); return; }
  const m = e.target.closest('[data-merit]');
  if (m) { startCheckout(itemFromService(m.dataset.merit)); return; }
  const s = e.target.closest('[data-shop]');
  if (s) { const p = SHOP_ITEMS.find((x) => x.id === s.dataset.shop); startCheckout(shopItem(p, hasOpts(p) ? pickedVariant(p) : null)); return; }
  const so = e.target.closest('[data-shop-open]');
  if (so) { shopOpen = so.dataset.shopOpen || null; shopPick = {}; renderMongkol(); return; }
  const sp = e.target.closest('[data-shop-pick]');
  if (sp) { const [g, v] = sp.dataset.shopPick.split('|'); shopPick[g] = shopPick[g] === v ? undefined : v; renderMongkol(); showVariantImage(); return; }
  const si = e.target.closest('[data-shop-img]');
  if (si) { const gal = mongkolBody.querySelector('.mk-gal'); if (gal) gal.scrollTo({ left: gal.clientWidth * +si.dataset.shopImg, behavior: 'smooth' }); return; }
  if (e.target.closest('[data-all]')) openFrame('services.html');
  const rg = e.target.closest('[data-pl-region]');
  if (rg) { plRegion = rg.dataset.plRegion; plWish = 'all'; plMore = false; plOpen = null; renderMongkol(); return; }
  const wi = e.target.closest('[data-pl-wish]');
  if (wi) { plWish = wi.dataset.plWish; plMore = false; plOpen = null; renderMongkol(); return; }
  if (e.target.closest('[data-pl-more]')) { plMore = true; renderMongkol(); return; }
  const op = e.target.closest('[data-pl-open]');
  if (op) { plOpen = op.dataset.plOpen ? +op.dataset.plOpen : null; renderMongkol(); return; }
  const bk = e.target.closest('[data-pl-book]');
  if (bk) {
    const [no, svc] = bk.dataset.plBook.split('|');
    const p = PLACES.find((x) => x.no === +no);
    const item = itemFromService(svc);
    if (p && item) startCheckout({ ...item, sub: `${item.sub || ''} · ${p.name}`, preset: { place: placeLabel(p) } });
  }
});

function openMongkol() {
  closeAllPanels();
  setActiveTab('services');
  renderMongkol();
  openPanel('mongkolPanel');
}
$('tabMongkol').addEventListener('click', openMongkol);
