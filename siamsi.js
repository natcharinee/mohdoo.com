// ===== หน้าเสี่ยงเซียมซี =====
const $ = (id) => document.getElementById(id);

// ไม้เซียมซีในกระบอก
const sticks = $('sticks');
for (let i = 0; i < 18; i++) {
  const s = document.createElement('span');
  s.className = 'stick';
  s.style.setProperty('--x', `${4 + (i / 17) * 100 * 0.86}%`);
  s.style.setProperty('--h', `${70 + Math.random() * 50}px`);
  s.style.setProperty('--r', `${(i - 8.5) * 1.6 + (Math.random() * 4 - 2)}deg`);
  s.style.setProperty('--d', `${Math.random() * -0.12}s`);
  sticks.appendChild(s);
}

let busy = false;
function shake() {
  if (busy) return;
  busy = true;
  $('shakeBtn').disabled = true;
  $('hint').textContent = 'กำลังเขย่า… ตั้งจิตให้มั่น';
  const tube = $('tube');
  const fallen = $('fallen');
  fallen.classList.remove('out');
  tube.classList.add('shaking');

  const idx = Math.floor(Math.random() * SIAMSI.length);
  setTimeout(() => {
    tube.classList.remove('shaking');
    $('fallenNum').textContent = idx + 1;
    void fallen.offsetWidth;
    fallen.classList.add('out');
    const r = tube.getBoundingClientRect();
    setTimeout(() => burst(r.left + r.width / 2, r.bottom + 40, 40, 200), 600);
    $('hint').textContent = `ได้ใบที่ ${idx + 1}`;
    setTimeout(() => showResult(idx), 1500);
  }, 2000);
}

function showResult(idx) {
  const d = SIAMSI[idx];
  const wish = $('wish').value.trim();
  $('rNo').textContent = idx + 1;
  $('rLv').textContent = d.lv;
  $('rLv').dataset.lv = d.lv;
  $('rWish').hidden = !wish;
  $('rWish').textContent = wish ? `เรื่องที่ถาม: “${wish}”` : '';
  $('rVerse').textContent = d.verse;
  $('rMeaning').textContent = d.meaning;
  $('rWork').textContent = d.work;
  $('rLove').textContent = d.love;
  $('rMoney').textContent = d.money;

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'mohdoo-reading', entry: {
      kind: 'siamsi', icon: '🎋', title: `เซียมซีใบที่ ${idx + 1}`, question: wish,
      no: idx + 1, lv: d.lv, verse: d.verse, meaning: d.meaning, work: d.work, love: d.love, money: d.money,
    } }, location.origin);
    $('slipBtn').hidden = false;
  }

  $('stepShake').hidden = true;
  $('result').hidden = false;
  $('hint').textContent = 'คำทำนายของคุณ';
  scrollTo({ top: 0, behavior: 'smooth' });
  busy = false;
}

$('shakeBtn').addEventListener('click', shake);
$('tube').addEventListener('click', shake);
$('againBtn').addEventListener('click', () => {
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'mohdoo-checkout', href: 'siamsi.html' }, location.origin);
    return;
  }
  $('result').hidden = true;
  $('stepShake').hidden = false;
  $('shakeBtn').disabled = false;
  $('fallen').classList.remove('out');
  $('wish').value = '';
  $('hint').textContent = 'ตั้งจิตอธิษฐานถึงเรื่องที่อยากรู้ แล้วกดเขย่ากระบอก';
});

// ใบผลดวง (เปิดในหน้าแรก)
$('slipBtn').addEventListener('click', () => window.parent.postMessage({ type: 'mohdoo-slip', kind: 'siamsi' }, location.origin));
