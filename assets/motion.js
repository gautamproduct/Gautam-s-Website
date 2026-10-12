/* kumargautam.com: lightweight motion layer (no libraries).
   Loaded with `defer`, starts when the browser is idle, and is skipped
   entirely for visitors who prefer reduced motion. */
(function () {
  if (!window.matchMedia || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 200); };

  idle(function () {
    var css = [
      /* 1. Titles: words rise out of a mask */
      '.mw{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.12em;margin-bottom:-.12em}',
      '.mw>span{display:inline-block;transform:translateY(105%);transition:transform .8s cubic-bezier(.2,.8,.2,1);transition-delay:calc(var(--wi)*55ms)}',
      '.m-in .mw>span{transform:none}',
      /* 2. Images: clip-wipe reveal */
      '.m-img{clip-path:inset(0 0 100% 0 round 12px);transition:clip-path 1s cubic-bezier(.7,0,.2,1)}',
      '.m-img.m-in{clip-path:inset(0 0 0 0 round 12px)}',
      /* 3. Magnetic buttons */
      '.m-mag{transition:translate .3s cubic-bezier(.2,.8,.2,1)}',
      /* 4. Number roll */
      '.m-num{font-variant-numeric:tabular-nums}'
    ].join('');
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('m-in');
        if (e.target.__roll) { e.target.__roll(); e.target.__roll = null; }
        io.unobserve(e.target);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -5% 0px' });

    /* 1. Split section titles into masked words, keeping <em> etc. intact */
    document.querySelectorAll('.section-title').forEach(function (h) {
      if (h.__split) return; h.__split = true;
      var i = 0;
      (function walk(node) {
        [].slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var parts = n.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
            parts.forEach(function (p) {
              if (!p) return;
              if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
              var w = document.createElement('span'); w.className = 'mw';
              var inner = document.createElement('span'); inner.textContent = p; inner.style.setProperty('--wi', i++);
              w.appendChild(inner); frag.appendChild(w);
            });
            n.parentNode.replaceChild(frag, n);
          } else if (n.nodeType === 1 && !n.classList.contains('mw')) walk(n);
        });
      })(h);
      if (h.getBoundingClientRect().top < innerHeight) h.classList.add('m-in'); else io.observe(h);
    });

    /* 2. Clip-wipe for content images below the fold */
    document.querySelectorAll('.card-shot img,.feat-shot img,.video-thumb img,.pc-shot img,.shot img').forEach(function (im) {
      if (!im.getAttribute('src') || im.getBoundingClientRect().top < innerHeight) return;
      im.classList.add('m-img'); io.observe(im);
      /* safety net: re-check once the image has loaded (size may have been 0 before) */
      im.addEventListener('load', function () { if (!im.classList.contains('m-in')) { io.unobserve(im); io.observe(im); } }, { once: true });
    });
    setTimeout(function () { document.querySelectorAll('.m-img:not(.m-in)').forEach(function (im) { if (im.getBoundingClientRect().top < innerHeight) im.classList.add('m-in'); }); }, 2500);


    /* 3. Magnetic primary buttons (mouse devices only) */
    if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
      document.querySelectorAll('.btn-hero,.btn-ghost,.why-ghost,.nav-cta,.pc-btn').forEach(function (b) {
        b.classList.add('m-mag');
        b.addEventListener('pointermove', function (e) {
          var r = b.getBoundingClientRect();
          b.style.translate = ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1) + 'px';
        });
        b.addEventListener('pointerleave', function () { b.style.translate = ''; });
      });
    }

    /* 4. Numbers roll up when they scroll into view (plain-text numbers only) */
    document.querySelectorAll('.stat b,.tk-stat b,.f-step b,.pstats b,.why-card b').forEach(function (el) {
      if (el.children.length || el.closest('[aria-hidden="true"]')) return;
      var txt = el.textContent, m = txt.match(/(\d[\d,]*\.?\d*)/);
      if (!m) return;
      var raw = m[1], end = parseFloat(raw.replace(/,/g, '')), dec = (raw.split('.')[1] || '').length, comma = raw.indexOf(',') > -1;
      if (!isFinite(end) || end === 0) return;
      var pre = txt.slice(0, m.index), post = txt.slice(m.index + raw.length);
      var fmt = function (v) { var s = v.toFixed(dec); if (comma) s = Number(s).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }); return pre + s + post; };
      el.classList.add('m-num');
      el.__roll = function () {
        var t0 = performance.now(), d = 1300;
        (function step(t) { var p = Math.min((t - t0) / d, 1), e = 1 - Math.pow(1 - p, 4); el.textContent = fmt(end * e); if (p < 1) requestAnimationFrame(step); else el.textContent = txt; })(t0);
      };
      if (el.getBoundingClientRect().top > innerHeight) io.observe(el);
    });

    /* Backup for devices where IntersectionObserver is unreliable: check on scroll and on a timer */
    var pend = function () {
      document.querySelectorAll('.section-title:not(.m-in),.m-img:not(.m-in),.m-num:not(.m-in)').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < innerHeight * 0.95 && r.bottom > 0) { el.classList.add('m-in'); if (el.__roll) { el.__roll(); el.__roll = null; } }
      });
    };
    addEventListener('scroll', pend, { passive: true }); setTimeout(pend, 1500); setTimeout(pend, 4000);
  });
})();
