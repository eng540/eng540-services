#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
فاحص روابط شامل لكل صفحات الموقع المنشورة (متطلب P0 — التوجيه §9/6):
- يفحص كل href/src في index.html و app.html و 404.html و pages/**/*.html
- يحل المسارات النسبية حسب عمق الصفحة ويتحقق من وجود الملف الهدف فعلياً
- يرفض روابط المجلدات (بلا index) لأن GitHub Pages لا يقدم قوائم مجلدات
- يتحقق من أن كل صفحة عميقة تحمل CSS/JS بمسار صحيح
"""
import glob, os, posixpath, re, sys

REPO = '/root/DSH_Projects/eng540-services'
os.chdir(REPO)

FILES = (['index.html', 'app.html', '404.html']
         + sorted(glob.glob('pages/**/*.html', recursive=True)))

broken, checked, dir_links, asset_bad = [], 0, [], []
ext_skip = ('http://', 'https://', '#', 'mailto:', 'tel:', 'data:', '//')

for f in FILES:
    html = open(f, encoding='utf-8').read()
    base = posixpath.dirname(f)
    refs = re.findall(r'(?:href|src)="([^"]+)"', html)
    for url in refs:
        checked += 1
        if '${' in url or '<' in url:
            continue  # قوالب JS في app.html — تُحل وقت التشغيل
        u = url.split('#')[0].split('?')[0].strip()
        if not u or u.startswith(ext_skip):
            continue
        # مسارات مطلقة داخل الموقع (404.html) — تُحل من جذر المستودع
        if u.startswith('/'):
            u = u.replace('/eng540-services/', '', 1).lstrip('/')
            base_r = ''
            if not u:
                continue  # جذر الموقع نفسه — له index
        else:
            base_r = base
        target = posixpath.normpath(posixpath.join(base_r, u)) if base_r else posixpath.normpath(u)
        if target.startswith('..'):
            broken.append((f, url, 'يخرج من جذر الموقع'))
            continue
        if not posixpath.splitext(target)[1]:
            dir_links.append((f, url, 'رابط مجلد (سيصير 404 على Pages)'))
            continue
        if not os.path.isfile(target):
            broken.append((f, url, 'الملف غير موجود: ' + target))
    # فحص أصول الصفحة الحرجة
    if 'stylesheet' in html:
        m = re.search(r'href="([^"]*style\.css)"', html)
        if m:
            a = m.group(1).replace('/eng540-services/', '', 1).lstrip('/')
            p = posixpath.normpath(posixpath.join(base, a)) if base else a
            if not os.path.isfile(p):
                asset_bad.append((f, m.group(1)))
    for need in ('search-index.js', 'app.js'):
        m = re.search(r'src="([^"]*%s)"' % need, html)
        if m:
            p = posixpath.normpath(posixpath.join(base, m.group(1))) if base else m.group(1)
            if not os.path.isfile(p):
                asset_bad.append((f, m.group(1)))

print(f'الملفات المفحوصة: {len(FILES)} · المراجع: {checked}')
print(f'روابط مكسورة: {len(broken)}')
for f, u, why in broken[:15]:
    print('  ✗', f, '→', u, '·', why)
print(f'روابط مجلدات (P0): {len(dir_links)}')
for f, u, why in dir_links[:10]:
    print('  ⚠', f, '→', u, '·', why)
print(f'أصول CSS/JS بمسار خاطئ: {len(asset_bad)}')
for f, u in asset_bad[:10]:
    print('  ✗', f, '→', u)
sys.exit(0 if not broken and not dir_links and not asset_bad else 1)
