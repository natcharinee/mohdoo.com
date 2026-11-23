// ===== แม่หมอ AI อ่านรูป: ลายมือ · โหงวเฮ้ง · ข้อมือ · ลายเท้า (Vercel Serverless Function) =====
// POST /api/reading  { kind, topic, images: [{ slot, data: "data:image/jpeg;base64,..." }], profile }
//   → { reading, summary }   หรือ { unclear: true, reading } ถ้ารูปไม่ชัด/ไม่ใช่ส่วนที่ขอ
// สิทธิ์ใช้: ลูกค้าที่จ่ายแล้ว (ดู _lib/aigate.js) หรือรหัสทดลอง MOHDOO_AI_CODE · ต้องตั้ง ANTHROPIC_API_KEY
import Anthropic from '@anthropic-ai/sdk';
import { aiBudgetOk, recordAI } from './_lib/aiusage.js';
import { aiAllowed } from './_lib/aigate.js';
import { VOICE } from './_lib/voice.js';
import { palmGuide } from './_lib/palm-guide.js';
import { loadKB } from './_lib/kb.js';

const MAX_IMAGES = 4;
const MAX_IMAGE_CHARS = 2_000_000; // base64 ต่อรูป (~1.5 MB) — หน้าเว็บย่อรูปเหลือด้านยาว 480px อยู่แล้ว
const MEDIA = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const KINDS = {
  palm: { name: 'ลายมือ', guide: `อ่านตาม "ตำราลายมือของหมอดู.com" ในข้อความระบบเป็นหลัก จากสิ่งที่เห็นในรูปจริง:
- รูปทรงมือและนิ้ว (ธาตุของมือ)
- เส้นหลัก: เส้นชีวิต เส้นสมอง เส้นหัวใจ เส้นวาสนา และเส้นอื่นที่เห็นชัด (เส้นอาทิตย์ เส้นแต่งงาน)
- เนินใต้นิ้วที่เด่น
ถ้ามีทั้งมือซ้ายและขวา: มือซ้ายบอกพื้นดวงที่ติดตัวมา มือขวาบอกสิ่งที่สร้างเอง เทียบให้เห็นความต่าง` },
  face: { name: 'โหงวเฮ้ง', guide: `อ่านตามตำราโหงวเฮ้ง (นรลักษณ์จีน) จากสิ่งที่เห็นในรูปจริง:
- โครงหน้าและสามส่วนของใบหน้า (หน้าผาก · คิ้วถึงจมูก · ใต้จมูกถึงคาง)
- คิ้ว ตา จมูก ปาก หู (ห้าอวัยวะ) และหน้าผาก/คาง
บอกลักษณะที่เห็นแล้วตามด้วยความหมายตามตำรา` },
  wrist: { name: 'เส้นข้อมือ', guide: 'อ่านเส้นข้อมือ (สร้อยข้อมือ) ด้านใน: จำนวนเส้น ความชัด ความต่อเนื่อง และความหมายตามตำรา' },
  foot: { name: 'ลายเท้า', guide: 'อ่านลักษณะเท้าและลายฝ่าเท้าตามตำรานรลักษณ์: รูปเท้า นิ้วเท้า และลายที่เห็นชัด' },
};
const SLOT_NAME = { palmL: 'มือซ้าย', palmR: 'มือขวา', face: 'ใบหน้า', wrist: 'ข้อมือ', foot: 'ฝ่าเท้า', body: 'รูปร่าง' };

