// ===== หน้าไพ่ทาโรต์ =====
const $ = (id) => document.getElementById(id);
const state = { spread: null, order: [], drawn: [] };

function cardEl({ card, reversed } = {}, extra = '') {
  const el = document.createElement('div');
  el.className = `tcard ${reversed ? 'reversed' : ''} ${extra}`;
  el.innerHTML = `
    <div class="tcard-inner">
      <div class="face front">
        ${card ? `<span class="num">${card.num}</span><span class="sym">${card.sym}</span><span class="name">${card.en.toUpperCase()}</span>` : ''}
      </div>
      <div class="face back"></div>
    </div>`;
  return el;
}

function showStep(id, hint) {
  ['stepSpread', 'stepDraw', 'stepResult'].forEach((s) => ($(s).hidden = s !== id));
  if (hint) $('stepHint').textContent = hint;
  scrollTo({ top: 0, behavior: 'smooth' });
}

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- ขั้น 1: เลือกรูปแบบ ----------
SPREADS.forEach((sp) => {
  const b = document.createElement('button');
  b.className = 'spread';
  b.innerHTML = `<span class="ico">${sp.icon}</span><span class="nm">${sp.name}</span>
    <span class="ds">${sp.desc}</span><span class="cnt">${sp.positions.length} ใบ</span>`;
  b.addEventListener('click', (e) => {
    burst(e.clientX, e.clientY, 30, 160);
    startDraw(sp);
  });
  $('spreads').appendChild(b);
});

// ---------- ขั้น 2: สับและจั่ว ----------
function startDraw(sp) {
  state.spread = sp;
  state.drawn = [];
  state.order = [];

  $('slots').innerHTML = '';
  sp.positions.forEach((p) => {
    const s = document.createElement('div');
    s.className = 'slot';
    s.innerHTML = `<div class="slot-box">✦</div><span class="slot-label">${p}</span>`;
    $('slots').appendChild(s);
  });

  const deck = $('deck');
  deck.className = 'deck';
  deck.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const c = cardEl();
    c.style.setProperty('--i', i);
    deck.appendChild(c);
  }
  $('fan').innerHTML = '';
  $('fan').className = 'fan';
  $('fan').parentElement.style.height = '';
  $('shuffleBtn').hidden = false;
  $('shuffleBtn').disabled = false;
  $('revealBtn').hidden = true;

  showStep('stepDraw', 'ตั้งจิตให้สงบ นึกถึงคำถาม แล้วกดสับไพ่');
}

$('shuffleBtn').addEventListener('click', () => {
  $('shuffleBtn').disabled = true;
  $('stepHint').textContent = 'กำลังสับไพ่…';
  const deck = $('deck');
  deck.classList.add('shuffling');
  setTimeout(() => {
    deck.classList.add('gone');
    $('shuffleBtn').hidden = true;
    const deckChoice = document.querySelector('input[name="deck"]:checked').value;
    state.order = shuffled(deckChoice === 'major' ? MAJOR_ARCANA : FULL_DECK).map((card) => ({ card, reversed: Math.random() < 0.3 }));
    dealFan();
    const n = state.spread.positions.length;
    $('stepHint').textContent = `เลือกไพ่ ${n} ใบ ตามที่ใจคุณรู้สึก`;
  }, 1400);
});

