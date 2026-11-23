// ===== ระดับดวงของบริการ "ถามคำถาม / วิเคราะห์ทันที" (40 บาท) จากผลคำนวณจริง =====
// เดิมระดับดวงมาจาก hash ของข้อความคำถาม → เปลี่ยนเป็น:
//   · บริการตัวเลข (เบอร์ ทะเบียน บ้าน) → คะแนนคู่เลข
//   · บริการชื่อ → อักษรกาลกิณี / อักษรตัวแรกตามทักษาวันเกิด
//   · คำถามทั่วไป → ทักษาของวันที่ถาม + ชง/ไห่/ผั่ว ของปีและวันนั้นกับปีเกิด
// ผลคงที่: ข้อมูลเดิม + เวลาที่ถามเดิม = ระดับดวงเดิม (เปิดใบซ้ำได้ผลเดิม)
import { computeChart } from './chart.js';
import { analyzeNumber, analyzePlate, analyzeName, numberText, nameText, digitsOf } from './numbers.js';

const ROLE_SCORE = { เดช: 5, ศรี: 5, มนตรี: 5, อายุ: 4, บริวาร: 4, อุตสาหะ: 4, มูละ: 3, กาลกิณี: 2 };
const ROLE_MEANING = {
  บริวาร: 'คนรอบข้างและครอบครัว', อายุ: 'สุขภาพและความเป็นอยู่', เดช: 'อำนาจ การงาน ชื่อเสียง', ศรี: 'โชคลาภ การเงิน เสน่ห์',
  มูละ: 'ทรัพย์สิน รากฐาน', อุตสาหะ: 'ความขยัน การลงมือทำ', มนตรี: 'ผู้ใหญ่อุปถัมภ์', กาลกิณี: 'อุปสรรค สิ่งที่ควรระวัง',
};
const TOPIC_ROLE = { การงาน: ['เดช', 'อุตสาหะ'], การเงิน: ['ศรี', 'มูละ'], ความรัก: ['ศรี', 'บริวาร'], สุขภาพ: ['อายุ'] };
const DAY_PLANET_NAME = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const clamp = (n) => Math.max(2, Math.min(5, Math.round(n)));
const lines = (s) => String(s || '').split(/\n|,/).map((x) => x.trim()).filter(Boolean);

function topicKey(topic) {
  const t = String(topic || '');
  return Object.keys(TOPIC_ROLE).find((k) => t.includes(k)) || null;
}

// ระดับดวงจากดวงของวันที่ถาม
function questionScore(profile, topic, atMs) {
  const c = computeChart(profile, atMs);
  if (!c) return null;
  const reasons = [];
  // ทักษาจรของวัน: ดาววันที่ถามตกทักษาอะไรของเจ้าชะตา (วันเปลี่ยนตอน 06:00 น. · พุธกลางคืน = ราหู)
  const local = new Date(atMs + 7 * 3600e3);
  const mins = local.getUTCHours() * 60 + local.getUTCMinutes();
  let wd = local.getUTCDay();
  if (mins < 360) wd = (wd + 6) % 7;
  const night = wd === 3 && (mins >= 1080 || mins < 360);
  const planetName = night ? 'ราหู' : DAY_PLANET_NAME[wd];
  const role = c.thai.taksa.find((r) => r.planet === planetName).role;
  let score = ROLE_SCORE[role];
  reasons.push(`วันที่ถาม (วัน${night ? 'พุธกลางคืน' : DAY_PLANET_NAME[wd]}) ตกทักษา${role}ของเจ้าชะตา · ${ROLE_MEANING[role]}`);
  const tk = topicKey(topic);
  if (tk && TOPIC_ROLE[tk].includes(role)) { score += 1; reasons.push(`ทักษา${role}ตรงกับเรื่อง${tk}ที่ถาม`); }
  const t = c.today;
  if (t.yearRelations.some((x) => x.startsWith('ชง'))) { score -= 1; reasons.push(`ปีนี้ (${t.yearAnimal.split(' ')[0]}) ชงกับปีเกิด${c.chinese.animal.split(' ')[0]}`); }
  else if (t.yearRelations.length) reasons.push(`ปีนี้กับปีเกิดเป็น ${t.yearRelations.join(', ')}`);
  if (t.dayRelations.some((x) => x.startsWith('ชง'))) { score -= 1; reasons.push(`วันจีนวันนั้น (${t.dayAnimal.split(' ')[0]}) ชงกับปีเกิด`); }
  return { score: clamp(score), basis: 'ดวงวันที่ถาม', reasons, chart: c };
}

