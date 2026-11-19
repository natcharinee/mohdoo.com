// ===== 3 ภาษา: ไทย · English · 中文 =====
// หน้าเว็บเขียนเป็นภาษาไทยทั้งหมด → ถ้าเลือก EN/中文 จะโหลดพจนานุกรม (i18n/en.js, i18n/zh.js)
// แล้วแปลข้อความไทยบนหน้าจอทุกจุดอัตโนมัติ รวมถึงข้อความที่สร้างทีหลัง (MutationObserver)
// เพิ่มข้อความใหม่ในโค้ด → รัน `python3 i18n/missing.py` เพื่อดูข้อความที่ยังไม่มีคำแปล
(() => {
  const KEY = 'mohdooLang';
  const LANGS = { th: 'ไทย', en: 'English', zh: '中文' };
  let lang = 'th';
  try { lang = localStorage.getItem(KEY) || 'th'; } catch (_) {}
  if (!LANGS[lang]) lang = 'th';
  window.LANG = lang;
  window.LANGS = LANGS;
  // ภาษาสำหรับเสียงพูด / วันที่
  window.LANG_LOCALE = { th: 'th-TH', en: 'en-US', zh: 'zh-CN' }[lang];

  window.setLang = (l) => {
    if (!LANGS[l] || l === lang) return;
    try { localStorage.setItem(KEY, l); } catch (_) {}
    (window.top || window).location.reload();
  };
  window.t = (s) => s; // แทนที่ด้านล่างเมื่อโหลดพจนานุกรมแล้ว
  if (lang === 'th') return;

  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  // ซ่อนหน้าไว้จนแปลเสร็จ (กันเห็นภาษาไทยแวบหนึ่ง) · ไม่เกิน 2.5 วินาที
  const hide = document.createElement('style');
  hide.textContent = 'html.i18n-wait body{visibility:hidden}';
  document.head.appendChild(hide);
  document.documentElement.classList.add('i18n-wait');
  const show = () => document.documentElement.classList.remove('i18n-wait');
  setTimeout(show, 2500);

  // วันที่: โค้ดเรียก toLocale…('th-TH') → เปลี่ยนเป็นภาษาที่เลือก
  const loc = lang === 'zh' ? 'zh-CN' : 'en-GB';
  ['toLocaleDateString', 'toLocaleTimeString', 'toLocaleString'].forEach((fn) => {
    const orig = Date.prototype[fn];
    Date.prototype[fn] = function (l, o) { return orig.call(this, typeof l === 'string' && l.startsWith('th') ? loc : l, o); };
  });

  const TH = /[\u0E01-\u0E3A\u0E40-\u0E5B]/; // อักษรไทย (ไม่นับ ฿)
  let re = null;
  let dict = null;
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const thaiLen = (s) => (s.match(/[฀-๿]/g) || []).length;

  function build(d) {
    dict = d;
    const keys = Object.keys(d).sort((a, b) => b.length - a.length);
    // คำสั้น (≤ 3 ตัวอักษรไทย) แปลเฉพาะตอนอยู่เดี่ยว ๆ ไม่ติดตัวอักษรไทยอื่น (กันแปลกลางชื่อคน)
    re = new RegExp(keys.map((k) => (thaiLen(k) <= 3 ? `(?<![\\u0E00-\\u0E7F])${esc(k)}(?![\\u0E00-\\u0E7F])` : esc(k))).join('|'), 'g');
  }
  const SPACE_BEFORE = /[A-Za-z0-9฀-๿)\]%฿»"”]/;
  const SPACE_AFTER = /[A-Za-z0-9฀-๿(\[«"“]/;
  function translate(s) {
    if (!re || !s || !TH.test(s)) return s;
    return s.replace(re, (m, off, all) => {
      let out = dict[m];
      if (out == null) return m;
      if (lang === 'en' && out) { // ภาษาไทยไม่เว้นวรรคระหว่างคำ → เติมช่องว่างให้ภาษาอังกฤษ
        if (off > 0 && SPACE_BEFORE.test(all[off - 1])) out = ` ${out}`;
        const nx = all[off + m.length];
        if (nx && SPACE_AFTER.test(nx)) out = `${out} `;
      }
      return out;
    });
  }
  window.t = translate;

  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT', 'CODE']);
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  const skipEl = (el) => !el || SKIP.has(el.nodeName) || el.closest?.('[translate="no"], [contenteditable="true"]');
  function doText(n) {
    if (!TH.test(n.nodeValue) || skipEl(n.parentElement)) return;
    const v = translate(n.nodeValue);
    if (v !== n.nodeValue) n.nodeValue = v;
  }
  function doAttrs(el) {
    if (!el || el.closest?.('[translate="no"]')) return; // ช่องกรอก (textarea) ก็แปล placeholder ได้
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v && TH.test(v)) { const tv = translate(v); if (tv !== v) el.setAttribute(a, tv); }
    }
    if (el.nodeName === 'INPUT' && (el.type === 'button' || el.type === 'submit') && TH.test(el.value)) el.value = translate(el.value);
  }
  function walk(root) {
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1) return;
    doAttrs(root);
    if (skipEl(root)) return;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) (n.nodeType === 3 ? doText(n) : doAttrs(n));
  }
  function start() {
    walk(document.documentElement);
    if (TH.test(document.title)) document.title = translate(document.title);
    new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === 'characterData') doText(m.target);
        else if (m.type === 'attributes') doAttrs(m.target);
        else m.addedNodes.forEach(walk);
      }
    }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    show();
  }

  // กล่องข้อความของเบราว์เซอร์
  ['alert', 'confirm', 'prompt'].forEach((fn) => {
    const orig = window[fn].bind(window);
    window[fn] = (msg, ...rest) => orig(translate(String(msg ?? '')), ...rest);
  });

  const s = document.createElement('script');
  s.src = `i18n/${lang}.js`;
  s.onload = () => {
    build(window.I18N_DICT || {});
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  };
  s.onerror = show;
  document.head.appendChild(s);
})();
