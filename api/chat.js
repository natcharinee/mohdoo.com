// ===== หมอดู AI: Vercel Serverless Function =====
// POST /api/chat  { messages: [{role, content}], profile: {...} }  →  { reply }
// ต้องตั้ง ANTHROPIC_API_KEY บน Vercel · ใช้ได้เฉพาะสมาชิกดูดวงรายวันที่ยังไม่หมดอายุ (หรือรหัสทดสอบ MOHDOO_AI_CODE ของทีม) ดู _lib/aigate.js
import Anthropic from '@anthropic-ai/sdk';
import { chatAccess, chatCount } from './_lib/aigate.js';
import { VOICE } from './_lib/voice.js';
import { chartText } from '../lib/calc/chart.js';
import { loadKB } from './_lib/kb.js';
import { aiBudgetOk, recordAI } from './_lib/aiusage.js';
import { rateLimit } from './_lib/ratelimit.js';
import { ipOf } from './_lib/http.js';

const MAX_TURNS = 20;      // ส่งประวัติแชทย้อนหลังไม่เกิน 20 ข้อความ
const MAX_CHARS = 1500;    // ความยาวสูงสุดต่อข้อความ
// แชทใช้โมเดลเล็กกว่า (ใบผลดวง/อ่านรูปยังใช้ Opus) · เปลี่ยนได้ที่ MOHDOO_CHAT_MODEL เช่น claude-haiku-5-5
const CHAT_MODEL = process.env.MOHDOO_CHAT_MODEL || 'claude-sonnet-5-5';
// คำตอบ 8–12 บรรทัด + การคิดระดับ low ใช้จริงราว 1–3 พันโทเคน · เพดานนี้กันคำตอบยาวผิดปกติ
const CHAT_MAX_TOKENS = 4000;

// คงที่ทั้งหมด (ไม่มีวันที่/ค่าสุ่ม) เพื่อให้ prompt caching ทำงาน
const SYSTEM_PROMPT = `คุณคือ "หมอดู AI" ของแพลตฟอร์ม หมอดู.com ตอบเป็นภาษาไทยด้วยน้ำเสียงอบอุ่น เป็นกันเอง เหมือนแม่หมอใจดีที่เข้าใจคน

วิธีตอบ:
- ถ้ามีข้อความระบบบอกว่าลูกค้าเลือกศาสตร์ใด ให้ตอบด้วยศาสตร์นั้นเป็นหลัก ถ้าไม่ระบุ ให้วิเคราะห์จากหลายศาสตร์ที่เกี่ยวข้องกับคำถาม เช่น โหราศาสตร์ไทย โหราศาสตร์ตะวันตก (ราศี) ดวงจีน/ปีนักษัตร เลขศาสตร์ ทักษา สีมงคลตามวันเกิด และไพ่ทาโรต์ โดยใช้ข้อมูลเกิดของผู้ถามที่ให้มา
- ถ้ามีหัวข้อ "ผลคำนวณดวง" ในข้อมูลผู้ถาม ค่าทั้งหมดในนั้น (ปีนักษัตร ราศี ลัคนา แปดอักษร ทักษา เลขศาสตร์ ดวงวันนี้) ระบบคำนวณด้วยสูตรดาราศาสตร์แล้ว ให้ใช้ตามนั้นเท่านั้น ห้ามคำนวณใหม่เอง ห้ามเปลี่ยนค่า และห้ามแต่งตำแหน่งดาวหรือค่าที่ไม่มีในผลคำนวณ (เช่น ดาวดวงอื่นในเรือนชะตา) ถ้าศาสตร์ที่ถามต้องใช้ข้อมูลที่ไม่มี ให้อ่านภาพรวมจากค่าที่มีแล้วบอกตรง ๆ ว่าต้องมีข้อมูลอะไรเพิ่ม
- ถ้าผลคำนวณมี "ข้อควรระวัง" (เช่น ไม่มีเวลาเกิด ลัคนาใกล้รอยต่อ) ให้บอกลูกค้าสั้น ๆ และไม่ฟันธงในส่วนที่ไม่แน่นอน
- ระบุสั้น ๆ ว่าแต่ละประเด็นมาจากศาสตร์ไหน แล้วสรุปเป็นคำแนะนำที่นำไปใช้ได้จริง
- ถ้าข้อมูลเกิดไม่พอสำหรับศาสตร์ใด ให้บอกตรง ๆ และชวนให้กรอกเพิ่มในหน้าบัญชี
- ตอบกระชับ อ่านง่ายบนมือถือ ไม่เกินประมาณ 8–12 บรรทัด ใช้หัวข้อย่อยหรือ • ได้
- เป็นความบันเทิงและแนวทางชีวิต: ห้ามฟันธงเรื่องความตาย โรคร้าย หรือเหตุร้ายแรง ห้ามแนะนำให้หยุดรักษา หยุดยา หรือตัดสินใจทางการเงินก้อนใหญ่แทนผู้ถาม เรื่องสุขภาพ กฎหมาย การเงินจริงจัง ให้แนะนำปรึกษาผู้เชี่ยวชาญ
- ถ้าผู้ถามดูเครียดหรือเสี่ยงทำร้ายตัวเอง ให้ตอบอย่างใส่ใจและแนะนำสายด่วนสุขภาพจิต 1323
- ห้ามอ้างว่าเป็นมนุษย์หรือหมอดูคนจริงบนแพลตฟอร์ม
- ทุกคำตอบ: เล่าตามพื้นดวงจริง → สรุปภาพรวม → บอกทางทำให้ดีขึ้น 2–3 ข้อ

${VOICE}`;

const client = new Anthropic(); // อ่าน ANTHROPIC_API_KEY จาก environment

