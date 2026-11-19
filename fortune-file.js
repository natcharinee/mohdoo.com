// ===== แฟ้มดวง: เก็บทุกข้อมูลที่ลูกค้าเคยให้ไว้กับการดูดวง =====
// ลายมือ ใบหน้า ข้อมือ ลายเท้า ชื่อ เบอร์โทร ทะเบียนรถ บ้านเลขที่ เลขบัตร (เฉพาะผลรวม) ไพ่ เซียมซี
// → ใช้รวมเป็นรายงานดวงประจำวัน และส่งให้แม่หมอ AI (ส่งเฉพาะข้อความ ไม่ส่งรูป)
// ตัวอย่าง: เก็บในเบราว์เซอร์นี้ ยังไม่มีระบบหลังบ้าน (พื้นที่จำกัด จึงย่อรูปและเก็บรูปเก่าไว้ช่องละ 3 รูป)

const PHOTO_KEEP = 3;
const PLACE_SLOT = { id: 'place', icon: '🏠', name: 'รูปพื้นที่ / ผังบ้าน', sci: 'ฮวงจุ้ย' };
const slotInfo = (id) => BODY_SLOTS.find((s) => s.id === id) || (id === 'place' ? PLACE_SLOT : { id, icon: '📷', name: 'รูป', sci: '' });

// บันทึกรูปลงแฟ้ม: รูปล่าสุดอยู่ใน u.photos[slot] · รูปเดิมย้ายไปเก็บใน u.photoLog (ดูย้อนหลังได้)
function savePhoto(u, slot, src, from) {
  const now = Date.now();
  u.photoAt = { ...(u.photoAt || {}) };
  u.photoFrom = { ...(u.photoFrom || {}) };
  const prev = (u.photos || {})[slot];
  if (prev && prev !== src) {
    const log = [{ slot, src: prev, at: u.photoAt[slot] || now, from: u.photoFrom[slot] || '' }, ...(u.photoLog || [])];
    const per = {};
    u.photoLog = log.filter((p) => (per[p.slot] = (per[p.slot] || 0) + 1) <= PHOTO_KEEP);
  }
  u.photos = { ...(u.photos || {}), [slot]: src };
  u.photoAt[slot] = now;
  u.photoFrom[slot] = from || '';
  u.photoConsent = u.photoConsent || now;
}
// บันทึกผู้ใช้ที่มีรูป: ถ้าพื้นที่เบราว์เซอร์เต็ม ให้ทิ้งรูปเก่าที่สุดทีละรูปจนบันทึกได้
function saveUserWithPhotos(u) {
  for (;;) {
    if (persistUser(u)) return true;
    if (!(u.photoLog || []).length) { toast('พื้นที่เก็บรูปในเบราว์เซอร์เต็ม ลองลบรูปเก่าในหน้าบัญชีนะคะ'); return false; }
    u.photoLog = u.photoLog.slice(0, -1);
  }
}

const digitsOf = (s) => String(s || '').replace(/\D/g, '');
const digitSum = (s) => [...digitsOf(s)].reduce((a, b) => a + +b, 0);
const lines = (s) => String(s || '').split(/\n|,/).map((x) => x.trim()).filter(Boolean);

