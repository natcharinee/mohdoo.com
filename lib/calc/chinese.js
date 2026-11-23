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
