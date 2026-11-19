// ===== ดวงคนใกล้ตัว: แฟน · พ่อแม่ · ลูก · พี่น้อง · เพื่อน → ดวงสมพงษ์ และดวงทั้งครอบครัว =====
// ใช้เฉพาะวันเกิดของคนใกล้ตัว (ไม่เก็บรูป) และต้องติ๊กว่าเจ้าตัวรู้และยินยอมก่อนเพิ่ม (PDPA)
// เก็บใน u.people (ตัวอย่าง: เก็บในเบราว์เซอร์)

const REL = [
  { id: 'love', name: 'แฟน / คู่ครอง', icon: '💞', kind: 'love' },
  { id: 'father', name: 'พ่อ', icon: '👨', kind: 'family' },
  { id: 'mother', name: 'แม่', icon: '👩', kind: 'family' },
  { id: 'child', name: 'ลูก', icon: '🧒', kind: 'family' },
  { id: 'sibling', name: 'พี่น้อง', icon: '🧑‍🤝‍🧑', kind: 'family' },
  { id: 'friend', name: 'เพื่อน', icon: '🫶', kind: 'friend' },
  { id: 'other', name: 'อื่น ๆ', icon: '✨', kind: 'friend' },
];
const relOf = (id) => REL.find((r) => r.id === id) || REL[REL.length - 1];
const asUser = (p) => ({ phone: `p-${p.id}`, name: p.name, first: p.name, birthdate: p.birthdate });

// ---------- ดวงสมพงษ์ (ราศี/ธาตุ · ปีนักษัตร · เลขชีวิต · วันเกิด) ----------
const ELEMENT_PAIR = { 'ไฟ-ลม': 4, 'ลม-ไฟ': 4, 'ดิน-น้ำ': 4, 'น้ำ-ดิน': 4 };
function compat(a, b) {
  const pa = birthParts(a), pb = birthParts(b);
  const za = zodiacOf(pa.m, pa.d), zb = zodiacOf(pb.m, pb.d);
  const el = za[2] === zb[2] ? 3 : ELEMENT_PAIR[`${za[2]}-${zb[2]}`] || 2;
  const yd = ((((pa.y - pb.y) % 12) + 12) % 12);
  const nk = yd === 4 || yd === 8 ? 4 : yd === 6 ? 1 : yd === 0 ? 3 : 2;   // ปีนักษัตรสามประสาน / ปีชงกัน
  const la = lifeNumber(a), lb = lifeNumber(b);
  const ln = la === lb ? 4 : la % 2 === lb % 2 ? 3 : 2;
  const dw = pa.date.getDay() === pb.date.getDay() ? 3 : 2;
  const raw = el + nk + ln + dw;                                              // 6–15
  const pct = Math.max(48, Math.min(98, Math.round(48 + ((raw - 6) / 9) * 50)));
  const nkA = NAKSAT[(((pa.y - 4) % 12) + 12) % 12], nkB = NAKSAT[(((pb.y - 4) % 12) + 12) % 12];
  return {
    pct, za, zb, nkA, nkB,
    lines: [
      ['♈︎ ราศีและธาตุ', `ราศี${za[0]} (ธาตุ${za[2]}) กับ ราศี${zb[0]} (ธาตุ${zb[2]})`,
        el === 4 ? 'ธาตุส่งเสริมกัน เติมเต็มสิ่งที่อีกฝ่ายขาด' : el === 3 ? 'ธาตุเดียวกัน เข้าใจกันง่าย คิดคล้ายกัน' : 'ธาตุต่างกัน ต้องปรับจังหวะเข้าหากัน'],
      ['🐉 ปีนักษัตร', `ปี${nkA} กับ ปี${nkB}`,
        nk === 4 ? 'เป็นคู่สามประสาน ช่วยหนุนนำกัน' : nk === 1 ? 'เป็นคู่ชงกัน ระวังการกระทบกระทั่ง ใจเย็นเข้าหากัน' : nk === 3 ? 'ปีเดียวกัน นิสัยคล้ายกันมาก' : 'ไม่ชงกัน อยู่ด้วยกันได้ราบรื่น'],
      ['🔢 เลขชีวิต', `เลข ${la} กับ เลข ${lb}`,
        ln === 4 ? 'เลขเดียวกัน มองโลกไปทางเดียวกัน' : ln === 3 ? 'เลขกลุ่มเดียวกัน คุยกันรู้เรื่อง' : 'เลขต่างกลุ่ม ช่วยเติมมุมมองให้กัน'],
      ['📅 วันเกิด', `วัน${DAY_COLORS[pa.date.getDay()].day} กับ วัน${DAY_COLORS[pb.date.getDay()].day}`,
        dw === 3 ? 'เกิดวันเดียวกัน จังหวะชีวิตคล้ายกัน' : 'สีมงคลต่างกัน ใช้เสริมดวงให้กันได้'],
    ],
  };
}
const KIND_TIP = {
  love: ['ความรักไปได้ไกล หมั่นบอกความรู้สึกกันบ่อย ๆ', 'ไปได้ดี ถ้าฟังกันมากขึ้นและให้พื้นที่ส่วนตัว', 'ต้องใช้ความเข้าใจ คุยกันตรง ๆ ด้วยความอ่อนโยน'],
  family: ['ครอบครัวอบอุ่น ช่วยเหลือกันได้ดี', 'เข้ากันได้ดี ถ้าเปิดใจรับฟังความเห็นต่าง', 'มีช่วงคิดต่างบ้าง ทำกิจกรรมร่วมกันจะช่วยให้ใกล้กันขึ้น'],
  friend: ['เพื่อนแท้ที่เกื้อหนุนกัน', 'คบกันสบายใจ ไปไหนด้วยกันสนุก', 'ต่างกันแต่เรียนรู้จากกันได้มาก'],
};
const tipFor = (kind, pct) => KIND_TIP[kind][pct >= 80 ? 0 : pct >= 65 ? 1 : 2];
const ring = (pct) => `<span class="cc-ring" style="--p:${pct}"><b>${pct}%</b></span>`;

