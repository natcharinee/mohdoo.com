// ===== ขั้นตอนเดียวกันทุกบริการ: เลือก → จ่ายด้วย QR → กรอกข้อมูล / สับไพ่ / เขย่าเซียมซี =====
// หมายเหตุ: QR และการยืนยันการชำระเงินเป็น “ตัวอย่าง” ยังไม่เชื่อมระบบรับชำระเงินจริง

const ORDER_MINUTES = 10;

// ---------- ฟอร์มข้อมูลเฉพาะของแต่ละบริการ ----------
const FORM_FIELDS = {
  babyname: [
    { name: 'surname', label: 'นามสกุลของลูก', required: true },
    { name: 'gender', label: 'เพศของลูก', type: 'select', options: ['ยังไม่ทราบ', 'ชาย', 'หญิง'] },
    { name: 'babybirth', label: 'วันเกิดลูก (ถ้าคลอดแล้ว)', type: 'date' },
    { name: 'likes', label: 'ความหมายหรือเสียงที่ชอบ', type: 'textarea', placeholder: 'เช่น อยากได้ชื่อที่แปลว่าความสำเร็จ ออกเสียงง่าย' },
  ],
  rename: [
    { name: 'current', label: 'ชื่อปัจจุบัน', prefill: 'first', required: true },
    { name: 'wish', label: 'อยากได้ชื่อแนวไหน', type: 'textarea', placeholder: 'เช่น เสริมการงาน ความหมายดี ไม่ยาวเกินไป' },
  ],
  surname: [{ name: 'wish', label: 'ความหมายหรือแนวเสียงที่ต้องการ', type: 'textarea', required: true }],
  phone: [{ name: 'numbers', label: 'เบอร์ที่ต้องการวิเคราะห์ (ถ้าเทียบ 3 เบอร์ ใส่บรรทัดละเบอร์)', type: 'textarea', required: true, placeholder: '08x-xxx-xxxx' }],
  plate: [{ name: 'plates', label: 'ทะเบียนรถ (ถ้าเทียบ 3 ชุด ใส่บรรทัดละชุด)', type: 'textarea', required: true, placeholder: 'เช่น 1กข 1234' }],
  auspicious: [
    { name: 'event', label: 'ประเภทงาน', required: true, placeholder: 'เช่น แต่งงาน ขึ้นบ้านใหม่ เปิดร้าน' },
    { name: 'range', label: 'ช่วงวันที่สะดวก', required: true, placeholder: 'เช่น มี.ค. – เม.ย. 2570' },
  ],
  palm: [{ name: 'photo', label: 'ภาพฝ่ามือที่เห็นเส้นชัด', type: 'file', required: true }],
  face: [{ name: 'photo', label: 'ภาพใบหน้าตรง ไม่สวมแว่น', type: 'file', required: true }],
  fengshui: [
    { name: 'photo', label: 'ภาพหรือผังพื้นที่', type: 'file', required: true },
    { name: 'direction', label: 'หน้าบ้าน/หน้าร้านหันทิศไหน', placeholder: 'เช่น ทิศตะวันออก' },
  ],
};
const ASK_FIELDS = [
  { name: 'topic', label: 'เรื่องที่อยากถาม', type: 'select', options: ['การงาน', 'การเงิน', 'ความรัก', 'สุขภาพ', 'การเรียน', 'ครอบครัว', 'อื่น ๆ'] },
  { name: 'question', label: 'คำถามของคุณ', type: 'textarea', required: true, placeholder: 'เล่าสถานการณ์สั้น ๆ แล้วถามสิ่งที่อยากรู้' },
];

