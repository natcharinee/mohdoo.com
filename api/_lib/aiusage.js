// ===== ค่าใช้จ่ายแม่หมอ AI: นับโทเคนและประมาณค่าใช้จ่ายรายวัน · แจ้งเตือนแอดมิน · เพดานรายวัน =====
// เก็บในกลุ่มข้อมูล 'aiday' (1 เอกสารต่อวัน เวลาไทย) · ค่าเป็น "ประมาณการ" จาก response.usage ไม่ใช่ใบแจ้งหนี้จริง
//   MOHDOO_AI_ALERT_USD  ประมาณค่าใช้จ่ายต่อวันที่จะแจ้งเตือนแอดมิน (ค่าเริ่มต้น 20 ดอลลาร์ · แจ้งวันละครั้ง)
//   MOHDOO_AI_CAP_USD    เพดานต่อวัน เกินแล้วหยุดเรียก AI จนถึงเที่ยงคืน (ค่าเริ่มต้น 0 = ไม่จำกัด)
import { db } from './db.js';
import { notify } from './notify.js';

// ราคาต่อ 1 ล้านโทเคน (ดอลลาร์) · cache read = 0.1× · cache write = 1.25× ของราคา input
const PRICE = {
  'claude-opus-5-5': [4, 20],
  'claude-sonnet-5-5': [2, 10],
  'claude-haiku-5-5': [0.1, 0.5],
};
const priceOf = (model) => PRICE[model] || PRICE[Object.keys(PRICE).find((k) => String(model || '').startsWith(k))] || PRICE['claude-opus-5-5'];

const num = (v) => Math.max(0, Number(v) || 0);
export const ALERT_USD = num(process.env.MOHDOO_AI_ALERT_USD) || 20;
export const CAP_USD = num(process.env.MOHDOO_AI_CAP_USD);
export const bkkDay = (t = Date.now()) => new Date(t + 7 * 3600e3).toISOString().slice(0, 10);

export function costOf(model, u = {}) {
  const [i, o] = priceOf(model);
  return (num(u.input_tokens) * i + num(u.cache_read_input_tokens) * i * 0.1 + num(u.cache_creation_input_tokens) * i * 1.25 + num(u.output_tokens) * o) / 1e6;
}

export async function aiDay(day = bkkDay()) {
  const store = await db();
  return (await store.get('aiday', day)) || { id: day, day, calls: 0, usd: 0, in: 0, out: 0, cache_read: 0, routes: {}, alerted: false, created_at: Date.now() };
}

// เรียกก่อนใช้ AI: เกินเพดานรายวันแล้ว → false (ให้หน้าเว็บใช้ทางสำรอง)
export async function aiBudgetOk() {
  if (!CAP_USD) return true;
  try { return (await aiDay()).usd < CAP_USD; } catch (_) { return true; } // อ่านไม่ได้ → ไม่บล็อกลูกค้า
}

// เรียกหลังได้คำตอบ (ไม่ให้การบันทึกทำให้คำตอบลูกค้าล้ม)
export async function recordAI(route, model, usage) {
  try {
    const store = await db();
    const d = await aiDay();
    const usd = costOf(model, usage);
    d.calls += 1;
    d.usd = Math.round((d.usd + usd) * 1e4) / 1e4;
    d.in += num(usage?.input_tokens) + num(usage?.cache_creation_input_tokens);
    d.out += num(usage?.output_tokens);
    d.cache_read += num(usage?.cache_read_input_tokens);
    const r = (d.routes[route] ||= { calls: 0, usd: 0 });
    r.calls += 1;
    r.usd = Math.round((r.usd + usd) * 1e4) / 1e4;
    const alertNow = !d.alerted && d.usd >= ALERT_USD;
    if (alertNow) d.alerted = true;
    await store.put('aiday', d);
    if (alertNow) await alertAdmins(d);
  } catch (e) { console.error('[aiusage]', e); }
}

async function alertAdmins(d) {
  const store = await db();
  const { rows } = await store.list('user', { status: 'admin', limit: 50 });
  const top = Object.entries(d.routes).sort((a, b) => b[1].usd - a[1].usd).map(([k, v]) => `${k} ${v.calls} ครั้ง`).join(' · ');
  const body = `วันนี้ใช้ AI ไปประมาณ $${d.usd.toFixed(2)} (${d.calls} ครั้ง) เกินเกณฑ์แจ้งเตือน $${ALERT_USD}${CAP_USD ? ` · เพดานวันละ $${CAP_USD}` : ''} · ${top}`;
  await Promise.all(rows.map((u) => notify(u.id, { title: '⚠️ ค่าใช้จ่าย AI สูงผิดปกติ', body, link: '#dash' }).catch(() => {})));
}
