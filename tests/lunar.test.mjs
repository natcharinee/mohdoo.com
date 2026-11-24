// ปฏิทินจันทรคติไทย · เทียบวันสำคัญทางพุทธที่ประกาศจริง
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { thaiLunar, buddhistHolidays, yearType, fromThaiLunar } from '../lib/calc/lunar.js';

const KNOWN = {
  2010: { visakha: '2010-05-28' },
  2012: { makha: '2012-03-07', visakha: '2012-06-04', asalha: '2012-08-02' }, // ปีที่ประกาศอธิกมาสนอกวัฏจักร
  2015: { asalha: '2015-07-30' },
  2017: { makha: '2017-02-11', visakha: '2017-05-10' },
  2020: { loyKrathong: '2020-10-31' },
  2023: { makha: '2023-03-06', visakha: '2023-06-03', asalha: '2023-08-01', loyKrathong: '2023-11-27' },
  2024: { makha: '2024-02-24', visakha: '2024-05-22', asalha: '2024-07-20', loyKrathong: '2024-11-15' },
  2025: { makha: '2025-02-12', visakha: '2025-05-11', asalha: '2025-07-10', loyKrathong: '2025-11-05' },
  2026: { makha: '2026-03-03', visakha: '2026-05-31', asalha: '2026-07-29', loyKrathong: '2026-11-24' },
};

test('วันสำคัญทางพุทธตรงกับที่ประกาศ', () => {
  for (const [y, want] of Object.entries(KNOWN)) {
    const got = buddhistHolidays(+y);
    for (const [k, v] of Object.entries(want)) assert.equal(got[k], v, `${k} ${y}`);
  }
});

test('ชนิดปี: 2569 อธิกมาส · 2568 อธิกวาร · 2567 ปกติมาส', () => {
  assert.equal(yearType(2026), 'อธิกมาส');
  assert.equal(yearType(2025), 'อธิกวาร');
  assert.equal(yearType(2024), 'ปกติมาส');
});

test('แปลงวันได้ตรง และแปลงกลับได้วันเดิม', () => {
  assert.equal(thaiLunar(2026, 11, 24).text, 'ขึ้น 15 ค่ำ เดือนสิบสอง');
  assert.equal(thaiLunar(2026, 11, 24).wanPhra, 'วันเพ็ญ');
  assert.equal(thaiLunar(2025, 1, 28).text, 'แรม 15 ค่ำ เดือนยี่');
  assert.equal(thaiLunar(2569, 7, 29).text, 'ขึ้น 15 ค่ำ เดือนแปดหลัง'); // รับปี พ.ศ. ได้
  for (let t = Date.UTC(1930, 0, 1); t < Date.UTC(2120, 0, 1); t += 37 * 86400000) {
    const d = new Date(t), r = thaiLunar(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    assert.equal(fromThaiLunar(r.lunarYear, r.month, r.waxing, r.n, r.second), d.toISOString().slice(0, 10));
  }
});

test('เดือนคี่ข้างแรมมี 14 ค่ำ · วันพระ 4 ครั้งต่อเดือน · นอกช่วงคืน null', () => {
  const m3 = []; // เดือนสาม 2569
  for (let t = Date.UTC(2026, 0, 19); t <= Date.UTC(2026, 1, 16); t += 86400000) {
    const d = new Date(t); m3.push(thaiLunar(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()));
  }
  assert.ok(m3.every((x) => x.month === 3));
  assert.equal(m3.at(-1).text, 'แรม 14 ค่ำ เดือนสาม');
  assert.equal(m3.filter((x) => x.wanPhra).length, 4);
  assert.equal(thaiLunar(1900, 1, 1), null);
});
