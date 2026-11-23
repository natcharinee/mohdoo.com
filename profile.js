// ===== แท็บ “หมอดู” + หน้าโปรไฟล์ (บัญชี) =====
// ใช้ข้อมูลผู้ใช้ใน localStorage (ตัวอย่าง ยังไม่มีระบบหลังบ้าน)

function makePanel(id, title) {
  const p = document.createElement('section');
  p.className = 'panel';
  p.id = id;
  p.setAttribute('aria-hidden', 'true');
  p.innerHTML = `<header class="panel-bar"><button class="back">‹ กลับ</button><h2>${title}</h2><span></span></header><div class="panel-body"></div>`;
  p.querySelector('.back').addEventListener('click', () => closePanel(id));
  $('screen').insertBefore(p, $('catPanel'));
  return p;
}

// ---------- แท็บ “หมอดู”: เลือกหมอดูตามหมวด ----------
const seersPanel = makePanel('seersPanel', 'หมอดู');
seersPanel.querySelector('.panel-body').innerHTML = `
  <div class="cat-hero"><span class="cat-ico big">🔮</span><div><h3>เลือกหมอดูตามศาสตร์</h3><p>เลือกหมวด แล้วเลือกประเภทที่สนใจ เพื่อดูรายชื่อหมอดูที่เปิดรับคิว</p></div></div>
  <div class="cat-grid">${CATEGORIES.map((c) =>
    `<button class="cat" data-cat="${c.id}"><span class="cat-ico">${c.icon}</span><b>${c.name}</b><small>${c.desc}</small><em>${c.types.length} ประเภท ›</em></button>`).join('')}</div>`;
seersPanel.addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) openCat(b.dataset.cat); });
$('tabSeers').addEventListener('click', () => {
  closeAllPanels();
  setActiveTab('seers');
  openPanel('seersPanel');
});

// ---------- คำนวณข้อมูลดวงจากโปรไฟล์ ----------
const NAKSAT = ['ชวด (หนู)', 'ฉลู (วัว)', 'ขาล (เสือ)', 'เถาะ (กระต่าย)', 'มะโรง (มังกร)', 'มะเส็ง (งู)', 'มะเมีย (ม้า)', 'มะแม (แพะ)', 'วอก (ลิง)', 'ระกา (ไก่)', 'จอ (สุนัข)', 'กุน (หมู)'];
const INTERESTS = ['การงาน', 'การเงิน', 'ความรัก', 'สุขภาพ', 'การเรียน', 'ครอบครัว', 'โชคลาภ'];
function birthInfo(u) {
  if (!u.birthdate) return null;
  const { y, m, d, date } = birthParts(u);
  const [zName, zSym, zEl] = zodiacOf(m, d);
  const day = DAY_COLORS[date.getDay()];
  return {
    dateText: date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }),
    weekday: day.day, color: day.birth,
    zodiac: `${zSym}︎ ราศี${zName}`, element: zEl,
    naksat: `ปี${NAKSAT[(((y - 4) % 12) + 12) % 12]}`,
    life: lifeNumber(u),
    age: Math.floor((Date.now() - date) / 31557600000),
  };
}

// ---------- หน้าโปรไฟล์ ----------
const profilePanel = makePanel('profilePanel', 'โปรไฟล์ของฉัน');
const profileBody = profilePanel.querySelector('.panel-body');

function openProfile() {
  renderProfile();
  if (typeof srvProfileOpened === 'function') srvProfileOpened();
  closeAllPanels();
  setActiveTab('account');
  openPanel('profilePanel');
}

