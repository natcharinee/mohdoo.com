"""สร้างพจนานุกรม i18n/en.js และ i18n/zh.js จาก i18n/dict.json
และบอกข้อความภาษาไทยในโค้ดที่ยังไม่มีคำแปล

    python3 i18n/build.py            # สร้างไฟล์ + แสดงข้อความที่ยังไม่แปล
    python3 i18n/build.py --missing missing.json   # เขียนข้อความที่ยังไม่แปลลงไฟล์ (เอาไปแปลแล้วเติมใน dict.json)

dict.json: { "ข้อความไทย": ["English", "中文"], ... }
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TH = '฀-๿'
SEG = re.compile(r"[" + TH + r"A-Za-z0-9 .,:;!?()%/–\-·…“”+&×~]+")
SKIP_FILES = {'seers-data.js'}  # ชื่อหมอดูเป็นชื่อเฉพาะ ไม่แปล


def segments():
    out = set()
    for f in sorted(glob.glob(os.path.join(ROOT, '*.js')) + glob.glob(os.path.join(ROOT, '*.html'))):
        if os.path.basename(f) in SKIP_FILES or os.path.basename(f) == 'i18n.js':
            continue
        s = open(f, encoding='utf-8').read()
        s = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
        s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
        if f.endswith('.js'):
            s = '\n'.join(re.sub(r'(^|\s)//.*$', r'\1', l) for l in s.split('\n'))
        for m in SEG.finditer(s):
            t = re.sub(r'^[^' + TH + r'A-Za-z0-9(“]+', '', m.group(0))
            t = re.sub(r'[^' + TH + r'A-Za-z0-9)”.!?…]+$', '', t).strip()
            if re.search('[' + TH + ']', t):
                out.add(t)
    return out


def main():
    path = os.path.join(ROOT, 'i18n', 'dict.json')
    d = json.load(open(path, encoding='utf-8'))
    for i, lang in enumerate(['en', 'zh']):
        body = json.dumps({k: v[i] for k, v in sorted(d.items())}, ensure_ascii=False, separators=(',', ':'))
        open(os.path.join(ROOT, 'i18n', f'{lang}.js'), 'w', encoding='utf-8').write(
            f'// สร้างอัตโนมัติจาก i18n/dict.json ด้วย i18n/build.py — อย่าแก้ไฟล์นี้โดยตรง\nwindow.I18N_DICT = {body};\n')
    missing = sorted(segments() - set(d))
    print(f'{len(d)} คำแปล · ยังไม่แปล {len(missing)} ข้อความ')
    if '--missing' in sys.argv:
        json.dump(missing, open(sys.argv[sys.argv.index('--missing') + 1], 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    else:
        for m in missing[:40]:
            print(' ', m)


if __name__ == '__main__':
    main()