// ---------- รวมข้อมูลทั้งหมดของลูกค้าเป็นรายการ “ข้อเท็จจริง” ----------
// แต่ละรายการ: { id, icon, label, value, at, count, n (เลขลดรูป 1–9 ถ้าเป็นตัวเลข), photos }
function fortuneFile(u) {
  if (!u) return [];
  const hist = u.history || [];
  const orders = hist.filter((h) => h.kind === 'order' && h.data);
  const withField = (k) => orders.filter((h) => h.data[k]);
  const out = [];
  const add = (f) => out.push({ count: 1, ...f });

  if (u.birthdate) {
    const { m, d } = birthParts(u);
    const [zName, zSym, zEl] = zodiacOf(m, d);
    add({ id: 'birth', icon: '🎂', label: 'วันเดือนปีเกิด', value: `ราศี${zName} ${zSym}︎ ธาตุ${zEl} · เลขชีวิต ${lifeNumber(u)}${u.birthtime ? ` · เกิด ${u.birthtime} น.` : ''}`, n: lifeNumber(u) });
  }
  const fullName = [u.first || u.name, u.last].filter(Boolean).join(' ');
  if (fullName) {
    const sum = letterSum(u.first || u.name || '') + letterSum(u.last || '');
    const nameOrders = orders.filter((h) => h.data.current || h.svc === 'babyname' || h.svc === 'rename' || h.svc === 'surname');
    add({ id: 'name', icon: '✍️', label: 'ชื่อ-นามสกุล', value: `${fullName} · ผลรวม ${sum} (${NUM_MEANING[reduce(sum)][0]})`, n: reduce(sum),
      count: 1 + nameOrders.length, at: nameOrders[0]?.at });
  }
  const phones = [...new Set([localPhone(u.phone), ...withField('numbers').flatMap((h) => lines(h.data.numbers))].map(digitsOf).filter((p) => p.length >= 9))];
  if (phones.length) {
    const main = phones[0];
    add({ id: 'phone', icon: '📱', label: 'เบอร์โทร', value: phones.map((p) => `${p.replace(/(\d{3})(\d{3})(\d+)/, '$1-$2-$3')} (ผลรวม ${digitSum(p)})`).join(' · '),
      n: reduce(digitSum(main)), count: phones.length, at: withField('numbers')[0]?.at });
  }
  const plates = [...new Set(withField('plates').flatMap((h) => lines(h.data.plates)))];
  if (plates.length) {
    const s = (p) => digitSum(p) + letterSum(p.replace(/[\d\s-]/g, ''));
    add({ id: 'plate', icon: '🚗', label: 'ทะเบียนรถ', value: plates.map((p) => `${p} (ผลรวม ${s(p)})`).join(' · '), n: reduce(s(plates[0])), count: plates.length, at: withField('plates')[0]?.at });
  }
  const houses = withField('houseno');
  if (houses.length) {
    const list = [...new Set(houses.map((h) => h.data.houseno))];
    add({ id: 'house', icon: '🏡', label: 'บ้านเลขที่', value: list.map((x) => `${x} (ผลรวม ${digitSum(x)})`).join(' · '), n: reduce(digitSum(list[0])), count: list.length, at: houses[0].at });
  }
  const ids = withField('idnum');
  if (ids.length) {
    const m = String(ids[0].data.idnum).match(/ผลรวม (\d+)/);
    add({ id: 'idcard', icon: '🪪', label: 'เลขบัตรประชาชน', value: `${ids[0].data.idnum}`, n: m ? reduce(+m[1]) : undefined, count: ids.length, at: ids[0].at });
  }
  // รูปร่างกาย: ใบหน้า ลายมือ ข้อมือ ลายเท้า (+ รูปเก่า)
  [...BODY_SLOTS, PLACE_SLOT].forEach((s) => {
    const cur = (u.photos || {})[s.id];
    const old = (u.photoLog || []).filter((p) => p.slot === s.id);
    if (!cur && !old.length) return;
    const kind = Object.keys(KIND_SLOTS).find((k) => KIND_SLOTS[k].includes(s.id));
    const rd = kind && (u.photoReadings || {})[kind];
    add({ id: `photo-${s.id}`, icon: s.icon, label: s.name, value: rd ? `แม่หมอ AI อ่าน${PHOTO_KIND_NAME[kind]} (${rd.topic}): ${rd.summary}` : `${cur ? 'มีรูปล่าสุด' : 'มีรูปเก่า'} · ใช้ดู${s.sci}`,
      at: (u.photoAt || {})[s.id], count: (cur ? 1 : 0) + old.length,
      photos: [...(cur ? [{ src: cur, at: (u.photoAt || {})[s.id] }] : []), ...old] });
  });
  const tarot = hist.filter((h) => h.kind === 'tarot');
  if (tarot.length) {
    const t = tarot[0];
    add({ id: 'tarot', icon: '🃏', label: 'ไพ่ทาโรต์ที่เปิด', value: t.cards.map((c) => `${c.th}${c.rev ? ' (กลับหัว)' : ''}`).join(' · '), at: t.at, count: tarot.length, card: t.cards[0] });
  }
  const siamsi = hist.filter((h) => h.kind === 'siamsi');
  if (siamsi.length) add({ id: 'siamsi', icon: '🎋', label: 'เซียมซี', value: `ใบที่ ${siamsi[0].no} · ${siamsi[0].lv}`, at: siamsi[0].at, count: siamsi.length, last: siamsi[0] });
  if ((u.people || []).length) add({ id: 'people', icon: '👨‍👩‍👧', label: 'คนใกล้ตัว', value: u.people.map((p) => p.name).join(' · '), count: u.people.length });
  const asked = orders.filter((h) => !['numbers', 'plates', 'houseno', 'idnum'].some((k) => h.data[k]));
  if (asked.length) add({ id: 'orders', icon: '📝', label: 'เรื่องที่เคยให้หมอดู', value: [...new Set(asked.map((h) => h.title))].slice(0, 6).join(' · '), at: asked[0].at, count: asked.length });
  return out;
}

