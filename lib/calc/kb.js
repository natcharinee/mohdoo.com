// ===== ตำราดูดวง (Knowledge base) ที่ทีมแก้ได้จากหลังบ้าน → "ตำราดูดวง" =====
// ค่าในไฟล์นี้คือค่าเริ่มต้น ถ้าทีมแก้ในหลังบ้าน ระบบจะเรียก setKB() ด้วยค่าที่บันทึกไว้ทับค่าเริ่มต้น
//   · หน้าเว็บ: lib/calc/browser.js ดึง GET /api/v1/kb แล้วเรียก setKB()
//   · เซิร์ฟเวอร์: api/_lib/kb.js อ่านจากฐานข้อมูลแล้วเรียก setKB()
// ตารางที่แก้ได้: pairs (คู่เลข) · planets (สีและอักษรประจำดาว ใช้ดูทักษา/กาลกิณี) · values (ค่าตัวอักษรเลขศาสตร์)

export const KB_TABLES = {
  pairs: 'คู่เลข (เบอร์โทร ทะเบียน บ้านเลขที่)',
  planets: 'สีและอักษรประจำดาว (ทักษา · อักษรกาลกิณี)',
  values: 'ค่าตัวอักษรเลขศาสตร์ (ผลรวมชื่อ · ทะเบียน)',
};

export const PAIR_LEVELS = { good: 'ดี', mixed: 'มีทั้งดีและต้องระวัง', neutral: 'กลาง ๆ', bad: 'ควรระวัง' };

