// ตรวจไฟล์หน้าเว็บแบบไม่ต้องเปิดเซิร์ฟเวอร์:
// - ไม่มีสคริปต์ในหน้า / onclick= ฯลฯ (CSP ห้ามไว้ → ถ้าเผลอใส่ จะใช้งานไม่ได้บนเว็บจริง)
// - ข้อมูลโครงสร้าง FAQ (about.html) ตรงกับคำถามในหน้า
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readdirSync('.').filter((f) => f.endsWith('.html'));
const js = fs.readdirSync('.').filter((f) => f.endsWith('.js'));
const strip = (t) => t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

test('ไม่มีสคริปต์ในหน้า และไม่มี on*= ในไฟล์ HTML/JS', () => {
  for (const f of html) {
    const s = fs.readFileSync(f, 'utf8');
    const inline = [...s.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/g)].filter((m) => !/type="application\/ld\+json"/.test(m[1]));
    assert.equal(inline.length, 0, `${f}: มี <script> ในหน้า`);
    assert.ok(!/\son(click|error|load|change|submit|input|keydown|mouseover|focus|blur)=/i.test(s), `${f}: มี on*= ในหน้า`);
    assert.ok(!/href="javascript:/i.test(s), `${f}: มี javascript: URL`);
  }
  for (const f of js) {
    const s = fs.readFileSync(f, 'utf8');
    assert.ok(!/\son(click|error|load|change|submit|input|keydown)=["'\\]/.test(s), `${f}: สร้าง HTML ที่มี on*=`);
  }
});

test('CSP ห้ามสคริปต์ในหน้า (ไม่มี unsafe-inline ใน script-src)', () => {
  const v = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  const csp = v.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy').value;
  const scriptSrc = csp.split(';').map((x) => x.trim()).find((x) => x.startsWith('script-src'));
  assert.ok(!scriptSrc.includes("'unsafe-inline'"), scriptSrc);
  assert.ok(!scriptSrc.includes("'unsafe-eval'"), scriptSrc);
});

test('ข้อมูลโครงสร้าง FAQ ตรงกับคำถามในหน้า about.html', () => {
  const s = fs.readFileSync('about.html', 'utf8');
  const ld = JSON.parse(s.match(/<script type="application\/ld\+json" id="faqLd">([\s\S]*?)<\/script>/)[1]);
  const list = s.match(/id="faqList"[^>]*>([\s\S]*?)<\/div>/)[1];
  const qs = [...list.matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>/g)].map((m) => [strip(m[1]), strip(m[2])]);
  assert.ok(qs.length >= 5);
  assert.deepEqual(ld.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), qs);
});
