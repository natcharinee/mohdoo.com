// ===== ใบสมัครหมอดู (seer-apply.html) → POST /api/v1/seer-apply =====
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ERR = {
    bad_phone: 'เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)', empty: 'กรุณากรอกชื่อ เลือกศาสตร์อย่างน้อย 1 ข้อ และแนะนำตัวอย่างน้อย 20 ตัวอักษร',
    consent_required: 'กรุณาติ๊กยินยอมการเก็บข้อมูลก่อนส่ง', already_seer: 'เบอร์นี้เป็นหมอดูหรือทีมงานของเราอยู่แล้ว เข้าสู่ระบบที่หน้าเว็บได้เลย',
    too_many_requests: 'ส่งใบสมัครถี่เกินไป รอสักครู่แล้วลองใหม่',
  };

  const form = $('applyForm');

  // ศาสตร์ทั้งหมดจาก categories-data.js · ศาสตร์ที่ต้องใช้หมอดูจริงและยังไม่มีคนรับ = รับสมัครด่วน
  function renderCats(open) {
    const urgent = [];
    $('cats').innerHTML = CATEGORIES.map((c) => `
      <div class="cat-group"><p>${c.icon} ${esc(c.name)}</p><div class="chips">
        ${c.types.map((t, i) => {
          const key = `${c.id}|${i}`;
          const need = t.human && !open.has(key);
          if (need) urgent.push(`${t.icon} ${t.name}`);
          return `<label class="chip-check${need ? ' need' : ''}"><input type="checkbox" name="cats" value="${key}"><span>${t.icon} ${esc(t.name)}${need ? ' <em>ด่วน</em>' : ''}</span></label>`;
        }).join('')}
      </div></div>`).join('');
    $('urgentList').textContent = urgent.join(' · ');
    $('urgent').hidden = !urgent.length;
  }
  renderCats(HUMAN_OPEN);
  fetch('/api/v1/health').then((r) => r.json()).then((h) => {
    if (!Array.isArray(h.human_open) || form.querySelector('input[name="cats"]:checked')) return; // ผู้ใช้เริ่มเลือกแล้ว ไม่วาดใหม่
    renderCats(new Set(h.human_open));
  }).catch(() => {});

  const showErr = (msg) => { const e = $('applyErr'); e.textContent = msg; e.hidden = !msg; if (msg) e.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showErr('');
    const f = form.elements;
    const cats = [...form.querySelectorAll('input[name="cats"]:checked')].map((x) => x.value);
    if (!f.name.value.trim() || !f.phone.value.trim()) return showErr('กรุณากรอกชื่อและเบอร์โทรศัพท์');
    if (!cats.length) return showErr('กรุณาเลือกศาสตร์ที่ชำนาญอย่างน้อย 1 ข้อ');
    if (f.about.value.trim().length < 20) return showErr('กรุณาแนะนำตัวอย่างน้อย 20 ตัวอักษร');
    if (!f.consent.checked) return showErr(ERR.consent_required);
    const btn = $('applyBtn');
    btn.disabled = true; btn.textContent = 'กำลังส่ง…';
    try {
      const r = await fetch('/api/v1/seer-apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.name.value, alias: f.alias.value, phone: f.phone.value, line: f.line.value, years: f.years.value === '' ? null : +f.years.value,
          links: f.links.value, cats, about: f.about.value, sample: f.sample.value, website: f.website.value, consent: f.consent.checked,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(ERR[j.error] || 'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง หรือทักมาที่ LINE @mohdoo');
      form.hidden = true;
      $('applyDone').hidden = false;
      $('applyDone').scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch (err) {
      showErr(err.message);
    } finally {
      btn.disabled = false; btn.textContent = 'ส่งใบสมัคร';
    }
  });
})();
