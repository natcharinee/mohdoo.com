// ===== ใบผลดวง (Fortune Receipt): ใบยาวแบบใบเสร็จ 1 เรื่อง · 4 ก้อนคำทำนาย + สรุปรวม · บันทึกเป็นรูปได้ =====
// ใช้กับ ไพ่ทาโรต์ · เซียมซี · รายงานดวงประจำวัน · คำอ่านลายมือ/โหงวเฮ้งจากแม่หมอ AI

const SLIP_VERDICT = { 5: 'ดวงเด่นมาก', 4: 'ดวงดี', 3: 'ดวงกลาง ๆ', 2: 'ควรระวัง', 1: 'ควรระวัง' };
const SIAMSI_SCORE = { ดีมาก: 5, ดี: 4, กลาง: 3, ระวัง: 2 };
// เติมก้อนคำทำนายของไพ่ทาโรต์ให้ครบ 4 ก้อน ตามพลังโดยรวมของไพ่ (ตั้งมาก = บวก)
const TAROT_FILL = {
  good: [
    ['🌟', 'สิ่งที่ส่งเสริมคุณ', 'พลังของไพ่เปิดทางให้ ความตั้งใจและความจริงใจของคุณจะเป็นแม่เหล็กดึงโอกาสดี ๆ เข้ามา'],
    ['🧭', 'คำแนะนำจากไพ่', 'เดินหน้าตามแผนอย่างมั่นใจ ลงมือทำทีละก้าวแล้วผลลัพธ์จะค่อย ๆ ชัดขึ้น'],
    ['🕯️', 'สิ่งที่ควรระวัง', 'อย่ารีบร้อนจนมองข้ามรายละเอียดเล็ก ๆ และรักษาสมดุลระหว่างงานกับใจ'],
  ],
  bad: [
    ['🌙', 'สิ่งที่ส่งเสริมคุณ', 'ความอดทนและการฟังเสียงใจตัวเองคือแสงนำทาง ช่วงนี้เหมาะเก็บแรงไว้ก่อน'],
    ['🧭', 'คำแนะนำจากไพ่', 'ช้าลงอีกนิด ทบทวนสิ่งที่ผ่านมา แล้วเลือกเฉพาะเรื่องที่สำคัญจริง ๆ'],
    ['🕯️', 'สิ่งที่ควรระวัง', 'ระวังการตัดสินใจตอนอารมณ์ไม่นิ่ง และคำพูดที่อาจทำให้คนใกล้ตัวเข้าใจผิด'],
  ],
};
const AREA_ICON = { การงาน: '💼', การเงิน: '💰', ความรัก: '💞', สุขภาพ: '🌿' };
// ---------- ถามคำถาม (รู้ผลทันที): คำตอบตรงคำถามตามระดับดวง ----------
const ASK_SCORES = [5, 4, 4, 3, 4, 5, 3, 4, 2, 4];
const askTopic = (t) => (!t || t === 'อื่น ๆ' || t === 'ภาพรวม' ? 'ที่คุณถาม' : t);
const ASK_ANSWER = {
  5: ['ดวงเปิดทางเต็มที่ คำตอบคือ “มีโอกาสสูงมาก” จังหวะนี้ลงมือได้เลย คนรอบตัวพร้อมหนุน และจะเห็นผลชัดภายในหนึ่งถึงสองเดือนนี้',
    'ฟ้าเปิดให้แล้ว สิ่งที่หวังมีแนวโน้มสำเร็จเกินคาด อย่าลังเลนาน ยิ่งตัดสินใจเร็ว ผลยิ่งออกมาดี โชคดีจะตามมาเป็นลำดับ'],
  4: ['แนวโน้มเป็นไปในทางดี มีโอกาสสำเร็จมากกว่าครึ่ง ขอแค่เตรียมตัวให้พร้อมและไม่ประมาท ผลลัพธ์จะออกมาน่าพอใจ',
    'คำตอบคือ “ได้” แต่ต้องใช้ความอดทนอีกหน่อย ช่วงแรกอาจช้า พอผ่านไปสักระยะเรื่องจะคลี่คลายและเป็นไปตามที่หวัง'],
  3: ['เรื่องนี้ยังก้ำกึ่ง ผลจะออกมาดีหรือไม่ขึ้นกับการตัดสินใจของคุณเอง ค่อย ๆ ดูจังหวะ หาข้อมูลให้รอบด้านก่อนลงมือ',
    'ดวงช่วงนี้ทรงตัว ยังไม่มีอะไรชี้ขาด แนะนำให้รอดูสัญญาณอีกสักพัก ถ้ามีคนที่ไว้ใจได้ ลองปรึกษาก่อนตัดสินใจ'],
  2: ['ช่วงนี้ยังไม่ใช่จังหวะที่ดีที่สุด แนะนำให้ชะลอไว้ก่อน ใช้เวลานี้เตรียมตัวให้พร้อม แล้วโอกาสที่ดีกว่าจะมาในไม่ช้า',
    'มีอุปสรรคเล็ก ๆ ขวางอยู่ ไม่ได้แปลว่าเป็นไปไม่ได้ แต่ต้องใช้ความพยายามมากขึ้น และระวังคำพูดหรือการตัดสินใจที่เร่งรีบ'],
};
// บริการวิเคราะห์ข้อมูล (เบอร์ ทะเบียน ชื่อ คู่ ฮวงจุ้ย) ที่ไม่มีคำถาม → คำสรุปแบบผลวิเคราะห์ (ใช้เมื่อ AI ยังไม่พร้อม)
const ANALYZE_ANSWER = {
  5: 'ให้พลังดีเด่นมาก ส่งเสริมทั้งการงาน การเงิน และความสัมพันธ์ เหมาะใช้ต่อไปหรือเลือกใช้ได้อย่างมั่นใจ',
  4: 'โดยรวมให้พลังดี ช่วยหนุนเรื่องการงานและการเงิน มีจุดเล็ก ๆ ที่ควรระวังบ้าง แต่ใช้ต่อได้อย่างสบายใจ',
  3: 'ให้พลังกลาง ๆ มีทั้งด้านที่หนุนและด้านที่ควรระวัง ถ้ามีตัวเลือกอื่น ลองเทียบดูก่อนตัดสินใจ',
  2: 'มีจุดที่ยังไม่ค่อยส่งเสริมดวงช่วงนี้ แนะนำให้พิจารณาปรับเปลี่ยน หรือเสริมด้วยสีและเลขมงคลประจำวันเกิด',
};
const askAnswer = (h, lv) => {
  const L = Math.max(2, Math.min(5, lv));
  if (h.data && !h.data.question) return `${h.title}ของคุณ ${ANALYZE_ANSWER[L]}`;
  return `เรื่อง${askTopic(h.topic)}ที่ถามมา ${ASK_ANSWER[L][seedOf(h.id) % 2]}`;
};

