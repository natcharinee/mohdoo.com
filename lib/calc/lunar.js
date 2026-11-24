// ===== ปฏิทินจันทรคติไทย (ขึ้น/แรม ค่ำ เดือน · วันพระ) =====
// หลักแบบปฏิทินหลวง: เดือนคี่ 29 วัน (ขึ้น 15 · แรม 14) เดือนคู่ 30 วัน (ขึ้น 15 · แรม 15)
//   · ปกติมาส 354 วัน · อธิกวาร 355 วัน (เดือน 7 มี 30 วัน) · อธิกมาส 384 วัน (มีเดือน 8 สองหน 30 วันทั้งคู่)
// ชนิดปีอ้างอิงผลคำนวณของ อ.ลอย ชุนพงษ์ทอง (สดร. 2550) ตามที่ bhaddacak/thaiholydays สรุปไว้:
//   อธิกมาสตามวัฏจักรเมตอน 19 ปี เว้นปีที่ระบุไว้ใน EXCEPT · อธิกวารเป็นรายการปีตายตัว
// "ปีจันทรคติ" ในไฟล์นี้นับเป็น ค.ศ. ของปีที่เดือนอ้ายส่วนใหญ่ตกอยู่ (เดือนอ้ายเริ่มราว ธ.ค. ของปีก่อน)
// ใช้ได้ตั้งแต่ 24 พ.ย. 1927 ถึงปลายปีจันทรคติ 2129 · นอกช่วงนี้คืนค่า null (ให้ใช้ค่าประมาณทางดาราศาสตร์แทน)
// ตรวจเทียบวันมาฆะ วิสาขะ อาสาฬหะ ลอยกระทงที่ประกาศจริงแล้ว ปี 2010–2027 (tests/lunar.test.mjs) · ปีก่อน 2007 ยังไม่ได้สุ่มตรวจ
// ปฏิทินที่พิมพ์ขายบางเจ้าอาจต่างไป 1 วันในบางปี ถ้าสำนักพระราชวังประกาศต่าง ให้แก้ EXCEPT / EXTRA_DAY

const BASE = Date.UTC(1927, 10, 24); // ขึ้น 1 ค่ำ เดือนอ้าย ปีจันทรคติ 1928 (1 ธ.ค. 1927 = ขึ้น 8 ค่ำ)
const FIRST = 1928, LAST = 2129;
const EM_METONIC = [0, 3, 6, 8, 11, 14, 17]; // (ปี − 1) mod 19
// 2012 (พ.ศ. 2555) สำนักพระราชวังประกาศเป็นอธิกมาส แทนปี 2013 ตามวัฏจักร (มาฆะ 7 มี.ค. · วิสาขะ 4 มิ.ย. 2555)
const EXCEPT = { 2012: 384, 2013: 354, 2050: 384, 2051: 354, 2069: 384, 2070: 354, 2088: 384, 2089: 354, 2107: 384, 2108: 354, 2126: 384, 2127: 354 };
const EXTRA_DAY = new Set([1929, 1933, 1936, 1943, 1949, 1952, 1957, 1963, 1970, 1973, 1979, 1987, 1990, 1997, 2000, 2005, 2009,
  2016, 2020, 2025, 2031, 2036, 2041, 2046, 2052, 2057, 2062, 2066, 2073, 2077, 2082, 2087, 2093, 2098, 2103, 2109, 2114, 2119, 2123, 2128]);
const DAY = 86400000;

