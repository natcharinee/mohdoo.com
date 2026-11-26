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
// สินค้าที่ผู้ดูแลสร้างเองในหลังบ้าน (มีรูปได้) ต่อท้ายรายการเดิม
if (typeof window !== 'undefined' && window.SITE_CFG && window.SITE_CFG.custom_shop) window.SITE_CFG.custom_shop.forEach((c) => {
  SHOP_ITEMS.push({ id: c.id, icon: c.icon, name: c.name, desc: c.desc, price: c.price, digital: c.digital, img: c.img, hidden: c.hidden, custom: true });
});
// ชื่อ คำอธิบาย ราคา และการซ่อน ตามที่ผู้ดูแลตั้งในหลังบ้าน (/api/v1/site-config.js)
if (typeof window !== 'undefined' && window.SITE_CFG && window.SITE_CFG.shop) SHOP_ITEMS.forEach((p) => {
  const o = window.SITE_CFG.shop[p.id];
  if (o) Object.assign(p, { name: o.name || p.name, desc: o.desc ?? p.desc, price: o.price ?? p.price, hidden: !!o.hidden });
});