function dealFan() {
  const fan = $('fan');
  fan.innerHTML = '';
  const total = state.order.length;
  const w = Math.max(52, Math.min(84, innerWidth * 0.09));
  const h = w * 1.62;
  const radius = h * 7; // วงโค้งกว้าง ไพ่ไม่ห้อยหลุดกรอบ
  const avail = fan.clientWidth / 2 - w;
  const maxAng = Math.min(40, (Math.asin(Math.min(1, avail / (radius - h / 2))) * 180) / Math.PI);
  const drop = radius * (1 - Math.cos((maxAng * Math.PI) / 180));
  fan.style.setProperty('--lift', `${drop + 10}px`);
  fan.parentElement.style.height = `${h + drop + 50}px`;

  state.order.forEach((_, i) => {
    const c = cardEl({}, 'fan-card');
    const rot = -maxAng + (2 * maxAng * i) / (total - 1);
    c.style.setProperty('--w', `${w}px`);
    c.style.setProperty('--rot', `${rot}deg`);
    c.style.setProperty('--origin', `${radius}px`);
    c.style.setProperty('--delay', `${(i * 1.1) / total}s`);
    c.style.zIndex = i;
    c.tabIndex = 0;
    c.setAttribute('role', 'button');
    c.setAttribute('aria-label', `ไพ่ใบที่ ${i + 1}`);
    c.addEventListener('click', (e) => pick(i, c, e));
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i, c, e); } });
    fan.appendChild(c);
  });
}

function pick(i, el, e) {
  const need = state.spread.positions.length;
  if (state.drawn.length >= need || el.classList.contains('taken')) return;
  el.classList.add('taken');
  const r = el.getBoundingClientRect();
  burst(e.clientX || r.left + r.width / 2, e.clientY || r.top, 24, 140);

  const draw = state.order[i];
  state.drawn.push(draw);
  const box = $('slots').children[state.drawn.length - 1].querySelector('.slot-box');
  box.textContent = '';
  box.classList.add('filled');
  box.appendChild(cardEl(draw));

  const left = need - state.drawn.length;
  if (left > 0) {
    $('stepHint').textContent = `เลือกอีก ${left} ใบ`;
  } else {
    $('fan').classList.add('done');
    setTimeout(() => ($('fan').parentElement.style.height = '20px'), 500);
    $('stepHint').textContent = 'ไพ่ของคุณพร้อมแล้ว…';
    setTimeout(() => ($('revealBtn').hidden = false), 500);
  }
}

// ---------- ขั้น 3: เปิดไพ่ ----------
$('revealBtn').addEventListener('click', () => {
  const { spread, drawn } = state;
  const q = $('question').value.trim();
  $('yourQ').hidden = !q;
  $('yourQ').textContent = q ? `“${q}”` : '';

  const wrap = $('readings');
  wrap.innerHTML = '';
  drawn.forEach((d, idx) => {
    const item = document.createElement('article');
    item.className = 'reading';
    item.style.setProperty('--delay', `${idx * 0.35}s`);
    const card = cardEl(d);
    item.innerHTML = `<span class="pos">${spread.positions[idx]}</span>`;
    item.appendChild(card);
    item.insertAdjacentHTML('beforeend', `
      <h3>${d.card.th}</h3>
      <span class="en">${d.card.en}</span>
      <span class="badge ${d.reversed ? 'rev' : 'up'}">${d.reversed ? 'ไพ่กลับหัว' : 'ไพ่ตั้ง'}</span>
      <span class="suit">${suitLabel(d.card)}</span>
      <span class="kw">${d.card.key}</span>
      <p>${d.reversed ? d.card.rev : d.card.up}</p>`);
    wrap.appendChild(item);
    setTimeout(() => {
      card.classList.add('flipped');
      const r = card.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 30, 180);
    }, 600 + idx * 450);
  });

  const ups = drawn.filter((d) => !d.reversed).length;
  const ratio = ups / drawn.length;
  const tone =
    ratio === 1 ? 'พลังงานของไพ่โดยรวม <strong>สดใสมาก</strong> จักรวาลกำลังสนับสนุนเส้นทางที่คุณเลือก เดินหน้าอย่างมั่นใจได้เลย'
    : ratio >= 0.5 ? 'พลังงานโดยรวม <strong>ค่อนข้างดี</strong> แต่มีบางจุดที่ต้องใส่ใจ ลองใช้ไพ่กลับหัวเป็นคำเตือนเพื่อปรับตัว'
    : ratio > 0 ? 'ไพ่กำลัง <strong>ชวนให้ทบทวน</strong> ยังมีอุปสรรคบางอย่าง แต่ไพ่ตั้งที่ปรากฏคือแสงนำทางของคุณ'
    : 'ช่วงนี้ไพ่ <strong>ขอให้ช้าลงและฟังใจตัวเอง</strong> สิ่งที่ติดขัดเป็นเพียงช่วงหนึ่ง ทุกอย่างจะคลี่คลายเมื่อถึงเวลา';
  const sum = $('summary');
  const extra = suitInsight(drawn);
  sum.style.setProperty('--delay', `${0.8 + drawn.length * 0.45}s`);
  sum.innerHTML = `✦ <strong>สรุปภาพรวม</strong> ✦<br>${tone}${extra ? `<br><br>${extra}` : ''}`;

  showStep('stepResult', 'คำทำนายของคุณ');

  // เปิดอยู่ในโทรศัพท์ของหน้าแรก → ส่งผลไปบันทึกใน “ประวัติการดูดวง” ของโปรไฟล์
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'mohdoo-reading', entry: {
      kind: 'tarot', icon: '🃏', title: `ไพ่ทาโรต์ · ${spread.name}`, question: q,
      cards: drawn.map((d, i) => ({ pos: spread.positions[i], th: d.card.th, en: d.card.en, sym: d.card.sym, rev: d.reversed, text: d.reversed ? d.card.rev : d.card.up })),
      summary: tone.replace(/<[^>]+>/g, ''),
    } }, location.origin);
    $('slipBtn').hidden = false;
  }
});