// ข้อความสั้นสำหรับส่งให้แม่หมอ AI (ไม่มีรูป ไม่มีเลขบัตรเต็ม)
function fortuneFileText(u) {
  return fortuneFile(u).map((f) => `- ${f.label}: ${f.value}${f.count > 1 ? ` (${f.count} รายการ)` : ''}`).join('\n').slice(0, 1500);
}

// ---------- ความสัมพันธ์ของเลข (ใช้ในรายงานประจำวัน) ----------
// 2 = หนุนกันเต็มที่ · 1 = เข้ากันดี · 0 = กลาง ๆ · -1 = ควรระวัง
function numRel(a, b) {
  if (a === b) return 2;
  if (Math.abs(a - b) === 4) return -1;
  if (a % 3 === b % 3) return 1;
  return 0;
}
const REL_TEXT = { 2: 'หนุนกันเต็มที่', 1: 'เข้ากันดี', 0: 'กลาง ๆ', '-1': 'ควรระวัง' };
// แต่ละข้อมูลส่งผลกับด้านไหน และควรทำอะไร
const FILE_EFFECT = {
  name: ['ความรัก', 'เสน่ห์และชื่อเสียงเด่น เหมาะแนะนำตัว', 'พูดน้อยลง ฟังมากขึ้น'],
  phone: ['การงาน', 'โทรติดต่อ เจรจา ขอความช่วยเหลือได้ผล', 'เรื่องสำคัญคุยต่อหน้าดีกว่าโทร'],
  house: ['การเงิน', 'เรื่องในบ้านและครอบครัวลงตัว เหมาะจัดบ้าน', 'เลี่ยงซื้อของเข้าบ้านชิ้นใหญ่วันนี้'],
  plate: ['สุขภาพ', 'เดินทางราบรื่น', 'ขับรถช้า ๆ เผื่อเวลาเดินทาง'],
  idcard: ['การงาน', 'เหมาะทำเอกสาร เซ็นสัญญา', 'อ่านเอกสารให้ละเอียดก่อนเซ็น'],
};

// เรียกจาก computeDaily: เลือกข้อมูลจากแฟ้มดวงมาใช้กับวันนี้ + ปรับดาวแต่ละด้าน
function dailyFromFile(u, personal, now) {
  const file = fortuneFile(u);
  const out = { lines: [], used: file.map((f) => f.label), adjust: {} };
  file.forEach((f) => {
    const eff = FILE_EFFECT[f.id];
    if (eff && f.n) {
      const rel = numRel(f.n, personal);
      out.lines.push({ icon: f.icon, label: f.label, text: `เลข ${f.n} กับเลขประจำวัน ${personal} · ${REL_TEXT[rel]} · ${rel >= 1 ? eff[1] : rel < 0 ? eff[2] : `${eff[0]}ทรงตัว`}` });
      if (rel === 2) out.adjust[eff[0]] = (out.adjust[eff[0]] || 0) + 1;
      if (rel === -1) out.adjust[eff[0]] = (out.adjust[eff[0]] || 0) - 1;
    }
  });
  const recent = (f) => f && f.at && now - f.at < 30 * 864e5;
  const t = file.find((f) => f.id === 'tarot');
  if (recent(t)) out.lines.push({ icon: '🃏', label: 'ไพ่ที่คุณเปิดล่าสุด', text: `${t.card.th}${t.card.rev ? ' (กลับหัว)' : ''} · ${thDate(t.at)} · ยังเป็นพลังหลักของช่วงนี้ ${t.card.text || ''}`.trim() });
  const s = file.find((f) => f.id === 'siamsi');
  if (recent(s)) out.lines.push({ icon: '🎋', label: 'เซียมซีล่าสุด', text: `ใบที่ ${s.last.no} (${s.last.lv}) · ${s.last.meaning || s.last.verse}` });
  Object.entries(u.photoReadings || {}).forEach(([kind, rd]) => {
    if (rd.summary && now - rd.at < 90 * 864e5) {
      out.lines.push({ icon: kind === 'palm' ? '✋' : '🧿', label: `${PHOTO_KIND_NAME[kind]}ของคุณ (อ่านเมื่อ ${thDate(rd.at)})`, text: rd.summary });
    }
  });
  const body = file.filter((f) => f.photos && !(u.photoReadings || {})[Object.keys(KIND_SLOTS).find((k) => KIND_SLOTS[k].includes(f.id.slice(6)))]);
  if (body.length) {
    out.lines.push({ icon: '🖐️', label: 'รูปในแฟ้มดวง', text: `${body.map((f) => f.label).join(' · ')} · หมอดูประจำตัวใช้ประกอบการดูดวงของคุณ (การอ่านรูปด้วย AI เปิดในระยะถัดไป)` });
  }
  return out;
}