// เลขคู่กลับหน้า-หลังใช้ความหมายเดียวกัน (14 = 41) เว้นแต่ใส่คู่กลับไว้แยกเอง
export const DEFAULT_KB = {
  pairs: [
    { pair: '14', level: 'good', text: 'การเงิน การค้าขาย ใช้สติปัญญาหาเงิน' },
    { pair: '15', level: 'good', text: 'เสน่ห์ ผู้ใหญ่เมตตา ความสำเร็จ' },
    { pair: '19', level: 'good', text: 'ความสำเร็จ การเดินทาง ชื่อเสียง' },
    { pair: '24', level: 'good', text: 'เสน่ห์ การเจรจา คนรักใคร่' },
    { pair: '36', level: 'good', text: 'ความรัก เสน่ห์ ศิลปะ ความบันเทิง' },
    { pair: '44', level: 'good', text: 'สติปัญญา การสื่อสาร ความมั่นคง' },
    { pair: '45', level: 'good', text: 'ความสำเร็จ อำนาจ เจรจาได้ผล' },
    { pair: '55', level: 'good', text: 'ผู้ใหญ่อุปถัมภ์ ความน่าเชื่อถือ' },
    { pair: '56', level: 'good', text: 'โชคลาภ ความสุข การเงินไหลเวียน' },
    { pair: '59', level: 'good', text: 'สิ่งศักดิ์สิทธิ์คุ้มครอง ความสำเร็จ' },
    { pair: '89', level: 'good', text: 'การเงิน ความสำเร็จ งานต่างประเทศ' },
    { pair: '99', level: 'good', text: 'ความศักดิ์สิทธิ์ ความสงบ' },
    { pair: '16', level: 'mixed', text: 'การเงินและความรักดี แต่ระวังเรื่องใจ' },
    { pair: '78', level: 'mixed', text: 'อำนาจ ทรัพย์สิน ทางลัด แต่ต้องรักษาความสัมพันธ์' },
    { pair: '11', level: 'mixed', text: 'ความเป็นผู้นำ แต่ระวังความดื้อดึง' },
    { pair: '22', level: 'mixed', text: 'ความอ่อนโยน แต่ใจไม่นิ่ง' },
    { pair: '33', level: 'mixed', text: 'ความกล้า แต่ใจร้อน' },
    { pair: '66', level: 'mixed', text: 'เสน่ห์มาก แต่ระวังใช้จ่ายเกินตัว' },
    { pair: '88', level: 'mixed', text: 'ไหวพริบ แต่ระวังความไม่แน่นอน' },
    { pair: '00', level: 'bad', text: 'ความว่างเปล่า สิ่งที่ทำค้างคา' },
    { pair: '07', level: 'bad', text: 'อุปสรรค ความล่าช้า' },
    { pair: '12', level: 'bad', text: 'ความขัดแย้งในใจ ความลังเล' },
    { pair: '13', level: 'bad', text: 'ใจร้อน การทะเลาะ' },
    { pair: '17', level: 'bad', text: 'ความกดดัน การงานติดขัด' },
    { pair: '18', level: 'bad', text: 'ปัญหาสุขภาพและการเงินรั่วไหล' },
    { pair: '27', level: 'bad', text: 'ความเหงา ความกังวล' },
    { pair: '28', level: 'bad', text: 'อารมณ์แปรปรวน ความไม่มั่นคง' },
    { pair: '34', level: 'bad', text: 'ปากเสียง การโต้เถียง' },
    { pair: '37', level: 'bad', text: 'อุบัติเหตุ ความเร่งรีบ' },
    { pair: '47', level: 'bad', text: 'ความเครียด ความผิดหวังจากคำพูด' },
    { pair: '48', level: 'bad', text: 'การถูกหลอก ข่าวลือ' },
    { pair: '57', level: 'bad', text: 'อุปสรรคจากผู้ใหญ่ ความล่าช้า' },
    { pair: '58', level: 'bad', text: 'การตัดสินใจผิดพลาด' },
    { pair: '67', level: 'bad', text: 'ความรักมีอุปสรรค' },
    { pair: '68', level: 'bad', text: 'การใช้จ่ายฟุ่มเฟือย หลงผิด' },
    { pair: '77', level: 'bad', text: 'ความกดดันซ้ำซ้อน' },
  ],
  // เลขดาวแบบไทย: 1 อาทิตย์ 2 จันทร์ 3 อังคาร 4 พุธ 5 พฤหัสบดี 6 ศุกร์ 7 เสาร์ 8 ราหู
  planets: [
    { n: 1, name: 'อาทิตย์', color: 'แดง', letters: 'อะาำิีึืุูเแโใไัฤฦ' },
    { n: 2, name: 'จันทร์', color: 'เหลือง / ครีม', letters: 'กขฃคฅฆง' },
    { n: 3, name: 'อังคาร', color: 'ชมพู', letters: 'จฉชซฌญ' },
    { n: 4, name: 'พุธ', color: 'เขียว', letters: 'ฎฏฐฑฒณ' },
    { n: 5, name: 'พฤหัสบดี', color: 'ส้ม / แสด', letters: 'บปผฝพฟภม' },
    { n: 6, name: 'ศุกร์', color: 'ฟ้า / น้ำเงิน', letters: 'ศษสหฬฮ' },
    { n: 7, name: 'เสาร์', color: 'ม่วง', letters: 'ดตถทธน' },
    { n: 8, name: 'ราหู', color: 'เทา / ดำ', letters: 'ยรลว' },
  ],
  values: [
    { v: 1, chars: 'กดถทภฤุ่ำา' }, { v: 2, chars: 'ขชงบปแเู้' }, { v: 3, chars: 'ฆตฑฒ๋' },
    { v: 4, chars: 'คธญรษะโัิ' }, { v: 5, chars: 'ฉณฌนมหฮฎึฬ' }, { v: 6, chars: 'จลวอใ็' },
    { v: 7, chars: 'ซศสีื๊' }, { v: 8, chars: 'ยผฝพฟๆ' }, { v: 9, chars: 'ฏฐไ์' },
  ],
};

