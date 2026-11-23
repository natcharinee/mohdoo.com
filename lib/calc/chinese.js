// ===== ดวงจีน: ปีนักษัตร (ตัดที่ลี่ชุน) · แปดอักษร (八字) · ห้าธาตุ · ปีชง =====
import { julianDay, sunLongitude, sunReaches, norm } from './astro.js';

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const ANIMAL_TH = ['ชวด (หนู)', 'ฉลู (วัว)', 'ขาล (เสือ)', 'เถาะ (กระต่าย)', 'มะโรง (งูใหญ่)', 'มะเส็ง (งูเล็ก)',
  'มะเมีย (ม้า)', 'มะแม (แพะ)', 'วอก (ลิง)', 'ระกา (ไก่)', 'จอ (หมา)', 'กุน (หมู)'];
const STEM_EL = ['ไม้', 'ไม้', 'ไฟ', 'ไฟ', 'ดิน', 'ดิน', 'ทอง', 'ทอง', 'น้ำ', 'น้ำ'];
const BRANCH_EL = ['น้ำ', 'ดิน', 'ไม้', 'ไม้', 'ดิน', 'ไฟ', 'ไฟ', 'ดิน', 'ทอง', 'ทอง', 'ดิน', 'น้ำ'];
const ELEMENTS = ['ไม้', 'ไฟ', 'ดิน', 'ทอง', 'น้ำ'];

const pillar = (stem, branch) => ({
  stem, branch,
  text: `${STEMS[stem]}${BRANCHES[branch]}`,
  element: `${STEM_EL[stem]}${stem % 2 ? 'หยิน' : 'หยาง'}`,
  animal: ANIMAL_TH[branch],
});

// เวลาลี่ชุน (立春 ดวงอาทิตย์ 315°) ของปีสากล y เป็น JD
export const lichunJD = (y) => sunReaches(315, julianDay(Date.UTC(y, 1, 4)));

// ปีจีนตามลี่ชุน: เกิดก่อนลี่ชุนนับเป็นปีก่อนหน้า
export function chineseYear(jd, gregYear) {
  return jd < lichunJD(gregYear) ? gregYear - 1 : gregYear;
}

export function yearPillar(cy) {
  const i = (((cy - 1984) % 60) + 60) % 60; // 1984 = 甲子
  return pillar(i % 10, i % 12);
}

// เสาเดือน: ตัดตามสารทจีน (ดวงอาทิตย์ทุก 30° เริ่มที่ 315° = เดือน寅)
export function monthPillar(jd, yearStem) {
  const m = Math.floor(norm(sunLongitude(jd) - 315) / 30); // 0 = 寅
  return pillar((((yearStem % 5) * 2 + 2 + m) % 10), (m + 2) % 12);
}

// เสาวัน: จากเลขวันจูเลียนของวันตามปฏิทิน (2000-01-01 = 戊午)
export function dayPillar(y, m, d) {
  const jdn = Math.round(Date.UTC(y, m - 1, d) / 86400000 + 2440587.5 + 0.5);
  const i = (jdn + 49) % 60;
  return pillar(i % 10, i % 12);
}

export function hourPillar(hour, dayStem) {
  const b = Math.floor((hour + 1) / 2) % 12;
  return pillar((((dayStem % 5) * 2 + b) % 10), b);
}

// ความสัมพันธ์ระหว่างนักษัตร (ใช้ดูปีชง): ชง 冲 · เฮ้ง 刑 · ไห่ 害 · ผั่ว 破
const HARM = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
const BREAK = [[0, 9], [3, 6], [4, 1], [7, 10], [2, 11], [5, 8]];
const PUNISH_GROUPS = [[0, 3], [2, 5, 8], [1, 10, 7]];
const SELF_PUNISH = [4, 6, 9, 11];
const pairIn = (list, a, b) => list.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