// ---------- แปลงประวัติการดูดวง 1 รายการ → ข้อมูลใบผลดวง ----------
function slipFromEntry(h) {
  const base = { icon: h.icon || '✦', title: h.title, question: h.question || '', at: h.at,
    no: (h.kind === 'order' || h.kind === 'ask') && h.no ? h.no : `MD-${String(h.id).slice(-6).toUpperCase()}` };
  if (h.kind === 'ask') {
    // ถามคำถาม 40 บาท: ระดับดวงจากผลคำนวณ (lib/calc/score.js) ที่บันทึกไว้ตอนถาม → เปิดดูซ้ำได้ผลเดิม
    // ประวัติเก่าที่ยังไม่มีผลคำนวณ: คำนวณจากข้อมูลตอนนี้ · ถ้าไม่มีวันเกิดหรือโหลดชุดคำนวณไม่ได้ ใช้วิธีเดิม
    const calc = h.calc || (window.MohdooCalc ? window.MohdooCalc.askScore(h, currentUser() || {}) : null);
    const score = calc ? calc.score : ASK_SCORES[seedOf(`${h.id}|${h.question}`) % ASK_SCORES.length];
    const asked = !!(h.data ? h.data.question : h.question);
    return { ...base, service: asked ? h.title : 'ผลวิเคราะห์ทันที', title: asked ? `ถามเรื่อง${askTopic(h.topic)}` : h.title, topic: h.topic, score, calc, summary: askAnswer(h, score) };
  }
  if (h.kind === 'tarot') {
    const ups = h.cards.filter((c) => !c.rev).length / h.cards.length;
    const score = ups === 1 ? 5 : ups >= 0.5 ? 4 : ups > 0 ? 3 : 2;
    const blocks = h.cards.slice(0, 4).map((c) => ({ tag: c.pos, icon: c.sym, title: `${c.th}${c.rev ? ' (กลับหัว)' : ''}`, sub: c.en, text: c.text }));
    TAROT_FILL[score >= 4 ? 'good' : 'bad'].slice(0, 4 - blocks.length)
      .forEach(([icon, title, text]) => blocks.push({ tag: 'คำแนะนำ', icon, title, text }));
    return { ...base, service: 'ไพ่ทาโรต์', blocks, score, summary: h.summary, cards: h.cards };
  }
  if (h.kind === 'siamsi') {
    return { ...base, service: 'เสี่ยงเซียมซี', score: SIAMSI_SCORE[h.lv] || 3, cardsLine: `ใบที่ ${h.no} · ระดับ${h.lv}`, summary: `ใบที่ ${h.no} ระดับ “${h.lv}” · ${h.meaning}`,
      blocks: [
        { tag: `ใบที่ ${h.no}`, icon: '🎋', title: 'คำทำนาย', text: `${h.verse} — ${h.meaning}` },
        { tag: 'การงาน', icon: '💼', title: 'ดวงการงาน', text: h.work },
        { tag: 'ความรัก', icon: '💞', title: 'ดวงความรัก', text: h.love },
        { tag: 'การเงิน', icon: '💰', title: 'ดวงการเงิน', text: h.money },
      ] };
  }
  if (h.kind === 'daily') {
    const r = h.report;
    const blocks = r.scores.slice(1, 5).map(([label, n]) => ({
      tag: label, icon: AREA_ICON[label] || '✦', title: `ดวง${label}`, stars: n,
      text: (AREA_TIP[label] || ['', ''])[n >= 4 ? 0 : 1],
    }));
    return { ...base, service: 'ดูดวงประจำวัน', title: 'รายงานดวงประจำวัน', blocks, score: r.scores[0][1], summary: r.summary,
      lucky: { color: r.color.money, nums: r.lucky, colors: [['งาน', r.color.work], ['เงิน', r.color.money], ['รัก', r.color.love]], avoid: r.color.avoid } };
  }
  if (h.kind === 'personal') return personalSlip(h, base);
  if (h.kind === 'order' && h.reading) {
    // คำอ่านจากแม่หมอ AI: แยกหัวข้อ • เป็นก้อน (สูงสุด 4)
    const parts = h.reading.split(/\n+/).map((l) => l.replace(/\*\*/g, '').trim()).filter(Boolean);
    const bullets = parts.filter((l) => /^[•\-–]/.test(l)).map((l) => l.replace(/^[•\-–]\s*/, ''));
    const rest = parts.filter((l) => !/^[•\-–]/.test(l));
    const items = [...bullets, ...rest].slice(0, 4);
    const blocks = items.map((t, i) => {
      const m = t.match(/^(.{2,40}?)\s*(?:→|:|：)\s*(.+)$/);
      return { tag: `ข้อ ${i + 1}`, icon: ['✋', '👁️', '🌙', '🧭'][i], title: m ? m[1] : `คำทำนายที่ ${i + 1}`, text: m ? m[2] : t };
    });
    return { ...base, service: `แม่หมอ AI อ่าน${h.svc === 'face' ? 'โหงวเฮ้ง' : 'ลายมือ'}`, blocks, score: null, summary: h.summary || '' };
  }
  return null;
}
const slipSupported = (h) => !!(h && (['tarot', 'siamsi', 'daily', 'ask'].includes(h.kind) || (h.kind === 'order' && h.reading)
  || (h.kind === 'personal' && ['color', 'name', 'number', 'zodiac'].includes(h.gift))));

