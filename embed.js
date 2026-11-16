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
  // ลิงก์กลับหน้าแรก / สมัคร / เข้าสู่ระบบ → บอกหน้าแรกให้จัดการ (ไม่ให้โหลดหน้าแรกซ้อนในโทรศัพท์)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (/^index\.html/.test(href)) {
      e.preventDefault();
      window.parent.postMessage({ type: 'mohdoo-nav', href: href }, location.origin);
    }
  }, true);
})();
