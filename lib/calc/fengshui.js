// ===== ฮวงจุ้ย: เลขกั้ว (八宅 แปดทิศ) และดาวเหินประจำปี (年飞星) =====
import { kbRows } from './kb.js'; // ชื่อ/ความหมาย 8 ทิศและดาวเหิน แก้ได้ในหลังบ้าน
// ใช้ปีจีนตามลี่ชุน · เลขกั้วต้องรู้เพศ (ชาย/หญิง) · ควรให้ซินแสของทีมตรวจตารางก่อนใช้จริง

const DIR_TH = { N: 'เหนือ', NE: 'ตะวันออกเฉียงเหนือ', E: 'ตะวันออก', SE: 'ตะวันออกเฉียงใต้', S: 'ใต้', SW: 'ตะวันตกเฉียงใต้', W: 'ตะวันตก', NW: 'ตะวันตกเฉียงเหนือ' };
// ลำดับ: 生气 天医 延年 伏位 | 祸害 五鬼 六煞 绝命
const MANSIONS = {
  1: ['SE', 'E', 'S', 'N', 'W', 'NE', 'NW', 'SW'],
  2: ['NE', 'W', 'NW', 'SW', 'E', 'SE', 'S', 'N'],
  3: ['S', 'N', 'SE', 'E', 'SW', 'NW', 'NE', 'W'],
  4: ['N', 'S', 'E', 'SE', 'NW', 'SW', 'W', 'NE'],
  6: ['W', 'NE', 'SW', 'NW', 'SE', 'E', 'N', 'S'],
  7: ['NW', 'SW', 'NE', 'W', 'N', 'S', 'SE', 'E'],
  8: ['SW', 'NW', 'W', 'NE', 'S', 'N', 'E', 'SE'],
  9: ['E', 'SE', 'N', 'S', 'NE', 'W', 'SW', 'NW'],
};
const fix = (k, five) => (k === 0 ? 9 : k === 5 ? five : k);

// เลขกั้วจากปีจีน (ตามลี่ชุน) และเพศ · เลข 5 → ชายใช้ 2 หญิงใช้ 8
export function kua(chineseYear, male) {
  const r = chineseYear % 9;
  const n = male ? fix((11 - r) % 9, 2) : fix((r + 4) % 9, 8);
  const group = [1, 3, 4, 9].includes(n) ? 'กลุ่มตะวันออก' : 'กลุ่มตะวันตก';
  const M = kbRows('mansions');
  const dirs = MANSIONS[n].map((d, i) => ({ dir: DIR_TH[d], code: d, name: M[i].name, meaning: M[i].meaning, good: i < 4 }));
  return { kua: n, group, dirs };
}

// ดาวเหินประจำปี: ดาวกลางของปี แล้วเหินตามเส้นทางลั่วซู
const PATH = ['C', 'NW', 'W', 'NE', 'S', 'N', 'SW', 'E', 'SE'];
export function annualStars(chineseYear) {
  const center = fix((11 - (chineseYear % 9)) % 9, 5);
  return PATH.map((p, i) => {
    const s = ((center - 1 + i) % 9) + 1;
    const S = kbRows('stars').find((x) => x.star === s);
    return { pos: p === 'C' ? 'กลางบ้าน' : DIR_TH[p], code: p, star: s, name: S.name, meaning: S.meaning };
  });
}

export function fengshuiText(chineseYear, male, nowYear) {
  const lines = [];
  if (male === true || male === false) {
    const k = kua(chineseYear, male);
    lines.push(`เลขกั้ว ${k.kua} (${k.group}) · ทิศดี: ${k.dirs.filter((d) => d.good).map((d) => `${d.dir} ${d.name.split(' ')[0]} ${d.meaning}`).join(' · ')} · ทิศที่ควรเลี่ยง: ${k.dirs.filter((d) => !d.good).map((d) => `${d.dir} ${d.name.split(' ')[0]}`).join(' · ')}`);
  } else {
    lines.push(`เลขกั้ว: ไม่ทราบเพศ (ถ้าเป็นชาย = ${kua(chineseYear, true).kua} · หญิง = ${kua(chineseYear, false).kua}) ให้ถามลูกค้าก่อนระบุทิศ`);
  }
  if (nowYear) lines.push(`ดาวเหินปีนี้: ${annualStars(nowYear).map((s) => `${s.pos} ${s.star}`).join(' · ')} (5 = ทิศที่ควรเลี่ยงทำของใหม่หรือรีโนเวท · 9 และ 8 = ทิศที่ควรเสริม)`);
  return lines.join('\n');
}
