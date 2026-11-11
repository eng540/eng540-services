#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
مولّد موقع ENG540 — يحوّل موسوعة الخدمات الهندسية (137 ملف Markdown)
إلى موقع ثابت عربي RTL كامل: صفحات، تنقّل جانبي، بحث فوري، وسوم تحقق.
الاستخدام: python3 build_site.py
"""
import json, os, re, shutil, sys, posixpath, html as htmllib
from datetime import date

sys.path.insert(0, '/root/DSH_Projects/pylibs')
import markdown as md_lib

SOURCE = '/root/DSH_Projects/ENG540-Engineering-Services'
REPO   = '/root/DSH_Projects/eng540-services'
PAGES  = os.path.join(REPO, 'pages')
ASSETS = os.path.join(REPO, 'assets')

GROUPS = [
    ('00-STRATEGY',   'الإطار الاستراتيجي'),
    ('01-REGULATIONS','الأنظمة واللوائح والمصادر'),
    ('02-PLATFORMS',  'أدلة المنصات'),
    ('03-SERVICES',   'الخدمات الـ14'),
    ('04-ENGINEERING','الأدلة الهندسية والمساحية'),
    ('05-OPERATIONS', 'الدليل التشغيلي للمكتب'),
    ('06-PRACTICAL-CASES','الحالات العملية'),
    ('07-TEMPLATES',  'النماذج التشغيلية'),
    ('08-TRAINING',   'أكاديمية التدريب'),
    ('09-GLOSSARY',   'قاموس المصطلحات'),
    ('10-QUALITY-AND-UPDATES','الجودة والتحقق'),
]
SERVICE_TITLES = {
    '01-Building-Permit': 'إصدار رخصة بناء',
    '02-Deed-Update': 'تحديث الصكوك',
    '03-Unit-Subdivision': 'فرز الوحدات العقارية',
    '04-Survey-Decision': 'إصدار قرار مساحي',
    '05-Renovation-Permit': 'إصدار رخصة ترميم',
    '06-Occupancy-Certificate': 'إصدار شهادة إشغال',
    '07-Deed-Merging': 'دمج الصكوك',
    '08-Survey-Sketch': 'إعداد كروكي مساحي',
    '09-Land-Subdivision-Merging': 'تقسيم ودمج الأراضي',
    '10-Demolition-Supervision': 'الإشراف على رخصة الهدم',
    '11-Building-Status-Correction': 'تصحيح وضع مبنى',
    '12-Real-Estate-Registration': 'التسجيل العيني للعقار',
    '13-Building-Safety-Report': 'إعداد تقرير سلامة المبنى',
    '14-Balady-Services': 'خدمات منصة بلدي',
}
FILE_LABELS = {
    'README.md': 'نظرة شاملة', '01-Platform-Steps.md': 'خطوات المنصة',
    '02-Requirements-Documents.md': 'المتطلبات والمستندات',
    '03-Executive-Workflow.md': 'الخوارزمية الـ25 خطوة',
    '04-Technical-Field-Costs.md': 'الفني والميداني والتكاليف',
    '05-Problems-Cases-Exam.md': 'المشكلات والحالات والاختبار',
}
TAG_PATTERNS = [
    (r'✅\s*\[متحقق\]', '✅ متحقق', 'tag-ok'),
    (r'⚠️\s*\[يحتاج تحقق\]', '⚠️ يحتاج تحقق', 'tag-warn'),
    (r'📚\s*\[معرفة مهنية\]', '📚 معرفة مهنية', 'tag-pro'),
    (r'💼\s*\[ممارسة تجارية\]', '💼 ممارسة تجارية', 'tag-biz'),
    (r'🧪\s*\[مثال توضيحي\]', '🧪 مثال توضيحي', 'tag-demo'),
]

def md2html(text):
    return md_lib.markdown(text, extensions=[
        'markdown.extensions.tables', 'markdown.extensions.fenced_code',
        'markdown.extensions.sane_lists'])

def rel_href_fix(html_text, page_dir):
    """يعيد كتابة روابط .md الداخلية إلى صفحات الموقع المقابلة."""
    def fix(m):
        href = m.group(1)
        if href.startswith(('http', 'mailto:', '#')):
            return m.group(0)
        target = posixpath.normpath(posixpath.join(page_dir, href))
        if target.startswith('..'):
            return m.group(0)
        return 'href="' + htmllib.escape(target[:-3] + '.html' if target.endswith('.md') else target) + '"'
    return re.sub(r'href="([^"]+\.md)"', fix, html_text)

def build_nav(cur_path):
    """شجرة التنقل الجانبية."""
    items = []
    for folder, label in GROUPS:
        gdir = os.path.join(SOURCE, folder)
        entries = []
        subs = sorted([d for d in os.listdir(gdir) if os.path.isdir(os.path.join(gdir, d))]) if os.path.isdir(gdir) else []
        files_root = sorted([f for f in os.listdir(gdir) if f.endswith('.md')]) if os.path.isdir(gdir) else []
        for f in files_root:
            entries.append((FILE_LABELS.get(f, f[:-3]), posixpath.join(folder, f[:-3] + '.html')))
        for s in subs:
            stitle = SERVICE_TITLES.get(s, s.replace('-', ' '))
            if folder == '03-SERVICES':
                entries.append(('📁 ' + stitle, posixpath.join(folder, s, 'README.html')))
            else:
                sdir = os.path.join(gdir, s)
                for f in sorted(os.listdir(sdir)):
                    if f.endswith('.md'):
                        entries.append(('— ' + FILE_LABELS.get(f, f[:-3]), posixpath.join(folder, s, f[:-3] + '.html')))
        is_open = cur_path.startswith(folder)
        cls = 'nav-group open' if is_open else 'nav-group'
        entries_html = ''.join(
            f'<a class="nav-link{" current" if p == cur_path else ""}" href="../{p}" data-p="{p}">{htmllib.escape(t)}</a>'
            for t, p in entries)
        items.append(f'<details class="{cls}"{" open" if is_open else ""}><summary>{label}</summary>{entries_html}</details>')
    return '\n'.join(items)

def render_page(title, body_html, rel_prefix, cur_path, breadcrumb):
    nav = build_nav(cur_path)
    bc = ' <span class="crumb-sep">‹</span> '.join(
        f'<a href="../{p}">{htmllib.escape(t)}</a>' if p else f'<span>{htmllib.escape(t)}</span>'
        for t, p in breadcrumb)
    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{htmllib.escape(title)} — ENG540</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{rel_prefix}assets/style.css">
</head>
<body>
<header class="site-header">
  <a class="brand" href="{rel_prefix}index.html"><span class="logo">ENG540</span><span class="brand-t">الخدمات الهندسية السعودية</span></a>
  <a class="about-link" href="{rel_prefix}pages/00-STRATEGY/About-Author.html">عن المؤلف</a>
  <div class="search-box"><input id="searchInput" type="search" placeholder="ابحث في الموسوعة… (Ctrl+K)" autocomplete="off"><div id="searchResults" class="search-results" hidden></div></div>
</header>
<div class="layout">
  <aside class="sidebar" id="sidebar">{nav}</aside>
  <button class="menu-btn" id="menuBtn" aria-label="القائمة">☰</button>
  <main class="content">
    <nav class="breadcrumb">{bc}</nav>
    <article class="doc">{body_html}</article>
    <footer class="doc-footer">
      <div class="copyright">© 2026 <b>م. عبدالمجيد الفقيه — مهندس مدني</b> · جميع الحقوق محفوظة · <a href="{rel_prefix}pages/00-STRATEGY/About-Author.html">عن المؤلف والتواصل</a></div>
      <div>ENG540 — منظومة الخدمات الهندسية السعودية · تحقق المصادر: 2026-11-10 · <a href="{rel_prefix}pages/10-QUALITY-AND-UPDATES/Knowledge-Gaps.html">الفجوات الموسومة</a></div>
    </footer>
  </main>
</div>
<script src="{rel_prefix}assets/search-index.js"></script>
<script src="{rel_prefix}assets/app.js"></script>
</body></html>"""

