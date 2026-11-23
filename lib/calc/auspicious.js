// ===== หาฤกษ์: ไล่ทุกวันในช่วงที่ลูกค้าสะดวก แล้วจัดอันดับวันดี =====
// หลักที่ใช้ (คำนวณได้แน่นอน ไม่ให้ AI เดา):
//   · 建除十二值 (สิบสองตำแหน่งประจำวัน) จากกิ่งเดือนตามสารทจีน + กิ่งวัน
//   · 黄道 / 黑道 (วันเทพมงคล / วันเทพร้าย) จากกิ่งเดือน + กิ่งวัน
//   · วันชงกับปีเกิดของทุกคนที่เกี่ยวข้อง → ตัดทิ้ง
//   · ทักษาของวัน (ดาววันนั้นตกทักษาอะไรของแต่ละคน)
//   · ข้างขึ้น / ข้างแรม (คำนวณทางดาราศาสตร์ อาจต่างจากปฏิทินหลวงได้ 1 วัน)
//   · กาลโยคไทยประจำปี: วันธงชัย อธิบดี (ดี) · วันอุบาทว์ โลกาวินาศ (ร้าย) จากจุลศักราช
import { julianDay, sunLongitude, moonLongitude, norm } from './astro.js';
import { chineseYear, yearPillar, monthPillar, dayPillar, BRANCHES, ANIMAL_TH } from './chinese.js';
import { computeChart } from './chart.js';
import { DAY_TH, kalayogOfDay } from './thai.js';

const OFFICERS = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'];
const OFFICER_TH = { 建: 'เจี้ยน', 除: 'ฉู', 满: 'หม่าน', 平: 'ผิง', 定: 'ติ้ง', 执: 'จื๋อ', 破: 'พั่ว', 危: 'เวย', 成: 'เฉิง', 收: 'โซว', 开: 'ไค', 闭: 'ปี้' };
// 建满平收黑 · 除危定执黄 · 成开皆可用 · 闭破不相当
const OFFICER_W = { 除: 1, 危: 1, 定: 1, 执: 1, 成: 1, 开: 1, 建: -0.5, 满: -0.5, 平: -0.5, 收: -0.5, 破: -1.5, 闭: -1.5 };
const GODS = ['青龙', '明堂', '天刑', '朱雀', '金匮', '天德', '白虎', '玉堂', '天牢', '玄武', '司命', '勾陈'];
const YELLOW = [0, 1, 4, 5, 7, 10];
const ROLE_W = { ศรี: 1, เดช: 1, มนตรี: 1, อายุ: 0.3, บริวาร: 0.3, อุตสาหะ: 0.3, มูละ: 0, กาลกิณี: -1.5 };
const DAY_PLANET = [1, 2, 3, 4, 5, 6, 7];
const MONGKOL = /แต่ง|บ้าน|ร้าน|ธุรกิจ|เปิด|บวช|หมั้น|ขึ้น/;
const TZ = 7 * 3600e3;

function parseDate(s) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(s || ''));
  if (!m) return null;
  let y = +m[1]; if (y > 2400) y -= 543;
  return Date.UTC(y, +m[2] - 1, +m[3]);
}

// ข้อมูลของวันหนึ่งวัน (เวลาเที่ยงตามเวลาไทย)
export function dayInfo(utcMidnight) {
  const d = new Date(utcMidnight);
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, dd = d.getUTCDate();
  const jd = julianDay(utcMidnight + 12 * 3600e3 - TZ);
  const yp = yearPillar(chineseYear(jd, y));
  const mp = monthPillar(jd, yp.stem);
  const dp = dayPillar(y, m, dd);
  const officer = OFFICERS[(dp.branch - mp.branch + 12) % 12];
  const start = (8 + 2 * (mp.branch % 6)) % 12;
  const god = (dp.branch - start + 12) % 12;
  const elong = norm(moonLongitude(jd) - sunLongitude(jd));
  const tithi = Math.floor(elong / 12) + 1;
  return {
    date: `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`, weekday: d.getUTCDay(),
    dayPillar: dp, officer, god: GODS[god], yellow: YELLOW.includes(god),
    moon: tithi <= 15 ? `ขึ้น ${tithi} ค่ำ` : `แรม ${tithi - 15} ค่ำ`, waxing: tithi <= 15, tithi,
    kala: kalayogOfDay(y, m, dd),
  };
}

