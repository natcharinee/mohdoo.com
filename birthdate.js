// ===== วันเกิดแบบไทย: กรอกเป็น วัน / เดือน / ปี พ.ศ. · เก็บและคำนวณเป็น ค.ศ. (YYYY-MM-DD) อัตโนมัติ =====
// ใช้: <div class="bd" data-bd="birthdate" data-value="1996-09-08" data-required></div> → สร้างช่องเลือก 3 ช่อง + input ซ่อนชื่อ birthdate (ค่า ค.ศ.)
// ค่าที่เคยบันทึกเป็น พ.ศ. (ปี ≥ 2400) แปลงเป็น ค.ศ. ให้เอง (normBirthISO)
const BD_BE = 543;
const BD_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

function normBirthISO(s) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(s || '').trim());
  if (!m) return String(s || '');
  let y = +m[1];
  if (y >= 2400) y -= BD_BE; // กรอก/เก็บเป็น พ.ศ. → ค.ศ.
  return `${String(y).padStart(4, '0')}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

function initBirthField(el) {
  if (el.dataset.ready) return;
  el.dataset.ready = '1';
  const req = el.hasAttribute('data-required');
  const nowBE = new Date().getFullYear() + BD_BE;
  const iso = normBirthISO(el.dataset.value);
  const [py, pm, pd] = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').map(Number) : [0, 0, 0];
  const opts = (list, sel) => list.map(([v, t]) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${t}</option>`).join('');
  const days = Array.from({ length: 31 }, (_, i) => [i + 1, String(i + 1)]);
  const months = BD_MONTHS.map((t, i) => [i + 1, t]);
  const years = Array.from({ length: 121 }, (_, i) => [nowBE - i, String(nowBE - i)]);
  const rq = req ? 'required' : '';
  el.innerHTML = `<select data-bdp="d" ${rq} aria-label="วันที่เกิด"><option value="">วัน</option>${opts(days, pd)}</select>
    <select data-bdp="m" ${rq} aria-label="เดือนเกิด"><option value="">เดือน</option>${opts(months, pm)}</select>
    <select data-bdp="y" ${rq} aria-label="ปีเกิด พ.ศ."><option value="">ปี พ.ศ.</option>${opts(years, py ? py + BD_BE : 0)}</select>
    <input type="hidden" name="${el.dataset.bd}" value="${py ? iso : ''}">`;
  const sync = () => {
    const [d, m, y] = ['d', 'm', 'y'].map((k) => +el.querySelector(`[data-bdp="${k}"]`).value);
    const dayEl = el.querySelector('[data-bdp="d"]');
    const hidden = el.querySelector('input[type="hidden"]');
    dayEl.setCustomValidity('');
    hidden.value = '';
    if (!d || !m || !y) return;
    const ce = y - BD_BE, t = new Date(ce, m - 1, d);
    if (t.getFullYear() !== ce || t.getMonth() !== m - 1 || t.getDate() !== d) { dayEl.setCustomValidity('วันที่นี้ไม่มีในเดือนที่เลือก'); return; }
    if (t > new Date()) { dayEl.setCustomValidity('วันเกิดต้องไม่เกินวันนี้'); return; }
    hidden.value = `${String(ce).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };
  el.addEventListener('change', sync);
  sync();
}
const initBirthFields = (root = document) => root.querySelectorAll('.bd[data-bd]:not([data-ready])').forEach(initBirthField);
// หน้าที่วาดฟอร์มเองทีหลัง (ชำระเงิน · โปรไฟล์ · คนรอบตัว) ก็ได้ช่องวันเกิดให้อัตโนมัติ
new MutationObserver(() => initBirthFields()).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', () => initBirthFields());
initBirthFields();
