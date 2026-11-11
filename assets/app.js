/* ENG540 — البحث الفوري + تلوين الوسوم + قائمة الجوال */
(function () {
  // 1) تلوين رموز التحقق داخل النص
  var map = {
    '✅': 'tag-ok', '⚠️': 'tag-warn', '📚': 'tag-pro', '💼': 'tag-biz', '🧪': 'tag-demo'
  };
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: function (n) {
      if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      var p = n.parentNode;
      if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE' || p.nodeName === 'PRE' || p.nodeName === 'A')) {
        // داخل روابط ونصوص كود لا نلمس (نحافظ على الروابط كما هي)
        if (p.nodeName !== 'A') return NodeFilter.FILTER_REJECT;
      }
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

  // 2) قائمة الجوال
  var btn = document.getElementById('menuBtn'), sb = document.getElementById('sidebar');
  if (btn && sb) btn.addEventListener('click', function () { sb.classList.toggle('show'); });

  // 3) البحث الفوري
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
            return '<a href="' + r.d.p.replace(/^pages\//, 'pages/') + '"><span class="sr-g">' + esc(r.d.g) + '</span><br>' +
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