// ---------- ส่วน “แฟ้มดวงของฉัน” ในหน้าบัญชี ----------
function fileSection(u) {
  const file = fortuneFile(u);
  return `<section class="pf-card pf-file">
    <div class="sec-head"><h3>แฟ้มดวงของฉัน</h3><span class="sec-note">${file.length} เรื่อง</span></div>
    <p class="pf-empty">ทุกครั้งที่ดูดวง ระบบเก็บข้อมูลและรูปไว้ที่นี่ แล้วนำมารวมเป็นรายงานดวงประจำวันให้อัตโนมัติ</p>
    ${file.length ? `<ul class="ff-list">${file.map((f) => `<li class="ff-row">
        <span class="ff-ico">${f.icon}</span>
        <div class="ff-txt"><b>${esc(f.label)}</b><p>${esc(f.value)}</p>
          ${f.photos ? `<div class="ff-photos">${f.photos.map((p, i) => `<figure><img src="${p.src}" alt="${esc(f.label)} ${i ? 'รูปเก่า' : 'รูปล่าสุด'}"><figcaption>${p.at ? thDate(p.at) : ''}${i ? '' : ' · ล่าสุด'}</figcaption></figure>`).join('')}</div>` : ''}
          <small>${[f.at ? `อัปเดต ${thDate(f.at)}` : '', f.count > 1 ? `${f.count} รายการ` : ''].filter(Boolean).join(' · ')}</small></div>
      </li>`).join('')}</ul>`
    : '<p class="pf-empty">ยังไม่มีข้อมูล เริ่มดูดวงครั้งแรกแล้วแฟ้มจะค่อย ๆ เติมเต็ม</p>'}
  </section>`;
}

// ---------- แม่หมอ AI อ่านรูป (ลายมือ / โหงวเฮ้ง) ----------
// เรียก /api/reading (Claude อ่านรูป) → เก็บผลไว้ในประวัติและแฟ้มดวง (u.photoReadings)
const PHOTO_KINDS = { palm: 'palm', face: 'face' };
const PHOTO_KIND_NAME = { palm: 'ลายมือ', face: 'โหงวเฮ้ง' };
const KIND_SLOTS = { palm: ['palmL', 'palmR'], face: ['face'] };

function updateHistory(id, patch) {
  const u = currentUser();
  const h = (u.history || []).find((x) => x.id === id);
  if (!h) return;
  Object.assign(h, patch);
  saveUser(u);
}
const fmtReading = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');

async function aiReadPhotos(kind, slots, topic) {
  const u = currentUser();
  const images = (slots.length ? slots : KIND_SLOTS[kind]).map((slot) => ({ slot, data: (u.photos || {})[slot] })).filter((i) => i.data);
  if (!images.length) return { status: 'nophoto' };
  try {
    const r = await fetch('/api/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-AI-Code': u.aiCode || '' },
      body: JSON.stringify({ kind, topic, images,
        profile: { first: u.first || u.name, birthdate: u.birthdate, gender: u.gender, file: fortuneFileText(u), lang: window.LANG || 'th' } }),
    });
    if (r.ok) { const j = await r.json(); return { status: j.unclear ? 'unclear' : 'ok', ...j }; }
    if (r.status === 401) return { status: 'nocode' };
    if (r.status === 429) return { status: 'busy' };
    return { status: 'offline' };
  } catch (_) { return { status: 'offline' }; } // เปิดในเครื่อง / ไม่มีเซิร์ฟเวอร์ AI
}