// people = [{ name, birthdate, birthtime, ... }] · event = ประเภทงาน
export function findAuspicious({ from, to, people = [], event = '' }, limit = 5) {
  let a = parseDate(from), b = parseDate(to);
  if (a == null || b == null) return null;
  if (b < a) [a, b] = [b, a];
  const maxDays = 120;
  const truncated = (b - a) / 86400000 + 1 > maxDays;
  if (truncated) b = a + (maxDays - 1) * 86400000;
  const charts = people.map((p) => ({ name: p.name || 'เจ้าชะตา', c: computeChart(p) })).filter((x) => x.c);
  const mongkol = MONGKOL.test(event);
  const days = [];
  for (let t = a; t <= b; t += 86400000) {
    const info = dayInfo(t);
    const reasons = [];
    let w = OFFICER_W[info.officer];
    reasons.push(`${info.officer} ${OFFICER_TH[info.officer]}${OFFICER_W[info.officer] > 0 ? ' (วันดี)' : OFFICER_W[info.officer] <= -1 ? ' (วันห้าม)' : ''}`);
    w += info.yellow ? 1 : -0.5;
    reasons.push(`${info.god} ${info.yellow ? 'วันเทพมงคล' : 'วันเทพร้าย'}`);
    // กาลโยคไทย: ธงชัย/อธิบดี +1 · อุบาทว์/โลกาวินาศ −1.5 (วันที่มีแต่ฝั่งร้ายถูกตัดออกจากอันดับ)
    const kt = info.kala.tags;
    kt.forEach((t) => { w += t.good ? 1 : -1.5; reasons.push(`${t.name}${t.good ? ' (+)' : ' (−)'}`); });
    const kalaBad = kt.length > 0 && kt.every((t) => !t.good);
    if (info.kala.edge && kt.length) reasons.push('ช่วงวันเถลิงศก ควรตรวจกาลโยคกับปฏิทินโหรอีกครั้ง');
    let clash = false;
    charts.forEach(({ name, c }) => {
      if ((c.chinese.year.branch + 6) % 12 === info.dayPillar.branch) { clash = true; reasons.push(`ชงกับปีเกิด${ANIMAL_TH[c.chinese.year.branch].split(' ')[0]}ของ${name}`); }
      const role = c.thai.taksa.find((r) => r.n === DAY_PLANET[info.weekday])?.role;
      if (role) { w += (ROLE_W[role] ?? 0) / Math.max(1, charts.length); reasons.push(`วัน${DAY_TH[info.weekday]}เป็น${role}ของ${name}`); }
    });
    if (clash) w -= 3;
    if (mongkol) { if (info.waxing) { w += 0.5; } else if (info.tithi >= 28) w -= 0.5; }
    reasons.push(info.moon);
    days.push({ ...info, w: Math.round(w * 10) / 10, clash, kalaBad, reasons });
  }
  const ranked = days.filter((d) => !d.clash && !d.kalaBad && OFFICER_W[d.officer] > -1).sort((x, y) => y.w - x.w || x.date.localeCompare(y.date));
  const best = ranked.slice(0, limit);
  const top = best[0];
  const score = !top ? 2 : top.w >= 3 ? 5 : top.w >= 2 ? 4 : top.w >= 1 ? 3 : 2;
  return { days: days.length, truncated, best, avoid: days.filter((d) => d.clash || d.kalaBad || OFFICER_W[d.officer] <= -1).length, score, people: charts.map((x) => x.name) };
}

const thDate = (s) => new Date(`${s}T00:00:00Z`).toLocaleDateString('th-TH', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export function auspiciousText(r, event) {
  if (!r) return '';
  if (!r.best.length) return `หาฤกษ์${event ? ` (${event})` : ''}: ในช่วงที่เลือก (${r.days} วัน) ไม่มีวันที่ผ่านเกณฑ์ ควรขยายช่วงวัน`;
  return [`หาฤกษ์${event ? ` งาน${event}` : ''} (ระบบคำนวณแล้ว ห้ามเปลี่ยนวันที่หรือคำนวณใหม่) · ดู ${r.days} วัน${r.truncated ? ' (ตัดที่ 120 วันแรก)' : ''} · สำหรับ ${r.people.join(', ') || 'ไม่ระบุวันเกิด'} · วันที่ควรเลี่ยง ${r.avoid} วัน`,
    ...r.best.map((d, i) => `${i + 1}. ${thDate(d.date)} (${d.dayPillar.text}) คะแนน ${d.w}: ${d.reasons.join(' · ')}`),
    'หมายเหตุ: ข้างขึ้นข้างแรมคำนวณทางดาราศาสตร์ อาจต่างจากปฏิทินหลวง 1 วัน · วันธงชัยใช้กับสิ่งของ/สถานที่ วันอธิบดีใช้กับบุคคล',
  ].join('\n');
}
