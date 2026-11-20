/* ENG540 v3 — التفاعلية: وضع ليلي · تقدم قراءة · أقسام قابلة للطي · متتبع الخطوات · بحث مطبَّع عربيًا · درج جوال متاح · زر العودة للأعلى */
(function () {
  'use strict';

  /* ===== 1) الوضع الليلي (نموذج ثلاثي الحالات: النظام/فاتح/داكن) ===== */
  var themeBtn = document.getElementById('themeBtn');
  var themeMeta = document.querySelector('meta[name="color-scheme"]');
  function sysPref() {
    return (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    if (themeMeta) themeMeta.setAttribute('content', t);
    if (themeBtn) {
      themeBtn.textContent = t === 'dark' ? '☀️' : '🌙';
      themeBtn.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
    }
  }
  try { setTheme(localStorage.getItem('eng540-theme') || sysPref()); } catch (e) { setTheme('light'); }
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var rendered = document.documentElement.getAttribute('data-theme') || sysPref();
    var target = rendered === 'dark' ? 'light' : 'dark';
    try {
      if (target === sysPref()) localStorage.removeItem('eng540-theme');
      else localStorage.setItem('eng540-theme', target);
    } catch (e) {}
    setTheme(target);
  });
  window.addEventListener('storage', function (e) {
    if (e.key === 'eng540-theme' && (e.newValue === 'light' || e.newValue === 'dark')
        && e.newValue !== document.documentElement.getAttribute('data-theme')) setTheme(e.newValue);
  });
  if (window.matchMedia) {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (ev) {
      var stored = null;
      try { stored = localStorage.getItem('eng540-theme'); } catch (e) {}
      if (!stored) setTheme(ev.matches ? 'dark' : 'light');
    });
  }

  /* ===== 2) شريط تقدم القراءة + زر العودة إلى الأعلى ===== */
  var rp = document.getElementById('readProgress');
  var topBtn = document.getElementById('topBtn');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var h = document.documentElement;
      var y = h.scrollTop || document.body.scrollTop;
      if (rp) {
        var p = y / Math.max(1, (h.scrollHeight - h.clientHeight));
        rp.style.width = (p * 100).toFixed(1) + '%';
      }
      if (topBtn) topBtn.classList.toggle('show', y > 600);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  if (topBtn) {
    topBtn.addEventListener('click', function () {
      var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      var t = document.querySelector('.skip-link');
      if (t) { /* لا سرقة للتركيز — يبقى سياق القراءة في الأعلى */ }
    });
  }

  /* ===== 3) طي/فتح المقاطع ===== */
  document.querySelectorAll('.doc-sec .sec-toggle').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var sec = btn.closest('.doc-sec');
      sec.classList.toggle('collapsed');
      btn.setAttribute('aria-expanded', sec.classList.contains('collapsed') ? 'false' : 'true');
    });
  });

  /* ===== 4) متتبع الخطوات الـ25 (تقدم محفوظ محليًا) ===== */
  var cards = document.querySelectorAll('.step-card');
  if (cards.length) {
    var bar = document.getElementById('stepProgress');
    function storageKey() {
      return 'eng540-steps:' + location.pathname;
    }
    var done = {};
    try { done = JSON.parse(localStorage.getItem(storageKey()) || '{}'); } catch (e) { done = {}; }
    function render() {
      var n = 0;
      cards.forEach(function (c) {
        var chk = c.querySelector('.step-check');
        if (!chk) return;
        var st = c.dataset.step;
        chk.checked = !!done[st];
        c.classList.toggle('done', !!done[st]);
        if (done[st]) n++;
      });
      if (bar && bar.dataset.total) {
        var total = parseInt(bar.dataset.total, 10) || cards.length;
        bar.hidden = false;
        bar.innerHTML = '<div class="sp-head">تقدمك في هذه الخوارزمية: <b>' + n + ' / ' + total + '</b></div>' +
          '<div class="sp-bar"><div class="sp-fill" style="width:' + (total ? (n / total * 100) : 0) + '%"></div></div>';
        if (reset) bar.appendChild(reset);
      }
    }
    cards.forEach(function (c) {
      var chk = c.querySelector('.step-check');
      if (!chk) return;
      chk.addEventListener('change', function () {
        done[c.dataset.step] = chk.checked;
        try { localStorage.setItem(storageKey(), JSON.stringify(done)); } catch (e) {}
        render();
      });
    });
    render();
    if (bar) {
      var reset = document.createElement('button');
      reset.className = 'sp-reset';
      reset.textContent = 'تصفير';
      reset.addEventListener('click', function () {
        done = {};
        try { localStorage.removeItem(storageKey()); } catch (e) {}
        render();
      });
      bar.appendChild(reset);
    }
  }

  /* ===== 5) تلوين رموز التحقق ===== */
  var map = { '✅': 'tag-ok', '⚠️': 'tag-warn', '📚': 'tag-pro', '💼': 'tag-biz', '🧪': 'tag-demo' };
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: function (n) {
      if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      var p = n.parentNode;
      if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE' || p.nodeName === 'PRE')) return NodeFilter.FILTER_REJECT;
      for (var k in map) if (n.nodeValue.indexOf(k) !== -1) return NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_REJECT;
    }
  });
  var hits = [];
  while (walker.nextNode()) hits.push(walker.currentNode);
  hits.forEach(function (node) {
    var frag = document.createDocumentFragment();
    var re = /(✅|⚠️|📚|💼|🧪)/g, last = 0, m;
    while ((m = re.exec(node.nodeValue))) {
      if (m.index > last) frag.appendChild(document.createTextNode(node.nodeValue.slice(last, m.index)));
      var s = document.createElement('span');
      s.className = 'tag ' + (map[m[1]] || '');
      s.setAttribute('aria-label', ({
        '✅': 'معلومة متحقق منها رسميًا', '⚠️': 'معلومة تحتاج تحققًا', '📚': 'معرفة مهنية موثقة',
        '💼': 'ممارسة تجارية شائعة', '🧪': 'مثال تدريبي توضيحي'
      })[m[1]] || '');
      s.textContent = m[1];
      frag.appendChild(s);
      last = m.index + m[1].length;
    }
    if (last < node.nodeValue.length) frag.appendChild(document.createTextNode(node.nodeValue.slice(last)));
    node.parentNode.replaceChild(frag, node);
  });

  /* ===== 6) درج قائمة الجوال ===== */
  var menuBtn = document.getElementById('menuBtn');
  var sb = document.getElementById('sidebar');
  var backdrop = document.getElementById('backdrop');
  function setDrawer(open) {
    if (!sb) return;
    sb.classList.toggle('show', open);
    if (backdrop) backdrop.classList.toggle('show', open);
    if (menuBtn) menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (menuBtn && sb) {
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-controls', 'sidebar');
    menuBtn.addEventListener('click', function () {
      setDrawer(!sb.classList.contains('show'));
    });
    sb.addEventListener('click', function (e) {
      if (e.target.closest('a')) setDrawer(false); /* إغلاق بعد اختيار رابط */
    });
    if (backdrop) backdrop.addEventListener('click', function () { setDrawer(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sb.classList.contains('show')) {
        setDrawer(false);
        menuBtn.focus();
      }
    });
  }

  /* ===== 7) البحث الفوري المطبَّع عربيًا ===== */
  var input = document.getElementById('searchInput');
  var box = document.getElementById('searchResults');
  var status = document.getElementById('searchStatus');
  if (!input || !box) return;
  var rawDocs = (window.SEARCH_DOCS || []);

  /* تطبيع عربي: التشكيل والتطويل، الهمزات، التاء المربوطة، الألف المقصورة */
  function norm(s) {
    return (s || '')
      .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[ىئ]/g, 'ي')
      .replace(/ؤ/g, 'و')
      .toLowerCase();
  }
  var docs = rawDocs.map(function (d) {
    return { t: d.t, g: d.g, p: d.p, x: d.x, nt: norm(d.t), ng: norm(d.g), nx: norm(d.x) };
  });
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* نمط تحمّلي لمطابقة النص الأصلي (للتظليل) — كل حرف يقبل بدائله الإملائية */
  function tolerant(term) {
    var out = '';
    for (var i = 0; i < term.length; i++) {
      var c = term[i];
      if ('أإآٱا'.indexOf(c) !== -1) out += '[أإآٱا]';
      else if ('ةه'.indexOf(c) !== -1) out += '[ةه]';
      else if ('يىئ'.indexOf(c) !== -1) out += '[يىئ]';
      else if ('وؤ'.indexOf(c) !== -1) out += '[وؤ]';
      else out += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return out;
  }
  function highlight(text, terms) {
    var h = esc(text);
    terms.forEach(function (t) {
      try { h = h.replace(new RegExp('(' + tolerant(t) + ')', 'gi'), '<mark>$1</mark>'); } catch (e) {}
    });
    return h;
  }
  var debounce;
  input.addEventListener('input', function () {
    clearTimeout(debounce);
    debounce = setTimeout(function () {
      var q = input.value.trim();
      if (q.length < 2) { box.hidden = true; box.innerHTML = ''; input.setAttribute('aria-expanded', 'false'); if (status) status.textContent = ''; return; }
      var terms = q.split(/\s+/).map(norm).filter(Boolean);
      var scored = [];
      for (var i = 0; i < docs.length; i++) {
        var d = docs[i], hay = (d.nt + ' ' + d.ng + ' ' + d.nx), score = 0, ok = true;
        for (var j = 0; j < terms.length; j++) {
          var idx = hay.indexOf(terms[j]);
          if (idx === -1) { ok = false; break; }
          score += (d.nt.indexOf(terms[j]) !== -1 ? 10 : 1) + (d.ng.indexOf(terms[j]) !== -1 ? 3 : 0);
        }
        if (ok) scored.push({ d: d, s: score });
      }
      scored.sort(function (a, b) { return b.s - a.s; });
      var top = scored.slice(0, 15);
      if (status) status.textContent = top.length ? (scored.length + ' نتيجة — اعرض أول ' + top.length + ' منها، تنقل بالسهمين') : 'لا نتائج مطابقة';
      if (!top.length) {
        box.innerHTML = '<div class="no-results">لا نتائج لـ«' + esc(q) + '» — جرّب كلمات أقل أو مرادفًا (مثال: «صك» بدل «صكوك»)</div>';
        box.hidden = false; input.setAttribute('aria-expanded', 'true');
        return;
      }
      var siteRoot = location.pathname.replace(/pages\/.*$/, '');
      var firstTerm = terms[0];
      box.innerHTML = '<div class="sr-meta">' + scored.length + ' نتيجة — ↓↑ للتنقل · Esc للإغلاق</div>' +
        top.map(function (r) {
          /* مقطع مأخوذ من موضع أول مطابقة متحمّلة في النص الأصلي */
          var pos = -1;
          try { var mm = new RegExp(tolerant(firstTerm), 'i').exec(r.d.x); if (mm) pos = mm.index; } catch (e) {}
          if (pos === -1) pos = r.d.nx.indexOf(firstTerm) > -1 ? 0 : 0;
          var start = Math.max(0, pos - 60);
          var excerpt = (start > 0 ? '…' : '') + r.d.x.substr(start, 190);
          return '<a href="' + siteRoot + r.d.p + '"><span class="sr-g">' + esc(r.d.g) + '</span><br>' +
                  '<b>' + highlight(r.d.t, terms) + '</b><br><span class="sr-g">' + highlight(excerpt, terms) + '</span></a>';
        }).join('');
      box.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }, 160);
  });
  /* تنقل لوحة المفاتيح داخل النتائج */
  input.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    var links = box.querySelectorAll('a');
    if (!links.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); links[0].focus(); }
    else if (e.key === 'Escape') { box.hidden = true; box.innerHTML = ''; input.setAttribute('aria-expanded', 'false'); }
  });
  box.addEventListener('keydown', function (e) {
    var links = box.querySelectorAll('a');
    var i = Array.prototype.indexOf.call(links, document.activeElement);
    if (i === -1) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); links[Math.min(i + 1, links.length - 1)].focus(); }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (i === 0) input.focus();
      else links[i - 1].focus();
    }
    else if (e.key === 'Escape') { box.hidden = true; box.innerHTML = ''; input.setAttribute('aria-expanded', 'false'); input.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (!box.contains(e.target) && e.target !== input) { box.hidden = true; input.setAttribute('aria-expanded', 'false'); }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.focus(); }
  });
})();