// ---------- ตรวจความถูกต้อง (ใช้ทั้งหลังบ้านและเซิร์ฟเวอร์) ----------
// คืน { ok, data, error } · data คือค่าที่ทำความสะอาดแล้ว
export function validateTable(id, raw) {
  const err = (e) => ({ ok: false, error: e });
  if (!Array.isArray(raw)) return err('ข้อมูลต้องเป็นรายการ');
  const clean = (s, n) => String(s ?? '').replace(/[<>]/g, '').trim().slice(0, n);
  if (id === 'pairs') {
    if (raw.length > 100) return err('คู่เลขได้ไม่เกิน 100 คู่');
    const seen = new Set();
    const data = [];
    for (const r of raw) {
      const pair = String(r?.pair ?? '').trim();
      if (!/^\d\d$/.test(pair)) return err(`"${clean(pair, 6)}" ไม่ใช่คู่เลข 2 หลัก`);
      if (seen.has(pair)) return err(`คู่ ${pair} ซ้ำ`);
      if (!PAIR_LEVELS[r.level]) return err(`ระดับของคู่ ${pair} ไม่ถูกต้อง`);
      seen.add(pair);
      data.push({ pair, level: r.level, text: clean(r.text, 120) });
    }
    return { ok: true, data };
  }
  if (id === 'planets') {
    if (raw.length !== 8) return err('ต้องมีครบ 8 ดาว');
    const owner = {};
    const data = [];
    for (const d of DEFAULT_KB.planets) {
      const r = raw.find((x) => Number(x?.n) === d.n);
      if (!r) return err(`ไม่มีดาว${d.name}`);
      const letters = [...new Set([...String(r.letters || '').replace(/[\s,]/g, '')])].join('');
      if (!letters) return err(`ดาว${d.name} ต้องมีอักษรอย่างน้อย 1 ตัว`);
      if (!/^[ก-๏]+$/.test(letters)) return err(`อักษรของดาว${d.name} ต้องเป็นอักษรไทยเท่านั้น`);
      for (const ch of letters) { if (owner[ch]) return err(`อักษร "${ch}" อยู่ทั้งดาว${owner[ch]}และดาว${d.name}`); owner[ch] = d.name; }
      data.push({ n: d.n, name: d.name, color: clean(r.color, 40) || d.color, letters });
    }
    return { ok: true, data };
  }
  if (id === 'values') {
    if (raw.length !== 9) return err('ต้องมีครบเลข 1–9');
    const owner = {};
    const data = [];
    for (let v = 1; v <= 9; v++) {
      const r = raw.find((x) => Number(x?.v) === v);
      if (!r) return err(`ไม่มีเลข ${v}`);
      const chars = [...new Set([...String(r.chars || '').replace(/[\s,]/g, '')])].join('');
      if (!/^[ก-๏]*$/.test(chars)) return err(`ค่าเลข ${v} ต้องเป็นอักษรไทยเท่านั้น`);
      for (const ch of chars) { if (owner[ch]) return err(`อักษร "${ch}" อยู่ทั้งเลข ${owner[ch]} และเลข ${v}`); owner[ch] = v; }
      data.push({ v, chars });
    }
    return { ok: true, data };
  }
  return err('ไม่รู้จักตารางนี้');
}

// ---------- ค่าที่ใช้อยู่ตอนนี้ ----------
let current = DEFAULT_KB;
let reviewed = { pairs: false, planets: false, values: false };
let maps = null;

// overrides = { pairs: { data, reviewed }, planets: {...}, values: {...} } (ส่วนที่ไม่มี = ใช้ค่าเริ่มต้น)
export function setKB(overrides = {}) {
  const next = { ...DEFAULT_KB };
  const rv = { pairs: false, planets: false, values: false };
  Object.keys(KB_TABLES).forEach((id) => {
    const o = overrides && overrides[id];
    if (!o) return;
    const v = validateTable(id, o.data);
    if (v.ok) { next[id] = v.data; rv[id] = !!o.reviewed; }
  });
  current = next;
  reviewed = rv;
  maps = null;
}
export const kb = () => current;
export const kbReviewed = (id) => !!reviewed[id];

function build() {
  const pairs = {};
  current.pairs.forEach((r) => { pairs[r.pair] = r; });
  current.pairs.forEach((r) => { const rev = r.pair[1] + r.pair[0]; if (!pairs[rev]) pairs[rev] = r; });
  const letterPlanet = {};
  const planet = {};
  current.planets.forEach((p) => { planet[p.n] = p; [...p.letters].forEach((ch) => (letterPlanet[ch] = p.n)); });
  const value = {};
  current.values.forEach((r) => [...r.chars].forEach((ch) => (value[ch] = r.v)));
  maps = { pairs, letterPlanet, planet, value };
  return maps;
}
export const kbMaps = () => maps || build();