function renderProfile() {
  const u = currentUser();
  if (!u) return;
  const b = birthInfo(u);
  const coupons = u.coupons || [];
  const live = coupons.filter((c) => !c.used && c.expires > Date.now());
  const past = coupons.filter((c) => c.used || c.expires <= Date.now()).slice(-3).reverse();
  // แยกการซื้อวัตถุมงคลออกจากการดูดวง
  const hist = (u.history || []).filter((h) => !isPurchase(h) && !isMerit(h));
  const merits = (u.history || []).filter(isMerit);
  const buys = (u.history || []).filter(isPurchase);
  const fullName = displayName(u, true);
  const needEn = (window.LANG || 'th') !== 'th' && !u.firstEn; // ภาษาอื่นแต่ยังไม่มีชื่ออังกฤษ
  const cell = (label, value, extra = '') =>
    `<div class="pf-cell"><small>${label}</small><b class="${value ? '' : 'muted'}">${value || 'ยังไม่ระบุ'}</b>${extra}</div>`;

  profileBody.innerHTML = `
    <div class="pf-hero">
      <button class="pf-avatar ${typeof hasAvatarArt === 'function' && hasAvatarArt(u) ? 'has-art' : ''}" data-avatar aria-label="เปลี่ยนรูปโปรไฟล์">${typeof avatarInner === 'function' ? avatarInner(u) : esc((u.first || u.name || '✦').charAt(0).toUpperCase())}<span class="pf-cam" aria-hidden="true">📷</span></button>
      <h3 translate="no">${esc(fullName)}</h3>
      ${needEn ? '<button class="pf-en-name" id="pfEnName">+ เพิ่มชื่อภาษาอังกฤษ</button>' : ''}
      ${u.phone ? `<p>📱 ${esc(prettyPhone(u.phone))}</p>` : u.email ? `<p>${esc(u.email)}</p>` : ''}
      ${u.created ? `<p class="pf-since">สมาชิกตั้งแต่ ${thDate(u.created)}</p>` : ''}
      <button class="btn-ghost pf-edit" id="pfEdit">✎ แก้ไขข้อมูล</button>
    </div>
    ${typeof srvProfileHTML === 'function' ? srvProfileHTML() : ''}

    <div class="pf-stats">
      <div><b>${hist.length}</b><small>ดูดวงแล้ว</small></div>
      <div><b>${live.length}</b><small>คูปอง</small></div>
      <div><b>${b ? b.life : '-'}</b><small>เลขชีวิต</small></div>
    </div>

    <section class="pf-card">
      <div class="sec-head"><h3>ข้อมูลดวงชะตา</h3><span class="sec-note">ใช้ประกอบการทำนาย</span></div>
      ${b ? '' : `<button class="pf-missing" data-edit>เพิ่มวันเกิด เพื่อให้หมอดูวิเคราะห์ได้แม่นยำขึ้น ›</button>`}
      <div class="pf-grid">
        ${cell('วันเกิด', b && b.dateText)}
        ${cell('เกิดวัน', b && b.weekday, b ? `<span class="pf-dot" style="background:${HEX[b.color]}"></span>` : '')}
        ${cell('เวลาเกิด', u.birthtime ? `${u.birthtime} น.` : '')}
        ${cell('สถานที่เกิด', esc(u.birthplace || ''))}
        ${cell('ราศี', b && `${b.zodiac} · ธาตุ${b.element}`)}
        ${cell('ปีนักษัตร', b && b.naksat)}
        ${cell('อายุ', b && `${b.age} ปี`)}
        ${cell('สีประจำวันเกิด', b && `สี${b.color}`)}
        ${cell('เพศ', esc(u.gender || ''))}
        ${cell('สถานะความรัก', esc(u.relation || ''))}
      </div>
      <div class="pf-interest"><small>เรื่องที่อยากรู้</small><div>${(u.interests || []).length ? u.interests.map((i) => `<span>${esc(i)}</span>`).join('') : '<em>ยังไม่ได้เลือก</em>'}</div></div>
    </section>

    ${typeof fileSection === 'function' ? fileSection(u) : ''}
    ${bodySection(u)}
    ${typeof circleCard === 'function' ? circleCard(u) : ''}

    <section class="pf-card">
      <div class="sec-head"><h3>คูปองของฉัน</h3><span class="sec-note">${live.length} ใบใช้ได้</span></div>
      ${!u.wheelSpun && u.first && u.role !== 'seer' ? `<button class="spin-cta" data-spin><span>🎡</span><b>ยังมีสิทธิ์หมุนวงล้อรับดวงฟรี 1 ครั้ง</b><em>หมุนเลย ›</em></button>` : ''}
      ${u.pendingGift ? `<button class="spin-cta" data-claim><span>${GIFTS.find((g) => g.id === u.pendingGift).icon}</span><b>ได้รับ “${GIFTS.find((g) => g.id === u.pendingGift).name}” ยังไม่ได้เลือกใช้</b><em>รับเลย ›</em></button>` : ''}
      ${live.length || past.length ? `<div class="coupons">
        ${live.map((c) => couponHTML(c, true)).join('')}
        ${past.map((c) => couponHTML(c, false)).join('')}
      </div>` : (u.wheelSpun || !u.first || u.role === 'seer' ? '<p class="pf-empty">ยังไม่มีคูปอง</p>' : '')}
    </section>

    ${histSection('fortune', 'ประวัติการดูดวง', 'ครั้ง', hist, (h) => histLine(h), '✦', 'ยังไม่เคยดูดวง ผลการดูดวงครั้งต่อไปจะถูกเก็บไว้ที่นี่ให้ย้อนอ่านได้')}
    ${histSection('merit', 'ประวัติบริการมงคล', 'รายการ', merits, (h) => esc(meritLine(h)), '🙏', 'ยังไม่มีบริการมงคล เมื่อทีมทำพิธีให้แล้ว รูปและวิดีโอยืนยันจะอยู่ที่นี่')}
    ${histSection('shop', 'ประวัติการซื้อสินค้า', 'รายการ', buys, (h) => esc(buyLine(h)), '📦', 'ยังไม่มีการสั่งซื้อ วัตถุมงคลที่สั่งจะแสดงสถานะและเลขพัสดุที่นี่')}

    <button class="btn-ghost full pf-logout" id="pfLogout">ออกจากระบบ</button>
    <p class="pf-note">ข้อมูลของคุณใช้เพื่อการทำนายเท่านั้น · <a href="privacy.html">นโยบายความเป็นส่วนตัว</a> · <a href="terms.html">เงื่อนไขการใช้</a> · <a href="refund.html">นโยบายคืนเงิน</a></p>
    <p class="pf-note"><button type="button" class="pf-delete" id="pfDelete" style="background:none;border:0;color:#ff8fa6;text-decoration:underline;cursor:pointer;font:inherit">ลบบัญชีและข้อมูลของฉัน</button></p>`;
}