export function relations(personBranch, yearBranch) {
  const out = [];
  if ((personBranch + 6) % 12 === yearBranch) out.push('ชง (冲 ปะทะตรง)');
  if (personBranch === yearBranch && SELF_PUNISH.includes(personBranch)) out.push('เฮ้ง (刑 ปีนักษัตรตัวเอง)');
  if (personBranch !== yearBranch && PUNISH_GROUPS.some((g) => g.includes(personBranch) && g.includes(yearBranch))) out.push('เฮ้ง (刑)');
  if (pairIn(HARM, personBranch, yearBranch)) out.push('ไห่ (害)');
  if (pairIn(BREAK, personBranch, yearBranch)) out.push('ผั่ว (破)');
  if (personBranch === yearBranch && !SELF_PUNISH.includes(personBranch)) out.push('ปีนักษัตรตัวเอง (本命年)');
  return out;
}

// นับธาตุจากอักษรทั้งหมดในแปดอักษร (ก้านฟ้า + กิ่งดิน ตามธาตุหลัก)
export function elementCount(pillars) {
  const count = Object.fromEntries(ELEMENTS.map((e) => [e, 0]));
  pillars.filter(Boolean).forEach((p) => { count[STEM_EL[p.stem]]++; count[BRANCH_EL[p.branch]]++; });
  return count;
}

// ---------- สิบเทพ (十神): ความสัมพันธ์ของก้านฟ้าแต่ละตัวกับธาตุประจำตัว (ก้านวัน) ----------
// ธาตุ: 0 ไม้ 1 ไฟ 2 ดิน 3 ทอง 4 น้ำ · ก้านคู่ = หยาง ก้านคี่ = หยิน
const stemEl = (s) => Math.floor(s / 2);
const TEN_GOD = {
  same: ['比肩 เพื่อนร่วมทาง', '劫财 คู่แข่งชิงทรัพย์'],
  output: ['食神 ความคิดสร้างสรรค์', '伤官 ความสามารถโดดเด่นแต่ขัดกฎ'],
  wealth: ['偏财 ลาภลอย ทรัพย์จากโอกาส', '正财 ทรัพย์จากงานประจำ'],
  officer: ['七杀 อำนาจกดดัน ความท้าทาย', '正官 ยศตำแหน่ง ระเบียบ'],
  resource: ['偏印 ความรู้นอกกรอบ', '正印 ผู้อุปถัมภ์ การเรียน'],
};
export function tenGod(dayStem, stem) {
  const d = stemEl(dayStem), o = stemEl(stem);
  const samePol = dayStem % 2 === stem % 2 ? 0 : 1;
  const rel = o === d ? 'same' : o === (d + 1) % 5 ? 'output' : o === (d + 2) % 5 ? 'wealth' : o === (d + 3) % 5 ? 'officer' : 'resource';
  return TEN_GOD[rel][samePol];
}

// ---------- วัยจร (大运): เสาละ 10 ปี เดินหน้าหรือถอยหลังจากเสาเดือน ----------
// ชายเกิดปีหยาง / หญิงเกิดปีหยิน → เดินหน้า · กรณีอื่นถอยหลัง
// อายุเริ่มจร = จำนวนวันจากวันเกิดถึงสารทเปลี่ยนเดือน (节) ถัดไป/ก่อนหน้า ÷ 3 (3 วัน = 1 ปี)
const idx60 = (s, b) => { for (let i = 0; i < 60; i++) if (i % 10 === s && i % 12 === b) return i; return 0; };
export function luckPillars(jd, yearStem, monthP, male, birthYear, count = 8) {
  const forward = (yearStem % 2 === 0) === !!male;
  const L = sunLongitude(jd);
  const k = Math.floor(norm(L - 315) / 30);
  const target = norm(315 + 30 * (forward ? k + 1 : k));
  const jdTerm = sunReaches(target, jd + (forward ? 15 : -15));
  const days = Math.abs(jdTerm - jd);
  const startAge = Math.round((days / 3) * 10) / 10; // ปี (ทศนิยม 1 ตำแหน่ง)
  const base = idx60(monthP.stem, monthP.branch);
  const out = [];
  for (let n = 1; n <= count; n++) {
    const i = (((base + (forward ? n : -n)) % 60) + 60) % 60;
    const from = startAge + (n - 1) * 10;
    out.push({ ...pillar(i % 10, i % 12), fromAge: Math.floor(from), toAge: Math.floor(from) + 9, fromYear: birthYear + Math.floor(from) });
  }
  return { forward, startAge, pillars: out };
}
