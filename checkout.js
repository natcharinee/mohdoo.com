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
  surname: [
    { name: 'current', label: 'นามสกุลปัจจุบัน', prefill: 'last' },
    { name: 'wish', label: 'ความหมายหรือแนวเสียงที่ต้องการ', type: 'textarea', required: true, placeholder: 'เช่น สื่อถึงความมั่นคง อ่านง่าย มีพยัญชนะมงคล' },
  ],
  phone: [{ name: 'numbers', label: 'เบอร์ที่ต้องการวิเคราะห์ (ถ้าเทียบ 3 เบอร์ ใส่บรรทัดละเบอร์)', type: 'textarea', required: true, placeholder: '08x-xxx-xxxx' }],
  plate: [{ name: 'plates', label: 'ทะเบียนรถ (ถ้าเทียบ 3 ชุด ใส่บรรทัดละชุด)', type: 'textarea', required: true, placeholder: 'เช่น 1กข 1234' }],
  auspicious: [
    { name: 'event', label: 'ประเภทงาน', required: true, placeholder: 'เช่น แต่งงาน ขึ้นบ้านใหม่ เปิดร้าน' },
    { name: 'range', label: 'ช่วงวันที่สะดวก', required: true, placeholder: 'เช่น มี.ค. – เม.ย. 2570' },
    { name: 'people', label: 'ชื่อและวันเกิดของคนที่เกี่ยวข้อง (ถ้ามี)', type: 'textarea', placeholder: 'เช่น เจ้าบ่าว 3 มี.ค. 2537 · เจ้าสาว 9 ก.ค. 2538' },
  ],
  palm: [
    { name: 'palmL', label: 'ภาพฝ่ามือซ้ายที่เห็นเส้นชัด', type: 'file', slot: 'palmL', required: true },
    { name: 'palmR', label: 'ภาพฝ่ามือขวา', type: 'file', slot: 'palmR' },
    { name: 'topic', label: 'อยากรู้เรื่องไหน', type: 'select', options: ['ภาพรวม', 'ความรัก', 'การงาน', 'การเงิน', 'สุขภาพ'] },
  ],
  face: [
    { name: 'face', label: 'ภาพใบหน้าตรง ไม่สวมแว่น เห็นหน้าผากถึงคาง', type: 'file', slot: 'face', required: true },
    { name: 'topic', label: 'อยากรู้เรื่องไหน', type: 'select', options: ['ภาพรวม', 'ความรัก', 'การงาน', 'การเงิน', 'สุขภาพ'] },
  ],
  fengshui: fsFields([{ name: 'spot', label: 'จุดที่อยากให้ดู', type: 'select', options: ['ประตูหน้าบ้าน', 'ห้องนอน', 'มุมทำงาน', 'ห้องนั่งเล่น', 'ห้องครัว', 'ห้องน้ำ', 'บันได', 'อื่น ๆ'] }], 'ภาพจุดที่อยากให้ดู'),
};
// ---------- ฮวงจุ้ย: รูป/ผัง + ทิศ + ข้อมูลเฉพาะของแต่ละแบบ ----------
function fsFields(extra = [], photoLabel = 'ผังหรือรูปพื้นที่ (เห็นทางเข้า หน้าต่าง และจุดสำคัญ)') {
  return [
    { name: 'photo', label: photoLabel, type: 'file', slot: 'place', required: true },
    { name: 'photo2', label: 'รูปเพิ่มเติม', type: 'file', slot: 'place2' },
    { name: 'direction', label: 'ด้านหน้าหันไปทิศไหน', type: 'select', options: ['ไม่แน่ใจ (ให้ดูจากรูป)', 'ทิศเหนือ', 'ทิศตะวันออกเฉียงเหนือ', 'ทิศตะวันออก', 'ทิศตะวันออกเฉียงใต้', 'ทิศใต้', 'ทิศตะวันตกเฉียงใต้', 'ทิศตะวันตก', 'ทิศตะวันตกเฉียงเหนือ'] },
    ...extra,
    { name: 'wish', label: 'อยากเสริมเรื่องไหนเป็นพิเศษ', type: 'textarea', placeholder: 'เช่น การเงิน สุขภาพคนในบ้าน ความสัมพันธ์ ยอดขาย' },
  ];
}
// สถานที่ทำพิธี: ดึงจาก places-data.js (160 แห่ง แยกตามภาค) · เลือกจากหน้ามงคลแล้วจะถูกเลือกไว้ให้ในฟอร์ม
const PLACE_PICK = 'ให้ทีมเลือกสถานที่ที่เหมาะกับดวง';
const placeLabel = (p) => `${p.name} · ${p.prov}`;
const placeGroups = (keep = () => true) => PLACE_REGIONS
  .map((r) => [r.name, PLACES.filter((p) => p.region === r.id && keep(p)).map(placeLabel)])
  .filter(([, list]) => list.length);
