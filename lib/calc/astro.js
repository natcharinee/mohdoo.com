// ===== คำนวณดาราศาสตร์พื้นฐาน (ไม่พึ่งไลบรารีภายนอก) =====
// สูตรจาก Jean Meeus, "Astronomical Algorithms" (ฉบับความแม่นยำต่ำ)
// ความคลาดเคลื่อนโดยประมาณ: ดวงอาทิตย์ ~0.01° · ดวงจันทร์ ~0.3° · ลัคนาขึ้นกับความแม่นของเวลาเกิดเป็นหลัก
// ถ้าต่อไปติดตั้งแพ็กเกจได้ เปลี่ยนไปใช้ astronomy-engine (MIT) แทนไฟล์นี้ได้ โดยคงชื่อฟังก์ชันเดิมไว้

const D2R = Math.PI / 180;
const sin = (d) => Math.sin(d * D2R);
const cos = (d) => Math.cos(d * D2R);
export const norm = (x) => ((x % 360) + 360) % 360;

export const julianDay = (utcMs) => utcMs / 86400000 + 2440587.5;
const centuries = (jd) => (jd - 2451545) / 36525;

// ลองจิจูดสุริยวิถีปรากฏของดวงอาทิตย์ (สายนะ / tropical)
export function sunLongitude(jd) {
  const T = centuries(jd);
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M)
    + (0.019993 - 0.000101 * T) * sin(2 * M)
    + 0.000289 * sin(3 * M);
  const omega = 125.04 - 1934.136 * T;
  return norm(L0 + C - 0.00569 - 0.00478 * sin(omega));
}

// ลองจิจูดดวงจันทร์ (สายนะ) · ความแม่น ~0.3°
export function moonLongitude(jd) {
  const T = centuries(jd);
  return norm(218.32 + 481267.881 * T
    + 6.29 * sin(135.0 + 477198.87 * T)
    - 1.27 * sin(259.3 - 413335.36 * T)
    + 0.66 * sin(235.7 + 890534.22 * T)
    + 0.21 * sin(269.9 + 954397.74 * T)
    - 0.19 * sin(357.5 + 35999.05 * T)
    - 0.11 * sin(186.5 + 966404.03 * T));
}

// หาเวลา (JD) ที่ดวงอาทิตย์เดินถึงองศา target ใกล้กับ jdGuess (ใช้หาลี่ชุน/สารทจีน)
export function sunReaches(target, jdGuess) {
  let jd = jdGuess;
  for (let i = 0; i < 30; i++) {
    let d = norm(target - sunLongitude(jd));
    if (d > 180) d -= 360;
    jd += d / 0.9856;
    if (Math.abs(d) < 1e-7) break;
  }
  return jd;
}

// ลัคนา (สายนะ) จากเวลา UTC และพิกัดสถานที่เกิด
export function ascendant(jd, lat, lon) {
  const T = centuries(jd);
  const gmst = 280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T;
  const ramc = norm(gmst + lon);
  const eps = 23.439291 - 0.0130042 * T;
  const asc = Math.atan2(cos(ramc), -(sin(ramc) * cos(eps) + Math.tan(lat * D2R) * sin(eps))) / D2R;
  return norm(asc);
}

// อายนางศ์ลาหิรีโดยประมาณ (ใช้แปลงสายนะ → นิรายนะ)
// หมายเหตุ: คัมภีร์สุริยยาตรของโหรไทยสายดั้งเดิมให้ค่าต่างจากนี้ได้ราว 1° ให้โหรของทีมเลือกสำนักที่ใช้
export const ayanamsaLahiri = (jd) => 23.853 + ((jd - 2451545) / 365.25) * 0.013969;
