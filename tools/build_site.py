#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
مولّد موقع ENG540 — الإصدار 2 (تجربة تطبيق)
يحوّل موسوعة الخدمات (138 ملف MD) إلى منصة تفاعلية:
تبويبات الخدمات · متتبع 25 خطوة بحفظ التقدم · أقسام قابلة للطي ·
فهرس محتويات لكل صفحة · وضع ليلي · بحث فوري · وسوم تحقق ملونة.
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
SERVICE_FILES = [
    ('README.html', 'نظرة شاملة', '📖'),
    ('01-Platform-Steps.html', 'خطوات المنصة', '🖥️'),
    ('02-Requirements-Documents.html', 'المتطلبات والمستندات', '📋'),
    ('03-Executive-Workflow.html', 'خوارزمية 25 خطوة', '🧭'),
    ('04-Technical-Field-Costs.md'.replace('.md', '.html'), 'الفني والتكاليف', '📐'),
    ('05-Problems-Cases-Exam.html', 'المشكلات والاختبار', '🧪'),
]
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
    def fix(m):
        href = m.group(1)
        if href.startswith(('http', 'mailto:', '#')):
            return m.group(0)
        target = posixpath.normpath(posixpath.join(page_dir, href))
        if target.startswith('..'):
            return m.group(0)
        t = target[:-3] + '.html' if target.endswith('.md') else target
        return 'href="' + htmllib.escape(t) + '"'
    return re.sub(r'href="([^"]+\.md)"', fix, html_text)

# ---------- التقسيم البنيوي ----------

def split_md_sections(text):
    """يرجع (h1, [(h2 أو None، نص المقطع)])"""
    title = None
    blocks, cur, cur_h2 = [], [], None
    for ln in text.splitlines():
        if title is None and ln.startswith('# '):
            title = ln[2:].strip()
            continue
        if ln.startswith('## '):
            if cur or cur_h2 is not None:
                blocks.append((cur_h2, '\n'.join(cur)))
            cur_h2, cur = ln[3:].strip(), []
        else:
            cur.append(ln)
    if cur or cur_h2 is not None:
        blocks.append((cur_h2, '\n'.join(cur)))
    return title, blocks

STEP_RE = re.compile(r'<h3>(?:<[^>]+>)*\s*الخطوة\s*(\d+)')

KEY_P_RE = re.compile(r'<p><strong>\s*مفتاح[^<]*</strong>(.*?)</p>', re.S)

H3_SPLIT_RE = re.compile(r'(<h3>.*?</h3>)')

def wrap_h3_key(sec_html):
    """يغلّف مقطع h3 «مفتاح …» وما بعده حتى نهاية المقطع في صندوق مطوي."""
    parts = H3_SPLIT_RE.split(sec_html)
    for i in range(1, len(parts), 2):
        if 'مفتاح' in parts[i]:
            inner = parts[i] + ''.join(parts[i + 1:])
            return (''.join(parts[:i])
                    + '<details class="keybox"><summary>🔑 مفتاح الإجابات — اضغط للعرض قبل الإجابة!</summary>'
                    + '<div class="key-body">' + inner + '</div></details>')
    return sec_html

def enhance_key(sec_html):
    """يحوّل فقرة «مفتاح الإجابات» إلى صندوق مطوي يُفتح بالضغط."""
    return KEY_P_RE.sub(
        r'<details class="keybox"><summary>🔑 مفتاح الإجابات — اضغط للعرض قبل الإجابة!</summary>'
        r'<div class="key-body"><p><strong>مفتاح:</strong>\1</p></div></details>', sec_html)

def enhance_steps(sec_html):
    """يحول عناوين «الخطوة N» إلى بطاقات متتبعة قابلة للتعليم."""
    parts = re.split(r'(<h3>.*?</h3>)', sec_html)
    out, i = [], 0
    while i < len(parts):
        chunk = parts[i]
        m = STEP_RE.match(chunk) if i + 1 < len(parts) else None
        if m:
            n, body = m.group(1), parts[i + 1]
            out.append(
                f'<div class="step-card" data-step="{n}">'
                f'<div class="step-head"><span class="step-n">{n}</span>'
                f'<h3 class="step-t">{chunk[4:-5]}</h3>'
                f'<label class="step-done"><input type="checkbox" class="step-check">أتممت</label></div>'
                f'<div class="step-body">{body}</div></div>')
            i += 2
        else:
            out.append(chunk)
            i += 1
    return ''.join(out)