function suitLabel(card) {
  if (card.suit === 'Major') return 'ไพ่ชุดใหญ่ · MAJOR ARCANA';
  const s = MINOR_SUITS.find((x) => x.en === card.suit);
  return `ชุด${s.th} · ธาตุ${s.element}`;
}

// อ่านภาพรวมจากชุดไพ่ที่ออก
function suitInsight(drawn) {
  const majors = drawn.filter((d) => d.card.suit === 'Major').length;
  if (drawn.length > 1 && majors === drawn.length) {
    return '✦ ไพ่ทุกใบเป็น <strong>ไพ่ชุดใหญ่</strong> แสดงว่าเรื่องนี้เป็นบทเรียนสำคัญหรือจุดเปลี่ยนของชีวิต';
  }
  if (drawn.length > 1 && majors >= 2) {
    return '✦ มี <strong>ไพ่ชุดใหญ่หลายใบ</strong> เรื่องนี้มีน้ำหนักมากกว่าเรื่องในชีวิตประจำวันทั่วไป';
  }
  const counts = {};
  drawn.forEach((d) => { if (d.card.suit !== 'Major') counts[d.card.suit] = (counts[d.card.suit] || 0) + 1; });
  const [top, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];
  if (!top || (drawn.length > 1 && n < 2)) return '';
  const s = MINOR_SUITS.find((x) => x.en === top);
  return `✦ พลังของ <strong>ชุด${s.th} (ธาตุ${s.element})</strong> โดดเด่น เรื่องนี้เกี่ยวข้องกับ${s.theme}`;
}

$('againBtn').addEventListener('click', (e) => {
  // ในโทรศัพท์: ดูอีกครั้ง = สั่งซื้อใหม่ (ชำระเงินก่อน)
  if (window.parent !== window) {
    const sp = new URLSearchParams(location.search).get('spread');
    window.parent.postMessage({ type: 'mohdoo-checkout', href: `tarot.html${sp ? `?spread=${sp}` : ''}` }, location.origin);
    return;
  }
  $('question').value = '';
  showStep('stepSpread', 'ตั้งคำถามในใจ แล้วเลือกรูปแบบการเปิดไพ่');
});

// เปิดจากลิงก์ เช่น tarot.html?spread=love หรือ ?spread=one → ข้ามไปขั้นสับไพ่เลย
const preset = SPREADS.find((sp) => sp.id === new URLSearchParams(location.search).get('spread'));
if (preset) startDraw(preset);

// ใบผลดวง (เปิดในหน้าแรก)
$('slipBtn').addEventListener('click', () => window.parent.postMessage({ type: 'mohdoo-slip', kind: 'tarot' }, location.origin));