// entry = ประวัติการดูดวงแบบ ask { svc, topic, data, at } · profile = ข้อมูลผู้ใช้ (birthdate, birthtime, first, last ...)
export function askScore(entry, profile = {}) {
  const svc = String(entry.svc || '');
  const data = entry.data || {};
  const at = Number(entry.at) || Date.now();
  const details = [];
  const reasons = [];

  // ---- บริการตัวเลข ----
  const numKind = /plate/.test(svc) ? 'plate' : /phone/.test(svc) ? 'phone' : svc === 'house' ? 'house' : svc === 'idcard' ? 'idcard' : null;
  if (numKind) {
    const src = numKind === 'plate' ? data.plates : numKind === 'phone' ? data.numbers : numKind === 'house' ? data.houseno : data.idnum;
    const list = (numKind === 'house' || numKind === 'idcard' ? [src] : lines(src)).filter((x) => digitsOf(x)).slice(0, 3);
    const results = list.map((x) => (numKind === 'plate' ? analyzePlate(x) : analyzeNumber(x, numKind))).filter(Boolean);
    if (results.length) {
      results.forEach((r) => details.push(numberText(r)));
      const scored = results.filter((r) => r.score != null);
      if (scored.length) {
        const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
        if (results.length > 1) reasons.push(`ชุดที่ให้ผลดีที่สุดคือ ${best.raw}`);
        reasons.push(`คู่เลขดี ${best.good} คู่ · ควรระวัง ${best.bad} คู่`);
        return { score: best.score, basis: 'คู่เลข', reasons, detail: details.join('\n'), best: best.raw };
      }
      // เลขบัตร: ดูผลรวมเป็นหลัก ใช้ดวงวันที่ถามช่วยให้ระดับ
      const q = questionScore(profile, entry.topic, at);
      return { score: q ? q.score : 3, basis: 'ผลรวมเลข', reasons: q ? q.reasons : [], detail: details.join('\n') };
    }
  }

  // ---- บริการชื่อ ----
  if (['rename', 'name-check', 'surname'].includes(svc)) {
    const c = computeChart(profile, at);
    const raw = String(data.current || '').trim().split(/\s+/);
    const first = svc === 'surname' ? profile.first || '' : raw[0];
    const last = svc === 'surname' ? data.current || '' : raw.slice(1).join(' ') || profile.last || '';
    const n = analyzeName(first, last, c ? c.thai.planet : null);
    if (n) {
      details.push(nameText(n));
      if (n.score != null) {
        if (n.kalakini.inFirst.length) reasons.push(`ชื่อมีอักษรกาลกิณี ${n.kalakini.inFirst.join(' ')}`);
        if (n.firstLetter.role) reasons.push(`อักษรนำชื่อตกทักษา${n.firstLetter.role}`);
        return { score: n.score, basis: 'ทักษาของชื่อ', reasons, detail: details.join('\n') };
      }
    }
  }

  // ---- คำถามทั่วไป / บริการอื่น ----
  const q = questionScore(profile, entry.topic, at);
  if (q) return { score: q.score, basis: q.basis, reasons: q.reasons, detail: details.join('\n') };
  return null; // ไม่มีวันเกิด → ให้หน้าเว็บใช้วิธีเดิม
}

export function scoreText(r) {
  if (!r) return '';
  return [`ระดับดวงจากผลคำนวณ (${r.basis}): ${r.score}/5`, ...r.reasons.map((x) => `- ${x}`), r.detail || ''].filter(Boolean).join('\n');
}