// ---------- แปลงสิ่งที่ลูกค้าเลือกเป็นรายการสั่งซื้อ ----------
// next: { kind: 'frame', href } = หลังจ่ายเปิดหน้าไพ่/เซียมซี · { kind: 'form', fields } = หลังจ่ายกรอกข้อมูล
function itemFromService(id, title) {
  const s = SERVICES.find((x) => x.id === id);
  if (!s) return null;
  return {
    key: s.id, icon: s.icon, title: title || s.name, sub: s.get,
    tiers: s.prices.map((p) => ({ label: p.label, price: p.price, soon: p.soon || !s.open })),
    next: s.link ? { kind: 'frame', href: s.link } : { kind: 'form', fields: FORM_FIELDS[s.id] || ASK_FIELDS },
  };
}
function itemFromType(catId, idx) {
  const c = CATEGORIES.find((x) => x.id === catId);
  const t = c.types[idx];
  if (t.service === 'tarot') {
    return { key: 'tarot', icon: t.icon, title: t.name, sub: 'เลือกรูปแบบการเปิดไพ่ แล้วสับและจั่วไพ่ด้วยตัวเอง',
      tiers: [{ label: 'เปิดไพ่ 1 ครั้ง', price: CATEGORY_PRICE }], next: { kind: 'frame', href: 'tarot.html' } };
  }
  if (t.service) {
    const it = itemFromService(t.service, t.name);
    if (it) return it;
  }
  return { key: `${catId}:${idx}`, icon: t.icon, title: t.name, sub: `${c.name} · ${t.desc}`,
    tiers: [{ label: 'ถาม 1 เรื่อง (ตอบเป็นข้อความ)', price: CATEGORY_PRICE }], next: { kind: 'form', fields: ASK_FIELDS } };
}
function itemFromHref(href) {
  const page = pageOf(href);
  if (page === 'siamsi.html') return itemFromService('siamsi');
  if (page === 'tarot.html') {
    const sp = new URLSearchParams(href.split('?')[1] || '').get('spread');
    if (sp === 'love') return itemFromService('love-free');
    if (sp === 'one') return itemFromService('daily-free');
    return itemFromType('cards', 0);
  }
  return null;
}

// ---------- แผงชำระเงิน (ในโทรศัพท์) ----------
const payPanel = document.createElement('section');
payPanel.className = 'panel pay-panel';
payPanel.id = 'payPanel';
payPanel.setAttribute('aria-hidden', 'true');
payPanel.innerHTML = `<header class="panel-bar"><button class="back">‹ กลับ</button><h2 id="payTitle">ชำระเงิน</h2><span></span></header>
  <ol class="pay-steps" aria-label="ขั้นตอน"><li data-s="1">เลือก</li><li data-s="2">ชำระเงิน</li><li data-s="3">เริ่มดูดวง</li></ol>
  <p class="test-mode">🧪 โหมดทดลอง · ไม่มีการเก็บเงินจริง กด “ฉันชำระเงินแล้ว” เพื่อลองใช้บริการได้เลย</p>
  <div class="panel-body" id="payBody"></div>`;
$('screen').insertBefore(payPanel, $('sheetBackdrop'));
payPanel.querySelector('.back').addEventListener('click', cancelCheckout);

let order = null;
let timer = null;
const baht = (n) => `${Number(n).toLocaleString('th-TH')} ฿`;
function setStep(n, title) {
  payPanel.querySelectorAll('.pay-steps li').forEach((li) => li.classList.toggle('on', +li.dataset.s <= n));
  $('payTitle').textContent = title;
  payPanel.scrollTop = 0;
}

function startCheckout(item) {
  if (!item) return;
  if (!currentUser()) { openSheet('register'); return; }
  clearInterval(timer);
  order = { item, tier: item.tiers.findIndex((t) => t.price != null && !t.soon) };
  if (order.tier < 0) { toast('บริการนี้ยังไม่เปิดให้จอง จะแจ้งเตือนเมื่อเปิด ✦'); return; }
  renderSummary();
  openPanel('payPanel');
}
function cancelCheckout() {
  clearInterval(timer);
  closePanel('payPanel');
}

// ขั้นที่ 1: สรุปรายการ + เลือกแพ็กเกจ
function renderSummary() {
  const { item } = order;
  setStep(1, 'สรุปรายการ');
  $('payBody').innerHTML = `
    <div class="cat-hero"><span class="cat-ico big">${item.icon}</span><div><h3>${esc(item.title)}</h3><p>${esc(item.sub || '')}</p></div></div>
    <fieldset class="tiers pay-tiers"><legend>เลือกแพ็กเกจ</legend>
      ${item.tiers.map((t, i) => {
        const off = t.price == null || t.soon;
        return `<label class="tier"><input type="radio" name="ptier" value="${i}" ${i === order.tier ? 'checked' : ''} ${off ? 'disabled' : ''}>
          <span class="tl">${esc(t.label)}${t.soon ? '<small>เร็ว ๆ นี้</small>' : ''}</span><span class="tp">${t.price == null ? 'สอบถาม' : baht(t.price)}</span></label>`;
      }).join('')}
    </fieldset>
    <div class="pay-total"><span>ยอดชำระ</span><b id="payTotal">${baht(item.tiers[order.tier].price)}</b></div>
    <button class="btn-gold full" id="toQR">ชำระเงินด้วย QR ›</button>
    <p class="pay-note">ชำระแล้วจึงเริ่มบริการ · ${item.next.kind === 'form' ? 'ขั้นต่อไปกรอกข้อมูลสำหรับการทำนาย' : item.next.kind === 'ai' ? 'ใช้ได้ทันทีหลังชำระ' : 'ขั้นต่อไปเริ่มดูดวงได้ทันที'}</p>`;
  $('payBody').querySelectorAll('input[name="ptier"]').forEach((r) => r.addEventListener('change', () => {
    order.tier = +r.value;
    $('payTotal').textContent = baht(item.tiers[order.tier].price);
  }));
  $('toQR').addEventListener('click', renderQR);
}

