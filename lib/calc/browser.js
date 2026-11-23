// ===== ให้หน้าเว็บ (สคริปต์แบบเดิม) ใช้ชุดคำนวณได้ผ่าน window.MohdooCalc =====
// โหลดใน index.html ด้วย <script type="module" src="lib/calc/browser.js"></script>
// ดึงตำราดูดวงล่าสุดที่ทีมแก้ในหลังบ้าน (ถ้าไม่มีเซิร์ฟเวอร์หรือดึงไม่ได้ ใช้ค่าเริ่มต้นในไฟล์)
import { computeChart, chartText } from './chart.js';
import { askScore, scoreText } from './score.js';
import { analyzeNumber, analyzePlate, analyzeName, numberText, nameText } from './numbers.js';
import { setKB, kb, DEFAULT_KB, validateTable, KB_TABLES, PAIR_LEVELS, KB_SCHEMA } from './kb.js';
import { castCoins, ichingText } from './iching.js';
import { mahabote, mahaboteText } from './mahabote.js';
import { fengshuiText } from './fengshui.js';

const ready = fetch('/api/v1/kb', { credentials: 'same-origin' })
  .then((r) => (r.ok ? r.json() : null))
  .then((j) => { if (j && j.kb) setKB(j.kb); })
  .catch(() => {});

window.MohdooCalc = {
  ready, computeChart, chartText, askScore, scoreText, analyzeNumber, analyzePlate, analyzeName, numberText, nameText,
  setKB, kb, DEFAULT_KB, validateTable, KB_TABLES, PAIR_LEVELS, KB_SCHEMA,
  castCoins, ichingText, mahabote, mahaboteText, fengshuiText,
};
