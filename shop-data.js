// ===== วัตถุมงคล (ร้านค้า) · ใช้ทั้งหน้าเว็บและเซิร์ฟเวอร์ (คิดราคาฝั่งเซิร์ฟเวอร์จากไฟล์นี้) =====
// ราคาสินค้าเป็นราคาตัวอย่าง
const SHOP_ITEMS = [
  { id: 'birth-bracelet', icon: '📿', name: 'สร้อยข้อมือหินสีประจำวันเกิด', desc: 'เลือกสีหินตามวันเกิดของคุณให้อัตโนมัติ', price: 299, personal: true },
  { id: 'amethyst', icon: '💜', name: 'กำไลหินอเมทิสต์', desc: 'โทนม่วงสงบ นิยมพกเพื่อสมาธิและความรัก', price: 390 },
  { id: 'coin', icon: '🪙', name: 'เหรียญมงคลพกติดตัว', desc: 'ลายพระจันทร์ ดาว และอักขระมงคล', price: 199 },
  { id: 'candle-set', icon: '🕯️', name: 'ชุดธูปเทียนไหว้พระประจำวันเกิด', desc: 'จำนวนธูปและสีเทียนตามวันเกิด', price: 159, personal: true },
  { id: 'cloth', icon: '🧧', name: 'ผ้ามงคลลายยันต์', desc: 'ผ้าแขวนหรือพกติดตัว ลายยันต์และดาวนพเคราะห์', price: 250 },
  { id: 'wallpaper', icon: '🖼️', name: 'วอลเปเปอร์มงคลประจำเดือน', desc: 'ไฟล์ดิจิทัล ออกแบบตามสีมงคลของคุณ ส่งทางแชท', price: 49, digital: true },
];
// ----- ตัวเลือกสินค้า (สี / ขนาด): ใช้ร่วมกันทั้งหน้าเว็บและเซิร์ฟเวอร์ (api/_lib/catalog.js อ่านไฟล์นี้) -----
// p.options = [{ id, name, values: [{ id, label, img, off }]}] สูงสุด 2 กลุ่ม · p.variants = { 'v1.v4': { price, off } } (ค่าที่แก้เฉพาะแบบ)
// คืนทุกแบบ (ผลคูณของตัวเลือก): { key: 'v1.v4' (รหัสค่า คงที่แม้แก้ชื่อ), label: 'สี: แดง · ขนาด: M', price, off, img, ids }
function shopVariants(p) {
  const groups = (p.options || []).filter((g) => g.values && g.values.length);
  if (!groups.length) return [];
  let combos = [[]];
  groups.forEach((g) => { combos = combos.flatMap((c) => g.values.map((v) => [...c, { g, v }])); });
  return combos.map((c) => {
    const key = c.map((x) => x.v.id).join('.');
    const o = (p.variants || {})[key] || {};
    return {
      key, ids: c.map((x) => x.v.id), label: c.map((x) => `${x.g.name}: ${x.v.label}`).join(' · '),
      price: o.price != null ? o.price : p.price, off: !!o.off || c.some((x) => x.v.off), img: (c.find((x) => x.v.img) || { v: {} }).v.img || '',
    };
  });
}
const shopImages = (p) => (p.images && p.images.length ? p.images : p.img ? [p.img] : []);
// สินค้าที่ผู้ดูแลสร้างเองในหลังบ้าน (มีรูปได้) ต่อท้ายรายการเดิม
if (typeof window !== 'undefined' && window.SITE_CFG && window.SITE_CFG.custom_shop) window.SITE_CFG.custom_shop.forEach((c) => {
  SHOP_ITEMS.push({ id: c.id, icon: c.icon, name: c.name, desc: c.desc, price: c.price, digital: c.digital, img: c.img, images: c.images || (c.img ? [c.img] : []), options: c.options || [], variants: c.variants || {}, hidden: c.hidden, custom: true });
});
// ชื่อ คำอธิบาย ราคา และการซ่อน ตามที่ผู้ดูแลตั้งในหลังบ้าน (/api/v1/site-config.js)
if (typeof window !== 'undefined' && window.SITE_CFG && window.SITE_CFG.shop) SHOP_ITEMS.forEach((p) => {
  const o = window.SITE_CFG.shop[p.id];
  if (o) Object.assign(p, { name: o.name || p.name, desc: o.desc ?? p.desc, price: o.price ?? p.price, hidden: !!o.hidden, images: o.images || [], options: o.options || [], variants: o.variants || {} });
});