// ---------- หมอดูประจำตัว: รูปร่างกายสำหรับโหงวเฮ้ง / ลายมือ ----------
// เก็บรูปย่อขนาดเล็กในเบราว์เซอร์ (ตัวอย่าง) · ต้องกดยินยอมก่อน และลบได้ทุกเมื่อ
const BODY_SLOTS = [
  { id: 'face', icon: '🙂', name: 'ใบหน้า', hint: 'หน้าตรง เห็นหน้าผากถึงคาง', sci: 'โหงวเฮ้ง' },
  { id: 'body', icon: '🧍', name: 'รูปร่าง', hint: 'ยืนตรงเต็มตัว', sci: 'ลักษณะรูปร่าง' },
  { id: 'palmL', icon: '🤚', name: 'ลายมือซ้าย', hint: 'แบมือ เห็นเส้นชัด', sci: 'ลายมือ' },
  { id: 'palmR', icon: '✋', name: 'ลายมือขวา', hint: 'แบมือ เห็นเส้นชัด', sci: 'ลายมือ' },
  { id: 'wrist', icon: '⌚', name: 'ข้อมือ', hint: 'เห็นเส้นข้อมือด้านใน', sci: 'เส้นข้อมือ' },
  { id: 'foot', icon: '🦶', name: 'ลายเท้า', hint: 'ฝ่าเท้าทั้งฝ่า', sci: 'ลายเท้า' },
];
function profileScore(u) {
  const checks = [u.first, u.last, u.birthdate, u.birthtime, u.birthplace, u.gender, (u.interests || []).length,
    ...BODY_SLOTS.map((s) => (u.photos || {})[s.id])];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
function bodySection(u) {
  const photos = u.photos || {};
  const n = BODY_SLOTS.filter((s) => photos[s.id]).length;
  const score = profileScore(u);
  return `<section class="pf-card pf-body">
    <div class="sec-head"><h3>ข้อมูลสำหรับหมอดูประจำตัว</h3><span class="sec-note">${n}/${BODY_SLOTS.length} รูป</span></div>
    <div class="pf-meter"><div><span style="width:${score}%"></span></div><b>${score}%</b></div>
    <p class="pf-empty">ยิ่งข้อมูลครบ หมอดูประจำตัวยิ่งรู้จักคุณ ใช้อ่านโหงวเฮ้ง ลายมือ และลักษณะร่างกาย ประกอบกับวันเดือนปีเกิด</p>
    ${u.photoConsent ? `<div class="pf-photos">${BODY_SLOTS.map((s) => `<div class="pf-ph ${photos[s.id] ? 'has' : ''}">
        <label class="ph-box">${photos[s.id] ? `<img src="${photos[s.id]}" alt="${s.name}">` : `<span>${s.icon}</span><em>+ เพิ่มรูป</em>`}
          <input type="file" accept="image/*" data-photo="${s.id}" hidden></label>
        <b>${s.name}</b><small>${photos[s.id] ? `ใช้ดู${s.sci}` : s.hint}</small>
        ${photos[s.id] ? `<button class="ph-del" data-photo-del="${s.id}" aria-label="ลบรูป${s.name}">ลบ</button>` : ''}
      </div>`).join('')}</div>
      <p class="pf-note">🔒 รูปใช้เพื่อการทำนายของคุณเท่านั้น ลบได้ทุกเมื่อ · <button class="link" data-photo-revoke>ถอนความยินยอมและลบรูปทั้งหมด</button></p>
      <p class="pf-note">การวิเคราะห์จากรูปด้วย AI จะเปิดในระยะถัดไป ตอนนี้เก็บรูปไว้ก่อน (ตัวอย่าง: เก็บในเบราว์เซอร์นี้)</p>`
    : `<label class="pf-consent"><input type="checkbox" data-photo-consent>
        <span>ฉันยินยอมให้หมอดู.com เก็บรูปใบหน้า รูปร่าง ลายมือ ข้อมือ และลายเท้าของฉัน เพื่อใช้ทำนายดวงของฉันเท่านั้น และลบได้ทุกเมื่อ</span></label>`}
  </section>`;
}
// ย่อรูปก่อนเก็บ (ด้านยาวไม่เกิน 480px, JPEG) เพื่อไม่ให้เต็มพื้นที่เบราว์เซอร์
function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 480 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
profileBody.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.matches('[data-photo-consent]') && t.checked) {
    const u = currentUser(); u.photoConsent = Date.now(); saveUser(u); renderProfile(); return;
  }
  if (t.matches('[data-photo]') && t.files[0]) {
    try {
      const data = await shrinkImage(t.files[0]);
      const u = currentUser(); savePhoto(u, t.dataset.photo, data, 'หน้าบัญชี');
      if (!saveUserWithPhotos(u)) return;
      renderProfile();
      toast('บันทึกรูปลงแฟ้มดวงแล้ว ✦');
    } catch (_) { toast('อ่านไฟล์รูปไม่ได้ ลองรูปอื่นนะคะ'); }
  }
});