// ขั้นที่ 2: QR สำหรับชำระเงิน
function renderQR() {
  const t = order.item.tiers[order.tier];
  order.no = `MD${Date.now().toString().slice(-8)}`;
  order.amount = t.price;
  order.label = t.label;
  setStep(2, 'สแกนเพื่อชำระเงิน');
  $('payBody').innerHTML = `
    <div class="qr-card">
      <span class="demo-tag">โหมดทดลอง · ไม่ต้องสแกนจ่ายจริง</span>
      <p class="qr-head">สแกนจ่ายผ่านแอปธนาคาร</p>
      <div class="qr-box" id="qrBox"></div>
      <p class="qr-amount">${baht(order.amount)}</p>
      <p class="qr-meta">${esc(order.item.title)} · ${esc(t.label)}<br>เลขที่คำสั่งซื้อ ${order.no}</p>
      <p class="qr-timer">QR หมดอายุใน <b id="qrTime">${ORDER_MINUTES}:00</b></p>
    </div>
    <ol class="qr-how"><li>เปิดแอปธนาคาร แล้วเลือกสแกน QR</li><li>ตรวจยอดเงินให้ตรง แล้วยืนยันการโอน</li><li>กลับมากด “ฉันชำระเงินแล้ว”</li></ol>
    <button class="btn-gold full" id="paidBtn">ฉันชำระเงินแล้ว <small>(ทดลอง)</small></button>
    <button class="btn-ghost full" id="cancelPay">ยกเลิกคำสั่งซื้อ</button>`;
  drawQR($('qrBox'), `MOHDOO-DEMO|${order.no}|${order.amount}THB|ไม่ใช่การชำระเงินจริง`);
  let left = ORDER_MINUTES * 60;
  clearInterval(timer);
  timer = setInterval(() => {
    left -= 1;
    const el = $('qrTime');
    if (!el) return clearInterval(timer);
    el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    if (left <= 0) { clearInterval(timer); toast('QR หมดอายุแล้ว กรุณาสร้างคำสั่งซื้อใหม่'); renderSummary(); }
  }, 1000);
  $('paidBtn').addEventListener('click', confirmPaid);
  $('cancelPay').addEventListener('click', cancelCheckout);
}
function drawQR(box, text) {
  try {
    const qr = qrcode(0, 'M');
    qr.addData(unescape(encodeURIComponent(text)));
    qr.make();
    box.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
  } catch (_) {
    box.innerHTML = '<div class="qr-fallback">QR</div>';
  }
}

// ตรวจการชำระเงิน (ตัวอย่าง) → สำเร็จ → ขั้นต่อไป
function confirmPaid() {
  clearInterval(timer);
  $('payBody').innerHTML = `<div class="pay-wait"><span class="spinner"></span><p>กำลังตรวจสอบการชำระเงิน…</p></div>`;
  setTimeout(() => {
    addPayment();
    setStep(3, 'ชำระเงินสำเร็จ');
    const r = payPanel.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + 200, 50, 200);
    const next = order.item.next;
    $('payBody').innerHTML = `
      <div class="pay-ok"><span class="ok-ring">✓</span><h3>ชำระเงินสำเร็จ</h3><p>${baht(order.amount)} · ${order.no}</p></div>
      <button class="btn-gold full" id="goNext">${next.kind === 'ai' ? '✦ เริ่มคุยกับหมอดู AI' : next.kind === 'frame' ? '✦ เริ่มดูดวงเลย' : 'กรอกข้อมูลสำหรับการทำนาย ›'}</button>`;
    $('goNext').addEventListener('click', proceed);
  }, 1400);
}
function addPayment() {
  const u = currentUser();
  u.orders = [{ no: order.no, title: order.item.title, label: order.label, amount: order.amount, at: Date.now() }, ...(u.orders || [])].slice(0, 50);
  saveUser(u);
}
function proceed() {
  const next = order.item.next;
  if (next.kind === 'ai') { activateAI(); return; }
  if (next.kind === 'frame') {
    closePanel('payPanel');
    const sep = next.href.includes('?') ? '&' : '?';
    openFrame(`${next.href}${sep}paid=${order.no}`);
  } else {
    renderIntake(next.fields);
  }
}