const MERIT_PLACES = [PLACE_PICK];
const CHONG_PLACES = ['ให้ทีมเลือกสถานที่'];
Object.assign(FORM_FIELDS, {
  'fs-condo': fsFields([{ name: 'floor', label: 'ชั้นและเลขห้อง', placeholder: 'เช่น ชั้น 12 ห้อง 1205' }, { name: 'size', label: 'ขนาดห้อง', type: 'select', options: ['สตูดิโอ', '1 ห้องนอน', '2 ห้องนอน', '3 ห้องนอนขึ้นไป'] }], 'ผังห้องหรือรูปห้อง (เห็นประตูและหน้าต่าง)'),
  'fs-house': fsFields([{ name: 'floors', label: 'จำนวนชั้น', type: 'select', options: ['1 ชั้น', '2 ชั้น', '3 ชั้นขึ้นไป'] }, { name: 'residents', label: 'ผู้อยู่อาศัยหลัก (ชื่อ · วันเกิด)', type: 'textarea', placeholder: 'เช่น พ่อ 5 ม.ค. 2510 · แม่ 2 ส.ค. 2513' }], 'ผังบ้านแต่ละชั้น หรือรูปหน้าบ้าน'),
  'fs-shop': fsFields([{ name: 'business', label: 'ประเภทธุรกิจ', required: true, placeholder: 'เช่น ร้านกาแฟ ร้านเสื้อผ้า คลินิก' }], 'ผังร้านหรือรูปหน้าร้าน (เห็นทางเข้าและเคาน์เตอร์)'),
  'fs-office': fsFields([{ name: 'seat', label: 'ตำแหน่งโต๊ะหรือห้องที่อยากให้ดู', placeholder: 'เช่น โต๊ะผู้จัดการ ห้องประชุม' }], 'ผังสำนักงานหรือรูปพื้นที่ทำงาน'),
  'fs-land': fsFields([{ name: 'location', label: 'จังหวัด / ทำเล', required: true, placeholder: 'เช่น นนทบุรี ติดถนนใหญ่' }, { name: 'size', label: 'ขนาดที่ดิน', placeholder: 'เช่น 100 ตารางวา' }, { name: 'plan', label: 'ตั้งใจใช้ทำอะไร', type: 'select', options: ['ปลูกบ้าน', 'ทำร้าน / ธุรกิจ', 'ลงทุน', 'อื่น ๆ'] }], 'ผังที่ดินหรือรูปโดยรอบ'),
  'fs-placement': fsFields([{ name: 'item', label: 'ของหรือสัตว์มงคลที่มี', required: true, placeholder: 'เช่น ปี่เซียะ กวนอิม ตู้ปลา' }], 'รูปพื้นที่ที่จะวาง'),
  idcard: [{ name: 'idnum', label: 'เลขบัตรประชาชน 13 หลัก (ระบบเก็บเฉพาะผลรวมและเลขท้าย 4 หลัก)', mask: 'idcard', required: true,
    inputmode: 'numeric', pattern: '[0-9 -]{13,17}', placeholder: 'x-xxxx-xxxxx-xx-x' }],
  couple: [
    { name: 'partner', label: 'ชื่อเล่นของอีกฝ่าย', required: true },
    { name: 'partnerBirth', label: 'วันเกิดของอีกฝ่าย', type: 'date', required: true },
    { name: 'partnerTime', label: 'เวลาเกิดของอีกฝ่าย (ถ้าทราบ)', type: 'time' },
    { name: 'science', label: 'ศาสตร์ที่อยากใช้', type: 'select', options: ['ให้หมอดูเลือก', 'โหราศาสตร์ไทย', 'ปาจื้อ', 'ซาจู', 'โหราศาสตร์ตะวันตก'] },
    { name: 'question', label: 'อยากรู้เรื่องไหนเป็นพิเศษ', type: 'textarea' },
  ],
  'name-check': [{ name: 'current', label: 'ชื่อและนามสกุลปัจจุบัน', prefill: 'fullname', required: true }],
  'phone-compare': [{ name: 'numbers', label: 'เบอร์ที่ต้องการเทียบ (บรรทัดละเบอร์ ไม่เกิน 3)', type: 'textarea', required: true }],
  'plate-compare': [{ name: 'plates', label: 'ทะเบียนที่ต้องการเทียบ (บรรทัดละชุด ไม่เกิน 3)', type: 'textarea', required: true }],
  house: [
    { name: 'houseno', label: 'บ้านเลขที่ที่ต้องการวิเคราะห์ (ไม่ต้องใส่ถนนหรือจังหวัด)', required: true, placeholder: 'เช่น 99/123', maxlength: 20 },
    { name: 'type', label: 'ประเภทที่อยู่', type: 'select', options: ['บ้าน', 'คอนโด / ห้องชุด', 'ร้านค้า', 'สำนักงาน', 'บ้านที่กำลังจะซื้อ / เช่า'] },
    { name: 'wish', label: 'อยากให้ช่วยดูเรื่องไหนเป็นพิเศษ', type: 'textarea', placeholder: 'เช่น การเงินของครอบครัว ค้าขาย สุขภาพ' },
  ],
  merit: [
    { name: 'for', label: 'ทำบุญให้ใคร', type: 'select', options: ['ตัวเอง', 'คนในครอบครัว', 'อุทิศให้ผู้ล่วงลับ'] },
    { name: 'names', label: 'ชื่อ-นามสกุลผู้รับบุญ', prefill: 'fullname', required: true },
    { name: 'kind', label: 'รายการทำบุญ', type: 'select', options: ['ถวายสังฆทาน', 'ถวายภัตตาหาร', 'บริจาคค่าน้ำค่าไฟวัด', 'ปล่อยปลา'] },
    { name: 'place', label: 'สถานที่', type: 'select', options: MERIT_PLACES, groups: placeGroups() },
    { name: 'wish', label: 'คำอธิษฐาน / ข้อความถึงผู้ล่วงลับ', type: 'textarea' },
  ],
  pray: [
    { name: 'names', label: 'ชื่อ-นามสกุล', prefill: 'fullname', required: true },
    { name: 'place', label: 'สถานที่', type: 'select', options: MERIT_PLACES, groups: placeGroups() },
    { name: 'wish', label: 'คำอธิษฐานของคุณ', type: 'textarea', required: true, placeholder: 'เช่น ขอให้งานใหม่ราบรื่น สุขภาพแข็งแรง' },
  ],
  sadoh: [
    { name: 'names', label: 'ชื่อ-นามสกุล', prefill: 'fullname', required: true },
    { name: 'issue', label: 'เรื่องที่อยากสะเดาะเคราะห์', type: 'textarea', required: true, placeholder: 'เช่น ช่วงนี้งานติดขัด มีเรื่องขัดแย้งบ่อย' },
    { name: 'method', label: 'วิธีสะเดาะเคราะห์', type: 'select', options: ['ให้หมอดูเลือกตามดวง', 'ปล่อยปลา / ปล่อยนก', 'ถวายสังฆทาน', 'ทำบุญโลงศพ'] },
    { name: 'place', label: 'สถานที่', type: 'select', options: MERIT_PLACES, groups: placeGroups() },
  ],
  pichong: [
    { name: 'names', label: 'ชื่อ-นามสกุล', prefill: 'fullname', required: true },
    { name: 'place', label: 'สถานที่', type: 'select', options: CHONG_PLACES, groups: placeGroups((p) => p.tags.includes('chong')) },
    { name: 'note', label: 'เรื่องที่อยากขอพรเพิ่ม', type: 'textarea' },
  ],
});
// สินค้า: ที่อยู่จัดส่ง
const SHIP_FIELDS = [
  { name: 'receiver', label: 'ชื่อผู้รับ', prefill: 'fullname', required: true },
  { name: 'tel', label: 'เบอร์โทรผู้รับ', prefill: 'phone', required: true, inputmode: 'tel' },
  { name: 'address', label: 'ที่อยู่จัดส่ง', type: 'textarea', required: true, placeholder: 'บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์' },
];
// ข้อความหลังส่งข้อมูล + ขั้นตอนติดตามงาน (บริการที่ไม่ใช่หมอดูตอบ)
const AFTER = {
  merit: { status: 'รับเรื่องแล้ว · เตรียมทำพิธี', title: 'รับเรื่องเรียบร้อย',
    text: 'ทีมจะทำพิธีให้ภายใน 3 วัน และส่งรูปถ่ายกับวิดีโอยืนยันมาที่ “ประวัติการดูดวง”',
    steps: ['รับเรื่องและตรวจข้อมูล', 'ทีมทำพิธีที่สถานที่จริง', 'ส่งรูปถ่าย + วิดีโอยืนยัน'] },
  shop: { status: 'รับคำสั่งซื้อ · เตรียมจัดส่ง', title: 'สั่งซื้อเรียบร้อย',
    text: 'ร้านจะจัดส่งภายใน 3–5 วันทำการ และแจ้งเลขพัสดุใน “ประวัติการดูดวง”',
    steps: ['รับคำสั่งซื้อ', 'เตรียมและแพ็กสินค้า', 'จัดส่งพร้อมเลขพัสดุ'] },
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
    done: AFTER[s.group],
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
  if (!currentUser()) { requireLogin(() => startCheckout(item)); return; }
  clearInterval(timer);
  order = { item, tier: item.tiers.findIndex((t) => t.price != null && !t.soon), donation: null };
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
    ${placePickerHTML(item)}
    ${donates(item) ? donationHTML() : ''}
    <div class="pay-total"><span>ยอดชำระ</span><b id="payTotal">${baht(orderTotal())}</b></div>
    <button class="btn-gold full" id="toQR">ชำระเงินด้วย QR ›</button>
    <p class="pay-note">ชำระแล้วจึงเริ่มบริการ · ${item.next.kind === 'form' ? 'ขั้นต่อไปกรอกข้อมูลสำหรับการทำนาย' : item.next.kind === 'ai' ? 'ใช้ได้ทันทีหลังชำระ' : 'ขั้นต่อไปเริ่มดูดวงได้ทันที'}</p>`;
  $('payBody').querySelectorAll('input[name="ptier"]').forEach((r) => r.addEventListener('change', () => {
    order.tier = +r.value;
    updateTotal();
  }));
  $('toQR').addEventListener('click', renderQR);
  bindPlacePicker(item);
  if (donates(item)) bindDonation();
  updateTotal();
}

// ---------- เงินทำบุญ (บริการมงคล): ยอดชำระ = ค่าบริการทำแทน + เงินทำบุญที่เลือก ----------
const DONATION_STEPS = [20, 50, 100, 200, 300, 500, 1000];
const donates = (item) => !!placeField(item);
const orderTotal = () => (order.item.tiers[order.tier].price || 0) + (order.donation || 0);
function donationHTML() {
  return `<fieldset class="pay-donate"><legend>🙏 จำนวนเงินทำบุญ</legend>
      <div class="pp-row dn-row">
        <select id="dnSel" aria-label="จำนวนเงินทำบุญ">
          <option value="">เลือกจำนวนเงินทำบุญ</option>
          ${DONATION_STEPS.map((n) => `<option value="${n}" ${order.donation === n ? 'selected' : ''}>${baht(n)}</option>`).join('')}
          <option value="custom">ระบุจำนวนเอง</option>
        </select>
        <input id="dnCustom" type="number" inputmode="numeric" min="1" max="100000" step="1" placeholder="ระบุจำนวน (บาท)" hidden>
      </div>
      <p class="pp-hint">ทีมนำเงินทำบุญทั้งหมดไปทำบุญตามรายการที่คุณเลือก พร้อมรูปและวิดีโอยืนยัน</p>
    </fieldset>
    <ul class="pay-sum">
      <li><span>ค่าบริการทำแทน</span><b id="paySvc"></b></li>
      <li><span>เงินทำบุญ</span><b id="payDonate">—</b></li>
    </ul>`;
}
function bindDonation() {
  const sel = $('dnSel');
  const inp = $('dnCustom');
  const set = (n) => { order.donation = n > 0 ? Math.min(100000, Math.floor(n)) : null; updateTotal(); };
  sel.addEventListener('change', () => {
    const custom = sel.value === 'custom';
    inp.hidden = !custom;
    if (custom) { inp.focus(); set(+inp.value); } else set(+sel.value);
  });
  inp.addEventListener('input', () => set(+inp.value));
}
function updateTotal() {
  const item = order.item;
  $('payTotal').textContent = baht(orderTotal());
  if (!donates(item)) return;
  $('paySvc').textContent = baht(item.tiers[order.tier].price);
  $('payDonate').textContent = order.donation ? baht(order.donation) : '—';
  const btn = $('toQR');
  btn.disabled = !order.donation;
  btn.textContent = order.donation ? 'ชำระเงินด้วย QR ›' : 'เลือกจำนวนเงินทำบุญก่อน';
}

// ---------- เลือกสถานที่ทำพิธีตั้งแต่ขั้นแรก (บริการมงคล) ----------
const placeField = (item) => item.next && item.next.kind === 'form' && (item.next.fields || []).find((f) => f.name === 'place' && f.groups);
const placeByLabel = (label) => PLACES.find((p) => placeLabel(p) === label);
function placePickerHTML(item) {
  const f = placeField(item);
  if (!f) return '';
  const cur = placeByLabel((item.preset || {}).place);
  const allowed = new Set(f.groups.flatMap(([, list]) => list));
  const regions = PLACE_REGIONS.filter((r) => PLACES.some((p) => p.region === r.id && allowed.has(placeLabel(p))));
  const region = cur ? cur.region : '';
  const options = (rid) => PLACES.filter((p) => p.region === rid && allowed.has(placeLabel(p)))
    .map((p) => `<option value="${esc(placeLabel(p))}" ${cur === p ? 'selected' : ''}>${p.feat ? '✦ ' : ''}${esc(p.name)} · ${esc(p.prov)}</option>`).join('');
  return `<fieldset class="pay-place"><legend>📍 เลือกสถานที่ทำพิธี</legend>
      <div class="pp-row">
        <select id="ppRegion" aria-label="ภาค"><option value="">ให้ทีมเลือกให้</option>${regions.map((r) =>
          `<option value="${r.id}" ${r.id === region ? 'selected' : ''}>${r.icon} ${esc(r.name)}</option>`).join('')}</select>
        <select id="ppPlace" aria-label="สถานที่" ${region ? '' : 'disabled'}>${region ? options(region) : `<option value="">${esc(f.options[0])}</option>`}</select>
      </div>
      <div id="ppInfo">${cur ? placeInfoHTML(cur) : '<p class="pp-hint">ไม่ได้เลือก ทีมจะเลือกสถานที่ที่เหมาะกับดวงของคุณให้ · ✦ คือวัดเด่นแนะนำ</p>'}</div>
    </fieldset>`;
}
function placeInfoHTML(p) {
  return `<div class="pp-info"><span>${p.icon}</span><div><b>${esc(p.name)}</b><small>📍 ${esc(p.loc)} · องค์สักการะ ${esc(p.deity)}</small><p>${esc(p.good)}</p></div></div>`;
}
function bindPlacePicker(item) {
  const f = placeField(item);
  if (!f) return;
  const allowed = new Set(f.groups.flatMap(([, list]) => list));
  const setPlace = (label) => {
    item.preset = { ...(item.preset || {}), place: label || f.options[0] };
    const p = placeByLabel(label);
    $('ppInfo').innerHTML = p ? placeInfoHTML(p) : '<p class="pp-hint">ไม่ได้เลือก ทีมจะเลือกสถานที่ที่เหมาะกับดวงของคุณให้ · ✦ คือวัดเด่นแนะนำ</p>';
  };
  $('ppRegion').addEventListener('change', (e) => {
    const rid = e.target.value;
    const sel = $('ppPlace');
    if (!rid) { sel.innerHTML = `<option value="">${esc(f.options[0])}</option>`; sel.disabled = true; setPlace(''); return; }
    // วัดแนะนำขึ้นก่อนในแต่ละภาค
    const list = PLACES.filter((p) => p.region === rid && allowed.has(placeLabel(p))).sort((a, b) => b.feat - a.feat);
    sel.innerHTML = list.map((p) => `<option value="${esc(placeLabel(p))}">${p.feat ? '✦ ' : ''}${esc(p.name)} · ${esc(p.prov)}</option>`).join('');
    sel.disabled = false;
    setPlace(sel.value);
  });
  $('ppPlace').addEventListener('change', (e) => setPlace(e.target.value));
}

// ขั้นที่ 2: QR สำหรับชำระเงิน
function renderQR() {
  const t = order.item.tiers[order.tier];
  if (donates(order.item) && !order.donation) return; // ต้องเลือกจำนวนเงินทำบุญก่อน
  order.no = `MD${Date.now().toString().slice(-8)}`;
  order.amount = orderTotal();
  order.label = order.donation ? `${t.label} + เงินทำบุญ ${baht(order.donation)}` : t.label;
  setStep(2, 'สแกนเพื่อชำระเงิน');
  $('payBody').innerHTML = `
    <div class="qr-card">
      <span class="demo-tag">โหมดทดลอง · ไม่ต้องสแกนจ่ายจริง</span>
      <p class="qr-head">สแกนจ่ายผ่านแอปธนาคาร</p>
      <div class="qr-box" id="qrBox"></div>
      <p class="qr-amount">${baht(order.amount)}</p>
      <p class="qr-meta">${esc(order.item.title)} · ${esc(t.label)}${order.donation ? `<br>ค่าบริการทำแทน ${baht(t.price)} + เงินทำบุญ ${baht(order.donation)}` : ''}<br>เลขที่คำสั่งซื้อ ${order.no}</p>
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
    const pre = { fullname: [u.first || u.name, u.last].filter(Boolean).join(' '), phone: localPhone(u.phone) };
    const val = f.prefill ? esc(pre[f.prefill] ?? u[f.prefill] ?? '') : '';
    const extra = `${f.inputmode ? `inputmode="${f.inputmode}"` : ''} ${f.pattern ? `pattern="${f.pattern}"` : ''} ${f.maxlength ? `maxlength="${f.maxlength}"` : ''}`;
    if (f.type === 'textarea') return `<textarea name="${f.name}" rows="3" ${req} placeholder="${esc(f.placeholder || '')}">${val}</textarea>`;
    if (f.type === 'select') {
      // ค่าที่เลือกไว้ก่อน (เช่น เลือกวัดจากหน้ามงคล) → เลือกไว้ให้
      const want = order.item.preset && order.item.preset[f.name];
      const opt = (o) => `<option ${o === want ? 'selected' : ''}>${esc(o)}</option>`;
      return `<select name="${f.name}">${f.options.map(opt).join('')}${(f.groups || []).map(([label, list]) =>
        `<optgroup label="${esc(label)}">${list.map(opt).join('')}</optgroup>`).join('')}</select>`;
    }
    if (f.type === 'file') {
      // มีรูปในแฟ้มดวงแล้ว → ใช้รูปเดิมได้เลย หรือเลือกรูปใหม่ (รูปเดิมเก็บไว้ดูย้อนหลัง)
      const old = f.slot && (u.photos || {})[f.slot];
      return `${old ? `<span class="in-old"><img src="${old}" alt=""><em>ใช้รูปเดิมในแฟ้มดวงได้เลย หรือเลือกรูปใหม่</em></span>` : ''}<input type="file" name="${f.name}" accept="image/*" ${old ? '' : req}>`;
    }
    return `<input type="${f.type || 'text'}" name="${f.name}" ${req} ${extra} value="${val}" placeholder="${esc(f.placeholder || '')}" autocomplete="off">`;
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
      ${fields.some((f) => f.slot) ? '<p class="pf-note">📷 รูปจะเก็บไว้ใน “แฟ้มดวง” ของคุณ ใช้ดูดวงครั้งต่อไปและรายงานดวงประจำวัน ลบได้ทุกเมื่อในหน้าบัญชี</p>' : ''}
      <button class="btn-gold full" type="submit">${order.item.done ? 'ยืนยัน ›' : 'ส่งให้หมอดู ›'}</button>
    </form>`;
  $('intakeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    if (form.dataset.busy) return;
    form.dataset.busy = '1';
    const data = {};
    const shots = [];
    for (const [k, v] of new FormData(form).entries()) {
      if (!(v instanceof File)) { data[k] = String(v); continue; }
      const f = fields.find((x) => x.name === k);
      const slot = f && f.slot;
      if (v.size && slot) {
        try { shots.push({ slot, src: await shrinkImage(v) }); } catch (_) { toast('อ่านไฟล์รูปไม่ได้ ลองรูปอื่นนะคะ'); delete form.dataset.busy; return; }
        data[k] = `📷 ${slotInfo(slot).name} · เก็บในแฟ้มดวงแล้ว`;
      } else if (slot && (currentUser().photos || {})[slot]) {
        data[k] = `📷 ${slotInfo(slot).name} · ใช้รูปเดิมในแฟ้มดวง`;
        shots.push({ slot, reuse: true });
      } else data[k] = v.name || '';
    }
    // เลขบัตรประชาชน: เก็บเฉพาะผลรวมและเลขท้าย 4 หลัก ไม่เก็บเลขเต็ม
    fields.filter((f) => f.mask === 'idcard').forEach((f) => {
      const d = (data[f.name] || '').replace(/\D/g, '');
      data[f.name] = `•••••••••${d.slice(-4)} · ผลรวม ${[...d].reduce((a, b) => a + +b, 0)}`;
    });
    const done = order.item.done;
    const cur = currentUser();
    if (data.birthdate) cur.birthdate = data.birthdate;
    shots.filter((s) => s.src).forEach((s) => savePhoto(cur, s.slot, s.src, order.item.title));
    if (!saveUserWithPhotos(cur)) { delete form.dataset.busy; return; }
    const histId = addHistory({ kind: 'order', svc: order.item.key, donation: order.donation || undefined, icon: order.item.icon, title: order.item.title, status: done ? done.status : 'รอหมอดูตอบ',
      no: order.no, amount: order.amount, label: order.label, data, fields: fields.map((f) => [f.name, f.label]),
      photos: shots.map((s) => s.slot),
      ...(done ? { steps: done.steps, note: done.text } : {}) });
    // ลายมือ / โหงวเฮ้ง → แม่หมอ AI อ่านรูปทันที (ถ้า AI ยังไม่พร้อม จะส่งต่อให้หมอดูตอบภายหลัง)
    if (PHOTO_KINDS[order.item.key]) {
      const slots = shots.map((s) => s.slot);
      runPhotoReading({ histId, kind: PHOTO_KINDS[order.item.key], slots, topic: data.topic || 'ภาพรวม', retry: () => renderIntake(fields) });
      return;
    }
    $('payBody').innerHTML = `
      <div class="pay-ok"><span class="ok-ring">✦</span><h3>${done ? done.title : 'ส่งข้อมูลให้หมอดูแล้ว'}</h3>
        <p>${done ? done.text : 'หมอดูจะตอบกลับภายใน 24 ชั่วโมง<br>ดูสถานะและคำตอบได้ที่ “ประวัติการดูดวง” ในหน้าบัญชี'}</p></div>
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
  const it = e.data.service ? itemFromService(e.data.service, e.data.title) : itemFromHref(e.data.href || '');
  if (e.data.guard) closeFrame();
  if (it) startCheckout(it);
});
// 2) รายการหมวดหมู่ → ประเภท: ปุ่ม “ดูดวงประเภทนี้”
$('typeBody').addEventListener('click', (e) => {
  const b = e.target.closest('[data-buy]');
  if (b) { const [cat, idx] = b.dataset.buy.split('|'); startCheckout(itemFromType(cat, +idx)); }
});
