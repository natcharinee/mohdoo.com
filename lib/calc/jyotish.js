// ===== โชติษะ (โหราศาสตร์อินเดีย): นักษัตร 27 · ทศาวิมโศตตรี (Vimshottari Dasha 120 ปี) =====
// ใช้ตำแหน่งดวงจันทร์แบบนิรายนะ (อายนางศ์ลาหิรี) จาก astro.js · ดวงจันทร์คลาด ~0.3° จึงเตือนเมื่อใกล้รอยต่อนักษัตร
import { moonLongitude, ayanamsaLahiri, norm } from './astro.js';

export const NAKSHATRA = ['อัศวินี', 'ภรณี', 'กฤติกา', 'โรหิณี', 'มฤคศิรา', 'อารทรา', 'ปุนรวสุ', 'ปุษยะ', 'อาศเลษา',
  'มฆา', 'บูรพผลคุนี', 'อุตรผลคุนี', 'หัสตะ', 'จิตรา', 'สวาตี', 'วิศาขา', 'อนุราธา', 'เชษฐา',
  'มูละ', 'บูรพอาษาฒ', 'อุตรอาษาฒ', 'ศรวณะ', 'ธนิษฐา', 'ศตภิษัช', 'บูรพภัทรบท', 'อุตรภัทรบท', 'เรวดี'];
// เจ้าทศาเรียงตามลำดับ เริ่มที่นักษัตรอัศวินี = เกตุ
const LORDS = [['เกตุ', 7], ['ศุกร์', 20], ['อาทิตย์', 6], ['จันทร์', 10], ['อังคาร', 7], ['ราหู', 18], ['พฤหัสบดี', 16], ['เสาร์', 19], ['พุธ', 17]];
const SPAN = 360 / 27;
const YEAR_MS = 365.25 * 86400000;

// jd = เวลาเกิด (UTC) · birthMs = เวลาเกิดเป็น ms · nowMs = ตอนนี้
export function jyotish(jd, birthMs, nowMs = Date.now()) {
  const moon = norm(moonLongitude(jd) - ayanamsaLahiri(jd));
  const n = Math.floor(moon / SPAN);
  const within = (moon - n * SPAN) / SPAN; // ผ่านนักษัตรไปแล้วกี่ส่วน
  const pada = Math.floor(within * 4) + 1;
  const first = n % 9;
  // ทศาแรกเหลือเท่าที่ยังไม่ผ่าน
  const periods = [];
  let t = birthMs;
  for (let i = 0; i < 9; i++) {
    const [lord, yrs] = LORDS[(first + i) % 9];
    const len = i === 0 ? yrs * (1 - within) : yrs;
    periods.push({ lord, from: t, to: t + len * YEAR_MS });
    t += len * YEAR_MS;
  }
  const cur = periods.find((p) => nowMs >= p.from && nowMs < p.to) || null;
  // อันตรทศา (ทศาย่อย) ของทศาปัจจุบัน: แบ่งตามสัดส่วนปีของเจ้าทศา เริ่มจากเจ้าทศาหลัก
  let sub = null;
  if (cur) {
    const ci = LORDS.findIndex(([l]) => l === cur.lord);
    const full = LORDS[ci][1] * YEAR_MS;
    // ทศาแรกอาจเริ่มกลางคัน: นับย้อนไปหาจุดเริ่มเต็มของทศานั้น
    let s = cur.to - full;
    for (let i = 0; i < 9; i++) {
      const [lord, yrs] = LORDS[(ci + i) % 9];
      const len = (full * yrs) / 120;
      if (nowMs >= s && nowMs < s + len) { sub = { lord, from: s, to: s + len }; break; }
      s += len;
    }
  }
  const near = within < 0.03 || within > 0.97;
  return {
    nakshatra: NAKSHATRA[n], index: n + 1, pada, lord: LORDS[first][0],
    periods, current: cur, sub,
    note: near ? 'ดวงจันทร์อยู่ใกล้รอยต่อนักษัตร นักษัตรและทศาอาจคลาด ควรใช้เวลาเกิดที่แม่นยำ' : '',
  };
}