// ---------- ขั้นที่ 3 (บริการที่ต้องให้หมอดูตอบ): กรอกข้อมูล ----------
function renderIntake(fields) {
  const u = currentUser();
  const b = u.birthdate ? new Date(u.birthdate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  setStep(3, 'กรอกข้อมูลสำหรับการทำนาย');
  const input = (f) => {
    const req = f.required ? 'required' : '';
    const val = f.prefill ? esc(u[f.prefill] || '') : '';
    if (f.type === 'textarea') return `<textarea name="${f.name}" rows="3" ${req} placeholder="${esc(f.placeholder || '')}">${val}</textarea>`;
    if (f.type === 'select') return `<select name="${f.name}">${f.options.map((o) => `<option>${o}</option>`).join('')}</select>`;
    if (f.type === 'file') return `<input type="file" name="${f.name}" accept="image/*" ${req}>`;
    return `<input type="${f.type || 'text'}" name="${f.name}" ${req} value="${val}" placeholder="${esc(f.placeholder || '')}">`;
  };
  $('payBody').innerHTML = `
    <div class="intake-me">
      <div><small>ชื่อ</small><b>${esc([u.first || u.name, u.last].filter(Boolean).join(' '))}</b></div>
      <div><small>วันเกิด</small><b>${b || '—'}</b></div>
      <div><small>เวลาเกิด</small><b>${u.birthtime ? `${esc(u.birthtime)} น.` : '—'}</b></div>
      <div><small>สถานที่เกิด</small><b>${esc(u.birthplace || '—')}</b></div>
      <p>ใช้ข้อมูลจากโปรไฟล์ · แก้ได้ที่หน้าบัญชี</p>
    </div>
    <form class="form" id="intakeForm">
      ${u.birthdate ? '' : '<label>วันเกิดของคุณ<input type="date" name="birthdate" required></label>'}
      ${fields.map((f) => `<label>${f.label}${f.required ? '' : ' <small>(ไม่บังคับ)</small>'}${input(f)}</label>`).join('')}
      <button class="btn-gold full" type="submit">ส่งให้หมอดู ›</button>
    </form>`;
  $('intakeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {};
    new FormData(e.target).forEach((v, k) => { data[k] = v instanceof File ? (v.name || '') : String(v); });
    if (data.birthdate) { const cur = currentUser(); cur.birthdate = data.birthdate; saveUser(cur); }
    addHistory({ kind: 'order', icon: order.item.icon, title: order.item.title, status: 'รอหมอดูตอบ',
      no: order.no, amount: order.amount, label: order.label, data, fields: fields.map((f) => [f.name, f.label]) });
    $('payBody').innerHTML = `
      <div class="pay-ok"><span class="ok-ring">✦</span><h3>ส่งข้อมูลให้หมอดูแล้ว</h3>
        <p>หมอดูจะตอบกลับภายใน 24 ชั่วโมง<br>ดูสถานะและคำตอบได้ที่ “ประวัติการดูดวง” ในหน้าบัญชี</p></div>
      <button class="btn-gold full" id="toProfile">ไปที่หน้าบัญชี</button>
      <button class="btn-ghost full" id="toHome">กลับหน้าแรก</button>`;
    $('toProfile').addEventListener('click', openProfile);
    $('toHome').addEventListener('click', () => { closeAllPanels(); setActiveTab('home'); });
  });
}

// ---------- ทางเข้าทุกทาง → ผ่านขั้นตอนชำระเงินก่อน ----------
// 1) หน้าย่อยใน iframe (บริการ / เซียมซีซ้ำ / ไพ่ซ้ำ) ขอจ่ายเงิน
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data || e.data.type !== 'mohdoo-checkout') return;
  const it = e.data.service ? itemFromService(e.data.service) : itemFromHref(e.data.href || '');
  if (e.data.guard) closeFrame();
  if (it) startCheckout(it);
});
// 2) รายการหมวดหมู่ → ประเภท: ปุ่ม “ดูดวงประเภทนี้”
$('typeBody').addEventListener('click', (e) => {
  const b = e.target.closest('[data-buy]');
  if (b) { const [cat, idx] = b.dataset.buy.split('|'); startCheckout(itemFromType(cat, +idx)); }
});
