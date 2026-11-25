// ===== ดูดวงประจำวัน (สมาชิกรายเดือน): รายงานดวงทุกวันจากทุกศาสตร์ + ถามแม่หมอ AI =====
const AI_PRICE = (window.SITE_CFG && window.SITE_CFG.ai_price) || 150; // ราคาต่อเดือน (แก้ได้ในหลังบ้าน)
const AI_DAYS = 30;
// หมดอายุวันที่เดียวกันของเดือนถัดไป (ตรงกับ addMonth ฝั่งเซิร์ฟเวอร์) · 31 ม.ค. → 28/29 ก.พ.
function addMonth(ts) {
  const d = new Date(ts);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return d.getTime();
}
// คำเตือน (เลี่ยง… / ระวัง…) เป็นสีแดงให้เห็นชัด
const warnMark = (html) => ((window.LANG || 'th') !== 'th' ? html : html.replace(/((?:ต้อง|ควร)?(?:เลี่ยง|ระวัง)[^\s·()<.,]*)/g, '<span class="warn">⚠️ $1</span>'));
const aiRenewFrom = (u) => (u && u.aiUntil && u.aiUntil > Date.now() ? u.aiUntil : Date.now());
const AI_SUGGEST = ['ดวงความรักเดือนนี้เป็นอย่างไร', 'ควรเปลี่ยนงานช่วงนี้ไหม', 'สีมงคลและเลขนำโชคของฉัน', 'ดวงการเงินปีนี้', 'ฉันกับเขาเข้ากันได้ไหม'];

const aiPanel = makePanel('aiPanel', 'ดูดวงประจำวัน');
aiPanel.classList.add('ai-panel');
const aiBody = aiPanel.querySelector('.panel-body');

const aiActive = (u) => u && u.aiUntil && u.aiUntil > Date.now();

function openAI() {
  if (!currentUser()) { requireLogin(openAI, 'สมัครหรือเข้าสู่ระบบด้วยเบอร์โทร เพื่อดูดวงประจำวัน'); return; }
  closeAllPanels();
  setActiveTab('ai');
  renderAI();
  openPanel('aiPanel');
}

function renderAI() {
  const u = currentUser();
  if (!aiActive(u)) return renderAIPitch(u);
  renderChat(u);
}

// ---------- หน้าแนะนำ + สมัครรายเดือน ----------
function renderAIPitch(u) {
  const expired = u && u.aiUntil && u.aiUntil <= Date.now();
  aiBody.innerHTML = `
    <div class="ai-hero">
      <span class="ai-orb"><i>AI</i></span>
      <h3>ดูดวงประจำวัน รายเดือน</h3>
      <p>รายงานดวงของคุณทุกวัน ดึงจากทุกศาสตร์ด้วยข้อมูลเกิดของคุณ พร้อมถามแม่หมอ AI ได้ตลอด 24 ชั่วโมง</p>
    </div>
    <ul class="ai-perks">
      <li><span>📜</span><div><b>รายงานดวงทุกวัน</b><small>เปิดมาเจอดวงวันนี้ทันที ภาพรวม งาน เงิน รัก สุขภาพ</small></div></li>
      <li><span>🔮</span><div><b>รวมทุกศาสตร์</b><small>ราศี เลขศาสตร์ สีมงคลตามวัน ไพ่ทาโรต์ และทักษา</small></div></li>
      <li><span>♾️</span><div><b>ถามต่อได้ไม่จำกัด</b><small>สงสัยเรื่องไหนถามแม่หมอ AI ได้เลย ไม่จ่ายเพิ่ม</small></div></li>
      <li><span>🧬</span><div><b>รู้จักคุณ</b><small>ใช้วันเกิด เวลาเกิด และเรื่องที่สนใจจากโปรไฟล์</small></div></li>
      <li><span>⚡</span><div><b>ตอบทันที</b><small>ไม่ต้องรอคิวหมอดู</small></div></li>
    </ul>
    <div class="buy-row"><div><small>${expired ? 'สมาชิกหมดอายุแล้ว · ต่ออายุ' : 'สมาชิกรายเดือน'}</small><b>${AI_PRICE} ฿ <em>/ เดือน</em></b></div>
      <button class="btn-gold" id="aiSubscribe">${expired ? 'ต่ออายุ ›' : 'สมัครเลย ›'}</button></div>
    <p class="test-mode">🧪 โหมดทดลอง · ไม่มีการเก็บเงินจริง สมัครแล้วลองคุยได้เลย</p>
    <p class="pay-note">ชำระด้วย QR แล้วเริ่มคุยได้ทันที · คำทำนายเพื่อความบันเทิงและเป็นแนวทางชีวิต</p>`;
  $('aiSubscribe').addEventListener('click', () => startCheckout({
    key: 'ai-month', icon: '🔮', title: 'ดูดวงประจำวัน รายเดือน', sub: 'รายงานดวงทุกวันจากทุกศาสตร์ + ถามแม่หมอ AI',
    tiers: [{ label: '1 เดือน · ดวงทุกเช้า + ถาม AI ไม่จำกัด', price: AI_PRICE }], aiPlan: true,
    next: { kind: 'ai' },
  }));
}

