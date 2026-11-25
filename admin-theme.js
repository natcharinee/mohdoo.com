// ตั้งโหมดสี (มืด/สว่าง) ก่อนแสดงหน้า กันจอกระพริบ · แยกไฟล์เพื่อให้ CSP ห้ามสคริปต์ในหน้าได้
try { if (localStorage.getItem('admin-theme') === 'light') document.documentElement.dataset.theme = 'light'; } catch (_) {}
