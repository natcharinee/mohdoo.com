// ===== อี้จิง (易經): 64 ฉบับ · โยนเหรียญ 3 เหรียญ 6 ครั้ง · เส้นเปลี่ยน =====
// ลำดับและโครงสร้างฉบับตามลำดับพระเจ้าเหวิน (King Wen) · ความหมายภาษาไทยเรียบเรียงใหม่โดยสรุป
// อ้างอิงคัมภีร์ฉบับแปลของ James Legge, Sacred Books of the East vol. 16 (1899) ซึ่งหมดลิขสิทธิ์แล้ว
//   (ใช้ข้อความจาก Wikisource หรือสแกนบน archive.org · ไฟล์บน sacred-texts.com มีเงื่อนไขห้ามใช้เชิงพาณิชย์)
// ⚠️ ความหมายและระดับ (lv) เป็นร่าง ควรให้ผู้รู้อี้จิงตรวจก่อนใช้จริง
import { ICHING_DATA } from './data/iching-data.js';
import { kbRows, kbReviewed } from './kb.js';

// ไตรลักษณ์ (八卦): เส้นจากล่างขึ้นบน 1 = หยาง 0 = หยิน
const TRI = {
  乾: { bits: '111', th: 'ฟ้า' }, 兌: { bits: '110', th: 'บึง' }, 離: { bits: '101', th: 'ไฟ' }, 震: { bits: '100', th: 'ฟ้าร้อง' },
  巽: { bits: '011', th: 'ลม' }, 坎: { bits: '010', th: 'น้ำ' }, 艮: { bits: '001', th: 'ภูเขา' }, 坤: { bits: '000', th: 'ดิน' },
};

// โครงสร้างจาก data (ล็อก) + ชื่อไทย ระดับ ความหมาย จากตำราดูดวงล่าสุด (kb)
export function hexagrams() {
  const edit = Object.fromEntries(kbRows('iching').map((r) => [r.n, r]));
  return ICHING_DATA.map(([n, zh, th, up, lo, lv, mean]) => {
    const e = edit[n] || {};
    return { n, zh, th: e.th || th, upper: up, lower: lo, lv: e.lv || lv, mean: e.mean || mean, bits: TRI[lo].bits + TRI[up].bits };
  });
}
const byBits = () => Object.fromEntries(hexagrams().map((h) => [h.bits, h]));

// สุ่มแบบกำหนดค่าเริ่มต้นได้ (seed เดิม = ผลเดิม · ใช้กับการเปิดใบซ้ำ)
function rng(seedStr) {
  let h = 2166136261;
  for (const c of String(seedStr)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// โยนเหรียญ 3 เหรียญ 6 ครั้ง (หัว = 3 ก้อย = 2) · 6 = หยินเปลี่ยน · 7 = หยาง · 8 = หยิน · 9 = หยางเปลี่ยน
export function castCoins(seed) {
  const r = rng(seed);
  const lines = Array.from({ length: 6 }, () => [0, 0, 0].reduce((s) => s + (r() < 0.5 ? 3 : 2), 0));
  return reading(lines);
}

export function reading(lines) {
  const primaryBits = lines.map((v) => (v === 7 || v === 9 ? '1' : '0')).join('');
  const changing = lines.map((v, i) => (v === 6 || v === 9 ? i + 1 : 0)).filter(Boolean);
  const relatingBits = lines.map((v) => (v === 9 ? '0' : v === 6 ? '1' : v === 7 ? '1' : '0')).join('');
  const B = byBits();
  return { lines, primary: B[primaryBits], changing, relating: changing.length ? B[relatingBits] : null };
}

const lineName = (i) => ['เส้นที่ 1 (ล่างสุด)', 'เส้นที่ 2', 'เส้นที่ 3', 'เส้นที่ 4', 'เส้นที่ 5', 'เส้นที่ 6 (บนสุด)'][i - 1];

export function ichingText(r) {
  if (!r) return '';
  const p = r.primary;
  const draw = r.lines.map((v) => (v === 7 || v === 9 ? '━━━' : '━ ━') + (v === 6 || v === 9 ? '○' : '')).reverse().join(' / ');
  const out = [
    `อี้จิง (ระบบโยนเหรียญ 3 เหรียญ 6 ครั้งให้แล้ว ห้ามเปลี่ยนฉบับ): ได้ฉบับที่ ${p.n} ${p.zh} ${p.th} — ${TRI[p.upper].th}อยู่บน ${TRI[p.lower].th}อยู่ล่าง`,
    `เส้น (บนลงล่าง): ${draw}`,
    `ความหมาย: ${p.mean}`,
  ];
  if (r.relating) out.push(`เส้นเปลี่ยน: ${r.changing.map(lineName).join(', ')} → ฉบับที่ ${r.relating.n} ${r.relating.zh} ${r.relating.th}: ${r.relating.mean} (แสดงทิศทางที่เรื่องจะคลี่คลายไป)`);
  else out.push('ไม่มีเส้นเปลี่ยน: สถานการณ์ค่อนข้างคงที่ ให้อ่านจากฉบับหลักเป็นสำคัญ');
  if (!kbReviewed('iching')) out.push('(ความหมายเป็นฉบับสรุปภาษาไทย อ้างอิงคัมภีร์ฉบับแปลของ Legge)');
  return out.join('\n');
}

export function ichingScore(r) {
  if (!r) return 3;
  const s = r.relating ? Math.round(r.primary.lv * 0.6 + r.relating.lv * 0.4) : r.primary.lv;
  return Math.max(2, Math.min(5, s));
}
