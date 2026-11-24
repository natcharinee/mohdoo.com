// ชุดทดสอบการคำนวณ · รัน: npm test (ใช้ node:test ในตัว ไม่ต้องลงแพ็กเกจ)
// ค่าที่คาดหวังมาจากการเทียบกับแหล่งอ้างอิงภายนอก (ระบุไว้ในแต่ละเทสต์) ถ้าเทสต์พัง แปลว่าผลคำนวณเปลี่ยน ต้องตรวจก่อน deploy
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { julianDay, sunLongitude, norm } from '../lib/calc/astro.js';
import { dayPillar } from '../lib/calc/chinese.js';
import { computeChart } from '../lib/calc/chart.js';
import { chulaYear, kalayog, kalayogOfDay, thaiBirthDay, taksa } from '../lib/calc/thai.js';
import { kua, annualStars } from '../lib/calc/fengshui.js';
import { mahabote } from '../lib/calc/mahabote.js';
import { hexagrams, castCoins } from '../lib/calc/iching.js';
import { analyzeNumber, analyzeName } from '../lib/calc/numbers.js';
import { compatibility } from '../lib/calc/compat.js';
import { findAuspicious } from '../lib/calc/auspicious.js';
import { DEFAULT_KB, validateTable, setKB, kbRows } from '../lib/calc/kb.js';

const NOW = Date.UTC(2026, 10, 23);
const P1986 = { birthdate: '1986-05-29', birthtime: '08:30', gender: 'male' };

test('ดวงอาทิตย์: วิษุวัต 20 มี.ค. 2024 03:06 UTC อยู่ที่ 0°', () => {
  const lon = norm(sunLongitude(julianDay(Date.UTC(2024, 2, 20, 3, 6))));
  assert.ok(Math.min(lon, 360 - lon) < 0.05, `ได้ ${lon}`);
});

test('ปาจื้อ 1986-05-29 = 丙寅 癸巳 癸酉 (เทียบ lunar-javascript)', () => {
  assert.equal(dayPillar(1986, 5, 29).text, '癸酉');
  const c = computeChart(P1986, NOW);
  assert.equal(c.chinese.year.text, '丙寅');
  assert.equal(c.chinese.month.text, '癸巳');
  assert.equal(c.chinese.day.text, '癸酉');
});

test('ปีจีนเปลี่ยนที่ลี่ชุน ไม่ใช่ 1 ม.ค.', () => {
  assert.equal(computeChart({ birthdate: '1986-02-03' }, NOW).chinese.year.text, '乙丑');
  assert.equal(computeChart({ birthdate: '1986-02-05' }, NOW).chinese.year.text, '丙寅');
});

test('วัยจร: ชายปีหยางเดินหน้า เริ่มราว 2–3 ขวบ', () => {
  const l = computeChart(P1986, NOW).bazi.luck;
  assert.equal(l.forward, true);
  assert.ok(l.startAge >= 2 && l.startAge <= 3, `ได้ ${l.startAge}`);
  assert.equal(l.pillars[0].text, '甲午');
});

test('จุลศักราชเปลี่ยน 16 เม.ย.', () => {
  assert.equal(chulaYear(2025, 4, 15), 1386);
  assert.equal(chulaYear(2025, 4, 16), 1387);
});

test('กาลโยค จ.ศ. 1363 1387 1388 (เทียบ myhora)', () => {
  assert.deepEqual(kalayog(1363), { cs: 1363, thongchai: 3, athibodi: 2, ubat: 2, lokawinat: 4 });
  assert.deepEqual(kalayog(1387), { cs: 1387, thongchai: 5, athibodi: 5, ubat: 4, lokawinat: 0 });
  assert.deepEqual(kalayog(1388), { cs: 1388, thongchai: 1, athibodi: 6, ubat: 0, lokawinat: 1 });
  assert.deepEqual(kalayogOfDay(2025, 6, 1).tags.map((t) => t.id), ['lokawinat']);
});

test('วันเกิดไทย: ขึ้นวันใหม่ 06:00 · พุธกลางคืน = ราหู', () => {
  assert.equal(thaiBirthDay(3, 10, 0).planet, 4);
  assert.equal(thaiBirthDay(3, 20, 0).planet, 8);
  assert.equal(thaiBirthDay(4, 5, 0).planet, 8); // พฤหัส 05:00 ยังนับเป็นคืนวันพุธ
});

