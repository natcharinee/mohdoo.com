// ===== หมอดู AI: สมาชิกรายเดือน ถามได้ไม่จำกัด วิเคราะห์จากทุกศาสตร์ =====
const AI_PRICE = 299;      // ราคาต่อเดือน (ตัวอย่าง — แก้ได้)
const AI_DAYS = 30;
const AI_SUGGEST = ['ดวงความรักเดือนนี้เป็นอย่างไร', 'ควรเปลี่ยนงานช่วงนี้ไหม', 'สีมงคลและเลขนำโชคของฉัน', 'ดวงการเงินปีนี้', 'ฉันกับเขาเข้ากันได้ไหม'];

const aiPanel = makePanel('aiPanel', 'หมอดู AI');
aiPanel.classList.add('ai-panel');
const aiBody = aiPanel.querySelector('.panel-body');

const aiActive = (u) => u && u.aiUntil && u.aiUntil > Date.now();

function openAI() {
  if (!currentUser()) { openSheet('register'); return; }
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
      <h3>หมอดู AI ส่วนตัวของคุณ</h3>
      <p>คุยถามตอบได้ทุกเรื่อง ตลอด 24 ชั่วโมง วิเคราะห์จากทุกศาสตร์ด้วยข้อมูลเกิดของคุณ</p>
    </div>
    <ul class="ai-perks">
      <li><span>♾️</span><div><b>ถามได้ไม่จำกัด</b><small>จ่ายเหมารายเดือน ไม่ต้องจ่ายทีละคำถาม</small></div></li>
      <li><span>🔮</span><div><b>วิเคราะห์จากทุกศาสตร์</b><small>โหราศาสตร์ไทย–สากล ดวงจีน เลขศาสตร์ ทักษา ไพ่ทาโรต์ สีมงคล</small></div></li>
      <li><span>🧬</span><div><b>รู้จักคุณ</b><small>ใช้วันเกิด เวลาเกิด และเรื่องที่สนใจจากโปรไฟล์</small></div></li>
      <li><span>⚡</span><div><b>ตอบทันที</b><small>ไม่ต้องรอคิวหมอดู</small></div></li>
    </ul>
    <div class="buy-row"><div><small>${expired ? 'สมาชิกหมดอายุแล้ว · ต่ออายุ' : 'สมาชิกรายเดือน'}</small><b>${AI_PRICE} ฿ <em>/ ${AI_DAYS} วัน</em></b></div>
      <button class="btn-gold" id="aiSubscribe">${expired ? 'ต่ออายุ ›' : 'สมัครเลย ›'}</button></div>
    <p class="test-mode">🧪 โหมดทดลอง · ไม่มีการเก็บเงินจริง สมัครแล้วลองคุยได้เลย</p>
    <p class="pay-note">ชำระด้วย QR แล้วเริ่มคุยได้ทันที · คำทำนายเพื่อความบันเทิงและเป็นแนวทางชีวิต</p>`;
  $('aiSubscribe').addEventListener('click', () => startCheckout({
    key: 'ai-month', icon: '🔮', title: 'หมอดู AI รายเดือน', sub: 'ถามได้ไม่จำกัด วิเคราะห์จากทุกศาสตร์',
    tiers: [{ label: `${AI_DAYS} วัน · ถามได้ไม่จำกัด`, price: AI_PRICE }],
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

// ---------- หน้าแชท ----------
function renderChat(u) {
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
    <div class="ai-log" id="aiLog">
      <div class="bubble ai">สวัสดีค่ะ คุณ${esc(u.first || u.name)} ✦ แม่หมอ AI พร้อมดูดวงให้แล้ว อยากรู้เรื่องไหนถามได้เลยนะคะ${u.birthdate ? '' : '<br><small>เพิ่มวันเกิดในหน้าบัญชี จะได้วิเคราะห์ได้แม่นขึ้นค่ะ</small>'}</div>
      ${chat.map((m) => `<div class="bubble ${m.role === 'user' ? 'me' : 'ai'}">${fmtMsg(m.content)}</div>`).join('')}
    </div>
    <div class="ai-chips" id="aiChips">${AI_SUGGEST.map((s) => `<button data-ask="${s}">${s}</button>`).join('')}</div>
    <form class="ai-input" id="aiForm">
      <textarea name="q" rows="1" maxlength="1500" placeholder="พิมพ์คำถามของคุณ…" required></textarea>
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
  $('aiChips').addEventListener('click', (e) => { const b = e.target.closest('[data-ask]'); if (b) ask(b.dataset.ask); });
}
const fmtMsg = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
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
          gender: u.gender, relation: u.relation, interests: u.interests, today: new Date().toISOString().slice(0, 10) },
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
  log.insertAdjacentHTML('beforeend', `<div class="bubble ai">${fmtMsg(reply)}</div>`);
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
