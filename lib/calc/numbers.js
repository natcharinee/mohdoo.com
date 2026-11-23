// ===== เลขศาสตร์: เบอร์โทร · ทะเบียนรถ · บ้านเลขที่ · เลขบัตร · ชื่อ =====
// ตารางคู่เลขและค่าตัวอักษรอ่านจากตำราดูดวง (kb.js) ซึ่งทีมแก้ได้ในหลังบ้าน → "ตำราดูดวง"
// คู่ที่ไม่มีในตาราง = กลาง ๆ (ไม่ให้ AI แต่งความหมายเพิ่ม)
import { kbMaps, kbReviewed, PAIR_LEVELS } from './kb.js';
import { planetOfLetter, taksa } from './thai.js';

export const pairsReviewed = () => kbReviewed('pairs');

// เลขประจำดาวแบบไทย (0 = ว่าง)
export const DIGIT_PLANET = { 0: 'ว่าง', 1: 'อาทิตย์', 2: 'จันทร์', 3: 'อังคาร', 4: 'พุธ', 5: 'พฤหัสบดี', 6: 'ศุกร์', 7: 'เสาร์', 8: 'ราหู', 9: 'เกตุ' };

export const pairInfo = (p) => { const r = kbMaps().pairs[p]; return r ? { level: r.level, text: r.text } : { level: 'neutral', text: '' }; };

const WEIGHT = { good: 1, mixed: 0.3, neutral: 0, bad: -1 };
export const digitsOf = (s) => String(s || '').replace(/\D/g, '');
export const reduce = (n) => { while (n > 9) n = String(n).split('').reduce((a, b) => a + +b, 0); return n; };

// ผลรวมค่าตัวอักษร: ไทยตามตำรา + อังกฤษแบบพีทาโกรัส
export function letterSum(text) {
  const val = kbMaps().value;
  let sum = 0;
  for (const ch of String(text || '').toLowerCase()) {
    if (val[ch]) sum += val[ch];
    else if (/[a-z]/.test(ch)) sum += ((ch.charCodeAt(0) - 97) % 9) + 1;
  }
  return sum;
}

// แปลงคะแนนรวมของคู่เลขเป็นระดับดวง 2–5
function scoreFrom(total, count) {
  if (!count) return 3;
  const r = total / count;
  return r >= 0.5 ? 5 : r >= 0.15 ? 4 : r > -0.15 ? 3 : 2;
}

// วิเคราะห์ชุดตัวเลข 1 ชุด
// kind: 'phone' (ดูคู่เลข 7 หลักท้าย) · 'plate' · 'house' · 'idcard' (ดูผลรวมเป็นหลัก)
export function analyzeNumber(raw, kind = 'phone', extraSum = 0) {
  const digits = digitsOf(raw);
  if (!digits) return null;
  const body = kind === 'phone' ? digits.slice(-7) : digits;
  const pairs = [];
  if (kind !== 'idcard') {
    for (let i = 0; i < body.length - 1; i++) {
      const p = body.slice(i, i + 2);
      pairs.push({ pair: p, ...pairInfo(p), last: i === body.length - 2 });
    }
  }
  // คู่ท้ายสุดมีน้ำหนักมากกว่า (ตามที่นิยมดูกัน)
  const total = pairs.reduce((s, p) => s + WEIGHT[p.level] * (p.last ? 1.5 : 1), 0);
  const count = pairs.reduce((s, p) => s + (p.last ? 1.5 : 1), 0);
  const sum = [...digits].reduce((a, b) => a + +b, 0) + extraSum;
  const root = reduce(sum);
  return {
    // เลขบัตรประชาชน: เก็บเฉพาะผลรวมและเลขท้าย 4 หลัก ไม่เก็บเลขเต็ม
    raw: kind === 'idcard' ? `เลขท้าย ${digits.slice(-4)}` : String(raw).trim().slice(0, 30), kind,
    digits: kind === 'idcard' ? undefined : digits, sum, root, rootPlanet: DIGIT_PLANET[root],
    pairs, score: kind === 'idcard' ? null : scoreFrom(total, count),
    good: pairs.filter((p) => p.level === 'good').length, bad: pairs.filter((p) => p.level === 'bad').length,
  };
}