export const MONTH_TH = ['', 'อ้าย', 'ยี่', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า', 'สิบ', 'สิบเอ็ด', 'สิบสอง'];

export function yearLength(y) {
  if (EXCEPT[y]) return EXCEPT[y];
  if (EXTRA_DAY.has(y)) return 355;
  return EM_METONIC.includes((y - 1) % 19) ? 384 : 354;
}
export const yearType = (y) => ({ 354: 'ปกติมาส', 355: 'อธิกวาร', 384: 'อธิกมาส' })[yearLength(y)];

// เดือนของปีนั้นตามลำดับ: { m, second (เดือน 8 หลัง), len }
export function monthsOf(y) {
  const L = yearLength(y), out = [];
  for (let m = 1; m <= 12; m++) {
    out.push({ m, second: false, len: m === 7 && L === 355 ? 30 : m % 2 ? 29 : 30 });
    if (m === 8 && L === 384) out.push({ m: 8, second: true, len: 30 });
  }
  return out;
}

let starts = null; // วันแรกของแต่ละปีจันทรคติ (ms)
function yearStarts() {
  if (starts) return starts;
  starts = {};
  let t = BASE;
  for (let y = FIRST; y <= LAST; y++) { starts[y] = t; t += yearLength(y) * DAY; }
  starts[LAST + 1] = t;
  return starts;
}

const monthName = (mo) => `เดือน${MONTH_TH[mo.m]}${mo.second ? 'หลัง' : ''}`;

// วันที่ตามปฏิทินสากล (ปี เดือน วัน) → วันจันทรคติไทย หรือ null ถ้าอยู่นอกช่วงที่มีข้อมูล
export function thaiLunar(y, m, d) {
  if (y > 2400) y -= 543;
  const t = Date.UTC(y, m - 1, d), S = yearStarts();
  if (t < S[FIRST] || t >= S[LAST + 1]) return null;
  let ly = t >= S[y + 1] ? y + 1 : t >= S[y] ? y : y - 1;
  let rest = Math.round((t - S[ly]) / DAY);
  for (const mo of monthsOf(ly)) {
    if (rest < mo.len) {
      const day = rest + 1, waxing = day <= 15, n = waxing ? day : day - 15;
      const half = waxing ? 15 : mo.len - 15; // วันสุดท้ายของข้างแรมคือ 14 หรือ 15 ค่ำ
      const wanPhra = n === 8 || n === half ? (n === 8 ? (waxing ? 'ขึ้น 8 ค่ำ' : 'แรม 8 ค่ำ') : waxing ? 'วันเพ็ญ' : 'วันเดือนดับ') : null;
      return {
        lunarYear: ly, yearType: yearType(ly), month: mo.m, second: mo.second, monthLen: mo.len,
        day, waxing, n, wanPhra,
        tithi: waxing ? n : 15 + n + (mo.len === 29 && n === 14 ? 1 : 0), // 1–30 (วันแรมสุดท้ายนับเป็น 30 เสมอ)
        text: `${waxing ? 'ขึ้น' : 'แรม'} ${n} ค่ำ ${monthName(mo)}`,
      };
    }
    rest -= mo.len;
  }
  return null;
}

// หาวันสากลของ (ขึ้น/แรม n ค่ำ เดือน m) ในปีจันทรคติ ly · second = เดือน 8 หลัง
export function fromThaiLunar(ly, m, waxing, n, second = false) {
  const S = yearStarts();
  if (!(ly >= FIRST && ly <= LAST)) return null;
  let off = 0;
  for (const mo of monthsOf(ly)) {
    if (mo.m === m && mo.second === second) {
      const day = waxing ? n : 15 + n;
      if (day < 1 || day > mo.len) return null;
      return new Date(S[ly] + (off + day - 1) * DAY).toISOString().slice(0, 10);
    }
    off += mo.len;
  }
  return null;
}

// วันสำคัญทางพุทธ (ปีอธิกมาสเลื่อนไป 1 เดือน: มาฆะเดือน 4 · วิสาขะเดือน 7 · อาสาฬหะเดือน 8 หลัง)
export function buddhistHolidays(ly) {
  const em = yearLength(ly) === 384;
  return {
    makha: fromThaiLunar(ly, em ? 4 : 3, true, 15),
    visakha: fromThaiLunar(ly, em ? 7 : 6, true, 15),
    asalha: fromThaiLunar(ly, 8, true, 15, em),
    khaoPhansa: fromThaiLunar(ly, 8, false, 1, em),
    okPhansa: fromThaiLunar(ly, 11, true, 15),
    loyKrathong: fromThaiLunar(ly, 12, true, 15),
  };
}