def build_body(blocks, rel_page):
    """يبني جسم الصفحة: مقدمة + مقاطع h2 قابلة للطي + فهرس محتويات."""
    toc, secs = [], []
    for i, (h2, md) in enumerate(blocks):
        if h2 is None:
            secs.append(md2html(md))
            continue
        sid = f'sec-{i}'
        toc.append((h2, sid))
        sec_html = md2html(md)
        sec_html = enhance_key(sec_html)
        sec_html = enhance_steps(sec_html)
        sec_html = wrap_h3_key(sec_html)
        key = bool(re.search(r'مفتاح|الحلول|الإجابات', h2))
        cls = 'doc-sec answer-key collapsed' if key else 'doc-sec'
        secs.append(
            f'<section class="{cls}" id="{sid}">'
            f'<h2 class="sec-h"><a class="sec-anchor" href="#{sid}">#</a>'
            f'<span class="sec-t">{htmllib.escape(h2)}</span>'
            f'<button class="sec-toggle" type="button" aria-label="طوي/فتح المقطع">▾</button></h2>'
            f'<div class="sec-body">{sec_html}</div></section>')
    return toc, ''.join(secs)

def service_tabs(rel_page):
    parts = rel_page.split('/')
    if len(parts) >= 3 and parts[0] == '03-SERVICES':
        svc, cur = parts[1], parts[2]
        tabs = ''.join(
            f'<a class="tab{" active" if f == cur else ""}" href="{f}">'
            f'<span class="tab-ic">{ic}</span><span>{t}</span></a>'
            for f, t, ic in SERVICE_FILES)
        tabs += (f'<a class="tab tab-app" href="../../app.html?view=services&srv=SRV-{svc.split("-")[0]}">'
                 '⚡ هذه الخدمة في المنصة التفاعلية</a>')
        return (f'<div class="svc-hub"><div class="svc-hub-t">الخدمة {svc.split("-")[0]} — '
                f'{SERVICE_TITLES.get(svc, svc)}</div><nav class="svc-tabs">{tabs}</nav></div>')
    return ''

def render_page(title, body_html, rel_prefix, cur_path, breadcrumb, tabs, toc, steps_total):
    nav = build_nav(cur_path)
    bc = ' <span class="crumb-sep">‹</span> '.join(
        f'<a href="../{p}">{htmllib.escape(t)}</a>' if p else f'<span>{htmllib.escape(t)}</span>'
        for t, p in breadcrumb)
    toc_html = ''
    if len(toc) >= 3:
        toc_html = ('<details class="page-toc"><summary>محتويات هذه الصفحة</summary><ol>'
                    + ''.join(f'<li><a href="#{sid}">{htmllib.escape(t)}</a></li>' for t, sid in toc)
                    + '</ol></details>')
    progress = f'<div class="step-progress" id="stepProgress" data-total="{steps_total}" hidden></div>'
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
<div class="read-progress" id="readProgress"></div>
<header class="site-header">
  <a class="brand" href="{rel_prefix}index.html"><span class="logo">ENG540</span><span class="brand-t">الخدمات الهندسية السعودية</span></a>
  <a class="app-btn" href="{rel_prefix}app.html">⚡ المنصة التفاعلية</a>
  <a class="about-link" href="{rel_prefix}pages/00-STRATEGY/About-Author.html">عن المؤلف</a>
  <div class="search-box"><input id="searchInput" type="search" placeholder="ابحث في الموسوعة… (Ctrl+K)" autocomplete="off"><div id="searchResults" class="search-results" hidden></div></div>
  <button class="theme-btn" id="themeBtn" title="وضع ليلي/نهاري">🌙</button>
