// ===== รวมผลคำนวณดวงจากข้อมูลเกิด → ข้อความสำหรับส่งให้แม่หมอ AI =====
// ใช้: import { chartText } from './_lib/calc/chart.js'; chartText(profile)
// ผลคำนวณเป็นค่าคงที่ต่อคน (ข้อมูลเกิดเดิม = ผลเดิมทุกครั้ง) AI มีหน้าที่ตีความเท่านั้น ห้ามคำนวณเอง
import { julianDay, sunLongitude, moonLongitude, ascendant, ayanamsaLahiri, norm } from './astro.js';
import { chineseYear, yearPillar, monthPillar, dayPillar, hourPillar, relations, elementCount, lichunJD, ANIMAL_TH } from './chinese.js';
import { thaiBirthDay, taksa, planetInfo, lifePath, DAY_TH } from './thai.js';

const TZ = 7; // เวลาประเทศไทย UTC+7 (ใช้มาตั้งแต่ พ.ศ. 2463)
const SIGN_TH = ['เมษ', 'พฤษภ', 'มิถุน', 'กรกฎ', 'สิงห์', 'กันย์', 'ตุลย์', 'พิจิก', 'ธนู', 'มังกร', 'กุมภ์', 'มีน'];

// พิกัดเมืองหลัก (ไม่ตรงก็ใช้กรุงเทพฯ) · ลัคนาขึ้นกับลองจิจูด ต่างกัน 1° ≈ 4 นาที
const PLACES = [
  [['กรุงเทพ', 'bangkok', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ'], 13.756, 100.502],
  [['เชียงใหม่', 'chiang mai', 'ลำพูน'], 18.788, 98.985],
  [['เชียงราย', 'chiang rai'], 19.911, 99.841],
  [['พิษณุโลก'], 16.821, 100.266],
  [['ขอนแก่น', 'khon kaen'], 16.442, 102.836],
  [['อุดรธานี', 'udon'], 17.414, 102.787],
  [['นครราชสีมา', 'โคราช', 'korat'], 14.980, 102.098],
  [['อุบลราชธานี', 'ubon'], 15.229, 104.856],
  [['ชลบุรี', 'พัทยา', 'chonburi', 'pattaya'], 13.361, 100.985],
  [['สุราษฎร์ธานี', 'surat'], 9.138, 99.322],
  [['นครศรีธรรมราช'], 8.430, 99.963],
  [['ภูเก็ต', 'phuket'], 7.880, 98.392],
  [['สงขลา', 'หาดใหญ่', 'hat yai'], 7.009, 100.475],
];
function findPlace(text) {
  const t = String(text || '').toLowerCase();
  const hit = PLACES.find(([names]) => names.some((n) => t.includes(n)));
  return hit ? { lat: hit[1], lon: hit[2], name: hit[0][0], exact: true } : { lat: 13.756, lon: 100.502, name: 'กรุงเทพฯ', exact: false };
}

const sign = (lon) => SIGN_TH[Math.floor(norm(lon) / 30)];
const degIn = (lon) => (norm(lon) % 30);
const nearEdge = (lon, tol) => { const d = degIn(lon); return d < tol || d > 30 - tol; };
const fmtDeg = (lon) => `${sign(lon)} ${degIn(lon).toFixed(1)}°`;

function parseDate(s) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(s || '').trim());
  if (!m) return null;
  let y = +m[1]; const mo = +m[2], d = +m[3];
  if (y > 2400) y -= 543; // เผื่อกรอกเป็น พ.ศ.
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null;
  return { y, m: mo, d };
}
function parseTime(s) {
  const m = /^(\d{1,2})[:.](\d{2})/.exec(String(s || '').trim());
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return { h: +m[1], mi: +m[2] };
}
const localToJD = (y, m, d, h, mi) => julianDay(Date.UTC(y, m - 1, d, h, mi) - TZ * 3600e3);