function couponHTML(c, usable) {
  const g = GIFTS.find((x) => x.id === c.gift);
  const status = c.used ? `ใช้แล้ว ${thDate(c.usedAt || c.created)}` : usable ? `ใช้ได้ถึง ${thDate(c.expires)}` : 'หมดอายุแล้ว';
  return `<div class="coupon ${usable ? '' : 'spent'}">
    <span class="cp-ico">${g.icon}</span>
    <span class="cp-txt"><small>ดวงฟรี · ต้อนรับสมาชิกใหม่</small><b>${g.name}</b><em>${status}</em></span>
    ${usable ? `<button class="cp-use" data-coupon="${c.id}">ใช้</button>` : '<span class="cp-done">✓</span>'}
  </div>`;
}

// ---------- รายการประวัติ: แสดง 4 รายการล่าสุด กด “ดูเพิ่มเติม” เพื่อแสดงทั้งหมด ----------
const HIST_SHOW = 4;
const histOpen = {}; // ส่วนที่กดดูทั้งหมดแล้ว (จำไว้ระหว่างเปิดหน้าบัญชี)
function histSection(key, title, unit, list, line, icon, empty) {
  const all = !!histOpen[key];
  const shown = all ? list : list.slice(0, HIST_SHOW);
  return `<section class="pf-card">
      <div class="sec-head"><h3>${title}</h3><span class="sec-note">${list.length} ${unit}</span></div>
      ${list.length ? `<ul class="hist">${shown.map((h) => `<li><button class="hist-row" data-hist="${h.id}">
          <span class="hist-ico">${h.icon || icon}</span>
          <span class="hist-txt"><b>${esc(h.title)}</b><small>${line(h)}</small></span>
          <span class="hist-date">${thDate(h.at)}</span>
        </button></li>`).join('')}</ul>
        ${list.length > HIST_SHOW ? `<button class="btn-ghost full hist-more" data-hist-more="${key}">${all ? 'ย่อรายการ ▴' : `ดูเพิ่มเติม (อีก ${list.length - HIST_SHOW} ${unit}) ▾`}</button>` : ''}`
      : `<p class="pf-empty">${empty}</p>`}
    </section>`;
}
const isPurchase = (h) => h.kind === 'order' && String(h.svc || '').startsWith('shop:');
const isMerit = (h) => h.kind === 'order' && (SERVICES.find((s) => s.id === h.svc) || {}).group === 'merit';
const meritLine = (h) => [h.status, h.data && h.data.place, (h.proof || []).length ? `📸 รูปยืนยัน ${h.proof.length}` : '', `${Number(h.amount).toLocaleString('th-TH')} ฿`].filter(Boolean).join(' · ');
const buyLine = (h) => [h.status, h.label, `${Number(h.amount).toLocaleString('th-TH')} ฿`, h.tracking ? `พัสดุ ${h.tracking.no}` : ''].filter(Boolean).join(' · ');
function histLine(h) {
  if (h.kind === 'tarot') return esc(h.cards.map((c) => `${c.th}${c.rev ? ' (กลับหัว)' : ''}`).join(' · '));
  if (h.kind === 'siamsi') return esc(`${h.lv} · ${h.verse}`);
  if (h.kind === 'daily') return esc(`${h.report.mood} · ${h.report.scores.map(([l, n]) => `${l} ${n}★`).slice(1).join(' ')}`);
  if (h.kind === 'ask') return `<span translate="no">“${esc(h.question)}”</span> · รู้ผลทันที`;
  if (h.kind === 'order') return esc(`${h.status} · ${h.label} · ${Number(h.amount).toLocaleString('th-TH')} ฿`);
  return 'ผลคำทำนายจากข้อมูลส่วนตัวของคุณ';
}

