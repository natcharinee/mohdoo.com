// ===== หน้าบริการ =====
const $ = (id) => document.getElementById(id);
const fmt = (n) => n.toLocaleString('th-TH');

function priceText(p) {
  if (p.price === 0) return '<span class="free-txt">ฟรี</span>';
  if (p.price == null) return 'สอบถามราคา';
  return `${fmt(p.price)} ฿`;
}

// ---------- ชิปศาสตร์ ----------
let current = 'all';
const chips = $('chips');
[{ id: 'all', icon: '✦', name: 'ทั้งหมด' }, ...SCIENCES].forEach((s) => {
  const b = document.createElement('button');
  b.className = 'chip';
  b.setAttribute('role', 'tab');
  b.dataset.id = s.id;
  b.innerHTML = `<span class="ci">${s.icon}</span>${s.name}`;
  b.addEventListener('click', (e) => {
    burst(e.clientX, e.clientY, 14, 80);
    select(s.id);
  });
  chips.appendChild(b);
});

function select(id) {
  current = id;
  chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-selected', c.dataset.id === id));
  // บนมือถือแถบชิปเลื่อนแนวนอนได้ ให้ชิปที่เลือกอยู่กลางแถบเสมอ
  const sel = chips.querySelector(`.chip[data-id="${id}"]`);
  chips.scrollTo({ left: sel.offsetLeft - chips.clientWidth / 2 + sel.clientWidth / 2, behavior: 'smooth' });
  const info = $('scienceInfo');
  const sci = SCIENCES.find((s) => s.id === id);
  if (sci) {
    info.hidden = false;
    info.innerHTML = `<h2>${sci.icon} ${sci.name}${sci.soon ? ' <span class="badge-s soon">เร็ว ๆ นี้</span>' : ''}</h2>
      <p>${sci.how}</p><p class="uses">ใช้กับ: ${sci.uses}</p>`;
    // เล่นแอนิเมชันใหม่ทุกครั้งที่เปลี่ยน
    info.style.animation = 'none'; void info.offsetWidth; info.style.animation = '';
  } else {
    info.hidden = true;
  }
  render(sci ? SERVICES.filter((s) => sci.services.includes(s.id)) : SERVICES);
  const url = new URL(location);
  if (id === 'all') url.searchParams.delete('science'); else url.searchParams.set('science', id);
  history.replaceState(null, '', url);
}

// ---------- การ์ดบริการ ----------
function render(list) {
  const wrap = $('services');
  wrap.innerHTML = '';
  if (!list.length) {
    wrap.innerHTML = '<p class="empty">ยังไม่มีบริการสำหรับศาสตร์นี้</p>';
    return;
  }
  list.forEach((s, i) => {
    const el = document.createElement('article');
    el.className = `svc ${s.open ? '' : 'is-soon'}`;
    el.style.setProperty('--delay', `${i * 0.05}s`);
    const free = s.prices.length > 0 && s.prices.every((p) => p.price === 0);
    const lowest = s.prices.filter((p) => p.price != null).sort((a, b) => a.price - b.price)[0];
    const priceLine = free ? '<strong class="free-txt">ฟรี</strong>'
      : !lowest ? 'ราคา<strong>สอบถาม</strong>'
      : `${s.prices.length > 1 ? 'เริ่มต้น' : 'ราคา'}<strong>${fmt(lowest.price)} ฿</strong>`;
    const action = s.link
      ? `<a class="btn-gold" href="${s.link}">เริ่มเลย</a>`
      : s.open
        ? `<button class="btn-gold" data-book="${s.id}">ดูรายละเอียด</button>`
        : `<button class="btn-ghost" data-book="${s.id}">ดูรายละเอียด</button>`;
    el.innerHTML = `
      <div class="svc-top">
        <span class="svc-icon">${s.icon}</span>
        <div>
          <h3>${s.name}</h3>
          <div class="svc-badges">
            ${free ? '<span class="badge-s free">ฟรี</span>' : ''}
            ${s.open ? '' : '<span class="badge-s soon">เร็ว ๆ นี้</span>'}
          </div>
        </div>
      </div>
      <p>${s.about}</p>
      <p class="get">${s.get}</p>
      <div class="svc-foot">
        <span class="price">${priceLine}</span>
        ${action}
      </div>`;
    wrap.appendChild(el);
  });
}

// ---------- หน้าต่างรายละเอียด/จอง ----------
const dlg = $('book');
$('services').addEventListener('click', (e) => {
  const b = e.target.closest('[data-book]');
  if (b) openBook(b.dataset.book);
});

function openBook(id) {
  const s = SERVICES.find((x) => x.id === id);
  $('bookIcon').textContent = s.icon;
  $('bookName').textContent = s.name;
  $('bookSoon').hidden = s.open;
  $('bookAbout').textContent = s.about;
  $('bookGet').textContent = s.get;
  $('bookNote').hidden = !s.note;
  $('bookNote').textContent = s.note || '';

  const tiers = $('bookTiers');
  tiers.querySelectorAll('.tier').forEach((t) => t.remove());
  let firstOpen = true;
  s.prices.forEach((p, i) => {
    const disabled = !s.open || p.soon;
    const label = document.createElement('label');
    label.className = 'tier';
    label.innerHTML = `<input type="radio" name="tier" value="${i}" ${disabled ? 'disabled' : ''} ${!disabled && firstOpen ? 'checked' : ''}>
      <span class="tl">${p.label}${p.soon && s.open ? '<small>เร็ว ๆ นี้</small>' : ''}</span>
      <span class="tp">${priceText(p)}</span>`;
    if (!disabled) firstOpen = false;
    tiers.appendChild(label);
  });

  const go = $('bookGo');
  if (s.open) {
    go.textContent = 'เข้าสู่ระบบเพื่อจอง';
    go.href = 'index.html#register';
    go.onclick = null;
  } else {
    go.textContent = 'แจ้งเตือนฉันเมื่อเปิดบริการ';
    go.href = '#';
    go.onclick = (e) => {
      e.preventDefault();
      dlg.close();
      toast(`เราจะแจ้งเตือนเมื่อเปิดบริการ "${s.name}" (ตัวอย่าง — ยังไม่เชื่อมระบบหลังบ้าน)`);
    };
  }
  dlg.showModal();
}
$('closeBook').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

// เปิดหน้าพร้อมตัวกรอง เช่น services.html?science=tarot
const initial = new URLSearchParams(location.search).get('science');
select(SCIENCES.some((s) => s.id === initial) ? initial : 'all');