// ---------- ดวงฟรีจากวงล้อต้อนรับ (คำนวณจากข้อมูลเกิดและชื่อในโปรไฟล์) ----------
function personalSlip(h, base) {
  const u = currentUser() || {};
  const g = GIFTS.find((x) => x.id === h.gift);
  const s = { ...base, icon: g.icon, title: g.name, service: 'ดวงฟรีต้อนรับสมาชิกใหม่', score: null };
  const { y, m, d, date } = birthParts(u);
  const c = DAY_COLORS[date.getDay()];
  if (h.gift === 'color') {
    return { ...s, stamp: 'สีมงคลประจำตัว', lucky: { color: c.money, nums: [lifeNumber(u)] },
      blocks: [
        { tag: 'สีประจำวันเกิด', icon: '🎂', title: `สี${c.birth}`, text: `คุณเกิดวัน${c.day} สีนี้คือพลังประจำตัว ใส่แล้วมั่นใจและเป็นตัวเอง` },
        { tag: 'เสริมการงาน', icon: '💼', title: `สี${c.work}`, text: 'ใส่หรือพกในวันประชุม สัมภาษณ์งาน หรือเริ่มโปรเจกต์ใหม่ งานจะราบรื่น' },
        { tag: 'เสริมการเงิน', icon: '💰', title: `สี${c.money}`, text: 'เหมาะกับกระเป๋าเงิน เคสโทรศัพท์ หรือวันเจรจาเรื่องเงินและค้าขาย' },
        { tag: 'เสริมความรัก', icon: '💞', title: `สี${c.love}`, text: 'เลือกใส่ในวันนัดสำคัญเรื่องหัวใจ เสริมเสน่ห์และความอ่อนโยน' },
      ],
      summary: `คนเกิดวัน${c.day} ใช้สี${c.birth}เป็นสีประจำตัว เสริมงานด้วยสี${c.work} เสริมเงินด้วยสี${c.money} และควรเลี่ยงสี${c.avoid}ในวันสำคัญ` };
  }
  if (h.gift === 'name') {
    const f = letterSum(u.first || u.name || ''); const l = letterSum(u.last || ''); const n = reduce(f + l);
    const [title, text] = NUM_MEANING[n];
    return { ...s, stamp: `พลังเลข ${n}`, blocks: [
        { tag: 'ชื่อ', icon: '✍️', title: `${u.first || u.name || '-'} = ${f}`, text: `พลังเลข ${reduce(f)} · ${NUM_MEANING[reduce(f)][0]} ${NUM_MEANING[reduce(f)][1]}` },
        { tag: 'นามสกุล', icon: '🏛️', title: `${u.last || '-'} = ${l}`, text: l ? `พลังเลข ${reduce(l)} · ${NUM_MEANING[reduce(l)][0]} สะท้อนรากฐานและครอบครัวที่หนุนหลังคุณ` : 'ยังไม่ได้กรอกนามสกุล เพิ่มได้ที่หน้าบัญชี' },
        { tag: 'ผลรวมชื่อ-นามสกุล', icon: '🔮', title: `${f + l} → เลข ${n} “${title}”`, text },
        { tag: 'คำแนะนำ', icon: '🧭', title: 'ใช้พลังชื่อให้เต็มที่', text: `ใช้ชื่อเต็มในงานสำคัญและเอกสาร เพื่อดึงพลัง “${title}” ออกมา ถ้าอยากปรับชื่อให้เสริมดวงยิ่งขึ้น ดูแพ็กเกจในหมวดศาสตร์แห่งเลข` },
      ], summary: `ชื่อของคุณมีพลังของ “${title}” · ${text}` };
  }
  if (h.gift === 'number') {
    const life = lifeNumber(u); const dayNum = reduce(d); const third = reduce(life + dayNum);
    const lucky = [...new Set([life, dayNum, third])];
    while (lucky.length < 3) lucky.push(reduce(lucky[lucky.length - 1] + 3));
    return { ...s, stamp: `เลขชีวิต ${life}`, lucky: { color: c.money, nums: lucky }, blocks: [
        { tag: 'เลขเส้นทางชีวิต', icon: '🌟', title: `เลข ${life} · ${NUM_MEANING[life][0]}`, text: NUM_MEANING[life][1] },
        { tag: 'เลขวันเกิด', icon: '🎂', title: `เลข ${dayNum} · ${NUM_MEANING[dayNum][0]}`,
          text: dayNum === life ? `เลขวันเกิดตรงกับเลขเส้นทางชีวิต พลังของเลข ${life} จึงเด่นเป็นพิเศษ ใช้จุดแข็งนี้นำทางได้เต็มที่` : NUM_MEANING[dayNum][1] },
        { tag: 'เลขเสริมดวง', icon: '✨', title: `เลข ${third} · ${NUM_MEANING[third][0]}`, text: NUM_MEANING[third][1] },
        { tag: 'วิธีใช้เลขนำโชค', icon: '🍀', title: `เลข ${lucky.join(' · ')}`, text: 'ใช้เป็นเลขโปรด ตั้งรหัส เลือกที่นั่ง เบอร์โทร หรือวันนัดสำคัญที่ลงท้ายด้วยเลขเหล่านี้' },
      ], summary: `เกิด ${d}/${m}/${y} เลขเส้นทางชีวิตคือ ${life} “${NUM_MEANING[life][0]}” · ${NUM_MEANING[life][1]}` };
  }
  if (h.gift === 'zodiac') {
    const [name, sym, el, , trait] = zodiacOf(m, d);
    const [boost, match] = ELEMENT_TIP[el].split(' คู่ที่');
    return { ...s, stamp: `ราศี${name}`, blocks: [
        { tag: 'ราศีเกิด', icon: `${sym}︎`, title: `ราศี${name} · ธาตุ${el}`, text: `เกิดวันที่ ${d}/${m} อยู่ในราศี${name} ธาตุประจำตัวคือธาตุ${el}` },
        { tag: 'นิสัยเด่น', icon: '💫', title: 'ตัวตนของคุณ', text: trait },
        { tag: 'เติมพลัง', icon: '🔋', title: `วิธีเติมพลังธาตุ${el}`, text: boost },
        { tag: 'ความรัก', icon: '💞', title: 'คู่ที่เข้ากันดี', text: match ? `คู่ที่${match}` : ELEMENT_TIP[el] },
      ], summary: `คุณคือชาวราศี${name} ธาตุ${el} · ${trait}` };
  }
  return null;
}

// ---------- หน้าจอใบผลดวง ----------
const slipEl = document.createElement('div');
slipEl.className = 'slip-overlay';
slipEl.id = 'slipOverlay';
slipEl.hidden = true;
slipEl.setAttribute('role', 'dialog');
slipEl.setAttribute('aria-modal', 'true');
slipEl.setAttribute('aria-label', 'ใบผลดวง');
$('screen').appendChild(slipEl);

