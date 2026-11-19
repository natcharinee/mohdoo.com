// ===== ดูดวงประจำวัน (สมาชิกรายเดือน): รายงานดวงทุกวันจากทุกศาสตร์ + ถามแม่หมอ AI =====
const AI_PRICE = 150;      // ราคาต่อเดือน
const AI_DAYS = 30;
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
    <div class="buy-row"><div><small>${expired ? 'สมาชิกหมดอายุแล้ว · ต่ออายุ' : 'สมาชิกรายเดือน'}</small><b>${AI_PRICE} ฿ <em>/ ${AI_DAYS} วัน</em></b></div>
      <button class="btn-gold" id="aiSubscribe">${expired ? 'ต่ออายุ ›' : 'สมัครเลย ›'}</button></div>
    <p class="test-mode">🧪 โหมดทดลอง · ไม่มีการเก็บเงินจริง สมัครแล้วลองคุยได้เลย</p>
    <p class="pay-note">ชำระด้วย QR แล้วเริ่มคุยได้ทันที · คำทำนายเพื่อความบันเทิงและเป็นแนวทางชีวิต</p>`;
  $('aiSubscribe').addEventListener('click', () => startCheckout({
    key: 'ai-month', icon: '🔮', title: 'ดูดวงประจำวัน รายเดือน', sub: 'รายงานดวงทุกวันจากทุกศาสตร์ + ถามแม่หมอ AI',
    tiers: [{ label: `${AI_DAYS} วัน · รายงานทุกวัน`, price: AI_PRICE }],
    next: { kind: 'ai' },
  }));
}

// เรียกจาก checkout.js หลังชำระเงินสำเร็จ
function activateAI() {
  const u = currentUser();
  const from = aiActive(u) ? u.aiUntil : Date.now();
  u.aiUntil = from + AI_DAYS * 864e5;
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
  const seed = dayHash(`${u.phone || u.name}|${u.birthdate || ''}|${key}`);
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
    <div class="daily-sum"><b>✦ สรุปรวมจากทุกศาสตร์</b><p>${esc(r.summary)}</p></div>
    <ul class="daily-stars">${r.scores.map(row).join('')}</ul>
    <div class="daily-grid">
      <div class="dg"><small>♈&#xFE0E; โหราศาสตร์ · ราศี${r.zodiac.name}</small><b>${r.zodiac.sym}&#xFE0E; ธาตุ${r.zodiac.el}</b><p>${r.zodiac.tip}</p></div>
      <div class="dg"><small>🔢 เลขศาสตร์ · เลขประจำวัน</small><b>${r.number.n} · ${r.number.title}</b><p>${r.number.text}</p></div>
      <div class="dg"><small>🎨 สีมงคลวัน${c.day}</small><b class="dg-colors">${['work', 'money', 'love'].map((k) => `<span class="sw" style="background:${HEX[c[k]]}" title="${c[k]}"></span>`).join('')}</b>
        <p>งาน<b>สี${c.work}</b> · เงิน<b>สี${c.money}</b> · รัก<b>สี${c.love}</b><br>เลี่ยง<b>สี${c.avoid}</b></p></div>
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
    <button class="cc-link" data-open-circle><span>👨‍👩‍👧</span><b>ดวงคนใกล้ตัววันนี้</b><small>แฟน · ครอบครัว · เพื่อน</small><em>›</em></button>
    <p class="ai-sub">✦ สงสัยเรื่องไหน ถามแม่หมอ AI ต่อได้เลย</p>
    <div class="ai-log" id="aiLog">
      ${aiBubble(`สวัสดีค่ะ คุณ${u.first || u.name} ✦ แม่หมอ AI พร้อมดูดวงให้แล้ว อยากรู้เรื่องไหนถามได้เลยนะคะ${u.birthdate ? '' : '\nเพิ่มวันเกิดในหน้าบัญชี จะได้วิเคราะห์ได้แม่นขึ้นค่ะ'}`)}
      ${chat.map((m) => (m.role === 'user' ? `<div class="bubble me">${fmtMsg(m.content)}</div>` : aiBubble(m.content))).join('')}
    </div>
    <div class="ai-chips" id="aiChips">${AI_SUGGEST.map((s) => `<button data-ask="${s}">${s}</button>`).join('')}</div>
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
  rec.lang = 'th-TH';
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
  return vs.find((v) => v.lang === 'th-TH') || vs.find((v) => v.lang && v.lang.startsWith('th'));
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
  u.lang = 'th-TH';
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
  log.insertAdjacentHTML('beforeend', `<div class="bubble me">${fmtMsg(q)}</div><div class="bubble ai typing" id="aiTyping"><i></i><i></i><i></i></div>`);
  scrollLog();

  let reply;
  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-AI-Code': u.aiCode || '' },
      body: JSON.stringify({
        messages: u.aiChat.slice(-20),
        profile: { first: u.first, last: u.last, birthdate: u.birthdate, birthtime: u.birthtime, birthplace: u.birthplace,
          gender: u.gender, relation: u.relation, interests: u.interests, today: new Date().toISOString().slice(0, 10),
          file: typeof fortuneFileText === 'function' ? fortuneFileText(u) : '' },
      }),
    });
    if (r.ok) reply = (await r.json()).reply;
    else if (r.status === 429) reply = 'ตอนนี้มีคนถามเยอะมาก รอสักครู่แล้วลองใหม่นะคะ 🙏';
    else if (r.status === 401) {
      // ไม่มีรหัส / รหัสผิด → ตอบแบบตัวอย่าง และบอกให้กรอกรหัส
      reply = demoReply(q, u, u.aiCode ? 'รหัสทดลองใช้ AI ไม่ถูกต้อง' : 'ยังไม่ได้กรอกรหัสทดลองใช้ AI');
      if (u.aiCode) { const cur = currentUser(); delete cur.aiCode; persistUser(cur); }
    }
  } catch (_) { /* ไม่มีเซิร์ฟเวอร์ AI (เช่น เปิดในเครื่อง) → ใช้คำตอบตัวอย่าง */ }
  if (!reply) reply = demoReply(q, u);

  $('aiTyping')?.remove();
  const cur = currentUser();
  cur.aiChat = [...(cur.aiChat || []), { role: 'assistant', content: reply }].slice(-50);
  persistUser(cur);
  log.insertAdjacentHTML('beforeend', aiBubble(reply));
  if (u.aiCode && !currentUser().aiCode) renderChat(currentUser()); // รหัสผิด → แสดงช่องกรอกใหม่
  scrollLog();
  asking = false;
}

// ---------- คำตอบตัวอย่าง (ใช้เมื่อยังไม่ได้เชื่อม AI บนเซิร์ฟเวอร์) ----------
function demoReply(q, u, why = 'ยังไม่ได้เชื่อม AI จริงบนเซิร์ฟเวอร์') {
  const out = [];
  if (u.birthdate) {
    const { m, d, date } = birthParts(u);
    const [zName, , zEl] = zodiacOf(m, d);
    const c = DAY_COLORS[date.getDay()];
    const life = lifeNumber(u);
    out.push(`**ราศี${zName} (ธาตุ${zEl})** — ช่วงนี้พลังของธาตุ${zEl}ช่วยให้คุณ${zEl === 'ไฟ' ? 'กล้าตัดสินใจ' : zEl === 'ดิน' ? 'มั่นคงและวางแผนได้ดี' : zEl === 'ลม' ? 'สื่อสารเก่ง มีไอเดียใหม่' : 'เข้าใจความรู้สึกคนรอบข้าง'}`);
    out.push(`**เลขศาสตร์: เลขชีวิต ${life}** — ${NUM_MEANING[life][1]}`);
    out.push(`**สีมงคล (เกิดวัน${c.day})** — เสริมงานใช้สี${c.work} เสริมเงินใช้สี${c.money} เสริมรักใช้สี${c.love}`);
  } else {
    out.push('เพิ่มวันเกิดในหน้าบัญชี แม่หมอจะวิเคราะห์ราศี เลขชีวิต และสีมงคลให้ละเอียดขึ้นค่ะ');
  }
  const cards = ['ดวงดาว ✦ ความหวังกำลังกลับมา', 'ดวงอาทิตย์ ☀ ความสำเร็จและความสุข', 'กงล้อแห่งโชคชะตา ☸ จุดเปลี่ยนที่ดี', 'จักรพรรดินี 🌸 ความอุดมสมบูรณ์', 'ฤๅษี 🏮 ถอยมาทบทวนสักนิด'];
  out.push(`**ไพ่ทาโรต์สำหรับคำถามนี้: ${cards[q.length % cards.length]}**`);
  out.push('สรุป: ค่อย ๆ ไปทีละก้าว ฟังใจตัวเอง แล้วเรื่องที่ถามจะคลี่คลายในทางที่ดีค่ะ ✦');
  return `${out.join('\n')}\n\n(โหมดตัวอย่าง — ${why})`;
}

// ---------- ปุ่มกลางเมนูล่าง ----------
document.querySelector('.tab-center').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openAI(); }, true);
