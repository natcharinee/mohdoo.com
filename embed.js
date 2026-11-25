// ===== หน้าย่อยเปิดซ้อนอยู่ในหน้าแรกเสมอ (ใช้เมนู บัญชี และขั้นตอนชำระเงินเดียวกัน) =====
// - ถูกเปิดใน iframe ของหน้าแรก → โหมด embedded (ซ่อนแถบบน ใช้แถบของหน้าแรกแทน)
// - ถูกเปิดตรง ๆ → พากลับไปเปิดซ้อนในหน้าแรก (index.html?app=...)
(function () {
  var embedded = window.self !== window.top;
  var page = location.pathname.split('/').pop() || 'index.html';
  // โปรแกรมของเครื่องมือค้นหา (Google ฯลฯ) → แสดงหน้านี้ตรง ๆ ไม่พาไปเปิดซ้อน ให้เก็บเนื้อหาหน้านี้ได้ตาม sitemap/canonical
  // เนื้อหาเหมือนที่ผู้ใช้เห็นในหน้าแรกทุกอย่าง (ไม่ใช่ cloaking) · ผู้ใช้ทั่วไปยังเปิดซ้อนในหน้าแรกเหมือนเดิม
  var crawler = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|linespider|embedly|lighthouse|inspectiontool/i.test(navigator.userAgent || '');
  if (!embedded && crawler) { document.documentElement.classList.add('standalone'); return; }
  if (!embedded) {
    location.replace('index.html?app=' + encodeURIComponent(page + location.search));
    return;
  }
  document.documentElement.classList.add('embedded');
  var post = function (msg) { window.parent.postMessage(msg, location.origin); };
  // หน้าไพ่ / เซียมซี ต้องชำระเงินก่อน (มี ?paid=...) ไม่งั้นส่งกลับไปขั้นตอนชำระเงิน
  if ((page === 'tarot.html' || page === 'siamsi.html') && !/[?&]paid=/.test(location.search)) {
    post({ type: 'mohdoo-checkout', href: page + location.search, guard: true });
    document.documentElement.style.visibility = 'hidden';
  }
  // ลิงก์กลับหน้าแรก / สมัคร / เข้าสู่ระบบ → บอกหน้าแรกให้จัดการ (ไม่ให้โหลดหน้าแรกซ้อนกัน)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (/^index\.html/.test(href)) {
      e.preventDefault();
      post({ type: 'mohdoo-nav', href: href });
    } else if (/^(tarot|siamsi)\.html/.test(href)) {
      e.preventDefault();
      post({ type: 'mohdoo-checkout', href: href });
    }
  }, true);
})();
