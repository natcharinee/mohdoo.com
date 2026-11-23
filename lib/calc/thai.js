// ===== ศาสตร์ไทย: วันเกิดทางโหราศาสตร์ · ทักษา · สีและอักษรประจำดาว · เลขเส้นทางชีวิต =====
// สีและอักษรประจำดาวอ่านจากตำราดูดวง (kb.js) ซึ่งทีมแก้ได้ในหลังบ้าน

import { kbMaps } from './kb.js';

export const DAY_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

// ลำดับดาวในวงทักษา (เวียนขวา) และชื่อตำแหน่ง
const TAKSA_ORDER = [1, 2, 3, 4, 7, 5, 8, 6];
const TAKSA_ROLES = ['บริวาร', 'อายุ', 'เดช', 'ศรี', 'มูละ', 'อุตสาหะ', 'มนตรี', 'กาลกิณี'];
export const taksaOrder = TAKSA_ORDER;
export const taksaRoles = TAKSA_ROLES;

// ข้อมูลดาว { name, color, letters (เว้นวรรคไว้อ่านง่าย), chars }
export function planetInfo(n) {
  const p = kbMaps().planet[n];
  return { name: p.name, color: p.color, chars: p.letters, letters: [...p.letters].join(' ') };
}
export const planetOfLetter = (ch) => kbMaps().letterPlanet[ch] || null;

// วันเกิดทางโหราศาสตร์ไทย: วันเปลี่ยนตอนรุ่งเช้า (ถือ 06:00 น. ตามที่นิยม) ไม่ใช่เที่ยงคืน
// weekday = วันตามปฏิทิน (0 = อาทิตย์) · hour/minute = เวลาเกิด (ไม่มีก็ได้)
export function thaiBirthDay(weekday, hour, minute) {
  const known = Number.isFinite(hour);
  const mins = known ? hour * 60 + (minute || 0) : null;
  const astroDay = known && mins < 360 ? (weekday + 6) % 7 : weekday;
  const wedNight = known && ((weekday === 3 && mins >= 1080) || (weekday === 4 && mins < 360));
  const planet = wedNight ? 8 : [1, 2, 3, 4, 5, 6, 7][astroDay];
  const notes = [];
  if (!known) notes.push('ไม่มีเวลาเกิด จึงใช้วันตามปฏิทิน (ถ้าเกิดก่อนรุ่งเช้า หรือเกิดวันพุธหลัง 18:00 น. ผลจะเปลี่ยน)');
  else if (mins >= 330 && mins < 405) notes.push('เกิดช่วงใกล้รุ่งเช้า วันทางโหราศาสตร์อาจเปลี่ยนตามเวลาพระอาทิตย์ขึ้นจริงของวันนั้น');
  if (known && astroDay !== weekday) notes.push(`เกิดก่อนรุ่งเช้า ทางโหราศาสตร์นับเป็นวัน${DAY_TH[astroDay]}`);
  return { calendarDay: DAY_TH[weekday], astroDay: wedNight ? 'พุธกลางคืน (ราหู)' : DAY_TH[astroDay], planet, notes };
}

// ทักษาจากดาววันเกิด: ดาววันเกิดเป็น "บริวาร" แล้วเวียนขวาตามลำดับ
export function taksa(planet) {
  const start = TAKSA_ORDER.indexOf(planet);
  return TAKSA_ROLES.map((role, i) => {
    const n = TAKSA_ORDER[(start + i) % 8];
    const p = planetInfo(n);
    return { role, n, planet: p.name, color: p.color, letters: p.letters };
  });
}

// เลขศาสตร์สากล: เลขเส้นทางชีวิต (Life Path) จากวันเดือนปีเกิด คงเลขเด่น 11 · 22 · 33
export function lifePath(y, m, d) {
  let n = `${y}${m}${d}`.split('').reduce((s, c) => s + Number(c), 0);
  while (n > 9 && ![11, 22, 33].includes(n)) n = String(n).split('').reduce((s, c) => s + Number(c), 0);
  return n;
}

// ---------- กาลโยคประจำปี: วันธงชัย · อธิบดี · อุบาทว์ · โลกาวินาศ ----------
// เกณฑ์จากจุลศักราช (จ.ศ.) แล้วหาร 7 เอาเศษเป็นวัน (1 = อาทิตย์ … 6 = ศุกร์ · 0 = เสาร์)
//   ธงชัย = จ.ศ. × 10 + 3 · อธิบดี = จ.ศ. mod 498 · อุบาทว์ = จ.ศ. × 10 + 2 · โลกาวินาศ = จ.ศ. + 1120
// ปี จ.ศ. เปลี่ยนที่วันเถลิงศก (คำนวณตามคัมภีร์สุริยยาตร มักตรงกับ 16 เม.ย.) · ช่วง 15–17 เม.ย. ให้ตรวจกับปฏิทินโหรอีกครั้ง
// ตรวจแล้วตรงกับปฏิทินโหร: จ.ศ.1387 ธงชัย ศุกร์ อธิบดี ศุกร์ อุบาทว์ พฤหัส โลกาวินาศ อาทิตย์ · จ.ศ.1388 ธงชัย จันทร์ อธิบดี เสาร์ อุบาทว์ อาทิตย์ โลกาวินาศ จันทร์
const remToWeekday = (r) => (r === 0 ? 6 : r - 1); // → 0 = อาทิตย์ แบบ Date.getDay()
export function chulaYear(y, m, d) { return y - 638 - (m < 4 || (m === 4 && d < 16) ? 1 : 0); }
export function kalayog(cs) {
  return {
    cs,
    thongchai: remToWeekday((cs * 10 + 3) % 7),
    athibodi: remToWeekday((cs % 498) % 7),
    ubat: remToWeekday((cs * 10 + 2) % 7),
    lokawinat: remToWeekday((cs + 1120) % 7),
  };
}
// วันหนึ่ง (ปี เดือน วัน ตามปฏิทินสากล) ตรงกับกาลโยคอะไรบ้าง
export function kalayogOfDay(y, m, d) {
  const cs = chulaYear(y, m, d);
  const k = kalayog(cs);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const tags = [];
  if (k.thongchai === wd) tags.push({ id: 'thongchai', name: 'วันธงชัย', good: true, use: 'สิ่งของ สถานที่' });
  if (k.athibodi === wd) tags.push({ id: 'athibodi', name: 'วันอธิบดี', good: true, use: 'บุคคล อำนาจ' });
  if (k.ubat === wd) tags.push({ id: 'ubat', name: 'วันอุบาทว์', good: false, use: 'บุคคล' });
  if (k.lokawinat === wd) tags.push({ id: 'lokawinat', name: 'วันโลกาวินาศ', good: false, use: 'สิ่งของ สถานที่' });
  const edge = m === 4 && d >= 14 && d <= 17;
  return { cs, tags, edge };
}
