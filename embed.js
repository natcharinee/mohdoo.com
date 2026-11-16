// ===== หน้าย่อยต้องแสดงอยู่ในม็อกอัพโทรศัพท์เสมอ =====
// - ถูกเปิดใน iframe ของหน้าแรก → โหมด embedded (ซ่อนแถบบน ใช้แถบของโทรศัพท์แทน)
// - ถูกเปิดตรง ๆ บนจอใหญ่ → พากลับไปเปิดในโทรศัพท์ที่หน้าแรก
(function () {
  var embedded = window.self !== window.top;
  var page = location.pathname.split('/').pop() || 'index.html';
  if (!embedded && window.innerWidth > 600) {
    location.replace('index.html?app=' + encodeURIComponent(page + location.search));
    return;
  }
  if (!embedded) return;
  document.documentElement.classList.add('embedded');
  var post = function (msg) { window.parent.postMessage(msg, location.origin); };
  // หน้าไพ่ / เซียมซี ต้องชำระเงินก่อน (มี ?paid=...) ไม่งั้นส่งกลับไปขั้นตอนชำระเงิน
  if ((page === 'tarot.html' || page === 'siamsi.html') && !/[?&]paid=/.test(location.search)) {
    post({ type: 'mohdoo-checkout', href: page + location.search, guard: true });
    document.documentElement.style.visibility = 'hidden';
  }
  // ลิงก์กลับหน้าแรก / สมัคร / เข้าสู่ระบบ → บอกหน้าแรกให้จัดการ (ไม่ให้โหลดหน้าแรกซ้อนในโทรศัพท์)
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