function slipHTML(s) {
  const u = currentUser() || {};
  const name = displayName(u, true);
  const d = new Date(s.at || Date.now());
  const today = typeof computeDaily === 'function' ? computeDaily(u, d) : null;
  const lucky = s.lucky || (today ? { color: today.color.money, nums: today.lucky } : null);
  const stars = (n) => `<span class="sl-stars">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;
  return `<article class="slip" id="slipPaper">
    ${SLIP_ART.spark('sp1')}${SLIP_ART.spark('sp2')}
    <header class="sl-head">
      <div class="sl-logo" translate="no"><span class="sl-moon">☾</span>หมอดู<span>.com</span></div>
      <p class="sl-type">ใบผลดวง · FORTUNE RECEIPT</p>
      ${s.cards ? cardRowHTML(s.cards) : SLIP_ART.ball}
    </header>
    <div class="sl-item">
      <small>${esc(s.service)}</small>
      <b>${esc(s.title)}</b>
      ${s.question ? `<p translate="no">“${esc(s.question)}”</p>` : ''}
      ${name ? `<em>สำหรับคุณ <span translate="no">${esc(name)}</span></em>` : ''}
    </div>
    ${s.cardsLine ? `<p class="sl-cards">${esc(s.cardsLine)}</p>` : ''}
    <div class="sl-verse">${s.text.verse.map((l) => `<p>${esc(l)}</p>`).join('')}</div>
    ${s.text.answer ? `<div class="sl-answer"><h4 class="sl-overall"><span>คำตอบของแม่หมอ</span></h4><p>${esc(s.text.answer)}</p></div>` : ''}
    <div class="sl-story">${s.text.topics.map((t) => `<p><b>${esc(t.label)}</b>${esc(t.text)}</p>`).join('')}</div>
    <div class="sl-total">
      <h4 class="sl-overall"><span>ดวงโดยรวม</span></h4>
      ${s.score ? `<div class="sl-overall-stars">${stars(s.score)}</div>` : ''}
      <p>${esc(s.text.overall || s.summary)}</p>
    </div>
    ${(s.text.advice || []).length ? `<div class="sl-advice"><h4 class="sl-overall"><span>ทางเสริมดวง</span></h4>
      <ul>${s.text.advice.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : ''}
    ${lucky ? `<div class="sl-lucky">
      ${lucky.colors ? `<div class="sl-colors"><small>สีเสริมดวงวันนี้</small><b>${lucky.colors.map(([k, c]) => `<span><i style="background:${HEX[c] || '#d4a64a'}"></i>${k}${esc(c)}</span>`).join('')}</b></div>`
        : `<div><small>สีเสริมดวง</small><b><i style="background:${HEX[lucky.color] || '#d4a64a'}"></i>สี${esc(lucky.color)}</b></div>`}
      <div><small>เลขนำโชค</small><b>${lucky.nums.join(' · ')}</b></div>
      ${lucky.avoid ? `<div class="sl-avoid"><small>สีที่ควรเลี่ยง</small><b><i style="background:${HEX[lucky.avoid] || '#888'}"></i>สี${esc(lucky.avoid)}</b></div>` : ''}
    </div>` : ''}
    ${SLIP_ART.clouds}
  </article>`;
}


// ---------- ภาพประกอบลายเส้นวาดมือ (วาดใหม่ทั้งหมดด้วย SVG) ----------
const SL_LINE = '#efe4ff';
const SL_GOLD = '#f2c96b';
const SL_DARK = '#1d0b45';
const SL_CLOUD = '#c9b4f2';
const sparkPath = (x, y, r) => `M${x} ${y - r}C${x + r * .12} ${y - r * .2} ${x + r * .2} ${y - r * .12} ${x + r} ${y}C${x + r * .2} ${y + r * .12} ${x + r * .12} ${y + r * .2} ${x} ${y + r}C${x - r * .12} ${y + r * .2} ${x - r * .2} ${y + r * .12} ${x - r} ${y}C${x - r * .2} ${y - r * .12} ${x - r * .12} ${y - r * .2} ${x} ${y - r}Z`;
const SLIP_ART = {
  // ลูกแก้ว: พระจันทร์เสี้ยว ดาว เมฆ และควันหมุนรอบ
  ball: `<svg class="sl-art sl-art-ball" viewBox="0 0 170 150" aria-hidden="true">
    <defs><clipPath id="slBallClip"><circle cx="85" cy="66" r="45"/></clipPath></defs>
    <g fill="none" stroke="${SL_LINE}" stroke-width="2.2" stroke-linecap="round" opacity=".85">
      <path d="M36 92C18 86 12 70 24 60c9-8 22-2 18 8-3 7-12 5-11-1"/>
      <path d="M134 90c18-4 26-20 16-32-8-9-22-5-19 5 2 7 11 6 11 0"/>
      <path d="M30 116c-14-2-20-12-14-20M140 118c14-2 20-12 13-21"/>
      <path d="M48 30c-6-10 2-20 12-16M122 30c6-10-2-20-12-16"/>
    </g>
    <circle cx="85" cy="66" r="45" fill="${SL_DARK}"/>
    <g clip-path="url(#slBallClip)">
      <path d="M36 98q8-14 22-8 6-14 21-5 9-12 22-2 12-9 21 4 14-1 16 13v40H36Z" fill="${SL_CLOUD}" stroke="${SL_LINE}" stroke-width="2"/>
      <path d="M46 108c6-7 15-7 19-1M74 102c5-6 13-7 18-2M100 106c6-6 14-6 18 0M60 118c5-4 12-4 15 0M92 118c5-4 12-4 15 0" fill="none" stroke="${SL_LINE}" stroke-width="1.5" stroke-linecap="round" opacity=".75"/>
    </g>
    <path d="M70 34a22 22 0 1 0 22 38 18 18 0 1 1-22-38Z" fill="${SL_GOLD}"/>
    <path d="${sparkPath(106, 42, 6)}" fill="${SL_GOLD}"/><path d="${sparkPath(114, 64, 4)}" fill="${SL_LINE}"/><path d="${sparkPath(96, 56, 3.5)}" fill="${SL_LINE}"/>
    <g fill="${SL_LINE}"><circle cx="58" cy="48" r="1.4"/><circle cx="100" cy="30" r="1.2"/><circle cx="120" cy="50" r="1.2"/><circle cx="88" cy="40" r="1"/></g>
    <circle cx="85" cy="66" r="45" fill="none" stroke="${SL_LINE}" stroke-width="3"/>
    <path d="M72 70a14 14 0 0 1 2-20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".35"/>
    <path d="M66 111h38l-5 13H71Z" fill="${SL_DARK}" stroke="${SL_LINE}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M54 126h62v7H54Z" fill="${SL_GOLD}" stroke="${SL_LINE}" stroke-width="1.6"/>
  </svg>`,
  // แถบเมฆปิดท้ายใบ
  clouds: `<svg class="sl-art sl-art-clouds" viewBox="0 0 360 70" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 70V44q14-18 32-8 8-20 30-12 14-16 34-2 16-14 32 0 18-16 36 0 14-12 30 2 16-14 34 0 18-12 30 4 14-12 30 0 18-10 28 6 12-8 24 4V70Z" fill="${SL_CLOUD}" opacity=".45"/>
    <path d="M40 46c6-6 14-4 15 2M150 44c6-6 14-4 15 2M260 46c6-6 14-4 15 2" fill="none" stroke="${SL_LINE}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>
  </svg>`,
  spark: (cls) => `<svg class="sl-spark ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${sparkPath(12, 12, 11)}" fill="${SL_GOLD}" stroke="${SL_LINE}" stroke-width=".8"/></svg>`,
};

// ---------- รูปไพ่ทาโรต์ในใบผลดวง (หน้าไพ่แบบเดียวกับหน้าเปิดไพ่: ขอบทอง สัญลักษณ์ ชื่ออังกฤษ) ----------
// หน้าไพ่วาดใหม่: กรอบทองซ้อน ดาวมุม เลขโรมันด้านบน สัญลักษณ์ลายเส้นในวงรัศมี และริบบิ้นชื่อด้านล่าง
const CARD_GOLD = '#f2c96b';
const CARD_LINE = '#efe4ff';
const MAJOR_NUM = { 'The Fool': '0', 'The Magician': 'I', 'The High Priestess': 'II', 'The Empress': 'III', 'The Emperor': 'IV', 'The Hierophant': 'V',
  'The Lovers': 'VI', 'The Chariot': 'VII', Strength: 'VIII', 'The Hermit': 'IX', 'Wheel of Fortune': 'X', Justice: 'XI', 'The Hanged Man': 'XII',
  Death: 'XIII', Temperance: 'XIV', 'The Devil': 'XV', 'The Tower': 'XVI', 'The Star': 'XVII', 'The Moon': 'XVIII', 'The Sun': 'XIX', Judgement: 'XX', 'The World': 'XXI' };
const RANK_NUM = { Two: 'II', Three: 'III', Four: 'IV', Five: 'V', Six: 'VI', Seven: 'VII', Eight: 'VIII', Nine: 'IX', Ten: 'X' };
// สัญลักษณ์ลายเส้น (วาดในกรอบ 40×40 จุดกึ่งกลาง 20,20)
const sk = `fill="none" stroke="${CARD_GOLD}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
const CARD_MOTIF = {
  sun: `<circle cx="20" cy="20" r="8" fill="${CARD_GOLD}"/><g ${sk}>${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<path d="M${20 + Math.cos(a) * 11} ${20 + Math.sin(a) * 11}L${20 + Math.cos(a) * (i % 2 ? 15 : 17)} ${20 + Math.sin(a) * (i % 2 ? 15 : 17)}"/>`; }).join('')}</g>`,
  moon: `<path d="M24 6a14 14 0 1 0 4 26 11 11 0 1 1-4-26Z" fill="${CARD_GOLD}"/><path d="${sparkPath(30, 12, 3)}" fill="${CARD_LINE}"/><path d="${sparkPath(33, 26, 2)}" fill="${CARD_LINE}"/>`,
  star: `<path d="${sparkPath(20, 20, 15)}" fill="${CARD_GOLD}"/><path d="${sparkPath(20, 20, 7)}" fill="${CARD_LINE}" transform="rotate(45 20 20)"/>`,
  eye: `<path d="M4 20Q20 6 36 20Q20 34 4 20Z" ${sk}/><circle cx="20" cy="20" r="5" fill="${CARD_GOLD}"/><circle cx="20" cy="20" r="2" fill="#1d0b45"/><g ${sk}><path d="M20 4v4M10 7l2 3M30 7l-2 3"/></g>`,
  crown: `<path d="M7 28 5 12l8 7 7-11 7 11 8-7-2 16Z" fill="${CARD_GOLD}" stroke="${CARD_LINE}" stroke-width="1"/><path d="M7 31h26" ${sk}/><circle cx="20" cy="22" r="2" fill="#1d0b45"/>`,
  wheel: `<circle cx="20" cy="20" r="14" ${sk}/><circle cx="20" cy="20" r="4" fill="${CARD_GOLD}"/><g ${sk}><path d="M20 6v28M6 20h28M10 10l20 20M30 10 10 30"/></g>`,
  heart: `<path d="M20 33C8 25 5 18 7 13c2-5 9-6 13 0 4-6 11-5 13 0 2 5-1 12-13 20Z" fill="${CARD_GOLD}"/><path d="${sparkPath(31, 8, 3)}" fill="${CARD_LINE}"/>`,
  tower: `<path d="M13 35V14h14v21M11 14h18l-2-4H13Z" ${sk}/><path d="M18 35v-6h4v6" ${sk}/><path d="M26 2l-5 7h4l-4 7" fill="none" stroke="${CARD_LINE}" stroke-width="1.6" stroke-linecap="round"/>`,
  scales: `<g ${sk}><path d="M20 6v26M12 34h16M8 12h24M8 12l-4 9h8ZM32 12l-4 9h8Z"/></g><circle cx="20" cy="6" r="2" fill="${CARD_GOLD}"/>`,
  key: `<g ${sk}><circle cx="13" cy="13" r="6"/><path d="M17.5 17.5 33 33M27 27l-3 3M31 31l-3 3"/></g>`,
  lantern: `<g ${sk}><path d="M14 12h12l2 16H12Z"/><path d="M17 12V8h6v4M20 4v4M12 28h16"/></g><path d="M20 16c3 3 2 7 0 8-2-1-3-5 0-8Z" fill="${CARD_GOLD}"/>`,
  flame: `<path d="M20 4c8 9 10 16 6 23-2 4-8 6-12 2-5-4-4-10 0-14 0 4 2 6 4 6-2-6 0-11 2-17Z" fill="${CARD_GOLD}"/>`,
  rose: `<g ${sk}><path d="M20 20c-6-2-6-10 0-11 6 1 6 9 0 11Z"/><path d="M14 13c-4 4-2 10 6 10s10-6 6-10"/><path d="M20 23v13M20 30c-4-1-6-4-6-6M20 28c4-1 5-3 6-5"/></g>`,
  laurel: `<g ${sk}><path d="M20 34C9 31 5 22 7 12M20 34c11-3 15-12 13-22"/><path d="M8 16l-3-2M8 22l-3 0M11 27l-3 2M32 16l3-2M32 22l3 0M29 27l3 2"/></g><path d="${sparkPath(20, 18, 6)}" fill="${CARD_GOLD}"/>`,
  cup: `<g ${sk}><path d="M10 8h20c0 9-4 15-10 15S10 17 10 8Z"/><path d="M20 23v7M13 33h14"/></g><path d="M13 11h14" stroke="${CARD_LINE}" stroke-width="1.2"/>`,
  sword: `<g ${sk}><path d="M20 3v24M14 27h12M20 27v6"/><path d="M17 5 20 2l3 3"/></g><circle cx="20" cy="35" r="2" fill="${CARD_GOLD}"/>`,
  wand: `<g ${sk}><path d="M12 34 28 6"/><path d="M15 26l-4-2M19 19l4-1M23 12l-4-2"/></g><path d="${sparkPath(29, 5, 4)}" fill="${CARD_LINE}"/>`,
  pentacle: `<circle cx="20" cy="20" r="14" fill="${CARD_GOLD}" opacity=".18"/><circle cx="20" cy="20" r="14" ${sk}/><path d="M20 8 27 30 9 16h22L13 30Z" fill="none" stroke="${CARD_GOLD}" stroke-width="1.4" stroke-linejoin="round"/>`,
};
const MAJOR_MOTIF = { 'The Fool': 'rose', 'The Magician': 'wand', 'The High Priestess': 'moon', 'The Empress': 'heart', 'The Emperor': 'crown', 'The Hierophant': 'key',
  'The Lovers': 'heart', 'The Chariot': 'crown', Strength: 'flame', 'The Hermit': 'lantern', 'Wheel of Fortune': 'wheel', Justice: 'scales', 'The Hanged Man': 'eye',
  Death: 'rose', Temperance: 'cup', 'The Devil': 'flame', 'The Tower': 'tower', 'The Star': 'star', 'The Moon': 'moon', 'The Sun': 'sun', Judgement: 'star', 'The World': 'laurel' };
const SUIT_MOTIF = { Cups: 'cup', Swords: 'sword', Wands: 'wand', Pentacles: 'pentacle' };
function cardLook(c) {
  const en = c.en || '';
  if (MAJOR_NUM[en] != null) return { top: MAJOR_NUM[en], motif: MAJOR_MOTIF[en] || 'star', court: false };
  const m = en.match(/^(\w+) of (\w+)$/);
  const rank = m ? m[1] : '';
  const motif = SUIT_MOTIF[m ? m[2] : ''] || 'star';
  if (rank === 'Ace') return { top: 'ACE', motif, court: false };
  if (RANK_NUM[rank]) return { top: RANK_NUM[rank], motif, court: false };
  return { top: rank.toUpperCase(), motif, court: true };
}
function cardFaceHTML(c, cls = '') {
  const look = cardLook(c);
  const rays = Array.from({ length: 16 }, (_, i) => { const a = i * Math.PI / 8; return `M${50 + Math.cos(a) * 30} ${80 + Math.sin(a) * 30}L${50 + Math.cos(a) * 40} ${80 + Math.sin(a) * 40}`; }).join('');
  const corner = (x, y) => `<path d="${sparkPath(x, y, 3.2)}" fill="${CARD_GOLD}"/>`;
  return `<span class="sl-card ${cls} ${c.rev ? 'rev' : ''}" aria-hidden="true"><span class="sl-card-in">
      <svg class="sl-card-art" viewBox="0 0 100 162">
        <defs><radialGradient id="slHalo" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#8b5cd6" stop-opacity=".9"/><stop offset="1" stop-color="#2a1466" stop-opacity="0"/></radialGradient>
          <linearGradient id="slCardBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a1c80"/><stop offset=".55" stop-color="#1e0b4c"/><stop offset="1" stop-color="#2c1060"/></linearGradient></defs>
        <rect x="1" y="1" width="98" height="160" rx="8" fill="url(#slCardBg)"/>
        <rect x="4.5" y="4.5" width="91" height="153" rx="5.5" fill="none" stroke="${CARD_GOLD}" stroke-width="2"/>
        <rect x="8.5" y="8.5" width="83" height="145" rx="3.5" fill="none" stroke="${CARD_LINE}" stroke-width=".7" opacity=".6"/>
        ${corner(14, 14)}${corner(86, 14)}${corner(14, 148)}${corner(86, 148)}
        <circle cx="50" cy="80" r="34" fill="url(#slHalo)"/>
        <path d="${rays}" stroke="${CARD_GOLD}" stroke-width=".8" opacity=".55"/>
        <circle cx="50" cy="80" r="27" fill="none" stroke="${CARD_GOLD}" stroke-width="1" opacity=".7"/>
        ${look.court ? `<path d="M40 50 38 42l5 4 7-7 7 7 5-4-2 8Z" fill="${CARD_GOLD}"/>` : ''}
        <g transform="translate(22 52) scale(1.4)">${CARD_MOTIF[look.motif]}</g>
        <path d="M14 128h72l-5 8 5 8H14l5-8Z" fill="${CARD_GOLD}"/>
      </svg>
      <span class="sl-card-top">${esc(look.top)}</span>
      <span class="sl-card-en ${(c.en || '').length > 13 ? 'long' : ''}">${esc((c.en || '').toUpperCase())}</span>
    </span></span>`;
}
function cardRowHTML(cards) {
  return `<div class="sl-cardrow n${Math.min(cards.length, 3)}">${cards.slice(0, 3).map((c, i) => `<figure style="--r:${cards.length === 1 ? 0 : (i - (cards.length - 1) / 2) * 7}deg">
      ${cardFaceHTML(c)}
      <figcaption><small>${esc(c.pos)}</small><b>${esc(c.th)}</b>${c.rev ? '<em>กลับหัว</em>' : ''}</figcaption></figure>`).join('')}</div>`;
}

let slipData = null;
// ---------- ข้อความในใบ: แม่หมอ AI แต่งให้ (เก็บไว้ในประวัติ) หรือใช้คลังกลอนสำรอง ----------
function seedOf(str) { let x = 2166136261; for (const c of String(str)) x = Math.imul(x ^ c.charCodeAt(0), 16777619); return x >>> 0; }
// ดวงประจำวัน: ทางเสริมดวงจากข้อมูลวันนั้นจริง (สี · เรื่องที่อ่อนสุด · สีที่ควรเลี่ยง · เลขนำโชค)
function dailyAdvice(r) {
  const c = r.color;
  const parts = r.scores.slice(1);
  const worst = parts.reduce((a, b) => (b[1] < a[1] ? b : a));
  return [
    `ใส่สี${c.work}ไปทำงาน สี${c.money}เสริมการเงิน และสี${c.love}เมื่อมีนัดเรื่องหัวใจ`,
    `${worst[0]}เป็นเรื่องที่ต้องระวังที่สุดวันนี้ ${(AREA_TIP[worst[0]] || ['', ''])[1]}`,
    `เลี่ยงสี${c.avoid}ในวันนี้ และใช้เลข ${r.lucky.join(' · ')} เป็นเลขโปรดของวัน`,
  ];
}
const slipAdvice = (s, h) => (h.kind === 'daily' && h.report ? dailyAdvice(h.report) : localAdvice(s, h));
// ทางเสริมดวง 2–3 ข้อ: เรื่องที่ถาม (หรือเรื่องที่ดวงอ่อนสุด) + ภาพรวมตามระดับดวง
function localAdvice(s, h) {
  const lv = Math.max(2, Math.min(5, s.score || 4));
  const seed = seedOf(`${h.id}advice`);
  const topic = SLIP_TOPICS.includes(h.topic) ? h.topic : SLIP_TOPICS[seed % SLIP_TOPICS.length];
  const t = SLIP_ADVICE[topic];
  const g = SLIP_ADVICE.ภาพรวม[lv];
  return [t[seed % t.length], t[(seed + 1) % t.length], g[(seed >>> 3) % g.length]];
}
function localSlipText(s, h) {
  const lv = Math.max(2, Math.min(5, s.score || 4));
  const seed = seedOf(h.id);
  const pick = (arr, salt) => arr[(seed >>> salt) % arr.length];
  let verse = pick(SLIP_BANK.verse[lv], 1);
  // คำทำนายรายเรื่อง: 2 ประโยคต่างกันจากระดับดวงเดียวกัน → อ่านเป็นคำบรรยายเต็มย่อหน้า
  const bankTopic = (label, level, salt, two = true) => {
    const list = SLIP_BANK.topics[label][Math.max(2, Math.min(5, level))];
    const i = (seed >>> salt) % list.length;
    return two ? `${list[i]} ${list[(i + 1) % list.length]}` : list[i];
  };
  let topics = SLIP_TOPICS.map((label, i) => ({ label, text: bankTopic(label, lv, 3 + i * 2) }));
  if (h.kind === 'tarot') {
    // เปิดแต่ละเรื่องด้วยไพ่ที่เปิดได้จริง (วนตามจำนวนไพ่)
    const AREA_ROLE = ['การงาน', 'ความรัก', 'การเงิน', 'สุขภาพ'];
    topics = topics.map((t, i) => {
      const c = h.cards[i % h.cards.length];
      const lead = i < h.cards.length
        ? `ไพ่${/^\d/.test(c.th) ? ' ' : ''}${c.th}${c.rev ? 'ที่ออกมากลับหัว' : ''}ในตำแหน่ง${c.pos}บอกว่า ${c.text}`
        : `เมื่อดูไพ่ทั้งชุดร่วมกัน`;
      // คำไพ่ยาวอยู่แล้ว → ไม่ต้องต่อประโยค (คุมให้อยู่ 2–3 บรรทัด)
      return { label: AREA_ROLE[i], text: lead.length > 70 ? lead : `${lead} ${bankTopic(AREA_ROLE[i], lv, 3 + i * 2, false)}` };
    });
  }
  if (h.kind === 'siamsi') {
    const parts = h.verse.split(/\s+/);
    const half = Math.ceil(parts.length / 2);
    verse = [parts.slice(0, half).join(' '), parts.slice(half).join(' '), ...verse.slice(2)];
    topics = [['การงาน', h.work], ['ความรัก', h.love], ['การเงิน', h.money], ['สุขภาพ', '']]
      .map(([label, own], i) => ({ label, text: own ? `${own} ${bankTopic(label, lv, 3 + i * 2, false)}` : bankTopic(label, lv, 9) }));
  } else if (h.kind === 'daily') {
    // ดวงประจำวัน: ใช้ข้อมูลชุดเดียวกับหน้า “ดวงของคุณวันนี้” ทุกเรื่อง (ดาว คำแนะนำ สี ไพ่ ทักษา เลข)
    const r = h.report;
    const c = r.color;
    const extra = {
      การงาน: `ทักษาวันนี้ตกเป็น${r.taksa.name} ${r.taksa.tip} ใส่สี${c.work}ช่วยเสริมงาน`,
      การเงิน: `ใส่สี${c.money}เสริมการเงิน และใช้เลข ${r.lucky.join(' ')} เป็นเลขนำโชคของวัน`,
      ความรัก: `ไพ่ ${r.card[0]} บอกว่า${r.card[2]} ใส่สี${c.love}เมื่อมีนัดเรื่องหัวใจ`,
      สุขภาพ: `ราศี${r.zodiac.name} ธาตุ${r.zodiac.el} ${r.zodiac.tip}`,
    };
    topics = r.scores.slice(1, 5).map(([label, n]) => ({ label: `${label} ${'★'.repeat(n)}${'☆'.repeat(5 - n)}`, text: `${(AREA_TIP[label] || ['', ''])[n >= 4 ? 0 : 1]} · ${extra[label] || ''}` }));
    return { verse, topics, overall: `${r.summary.split(' · ')[0]} · เลขประจำวัน ${r.number.n} (${r.number.title}) ${r.number.text}`, advice: dailyAdvice(r) };
  } else if (h.kind === 'ask') {
    // เรื่องที่ถามขึ้นก่อน แล้วตามด้วยเรื่องอื่น
    const first = SLIP_TOPICS.includes(h.topic) ? h.topic : null;
    if (first) topics = [topics.find((t) => t.label === first), ...topics.filter((t) => t.label !== first)];
    return { verse, answer: s.summary, topics, overall: pick(SLIP_OVERALL[lv], 7), advice: localAdvice(s, h) };
  } else if (h.kind === 'personal' || h.kind === 'order') {
    topics = s.blocks.map((b) => ({ label: b.tag, text: h.gift === 'zodiac' ? b.text : `${b.title} · ${b.text}` }));
  }
  return { verse, topics, overall: `${s.summary} ${pick(SLIP_OVERALL[lv], 7)}`, advice: localAdvice(s, h) };
}
// รายละเอียดการดูดวงที่ส่งให้แม่หมอ AI แต่งใบ (ข้อความล้วน ไม่มีรูป)
function slipDetail(s, h) {
  if (h.kind === 'tarot') return `${h.title}\n${h.cards.map((c) => `${c.pos}: ${c.th} (${c.en})${c.rev ? ' กลับหัว' : ''} — ${c.text}`).join('\n')}\nภาพรวมไพ่: ${h.summary}`;
  if (h.kind === 'siamsi') return `เซียมซีใบที่ ${h.no} ระดับ ${h.lv}\nกลอน: ${h.verse}\nความหมาย: ${h.meaning}\nการงาน: ${h.work}\nความรัก: ${h.love}\nการเงิน: ${h.money}`;
  if (h.kind === 'daily') {
    const r = h.report;
    const c = r.color;
    return [`รายงานดวงประจำวัน (ใบผลดวงต้องตรงกับข้อมูลนี้ทุกข้อ ห้ามแต่งเนื้อหาอื่น)`,
      `คะแนน: ${r.scores.map(([l, n]) => `${l} ${n}/5`).join(' · ')}`,
      `ราศี${r.zodiac.name} ธาตุ${r.zodiac.el}: ${r.zodiac.tip}`, `เลขประจำวัน ${r.number.n} ${r.number.title}: ${r.number.text}`,
      `ไพ่ประจำวัน ${r.card[0]}: ${r.card[2]}`, `ทักษาวันนี้ตกเป็น${r.taksa.name}: ${r.taksa.tip}`,
      `สีมงคลวัน${c.day}: งานสี${c.work} เงินสี${c.money} รักสี${c.love} ควรเลี่ยงสี${c.avoid}`, `เลขนำโชค ${r.lucky.join(' ')}`,
      `สรุปของวัน: ${r.summary}`].join('\n');
  }
  if (h.kind === 'order') return `${h.title}\n${h.reading}`;
  if (h.kind === 'ask') {
    const label = Object.fromEntries(h.fields || []);
    const info = Object.entries(h.data || {}).filter(([k, v]) => v && !['topic', 'question'].includes(k) && !String(v).startsWith('📷')).map(([k, v]) => `${label[k] || k}: ${v}`);
    return [`ศาสตร์/บริการที่ลูกค้าเลือก: ${h.title} (ตอบตามหลักของศาสตร์นี้)`, `เรื่องที่ถาม: ${h.topic || 'ภาพรวม'}`,
      h.data && h.data.question ? `คำถาม: ${h.data.question}` : '', info.length ? `ข้อมูลที่ลูกค้ากรอกให้วิเคราะห์:\n${info.join('\n')}` : '',
      s.calc && window.MohdooCalc ? window.MohdooCalc.scoreText(s.calc) : `ระดับดวงจากการเสี่ยงทาย: ${s.score}/5`].filter(Boolean).join('\n');
  }
  return `${s.title}\n${s.blocks.map((b) => `${b.tag}: ${b.title} — ${b.text}`).join('\n')}`;
}
async function aiSlipText(s, h) {
  const u = currentUser() || {};
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30000);
    const r = await fetch('/api/slip', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'X-AI-Code': u.aiCode || '' },
      body: JSON.stringify({ order_no: h.no || '', kind: h.kind, service: s.service, title: s.title, question: s.question, score: s.score, detail: slipDetail(s, h),
        profile: { first: displayName(u), birthdate: u.birthdate, birthtime: u.birthtime, birthplace: u.birthplace, lang: window.LANG || 'th' } }),
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const j = await r.json();
    if (!Array.isArray(j.verse) || !Array.isArray(j.topics) || !j.topics.length) return null;
    return { verse: j.verse.slice(0, 4).map(String), answer: j.answer ? String(j.answer) : '', advice: Array.isArray(j.advice) ? j.advice.slice(0, 3).map(String) : [], topics: j.topics.slice(0, 4).map((x) => ({ label: String(x.label), text: String(x.text) })), overall: String(j.overall || ''), ai: true };
  } catch (_) { return null; } // ไม่มีเซิร์ฟเวอร์ AI / หมดเวลา → ใช้คลังกลอน
}

