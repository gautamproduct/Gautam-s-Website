/* Extra analytics for kumargautam.com
 *
 * Performance: nothing here runs until the page has fully loaded AND the
 * browser is idle (requestIdleCallback, max 4s wait). Third-party scripts
 * (Clarity, GA4) are injected async at that point, so they never block
 * first paint, LCP or input. Scroll/section tracking uses passive,
 * rAF-throttled listeners and IntersectionObserver (no layout thrash).
 *
 * To switch a tool on, paste its ID below. Empty string = not loaded.
 */
(function () {
  var CLARITY_ID = 'zbghtj6c4a';   // Microsoft Clarity project ID
  var GA4_ID = '';       // Google Analytics 4 measurement ID, e.g. 'G-XXXXXXXXXX'

  var page = location.pathname.replace(/^\/|\/$/g, '').replace(/\/index\.html$/, '') || 'home';

  /* ---------- GoatCounter event helper (waits for count.js) ---------- */
  function gc(cb, tries) {
    tries = tries || 0;
    if (window.goatcounter && window.goatcounter.count) cb();
    else if (tries < 40) setTimeout(function () { gc(cb, tries + 1); }, 500);
  }
  function ev(path, title) {
    gc(function () { try { window.goatcounter.count({ path: path, title: title, event: true }); } catch (e) {} });
  }

  /* ---------- Third-party loaders ---------- */
  function loadClarity() {
    if (!CLARITY_ID) return;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
    try { window.clarity('set', 'page', page); } catch (e) {}
  }

  function loadGA4() {
    if (!GA4_ID) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID);
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(s);
  }
  function ga(name, params) { if (GA4_ID && window.gtag) try { window.gtag('event', name, params || {}); } catch (e) {} }

  /* ---------- Richer GoatCounter events ---------- */
  function deviceAndSource() {
    var ua = navigator.userAgent, w = window.innerWidth;
    var os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
      : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : 'Other';
    var kind = w < 600 ? 'phone' : w < 1024 ? 'tablet' : 'desktop';
    ev('device/' + os + ' ' + kind, 'Device: ' + os + ' ' + kind);

    var c = navigator.connection;
    if (c && c.effectiveType) ev('network/' + c.effectiveType + (c.saveData ? ' save-data' : ''), 'Network: ' + c.effectiveType);

    // Where this visit came from (only on first page of a session)
    try {
      if (!sessionStorage.getItem('ka_landed')) {
        sessionStorage.setItem('ka_landed', '1');
        var q = new URLSearchParams(location.search), src = q.get('utm_source');
        if (!src && document.referrer) { try { src = new URL(document.referrer).hostname.replace(/^www\./, ''); } catch (e) {} }
        if (src && src === location.hostname) src = '';
        src = (src || 'direct').slice(0, 40);
        ev('source/' + src, 'Came from: ' + src);
        ev('landing/' + page, 'Landed on: ' + page);
      }
    } catch (e) {}
  }

  function loadSpeed() {
    try {
      var n = performance.getEntriesByType('navigation')[0];
      if (!n) return;
      var ms = n.loadEventEnd || n.domContentLoadedEventEnd;
      if (!ms) return;
      var b = ms < 1000 ? '<1s' : ms < 2000 ? '1-2s' : ms < 4000 ? '2-4s' : '4s+';
      ev('speed/' + page + '/' + b, 'Page load ' + page + ': ' + b);
    } catch (e) {}
  }

  function scrollDepth() {
    var marks = [25, 50, 75, 100], hit = {}, ticking = false;
    function check() {
      ticking = false;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var pct = h <= 0 ? 100 : Math.round(window.scrollY / h * 100);
      for (var i = 0; i < marks.length; i++) {
        var m = marks[i];
        if (pct >= m - 2 && !hit[m]) {
          hit[m] = 1;
          ev('scroll/' + page + '/' + m, 'Scrolled ' + m + '% of ' + page);
          ga('scroll_depth', { percent: m, page: page });
        }
      }
      if (hit[100]) window.removeEventListener('scroll', onScroll);
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(check); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    check();
  }

  function sectionViews() {
    if (!('IntersectionObserver' in window)) return;
    var secs = document.querySelectorAll('section[id], [data-track-section]');
    if (!secs.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = (e.target.getAttribute('data-track-section') || e.target.id).slice(0, 40);
        ev('section/' + page + '/' + id, 'Viewed section: ' + id + ' (' + page + ')');
        io.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    secs.forEach(function (s) { io.observe(s); });
  }

  function errors() {
    var sent = 0;
    window.addEventListener('error', function (e) {
      if (sent++ > 2) return;
      var m = String(e.message || 'error').slice(0, 50);
      ev('js-error/' + page + '/' + m, 'JS error: ' + m);
    });
  }

  /* ---------- Start after load + idle, so the page is never slowed ---------- */
  function start() {
    deviceAndSource();
    loadSpeed();
    scrollDepth();
    sectionViews();
    errors();
    loadGA4();
    loadClarity();
  }
  function whenIdle() {
    if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 4000 });
    else setTimeout(start, 1500);
  }
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });
})();