export function computeChart(profile = {}, nowMs = Date.now()) {
  const date = parseDate(profile.birthdate);
  if (!date) return null;
  const time = parseTime(profile.birthtime);
  const place = findPlace(profile.birthplace);
  const { y, m, d } = date;
  const h = time ? time.h : 12, mi = time ? time.mi : 0;
  const jd = localToJD(y, m, d, h, mi);
  const jdStart = localToJD(y, m, d, 0, 0), jdEnd = localToJD(y, m, d, 23, 59);
  const notes = [];

  // ---- ดวงจีน ----
  const cy = chineseYear(jd, y);
  const yp = yearPillar(cy);
  const mp = monthPillar(jd, yp.stem);
  // 23:00 น. ขึ้นไปนับเป็นยามชวดของวันถัดไป (子初換日)
  const late = time && time.h === 23;
  const dd = late ? new Date(Date.UTC(y, m - 1, d + 1)) : new Date(Date.UTC(y, m - 1, d));
  const dp = dayPillar(dd.getUTCFullYear(), dd.getUTCMonth() + 1, dd.getUTCDate());
  const hp = time ? hourPillar(time.h, dp.stem) : null;
  if (!time && chineseYear(jdStart, y) !== chineseYear(jdEnd, y)) notes.push('เกิดวันลี่ชุนพอดี ปีนักษัตรจีนขึ้นกับเวลาเกิด ควรถามเวลาเกิด');
  if (!time && monthPillar(jdStart, yp.stem).text !== monthPillar(jdEnd, yp.stem).text) notes.push('เกิดวันเปลี่ยนสารทจีน เสาเดือนขึ้นกับเวลาเกิด');
  if (!time) notes.push('ไม่มีเวลาเกิด จึงไม่มีเสายามและลัคนา');
  // สูตรแม่นราว ±15 นาที · เกิดใกล้ลี่ชุนหรือรอยต่อสารทจีนให้เตือน
  if (time && Math.abs(jd - lichunJD(y)) < 0.03) notes.push('เกิดใกล้เวลาลี่ชุนมาก ปีนักษัตรจีนอาจคลาด ควรให้หมอดูตรวจซ้ำ');
  else if (time && nearEdge(sunLongitude(jd) - 315, 0.03)) notes.push('เกิดใกล้รอยต่อสารทจีน เสาเดือนอาจคลาด ควรให้หมอดูตรวจซ้ำ');

  // ---- ราศีและลัคนา ----
  const sunT = sunLongitude(jd), moonT = moonLongitude(jd);
  const ay = ayanamsaLahiri(jd);
  const ascT = time ? ascendant(jd, place.lat, place.lon) : null;
  if (!time && sign(moonLongitude(jdStart)) !== sign(moonLongitude(jdEnd))) notes.push('ดวงจันทร์ย้ายราศีในวันเกิด ราศีจันทร์ขึ้นกับเวลาเกิด');
  else if (nearEdge(moonT, 1) || nearEdge(moonT - ay, 1)) notes.push('ดวงจันทร์อยู่ใกล้รอยต่อราศี ราศีจันทร์อาจคลาดได้');
  if (ascT != null && (nearEdge(ascT, 3) || nearEdge(ascT - ay, 3))) notes.push('ลัคนาอยู่ใกล้รอยต่อราศี ถ้าเวลาเกิดคลาดเคลื่อนไม่กี่นาที ลัคนาอาจเปลี่ยน');
  if (time && !place.exact) notes.push(`ไม่พบพิกัดสถานที่เกิด "${String(profile.birthplace || '-').slice(0, 30)}" จึงคำนวณลัคนาด้วยพิกัดกรุงเทพฯ และเวลาไทย (ถ้าเกิดต่างประเทศ ลัคนาอาจไม่ถูก)`);

  // ---- ศาสตร์ไทย ----
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const td = thaiBirthDay(weekday, time ? time.h : NaN, time ? time.mi : 0);
  notes.push(...td.notes);

  // ---- วันนี้ (เวลาไทย) ----
  const now = new Date(nowMs + TZ * 3600e3);
  const ny = now.getUTCFullYear(), nm = now.getUTCMonth() + 1, nd = now.getUTCDate();
  const jdNow = julianDay(nowMs);
  const nowYP = yearPillar(chineseYear(jdNow, ny));
  const nowDP = dayPillar(ny, nm, nd);

  return {
    input: { date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, time: time ? `${String(time.h).padStart(2, '0')}:${String(time.mi).padStart(2, '0')}` : null, place: place.name },
    chinese: {
      animal: ANIMAL_TH[yp.branch], year: yp, month: mp, day: dp, hour: hp,
      dayMaster: dp.element, elements: elementCount([yp, mp, dp, hp]),
      lichun: new Date((lichunJD(y) - 2440587.5) * 86400000 + TZ * 3600e3).toISOString().slice(0, 16).replace('T', ' '),
    },
    western: { sun: fmtDeg(sunT), moon: fmtDeg(moonT), asc: ascT != null ? fmtDeg(ascT) : null },
    sidereal: { sun: fmtDeg(sunT - ay), moon: fmtDeg(moonT - ay), asc: ascT != null ? fmtDeg(ascT - ay) : null },
    thai: { ...td, taksa: taksa(td.planet), planetColor: planetInfo(td.planet).color },
    lifePath: lifePath(y, m, d),
    today: {
      date: `${ny}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`,
      weekday: DAY_TH[now.getUTCDay()],
      yearPillar: nowYP.text, yearAnimal: nowYP.animal, yearRelations: relations(yp.branch, nowYP.branch),
      dayPillar: nowDP.text, dayAnimal: nowDP.animal, dayRelations: relations(yp.branch, nowDP.branch),
      moon: fmtDeg(moonLongitude(jdNow)), moonSidereal: fmtDeg(moonLongitude(jdNow) - ayanamsaLahiri(jdNow)),
    },
    notes,
  };
}

