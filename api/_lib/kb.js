// ===== ตำราดูดวงฝั่งเซิร์ฟเวอร์: อ่าน/บันทึกตารางที่ทีมแก้ในหลังบ้าน (กลุ่มข้อมูล 'kb') =====
// เอกสารต่อ 1 ตาราง: { id, data, reviewed, updated_at, updated_by, versions: [{ at, by, data, reviewed, note }] }
// เก็บย้อนหลัง 20 เวอร์ชันไว้ย้อนกลับได้
import { db } from './db.js';
import { setKB, KB_TABLES, DEFAULT_KB, validateTable } from '../../lib/calc/kb.js';

const TTL = 60e3; // อ่านซ้ำจากฐานข้อมูลอย่างมากทุก 60 วินาที
const KEEP = 20;
let loadedAt = 0;
let cache = {};

export async function kbOverrides() {
  if (Date.now() - loadedAt < TTL) return cache;
  const store = await db();
  const out = {};
  for (const id of Object.keys(KB_TABLES)) {
    const d = await store.get('kb', id);
    if (d && Array.isArray(d.data)) out[id] = { data: d.data, reviewed: !!d.reviewed, updated_at: d.updated_at, updated_by: d.updated_by };
  }
  cache = out;
  loadedAt = Date.now();
  return out;
}

// เรียกก่อนคำนวณดวงทุกครั้ง (ราคาถูก เพราะมีแคช)
export async function loadKB() {
  try { setKB(await kbOverrides()); } catch (e) { console.error('[kb]', e); }
}

export async function kbDoc(id) {
  return (await db()).get('kb', id);
}

// บันทึกตาราง · data = null คือคืนค่าเริ่มต้น
export async function saveKB(id, { data, reviewed, note }, by) {
  if (!KB_TABLES[id]) return { ok: false, error: 'ไม่รู้จักตารางนี้' };
  const store = await db();
  const prev = await store.get('kb', id);
  let clean = null;
  if (data !== null) {
    const v = validateTable(id, data);
    if (!v.ok) return v;
    clean = v.data;
  }
  const versions = (prev?.versions || []);
  if (prev && Array.isArray(prev.data)) versions.unshift({ at: prev.updated_at, by: prev.updated_by, data: prev.data, reviewed: !!prev.reviewed, note: prev.note || '' });
  const doc = {
    id, data: clean ?? DEFAULT_KB[id], reviewed: !!reviewed, note: String(note || '').slice(0, 200),
    updated_at: Date.now(), updated_by: by, created_at: prev?.created_at || Date.now(), versions: versions.slice(0, KEEP),
  };
  await store.put('kb', doc);
  loadedAt = 0; // ให้โหลดใหม่ครั้งถัดไป
  return { ok: true, doc };
}