profileBody.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('#pfEdit, [data-edit]')) return openEdit();
  if (t.closest('#pfLogout')) return logout();
  if (t.closest('#pfDelete')) return deleteAccount();
  const del = t.closest('[data-photo-del]');
  if (del) {
    const u = currentUser(); const slot = del.dataset.photoDel;
    if (!confirm('ลบรูปนี้และรูปเก่าของช่องนี้ออกจากแฟ้มดวง?')) return;
    delete (u.photos || {})[slot]; delete (u.photoAt || {})[slot];
    u.photoLog = (u.photoLog || []).filter((p) => p.slot !== slot);
    saveUser(u); renderProfile(); return;
  }
  if (t.closest('[data-photo-revoke]')) {
    if (!confirm('ลบรูปทั้งหมดและถอนความยินยอม?')) return;
    const u = currentUser(); delete u.photos; delete u.photoConsent; delete u.photoLog; delete u.photoAt; delete u.photoFrom; saveUser(u); renderProfile(); toast('ลบรูปทั้งหมดแล้ว'); return;
  }
  if (t.closest('[data-spin]')) return startWelcomeGift();
  if (t.closest('[data-claim]')) return claimPending();
  const cp = t.closest('[data-coupon]');
  if (cp) { useCoupon(cp.dataset.coupon); setTimeout(renderProfile, 400); return; }
  if (t.closest('[data-avatar]')) { openAvatarPicker(); return; }
  if (t.closest('#pfEnName')) { openEdit(); setTimeout(() => editPanel.querySelector('[name="firstEn"]')?.focus(), 350); return; }
  const more = t.closest('[data-hist-more]');
  if (more) { // ขยาย/ย่อรายการ โดยไม่เลื่อนหน้าหนี
    const key = more.dataset.histMore;
    const card = more.closest('.pf-card');
    const top = card.getBoundingClientRect().top;
    histOpen[key] = !histOpen[key];
    renderProfile();
    const again = profileBody.querySelector(`[data-hist-more="${key}"]`)?.closest('.pf-card');
    const body = [profileBody, profilePanel].find((e) => e.scrollHeight > e.clientHeight + 4) || profileBody;
    if (again) body.scrollTop += again.getBoundingClientRect().top - top;
    return;
  }
  const h = t.closest('[data-hist]');
  if (h) openHistory(h.dataset.hist);
});