async function runPhotoReading({ histId, kind, slots, topic, retry }) {
  const name = PHOTO_KIND_NAME[kind];
  $('payBody').innerHTML = `<div class="pay-wait ai-reading-wait"><span class="ai-orb"><i>AI</i></span>
    <p>แม่หมอ AI กำลังอ่าน${name}ของคุณ…</p><small>ใช้เวลาประมาณ 10–30 วินาที</small></div>`;
  const r = await aiReadPhotos(kind, slots, topic);
  const foot = `<button class="btn-gold full" id="toProfile">ไปที่แฟ้มดวงในหน้าบัญชี</button>
    <button class="btn-ghost full" id="toHome">กลับหน้าแรก</button>`;

  if (r.status === 'ok') {
    setStep(3, 'คำอ่านจากแม่หมอ AI');
    const u = currentUser();
    u.photoReadings = { ...(u.photoReadings || {}), [kind]: { at: Date.now(), topic, summary: r.summary, histId } };
    saveUser(u);
    updateHistory(histId, { status: 'แม่หมอ AI อ่านแล้ว', reading: r.reading, summary: r.summary, topic, note: '' });
    $('payBody').innerHTML = `<article class="ai-reading">
        <header><span class="ok-ring">✦</span><div><small>แม่หมอ AI อ่าน${name} · ${esc(topic)}</small><h3>คำอ่าน${name}ของคุณ</h3></div></header>
        <div class="ai-reading-body">${fmtReading(r.reading)}</div>
        ${r.summary ? `<p class="ai-reading-sum"><b>✦ สรุป</b>${esc(r.summary)}</p>` : ''}
        <p class="pf-note">เก็บไว้ในแฟ้มดวงแล้ว และนำไปรวมในรายงานดวงประจำวัน · เพื่อความบันเทิงและเป็นแนวทางชีวิต</p>
      </article><button class="btn-gold full slip-open" data-slip-of="${histId}">📜 รับใบผลดวง</button>${foot}`;
  } else if (r.status === 'unclear') {
    updateHistory(histId, { status: 'รูปไม่ชัด รอรูปใหม่', note: r.reading });
    $('payBody').innerHTML = `<div class="pay-ok"><span class="ok-ring">📷</span><h3>ขอรูปใหม่อีกครั้งนะคะ</h3>
        <p>${fmtReading(r.reading || 'รูปยังไม่ชัดพอให้อ่าน')}</p></div>
      <button class="btn-gold full" id="retryPhoto">ส่งรูปใหม่ (ไม่เสียเงินเพิ่ม)</button>${foot}`;
    $('retryPhoto').addEventListener('click', retry);
  } else {
    // AI ยังไม่พร้อม → ส่งต่อให้หมอดูตอบตามปกติ (ไม่มีคำอ่านปลอม)
    const why = { nocode: 'ยังไม่ได้กรอกรหัสทดลองใช้ AI (กรอกได้ในหน้า “ดูดวงประจำวัน”)', busy: 'ตอนนี้มีคนใช้ AI เยอะมาก',
      offline: 'ยังไม่ได้เชื่อม AI บนเซิร์ฟเวอร์', nophoto: 'ไม่พบรูปในแฟ้มดวง' }[r.status];
    updateHistory(histId, { status: 'รอหมอดูตอบ', note: `ส่งรูปให้หมอดูแล้ว ตอบภายใน 24 ชั่วโมง · ${why}` });
    $('payBody').innerHTML = `<div class="pay-ok"><span class="ok-ring">✦</span><h3>ส่งรูปให้หมอดูแล้ว</h3>
        <p>แม่หมอ AI ยังอ่านรูปให้ทันทีไม่ได้ (${esc(why)})<br>หมอดูจะตอบกลับภายใน 24 ชั่วโมง ดูคำตอบได้ที่ “ประวัติการดูดวง”</p></div>${foot}`;
  }
  $('toProfile').addEventListener('click', openProfile);
  $('toHome').addEventListener('click', () => { closeAllPanels(); setActiveTab('home'); });
}
