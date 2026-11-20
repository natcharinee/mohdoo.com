// ===== หมอดู.com — เอฟเฟกต์ที่ใช้ร่วมกันทุกหน้า =====

// ---------- ท้องฟ้าดวงดาว + ดาวตก ----------
const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');
let stars = [], shooters = [], W, H, DPR;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = canvas.width = innerWidth * DPR;
  H = canvas.height = innerHeight * DPR;
  const count = Math.floor((innerWidth * innerHeight) / 2200);
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: (Math.random() * 1.3 + 0.2) * DPR,
    p: Math.random() * Math.PI * 2,
    s: Math.random() * 0.03 + 0.005,
    hue: Math.random() < 0.15 ? 45 : Math.random() < 0.3 ? 280 : 230,
  }));
}
addEventListener('resize', resize);
resize();

function spawnShooter() {
  shooters.push({
    x: Math.random() * W * 0.8 + W * 0.2,
    y: Math.random() * H * 0.4,
    vx: -(6 + Math.random() * 6) * DPR,
    vy: (3 + Math.random() * 3) * DPR,
    life: 1,
  });
}

let mx = 0, my = 0;
addEventListener('pointermove', (e) => {
  mx = (e.clientX / innerWidth - 0.5);
  my = (e.clientY / innerHeight - 0.5);
});

function draw() {
  ctx.clearRect(0, 0, W, H);
  for (const s of stars) {
    s.p += s.s;
    const a = 0.4 + Math.sin(s.p) * 0.4;
    const px = s.x - mx * 20 * s.r;
    const py = s.y - my * 20 * s.r;
    ctx.beginPath();
    ctx.fillStyle = `hsla(${s.hue}, 90%, 85%, ${a})`;
    ctx.arc(px, py, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (Math.random() < 0.012) spawnShooter();
  shooters = shooters.filter((m) => m.life > 0);
  for (const m of shooters) {
    const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 14, m.y - m.vy * 14);
    grad.addColorStop(0, `rgba(255, 240, 200, ${m.life})`);
    grad.addColorStop(1, 'rgba(255, 240, 200, 0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2 * DPR;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.x - m.vx * 14, m.y - m.vy * 14);
    ctx.stroke();
    m.x += m.vx; m.y += m.vy; m.life -= 0.012;
  }
  requestAnimationFrame(draw);
}
draw();

// ---------- ประกายวิ้ง ๆ ----------
function burst(x, y, n = 18, spread = 120) {
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    s.className = 'spark';
    const ang = Math.random() * Math.PI * 2;
    const dist = Math.random() * spread + 20;
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(ang) * dist}px`);
    s.style.setProperty('--t', `${0.6 + Math.random() * 0.6}s`);
    const size = 3 + Math.random() * 6;
    s.style.width = s.style.height = `${size}px`;
    document.body.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
  }
}

let lastTrail = 0;
addEventListener('pointermove', (e) => {
  const now = performance.now();
  if (now - lastTrail < 40) return;
  lastTrail = now;
  burst(e.clientX, e.clientY, 2, 30);
});
addEventListener('click', (e) => burst(e.clientX, e.clientY));

// ---------- Toast ----------
const toastEl = document.getElementById('toast');
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
}


// ---------- แอปหมอดู.com: บริการที่ใช้ผ่านแอปเท่านั้น (คุยสดกับหมอดู · ฮวงจุ้ยลงพื้นที่) ----------
// ใส่ลิงก์ดาวน์โหลดเมื่อได้ลิงก์จริง · ว่างไว้ = แสดงว่าเร็ว ๆ นี้
const APP_LINKS = { ios: '', android: '' };
function appCTA(text = 'บริการนี้ใช้ผ่านแอปหมอดู.com') {
  const btn = (os, icon, label) => (APP_LINKS[os]
    ? `<a class="app-dl" href="${APP_LINKS[os]}" target="_blank" rel="noopener"><span>${icon}</span>${label}</a>`
    : `<span class="app-dl off"><span>${icon}</span>${label}</span>`);
  return `<div class="app-cta"><p>📱 ${text}${APP_LINKS.ios || APP_LINKS.android ? '' : ' · ลิงก์ดาวน์โหลดจะเปิดให้เร็ว ๆ นี้'}</p>
    <div class="app-dls">${btn('ios', '', 'App Store')}${btn('android', '▶', 'Google Play')}</div></div>`;
}

// ===== แถวเลื่อนแนวนอน (.hscroll): ปุ่มลูกศร ‹ › + ลากด้วยเมาส์ได้ · ใส่ให้อัตโนมัติทุกแถวที่วาดขึ้นมา =====
(function () {
  function setup(row) {
    if (row.dataset.hs || !row.isConnected || !row.parentNode) return; // แถวถูกวาดใหม่ไปแล้ว
    row.dataset.hs = '1';
    const wrap = document.createElement('div');
    wrap.className = 'hs-wrap';
    row.parentNode.insertBefore(wrap, row);
    wrap.appendChild(row);
    const chev = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg><i class="hs-spark" aria-hidden="true"></i>`;
    wrap.insertAdjacentHTML('beforeend', `<button type="button" class="hs-btn prev" aria-label="เลื่อนไปทางซ้าย">${chev('M14.5 5.5L8 12l6.5 6.5')}</button><button type="button" class="hs-btn next" aria-label="เลื่อนไปทางขวา">${chev('M9.5 5.5L16 12l-6.5 6.5')}</button>`);
    const [prev, next] = wrap.querySelectorAll('.hs-btn');
    const paint = () => {
      const max = row.scrollWidth - row.clientWidth;
      prev.hidden = row.scrollLeft <= 4;
      next.hidden = row.scrollLeft >= max - 4 || max <= 4;
    };
    const go = (dir) => row.scrollBy({ left: dir * Math.max(160, row.clientWidth * 0.8), behavior: 'smooth' });
    prev.addEventListener('click', (e) => { e.stopPropagation(); go(-1); });
    next.addEventListener('click', (e) => { e.stopPropagation(); go(1); });
    row.addEventListener('scroll', paint, { passive: true });
    addEventListener('resize', paint);
    // ลากด้วยเมาส์ (คอมพิวเตอร์) · มือถือใช้นิ้วปัดได้อยู่แล้ว
    let drag = null;
    row.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') drag = { x: e.clientX, left: row.scrollLeft, moved: false }; });
    row.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) { drag.moved = true; row.classList.add('dragging'); }
      row.scrollLeft = drag.left - dx;
    });
    const end = () => { setTimeout(() => row.classList.remove('dragging'), 0); if (drag && drag.moved) row.dataset.justDragged = '1'; drag = null; };
    row.addEventListener('pointerup', end);
    row.addEventListener('pointerleave', end);
    // ลากเสร็จแล้วไม่ให้นับเป็นการกดการ์ด
    row.addEventListener('click', (e) => { if (row.dataset.justDragged) { e.stopPropagation(); e.preventDefault(); delete row.dataset.justDragged; } }, true);
    requestAnimationFrame(paint);
    setTimeout(paint, 400); // รูปโหลดเสร็จแล้วความกว้างเปลี่ยน
  }
  const scan = (root) => root.querySelectorAll && root.querySelectorAll('.hscroll:not([data-hs])').forEach(setup);
  new MutationObserver((list) => list.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) { if (n.matches('.hscroll')) setup(n); scan(n); } })))
    .observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => scan(document));
})();
