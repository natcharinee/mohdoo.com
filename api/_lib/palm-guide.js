// ===== ตำราลายมือสำหรับแม่หมอ AI =====
// ค่าเริ่มต้นอยู่ที่ lib/calc/data/palm-data.js · ทีมแก้ได้ในหลังบ้าน → ตำราดูดวง → ตำราลายมือ
// เรียก loadKB() ก่อน เพื่อให้ได้ฉบับล่าสุด
import { kbRows } from '../../lib/calc/kb.js';
export const palmGuide = () => kbRows('palm')[0].text;
