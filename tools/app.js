/* ENG540 v2 — التفاعلية: وضع ليلي · تقدم قراءة · أقسام قابلة للطي · متتبع الخطوات · بحث */
(function () {
  /* ===== 1) الوضع الليلي ===== */
  var themeBtn = document.getElementById('themeBtn');
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    if (themeBtn) themeBtn.textContent = t === 'dark' ? '☀️' : '🌙';
    try { localStorage.setItem('eng540-theme', t); } catch (e) {}
  }
  try {
    var saved = localStorage.getItem('eng540-theme');
    if (saved) setTheme(saved);
  } catch (e) {}
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(cur);
  });

  /* ===== 2) شريط تقدم القراءة ===== */
  var rp = document.getElementById('readProgress');
  if (rp) {
    window.addEventListener('scroll', function () {
      var h = document.documentElement;
      var p = (h.scrollTop) / Math.max(1, (h.scrollHeight - h.clientHeight));
      rp.style.width = (p * 100).toFixed(1) + '%';
    }, { passive: true });
  }

  /* ===== 3) طي/فتح المقاطع ===== */
  document.querySelectorAll('.doc-sec .sec-toggle').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var sec = btn.closest('.doc-sec');
      sec.classList.toggle('collapsed');
    });
  });

  /* ===== 4) متتبع الخطوات الـ25 (تقدم محفوظ محلياً) ===== */
  var cards = document.querySelectorAll('.step-card');
  if (cards.length) {
    var key = 'eng540-steps:' + location.pathname.replace(/[^\/]*(\.html)?$/, '') + cards[0].dataset.pageKey;
    var bar = document.getElementById('stepProgress');
    function storageKey() {
      // مفتاح مستقر: مسار مجلد الخدمة + اسم الملف
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
    // زر تصفير التقدم
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
      s.textContent = m[1];
      frag.appendChild(s);
      last = m.index + m[1].length;
    }
    if (last < node.nodeValue.length) frag.appendChild(document.createTextNode(node.nodeValue.slice(last)));
    node.parentNode.replaceChild(frag, node);
  });

  /* ===== 6) قائمة الجوال ===== */
  var btn = document.getElementById('menuBtn'), sb = document.getElementById('sidebar');
  if (btn && sb) btn.addEventListener('click', function () { sb.classList.toggle('show'); });

  /* ===== 7) البحث الفوري ===== */
  var input = document.getElementById('searchInput');
  var box = document.getElementById('searchResults');
  if (!input || !box) return;
  var docs = (window.SEARCH_DOCS || []);
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&', '<': '<', '>': '>', '"': '"' }[c]; }); }
  function highlight(text, terms) {
    var h = esc(text);
    terms.forEach(function (t) {
      h = h.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
    });
    return h;
  }
  var debounce;
  input.addEventListener('input', function () {
    clearTimeout(debounce);
    debounce = setTimeout(function () {
      var q = input.value.trim();
      if (q.length < 2) { box.hidden = true; box.innerHTML = ''; return; }
      var terms = q.split(/\s+/);
      var scored = [];
      for (var i = 0; i < docs.length; i++) {
        var d = docs[i], hay = (d.t + ' ' + d.g + ' ' + d.x), score = 0, ok = true;
        for (var j = 0; j < terms.length; j++) {
          var idx = hay.indexOf(terms[j]);
          if (idx === -1) { ok = false; break; }
          score += (d.t.indexOf(terms[j]) !== -1 ? 10 : 1) + (d.g.indexOf(terms[j]) !== -1 ? 3 : 0);
        }
        if (ok) scored.push({ d: d, s: score });
      }
      scored.sort(function (a, b) { return b.s - a.s; });
      var top = scored.slice(0, 15);
      box.innerHTML = top.length
        ? top.map(function (r) {
            var pos = r.d.x.indexOf(terms[0]);
            var start = Math.max(0, pos - 60);
            var excerpt = (start > 0 ? '…' : '') + r.d.x.substr(start, 190);
      var siteRoot = location.pathname.replace(/pages\/.*$/, ''); // جذر الموقع من أي عمق
      return '<a href="' + siteRoot + r.d.p + '"><span class="sr-g">' + esc(r.d.g) + '</span><br>' +
              '<b>' + highlight(r.d.t, terms) + '</b><br><span class="sr-g">' + highlight(excerpt, terms) + '</span></a>';
          }).join('')
        : '<a href="#">لا نتائج — جرّب كلمات أقل</a>';
      box.hidden = false;
    }, 160);
  });
  document.addEventListener('click', function (e) {
    if (!box.contains(e.target) && e.target !== input) box.hidden = true;
  });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.focus(); }
  });
})();