// ---------- ดูผลย้อนหลัง ----------
// ปุ่มเปิดใบผลดวงของรายการนี้ (fortune-slip.js)
const slipButton = (h) => (typeof slipSupported === 'function' && slipSupported(h)
  ? `<button class="btn-gold full slip-open" data-slip-of="${h.id}">📜 ดูใบผลดวง · บันทึกเป็นรูป</button>` : '');
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-slip-of]');
  if (!b) return;
  const h = (currentUser().history || []).find((x) => x.id === b.dataset.slipOf);
  if (h) openSlip(h);
});

function openHistory(id) {
  const u = currentUser();
  const h = (u.history || []).find((x) => x.id === id);
  if (!h) return;
  if (h.kind === 'ask') { openSlip(h); return; } // ถามคำถาม → เปิดใบผลดวงที่ตอบไว้
  if (h.kind === 'personal') {
    openReading(GIFTS.find((g) => g.id === h.gift), u, h.id);
  } else if (h.kind === 'daily') {
    $('readingTitle').textContent = 'รายงานดวงประจำวัน';
    $('readingBody').innerHTML = dailyHTML(h.report, 'รายงานที่บันทึกไว้ · เพื่อความบันเทิงและเป็นแนวทางชีวิต') + slipButton(h);
    openPanel('readingPanel');
  } else {
    $('readingTitle').textContent = h.title;
    const q = h.question ? `<p class="hist-q" translate="no">“${esc(h.question)}”</p>` : '';
    let body = '';
    if (h.kind === 'tarot') {
      body = h.cards.map((c) => `<div class="hist-card">
          <span class="hc-sym">${c.sym}</span>
          <div><small>${esc(c.pos)}</small><b>${esc(c.th)} <em>${esc(c.en)}</em></b>
          <span class="badge ${c.rev ? 'rev' : 'up'}">${c.rev ? 'ไพ่กลับหัว' : 'ไพ่ตั้ง'}</span>
          <p>${esc(c.text)}</p></div></div>`).join('') + `<p class="reading-tip">✦ ${esc(h.summary)}</p>`;
    } else if (h.kind === 'order') {
      body = h.reading
        ? `<div class="ai-reading-body">${fmtReading(h.reading)}</div>${h.summary ? `<p class="ai-reading-sum"><b>✦ สรุป</b>${esc(h.summary)}</p>` : ''}`
        : `<div class="order-status">${['done', 'shipped', 'refunded', 'cancelled'].includes(h.srv) ? '<span class="ok-mini">✓</span>' : '<span class="spinner small"></span>'}<div><b>${esc(h.status)}</b><small>${esc(h.srv === 'done' ? 'ดำเนินการเรียบร้อยแล้ว ขอบคุณที่ใช้บริการหมอดู.com ✦' : h.srv === 'shipped' ? 'สินค้าออกจากร้านแล้ว ติดตามพัสดุได้ด้านล่าง' : h.note || 'หมอดูจะตอบกลับภายใน 24 ชั่วโมง')}</small></div></div>`;
      body += `
        ${h.steps ? `<ol class="track">${h.steps.map((st, i) => { const n = h.stepNow ?? 1; return `<li class="${i < n ? 'done' : i === n ? 'now' : ''}">${esc(st)}</li>`; }).join('')}</ol>` : ''}
        ${h.tracking ? `<p class="order-track-no">📦 ${esc(h.tracking.carrier)} · เลขพัสดุ <b>${esc(h.tracking.no)}</b></p>` : ''}
        ${h.proof && h.proof.length ? `<div class="proof-media">${h.proof.map((m) => (/video/.test(m.type || '')
          ? `<video src="${esc(m.url)}" controls playsinline preload="metadata"></video>`
          : `<a href="${esc(m.url)}" target="_blank" rel="noopener"><img src="${esc(m.url)}" alt="${esc(m.caption || 'รูปยืนยัน')}" loading="lazy"></a>`)).join('')}</div>` : ''}
        <ul class="order-info">
          <li><small>${isPurchase(h) ? 'จำนวน' : 'แพ็กเกจ'}</small><b>${esc(h.label)}</b></li>
          <li><small>ยอดชำระ</small><b>${Number(h.amount).toLocaleString('th-TH')} ฿</b></li>
          <li><small>เลขที่คำสั่งซื้อ</small><b>${esc(h.no)}</b></li>
          ${(h.fields || []).filter(([k]) => h.data[k]).map(([k, label]) => `<li><small>${esc(label)}</small><b translate="no">${esc(h.data[k])}</b></li>`).join('')}
        </ul>`;
    } else if (h.kind === 'siamsi') {
      body = `<p class="reading-lead">ใบที่ ${h.no} · <b>${esc(h.lv)}</b></p>
        <p class="hist-verse">${esc(h.verse)}</p><p class="reading-tip">${esc(h.meaning)}</p>
        <ul class="swatches hist-areas"><li><span>💼</span><span><small>การงาน</small>${esc(h.work)}</span></li>
        <li><span>💗</span><span><small>ความรัก</small>${esc(h.love)}</span></li>
        <li><span>💰</span><span><small>การเงิน</small>${esc(h.money)}</span></li></ul>`;
    }
    $('readingBody').innerHTML = `<div class="reading-head"><span class="win-ico">${h.icon}</span><div><p class="win-label">ดูเมื่อ ${thDate(h.at)}</p><h3>${esc(h.title)}</h3></div></div>${q}${body}${slipButton(h)}`;
    openPanel('readingPanel');
  }
}