function renderSlip(s) {
  slipEl.innerHTML = `<div class="slip-stage">
      <button class="slip-x" data-slip-close aria-label="ปิด">✕</button>
      <div class="slip-printer"><span></span></div>
      <div class="slip-scroll"><div class="slip-feed">${slipHTML(s)}</div></div>
      <div class="slip-actions">
        <button class="btn-gold" data-slip-save>💾 บันทึกรูปใบผลดวง</button>
        ${navigator.share ? '<button class="btn-ghost" data-slip-share>แชร์</button>' : ''}
      </div>
    </div>`;
}
let slipToken = 0;
async function openSlip(h) {
  const s = slipFromEntry(h);
  if (!s) return;
  slipData = s;
  const token = ++slipToken;
  slipEl.hidden = false;
  requestAnimationFrame(() => slipEl.classList.add('open'));
  if (h.slipAI) { s.text = { ...h.slipAI, advice: (h.slipAI.advice || []).length ? h.slipAI.advice : slipAdvice(s, h) }; renderSlip(s); return; }
  slipEl.innerHTML = `<div class="slip-stage slip-writing"><button class="slip-x" data-slip-close aria-label="ปิด">✕</button>
      <div class="slip-printer"><span></span></div><p class="slip-wait"><span class="spinner small"></span>แม่หมอกำลังเขียนใบผลดวงของคุณ…</p></div>`;
  const ai = await aiSlipText(s, h);
  if (token !== slipToken || slipEl.hidden) return;
  if (ai && !(ai.advice || []).length) ai.advice = slipAdvice(s, h); // AI ไม่ได้ให้ทางเสริมดวง → ใช้คลัง
  if (ai && h.kind === 'ask' && !ai.answer) ai.answer = s.summary; // AI ไม่ได้ตอบคำถามแยก → ใช้คำตอบตามระดับดวง
  if (ai) { updateHistory(h.id, { slipAI: ai }); s.text = ai; } else s.text = localSlipText(s, h);
  renderSlip(s);
}
function closeSlip() {
  slipEl.classList.remove('open');
  setTimeout(() => { slipEl.hidden = true; slipEl.innerHTML = ''; }, 300);
}