// ---------- แผง “ดวงคนใกล้ตัว” ----------
const circlePanel = makePanel('circlePanel', 'ดวงคนใกล้ตัว');
const circleBody = circlePanel.querySelector('.panel-body');

function renderCircle() {
  const u = currentUser();
  const people = u.people || [];
  const me = u.birthdate ? u : null;
  circleBody.innerHTML = `
    <div class="mk-hero"><span class="mk-ico">👨‍👩‍👧</span>
      <div><h3>ดวงคนใกล้ตัว</h3><p>เพิ่มแฟน พ่อแม่ ลูก หรือเพื่อน แล้วดูดวงสมพงษ์ ดวงวันนี้ และดวงทั้งครอบครัว</p></div></div>
    ${me ? '' : '<button class="pf-missing" data-edit-me>เพิ่มวันเกิดของคุณก่อน เพื่อดูดวงสมพงษ์ ›</button>'}
    ${people.length ? `<div class="cc-list">${people.map((p) => personCard(u, p, me)).join('')}</div>` : '<p class="pf-empty">ยังไม่มีคนใกล้ตัว เพิ่มคนแรกได้เลย</p>'}
    ${people.length >= 1 && me ? familySection(u, people) : ''}
    <details class="cc-add" ${people.length ? '' : 'open'}>
      <summary>+ เพิ่มคนใกล้ตัว</summary>
      <form class="form" id="ccForm">
        <div class="two">
          <label>ความสัมพันธ์<select name="rel">${REL.map((r) => `<option value="${r.id}">${r.icon} ${r.name}</option>`).join('')}</select></label>
          <label>ชื่อเล่น<input name="name" required maxlength="30" placeholder="เช่น ต้น"></label>
        </div>
        <div class="two">
          <label>วันเกิด<input type="date" name="birthdate" required></label>
          <label><span>เวลาเกิด <small>(ถ้าทราบ)</small></span><input type="time" name="birthtime"></label>
        </div>
        <label class="pf-consent"><input type="checkbox" name="consent" required>
          <span>เจ้าตัวรู้และยินยอมให้ใช้วันเกิดเพื่อดูดวงบนหมอดู.com (ไม่ใช้รูปถ่ายของคนอื่น)</span></label>
        <button class="btn-gold full" type="submit">บันทึก</button>
      </form>
    </details>
    <p class="pf-note">ข้อมูลคนใกล้ตัวใช้เพื่อการดูดวงของคุณเท่านั้น ลบได้ทุกเมื่อ (ตัวอย่าง: เก็บไว้ในเบราว์เซอร์นี้)</p>`;
}

