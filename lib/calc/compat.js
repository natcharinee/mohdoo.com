// ===== ดวงคู่: ความเข้ากันได้ของ 2 คน จากศาสตร์จีน ไทย และตะวันตก =====
// ใช้: compatibility(profileA, profileB) → { score 2–5, items: [{ sci, text, w }], text }
import { computeChart } from './chart.js';
import { ANIMAL_TH } from './chinese.js';

const LIUHE = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];               // 六合 คู่มิตรแท้
const SANHE = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];                   // 三合 กลุ่มเดียวกัน
const HARM = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
const pairIn = (list, a, b) => list.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const EL = ['ไม้', 'ไฟ', 'ดิน', 'ทอง', 'น้ำ'];
const elOf = (s) => EL.indexOf(String(s).replace(/หยาง|หยิน/, ''));
const SIGN_EL = { เมษ: 'ไฟ', สิงห์: 'ไฟ', ธนู: 'ไฟ', พฤษภ: 'ดิน', กันย์: 'ดิน', มังกร: 'ดิน', มิถุน: 'ลม', ตุลย์: 'ลม', กุมภ์: 'ลม', กรกฎ: 'น้ำ', พิจิก: 'น้ำ', มีน: 'น้ำ' };
const ROLE_W = { ศรี: 1, เดช: 0.5, มนตรี: 1, อายุ: 0.5, บริวาร: 0.5, อุตสาหะ: 0, มูละ: 0, กาลกิณี: -1 };
const animal = (b) => ANIMAL_TH[b].split(' ')[0];

