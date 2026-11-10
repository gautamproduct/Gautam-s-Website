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
  var GA4_ID = 'G-5GMMD7S2LP';   // Google Analytics 4 measurement ID (property "kumargautam.com")

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
  function clarityTag(k, v) { try { window.clarity && window.clarity('set', k, v); } catch (e) {} }

  /* ---------- Where did this visit come from? (app / site) ---------- */
  var APP_PACKAGES = {
    'com.whatsapp': 'WhatsApp', 'com.whatsapp.w4b': 'WhatsApp Business',
    'org.telegram.messenger': 'Telegram', 'org.thunderdog.challegram': 'Telegram',
    'com.instagram.android': 'Instagram', 'com.facebook.katana': 'Facebook',
    'com.facebook.orca': 'Messenger', 'com.linkedin.android': 'LinkedIn',
    'com.google.android.gm': 'Gmail', 'com.twitter.android': 'X (Twitter)',
    'com.snapchat.android': 'Snapchat', 'com.google.android.googlequicksearchbox': 'Google app',
    'com.truecaller': 'Truecaller', 'com.google.android.apps.messaging': 'SMS (Google Messages)',
    'com.samsung.android.messaging': 'SMS (Samsung)', 'com.discord': 'Discord',
    'com.slack': 'Slack', 'com.microsoft.teams': 'Teams'
  };
  var HOSTS = [
    [/(^|\.)whatsapp\.com$|^wa\.me$/, 'WhatsApp'], [/(^|\.)t\.me$|telegram\.org$/, 'Telegram'],
    [/instagram\.com$/, 'Instagram'], [/facebook\.com$|fb\.com$|messenger\.com$/, 'Facebook'],
    [/linkedin\.com$|lnkd\.in$/, 'LinkedIn'], [/^t\.co$|twitter\.com$|^x\.com$/, 'X (Twitter)'],
    [/mail\.google\.com$|gmail\.com$/, 'Gmail'], [/outlook\.|mail\.yahoo/, 'Email'],
    [/(^|\.)google\./, 'Google'], [/bing\.com$/, 'Bing'], [/duckduckgo\.com$/, 'DuckDuckGo'],
    [/youtube\.com$|youtu\.be$/, 'YouTube'], [/reddit\.com$/, 'Reddit'], [/snapchat\.com$/, 'Snapchat'],
    [/chatgpt\.com$|openai\.com$/, 'ChatGPT'], [/claude\.ai$/, 'Claude'], [/perplexity\.ai$/, 'Perplexity']
  ];
  function cameFrom() {
    var ua = navigator.userAgent, ref = document.referrer || '';
    // 1) In-app browsers announce themselves in the user agent
    if (/Instagram/i.test(ua)) return 'Instagram';
    if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'Facebook';
    if (/LinkedInApp/i.test(ua)) return 'LinkedIn';
    if (/Snapchat/i.test(ua)) return 'Snapchat';
    if (/Twitter/i.test(ua)) return 'X (Twitter)';
    if (/Telegram/i.test(ua)) return 'Telegram';
    if (/WhatsApp/i.test(ua)) return 'WhatsApp';
    if (/Line\//i.test(ua)) return 'LINE';
    // 2) Android apps pass android-app://<package> as the referrer
    var m = ref.match(/^android-app:\/\/([^/]+)/);
    if (m) return APP_PACKAGES[m[1]] || ('App: ' + m[1]);
    // 3) Websites
    if (ref) {
      try {
        var h = new URL(ref).hostname.replace(/^www\.|^m\.|^l\.|^lm\./, '');
        if (h === location.hostname) return '';
        for (var i = 0; i < HOSTS.length; i++) if (HOSTS[i][0].test(h)) return HOSTS[i][1];
        return h;
      } catch (e) {}
    }
    // 4) No referrer: WhatsApp/SMS/typed/bookmark usually land here
    return 'Direct / WhatsApp / typed';
  }

  /* ---------- Share-chain: links made by the Share button carry ?ref=share&hop=N ---------- */
  var params = new URLSearchParams(location.search);
  var hop = parseInt(params.get('hop') || '0', 10) || 0;
  try {
    if (hop) sessionStorage.setItem('ka_hop', hop);
    else hop = parseInt(sessionStorage.getItem('ka_hop') || '0', 10) || 0;
  } catch (e) {}

  // Public helpers for page scripts (e.g. the biodata Share button)
  window.kaTrack = function (path, title, gaName, gaParams) {
    ev(path, title || path);
    if (gaName) ga(gaName, gaParams);
    try { window.clarity && window.clarity('event', path.replace(/[^a-z0-9]+/gi, '_')); } catch (e) {}
  };
  window.kaShareUrl = function (method) {
    // Keep shared links short and clean (looks trustworthy in WhatsApp, quick preview)
    return location.origin + location.pathname + '?hop=' + (hop + 1);
  };

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
        var src = (cameFrom() || 'Direct / WhatsApp / typed').slice(0, 40);
        ev('came-from/' + src, 'Came from: ' + src);
        ev('landing/' + page, 'Landed on: ' + page);
        ga('came_from', { platform: src, landing: page, share_hop: hop });
        clarityTag('came_from', src);
        if (hop) {
          ev('shared-open/hop-' + hop + '/' + src, 'Opened a shared link (hop ' + hop + ') via ' + src);
          ga('shared_link_open', { hop: hop, platform: src });
          clarityTag('share_hop', String(hop));
        }
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
        ga('section_view', { section: id, page: page });
        try { window.clarity && window.clarity('event', 'section_' + id); } catch (_) {}
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
    loadGA4();          // set up the gtag queue first so early events aren't dropped
    deviceAndSource();
    loadSpeed();
    scrollDepth();
    sectionViews();
    errors();
    loadClarity();
  }
  function whenIdle() {
    if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 4000 });
    else setTimeout(start, 1500);
  }
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });
})();
