// ===== ฐานข้อมูล: Postgres (ตั้ง DATABASE_URL) หรือไฟล์ JSON (ทดลอง/พัฒนา) =====
// เก็บเป็นเอกสาร (document) แยกตามกลุ่ม (coll): user · order · otp · notif · push
// คอลัมน์ค้นหา: k (คีย์รอง เช่น เบอร์โทร) · user_id · status · created_at (ms)
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { config } from './config.js';
import { fail } from './http.js';

const cols = (doc, coll) => ({
  k: doc.phone || doc.k || null,
  user_id: coll === 'user' ? doc.id : doc.user_id || null,
  status: doc.status || doc.role || null,
  created_at: doc.created_at || Date.now(),
});
const matchQ = (doc, q) => !q || JSON.stringify(doc).toLowerCase().includes(q.toLowerCase());

// ---------- ไฟล์ JSON ----------
// MOHDOO_DB_LAG_MS (ทดสอบเท่านั้น): หน่วงการอ่านให้เหมือนฐานข้อมูลจริงที่อยู่คนละเครื่อง → คำขอที่มาพร้อมกันได้แทรกกันจริง
const lagMs = Number(process.env.MOHDOO_DB_LAG_MS) || 0;
const lag = () => (lagMs ? new Promise((r) => setTimeout(r, Math.random() * lagMs)) : null);
function fileStore() {
  const file = path.join(config.dataDir, 'db.json');
  let data = {};
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { data = {}; }
  const save = () => {
    fs.mkdirSync(config.dataDir, { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, file);
  };
  const c = (coll) => (data[coll] ||= {});
  const filter = (coll, f = {}) => Object.values(c(coll)).filter((d) => {
    const x = cols(d, coll);
    if (f.user_id && x.user_id !== f.user_id) return false;
    if (f.status && !(Array.isArray(f.status) ? f.status.includes(x.status) : x.status === f.status)) return false;
    if (f.since && x.created_at < f.since) return false;
    if (f.before && x.created_at >= f.before) return false;
    if (f.where && !Object.entries(f.where).every(([k, v]) => d[k] === v)) return false;
    return matchQ(d, f.q);
  });
  return {
    kind: 'file',
    async get(coll, id) { await lag(); const d = c(coll)[id]; return d ? structuredClone(d) : null; },
    async byKey(coll, k) { const d = Object.values(c(coll)).find((x) => cols(x, coll).k === k); return d ? structuredClone(d) : null; },
    async put(coll, doc) { await lag(); c(coll)[doc.id] = structuredClone(doc); save(); return doc; },
    // เขียนเฉพาะเมื่อเวอร์ชันในฐานข้อมูลยังเป็น rev เดิม (ไม่มีใครแก้แทรก) · คืน false ถ้ามีคนแก้ไปก่อน
    async putIf(coll, doc, rev) {
      await lag();
      const cur = c(coll)[doc.id]; // ตรวจกับเขียนติดกัน (ไม่มี await คั่น) = ทำในครั้งเดียว เหมือน UPDATE ... WHERE ของ Postgres
      if (cur && (cur.rev || 0) !== rev) return false;
      c(coll)[doc.id] = structuredClone(doc); save(); return true;
    },
    async del(coll, id) { delete c(coll)[id]; save(); },
    // นับเพิ่ม 1 แบบทำในครั้งเดียว (ใช้กับ rate limit) · คืนค่าหลังเพิ่ม
    async incr(coll, id, createdAt) {
      await lag();
      const d = (c(coll)[id] ||= { id, n: 0, created_at: createdAt });
      d.n += 1; save(); return d.n;
    },
    async list(coll, f = {}) {
      const all = filter(coll, f).sort((a, b) => (f.asc ? 1 : -1) * (cols(a, coll).created_at - cols(b, coll).created_at));
      const off = f.offset || 0;
      return { rows: structuredClone(all.slice(off, off + (f.limit || 50))), total: all.length };
    },
    async count(coll, f = {}) { return filter(coll, f).length; },
    async delWhere(coll, f) { filter(coll, f).forEach((d) => delete c(coll)[d.id]); save(); },
  };
}

// ---------- Postgres ----------
async function pgStore() {
  const { default: postgres } = await import('postgres');
  const sql = postgres(config.databaseUrl, { max: 3, idle_timeout: 20, ssl: /localhost|127\.0\.0\.1/.test(config.databaseUrl) ? false : 'require',
    // CREATE TABLE/INDEX IF NOT EXISTS ตอนเริ่มทำงานทุกครั้งส่งข้อความ "already exists" (42P07) มาท่วม log → ซ่อนเฉพาะอันนี้ ข้อความอื่นยังแสดง
    onnotice: (n) => { if (n.code !== '42P07') console.warn('[pg]', n.severity, n.message); } });
  await sql`CREATE TABLE IF NOT EXISTS docs (
    coll text NOT NULL, id text NOT NULL, k text, user_id text, status text,
    created_at bigint NOT NULL, data jsonb NOT NULL, PRIMARY KEY (coll, id))`;
  await sql`CREATE INDEX IF NOT EXISTS docs_k ON docs (coll, k)`;
  await sql`CREATE INDEX IF NOT EXISTS docs_user ON docs (coll, user_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS docs_status ON docs (coll, status, created_at DESC)`;
  const where = (coll, f = {}) => {
    let w = sql`coll = ${coll}`;
    if (f.user_id) w = sql`${w} AND user_id = ${f.user_id}`;
    if (f.status) w = Array.isArray(f.status) ? sql`${w} AND status = ANY(${f.status}::text[])` : sql`${w} AND status = ${f.status}`;
    if (f.since) w = sql`${w} AND created_at >= ${f.since}`;
    if (f.before) w = sql`${w} AND created_at < ${f.before}`;
    if (f.where) Object.entries(f.where).forEach(([k, v]) => { w = sql`${w} AND data->>${k} = ${String(v)}`; });
    if (f.q) w = sql`${w} AND data::text ILIKE ${`%${f.q.replace(/[%_\\]/g, '\\$&')}%`}`;
    return w;
  };
  return {
    kind: 'postgres',
    async get(coll, id) { const [r] = await sql`SELECT data FROM docs WHERE coll = ${coll} AND id = ${id}`; return r ? r.data : null; },
    async byKey(coll, k) { const [r] = await sql`SELECT data FROM docs WHERE coll = ${coll} AND k = ${k} LIMIT 1`; return r ? r.data : null; },
    async put(coll, doc) {
      const x = cols(doc, coll);
      await sql`INSERT INTO docs (coll, id, k, user_id, status, created_at, data)
        VALUES (${coll}, ${doc.id}, ${x.k}, ${x.user_id}, ${x.status}, ${x.created_at}, ${doc}::jsonb)
        ON CONFLICT (coll, id) DO UPDATE SET k = EXCLUDED.k, user_id = EXCLUDED.user_id, status = EXCLUDED.status, data = EXCLUDED.data`;
      return doc;
    },
    async putIf(coll, doc, rev) {
      const x = cols(doc, coll);
      const r = await sql`INSERT INTO docs (coll, id, k, user_id, status, created_at, data)
        VALUES (${coll}, ${doc.id}, ${x.k}, ${x.user_id}, ${x.status}, ${x.created_at}, ${doc}::jsonb)
        ON CONFLICT (coll, id) DO UPDATE SET k = EXCLUDED.k, user_id = EXCLUDED.user_id, status = EXCLUDED.status, data = EXCLUDED.data
        WHERE COALESCE((docs.data->>'rev')::int, 0) = ${rev}
        RETURNING 1`;
      return r.length > 0;
    },
    async del(coll, id) { await sql`DELETE FROM docs WHERE coll = ${coll} AND id = ${id}`; },
    async incr(coll, id, createdAt) {
      const [r] = await sql`INSERT INTO docs (coll, id, created_at, data) VALUES (${coll}, ${id}, ${createdAt}, ${{ id, n: 1, created_at: createdAt }}::jsonb)
        ON CONFLICT (coll, id) DO UPDATE SET data = jsonb_set(docs.data, '{n}', to_jsonb(COALESCE((docs.data->>'n')::int, 0) + 1))
        RETURNING (data->>'n')::int AS n`;
      return r.n;
    },
    async list(coll, f = {}) {
      const w = where(coll, f);
      const rows = await sql`SELECT data FROM docs WHERE ${w} ORDER BY created_at ${f.asc ? sql`ASC` : sql`DESC`} LIMIT ${f.limit || 50} OFFSET ${f.offset || 0}`;
      const [{ n }] = await sql`SELECT count(*)::int AS n FROM docs WHERE ${w}`;
      return { rows: rows.map((r) => r.data), total: n };
    },
    async count(coll, f = {}) { const [{ n }] = await sql`SELECT count(*)::int AS n FROM docs WHERE ${where(coll, f)}`; return n; },
    async delWhere(coll, f) { await sql`DELETE FROM docs WHERE ${where(coll, f)}`; },
  };
}

let store;
export async function db() {
  if (!store) store = config.db === 'postgres' ? pgStore() : Promise.resolve(fileStore());
  return store;
}

// แก้เอกสารแบบกันบันทึกทับ: อ่านล่าสุด → mutate(doc) → เขียนเฉพาะเมื่อไม่มีใครแก้แทรก (rev) ไม่งั้นอ่านใหม่แล้วทำซ้ำ
// mutate แก้ doc ตรง ๆ (throw ได้ เช่น fail(403)) · ไม่มีเอกสาร → คืน null โดยไม่เรียก mutate
export async function updateDoc(coll, id, mutate, tries = 8) {
  const store = await db();
  for (let i = 0; i < tries; i++) {
    const doc = await store.get(coll, id);
    if (!doc) return null;
    const rev = doc.rev || 0;
    await mutate(doc);
    doc.rev = rev + 1;
    if (await store.putIf(coll, doc, rev)) return doc;
  }
  fail(409, 'conflict');
}

export const newId = (p) => `${p}${Date.now().toString(36)}${crypto.randomBytes(5).toString('hex')}`;
