// ===== แม่หมอ AI เขียนใบผลดวง (แบบใบเซียมซี) · Vercel Serverless Function =====
// POST /api/slip  { kind, service, title, question, score, detail, profile }
//   → { verse: [4 วรรค], topics: [{ label, text } × 4], overall }
// ใช้ Environment Variables เดียวกับ /api/chat: ANTHROPIC_API_KEY และ MOHDOO_AI_CODE (ส่งรหัสใน header X-AI-Code)
import { timingSafeEqual } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';

// คงที่ทั้งหมดเพื่อให้ prompt caching ทำงาน · ข้อมูลการดูดวงอยู่ใน messages
const SYSTEM_PROMPT = `คุณคือ "แม่หมอ" ของ หมอดู.com ทำหน้าที่เขียน "ใบผลดวง" ให้ลูกค้าเก็บไว้ ลักษณะเหมือนใบเซียมซีของวัด: มีกลอนคำทำนาย แล้วตามด้วยคำทำนายรายเรื่อง

เขียนจากผลการดูดวงที่ได้รับเท่านั้น (ไพ่ที่เปิด ใบเซียมซี คะแนนดวง หรือคำอ่าน) ให้สอดคล้องกับระดับดวง และเชื่อมกับคำถามของลูกค้าถ้ามี ห้ามแต่งข้อเท็จจริงที่ไม่มีในข้อมูล

ส่วนประกอบ:
1. verse: กลอนคำทำนาย 4 วรรค ภาษาไทยไพเราะ มีสัมผัสแบบกลอน วรรคละประมาณ 7–9 คำ น้ำเสียงขลังแต่ให้กำลังใจ อ่านแล้วเข้าใจได้
2. topics: คำทำนาย 4 เรื่องตามลำดับ การงาน · ความรัก · การเงิน · สุขภาพ เรื่องละ 1–2 ประโยค (ประมาณ 30–45 คำ ให้อ่านได้ 2–3 บรรทัดบนมือถือ) เขียนแบบบรรยายต่อเนื่องเต็มประโยค อ้างถึงไพ่/ผลที่เปิดได้ว่าส่งผลกับเรื่องนั้นอย่างไร เฉพาะเจาะจงกับผลดวงนี้และคำถาม และปิดด้วยคำแนะนำที่ทำได้จริง
3. overall: ดวงโดยรวม 2–3 ประโยค (ประมาณ 40–60 คำ) บรรยายภาพรวมของดวงเรื่องนี้ จังหวะที่ควรระวังและโอกาสที่ควรคว้า แล้วปิดท้ายด้วยกำลังใจ

ข้อห้าม: ไม่ฟันธงเรื่องความตาย โรคร้าย หรือเหตุร้ายแรง เรื่องสุขภาพให้เป็นคำแนะนำทั่วไป ไม่แนะนำการตัดสินใจทางการเงินก้อนใหญ่แทนลูกค้า

ตอบเป็น JSON อย่างเดียว ไม่มีข้อความอื่น รูปแบบ:
{"verse":["วรรค 1","วรรค 2","วรรค 3","วรรค 4"],"topics":[{"label":"การงาน","text":"..."},{"label":"ความรัก","text":"..."},{"label":"การเงิน","text":"..."},{"label":"สุขภาพ","text":"..."}],"overall":"..."}`;

const REPLY_LANG = {
  en: '\n\nเขียนทั้งหมดเป็นภาษาอังกฤษ (กลอนเป็นบทกวีภาษาอังกฤษ 4 บรรทัด) และใช้ label: Career, Love, Money, Health',
  zh: '\n\nเขียนทั้งหมดเป็นภาษาจีนตัวย่อ (กลอนเป็นกลอนจีน 4 บรรทัด) และใช้ label: 事业, 爱情, 财运, 健康',
};
const LEVEL = { 5: 'ดวงเด่นมาก', 4: 'ดวงดี', 3: 'ดวงกลาง ๆ', 2: 'ควรระวัง', 1: 'ควรระวัง' };

const client = new Anthropic(); // อ่าน ANTHROPIC_API_KEY จาก environment

function codeAllowed(given) {
  const codes = (process.env.MOHDOO_AI_CODE || '').split(',').map((c) => c.trim()).filter(Boolean);
  const g = Buffer.from(String(given || '').trim());
  return codes.some((c) => {
    const b = Buffer.from(c);
    return b.length === g.length && timingSafeEqual(b, g);
  });
}

// ดึง JSON ก้อนแรกออกจากคำตอบ (กันกรณีมีข้อความหรือ ``` ห่อ)
function parseSlip(text) {
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try {
    const j = JSON.parse(text.slice(a, b + 1));
    const verse = (Array.isArray(j.verse) ? j.verse : []).map((v) => String(v).trim()).filter(Boolean).slice(0, 4);
    const topics = (Array.isArray(j.topics) ? j.topics : [])
      .map((t) => ({ label: String(t?.label || '').trim().slice(0, 20), text: String(t?.text || '').trim().slice(0, 700) }))
      .filter((t) => t.label && t.text).slice(0, 4);
    const overall = String(j.overall || '').trim().slice(0, 900);
    if (verse.length < 2 || topics.length < 4 || !overall) return null;
    return { verse, topics, overall };
  } catch (_) { return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!process.env.ANTHROPIC_API_KEY || !process.env.MOHDOO_AI_CODE) return res.status(503).json({ error: 'ai_not_configured' });
  if (!codeAllowed(req.headers['x-ai-code'])) return res.status(401).json({ error: 'invalid_code' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}; } catch (_) { return res.status(400).json({ error: 'bad_request' }); }
  const detail = String(body.detail || '').slice(0, 3000);
  if (!detail.trim()) return res.status(400).json({ error: 'bad_request' });
  const p = body.profile || {};
  const info = [
    `บริการ: ${String(body.service || '').slice(0, 60)} · ${String(body.title || '').slice(0, 80)}`,
    body.score && `ระดับดวง: ${LEVEL[body.score] || ''} (${Number(body.score)}/5)`,
    body.question && `คำถามของลูกค้า: ${String(body.question).slice(0, 200)}`,
    p.first && `ชื่อลูกค้า: ${String(p.first).slice(0, 40)}`,
    p.birthdate && `วันเกิด: ${String(p.birthdate).slice(0, 10)}`,
    `ผลการดูดวง:\n${detail}`,
  ].filter(Boolean).join('\n');

  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default', // ถ้าโมเดลหลักปฏิเสธ ให้เซิร์ฟเวอร์ลองโมเดลสำรองอัตโนมัติ
      output_config: { effort: 'medium' }, // งานเขียนกลอน ต้องการความประณีตกว่าแชท
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [
        { role: 'user', content: `เขียนใบผลดวงจากข้อมูลนี้\n\n${info}` },
        ...(REPLY_LANG[p.lang] ? [{ role: 'system', content: REPLY_LANG[p.lang] }] : []),
      ],
    });
    if (response.stop_reason === 'refusal') return res.status(422).json({ error: 'refused' });
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    const slip = parseSlip(text);
    if (!slip) return res.status(502).json({ error: 'bad_output' });
    return res.status(200).json(slip);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'busy' });
    if (error instanceof Anthropic.AuthenticationError) return res.status(503).json({ error: 'ai_not_configured' });
    if (error instanceof Anthropic.BadRequestError) return res.status(400).json({ error: 'bad_request' });
    if (error instanceof Anthropic.APIError) return res.status(502).json({ error: 'upstream_error' });
    return res.status(500).json({ error: 'server_error' });
  }
}
