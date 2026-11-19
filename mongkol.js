// ===== แท็บ “มงคล”: 2 ส่วน → บริการมงคล (ทำบุญ · แก้ดวง) และ วัตถุมงคล (ร้านค้า) =====
// สัดส่วนตามแผนธุรกิจ: ดูดวง 80% · ขายของ 20% → ร้านค้าเป็นส่วนเสริมในแท็บนี้
// ราคาสินค้าเป็นราคาตัวอย่าง (ยังไม่มีสต็อกและระบบจัดส่งจริง)

const SHOP_ITEMS = [
  { id: 'birth-bracelet', icon: '📿', name: 'สร้อยข้อมือหินสีประจำวันเกิด', desc: 'เลือกสีหินตามวันเกิดของคุณให้อัตโนมัติ', price: 299, personal: true },
  { id: 'amethyst', icon: '💜', name: 'กำไลหินอเมทิสต์', desc: 'โทนม่วงสงบ นิยมพกเพื่อสมาธิและความรัก', price: 390 },
  { id: 'coin', icon: '🪙', name: 'เหรียญมงคลพกติดตัว', desc: 'ลายพระจันทร์ ดาว และอักขระมงคล', price: 199 },
  { id: 'candle-set', icon: '🕯️', name: 'ชุดธูปเทียนไหว้พระประจำวันเกิด', desc: 'จำนวนธูปและสีเทียนตามวันเกิด', price: 159, personal: true },
  { id: 'cloth', icon: '🧧', name: 'ผ้ามงคลลายยันต์', desc: 'ผ้าแขวนหรือพกติดตัว ลายยันต์และดาวนพเคราะห์', price: 250 },
  { id: 'wallpaper', icon: '🖼️', name: 'วอลเปเปอร์มงคลประจำเดือน', desc: 'ไฟล์ดิจิทัล ออกแบบตามสีมงคลของคุณ ส่งทางแชท', price: 49, digital: true },
];

const mongkolPanel = makePanel('mongkolPanel', 'มงคล');
const mongkolBody = mongkolPanel.querySelector('.panel-body');