function personCard(u, p, me) {
  const r = relOf(p.rel);
  const pu = asUser(p);
  const today = computeDaily(pu);
  const c = me ? compat(me, pu) : null;
  const { m, d } = birthParts(pu);
  return `<article class="cc-card">
    <div class="cc-top">
      <span class="cc-av">${r.icon}</span>
      <div class="cc-tx"><b>${esc(p.name)}</b><small>${r.name} · ราศี${zodiacOf(m, d)[0]} · ${today.mood.replace('วันนี้', 'วันนี้')}</small></div>
      ${c ? ring(c.pct) : ''}
    </div>
    <div class="cc-act">
      ${c ? `<button class="btn-gold" data-compat="${p.id}">ดวงสมพงษ์ ›</button>` : ''}
      <button class="btn-ghost" data-today="${p.id}">ดวงวันนี้</button>
      <button class="link cc-del" data-del="${p.id}">ลบ</button>
    </div>
  </article>`;
}

function familySection(u, people) {
  const all = [u, ...people.map(asUser)];
  const els = { ไฟ: 0, ดิน: 0, ลม: 0, น้ำ: 0 };
  all.forEach((x) => { const { m, d } = birthParts(x); els[zodiacOf(m, d)[2]] += 1; });
  const avg = Math.round(people.reduce((a, p) => a + compat(u, asUser(p)).pct, 0) / people.length);
  const strong = Object.entries(els).sort((a, b) => b[1] - a[1])[0];
  const missing = Object.entries(els).filter(([, n]) => !n).map(([k]) => k);
  const ELEMENT_NOTE = { ไฟ: 'กระตือรือร้น กล้าลุย', ดิน: 'มั่นคง ขยัน จริงจัง', ลม: 'ช่างคุย มีไอเดีย', น้ำ: 'อ่อนโยน ใส่ใจความรู้สึก' };
  return `<section class="cc-family">
    <div class="sec-head"><h3>ดวงทั้งครอบครัว / กลุ่ม</h3>${ring(avg)}</div>
    <div class="cc-els">${Object.entries(els).map(([k, n]) => `<div><small>ธาตุ${k}</small><span style="--n:${(n / all.length) * 100}%"></span><b>${n}</b></div>`).join('')}</div>
    <p class="reading-tip">✦ กลุ่มนี้มี<b>ธาตุ${strong[0]}</b>มากที่สุด จึงเด่นเรื่อง${ELEMENT_NOTE[strong[0]]}
      ${missing.length ? `<br>✦ ยังขาด<b>ธาตุ${missing.join(' ธาตุ')}</b> ลองเติมด้วยกิจกรรมที่ช่วยให้${missing.map((k) => ELEMENT_NOTE[k]).join(' และ ')}` : '<br>✦ ธาตุครบทั้ง 4 สมดุลดี'}</p>
    <ul class="cc-today">${[{ name: 'คุณ', icon: '⭐', u }, ...people.map((p) => ({ name: p.name, icon: relOf(p.rel).icon, u: asUser(p) }))].map((x) => {
      const r = computeDaily(x.u);
      return `<li><span>${x.icon} ${esc(x.name)}</span><b>${'★'.repeat(r.scores[0][1])}<i>${'★'.repeat(5 - r.scores[0][1])}</i></b><small>${r.mood.replace('วันนี้', '')}</small></li>`;
    }).join('')}</ul>
  </section>`;
}

