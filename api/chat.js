// ===== หมอดู AI: Vercel Serverless Function =====
// POST /api/chat  { messages: [{role, content}], profile: {...} }  →  { reply }
// ต้องตั้งค่า Environment Variables บน Vercel:
//   ANTHROPIC_API_KEY  คีย์ของ Claude API
//   MOHDOO_AI_CODE     รหัสทดลองใช้ AI (ใส่ได้หลายรหัส คั่นด้วยจุลภาค เช่น "moon2026,star99")
// ทั้งสองค่าต้องตั้งครบ AI จริงจึงจะทำงาน — กันคนที่ไม่มีรหัสเรียกใช้แล้วเกิดค่าใช้จ่าย
import { timingSafeEqual } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';

const MAX_TURNS = 20;      // ส่งประวัติแชทย้อนหลังไม่เกิน 20 ข้อความ
const MAX_CHARS = 1500;    // ความยาวสูงสุดต่อข้อความ

// คงที่ทั้งหมด (ไม่มีวันที่/ค่าสุ่ม) เพื่อให้ prompt caching ทำงาน
const SYSTEM_PROMPT = `คุณคือ "หมอดู AI" ของแพลตฟอร์ม หมอดู.com ตอบเป็นภาษาไทยด้วยน้ำเสียงอบอุ่น เป็นกันเอง เหมือนแม่หมอใจดีที่เข้าใจคน

วิธีตอบ:
- วิเคราะห์จากหลายศาสตร์ที่เกี่ยวข้องกับคำถาม เช่น โหราศาสตร์ไทย โหราศาสตร์ตะวันตก (ราศี) ดวงจีน/ปีนักษัตร เลขศาสตร์ ทักษา สีมงคลตามวันเกิด และไพ่ทาโรต์ โดยใช้ข้อมูลเกิดของผู้ถามที่ให้มา
- ระบุสั้น ๆ ว่าแต่ละประเด็นมาจากศาสตร์ไหน แล้วสรุปเป็นคำแนะนำที่นำไปใช้ได้จริง
- ถ้าข้อมูลเกิดไม่พอสำหรับศาสตร์ใด ให้บอกตรง ๆ และชวนให้กรอกเพิ่มในหน้าบัญชี
- ตอบกระชับ อ่านง่ายบนมือถือ ไม่เกินประมาณ 8–12 บรรทัด ใช้หัวข้อย่อยหรือ • ได้
- เป็นความบันเทิงและแนวทางชีวิต: ห้ามฟันธงเรื่องความตาย โรคร้าย หรือเหตุร้ายแรง ห้ามแนะนำให้หยุดรักษา หยุดยา หรือตัดสินใจทางการเงินก้อนใหญ่แทนผู้ถาม เรื่องสุขภาพ กฎหมาย การเงินจริงจัง ให้แนะนำปรึกษาผู้เชี่ยวชาญ
- ถ้าผู้ถามดูเครียดหรือเสี่ยงทำร้ายตัวเอง ให้ตอบอย่างใส่ใจและแนะนำสายด่วนสุขภาพจิต 1323
- ห้ามอ้างว่าเป็นมนุษย์หรือหมอดูคนจริงบนแพลตฟอร์ม`;

const client = new Anthropic(); // อ่าน ANTHROPIC_API_KEY จาก environment

// เทียบรหัสแบบใช้เวลาคงที่ (ไม่ให้เดารหัสจากเวลาตอบกลับ)
function codeAllowed(given) {
  const codes = (process.env.MOHDOO_AI_CODE || '').split(',').map((c) => c.trim()).filter(Boolean);
  const g = Buffer.from(String(given || '').trim());
  return codes.some((c) => {
    const b = Buffer.from(c);
    return b.length === g.length && timingSafeEqual(b, g);
  });
}

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
  return lines.length ? lines.join('\n') : 'ผู้ถามยังไม่ได้กรอกข้อมูลเกิด';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!process.env.ANTHROPIC_API_KEY || !process.env.MOHDOO_AI_CODE) return res.status(503).json({ error: 'ai_not_configured' });
  if (!codeAllowed(req.headers['x-ai-code'])) return res.status(401).json({ error: 'invalid_code' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
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
    { role: 'system', content: `ข้อมูลของผู้ถาม (ใช้ประกอบการวิเคราะห์):\n${profileText(body.profile)}` },
  ];

  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default', // ถ้าโมเดลหลักปฏิเสธ ให้เซิร์ฟเวอร์ลองโมเดลสำรองอัตโนมัติ
      output_config: { effort: 'low' }, // แชทถามตอบ: ตอบเร็ว ประหยัด
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages,
    });

    if (response.stop_reason === 'refusal') {
      return res.status(200).json({ reply: 'ขออภัยค่ะ แม่หมอ AI ตอบคำถามนี้ไม่ได้ ลองถามในมุมอื่นดูนะคะ 🙏' });
    }
    const reply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return res.status(200).json({ reply: reply || 'ขออภัยค่ะ ลองถามใหม่อีกครั้งนะคะ' });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'busy' });
    if (error instanceof Anthropic.AuthenticationError) return res.status(503).json({ error: 'ai_not_configured' });
    if (error instanceof Anthropic.BadRequestError) return res.status(400).json({ error: 'bad_request' });
    if (error instanceof Anthropic.APIError) return res.status(502).json({ error: 'upstream_error' });
    return res.status(500).json({ error: 'server_error' });
  }
}