// ข้อความสั้นสำหรับใส่ใน prompt
export function chartText(profile, nowMs) {
  let c;
  try { c = computeChart(profile, nowMs); } catch (_) { c = null; }
  if (!c) return '';
  const ch = c.chinese, t = c.thai, td = c.today;
  const pillars = [['ปี', ch.year], ['เดือน', ch.month], ['วัน', ch.day], ['ยาม', ch.hour]]
    .filter(([, p]) => p).map(([l, p]) => `${l} ${p.text} (${p.element} · ${p.animal.split(' ')[0]})`).join(' | ');
  const taksaLine = t.taksa.map((x) => `${x.role}=${x.planet}`).join(' ');
  const kala = t.taksa[7];
  return [
    `ผลคำนวณดวง (ระบบคำนวณด้วยสูตรดาราศาสตร์แล้ว ให้ใช้ตามนี้ ห้ามคำนวณใหม่):`,
    `- ข้อมูลที่ใช้: เกิด ${c.input.date}${c.input.time ? ` เวลา ${c.input.time} น.` : ' (ไม่ทราบเวลา)'} · สถานที่ ${c.input.place}`,
    `- โหราศาสตร์ไทย: เกิดวัน${t.calendarDay} · วันทางโหราศาสตร์ ${t.astroDay} · สีประจำดาววันเกิด ${t.planetColor}`,
    `- ทักษา: ${taksaLine} · สีกาลกิณี ${kala.color} · อักษรกาลกิณี ${kala.letters}`,
    `- ราศีแบบนิรายนะ (ไทย/อินเดีย, อายนางศ์ลาหิรี): อาทิตย์ ${c.sidereal.sun} · จันทร์ ${c.sidereal.moon}${c.sidereal.asc ? ` · ลัคนา ${c.sidereal.asc}` : ''}`,
    `- ราศีแบบสายนะ (ตะวันตก): อาทิตย์ ${c.western.sun} · จันทร์ ${c.western.moon}${c.western.asc ? ` · ลัคนา ${c.western.asc}` : ''}`,
    `- ดวงจีน: ปีนักษัตร${ch.animal} (ตัดปีที่ลี่ชุน) · แปดอักษร ${pillars}`,
    `- ธาตุประจำตัว (ก้านวัน): ${ch.dayMaster} · จำนวนธาตุในดวง: ${Object.entries(ch.elements).map(([k, v]) => `${k} ${v}`).join(' ')}`,
    `- เลขศาสตร์สากล: เลขเส้นทางชีวิต ${c.lifePath}`,
    `- วันนี้ ${td.date} (วัน${td.weekday}): ปีจีน ${td.yearPillar} ${td.yearAnimal}${td.yearRelations.length ? ` → กับปีเกิดเป็น ${td.yearRelations.join(', ')}` : ' → ไม่ชงกับปีเกิด'} · วันจีน ${td.dayPillar} ${td.dayAnimal}${td.dayRelations.length ? ` → ${td.dayRelations.join(', ')}` : ''} · ดวงจันทร์จร ${td.moonSidereal} (นิรายนะ)`,
    c.notes.length ? `- ข้อควรระวัง: ${c.notes.join(' · ')}` : '',
  ].filter(Boolean).join('\n');
}
