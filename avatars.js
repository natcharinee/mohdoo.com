// ===== อวตารประจำตัว (วาดใหม่เองทั้งหมดด้วย SVG) + รูปจากเครื่องของลูกค้า =====
// u.avatar = { k: 'moon' } (อวตารในชุด) หรือ { img: 'data:image/jpeg;base64,…' } (รูปที่เลือกจากเครื่อง) · ไม่มี = ตัวอักษรแรกของชื่อ
const AV_G = '#f6d27a';
const avBg = (id, a, b) => `<defs><radialGradient id="${id}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs><circle cx="50" cy="50" r="50" fill="url(#${id})"/>`;
// เทพ · สายมู (วาดเป็นสัญลักษณ์ ไม่วาดใบหน้าเหมือนจริง เพื่อความเคารพ · ไม่ใช้พระพุทธรูป)
const DEITY_AVATARS = [
  { k: 'ganesha', g: 'deity', name: 'พระพิฆเนศ', svg: `${avBg('gganesha', '#fdba74', '#9a3412')}<ellipse cx="29" cy="50" rx="13" ry="17" fill="#fde7c7"/><ellipse cx="71" cy="50" rx="13" ry="17" fill="#fde7c7"/><circle cx="50" cy="48" r="18" fill="#fff4e0"/><path d="M50 58c0 12-2 18-9 21c-5 2-6-3-3-5" fill="none" stroke="#fff4e0" stroke-width="7" stroke-linecap="round"/><path d="M58 60l8 6" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="43" cy="46" r="2.2" fill="#7c2d12"/><circle cx="57" cy="46" r="2.2" fill="#7c2d12"/><path d="M47 39h6" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/><path d="M37 33l4-15l9 8l9-8l4 15z" fill="${AV_G}"/>` },
  { k: 'guanyin', g: 'deity', name: 'เจ้าแม่กวนอิม', svg: `${avBg('gguanyin', '#99f6e4', '#115e59')}<circle cx="50" cy="40" r="22" fill="none" stroke="${AV_G}" stroke-width="2.5"/><path d="M28 84c2-22 10-34 22-34s20 12 22 34z" fill="#f0fdfa"/><path d="M38 48c0-14 5-20 12-20s12 6 12 20c-4-4-8-6-12-6s-8 2-12 6z" fill="#f0fdfa"/><circle cx="50" cy="40" r="7" fill="#fde7c7"/><path d="M64 60c6-4 8-12 6-18" fill="none" stroke="#a7f3d0" stroke-width="2.5" stroke-linecap="round"/><path d="M60 62h8l-1 9h-6z" fill="${AV_G}"/>` },
  { k: 'vessavana', g: 'deity', name: 'ท้าวเวสสุวรรณ', svg: `${avBg('gvess', '#5eead4', '#1e3a5f')}<path d="M30 58l4-26l9 10l7-22l7 22l9-10l4 26z" fill="${AV_G}"/><path d="M30 58h40v6H30z" fill="#fbbf24"/><circle cx="50" cy="38" r="3" fill="#dc2626"/><rect x="47" y="64" width="6" height="18" rx="3" fill="#e2e8f0"/><circle cx="50" cy="84" r="5" fill="${AV_G}"/>` },
  { k: 'naga', g: 'deity', name: 'พญานาค', svg: `${avBg('gnaga', '#4ade80', '#14532d')}<path d="M28 82c0-18 44-10 42-30c-2-14-22-12-20-26" fill="none" stroke="${AV_G}" stroke-width="9" stroke-linecap="round"/><path d="M50 26c-6-2-9-8-6-14c4 4 8 4 12 0c3 6 0 12-6 14z" fill="${AV_G}"/><path d="M43 13l2-6l3 5M57 13l-2-6l-3 5" stroke="${AV_G}" stroke-width="2.5" stroke-linecap="round" fill="none"/><circle cx="48" cy="19" r="1.6" fill="#14532d"/><circle cx="53" cy="19" r="1.6" fill="#14532d"/>${[34, 46, 58].map((y, i) => `<circle cx="${[40, 58, 47][i]}" cy="${y + 20}" r="1.8" fill="#bbf7d0"/>`).join('')}` },
  { k: 'rahu', g: 'deity', name: 'พระราหู', svg: `${avBg('grahu', '#4c1d95', '#0b0620')}<circle cx="50" cy="50" r="26" fill="none" stroke="${AV_G}" stroke-width="3" opacity=".9"/>${Array.from({ length: 16 }, (_, i) => `<rect x="49" y="14" width="2" height="7" rx="1" fill="${AV_G}" opacity=".7" transform="rotate(${i * 22.5} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="21" fill="#05020f"/><path d="M42 58l3 6l3-6M52 58l3 6l3-6" fill="#f8fafc"/><circle cx="43" cy="46" r="2.5" fill="#f87171"/><circle cx="57" cy="46" r="2.5" fill="#f87171"/>` },
  { k: 'garuda', g: 'deity', name: 'พญาครุฑ', svg: `${avBg('ggaruda', '#f87171', '#7f1d1d')}<path d="M50 44c-8-10-22-14-34-10c8 4 10 10 10 16c8-2 16-2 24 2z" fill="${AV_G}"/><path d="M50 44c8-10 22-14 34-10c-8 4-10 10-10 16c-8-2-16-2-24 2z" fill="${AV_G}"/><path d="M42 52h16l-3 26h-10z" fill="#fde68a"/><circle cx="50" cy="38" r="7" fill="#fde68a"/><path d="M50 40l5 3l-5 1z" fill="#b45309"/><path d="M44 31l3-10l3 6l3-6l3 10z" fill="${AV_G}"/>` },
  { k: 'lakshmi', g: 'deity', name: 'พระแม่ลักษมี', svg: `${avBg('glakshmi', '#f9a8d4', '#831843')}<path d="M50 36c7 9 7 21 0 30c-7-9-7-21 0-30z" fill="#fff1f2"/><path d="M50 66c-3-11-12-18-22-18c2 11 11 18 22 18z" fill="#fce7f3"/><path d="M50 66c3-11 12-18 22-18c-2 11-11 18-22 18z" fill="#fce7f3"/>${[[30, 26], [70, 24], [24, 74], [76, 72]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${AV_G}"/><circle cx="${x}" cy="${y}" r="1.6" fill="#b45309"/>`).join('')}<path d="M32 74h36" stroke="${AV_G}" stroke-width="4" stroke-linecap="round"/>` },
  { k: 'caishen', g: 'deity', name: 'ไฉ่ซิงเอี๊ยะ', svg: `${avBg('gcaishen', '#ef4444', '#7f1d1d')}<path d="M24 56c4 14 14 20 26 20s22-6 26-20c-8 4-16 4-26 4s-18 0-26-4z" fill="${AV_G}"/><ellipse cx="50" cy="52" rx="13" ry="10" fill="#fde68a"/><path d="M30 40h40l-6-10H36z" fill="#1f2937"/><path d="M26 40h48" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="34" r="3" fill="${AV_G}"/><circle cx="26" cy="24" r="4" fill="${AV_G}"/><rect x="25" y="23" width="2" height="2" fill="#7f1d1d"/><circle cx="76" cy="26" r="3.5" fill="${AV_G}"/>` },
  { k: 'trimurti', g: 'deity', name: 'พระตรีมูรติ', svg: `${avBg('gtrimurti', '#c084fc', '#4a044e')}<circle cx="50" cy="38" r="15" fill="#fde68a" opacity=".9"/><circle cx="38" cy="58" r="15" fill="#f9a8d4" opacity=".85"/><circle cx="62" cy="58" r="15" fill="#93c5fd" opacity=".85"/><circle cx="50" cy="51" r="5" fill="#fff"/><path d="M50 18v-4M30 70l-3 3M70 70l3 3" stroke="${AV_G}" stroke-width="2.5" stroke-linecap="round"/>` },
  { k: 'nangkwak', g: 'deity', name: 'นางกวัก', svg: `${avBg('gkwak', '#fca5a5', '#991b1b')}<path d="M36 74V48c0-3 4-3 4 0v-12c0-3 4-3 4 0v-4c0-3 4-3 4 0v4c0-3 4-3 4 0v10l3-5c2-3 6-1 5 2l-5 13c-2 6-4 9-4 14z" fill="#fff1e6"/><path d="M34 74h24" stroke="${AV_G}" stroke-width="4" stroke-linecap="round"/>${[[70, 30], [74, 46], [66, 60]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${AV_G}"/><rect x="${x - 1.4}" y="${y - 1.4}" width="2.8" height="2.8" fill="#991b1b"/>`).join('')}<path d="M24 30l3 3M22 42h4M24 54l3-3" stroke="#fde68a" stroke-width="2" stroke-linecap="round"/>` },
];
const AVATARS = [
  { k: 'moon', name: 'จันทร์เสี้ยว', svg: `${avBg('gmoon', '#3b2a8f', '#120a3a')}<mask id="mmoon"><rect width="100" height="100" fill="#fff"/><circle cx="59" cy="42" r="19" fill="#000"/></mask><circle cx="46" cy="52" r="24" fill="${AV_G}" mask="url(#mmoon)"/><circle cx="72" cy="30" r="2.5" fill="#fff"/><circle cx="78" cy="48" r="1.8" fill="#fff"/><circle cx="66" cy="70" r="1.5" fill="#fff"/>` },
  { k: 'sun', name: 'สุริยะ', svg: `${avBg('gsun', '#ffb35c', '#c2410c')}<circle cx="50" cy="50" r="17" fill="#fff3c4"/>${Array.from({ length: 12 }, (_, i) => `<rect x="48" y="14" width="4" height="12" rx="2" fill="#fff3c4" transform="rotate(${i * 30} 50 50)"/>`).join('')}` },
  { k: 'ball', name: 'ลูกแก้ว', svg: `${avBg('gball', '#8b5cf6', '#2e1065')}<circle cx="50" cy="45" r="21" fill="#c4b5fd" opacity=".9"/><circle cx="43" cy="38" r="6" fill="#fff" opacity=".7"/><path d="M33 70h34l-5-8H38z" fill="${AV_G}"/><rect x="30" y="70" width="40" height="6" rx="3" fill="${AV_G}"/>` },
  { k: 'lotus', name: 'บัวบูชา', svg: `${avBg('glotus', '#f9a8d4', '#9d174d')}<path d="M50 30c8 10 8 24 0 34c-8-10-8-24 0-34z" fill="#fff0f6"/><path d="M50 64c-4-12-14-20-24-20c2 12 12 20 24 20z" fill="#fce7f3"/><path d="M50 64c4-12 14-20 24-20c-2 12-12 20-24 20z" fill="#fce7f3"/><path d="M28 68h44" stroke="${AV_G}" stroke-width="4" stroke-linecap="round"/>` },
  { k: 'eye', name: 'ตาทิพย์', svg: `${avBg('geye', '#6366f1', '#1e1b4b')}<path d="M18 50c10-14 22-20 32-20s22 6 32 20c-10 14-22 20-32 20s-22-6-32-20z" fill="#e0e7ff"/><circle cx="50" cy="50" r="11" fill="#4338ca"/><circle cx="50" cy="50" r="5" fill="#0b0730"/><circle cx="46" cy="46" r="2.5" fill="#fff"/>` },
  { k: 'planet', name: 'ดาวเคราะห์', svg: `${avBg('gplan', '#2dd4bf', '#134e4a')}<circle cx="50" cy="50" r="17" fill="#ccfbf1"/><ellipse cx="50" cy="52" rx="32" ry="9" fill="none" stroke="${AV_G}" stroke-width="4" transform="rotate(-18 50 52)"/><circle cx="24" cy="26" r="2" fill="#fff"/><circle cx="78" cy="74" r="2" fill="#fff"/>` },
  { k: 'star', name: 'ดาวนำโชค', svg: `${avBg('gstar', '#fde68a', '#b45309')}<path d="M50 18c3 18 14 29 32 32c-18 3-29 14-32 32c-3-18-14-29-32-32c18-3 29-14 32-32z" fill="#fffbeb"/><circle cx="76" cy="24" r="3" fill="#fff"/>` },
  { k: 'cat', name: 'แมวดำนำโชค', svg: `${avBg('gcat', '#a78bfa', '#3b0764')}<path d="M30 78c0-16 6-28 20-28s20 12 20 28z" fill="#140a2e"/><path d="M34 44l2-18l12 10h4l12-10l2 18c0 10-8 16-16 16s-16-6-16-16z" fill="#140a2e"/><ellipse cx="43" cy="44" rx="3" ry="4" fill="${AV_G}"/><ellipse cx="57" cy="44" rx="3" ry="4" fill="${AV_G}"/>` },
  { k: 'mountain', name: 'ภูเขาจันทร์', svg: `${avBg('gmnt', '#34d399', '#064e3b')}<circle cx="64" cy="32" r="9" fill="#fef9c3"/><path d="M14 76l24-34l12 16l10-12l26 30z" fill="#ecfdf5"/><path d="M38 42l6 9l-6-2l-5 3z" fill="#a7f3d0"/>` },
  { k: 'cloud', name: 'เมฆมงคล', svg: `${avBg('gcld', '#60a5fa', '#1e3a8a')}<path d="M28 62a12 12 0 0 1 4-23a16 16 0 0 1 30-4a12 12 0 0 1 10 23z" fill="#eff6ff"/><circle cx="30" cy="26" r="2" fill="#fff"/><circle cx="76" cy="72" r="2.5" fill="${AV_G}"/><circle cx="66" cy="78" r="1.5" fill="#fff"/>` },
  { k: 'candle', name: 'เทียนอธิษฐาน', svg: `${avBg('gcdl', '#fb7185', '#7f1d1d')}<rect x="42" y="46" width="16" height="30" rx="3" fill="#fff1f2"/><path d="M50 24c6 8 7 14 0 20c-7-6-6-12 0-20z" fill="${AV_G}"/><path d="M50 32c2 4 2 7 0 9c-2-2-2-5 0-9z" fill="#fff"/><rect x="34" y="74" width="32" height="5" rx="2.5" fill="${AV_G}"/>` },
  { k: 'clover', name: 'ใบโคลเวอร์', svg: `${avBg('gclv', '#86efac', '#14532d')}${[0, 90, 180, 270].map((r) => `<circle cx="50" cy="36" r="11" fill="#f0fdf4" transform="rotate(${r} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="5" fill="${AV_G}"/><path d="M52 58q4 14 12 20" stroke="#f0fdf4" stroke-width="4" fill="none" stroke-linecap="round"/>` },
  { k: 'koi', name: 'ปลาคาร์ปมงคล', svg: `${avBg('gkoi', '#7dd3fc', '#075985')}<path d="M24 52c10-16 34-18 48-4c-14 14-38 12-48 4z" fill="#fff7ed"/><path d="M70 48l12-10v24z" fill="#fb923c"/><path d="M38 42c4 4 10 4 14 0M44 58c4-3 9-3 12 0" stroke="#f97316" stroke-width="5" stroke-linecap="round" fill="none"/><circle cx="32" cy="49" r="2" fill="#0c4a6e"/><circle cx="30" cy="28" r="3" fill="none" stroke="#e0f2fe" stroke-width="1.5"/><circle cx="38" cy="22" r="2" fill="none" stroke="#e0f2fe" stroke-width="1.5"/>` },
  { k: 'coin', name: 'เหรียญทองจีน', svg: `${avBg('gcoin', '#fde047', '#a16207')}<circle cx="50" cy="50" r="24" fill="${AV_G}" stroke="#fff7d6" stroke-width="3"/><rect x="43" y="43" width="14" height="14" fill="#a16207" stroke="#fff7d6" stroke-width="2"/>${[[50, 34], [66, 50], [50, 66], [34, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="#a16207"/>`).join('')}<path d="M50 74v10M44 84h12" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>` },
  { k: 'butterfly', name: 'ผีเสื้อนำโชค', svg: `${avBg('gbfly', '#d8b4fe', '#6b21a8')}<path d="M50 48c-6-14-22-22-28-14c-5 8 6 20 28 18z" fill="#fdf4ff"/><path d="M50 48c6-14 22-22 28-14c5 8-6 20-28 18z" fill="#fdf4ff"/><path d="M50 52c-4 10-16 18-21 12c-4-6 6-12 21-12z" fill="#f5d0fe"/><path d="M50 52c4 10 16 18 21 12c4-6-6-12-21-12z" fill="#f5d0fe"/><rect x="48" y="38" width="4" height="30" rx="2" fill="${AV_G}"/><path d="M49 38c-2-6-5-8-8-9M51 38c2-6 5-8 8-9" stroke="${AV_G}" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="34" cy="38" r="3" fill="${AV_G}"/><circle cx="66" cy="38" r="3" fill="${AV_G}"/>` },
];
AVATARS.forEach((a) => { a.g = a.g || 'symbol'; });
AVATARS.unshift(...DEITY_AVATARS); // เทพขึ้นก่อน
const AV_GROUPS = [['deity', 'เทพ · สายมู'], ['symbol', 'สัญลักษณ์มงคล']];
// id ของ gradient/mask ต้องไม่ซ้ำกันในหน้า (รูปเดียวกันอยู่หลายที่ · ถ้าตัวแรกถูกซ่อน ตัวอื่นจะวาดไม่ถูก)
let avSeq = 0;
const avatarSVG = (k) => {
  const a = AVATARS.find((x) => x.k === k);
  if (!a) return '';
  const n = ++avSeq;
  const svg = a.svg.replace(/id="([\w-]+)"/g, `id="$1-${n}"`).replace(/url\(#([\w-]+)\)/g, `url(#$1-${n})`);
  return `<svg viewBox="0 0 100 100" aria-label="${a.name}">${svg}</svg>`;
};
// เนื้อในวงกลมอวตาร: รูปจากเครื่อง > อวตารในชุด > ตัวอักษรแรกของชื่อ
function avatarInner(u) {
  const av = (u && u.avatar) || {};
  if (av.img) return `<img src="${av.img}" alt="">`;
  if (av.k && AVATARS.some((x) => x.k === av.k)) return avatarSVG(av.k);
  return esc(((u && (u.first || u.name)) || '✦').trim().charAt(0).toUpperCase() || '✦');
}
const hasAvatarArt = (u) => !!(u && u.avatar && (u.avatar.img || u.avatar.k));

// ---------- หน้าเลือกรูปโปรไฟล์ ----------
let avatarPanel = null;
function openAvatarPicker() {
  if (!avatarPanel) {
    avatarPanel = makePanel('avatarPanel', 'เปลี่ยนรูปโปรไฟล์');
    avatarPanel.style.zIndex = 20;
    avatarPanel.querySelector('.panel-body').addEventListener('click', avatarClick);
    avatarPanel.querySelector('.panel-body').addEventListener('change', avatarFile);
  }
  renderAvatarPicker();
  openPanel('avatarPanel');
}
function renderAvatarPicker() {
  const u = currentUser();
  const cur = (u.avatar || {});
  avatarPanel.querySelector('.panel-body').innerHTML = `
    <div class="av-now"><div class="pf-avatar ${hasAvatarArt(u) ? 'has-art' : ''}">${avatarInner(u)}</div><p>รูปโปรไฟล์ตอนนี้</p></div>
    <section class="pf-card">
      <div class="sec-head"><h3>รูปจากเครื่องของคุณ</h3></div>
      <div class="av-src">
        <label class="btn-gold av-pick">🖼️ เลือกจากคลังรูป<input type="file" accept="image/*" data-av-file hidden></label>
        <button class="btn-ghost av-pick" data-av-cam>📷 ถ่ายรูปใหม่</button>
        <input type="file" accept="image/*" capture="user" data-av-file data-av-camfile hidden>
      </div>
      <p class="pf-note">ระบบตัดรูปเป็นวงกลมให้อัตโนมัติ · รูปนี้ใช้เป็นรูปโปรไฟล์เท่านั้น ไม่นำไปดูดวง</p>
    </section>
    <section class="pf-card">
      <div class="sec-head"><h3>เลือกรูปมงคล</h3><span class="sec-note">${AVATARS.length} แบบ</span></div>
      ${AV_GROUPS.map(([g, label]) => `<p class="av-group">${label}</p>
      <div class="av-grid">${AVATARS.filter((a) => a.g === g).map((a) => `<button class="av-opt ${cur.k === a.k && !cur.img ? 'on' : ''}" data-av="${a.k}" title="${a.name}">${avatarSVG(a.k)}<small>${a.name}</small></button>`).join('')}</div>`).join('')}
    </section>
    ${hasAvatarArt(u) ? '<button class="btn-ghost full" data-av-reset>ใช้ตัวอักษรชื่อแทนรูป</button>' : ''}`;
}
function setAvatar(av) {
  const u = currentUser();
  if (av) u.avatar = av; else delete u.avatar;
  if (!persistUser(u)) { toast('พื้นที่ในเครื่องเต็ม ลองเลือกรูปที่เล็กลงนะคะ'); return; }
  applyUser();
  if (typeof renderProfile === 'function') renderProfile();
  renderAvatarPicker();
  toast('เปลี่ยนรูปโปรไฟล์แล้ว ✦');
}
function avatarClick(e) {
  if (e.target.closest('[data-av-cam]')) { openCamera(); return; }
  const o = e.target.closest('[data-av]');
  if (o) { setAvatar({ k: o.dataset.av }); return; }
  if (e.target.closest('[data-av-reset]')) setAvatar(null);
}
// รูปจากเครื่อง → ตัดกลางเป็นสี่เหลี่ยมจัตุรัส 320px (ไฟล์เล็ก บันทึกในโปรไฟล์ได้)
async function avatarFile(e) {
  const input = e.target.closest('[data-av-file]');
  if (!input || !input.files[0]) return;
  const file = input.files[0];
  input.value = '';
  if (!file.type.startsWith('image/')) { toast('กรุณาเลือกไฟล์รูปภาพ'); return; }
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    setAvatar({ img: squareJpeg(img, img.naturalWidth, img.naturalHeight) });
    URL.revokeObjectURL(url);
  } catch (_) { toast('อ่านรูปนี้ไม่ได้ ลองเลือกรูปอื่นนะคะ'); }
}

// ตัดกลางเป็นสี่เหลี่ยมจัตุรัส 320px · mirror = กลับซ้ายขวาแบบกระจก (กล้องหน้า)
function squareJpeg(src, w, h, mirror) {
  const side = Math.min(w, h);
  const c = document.createElement('canvas');
  c.width = c.height = 320;
  const x = c.getContext('2d');
  if (mirror) { x.translate(320, 0); x.scale(-1, 1); }
  x.drawImage(src, (w - side) / 2, (h - side) / 2, side, side, 0, 0, 320, 320);
  return c.toDataURL('image/jpeg', 0.85);
}

// ---------- ถ่ายรูปใหม่: เปิดกล้องหน้าในหน้าเว็บ แล้วกดชัตเตอร์ ----------
// ไม่มีกล้อง/ไม่อนุญาต → ใช้ตัวเลือกไฟล์แบบถ่ายรูปของมือถือแทน
let camStream = null;
let camFacing = 'user';
const camEl = document.createElement('div');
camEl.className = 'cam-sheet';
camEl.hidden = true;
camEl.innerHTML = `<div class="cam-box cam-denied" hidden></div><div class="cam-box cam-live">
    <p class="cam-title">ถ่ายรูปโปรไฟล์</p>
    <div class="cam-view"><video playsinline muted autoplay></video><span class="cam-ring"></span><p class="cam-msg"></p></div>
    <p class="cam-tip">จัดหน้าให้อยู่ในวงกลม แล้วกดถ่าย</p>
    <div class="cam-actions">
      <button class="btn-ghost" data-cam-close>ยกเลิก</button>
      <button class="cam-shot" data-cam-shot aria-label="ถ่ายรูป"></button>
      <button class="btn-ghost" data-cam-flip>สลับกล้อง</button>
    </div>
  </div>`;
document.addEventListener('DOMContentLoaded', () => ($('screen') || document.body).appendChild(camEl));
if (document.readyState !== 'loading') ($('screen') || document.body).appendChild(camEl);

// วิธีเปิดสิทธิ์กล้องตามอุปกรณ์ (เว็บกด “อนุญาต” แทนลูกค้า หรือเปิดหน้าตั้งค่าเบราว์เซอร์ให้ไม่ได้)
function camSteps() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua)) return ['แตะ <b>aA</b> ที่แถบที่อยู่เว็บด้านบน', 'เลือก <b>การตั้งค่าเว็บไซต์</b>', 'ตั้ง <b>กล้อง</b> เป็น <b>อนุญาต</b>', 'กลับมากด <b>ลองอีกครั้ง</b>'];
  if (/iPhone|iPad|iPod/.test(ua)) return ['เปิดแอป <b>การตั้งค่า</b> ของไอโฟน', 'เลือกแอปเบราว์เซอร์ที่ใช้อยู่ (เช่น Chrome)', 'เปิด <b>กล้อง</b>', 'กลับมากด <b>ลองอีกครั้ง</b>'];
  if (/Android/.test(ua)) return ['แตะไอคอน <b>🔒 / ⓘ</b> หน้าที่อยู่เว็บด้านบน', 'เลือก <b>สิทธิ์</b> หรือ <b>การตั้งค่าเว็บไซต์</b>', 'ตั้ง <b>กล้อง</b> เป็น <b>อนุญาต</b>', 'กลับมากด <b>ลองอีกครั้ง</b>'];
  return ['คลิกไอคอน <b>🔒</b> ข้างที่อยู่เว็บด้านบน', 'ตั้ง <b>กล้อง</b> เป็น <b>อนุญาต</b>', 'กด <b>ลองอีกครั้ง</b> (บางเบราว์เซอร์ต้องรีเฟรชหน้าก่อน)'];
}
function showCamDenied() {
  const box = camEl.querySelector('.cam-denied');
  box.innerHTML = `<span class="cam-big">📷</span>
    <p class="cam-title">ยังไม่ได้อนุญาตให้ใช้กล้อง</p>
    <p class="cam-tip">เปิดสิทธิ์กล้องให้หมอดู.com ได้ง่าย ๆ ตามนี้</p>
    <ol class="cam-steps">${camSteps().map((t) => `<li>${t}</li>`).join('')}</ol>
    <button class="btn-gold full" data-cam-retry>ลองอีกครั้ง</button>
    <button class="btn-ghost full" data-cam-native>ใช้กล้องของมือถือแทน</button>
    <button class="btn-ghost full" data-cam-close>ยกเลิก</button>`;
  camEl.querySelector('.cam-live').hidden = true;
  box.hidden = false;
  camEl.hidden = false;
}
async function openCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { fallbackCamFile(); return; }
  camEl.querySelector('.cam-denied').hidden = true;
  camEl.querySelector('.cam-live').hidden = false;
  // เคยไม่อนุญาตไว้แล้ว → เบราว์เซอร์จะไม่ถามอีก · แสดงวิธีเปิดสิทธิ์เลย
  try {
    const st = navigator.permissions && await navigator.permissions.query({ name: 'camera' });
    if (st && st.state === 'denied') { showCamDenied(); return; }
  } catch (_) {}
  camEl.hidden = false;
  camEl.querySelector('.cam-msg').textContent = 'กำลังเปิดกล้อง… กรุณากด “อนุญาต” ถ้าเบราว์เซอร์ถาม';
  camEl.querySelector('[data-cam-shot]').disabled = true;
  try {
    stopCamera();
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: camFacing, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
    const v = camEl.querySelector('video');
    v.srcObject = camStream;
    v.classList.toggle('mirror', camFacing === 'user');
    await v.play().catch(() => {});
    camEl.querySelector('.cam-msg').textContent = '';
    camEl.querySelector('[data-cam-shot]').disabled = false;
  } catch (err) {
    stopCamera();
    camEl.hidden = true;
    if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) showCamDenied();
    else fallbackCamFile(); // ไม่มีกล้อง → ใช้ตัวเลือกไฟล์ของมือถือ
  }
}
function fallbackCamFile() {
  const f = avatarPanel && avatarPanel.querySelector('[data-av-camfile]');
  if (f) f.click(); else toast('อุปกรณ์นี้เปิดกล้องไม่ได้ ลองเลือกจากคลังรูปแทนนะคะ');
}
function stopCamera() {
  if (camStream) camStream.getTracks().forEach((t) => t.stop());
  camStream = null;
}
function closeCamera() { stopCamera(); camEl.hidden = true; }
camEl.addEventListener('click', (e) => {
  if (e.target.closest('[data-cam-close]') || e.target === camEl) { closeCamera(); return; }
  if (e.target.closest('[data-cam-retry]')) { openCamera(); return; }
  // แอปกล้องของมือถือ (ผ่านช่องเลือกไฟล์แบบถ่ายรูป) ไม่ต้องใช้สิทธิ์กล้องของเว็บ
  if (e.target.closest('[data-cam-native]')) { closeCamera(); fallbackCamFile(); return; }
  if (e.target.closest('[data-cam-flip]')) { camFacing = camFacing === 'user' ? 'environment' : 'user'; openCamera(); return; }
  if (e.target.closest('[data-cam-shot]')) {
    const v = camEl.querySelector('video');
    if (!v.videoWidth) return;
    const data = squareJpeg(v, v.videoWidth, v.videoHeight, camFacing === 'user');
    closeCamera();
    setAvatar({ img: data });
  }
});
// ปิดกล้องเมื่อออกจากหน้า/สลับแอป (ไม่ให้ไฟกล้องค้าง)
document.addEventListener('visibilitychange', () => { if (document.hidden && camStream) closeCamera(); });
