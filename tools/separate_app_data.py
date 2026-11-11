#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
فصل البيانات عن الواجهة (متطلب التوجيه §8):
1) يستخرج كتل البيانات الخمس من app.html → app-data.js (المصدر المركزي للمنصة التفاعلية).
2) يرقّع app.html لتحميل البيانات من app-data.js بدل تضمينها.
3) يصلح رابط مجلد بلا index (P0) ويضيف لافتات «أداة إرشادية/تقديرية» (متطلب P1).
"""
import re, sys, os

REPO = '/root/DSH_Projects/eng540-services'
APP = os.path.join(REPO, 'app.html')
DATA = os.path.join(REPO, 'app-data.js')

NAMES = ['SERVICES_DATA', 'FEE_RATES', 'TRAINING_STAGES', 'EXAM_QUESTIONS', 'TEMPLATES_DATA']

def extract_block(src, name):
    """يستخرج `const NAME = {...| [...]};` بموازنة الأقواس."""
    start = src.find('const %s =' % name)
    if start == -1:
        raise SystemExit('لم يُعثر على ' + name)
    eq = src.index('=', start)
    i = eq + 1
    while src[i] in ' \n\t':
        i += 1
    opener = src[i]
    closer = {'[': ']', '{': '}'}[opener]
    depth, j = 0, i
    while j < len(src):
        c = src[j]
        if c in '[{':
            depth += 1
        elif c in ']}':
            depth -= 1
            if depth == 0:
                return src[start:j + 1] + ';', start, j + 1
        j += 1
    raise SystemExit('كتلة غير متوازنة: ' + name)

def main():
    s = open(APP, encoding='utf-8').read()
    blocks = []
    for n in NAMES:
        block, a, b = extract_block(s, n)
        blocks.append((n, block, a, b))

    # 1) app-data.js — المصدر المركزي
    header = ('/* ============================================================\n'
              ' * app-data.js — المصدر المركزي لبيانات المنصة التفاعلية ENG540\n'
              ' * حالة التحقق: مرجع المنظومة — تاريخ التحقق 2026-11-10\n'
              ' * القاعدة: الأرقام الرسمية (رسوم/مدد) إرشادية وتُسدد/تُعتمد من الجهات مباشرة،\n'
              ' * ولا تعتبر نهائية قبل مطابقتها مع المنصة الرسمية لكل حالة.\n'
              ' * ============================================================ */\n\n')
    open(DATA, 'w', encoding='utf-8').write(header + '\n\n'.join(b for _, b, _, _ in blocks) + '\n')
    print('app-data.js:', os.path.getsize(DATA), 'بايت ·', len(blocks), 'كتلة بيانات')

    # 2) إزالة الكتل من app.html (من الأخير إلى الأول لثبات المواضع) + وسم التحميل
    for _, _, a, b in sorted(blocks, key=lambda x: -x[2]):
        s = s[:a] + s[b:]
    s = s.replace('<script>\n    // =========================================================================',
                  '<script src="app-data.js"></script>\n    <script>\n    // =========================================================================', 1)

    # 3) P0: رابط مجلد بلا index → صفحة موجودة
    s = s.replace('<a href="pages/06-PRACTICAL-CASES/" class="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-lg">📁 حالات عملية ذات صلة</a>',
                  '<a href="pages/06-PRACTICAL-CASES/README.html" class="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-lg">📁 حالات عملية ذات صلة</a>')

    # 4) P1: لافتة إرشادية عامة تحت التبويبات مباشرة
    banner = '''    <div class="max-w-7xl mx-auto px-4 pt-3">
      <div class="bg-teal-50 border border-teal-300 text-teal-900 rounded-lg px-4 py-2 text-xs leading-relaxed">
        ⚠️ <b>أدوات تعليمية وإرشادية أولية:</b> المشخّص يقدم «توجيهاً أولياً» لا قراراً نظامياً، والحاسبة تعرض «تقديراً» لا فاتورة رسمية — الرسوم والمدد والاشتراطات النهائية تعتمدها الجهة المختصة لكل حالة، وتتحقق من المنصة الرسمية قبل أي التزام. مصادر المنظومة وتواريخ التحقق في <a href="pages/10-QUALITY-AND-UPDATES/Verification-Log.html" class="underline font-bold">سجل التحقق</a>.
      </div>
    </div>
'''
    s = s.replace('  <main class="max-w-7xl w-full mx-auto px-4 py-6 flex-1">',
                  '  <main class="max-w-7xl w-full mx-auto px-4 py-6 flex-1">\n' + banner, 1)

    open(APP, 'w', encoding='utf-8').write(s)
    print('app.html بعد الترقيع:', os.path.getsize(APP), 'بايت')
    # تحقق
    ok = all(('const %s =' % n) not in s for n in NAMES) and 'app-data.js' in s \
         and 'PRACTICAL-CASES/README.html' in s and 'أدوات تعليمية وإرشادية أولية' in s
    print('فصل البيانات + الإصلاحات:', 'مكتمل ✓' if ok else 'فشل ✗')
    sys.exit(0 if ok else 1)

if __name__ == '__main__':
    main()