// ---------- แก้ไขข้อมูล ----------
const editPanel = makePanel('editPanel', 'แก้ไขข้อมูล');
editPanel.style.zIndex = 20;
function openEdit() {
  const u = currentUser();
  const opt = (list, val) => list.map((o) => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('');
  editPanel.querySelector('.panel-body').innerHTML = `
    <form class="form" id="editForm">
      <div class="two">
        <label>ชื่อ<input name="first" required value="${esc(u.first || u.name || '')}"></label>
        <label>นามสกุล<input name="last" value="${esc(u.last || '')}"></label>
      </div>
      <div class="two">
        <label><span>ชื่อภาษาอังกฤษ <small>(แสดงเมื่อเลือก EN / 中文)</small></span><input name="firstEn" lang="en" placeholder="First name" value="${esc(u.firstEn || '')}"></label>
        <label>นามสกุลภาษาอังกฤษ<input name="lastEn" lang="en" placeholder="Last name" value="${esc(u.lastEn || '')}"></label>
      </div>
      <div class="two">
        <label>วันเกิด<input type="date" name="birthdate" value="${esc(u.birthdate || '')}"></label>
        <label>เวลาเกิด<input type="time" name="birthtime" value="${esc(u.birthtime || '')}"></label>
      </div>
      <label>สถานที่เกิด (จังหวัด / ประเทศ)<input name="birthplace" placeholder="เช่น กรุงเทพมหานคร" value="${esc(u.birthplace || '')}"></label>
      <div class="two">
        <label>เพศ<select name="gender"><option value="">ไม่ระบุ</option>${opt(['หญิง', 'ชาย', 'อื่น ๆ'], u.gender)}</select></label>
        <label>สถานะความรัก<select name="relation"><option value="">ไม่ระบุ</option>${opt(['โสด', 'มีคนคุย', 'มีแฟน', 'แต่งงานแล้ว'], u.relation)}</select></label>
      </div>
      <fieldset class="pf-chips"><legend>เรื่องที่อยากรู้</legend>
        ${INTERESTS.map((i) => `<label><input type="checkbox" name="interests" value="${i}" ${(u.interests || []).includes(i) ? 'checked' : ''}><span>${i}</span></label>`).join('')}
      </fieldset>
      <button class="btn-gold full" type="submit">บันทึก</button>
    </form>`;
  editPanel.querySelector('#editForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const cur = currentUser();
    Object.assign(cur, {
      first: String(f.get('first')).trim(), last: String(f.get('last')).trim(),
      firstEn: String(f.get('firstEn') || '').trim(), lastEn: String(f.get('lastEn') || '').trim(),
      birthdate: String(f.get('birthdate')), birthtime: String(f.get('birthtime')),
      birthplace: String(f.get('birthplace')).trim(), gender: String(f.get('gender')), relation: String(f.get('relation')),
      interests: f.getAll('interests').map(String),
    });
    cur.name = cur.first || cur.name;
    saveUser(cur);
    applyUser();
    renderProfile();
    closePanel('editPanel');
    toast('บันทึกข้อมูลแล้ว ✦');
  });
  openPanel('editPanel');
}