let mkTab = 'service';
function renderMongkol() {
  const u = currentUser();
  const day = u && u.birthdate ? DAY_COLORS[birthParts(u).date.getDay()] : null;
  const merit = SERVICES.filter((s) => s.group === 'merit');
  mongkolBody.innerHTML = `
    <div class="mk-switch" role="tablist" aria-label="มงคล">
      <button role="tab" data-mk="service" aria-selected="${mkTab === 'service'}"><span>🪷</span>บริการมงคล</button>
      <button role="tab" data-mk="items" aria-selected="${mkTab === 'items'}"><span>📿</span>วัตถุมงคล</button>
    </div>

    <section class="mk-sec" ${mkTab === 'service' ? '' : 'hidden'}>
      <div class="mk-hero">
        <span class="mk-ico">🪷</span>
        <div><h3>บริการมงคล</h3><p>ทำบุญ ไหว้พระ สะเดาะเคราะห์ และแก้ปีชงแทนคุณ ทีมงานทำพิธีที่สถานที่จริง แล้วส่งรูปและวิดีโอยืนยัน</p></div>
      </div>
      <div class="sec-head"><h3>ทำบุญ · แก้ดวงออนไลน์</h3><span class="sec-note">ค่าบริการ ${baht(SERVICE_PRICE)}</span></div>
      <div class="mk-grid">${merit.map((s) => `
        <article class="mk-card">
          <span class="mk-ci">${s.icon}</span>
          <b>${esc(s.name)}</b>
          <p>${esc(s.about)}</p>
          <button class="btn-gold" data-merit="${s.id}">จองพิธี ›</button>
        </article>`).join('')}</div>
      <section class="mk-steps">
        <h4>ขั้นตอนการทำพิธีแทนคุณ</h4>
        <ol>
          <li><span class="ms-ico">📝</span><em>1</em><b>จองและแจ้งชื่อ</b><small>ใส่ชื่อผู้รับบุญ คำอธิษฐาน และเลือกสถานที่</small></li>
          <li><span class="ms-ico">🛕</span><em>2</em><b>ทีมทำพิธีแทนคุณ</b><small>ทำพิธีที่วัดหรือสถานที่จริงตามที่เลือก</small></li>
          <li><span class="ms-ico">📸</span><em>3</em><b>รับรูปและวิดีโอยืนยัน</b><small>ส่งให้ภายใน 3 วัน ดูได้ใน “ประวัติการดูดวง”</small></li>
        </ol>
      </section>
    </section>

    <section class="mk-sec" ${mkTab === 'items' ? '' : 'hidden'}>
      <div class="mk-hero">
        <span class="mk-ico">📿</span>
        <div><h3>วัตถุมงคล</h3><p>เครื่องราง หินมงคล และของเสริมดวง เลือกสีและแบบตามวันเกิดของคุณ</p></div>
      </div>
      <div class="sec-head"><h3>สินค้าแนะนำ</h3><span class="sec-note">ราคาตัวอย่าง</span></div>
      ${day ? `<p class="mk-tip">✦ คุณเกิดวัน${day.day} สีประจำวันเกิดคือ <b>สี${day.birth}</b> · สีเสริมการเงิน <b>สี${day.money}</b></p>` : ''}
      <div class="mk-shop">${SHOP_ITEMS.map((p) => `
        <article class="mk-item">
          <span class="mk-pi">${p.icon}</span>
          <div class="mk-it"><b>${esc(p.name)}</b><small>${esc(p.personal && day ? `${p.desc} · ของคุณ: สี${day.birth}` : p.desc)}</small></div>
          <div class="mk-buy"><b>${baht(p.price)}</b><button class="btn-ghost" data-shop="${p.id}">สั่งซื้อ</button></div>
        </article>`).join('')}</div>
    </section>

    <button class="btn-ghost full mk-all" data-all>ดูบริการดูดวงทั้งหมด ›</button>
    <p class="pf-note">โหมดทดลอง · ยังไม่มีการเก็บเงินและจัดส่งจริง รายชื่อสถานที่เป็นตัวอย่าง รอยืนยันพาร์ทเนอร์</p>`;
}

function shopItem(p) {
  const u = currentUser();
  const day = u && u.birthdate ? DAY_COLORS[birthParts(u).date.getDay()] : null;
  return {
    key: `shop:${p.id}`, icon: p.icon, title: p.name,
    sub: p.personal && day ? `${p.desc} · สีของคุณ: สี${day.birth}` : p.desc,
    tiers: [{ label: '1 ชิ้น', price: p.price }],
    next: { kind: 'form', fields: p.digital ? [{ name: 'note', label: 'ขอเพิ่มเติม (ถ้ามี)', type: 'textarea', placeholder: 'เช่น อยากได้โทนสีม่วง' }] : SHIP_FIELDS },
    done: p.digital
      ? { ...AFTER.shop, text: 'ทีมจะส่งไฟล์ให้ภายใน 24 ชั่วโมงใน “ประวัติการดูดวง”', steps: ['รับคำสั่งซื้อ', 'ออกแบบตามสีมงคลของคุณ', 'ส่งไฟล์ให้ดาวน์โหลด'] }
      : AFTER.shop,
  };
}

mongkolBody.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-mk]');
  if (tab) { mkTab = tab.dataset.mk; renderMongkol(); return; }
  const m = e.target.closest('[data-merit]');
  if (m) { startCheckout(itemFromService(m.dataset.merit)); return; }
  const s = e.target.closest('[data-shop]');
  if (s) { startCheckout(shopItem(SHOP_ITEMS.find((p) => p.id === s.dataset.shop))); return; }
  if (e.target.closest('[data-all]')) openFrame('services.html');
});

function openMongkol() {
  closeAllPanels();
  setActiveTab('services');
  renderMongkol();
  openPanel('mongkolPanel');
}
$('tabMongkol').addEventListener('click', openMongkol);