function openCompat(id) {
  const u = currentUser();
  const p = (u.people || []).find((x) => x.id === id);
  if (!p || !u.birthdate) return;
  const r = relOf(p.rel);
  const c = compat(u, asUser(p));
  $('readingTitle').textContent = 'ดวงสมพงษ์';
  $('readingBody').innerHTML = `
    <div class="cc-pair"><div><span class="cc-av">⭐</span><b>คุณ</b></div>${ring(c.pct)}<div><span class="cc-av">${r.icon}</span><b>${esc(p.name)}</b></div></div>
    <p class="reading-lead">${r.name} · ${tipFor(r.kind, c.pct)}</p>
    <ul class="cc-lines">${c.lines.map(([t, a, b]) => `<li><small>${t}</small><b>${a}</b><p>${b}</p></li>`).join('')}</ul>
    <p class="reading-note">ผลจากราศี ปีนักษัตร เลขชีวิต และวันเกิด · เพื่อความบันเทิงและเป็นแนวทาง อยากรู้ลึกปรึกษาหมอดูได้ที่หมวดหมู่</p>`;
  openPanel('readingPanel');
}
function openPersonToday(id) {
  const p = (currentUser().people || []).find((x) => x.id === id);
  if (!p) return;
  $('readingTitle').textContent = `ดวงวันนี้ของ${p.name}`;
  $('readingBody').innerHTML = dailyHTML(computeDaily(asUser(p)), 'คำนวณจากวันเกิดของคนใกล้ตัว · เพื่อความบันเทิงและเป็นแนวทางชีวิต')
    .replace('ดวงของคุณวันนี้', `ดวงของ${esc(p.name)}วันนี้`);
  openPanel('readingPanel');
}

circleBody.addEventListener('submit', (e) => {
  if (e.target.id !== 'ccForm') return;
  e.preventDefault();
  const f = new FormData(e.target);
  const u = currentUser();
  u.people = [...(u.people || []), {
    id: Date.now().toString(36), rel: String(f.get('rel')), name: String(f.get('name')).trim(),
    birthdate: String(f.get('birthdate')), birthtime: String(f.get('birthtime') || ''), consentAt: Date.now(),
  }].slice(0, 20);
  saveUser(u);
  renderCircle();
  toast('เพิ่มคนใกล้ตัวแล้ว ✦');
});
circleBody.addEventListener('click', (e) => {
  const t = e.target;
  const c = t.closest('[data-compat]'); if (c) return openCompat(c.dataset.compat);
  const d = t.closest('[data-today]'); if (d) return openPersonToday(d.dataset.today);
  const x = t.closest('[data-del]');
  if (x) {
    if (!confirm('ลบคนนี้ออกจากรายชื่อ?')) return;
    const u = currentUser(); u.people = (u.people || []).filter((p) => p.id !== x.dataset.del); saveUser(u); renderCircle(); return;
  }
  if (t.closest('[data-edit-me]')) openEdit();
});

function openCircle() {
  if (!currentUser()) { requireLogin(openCircle); return; }
  renderCircle();
  openPanel('circlePanel');
}
circlePanel.style.zIndex = 19;

// การ์ดสรุปในหน้าบัญชี
function circleCard(u) {
  const people = u.people || [];
  return `<section class="pf-card">
    <div class="sec-head"><h3>คนใกล้ตัวของฉัน</h3><span class="sec-note">${people.length} คน</span></div>
    ${people.length ? `<div class="cc-chips">${people.slice(0, 6).map((p) => `<span>${relOf(p.rel).icon} ${esc(p.name)}</span>`).join('')}</div>` : '<p class="pf-empty">เพิ่มแฟน พ่อแม่ หรือเพื่อน เพื่อดูดวงสมพงษ์และดวงทั้งครอบครัว</p>'}
    <button class="btn-ghost full" data-open-circle>เปิดดวงคนใกล้ตัว ›</button>
  </section>`;
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-open-circle]')) openCircle(); });