// ทะเบียนรถ: ตัวเลข + ค่าตัวอักษร
export function analyzePlate(raw) {
  const letters = String(raw || '').replace(/[\d\s-]/g, '');
  const r = analyzeNumber(raw, 'plate', letterSum(letters));
  if (r) r.letters = letters;
  return r;
}

const VOWEL_SIGNS = 'ะาำิีึืุูัเแโใไ';

// ชื่อ: ผลรวมเลขศาสตร์ + อักษรกาลกิณี / อักษรนำชื่อ ตามทักษาวันเกิด (birthPlanet จาก thai.js)
export function analyzeName(first, last, birthPlanet) {
  const f = String(first || '').trim(), l = String(last || '').trim();
  if (!f) return null;
  const sumFirst = letterSum(f), sumLast = letterSum(l);
  const out = { first: f, last: l, sumFirst, sumLast, total: sumFirst + sumLast, root: reduce(sumFirst + sumLast) };
  if (birthPlanet) {
    const roles = taksa(birthPlanet);
    const roleOf = (ch) => { const p = planetOfLetter(ch); return p ? roles.find((r) => r.n === p).role : null; };
    const kala = roles[7];
    const vowelOnly = kala.n === 1; // กาลกิณีเป็นสระ: ตำราส่วนใหญ่ผ่อนปรน
    const find = (text) => [...text].filter((ch) => roleOf(ch) === 'กาลกิณี');
    const firstLetter = [...f].find((ch) => planetOfLetter(ch) && !VOWEL_SIGNS.includes(ch)) || f[0];
    out.kalakini = { letters: kala.letters, inFirst: [...new Set(find(f))], inLast: [...new Set(find(l))], vowelOnly };
    out.firstLetter = { ch: firstLetter, role: roleOf(firstLetter) };
    let score = 4;
    if (out.kalakini.inFirst.length) score -= vowelOnly ? 1 : 2;
    if (out.kalakini.inLast.length && !vowelOnly) score -= 1;
    if (['เดช', 'ศรี', 'มนตรี'].includes(out.firstLetter.role)) score += 1;
    out.score = Math.max(2, Math.min(5, score));
  }
  return out;
}

// ข้อความสรุปสำหรับส่งให้ AI (ใช้ประกอบใบผลดวง)
export function numberText(r) {
  if (!r) return '';
  const lines = [`ชุด ${r.raw}: ผลรวม ${r.sum} → ลดเหลือ ${r.root} (ดาว${r.rootPlanet})`];
  if (r.pairs.length) lines.push(`คู่เลข: ${r.pairs.map((p) => `${p.pair} ${PAIR_LEVELS[p.level]}${p.text ? ` (${p.text})` : ''}`).join(' · ')}`);
  return lines.join('\n');
}
export function nameText(n) {
  if (!n) return '';
  const lines = [`ชื่อ "${n.first}${n.last ? ` ${n.last}` : ''}": ค่าชื่อ ${n.sumFirst}${n.last ? ` + นามสกุล ${n.sumLast} = ${n.total}` : ''} → ลดเหลือ ${n.root}`];
  if (n.kalakini) {
    const k = n.kalakini;
    lines.push(k.inFirst.length || k.inLast.length
      ? `อักษรกาลกิณีตามวันเกิด (${k.letters}): พบในชื่อ ${k.inFirst.join(' ') || '-'} · ในนามสกุล ${k.inLast.join(' ') || '-'}${k.vowelOnly ? ' (กาลกิณีเป็นสระ ตำราส่วนใหญ่ผ่อนปรน)' : ''}`
      : `ไม่พบอักษรกาลกิณีตามวันเกิด (${k.letters})`);
    if (n.firstLetter.role) lines.push(`อักษรตัวแรกของชื่อ "${n.firstLetter.ch}" ตกทักษา${n.firstLetter.role}`);
  }
  return lines.join('\n');
}
