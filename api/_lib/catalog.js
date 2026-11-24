// ===== ราคาและประเภทงาน คิดฝั่งเซิร์ฟเวอร์ (ไม่เชื่อราคาที่หน้าเว็บส่งมา) =====
// อ่านจากไฟล์ข้อมูลเดียวกับหน้าเว็บ: services-data.js · categories-data.js · shop-data.js · seers-data.js
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fail, int, str } from './http.js';

export const AI_PRICE = 150;
export const AI_DAYS = 30; // ใช้กับการให้วันเพิ่มจากหลังบ้านเท่านั้น
// สมาชิกรายเดือน: หมดอายุวันที่เดียวกันของเดือนถัดไป (สมัคร 20 พ.ย. → หมด 20 ธ.ค.) · วันที่ 29–31 ที่เดือนหน้าไม่มี → วันสุดท้ายของเดือน
export function addMonth(ts) {
  const d = new Date(ts + 7 * 3600e3); // คิดตามวันที่เวลาไทย
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.getTime() - 7 * 3600e3;
}
export const DONATION = { min: 20, max: 100000 };
// ปุ่ม 1 ดูดวง: ทุกบริการที่กรอกข้อมูล (ยกเว้นมงคลและอ่านรูป) → แม่หมอ AI ตอบทันที (ตรงกับ askNow ใน checkout.js) · หมอดูตอบเฉพาะ seer:…
export const ASK_LABEL = 'ถาม 1 เรื่อง · รับใบผลดวงทันที';
export const HUMAN_LABEL = 'ถาม 1 เรื่อง · หมอดูจริงตอบภายใน 24 ชม.';

// ขั้นตอนติดตามงาน (ตรงกับ AFTER ใน checkout.js)
export const STEPS = {
  merit: ['รับเรื่องและตรวจข้อมูล', 'ทีมทำพิธีที่สถานที่จริง', 'ส่งรูปถ่าย + วิดีโอยืนยัน'],
  shop: ['รับคำสั่งซื้อ', 'เตรียมและแพ็กสินค้า', 'จัดส่งพร้อมเลขพัสดุ'],
  digital: ['รับคำสั่งซื้อ', 'ออกแบบตามสีมงคลของคุณ', 'ส่งไฟล์ให้ดาวน์โหลด'],
};
// ประเภทงาน: ask = ถามคำถามแล้วได้ใบผลดวงทันที (40 บาท) · instant = ดูเองทันที (ไพ่/เซียมซี) · reading = หมอดูตอบ (เลือกหมอดู / บริการที่ต้องวิเคราะห์ข้อมูล) · photo = อ่านรูป (AI/หมอดู)
//           merit = ทำบุญแทน · shop / digital = สินค้า · ai = สมาชิกรายเดือน
export const KIND_NAME = { ask: 'ถามแล้วรู้ผลทันที', instant: 'ดูเองทันที', reading: 'หมอดูตอบ', photo: 'อ่านรูป', merit: 'บริการมงคล', shop: 'สินค้า', digital: 'สินค้าดิจิทัล', ai: 'สมาชิก AI' };

let cache;
function load() {
  if (cache) return cache;
  const root = process.cwd();
  const files = ['services-data.js', 'categories-data.js', 'shop-data.js', 'seers-data.js'];
  const code = `${files.map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n;\n')}
    ;({ SERVICE_PRICE, SERVICES, CATEGORY_PRICE, CATEGORIES, SHOP_ITEMS, SEER_BASE: SEER_DATA })`;
  cache = vm.runInNewContext(code, {}, { timeout: 2000 });
  applySeerEdits(cache, []);
  return cache;
}
export const catalog = () => load();

// ---------- โปรไฟล์หมอดู: ค่าตั้งต้นจาก seers-data.js + ที่ผู้ดูแลแก้/เพิ่มในหลังบ้าน (คอลเลกชัน seerprof) ----------
// SEER_ALL = ทุกโปรไฟล์ (รวมที่ซ่อน) ใช้ในหลังบ้าน · SEER_IDS = เฉพาะที่แสดงบนเว็บ (ใช้ขาย/ส่งงาน)
export const SEER_FIELDS = ['name', 'img', 'cats', 'callCoin', 'callMin', 'hidden'];
function applySeerEdits(c, edits) {
  const byId = new Map(edits.map((e) => [e.id, e]));
  const fromBase = c.SEER_BASE.map((b) => {
    const e = byId.get(b.id);
    const out = { id: b.id, name: b.name, img: b.img || '', cats: b.cats || [], callCoin: b.callCoin || 0, callMin: b.callMin || 0, hidden: false, base: true, edited: !!e };
    if (e) for (const k of SEER_FIELDS) if (e[k] !== undefined) out[k] = e[k];
    return out;
  });
  const baseIds = new Set(c.SEER_BASE.map((b) => b.id));
  const added = edits.filter((e) => !baseIds.has(e.id)).sort((a, b) => (a.created_at || 0) - (b.created_at || 0))
    .map((e) => ({ id: e.id, name: e.name, img: e.img || '', cats: e.cats || [], callCoin: e.callCoin || 0, callMin: e.callMin || 0, hidden: !!e.hidden, base: false, edited: true }));
  c.SEER_ALL = [...fromBase, ...added];
  c.SEER_IDS = c.SEER_ALL.filter((s) => !s.hidden);
}
// เรียกต้นคำขอ (v1.js) · อ่านจากฐานข้อมูลใหม่ทุก 30 วินาที หรือทันทีหลังผู้ดูแลแก้ (resetSeerProfiles)
const seerSync = { at: 0, p: null };
export async function syncSeerProfiles(store) {
  if (Date.now() - seerSync.at < 30_000) return;
  seerSync.p ||= store.list('seerprof', { limit: 1000 }).then(({ rows }) => {
    applySeerEdits(load(), rows);
    seerSync.at = Date.now();
  }).finally(() => { seerSync.p = null; });
  await seerSync.p;
}
export const resetSeerProfiles = () => { seerSync.at = 0; };