// คงที่ทั้งหมดเพื่อให้ prompt caching ทำงาน · ข้อมูลผู้ใช้/รูปอยู่ใน messages
const SYSTEM_PROMPT = `คุณคือ "แม่หมอ AI" ของ หมอดู.com ทำหน้าที่อ่านรูปลายมือ ใบหน้า (โหงวเฮ้ง) ข้อมือ และลายเท้า ตามตำราดูดวง เพื่อความบันเทิงและเป็นแนวทางชีวิต น้ำเสียงอบอุ่น เป็นกันเอง

หลักการอ่าน:
- อ่านจากสิ่งที่มองเห็นในรูปจริงเท่านั้น บอกว่าเห็นอะไร (เช่น "เส้นสมองยาวลากไปถึงใต้นิ้วนาง") แล้วจึงบอกความหมายตามตำรา ห้ามแต่งลักษณะที่มองไม่เห็น
- ถ้าเห็นไม่ชัด บอกตรง ๆ ว่าส่วนไหนเห็นไม่ชัด แล้วอ่านเท่าที่เห็น
- ถ้ารูปไม่ใช่ส่วนที่ขอ หรือมืด/เบลอจนอ่านไม่ได้เลย ให้ตอบบรรทัดแรกว่า [ภาพไม่ชัด] แล้วอธิบายสั้น ๆ ว่าควรถ่ายใหม่อย่างไร โดยไม่ต้องทำนาย
- เน้นเรื่องที่ผู้ถามเลือก ถ้ามีข้อมูลวันเกิดหรือแฟ้มดวง ให้เชื่อมโยงสั้น ๆ ได้
- ห้ามระบุตัวตนว่าเป็นใคร ห้ามคาดเดาเชื้อชาติ ศาสนา หรือข้อมูลอ่อนไหวจากรูป ห้ามวินิจฉัยโรคหรือพูดถึงความตาย อายุขัย หรือเหตุร้ายแรง เรื่องสุขภาพให้เป็นคำแนะนำทั่วไปเท่านั้น
- ห้ามติชมหน้าตาหรือรูปร่างในแง่ความสวยงาม พูดถึงลักษณะตามตำราเท่านั้น และไม่พูดให้ผู้ถามรู้สึกแย่กับรูปลักษณ์ของตัวเอง

รูปแบบคำตอบ (อ่านบนมือถือ):
- 4 หัวข้อสั้นพอดี ขึ้นต้นด้วย • แต่ละหัวข้อ: ลักษณะที่เห็น → ความหมาย (ใช้ทำใบผลดวง 4 ก้อน)
- ก่อนบรรทัดสรุป ให้มีหัวข้อ "ทางเสริมดวง" 2–3 ข้อที่ทำได้จริง ตามลักษณะที่เห็น
- บรรทัดสุดท้ายเขียนว่า "สรุปสั้น:" ตามด้วยสรุปหนึ่งประโยค (ไม่เกิน 120 ตัวอักษร) สำหรับเก็บในแฟ้มดวง

${VOICE}`;

const REPLY_LANG = {
  en: '\n\nตอบเป็นภาษาอังกฤษทั้งหมด และใช้ "Summary:" แทน "สรุปสั้น:" (Reply in English).',
  zh: '\n\nตอบเป็นภาษาจีนตัวย่อทั้งหมด และใช้ "简要总结：" แทน "สรุปสั้น:" (请用简体中文回答).',
};

const client = new Anthropic(); // อ่าน ANTHROPIC_API_KEY จาก environment


function parseImage(img) {
  const m = /^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(img?.data || ''));
  if (!m || !MEDIA.has(m[1]) || m[2].length > MAX_IMAGE_CHARS) return null;
  return { slot: SLOT_NAME[img.slot] ? img.slot : '', media_type: m[1], data: m[2] };
}

