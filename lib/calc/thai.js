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