export function compatibility(a, b, nowMs) {
  const A = computeChart(a, nowMs), B = computeChart(b, nowMs);
  if (!A || !B) return null;
  const items = [];
  const na = a.name || 'คุณ', nb = b.name || 'อีกฝ่าย';

  // ---- จีน: นักษัตรปีเกิด ----
  const ya = A.chinese.year.branch, yb = B.chinese.year.branch;
  if (ya === yb) items.push([4, 6, 9, 11].includes(ya)
    ? { sci: 'ดวงจีน', w: -0.5, text: `เกิดปี${animal(ya)}เหมือนกัน ซึ่งเป็นปีที่เฮ้งตัวเอง (自刑) นิสัยเหมือนกันจนชนกันได้ ควรเปิดใจคุยกันเสมอ` }
    : { sci: 'ดวงจีน', w: 0.5, text: `เกิดปี${animal(ya)}เหมือนกัน เข้าใจมุมมองกันง่าย` });
  else if (pairIn(LIUHE, ya, yb)) items.push({ sci: 'ดวงจีน', w: 1, text: `ปี${animal(ya)}กับปี${animal(yb)} เป็นคู่หกประสาน (六合) เข้ากันดีมาก` });
  else if (ya !== yb && SANHE.some((g) => g.includes(ya) && g.includes(yb))) items.push({ sci: 'ดวงจีน', w: 1, text: `ปี${animal(ya)}กับปี${animal(yb)} อยู่กลุ่มสามประสาน (三合) เดียวกัน มองไปทางเดียวกัน` });
  else if ((ya + 6) % 12 === yb) items.push({ sci: 'ดวงจีน', w: -1, text: `ปี${animal(ya)}กับปี${animal(yb)} ชงกัน (冲) นิสัยสวนทาง ต้องใช้ความเข้าใจมาก` });
  else if (pairIn(HARM, ya, yb)) items.push({ sci: 'ดวงจีน', w: -0.5, text: `ปี${animal(ya)}กับปี${animal(yb)} เป็นคู่ไห่ (害) มีเรื่องขุ่นใจเล็ก ๆ บ่อย` });
  else items.push({ sci: 'ดวงจีน', w: 0, text: `ปี${animal(ya)}กับปี${animal(yb)} ไม่ชงไม่ประสาน อยู่ร่วมกันได้กลาง ๆ` });

  // ---- จีน: ธาตุประจำตัว (ก้านวัน) ----
  const ea = elOf(A.chinese.dayMaster), eb = elOf(B.chinese.dayMaster);
  if (ea >= 0 && eb >= 0) {
    if (ea === eb) items.push({ sci: 'ธาตุประจำตัว', w: 0.5, text: `ธาตุ${EL[ea]}เหมือนกัน เข้าใจกันง่าย แต่อาจดื้อพอกัน` });
    else if ((ea + 1) % 5 === eb) items.push({ sci: 'ธาตุประจำตัว', w: 1, text: `${na}ธาตุ${EL[ea]} ส่งเสริม${nb}ธาตุ${EL[eb]} (ธาตุก่อเกิด) ${na}เป็นฝ่ายดูแล` });
    else if ((eb + 1) % 5 === ea) items.push({ sci: 'ธาตุประจำตัว', w: 1, text: `${nb}ธาตุ${EL[eb]} ส่งเสริม${na}ธาตุ${EL[ea]} (ธาตุก่อเกิด) ${nb}เป็นฝ่ายดูแล` });
    else if ((ea + 2) % 5 === eb) items.push({ sci: 'ธาตุประจำตัว', w: -0.5, text: `ธาตุ${EL[ea]}ข่มธาตุ${EL[eb]} ${na}มักเป็นฝ่ายคุม ระวัง${nb}อึดอัด` });
    else items.push({ sci: 'ธาตุประจำตัว', w: -0.5, text: `ธาตุ${EL[eb]}ข่มธาตุ${EL[ea]} ${nb}มักเป็นฝ่ายคุม ระวัง${na}อึดอัด` });
  }

  // ---- ไทย: อีกฝ่ายเกิดวันที่ตกทักษาอะไรของเรา (ดูทั้งสองทาง) ----
  const roleOf = (X, planetN) => X.thai.taksa.find((r) => r.n === planetN)?.role;
  const rab = roleOf(A, B.thai.planet), rba = roleOf(B, A.thai.planet);
  if (rab && rba) {
    const w = ((ROLE_W[rab] ?? 0) + (ROLE_W[rba] ?? 0)) / 2;
    items.push({ sci: 'ทักษาคู่', w, text: `${nb}เกิดวัน${B.thai.astroDay} เป็น${rab}ของ${na} · ${na}เกิดวัน${A.thai.astroDay} เป็น${rba}ของ${nb}${rab === 'กาลกิณี' || rba === 'กาลกิณี' ? ' (มีกาลกิณี ควรหมั่นปรับความเข้าใจ)' : ''}` });
  }

  // ---- ตะวันตก: ธาตุราศีอาทิตย์ ----
  const sa = A.western.sun.split(' ')[0], sb = B.western.sun.split(' ')[0];
  const fa = SIGN_EL[sa], fb = SIGN_EL[sb];
  const good = (x, y) => x === y || [x, y].sort().join() === ['ไฟ', 'ลม'].sort().join() || [x, y].sort().join() === ['ดิน', 'น้ำ'].sort().join();
  items.push({ sci: 'ราศีตะวันตก', w: good(fa, fb) ? 0.5 : -0.25, text: `ราศี${sa} (ธาตุ${fa}) กับราศี${sb} (ธาตุ${fb}) ${good(fa, fb) ? 'ธาตุเข้ากันได้ดี' : 'ธาตุต่างกัน ต้องเรียนรู้กันและกัน'}` });

  const total = items.reduce((s, x) => s + x.w, 0);
  const score = total >= 2 ? 5 : total >= 1 ? 4 : total >= 0 ? 3 : 2;
  const notes = [...new Set([...A.notes, ...B.notes].filter((n) => /ลี่ชุน|ดวงจันทร์ย้าย|รุ่งเช้า/.test(n)))];
  return {
    score, items,
    text: [`ดวงคู่ ${na} กับ ${nb} (ระบบคำนวณแล้ว ห้ามคำนวณใหม่):`, ...items.map((x) => `- ${x.sci}: ${x.text}`), notes.length ? `- ข้อควรระวัง: ${notes.join(' · ')}` : ''].filter(Boolean).join('\n'),
  };
}