// ---------- รับผลการดูดวงจากหน้าไพ่ / เซียมซี (ใน iframe) ----------
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data || e.data.type !== 'mohdoo-reading') return;
  if (!currentUser()) return;
  addHistory(e.data.entry);
  if ($('profilePanel').classList.contains('open')) renderProfile();
});

// ---------- ลบบัญชี (PDPA): ลบโปรไฟล์ ประวัติ รูป และการแจ้งเตือน · คำสั่งซื้อเหลือเฉพาะยอดเงินสำหรับทำบัญชี ----------
async function deleteAccount() {
  const u = currentUser();
  if (!u) return;
  if (!confirm('ลบบัญชีและข้อมูลทั้งหมดของคุณ?\n\nข้อมูลเกิด ประวัติการดูดวง รูป และการแจ้งเตือนจะถูกลบถาวร กู้คืนไม่ได้\nสมาชิกดูดวงรายวันที่เหลืออยู่จะหายไปด้วย')) return;
  if (!confirm('ยืนยันอีกครั้ง: ลบบัญชีถาวร')) return;
  try {
    if (window.SERVER && typeof srv === 'function') await srv('me', { method: 'DELETE' });
  } catch (e) { toast(e.message || 'ลบบัญชีไม่สำเร็จ ลองใหม่อีกครั้ง'); return; }
  try {
    const all = accounts();
    if (u.phone) delete all[u.phone];
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(all));
    localStorage.removeItem(USER_KEY);
  } catch (_) {}
  logout();
  toast('ลบบัญชีและข้อมูลของคุณแล้ว');
}