function fromService(s, tierIdx) {
  if (!s.open || s.app) fail(400, 'service_closed');
  const tier = s.prices[tierIdx];
  if (!tier || tier.price == null || tier.soon) fail(400, 'bad_tier');
  const kind = s.link ? 'instant' : s.group === 'merit' ? 'merit' : ['palm', 'face'].includes(s.id) ? 'photo' : 'ask';
  return { key: s.id, kind, title: s.name, icon: s.icon, label: tier.label, price: tier.price };
}

// key จากหน้าเว็บ (ตรงกับ item.key ใน checkout.js)
export const MAX_QTY = 20;
// opts.humanOpen = Set ของ "หมวด|ลำดับ" ที่ตอนนี้มีหมอดูจริงพร้อมรับงาน (ดู humanOpen() ใน v1.js)
export function priceOf({ key, tier = 0, donation, qty }, opts = {}) {
  const c = load();
  key = str(key, 60);
  tier = int(tier) || 0;
  let it;
  if (key === 'ai-month') it = { key, kind: 'ai', title: 'ดูดวงประจำวัน รายเดือน', icon: '🔮', label: '1 เดือน · ดวงทุกเช้า + ถาม AI ไม่จำกัด', price: AI_PRICE };
  else if (key === 'tarot') it = { key, kind: 'instant', title: 'ไพ่ทาโรต์', icon: '🃏', label: 'เปิดไพ่ 1 ครั้ง', price: c.CATEGORY_PRICE };
  else if (key.startsWith('shop:')) {
    const p = c.SHOP_ITEMS.find((x) => x.id === key.slice(5));
    if (!p) fail(400, 'unknown_item');
    const q = p.digital ? 1 : Math.max(1, Math.min(MAX_QTY, int(qty) || 1)); // สินค้าดิจิทัลสั่งได้ครั้งละ 1
    it = { key, kind: p.digital ? 'digital' : 'shop', title: p.name, icon: p.icon, label: `${q} ชิ้น`, price: p.price * q, unit: p.price, qty: q, item_id: p.id };
  } else if (key.startsWith('seer:')) {
    const s = c.SEER_IDS.find((x) => x.id === key.slice(5));
    if (!s) fail(400, 'unknown_seer');
    it = { key, kind: 'reading', title: `ดูดวงกับ ${s.name}`, icon: '🔮', label: 'ถาม 1 เรื่อง (ตอบเป็นข้อความ)', price: c.CATEGORY_PRICE, seer: s.id };
  } else if (/^[a-z-]+:\d+$/.test(key)) {
    const [catId, idx] = key.split(':');
    const t = c.CATEGORIES.find((x) => x.id === catId)?.types[+idx];
    if (!t) fail(400, 'unknown_item');
    const need = `${catId}|${+idx}`;
    if (t.off) {
      // ศาสตร์ที่ AI ตอบไม่ได้ (ไพ่สำรับเฉพาะ · จิตสัมผัส): ขายได้เฉพาะตอนมีหมอดูจริงที่ลงทะเบียนศาสตร์นี้ไว้
      if (!t.human || !opts.humanOpen?.has(need)) fail(400, 'unavailable');
      it = { key, kind: 'reading', title: t.name, icon: t.icon, label: HUMAN_LABEL, price: c.CATEGORY_PRICE, need };
    } else it = { key, kind: 'ask', title: t.name, icon: t.icon, label: ASK_LABEL, price: c.CATEGORY_PRICE };
  } else {
    const s = c.SERVICES.find((x) => x.id === key);
    if (!s) fail(400, 'unknown_item');
    it = fromService(s, tier);
  }
  // บริการมงคล: ยอด = ค่าบริการทำแทน + เงินทำบุญ (ต้องเลือก)
  it.donation = 0;
  if (it.kind === 'merit') {
    const d = int(donation);
    if (!(d >= DONATION.min && d <= DONATION.max)) fail(400, 'bad_donation', DONATION);
    it.donation = d;
    it.label = `${it.label} + เงินทำบุญ ${d.toLocaleString('th-TH')} ฿`;
  }
  it.amount = it.price + it.donation;
  it.steps = it.kind === 'merit' ? STEPS.merit : it.kind === 'shop' ? STEPS.shop : it.kind === 'digital' ? STEPS.digital : null;
  return it;
}