def strip_md(text):
    t = re.sub(r'```.*?```', ' ', text, flags=re.S)
    t = re.sub(r'[#>*`|\-\[\]()]', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()

def main():
    # نظّف المخرجات فقط — احفظ .git وأي ملفات المستودع الأخرى
    for sub in ('pages', 'assets', 'source'):
        p = os.path.join(REPO, sub)
        if os.path.isdir(p):
            shutil.rmtree(p)
        elif os.path.isfile(p):
            os.remove(p)
    os.makedirs(PAGES); os.makedirs(ASSETS)
    shutil.copy(os.path.join(os.path.dirname(__file__), 'style.css'), ASSETS)
    shutil.copy(os.path.join(os.path.dirname(__file__), 'app.js'), ASSETS)
    # انسخ المصدر
    shutil.copytree(SOURCE, os.path.join(REPO, 'source'),
                    ignore=shutil.ignore_patterns('.git', '*.pyc', '__pycache__'))

    pages, search_docs, count = [], [], 0
    for root, _dirs, files in os.walk(SOURCE):
        files = sorted(f for f in files if f.endswith('.md'))
        for fname in files:
            src = os.path.join(root, fname)
            rel_src = os.path.relpath(src, SOURCE)
            rel_page = rel_src[:-3] + '.html'  # مسار الصفحة نسبةً إلى pages/
            text = open(src, encoding='utf-8').read()
            title_m = re.search(r'^#\s+(.+)$', text, re.M)
            title = title_m.group(1).strip() if title_m else fname[:-3]
            body = md2html(text)
            page_dir = posixpath.dirname(rel_page)
            body = rel_href_fix(body, page_dir)
            for pat, label, cls in TAG_PATTERNS:
                body = re.sub(pat, f'<span class="tag {cls}">{label}</span>', body)
            parts = rel_page.split('/')
            html_bc = [(next((l for f2, l in GROUPS if rel_src.startswith(f2 + '/')), 'ENG540'),
                        posixpath.join(parts[0], 'README.html'))]
            if len(parts) > 2:
                mid = '/'.join(parts[:-1])
                t = SERVICE_TITLES.get(parts[1], parts[1])
                html_bc.append((t, posixpath.join(mid, 'README.html')))
            html_bc.append((title, None))
            html = render_page(title, body, '../', posixpath.join(*parts[:-1], fname[:-3]), html_bc)
            out = os.path.join(PAGES, rel_page)
            os.makedirs(os.path.dirname(out), exist_ok=True)
            open(out, 'w', encoding='utf-8').write(html)
            pages.append((rel_src, title))
            grp_label = next((l for f2, l in GROUPS if rel_src.startswith(f2 + '/')), 'ENG540')
            search_docs.append({'t': title, 'g': grp_label,
                                'p': 'pages/' + rel_page,
                                'x': strip_md(text)[:1200]})
            count += 1

    # فهرس البحث
    with open(os.path.join(ASSETS, 'search-index.js'), 'w', encoding='utf-8') as f:
        f.write('window.SEARCH_DOCS = ')
        json.dump(search_docs, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';')

    # ---- الصفحة الرئيسية ----
    stats_files = len(search_docs)
    total_lines = sum(len(open(os.path.join(SOURCE, d), encoding='utf-8').read().splitlines())
                      for d in ['README.md'] if os.path.exists(os.path.join(SOURCE, d)))
    total_lines = 0
    for r, _d, fs in os.walk(SOURCE):
        for f in fs:
            if f.endswith('.md'):
                total_lines += sum(1 for _ in open(os.path.join(r, f), encoding='utf-8'))
    svc_cards = ''
    for folder, label in GROUPS:
        gdir = os.path.join(SOURCE, folder)
        if folder == '03-SERVICES':
            cards = ''
            for s in SERVICE_TITLES:
                cards += (f'<a class="card" href="pages/03-SERVICES/{s}/README.html">'
                          f'<span class="card-n">{s.split("-")[0]}</span>'
                          f'<span class="card-t">{SERVICE_TITLES[s]}</span>'
                          f'<span class="card-d">6 ملفات · 25 خطوة · مصفوفة 18</span></a>')
            svc_cards = f'<section class="section" id="services"><h2>الخدمات الـ14</h2><p class="section-sub">كل خدمة بستة ملفات: الفهم، المنصة، المتطلبات، خوارزمية 25 خطوة، الفني والتكاليف، المشكلات والاختبار</p><div class="grid grid-14">{cards}</div></section>'
        elif os.path.isdir(gdir):
            n = sum(len(fs) for _r, _d, fs in os.walk(gdir) for f in fs if f.endswith('.md'))
            first = sorted(f for f in os.listdir(gdir) if f.endswith('.md'))
            href = 'pages/' + folder + '/' + (first[0][:-3] + '.html' if first else 'README.html')
            sub_items = ''
            if folder == '06-PRACTICAL-CASES':
                cases = sorted([f for f in os.listdir(gdir) if f.startswith('Case-')])
                sub_items = '<div class="mini">' + ' · '.join(
                    f'<a href="pages/06-PRACTICAL-CASES/{c[:-3]}.html">الحالة {c.split("-")[1]}</a>' for c in cases) + '</div>'
            svc_cards += (f'<a class="card card-lg" href="{href}"><span class="card-t">{label}</span>'
                          f'<span class="card-d">{n} ملفاً</span>{sub_items}</a>')
    home = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ENG540 — منظومة الخدمات الهندسية السعودية</title>
<meta name="description" content="موسوعة تشغيلية كاملة للخدمات الهندسية والمساحية والبلدية السعودية: 14 خدمة بخوارزمية 25 خطوة، أكاديمية تدريب، حالات عملية، ونماذج — بمصادر رسمية موثقة.">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<header class="site-header">
  <a class="brand" href="index.html"><span class="logo">ENG540</span><span class="brand-t">الخدمات الهندسية السعودية</span></a>
  <div class="search-box"><input id="searchInput" type="search" placeholder="ابحث في الموسوعة… (Ctrl+K)" autocomplete="off"><div id="searchResults" class="search-results" hidden></div></div>
</header>
<section class="hero">
  <div class="founder">تقديم: <b>م. عبدالمجيد الفقيه — مهندس مدني</b> · «صناعة الأثر لا مجرد الإنجاز»</div>
  <h1>من المبتدئ إلى منفّذ الخدمات كاملة</h1>
  <p>موسوعة تشغيلية للخدمات الهندسية والمساحية والبلدية السعودية — رخص البناء، الصكوك، القرارات المساحية، الإشغال، التسجيل العيني، وخدمات بلدي — بمصادر رسمية موثقة ووسوم تحقق صارمة.</p>
  <div class="stats">
    <div><b>14</b><span>خدمة كاملة</span></div>
    <div><b>25</b><span>خطوة لكل خدمة</span></div>
    <div><b>{stats_files}</b><span>ملف معرفة</span></div>
    <div><b>{total_lines:,}</b><span>سطر توثيق</span></div>
  </div>
  <div class="hero-actions"><a class="btn btn-primary" href="#services">استكشف الخدمات</a>
  <a class="btn" href="pages/08-TRAINING/README.html">ابدأ التدريب</a>
  <a class="btn" href="pages/00-STRATEGY/About-Author.html">تواصل مع المؤلف</a></div>
</section>
<main class="home">
{svc_cards}
<section class="section" id="author"><h2>عن المؤلف</h2>
<div class="author-card">
  <div class="author-name">م. عبدالمجيد الفقيه</div>
  <div class="author-role">مهندس مدني · مؤسس منظومة ENG540 · «صناعة الأثر لا مجرد الإنجاز»</div>
  <div class="author-contact">
    <a class="chip" href="https://wa.me/966532777678">💬 واتساب · 0532777678</a>
    <a class="chip" href="tel:0532777678">📞 جوال: 0532777678</a>
    <a class="chip" href="https://t.me/engineering540">✈️ قناة تيليجرام</a>
    <a class="chip chip-more" href="pages/00-STRATEGY/About-Author.html">عن المؤلف ←</a>
  </div>
  <p class="section-sub">أقدم هذا المحتوى لمن يهمه الأمر — المهندس في بدايته، موظف المكتب، مالك الأرض، والمقاول — لأجد أثري هنا حيث يقرأ.</p>
</div>
</section>
<section class="section"><h2>نظام التحقق</h2>
<div class="tags-legend">
<span class="tag tag-ok">✅ متحقق</span><span class="tag tag-pro">📚 معرفة مهنية</span>
<span class="tag tag-biz">💼 ممارسة تجارية</span><span class="tag tag-warn">⚠️ يحتاج تحقق</span>
<span class="tag tag-demo">🧪 مثال توضيحي</span>
</div>
<p class="section-sub">لا يُذكر رابط أو رسم أو مدة رسمية دون مصدر موثق بتاريخه — وكل ما لم يُتحقق يوسم صراحة في <a href="pages/10-QUALITY-AND-UPDATES/Knowledge-Gaps.html">سجل الفجوات</a>.</p>
</section>
</main>
<footer class="site-footer">
  <div class="copyright">© 2026 <b>م. عبدالمجيد الفقيه — مهندس مدني</b> · جميع الحقوق محفوظة · <a href="pages/00-STRATEGY/About-Author.html">عن المؤلف</a> · <a href="https://t.me/engineering540">تيليجرام</a></div>
  <div>ENG540 · إصدار 1.0 · {date.today().isoformat()} · المحتوى معرفي تعليمي ولا يغني عن الاعتماد المهني النظامي</div>
</footer>
<script src="assets/search-index.js"></script>
<script src="assets/app.js"></script>
</body></html>"""
    open(os.path.join(REPO, 'index.html'), 'w', encoding='utf-8').write(home)
    print(f'✅ تم البناء: {count} صفحة + الرئيسية | {total_lines:,} سطر | فهرس بحث {len(search_docs)} مستنداً')

if __name__ == '__main__':
    main()