</header>
<div class="layout">
  <aside class="sidebar" id="sidebar">{nav}</aside>
  <button class="menu-btn" id="menuBtn" aria-label="القائمة">☰</button>
  <main class="content">
    <nav class="breadcrumb">{bc}</nav>
    {tabs}
    {progress}
    {toc_html}
    <article class="doc doc-app">{body_html}</article>
    <footer class="doc-footer">
      <div class="copyright">© 2026 <b>م. عبدالمجيد الفقيه — مهندس مدني</b> · جميع الحقوق محفوظة · <a href="{rel_prefix}pages/00-STRATEGY/About-Author.html">عن المؤلف والتواصل</a></div>
      <div>ENG540 — منظومة الخدمات الهندسية السعودية · تحقق المصادر: 2026-11-10 · <a href="{rel_prefix}pages/10-QUALITY-AND-UPDATES/Knowledge-Gaps.html">الفجوات الموسومة</a></div>
    </footer>
  </main>
</div>
<script src="{rel_prefix}assets/search-index.js"></script>
<script src="{rel_prefix}assets/app.js"></script>
</body></html>"""

def build_nav(cur_path):
    items = []
    for folder, label in GROUPS:
        gdir = os.path.join(SOURCE, folder)
        entries = []
        if os.path.isdir(gdir):
            subs = sorted(d for d in os.listdir(gdir) if os.path.isdir(os.path.join(gdir, d)))
            for f in sorted(f for f in os.listdir(gdir) if f.endswith('.md')):
                if f == 'About-Author.md':
                    continue
                entries.append((FILE_LABELS.get(f, f[:-3]), posixpath.join(folder, f[:-3] + '.html')))
            for s in subs:
                stitle = SERVICE_TITLES.get(s, s.replace('-', ' '))
                sdir = os.path.join(gdir, s)
                sfiles = sorted(f for f in os.listdir(sdir) if f.endswith('.md')) if os.path.isdir(sdir) else []
                if folder == '03-SERVICES':
                    entries.append(('📁 ' + stitle, posixpath.join(folder, s, 'README.html')))
                    for f in sfiles:
                        if f != 'README.md':
                            entries.append(('&nbsp;&nbsp;↳ ' + FILE_LABELS.get(f, f[:-3]),
                                            posixpath.join(folder, s, f[:-3] + '.html')))
                else:
                    entries.append(('📁 ' + stitle, posixpath.join(folder, s, 'README.html')))
                    for f in sfiles:
                        if f != 'README.md':
                            entries.append(('&nbsp;&nbsp;↳ ' + FILE_LABELS.get(f, f[:-3]),
                                            posixpath.join(folder, s, f[:-3] + '.html')))
        is_open = cur_path.startswith(folder)
        entries_html = ''.join(
            f'<a class="nav-link{" current" if p == cur_path else ""}" href="../{p}">{t}</a>'
            for t, p in entries)
        items.append(f'<details class="nav-group{" open" if is_open else ""}"'
                     f'{" open" if is_open else ""}><summary>{label}</summary>{entries_html}</details>')
    return '\n'.join(items)

def strip_md(text):
    t = re.sub(r'```.*?```', ' ', text, flags=re.S)
    t = re.sub(r'[#>*`|\-\[\]()]', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()

def main():
    for sub in ('pages', 'assets', 'source'):
        p = os.path.join(REPO, sub)
        if os.path.isdir(p):
            shutil.rmtree(p)
        elif os.path.isfile(p):
            os.remove(p)
    os.makedirs(PAGES); os.makedirs(ASSETS)
    for f in ('style.css', 'app.js'):
        shutil.copy(os.path.join(os.path.dirname(os.path.abspath(__file__)), f), ASSETS)
    shutil.copytree(SOURCE, os.path.join(REPO, 'source'),
                    ignore=shutil.ignore_patterns('.git', '*.pyc', '__pycache__'))

    search_docs, count = [], 0
    for root, _dirs, files in os.walk(SOURCE):
        for fname in sorted(f for f in files if f.endswith('.md')):
            src = os.path.join(root, fname)
            rel_src = os.path.relpath(src, SOURCE)
            rel_page = rel_src[:-3] + '.html'
            text = open(src, encoding='utf-8').read()
            title, blocks = split_md_sections(text)
            if not title:
                title = fname[:-3]
            toc, body = build_body(blocks, rel_page)
            page_dir = posixpath.dirname(rel_page)
            body = rel_href_fix(body, page_dir)
            for pat, label, cls in TAG_PATTERNS:
                body = re.sub(pat, f'<span class="tag {cls}">{label}</span>', body)
            steps_total = len(re.findall(r'^###\s+الخطوة\s+\d+', text, re.M))
            grp = next((l for f2, l in GROUPS if rel_src.startswith(f2 + '/')), 'ENG540')
            parts = rel_page.split('/')
            bc = [(grp, posixpath.join(parts[0], 'README.html'))]
            if len(parts) > 2:
                mid = '/'.join(parts[:-1])
                bc.append((SERVICE_TITLES.get(parts[1], parts[1]), posixpath.join(mid, 'README.html')))
            bc.append((title, None))
            cur_nav_path = posixpath.join(*parts[:-1], fname[:-3])
            html = render_page(title, body, '../', cur_nav_path, bc,
                               service_tabs(rel_page), toc, steps_total)
            out = os.path.join(PAGES, rel_page)
            os.makedirs(os.path.dirname(out), exist_ok=True)
            open(out, 'w', encoding='utf-8').write(html)
            search_docs.append({'t': title, 'g': grp, 'p': 'pages/' + rel_page,
                                'x': strip_md(text)[:1200]})
            count += 1

    with open(os.path.join(ASSETS, 'search-index.js'), 'w', encoding='utf-8') as f:
        f.write('window.SEARCH_DOCS = ')
        json.dump(search_docs, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';')

    stats_files = len(search_docs)
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
                          f'<span class="card-n">خدمة {s.split("-")[0]}</span>'
                          f'<span class="card-t">{SERVICE_TITLES[s]}</span>'
                          f'<span class="card-d">6 ملفات · 25 خطوة · مصفوفة 18</span></a>')
            svc_cards = ('<section class="section" id="services"><h2>الخدمات الـ14</h2>'
                         '<p class="section-sub">اضغط أي خدمة لتبويباتها الست: الفهم، المنصة، المتطلبات، '
                         'خوارزمية 25 خطوة المتتبعة، الفني والتكاليف، المشكلات والاختبار</p>'
                         f'<div class="grid grid-14">{cards}</div></section>')
        elif os.path.isdir(gdir):
            n = sum(1 for _r, _d, fs in os.walk(gdir) for f in fs if f.endswith('.md'))
            first = sorted(f for f in os.listdir(gdir) if f.endswith('.md') and f != 'About-Author.md')
            href = 'pages/' + folder + '/' + (first[0][:-3] + '.html' if first else 'README.html')
            sub_items = ''
            if folder == '06-PRACTICAL-CASES':
                cases = sorted(f for f in os.listdir(gdir) if f.startswith('Case-'))
                sub_items = '<div class="mini">' + ' · '.join(
                    f'<a href="pages/06-PRACTICAL-CASES/{c[:-3]}.html">الحالة {c.split("-")[1]}</a>'
                    for c in cases) + '</div>'
            svc_cards += (f'<a class="card card-lg" href="{href}"><span class="card-t">{label}</span>'
                          f'<span class="card-d">{n} ملفاً</span>{sub_items}</a>')
    home = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ENG540 — منظومة الخدمات الهندسية السعودية</title>
<meta name="description" content="موسوعة تشغيلية تفاعلية للخدمات الهندسية والمساحية والبلدية السعودية: 14 خدمة بخوارزمية 25 خطوة متتبعة، أكاديمية تدريب، حالات عملية، ونماذج — بمصادر رسمية موثقة.">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<div class="read-progress" id="readProgress"></div>
<header class="site-header">
  <a class="brand" href="index.html"><span class="logo">ENG540</span><span class="brand-t">الخدمات الهندسية السعودية</span></a>
  <a class="app-btn" href="app.html">⚡ المنصة التفاعلية</a>
  <a class="about-link" href="pages/00-STRATEGY/About-Author.html">عن المؤلف</a>
  <div class="search-box"><input id="searchInput" type="search" placeholder="ابحث في الموسوعة… (Ctrl+K)" autocomplete="off"><div id="searchResults" class="search-results" hidden></div></div>
  <button class="theme-btn" id="themeBtn" title="وضع ليلي/نهاري">🌙</button>
</header>
<section class="hero">
  <div class="founder">تقديم: <b>م. عبدالمجيد الفقيه — مهندس مدني</b> · «صناعة الأثر لا مجرد الإنجاز»</div>
  <h1>من المبتدئ إلى منفّذ الخدمات كاملة</h1>
  <p>منصة تفاعلية للخدمات الهندسية والمساحية والبلدية السعودية — خوارزميات 25 خطوة متتبعة، تبويبات لكل خدمة، حالات عملية، واختبارات إتقان — بمصادر رسمية موثقة ووسوم تحقق صارمة.</p>
  <div class="stats">
    <div><b>14</b><span>خدمة كاملة</span></div>
    <div><b>25</b><span>خطوة لكل خدمة</span></div>
    <div><b>{stats_files}</b><span>ملف معرفة</span></div>
    <div><b>{total_lines:,}</b><span>سطر توثيق</span></div>
  </div>
  <div class="hero-actions"><a class="btn btn-primary" href="app.html">⚡ افتح المنصة التفاعلية — المشخّص والحاسبة والاختبار</a>
  <a class="btn" href="#services">استكشف الخدمات</a>
  <a class="btn" href="pages/08-TRAINING/README.html">ابدأ التدريب</a>
  <a class="btn" href="pages/00-STRATEGY/About-Author.html">تواصل مع المؤلف</a></div>
</section>
<main class="home">
<section class="section"><h2>رحلتك في ثلاث خطوات</h2>
<div class="grid grid-3">
<a class="card" href="pages/08-TRAINING/Lessons/Stage-1-Foundation.html"><span class="card-n">1</span><span class="card-t">افهم الأساس</span><span class="card-d">الدرس التأسيسي: منظومة الخدمات والأدوار والوسوم</span></a>
<a class="card" href="pages/03-SERVICES/01-Building-Permit/README.html"><span class="card-n">2</span><span class="card-t">أتقن خدمة كاملة</span><span class="card-d">ابدأ برخصة البناء — أم الخدمات — بتبويباتها الست</span></a>
<a class="card" href="pages/08-TRAINING/Simulations/Simulation-01-Building-Permit.html"><span class="card-n">3</span><span class="card-t">طبّق واختبر</span><span class="card-d">محاكاة 9 محطات ثم الاختبار النهائي المجمّع</span></a>
</div></section>
{svc_cards}
<section class="section" id="tools"><h2>⚡ الأدوات الذكية — المنصة التفاعلية</h2>
<p class="section-sub">تطبيق تفاعلي يعمل داخل المتصفح مباشرة، مبني على بيانات الخدمات الـ14</p>
<div class="grid grid-3">
<a class="card" href="app.html?view=diagnostic"><span class="card-n">أداة 1</span><span class="card-t">المشخّص الذكي وشجرة القرارات</span><span class="card-d">أجب عن 3 أسئلة عن العقار والصك والهدف ← خارطة طريق تشغيلية متسلسلة بالمنصات والتحذيرات</span></a>
<a class="card" href="app.html?view=calculator"><span class="card-n">أداة 2</span><span class="card-t">حاسبة الرسوم البلدية والتسعير</span><span class="card-d">فصل الرسوم الحكومية عن أتعاب المكتب + الربحية المستهدفة — تقرير مالي فوري</span></a>
<a class="card" href="app.html?view=academy"><span class="card-n">أداة 3</span><span class="card-t">اختبار الكفاءة التفاعلي</span><span class="card-d">حالات عملية باختيارات — تصحيح فوري وتفسير نظامي لكل سؤال ومعيار 90%</span></a>
<a class="card" href="app.html?view=templates"><span class="card-n">أداة 4</span><span class="card-t">النماذج الجاهزة للنسخ</span><span class="card-d">عقود وعروض أسعار ونماذج تشغيلية بضغطة نسخ واحدة</span></a>
</div></section>
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
  <div>ENG540 · إصدار 2.0 · {date.today().isoformat()} · المحتوى معرفي تعليمي ولا يغني عن الاعتماد المهني النظامي</div>
</footer>
<script src="assets/search-index.js"></script>
<script src="assets/app.js"></script>
</body></html>"""
    open(os.path.join(REPO, 'index.html'), 'w', encoding='utf-8').write(home)
    print(f'✅ بناء v2: {count} صفحة + الرئيسية | {total_lines:,} سطر | فهرس بحث {len(search_docs)} مستنداً')

if __name__ == '__main__':
    main()