function profileText(p = {}) {
  return [
    p.first && `ชื่อเล่น/ชื่อ: ${String(p.first).slice(0, 40)}`,
    p.birthdate && `วันเกิด: ${String(p.birthdate).slice(0, 10)}`,
    p.gender && `เพศ: ${String(p.gender).slice(0, 10)}`,
    typeof p.file === 'string' && p.file.trim() && `แฟ้มดวง:\n${p.file.slice(0, 1200)}`,
  ].filter(Boolean).join('\n') || 'ไม่มีข้อมูลเกิด';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'ai_not_configured' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}; } catch (_) { return res.status(400).json({ error: 'bad_request' }); }
  if (!(Number(body.photo_consent_at) > 0)) return res.status(403).json({ error: 'photo_consent_required' }); // ต้องยินยอมก่อนส่งรูปให้ AI อ่าน
  if (!(await aiBudgetOk())) return res.status(503).json({ error: 'ai_budget' }); // เกินเพดานค่าใช้จ่ายรายวัน → หน้าเว็บใช้ทางสำรอง
  if (!(await aiAllowed(req, { need: 'order', orderNo: body.order_no, kinds: ['photo'] }))) return res.status(401).json({ error: 'invalid_code' }); // จ่ายแล้ว (คำสั่งซื้อ/สมาชิก) หรือรหัสทดลอง
  const kind = KINDS[body.kind] ? body.kind : null;
  const images = (Array.isArray(body.images) ? body.images : []).slice(0, MAX_IMAGES).map(parseImage).filter(Boolean);
  if (!kind || !images.length) return res.status(400).json({ error: 'bad_request' });
  const topic = String(body.topic || 'ภาพรวม').slice(0, 40);
  const lang = body.profile?.lang;

  const content = [];
  images.forEach((img) => {
    content.push({ type: 'text', text: `รูป: ${SLOT_NAME[img.slot] || 'รูปที่ส่งมา'}` });
    content.push({ type: 'image', source: { type: 'base64', media_type: img.media_type, data: img.data } });
  });
  content.push({ type: 'text', text: `ช่วยอ่าน${KINDS[kind].name}จากรูปด้านบน เรื่องที่อยากรู้: ${topic}\n\nแนวทาง:\n${KINDS[kind].guide}` });

  if (kind === 'palm' || kind === 'wrist') await loadKB(); // ตำราลายมือล่าสุดที่ทีมแก้ในหลังบ้าน
  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 8000, // ผลจริง + การคิดระดับ medium ใช้ไม่ถึงครึ่ง · กันคำตอบยาวผิดปกติ
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default', // ถ้าโมเดลหลักปฏิเสธ ให้เซิร์ฟเวอร์ลองโมเดลสำรองอัตโนมัติ
      output_config: { effort: 'medium' }, // อ่านรูปต้องพิจารณาละเอียดกว่าแชท
      // ลายมือ/ข้อมือ: แนบตำราลายมือเป็นข้อความระบบส่วนที่สอง (คงที่ → cache ได้)
      system: kind === 'palm' || kind === 'wrist'
        ? [{ type: 'text', text: SYSTEM_PROMPT }, { type: 'text', text: palmGuide(), cache_control: { type: 'ephemeral' } }]
        : [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [
        { role: 'user', content },
        { role: 'system', content: `ข้อมูลผู้ถาม:\n${profileText(body.profile)}${REPLY_LANG[lang] || ''}` },
      ],
    });

    await recordAI('reading', response.model || 'claude-opus-5-5', response.usage);
    if (response.stop_reason === 'refusal') {
      return res.status(200).json({ unclear: true, reading: 'ขออภัยค่ะ แม่หมอ AI อ่านรูปนี้ไม่ได้ ลองส่งรูปใหม่ที่เห็นเฉพาะฝ่ามือหรือใบหน้าชัด ๆ นะคะ 🙏' });
    }
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (!text) return res.status(502).json({ error: 'empty' });
    if (text.startsWith('[ภาพไม่ชัด]')) return res.status(200).json({ unclear: true, reading: text.replace('[ภาพไม่ชัด]', '').trim() });
    const m = text.match(/(?:สรุปสั้น|Summary|简要总结)\s*[:：]\s*(.+)\s*$/);
    return res.status(200).json({
      reading: m ? text.slice(0, m.index).trim() : text,
      summary: m ? m[1].trim().slice(0, 200) : text.split('\n').find((l) => l.trim())?.slice(0, 120) || '',
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'busy' });
    if (error instanceof Anthropic.AuthenticationError) return res.status(503).json({ error: 'ai_not_configured' });
    if (error instanceof Anthropic.BadRequestError) return res.status(400).json({ error: 'bad_request' });
    if (error instanceof Anthropic.APIError) return res.status(502).json({ error: 'upstream_error' });
    return res.status(500).json({ error: 'server_error' });
  }
}