// เรียกจาก checkout.js หลังชำระเงินสำเร็จ
function activateAI(until) {
  const u = currentUser();
  const from = aiActive(u) ? u.aiUntil : Date.now();
  u.aiUntil = until || addMonth(from); // until = วันหมดอายุจากเซิร์ฟเวอร์
  u.aiChat = u.aiChat || [];
  persistUser(u);
  closePanel('payPanel');
  openAI();
}

// ---------- รายงานดวงประจำวัน (คำนวณจากวันนี้ + ข้อมูลเกิด ได้ผลเดิมทั้งวัน) ----------
const DAILY_TAROT = [
  ['The Sun', '☀️', 'พลังบวกเต็มที่ เหมาะเริ่มเรื่องใหม่และเปิดตัว'], ['The Star', '⭐', 'ความหวังกลับมา มีคนพร้อมช่วยเหลือ'],
  ['The Empress', '🌸', 'ความอุดมสมบูรณ์ เงินและความรักงอกงาม'], ['The Magician', '🪄', 'ไอเดียดี ลงมือทำแล้วสำเร็จ'],
  ['Wheel of Fortune', '🎡', 'จังหวะชีวิตเปลี่ยนเป็นทางดี มีโชคเข้ามา'], ['Strength', '🦁', 'ใจเย็นแต่หนักแน่น จะผ่านเรื่องยากได้'],
  ['The Lovers', '💞', 'เรื่องหัวใจเด่น ต้องเลือกด้วยใจจริง'], ['Temperance', '⚖️', 'ค่อยเป็นค่อยไป หาจุดสมดุลแล้วทุกอย่างลงตัว'],
  ['The Chariot', '🏇', 'มุ่งมั่นไปข้างหน้า ชนะอุปสรรคได้'], ['The Hermit', '🏮', 'วันดีสำหรับทบทวนตัวเอง ตัดสินใจอย่างรอบคอบ'],
];
const TAKSA = ['บริวาร', 'อายุ', 'เดช', 'ศรี', 'มูละ', 'อุตสาหะ', 'มนตรี', 'กาลกิณี'];
const TAKSA_TIP = {
  บริวาร: 'คนรอบตัวช่วยหนุน งานที่ต้องพึ่งทีมจะไปได้ดี', อายุ: 'ดูแลสุขภาพ พักผ่อนให้พอ', เดช: 'มีอำนาจและความน่าเชื่อถือ เจรจาได้ผล',
  ศรี: 'โชคลาภและเสน่ห์เด่น เหมาะเรื่องเงินและความรัก', มูละ: 'เหมาะเก็บออม วางรากฐาน ทำเรื่องบ้านหรือทรัพย์สิน',
  อุตสาหะ: 'ขยันแล้วได้ผล งานค้างให้รีบเคลียร์', มนตรี: 'มีผู้ใหญ่ให้คำปรึกษา ขอความช่วยเหลือได้', กาลกิณี: 'ระวังคำพูดและการตัดสินใจเร่งด่วน',
};
function dayHash(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
const AREAS = [['ภาพรวม', 0], ['การงาน', 5], ['การเงิน', 9], ['ความรัก', 13], ['สุขภาพ', 17]];
const AREA_TIP = {
  การงาน: ['งานเดินหน้าได้ดี เหมาะเสนอไอเดียหรือเริ่มโปรเจกต์ใหม่', 'งานมีจุดสะดุดเล็กน้อย ตรวจรายละเอียดก่อนส่ง'],
  การเงิน: ['เงินเข้ามือ มีโอกาสได้โชคเล็ก ๆ', 'เลี่ยงการใช้จ่ายตามอารมณ์ เก็บเงินไว้ก่อนดีกว่า'],
  ความรัก: ['เสน่ห์แรง คนรอบตัวใจดีกับคุณ เหมาะบอกความรู้สึก', 'ใจเย็น ๆ ฟังอีกฝ่ายให้มากขึ้น เลี่ยงคำพูดแรง'],
  สุขภาพ: ['ร่างกายสดชื่น เหมาะออกกำลังกาย', 'พักผ่อนให้พอ ดื่มน้ำเยอะ ๆ ระวังเหนื่อยสะสม'],
};
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// คำนวณดวงของวันหนึ่ง (ผลเดิมทั้งวัน) → เก็บเป็นข้อมูล เพื่อแสดงและบันทึกประวัติ
function computeDaily(u, now = new Date()) {
  const key = dayKey(now);
  const seed = dayHash(`${localPhone(u.phone) || u.name}|${u.birthdate || ''}|${key}`);
  const pick = (arr, k) => arr[(seed >>> k) % arr.length];
  const stars = (k) => 2 + ((seed >>> k) % 4);               // 2–5 ดาว
  const today = DAY_COLORS[now.getDay()];
  const { m, d } = birthParts(u);
  const [zName, zSym, zEl] = zodiacOf(m, d);
  const personal = reduce(lifeNumber(u) + reduce(now.getDate()) + reduce(now.getMonth() + 1) + reduce(now.getFullYear()));
  const [numTitle, numText] = NUM_MEANING[personal];
  const card = pick(DAILY_TAROT, 3);
  const taksa = TAKSA[(now.getDay() - birthParts(u).date.getDay() + 8) % 8];
  // แฟ้มดวง: ชื่อ เบอร์ บ้าน ทะเบียน เลขบัตร ไพ่ เซียมซี รูป → ปรับดาวแต่ละด้าน ±1
  const file = typeof dailyFromFile === 'function' ? dailyFromFile(u, personal, now.getTime()) : { lines: [], used: [], adjust: {} };
  const parts = AREAS.slice(1).map(([label, k]) => [label, Math.max(1, Math.min(5, stars(k) + Math.sign(file.adjust[label] || 0)))]);
  const scores = [['ภาพรวม', Math.round(parts.reduce((a, [, n]) => a + n, 0) / parts.length)], ...parts]; // ภาพรวม = เฉลี่ย 4 ด้าน
  const lucky = [...new Set([personal, reduce(personal + 3), reduce(now.getDate() + lifeNumber(u))])];

  // ---- สรุปรวมจากทุกศาสตร์ ----
  const avg = parts.reduce((a, [, n]) => a + n, 0) / parts.length;
  const sub = parts;
  const best = sub.reduce((a, b) => (b[1] > a[1] ? b : a));
  const worst = sub.reduce((a, b) => (b[1] < a[1] ? b : a));
  const mood = avg >= 4.25 ? 'วันนี้ดวงเด่นมาก' : avg >= 3.5 ? 'วันนี้ดวงดี' : avg >= 2.75 ? 'วันนี้ดวงกลาง ๆ' : 'วันนี้ควรระวังตัว';
  const summary = `${mood} ${best[0]}เด่นที่สุด (${AREA_TIP[best[0]][0]})` +
    (worst[1] < best[1] ? ` ส่วน${worst[0]}ต้องระวัง ${AREA_TIP[worst[0]][1]}` : '') +
    ` · ไพ่ ${card[0]} บอกว่า${card[2]} ทักษาวันนี้ตกเป็น${taksa} ${TAKSA_TIP[taksa]}` +
    ` · ใส่สี${today.money}เสริมการเงิน สี${today.love}เสริมความรัก เลขนำโชค ${lucky.join(' ')}`+
    (file.used.length ? ` · รวมข้อมูลจากแฟ้มดวงของคุณ ${file.used.length} เรื่อง` : '');

  return {
    key, date: now.getTime(), scores, summary, mood,
    zodiac: { name: zName, sym: zSym, el: zEl, tip: ELEMENT_TIP[zEl] },
    number: { n: personal, title: numTitle, text: numText },
    color: { day: today.day, work: today.work, money: today.money, love: today.love, avoid: today.avoid },
    card, taksa: { name: taksa, tip: TAKSA_TIP[taksa] }, lucky,
    file: { lines: file.lines, used: file.used },
  };
}

function dailyHTML(r, note = '') {
  const row = ([label, n]) => `<li><span>${label}</span><b>${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></b></li>`;
  const c = r.color;
  return `<article class="daily">
    <header class="daily-head"><span class="daily-date">${new Date(r.date).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span><h3>ดวงของคุณวันนี้</h3></header>
    <div class="daily-sum"><b>✦ สรุปรวมจากทุกศาสตร์</b><p>${warnMark(esc(r.summary))}</p></div>
    <ul class="daily-stars">${r.scores.map(row).join('')}</ul>
    <div class="daily-grid">
      <div class="dg"><small>♈&#xFE0E; โหราศาสตร์ · ราศี${r.zodiac.name}</small><b>${r.zodiac.sym}&#xFE0E; ธาตุ${r.zodiac.el}</b><p>${r.zodiac.tip}</p></div>
      <div class="dg"><small>🔢 เลขศาสตร์ · เลขประจำวัน</small><b>${r.number.n} · ${r.number.title}</b><p>${r.number.text}</p></div>
      <div class="dg"><small>🎨 สีมงคลวัน${c.day}</small><b class="dg-colors">${['work', 'money', 'love'].map((k) => `<span class="sw" style="background:${HEX[c[k]]}" title="${c[k]}"></span>`).join('')}</b>
        <p>งาน<b>สี${c.work}</b> · เงิน<b>สี${c.money}</b> · รัก<b>สี${c.love}</b></p>
        <p class="avoid-txt">ควรเลี่ยง<b>สี${c.avoid}</b></p>
        <div class="avoid-corner"><small>🚫 สีที่ควรเลี่ยง</small><b class="dg-colors"><span class="sw" style="background:${HEX[c.avoid]}" title="${c.avoid}"></span></b></div></div>
      <div class="dg"><small>🃏 ไพ่ทาโรต์ประจำวัน</small><b>${r.card[1]} ${r.card[0]}</b><p>${r.card[2]}</p></div>
      <div class="dg"><small>🪷 ทักษา · วันนี้ตกเป็น</small><b>${r.taksa.name}</b><p>${r.taksa.tip}</p></div>
      <div class="dg"><small>🍀 เลขนำโชควันนี้</small><b class="dg-nums">${r.lucky.map((n) => `<span>${n}</span>`).join('')}</b><p>ใช้เป็นเลขโปรดของวัน</p></div>
    </div>
    ${r.file && r.file.lines.length ? `<div class="daily-file"><b>📂 จากแฟ้มดวงของคุณ</b><ul>${r.file.lines.map((l) =>
      `<li><span>${l.icon}</span><div><small>${esc(l.label)}</small><p>${esc(l.text)}</p></div></li>`).join('')}</ul></div>` : ''}
    ${r.file && r.file.used.length ? `<p class="daily-used">ข้อมูลที่ใช้วันนี้: ${r.file.used.map(esc).join(' · ')}</p>` : ''}
    ${note ? `<p class="daily-note">${note}</p>` : ''}
  </article>`;
}

// รายงานของวันนี้ + บันทึกลงประวัติวันละ 1 รายการ
function dailyReport(u) {
  const r = computeDaily(u);
  if (!(u.history || []).some((h) => h.kind === 'daily' && h.key === r.key)) {
    addHistory({ kind: 'daily', icon: '📜', title: 'รายงานดวงประจำวัน', key: r.key, report: r });
  }
  const past = (currentUser().history || []).filter((h) => h.kind === 'daily' && h.key !== r.key).slice(0, 6);
  return dailyHTML(r, `${u.birthdate ? 'อัปเดตใหม่ทุกวันตอนเที่ยงคืน' : 'เพิ่มวันเกิดในหน้าบัญชี รายงานจะตรงกับคุณมากขึ้น'} · เพื่อความบันเทิงและเป็นแนวทางชีวิต`) +
    (past.length ? `<div class="daily-past"><small>รายงานย้อนหลัง</small><div>${past.map((h) =>
      `<button data-hist-daily="${h.id}">${new Date(h.report.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}<em>${h.report.mood.replace('วันนี้', '')}</em></button>`).join('')}</div></div>` : '');
}

// ---------- หน้าแชท ----------
function renderChat(u) {
  stopSpeaking();
  const chat = u.aiChat || [];
  aiBody.innerHTML = `
    <p class="ai-member">✦ สมาชิกถึง ${thDate(u.aiUntil)}</p>
    <form class="ai-code ${u.aiCode ? 'set' : ''}" id="aiCodeForm">
      <span>🔑</span>
      ${u.aiCode
        ? `<b>ใช้รหัสทดลอง AI แล้ว</b><button type="button" class="link" id="aiCodeClear">เปลี่ยนรหัส</button>`
        : `<input name="code" type="text" autocomplete="off" placeholder="รหัสทดลองใช้ AI (ถ้ามี)" maxlength="40"><button class="btn-gold" type="submit">ใช้รหัส</button>`}
    </form>
    <p class="ai-code-note" id="aiCodeNote">${u.aiCode ? '' : 'ไม่มีรหัสก็ลองคุยได้ แม่หมอจะตอบแบบตัวอย่าง'}</p>
    ${dailyReport(u)}
    <button class="btn-gold full slip-open" data-slip-daily>📜 รับใบผลดวงวันนี้ · บันทึกเป็นรูป</button>
    <button class="cc-link" data-open-circle><span>👨‍👩‍👧</span><b>ดวงคนใกล้ตัววันนี้</b><small>แฟน · ครอบครัว · เพื่อน</small><em>›</em></button>
    <p class="ai-sub">✦ สงสัยเรื่องไหน ถามแม่หมอ AI ต่อได้เลย</p>
    <div class="ai-log" id="aiLog">
      ${aiBubble(`สวัสดีค่ะ คุณ${displayName(u)} ✦ แม่หมอ AI พร้อมดูดวงให้แล้ว อยากรู้เรื่องไหนถามได้เลยนะคะ${u.birthdate ? '' : '\nเพิ่มวันเกิดในหน้าบัญชี จะได้วิเคราะห์ได้แม่นขึ้นค่ะ'}`)}
      ${chat.map((m) => (m.role === 'user' ? `<div class="bubble me" translate="no">${fmtMsg(m.content)}</div>` : aiBubble(m.content))).join('')}
    </div>
    <div class="ai-chips" id="aiChips">${AI_SUGGEST.map((s) => `<button data-ask="${s}">${s}</button>`).join('')}</div>
    <p class="ai-quota" id="aiQuota" hidden></p>
    <form class="ai-input" id="aiForm">
      ${Recognition ? '<button type="button" class="ai-mic" id="aiMic" aria-label="กดพูดถาม" aria-pressed="false">🎙️</button>' : ''}
      <textarea name="q" rows="1" maxlength="1500" placeholder="พิมพ์หรือกดไมค์เพื่อพูด…" required></textarea>
      <button class="btn-gold" type="submit" aria-label="ส่ง">➤</button>
    </form>`;
  scrollLog();
  $('aiCodeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = e.target.code?.value.trim();
    if (!code) return;
    const cur = currentUser(); cur.aiCode = code; persistUser(cur);
    renderChat(cur);
    toast('บันทึกรหัสแล้ว ลองถามแม่หมอ AI ได้เลย ✦');
  });
  $('aiCodeClear')?.addEventListener('click', () => {
    const cur = currentUser(); delete cur.aiCode; persistUser(cur); renderChat(cur);
  });
  const form = $('aiForm');
  const ta = form.q;
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 110)}px`; });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener('submit', (e) => { e.preventDefault(); ask(ta.value); ta.value = ''; ta.style.height = 'auto'; });
  aiBody.querySelectorAll('[data-hist-daily]').forEach((b) => b.addEventListener('click', () => openHistory(b.dataset.histDaily)));
  $('aiChips').addEventListener('click', (e) => { const b = e.target.closest('[data-ask]'); if (b) ask(b.dataset.ask); });
  loadQuota(u);
}

// ---------- จำนวนคำถามที่เหลือวันนี้ (fair use) ----------
function showQuota(q) {
  const el = $('aiQuota');
  if (!el) return;
  if (!q) { el.hidden = true; return; }
  el.hidden = false;
  el.classList.toggle('low', q.left <= 3);
  el.textContent = q.left > 0
    ? `วันนี้ถามได้อีก ${q.left} จาก ${q.limit} คำถาม`
    : `วันนี้ใช้ครบ ${q.limit} คำถามแล้ว พรุ่งนี้ถามต่อได้ค่ะ`;
}
async function loadQuota(u) {
  try {
    const r = await fetch('/api/chat', { headers: { 'X-AI-Code': u.aiCode || '' } });
    if (r.ok) showQuota((await r.json()).quota);
  } catch (_) { /* เปิดในเครื่องแบบไม่มีเซิร์ฟเวอร์ */ }
}
const fmtMsg = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
// คำตอบของแม่หมอ + ปุ่มฟังเสียง
const aiBubble = (t) => `<div class="bubble ai"><div class="b-text">${fmtMsg(t)}</div>${canSpeak ? '<button type="button" class="speak" data-speak aria-label="ฟังเสียงอ่าน">🔊 ฟัง</button>' : ''}</div>`;

// ---------- พูดถาม (แปลงเสียงเป็นข้อความ) ----------
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
function toggleMic() {
  if (!Recognition) return;
  if (rec) { rec.stop(); return; }
  const ta = $('aiForm').q;
  const mic = $('aiMic');
  stopSpeaking();
  rec = new Recognition();
  rec.lang = window.LANG_LOCALE || 'th-TH';
  rec.interimResults = true;
  rec.continuous = false;
  let finalText = '';
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    ta.value = (finalText + interim).trim();
  };
  rec.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('กรุณาอนุญาตให้ใช้ไมโครโฟนในเบราว์เซอร์ก่อนนะคะ');
    else if (e.error === 'no-speech') toast('ไม่ได้ยินเสียง ลองกดไมค์แล้วพูดอีกครั้งนะคะ');
  };
  rec.onend = () => {
    mic.classList.remove('on'); mic.setAttribute('aria-pressed', 'false');
    ta.placeholder = 'พิมพ์หรือกดไมค์เพื่อพูด…';
    rec = null;
    // พูดจบ → ส่งคำถามให้แม่หมออัตโนมัติ
    if (finalText.trim()) { ask(finalText); ta.value = ''; }
  };
  mic.classList.add('on'); mic.setAttribute('aria-pressed', 'true');
  ta.value = '';
  ta.placeholder = 'กำลังฟัง… พูดคำถามได้เลย';
  rec.start();
}

// ---------- อ่านคำตอบออกเสียง ----------
const canSpeak = 'speechSynthesis' in window;
let speakingBtn = null;
function thaiVoice() {
  const vs = speechSynthesis.getVoices();
  const want = window.LANG_LOCALE || 'th-TH';
  return vs.find((v) => v.lang === want) || vs.find((v) => v.lang && v.lang.startsWith(want.slice(0, 2)));
}
function stopSpeaking() {
  if (!canSpeak) return;
  speechSynthesis.cancel();
  if (speakingBtn) { speakingBtn.classList.remove('on'); speakingBtn.textContent = '🔊 ฟัง'; speakingBtn = null; }
}
function speak(btn) {
  if (speakingBtn === btn) { stopSpeaking(); return; }
  stopSpeaking();
  const text = btn.parentElement.querySelector('.b-text').innerText
    .replace(/\(โหมดตัวอย่าง[^)]*\)/g, '').replace(/[✦✧☾☽☀☸•]/g, ' ').trim();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = window.LANG_LOCALE || 'th-TH';
  const v = thaiVoice();
  if (v) u.voice = v;
  u.rate = 0.95;
  u.onend = u.onerror = () => { if (speakingBtn === btn) stopSpeaking(); };
  speakingBtn = btn;
  btn.classList.add('on');
  btn.textContent = '⏹ หยุด';
  speechSynthesis.speak(u);
}
if (canSpeak) speechSynthesis.getVoices(); // โหลดรายชื่อเสียงไว้ก่อน
aiPanel.querySelector('.back').addEventListener('click', () => { stopSpeaking(); if (rec) rec.abort(); });
aiPanel.addEventListener('click', (e) => {
  const b = e.target.closest('[data-speak]');
  if (b) speak(b);
  if (e.target.closest('#aiMic')) toggleMic();
});
function scrollLog() { const l = $('aiLog'); if (l) aiPanel.scrollTop = aiPanel.scrollHeight; }

let asking = false;
async function ask(text) {
  const q = String(text || '').trim();
  if (!q || asking) return;
  const u = currentUser();
  if (!aiActive(u)) return renderAI();
  asking = true;
  u.aiChat = [...(u.aiChat || []), { role: 'user', content: q }].slice(-50);
  persistUser(u);
  const log = $('aiLog');
  log.insertAdjacentHTML('beforeend', `<div class="bubble me" translate="no">${fmtMsg(q)}</div><div class="bubble ai typing" id="aiTyping"><span class="t-dots"><i></i><i></i><i></i></span><small class="t-step">${THINK_STEPS[0]}</small></div>`);
  scrollLog();
  // แม่หมอ “ค้นดวง” สักครู่ก่อนตอบ: ข้อความสถานะเปลี่ยนไปเรื่อย ๆ + ใช้เวลาอย่างน้อย 4–7 วินาที (คำถามยาวคิดนานขึ้น)
  let step = 0;
  const stepTimer = setInterval(() => {
    step = Math.min(step + 1, THINK_STEPS.length - 1);
    const el = document.querySelector('#aiTyping .t-step');
    if (el) el.textContent = THINK_STEPS[step];
  }, 1500);
  const thinking = new Promise((r) => setTimeout(r, Math.min(7000, 4000 + q.length * 40 + Math.random() * 1500)));

  let reply;
  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-AI-Code': u.aiCode || '' },
      body: JSON.stringify({
        messages: u.aiChat.slice(-20),
        profile: { first: displayName(u), last: displayName(u, true).split(' ').slice(1).join(' '), birthdate: u.birthdate, birthtime: u.birthtime, birthplace: u.birthplace,
          gender: u.gender, relation: u.relation, interests: u.interests, today: new Date().toISOString().slice(0, 10),
          file: typeof fortuneFileText === 'function' ? fortuneFileText(u) : '', lang: window.LANG || 'th' },
      }),
    });
    if (r.ok) { const d = await r.json(); reply = d.reply; showQuota(d.quota); }
    else if (r.status === 429) {
      const d = await r.json().catch(() => ({}));
      if (d.error === 'daily_limit') {
        showQuota(d.quota);
        reply = `วันนี้คุณถามแม่หมอครบ ${d.quota?.limit || ''} คำถามแล้วค่ะ ✦ พักใจก่อน พรุ่งนี้มาถามต่อได้เลยนะคะ\nระหว่างนี้รับใบผลดวงวันนี้ หรือดูดวงคนใกล้ตัวด้านบนได้ค่ะ`;
      } else reply = 'ตอนนี้มีคนถามเยอะมาก รอสักครู่แล้วลองใหม่นะคะ 🙏';
    }
    else if (r.status === 401) {
      // ไม่มีรหัส / รหัสผิด → ตอบแบบตัวอย่าง และบอกให้กรอกรหัส
      reply = demoReply(q, u, u.aiCode ? 'รหัสทดลองใช้ AI ไม่ถูกต้อง' : 'ยังไม่ได้กรอกรหัสทดลองใช้ AI');
      if (u.aiCode) { const cur = currentUser(); delete cur.aiCode; persistUser(cur); }
    }
  } catch (_) { /* ไม่มีเซิร์ฟเวอร์ AI (เช่น เปิดในเครื่อง) → ใช้คำตอบตัวอย่าง */ }
  if (!reply) reply = demoReply(q, u);
  await thinking;
  clearInterval(stepTimer);

  $('aiTyping')?.remove();
  const cur = currentUser();
  cur.aiChat = [...(cur.aiChat || []), { role: 'assistant', content: reply }].slice(-50);
  persistUser(cur);
  await typeOut(log, reply); // พิมพ์คำตอบทีละบรรทัด เหมือนแม่หมอกำลังเขียน
  if (u.aiCode && !currentUser().aiCode) renderChat(currentUser()); // รหัสผิด → แสดงช่องกรอกใหม่
  scrollLog();
  asking = false;
}

// ---------- แม่หมอกำลังคิด / กำลังพิมพ์ ----------
const THINK_STEPS = ['แม่หมอกำลังเปิดดวงของคุณ…', 'กำลังดูราศีและวันเกิด…', 'กำลังคำนวณเลขศาสตร์…', 'กำลังเปิดไพ่ให้คำถามนี้…', 'กำลังรวบรวมคำทำนาย…'];
const calm = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
async function typeOut(log, reply) {
  if (calm()) { log.insertAdjacentHTML('beforeend', aiBubble(reply)); return; }
  log.insertAdjacentHTML('beforeend', '<div class="bubble ai writing"><div class="b-text"></div></div>');
  const bubble = log.lastElementChild;
  const box = bubble.querySelector('.b-text');
  const lines = fmtMsg(reply).split('<br>');
  for (let i = 0; i < lines.length; i += 1) {
    const line = document.createElement('span');
    line.className = 'type-line';
    line.innerHTML = lines[i] + (i < lines.length - 1 ? '<br>' : '');
    box.appendChild(line);
    scrollLog();
    // บรรทัดยาวใช้เวลานานกว่า (เหมือนพิมพ์) · บรรทัดว่างผ่านเร็ว
    const len = line.textContent.trim().length;
    await new Promise((r) => setTimeout(r, len ? Math.min(1100, 250 + len * 12) : 120));
  }
  bubble.outerHTML = aiBubble(reply); // ใส่ปุ่มฟังเสียงตอนพิมพ์เสร็จ
}

// ---------- คำตอบตัวอย่าง (ใช้เมื่อยังไม่ได้เชื่อม AI บนเซิร์ฟเวอร์) ----------
// ตอบตามเรื่องที่ถาม (ความรัก / งาน / เงิน / สุขภาพ / สี-เลขมงคล / คู่ / เรียน / ครอบครัว) จากดวงวันนี้และข้อมูลเกิดจริง
const Q_TOPICS = [
  ['lucky', /สี|เลข|นำโชค|มงคล/],
  ['couple', /เข้ากัน|คู่|แฟน.*(?:กับ|เขา)|ฉันกับ/],
  ['love', /รัก|แฟน|โสด|หัวใจ|คนคุย|แต่งงาน|เนื้อคู่/],
  ['work', /งาน|อาชีพ|เปลี่ยนงาน|เลื่อน|หัวหน้า|ธุรกิจ|สัมภาษณ์|สมัคร/],
  ['money', /เงิน|การเงิน|หนี้|ลงทุน|รวย|โชคลาภ|หวย|รายได้/],
  ['health', /สุขภาพ|ป่วย|นอน|เหนื่อย|ร่างกาย/],
  ['study', /เรียน|สอบ|ทุน|มหาลัย/],
  ['family', /ครอบครัว|พ่อ|แม่|ลูก|บ้าน|ญาติ/],
];
const AREA_OF = { love: 'ความรัก', couple: 'ความรัก', work: 'การงาน', money: 'การเงิน', health: 'สุขภาพ', study: 'การงาน', family: 'ภาพรวม' };
const WHEN_OF = (q) => (/ปีนี้|ปีหน้า|ทั้งปี/.test(q) ? 'ปีนี้' : /เดือน/.test(q) ? 'เดือนนี้' : /สัปดาห์|อาทิตย์/.test(q) ? 'สัปดาห์นี้' : 'ช่วงนี้');
const VERDICT = {
  5: 'ดวงเปิดทางเต็มที่ เป็นจังหวะที่ดีมากสำหรับเรื่องนี้',
  4: 'แนวโน้มไปในทางที่ดี มีแรงหนุน ขอแค่ไม่ประมาท',
  3: 'ยังก้ำกึ่ง มีทั้งโอกาสและบททดสอบ ผลขึ้นกับการตัดสินใจของคุณ',
  2: 'ยังไม่ใช่จังหวะที่ดีที่สุด ควรชะลอและเตรียมตัวก่อน',
  1: 'ช่วงนี้ควรระวังเป็นพิเศษ ถอยมาตั้งหลักก่อนจะดีกว่า',
};
function demoReply(q, u, why = 'ยังไม่ได้เชื่อม AI จริงบนเซิร์ฟเวอร์') {
  const note = `\n\n(คำตอบตัวอย่าง · ${why})`;
  if (!u.birthdate) return `อยากดูให้ตรงตัวคุณจริง ๆ แม่หมอต้องรู้วันเกิดก่อนค่ะ เพิ่มวันเกิดในหน้าบัญชีแล้วถามใหม่ได้เลยนะคะ ✦${note}`;
  const topic = (Q_TOPICS.find(([, re]) => re.test(q)) || ['general'])[0];
  const r = computeDaily(u);
  const c = r.color;
  const { m, d, date } = birthParts(u);
  const [zName, , zEl] = zodiacOf(m, d);
  const born = DAY_COLORS[date.getDay()];
  const life = lifeNumber(u);
  const when = WHEN_OF(q);
  const star = Object.fromEntries(r.scores);
  const area = AREA_OF[topic] || 'ภาพรวม';
  const n = star[area] || star['ภาพรวม'];
  const tip = (AREA_TIP[area] || AREA_TIP.การงาน || ['', ''])[n >= 4 ? 0 : 1];
  const out = [];

  if (topic === 'lucky') {
    out.push(`**สีมงคลประจำตัว (เกิดวัน${born.day})** — สี${born.birth}คือสีประจำวันเกิด เสริมงานด้วยสี${born.work} เสริมเงินด้วยสี${born.money} เสริมเสน่ห์ด้วยสี${born.love} และควรเลี่ยงสี${born.avoid}ในวันสำคัญ`);
    out.push(`**สีมงคลวันนี้ (วัน${c.day})** — งานสี${c.work} · เงินสี${c.money} · รักสี${c.love} · ⚠️ เลี่ยงสี${c.avoid}`);
    out.push(`**เลขนำโชค** — เลขชีวิตของคุณคือ ${life} (${NUM_MEANING[life][0]}) ส่วนเลขนำโชควันนี้คือ ${r.lucky.join(' · ')}`);
    out.push(`**วิธีใช้** — เลือกเลขเหล่านี้เป็นเลขลงท้ายรหัส เบอร์ หรือวันนัดสำคัญ และพกของสี${c.money}ติดตัวในวันที่ต้องเจรจาเรื่องเงิน`);
    out.push(`สรุป: สีและเลขเป็นตัวช่วยเสริมความมั่นใจ ใช้คู่กับความตั้งใจของคุณ แล้วจังหวะดีจะมาหาเองค่ะ ✦`);
    return out.join('\n') + note;
  }
  if (topic === 'couple') {
    const match = { ไฟ: 'ลม', ลม: 'ไฟ', ดิน: 'น้ำ', น้ำ: 'ดิน' }[zEl];
    out.push(`**พื้นดวงของคุณ** — ราศี${zName} ธาตุ${zEl} ${ELEMENT_TIP[zEl]}`);
    out.push(`**ดวงความรักวันนี้ ${'★'.repeat(star.ความรัก)}${'☆'.repeat(5 - star.ความรัก)}** — ${AREA_TIP.ความรัก[star.ความรัก >= 4 ? 0 : 1]}`);
    out.push(`**คนที่เข้ากันง่าย** — ธาตุ${zEl}ไปได้ดีกับธาตุ${match}และธาตุเดียวกัน ถ้าเขาเป็นธาตุอื่นก็ไม่ใช่ว่าไปกันไม่ได้ แค่ต้องเรียนรู้จังหวะกันมากขึ้น`);
    out.push(`**อยากรู้ให้ชัด** — เพิ่มวันเกิดของเขาใน “ดวงคนใกล้ตัว” แม่หมอจะเทียบราศี ธาตุ และเลขชีวิตของทั้งคู่ให้แบบละเอียดค่ะ`);
    out.push(`สรุป: ความเข้ากันไม่ได้อยู่ที่ดวงอย่างเดียว ${star.ความรัก >= 4 ? 'ช่วงนี้ดวงรักเปิด เหมาะเปิดใจคุยกันตรง ๆ' : 'ช่วงนี้ใจเย็นและฟังกันให้มาก แล้วความสัมพันธ์จะแน่นขึ้น'} ✦`);
    return out.join('\n') + note;
  }

  const LEAD = {
    love: `**ดวงความรัก${when}**`, work: `**ดวงการงาน${when}**`, money: `**ดวงการเงิน${when}**`, health: `**ดวงสุขภาพ${when}**`,
    study: `**ดวงการเรียน${when}**`, family: `**ดวงครอบครัว${when}**`, general: `**ภาพรวมดวง${when}**`,
  };
  out.push(`${LEAD[topic]} ${'★'.repeat(n)}${'☆'.repeat(5 - n)} — ${VERDICT[n]}`);
  out.push(`**พื้นดวง** — ราศี${zName} ธาตุ${zEl} ${ELEMENT_TIP[zEl]} · เลขชีวิต ${life} ${NUM_MEANING[life][1]}`);
  const SPECIFIC = {
    love: `${tip} · ไพ่ ${r.card[0]} บอกว่า${r.card[2]}`,
    work: `${tip} · ทักษาวันนี้ตกเป็น${r.taksa.name} ${r.taksa.tip}${/เปลี่ยนงาน|ลาออก/.test(q) ? (n >= 4 ? ' ถ้ามีที่ใหม่ที่ชัดเจนแล้ว จังหวะนี้ขยับได้' : ' ยังไม่ควรลาออกตอนนี้ หาที่ใหม่ให้ได้ก่อนแล้วค่อยตัดสินใจ') : ''}`,
    money: `${tip} · เลขนำโชคของคุณช่วงนี้คือ ${r.lucky.join(' ')}${/ลงทุน|หุ้น|คริปโต/.test(q) ? ' เรื่องลงทุนก้อนใหญ่ให้ศึกษาข้อมูลและปรึกษาผู้รู้ก่อนเสมอ' : ''}`,
    health: `${tip} · เรื่องอาการเจ็บป่วยจริงควรปรึกษาแพทย์ ดวงเป็นแค่แนวทางให้ดูแลตัวเองค่ะ`,
    study: `${(AREA_TIP.การงาน)[n >= 4 ? 0 : 1].replace('งาน', 'การเรียน')} · เลขประจำวัน ${r.number.n} ${r.number.title} ${r.number.text}`,
    family: `ไพ่ ${r.card[0]} บอกว่า${r.card[2]} · ทักษาวันนี้ตกเป็น${r.taksa.name} ${r.taksa.tip}`,
    general: `${r.summary.split(' · ')[0]}`,
  };
  out.push(`**สิ่งที่ดวงบอก** — ${SPECIFIC[topic]}`);
  const COLOR = { love: c.love, money: c.money, work: c.work, study: c.work, health: born.birth, family: born.birth, general: c.money };
  out.push(`**ทางเสริมดวง** — ใส่หรือพกของสี${COLOR[topic]} · ใช้เลข ${r.lucky[0]} เป็นเลขโปรด · ⚠️ เลี่ยงสี${c.avoid}ในวันสำคัญ`);
  out.push(`สรุป: ${n >= 4 ? `${when}เป็นจังหวะของคุณ กล้าลงมือแล้วผลจะออกมาดี` : n === 3 ? `ค่อย ๆ ไปทีละก้าว เตรียมตัวให้พร้อม แล้วทางจะชัดขึ้นเอง` : `ถอยมาตั้งหลักก่อน ดูแลใจให้นิ่ง อีกไม่นานจังหวะดีจะเวียนมา`} ✦`);
  return out.join('\n') + note;
}

// ---------- ปุ่มกลางเมนูล่าง ----------
document.querySelector('.tab-center').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openAI(); }, true);