// ---------- บันทึกเป็นรูป (html2canvas โหลดเมื่อกดครั้งแรก) ----------
let h2c = null;
function loadH2C() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  if (h2c) return h2c;
  h2c = new Promise((ok, no) => {
    const sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    sc.onload = () => ok(window.html2canvas);
    sc.onerror = () => { h2c = null; no(new Error('load')); };
    document.head.appendChild(sc);
  });
  return h2c;
}
async function slipBlob() {
  const paper = $('slipPaper');
  const render = await loadH2C();
  if (document.fonts) await document.fonts.ready;
  // ถ่ายจากสำเนานอกจอ ที่มีระยะขอบบน-ล่าง เพื่อให้ขอบฟันเลื่อยของใบเสร็จติดมาในรูปด้วย
  const wrap = document.createElement('div');
  wrap.style.cssText = `position:fixed;left:-10000px;top:0;width:${paper.offsetWidth}px;padding:12px 0;background:transparent`;
  const copy = paper.cloneNode(true);
  copy.removeAttribute('id');
  copy.style.margin = '0';
  wrap.appendChild(copy);
  document.body.appendChild(wrap);
  // html2canvas วาด SVG ได้ไม่ครบ → แปลงภาพลายเส้นแต่ละชิ้นเป็น PNG ก่อนถ่าย
  await Promise.all([...copy.querySelectorAll('svg')].map(async (svg) => {
    // ขนาดจริงก่อนหมุน (ไพ่ที่วางเอียงจะได้ขนาดไม่เพี้ยน)
    const cs = getComputedStyle(svg);
    const r = { width: parseFloat(cs.width) || svg.getBoundingClientRect().width, height: parseFloat(cs.height) || svg.getBoundingClientRect().height };
    const src = new Image();
    src.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
    try { await src.decode(); } catch (_) { return; }
    const k = 3;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(r.width * k));
    cv.height = Math.max(1, Math.round(r.height * k));
    cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height);
    const img = new Image();
    img.src = cv.toDataURL('image/png');
    img.className = svg.getAttribute('class') || '';
    img.style.width = `${r.width}px`;
    img.style.height = `${r.height}px`;
    await img.decode().catch(() => {});
    svg.replaceWith(img);
  }));
  try {
    const canvas = await render(wrap, { scale: 2, backgroundColor: null, useCORS: true, logging: false });
    return await new Promise((ok) => canvas.toBlob(ok, 'image/png'));
  } finally { wrap.remove(); }
}
const slipFileName = () => `mohdoo-${(slipData && slipData.no) || 'fortune'}.png`;
async function saveSlip(btn) {
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'กำลังสร้างรูป…';
  try {
    const blob = await slipBlob();
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: slipFileName() });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('บันทึกรูปใบผลดวงแล้ว ✦');
  } catch (_) {
    toast('สร้างรูปไม่สำเร็จ ลองกดอีกครั้ง หรือแคปหน้าจอแทนนะคะ');
  }
  btn.disabled = false;
  btn.textContent = label;
}
async function shareSlip() {
  try {
    const blob = await slipBlob();
    const file = new File([blob], slipFileName(), { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'ใบผลดวง หมอดู.com' });
    else await navigator.share({ title: 'ใบผลดวง หมอดู.com', text: slipData.summary, url: location.origin });
  } catch (_) { /* ผู้ใช้กดยกเลิก */ }
}

slipEl.addEventListener('click', (e) => {
  if (e.target === slipEl || e.target.closest('[data-slip-close]')) return closeSlip();
  const sv = e.target.closest('[data-slip-save]');
  if (sv) return saveSlip(sv);
  if (e.target.closest('[data-slip-share]')) shareSlip();
});
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !slipEl.hidden) closeSlip(); });

// ใบผลดวงของรายการล่าสุดตามประเภท (เรียกจากหน้าไพ่ / เซียมซี / ดวงประจำวัน / คำอ่าน AI)
function openLatestSlip(kind) {
  const u = currentUser();
  const h = (u && u.history || []).find((x) => (kind ? x.kind === kind : true) && slipSupported(x));
  if (h) openSlip(h);
}
// หน้าย่อยใน iframe (ไพ่ทาโรต์ / เซียมซี) ขอเปิดใบผลดวง
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data || e.data.type !== 'mohdoo-slip') return;
  openLatestSlip(e.data.kind);
});
document.addEventListener('click', (e) => { if (e.target.closest('[data-slip-daily]')) openLatestSlip('daily'); });