test('ทักษา: ภูมิ 8 ไม่ซ้ำดาว และกาลกิณีของคนวันอาทิตย์คือศุกร์', () => {
  const t = taksa(1);
  assert.equal(new Set(t.map((r) => r.n)).size, 8);
  assert.equal(t.find((r) => r.role === 'กาลกิณี').n, 6);
});

test('ฮวงจุ้ย: ชายเกิดปีจีน 1986 = กั้ว 2 · เลข 5 ถูกแทนตามเพศ', () => {
  assert.equal(kua(1986, true).kua, 2);
  for (let y = 1950; y < 2030; y++) {
    assert.notEqual(kua(y, true).kua, 5);
    assert.notEqual(kua(y, false).kua, 5);
  }
  assert.equal(new Set(annualStars(2026).map((s) => s.star)).size, 9);
});

test('มหาโบตะ: 12 พ.ค. 1980 (ME 1342 วันจันทร์) = อธิปติ', () => {
  const r = mahabote(1980, 5, 12);
  assert.equal(r.myanmarYear, 1342);
  assert.equal(r.house.id, 'Adipati');
});

test('อี้จิง: 64 ฉบับไม่ซ้ำ · ถามซ้ำได้ผลเดิม', () => {
  const h = hexagrams();
  assert.equal(h.length, 64);
  assert.equal(new Set(h.map((x) => x.bits)).size, 64);
  assert.deepEqual(castCoins('2026-01-01|งาน').lines, castCoins('2026-01-01|งาน').lines);
});

test('เบอร์โทร: ใช้ 7 หลักท้าย · บัตรประชาชนไม่โชว์เลขเต็ม', () => {
  const p = analyzeNumber('0812345678', 'phone');
  assert.equal(p.pairs.length, 6);
  assert.equal(p.pairs.at(-1).last, true);
  const id = analyzeNumber('1103700012345', 'idcard');
  assert.equal(id.raw, 'เลขท้าย 2345');
  assert.ok(!JSON.stringify(id).includes('11037000'));
});

test('ชื่อ: ใช้งานได้และบอกอักษรกาลกิณี', () => {
  const n = analyzeName('ศุภชัย', 'ใจดี', 1); // คนวันอาทิตย์ · กาลกิณี = อักษรศุกร์
  assert.equal(n.total, 43);
  assert.deepEqual(n.kalakini.inFirst, ['ศ']);
  assert.equal(n.firstLetter.role, 'กาลกิณี');
});

test('คู่ดวง: ปีเดียวกันไม่ล้ม', () => {
  const r = compatibility({ birthdate: '1990-03-01' }, { birthdate: '1990-08-01' }, NOW);
  assert.ok(r && Number.isFinite(r.score));
});

test('หาฤกษ์: ไม่เลือกวันชงปีเกิด และไม่เลือกวันที่มีแต่กาลโยคร้าย', () => {
  const r = findAuspicious({ from: '2026-12-01', to: '2026-12-31', people: [P1986], event: 'แต่งงาน' }, 10);
  assert.equal(r.days, 31);
  for (const d of r.best) {
    assert.notEqual(d.dayPillar.branch, (2 + 6) % 12); // ปีขาลชงกับวันวอก
    assert.equal(d.kalaBad, false);
  }
  assert.equal(findAuspicious({ from: '2026-01-01', to: '2026-12-31' }).truncated, true);
});

test('ตำรา: ช่องที่ล็อกถูกคืนค่าเดิม · ขาดแถวถูกปฏิเสธ · setKB ใช้ค่าที่แก้', () => {
  const v = validateTable('iching', DEFAULT_KB.iching.map((x, i) => (i ? x : { ...x, zh: 'X', mean: 'ใหม่' })));
  assert.equal(v.ok, true);
  assert.equal(v.data[0].zh, '乾');
  assert.equal(v.data[0].mean, 'ใหม่');
  assert.equal(validateTable('mahabote', DEFAULT_KB.mahabote.slice(1)).ok, false);
  setKB({ mahabote: { data: v.ok && DEFAULT_KB.mahabote.map((x) => ({ ...x, th: 'ทดสอบ' })) } });
  assert.equal(kbRows('mahabote')[0].th, 'ทดสอบ');
  setKB({});
  assert.equal(kbRows('mahabote')[0].th, DEFAULT_KB.mahabote[0].th);
});