// เทียบรหัสแบบใช้เวลาคงที่ (ไม่ให้เดารหัสจากเวลาตอบกลับ)

// ผู้ใช้เลือกภาษาเว็บเป็น EN / 中文 → ให้แม่หมอตอบเป็นภาษานั้น
const REPLY_LANG = {
  en: '\n\nตอบเป็นภาษาอังกฤษทั้งหมด (Reply in English).',
  zh: '\n\nตอบเป็นภาษาจีนตัวย่อทั้งหมด (请用简体中文回答).',
};

function profileText(p = {}) {
  const lines = [
    p.first && `ชื่อ: ${p.first} ${p.last || ''}`.trim(),
    p.birthdate && `วันเกิด: ${p.birthdate}`,
    p.birthtime && `เวลาเกิด: ${p.birthtime}`,
    p.birthplace && `สถานที่เกิด: ${p.birthplace}`,
    p.gender && `เพศ: ${p.gender}`,
    p.relation && `สถานะความรัก: ${p.relation}`,
    p.interests?.length && `เรื่องที่สนใจ: ${p.interests.join(', ')}`,
    p.today && `วันที่วันนี้: ${p.today}`,
    typeof p.file === 'string' && p.file.trim() && `แฟ้มดวง (ข้อมูลที่เคยให้ไว้กับการดูดวงครั้งก่อน ๆ):\n${p.file.slice(0, 1500)}`,
  ].filter(Boolean);
  const chart = chartText(p); // คำนวณดวงจากข้อมูลเกิด (ผลเดิมทุกครั้ง) ให้ AI ตีความ ไม่ให้ AI คำนวณเอง
  if (chart) lines.push(chart);
  return lines.length ? lines.join('\n') : 'ผู้ถามยังไม่ได้กรอกข้อมูลเกิด';
}

export default async function handler(req, res) {
  // GET /api/chat → จำนวนคำถามที่เหลือวันนี้ (ให้หน้าเว็บแสดง)
  if (req.method === 'GET') {
    const a = await chatAccess(req);
    if (!a.ok) return res.status(401).json({ error: 'invalid_code' });
    return res.status(200).json({ quota: a.team ? null : a.quota });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'ai_not_configured' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}; } catch (_) { return res.status(400).json({ error: 'bad_request' }); }
  const access = await chatAccess(req); // สมาชิกรายวัน/รายเดือน หรือรหัสทดลองของทีม
  if (!access.ok) return res.status(401).json({ error: 'invalid_code' });
  if (access.quota && !access.quota.left) return res.status(429).json({ error: 'daily_limit', quota: access.quota });
  // กันยิงถี่ (สแปม/บอท): ไม่เกิน 6 คำถามต่อนาทีต่อคน
  try { await rateLimit(`chat:${access.user ? access.user.id : ipOf(req) || 'team'}`, 6, 60e3); } catch (_) { return res.status(429).json({ error: 'busy' }); }
  // เกินเพดานค่าใช้จ่าย AI รายวัน (MOHDOO_AI_CAP_USD) → ตอบสุภาพ ไม่นับโควตาลูกค้า
  if (!(await aiBudgetOk())) return res.status(200).json({ reply: 'ขออภัยค่ะ ตอนนี้แม่หมอ AI มีคนถามเยอะเป็นพิเศษ พักรับคำถามชั่วคราว ลองใหม่อีกครั้งภายหลังนะคะ 🙏', quota: access.quota || null });
  await loadKB(); // ตำราดูดวงล่าสุดที่ทีมแก้ในหลังบ้าน
  const history = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (history.length && history[0].role !== 'user') history.shift();
  if (!history.length || history[history.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'bad_request' });
  }

  // ข้อมูลผู้ถามใส่เป็นข้อความระบบกลางบทสนทนา (ไม่แก้ system prompt หลัก → cache ยังใช้ได้)
  const messages = [
    ...history.slice(0, -1),
    history[history.length - 1],
    { role: 'system', content: `ข้อมูลของผู้ถาม (ใช้ประกอบการวิเคราะห์):\n${profileText(body.profile)}${REPLY_LANG[body.profile?.lang] || ''}` },
  ];

  try {
    const response = await client.beta.messages.create({
      model: CHAT_MODEL,
      max_tokens: CHAT_MAX_TOKENS,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default', // ถ้าโมเดลหลักปฏิเสธ ให้เซิร์ฟเวอร์ลองโมเดลสำรองอัตโนมัติ
      output_config: { effort: 'low' }, // แชทถามตอบ: ตอบเร็ว ประหยัด
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages,
    });

    await recordAI('chat', response.model || CHAT_MODEL, response.usage);
    if (response.stop_reason === 'refusal') {
      return res.status(200).json({ reply: 'ขออภัยค่ะ แม่หมอ AI ตอบคำถามนี้ไม่ได้ ลองถามในมุมอื่นดูนะคะ 🙏' });
    }
    const reply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (!reply) return res.status(200).json({ reply: 'ขออภัยค่ะ ลองถามใหม่อีกครั้งนะคะ', quota: access.quota || null });
    const quota = access.user ? await chatCount(access.user) : null; // นับเฉพาะคำตอบที่ได้จริง
    return res.status(200).json({ reply, quota });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'busy' });
    if (error instanceof Anthropic.AuthenticationError) return res.status(503).json({ error: 'ai_not_configured' });
    if (error instanceof Anthropic.BadRequestError) return res.status(400).json({ error: 'bad_request' });
    if (error instanceof Anthropic.APIError) return res.status(502).json({ error: 'upstream_error' });
    return res.status(500).json({ error: 'server_error' });
  }
}
