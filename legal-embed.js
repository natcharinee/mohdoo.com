// หน้ากฎหมายที่เปิดในกรอบ (?embed=1) → ซ่อนแถบเมนูของหน้า · แยกไฟล์เพื่อให้ CSP ห้ามสคริปต์ในหน้าได้
if (/[?&]embed=1/.test(location.search)) document.documentElement.classList.add('embed');
