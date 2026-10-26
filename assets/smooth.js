/* Gel-smooth wheel scrolling (Lenis). Touch keeps native scrolling. */
(function () {
  if (!window.Lenis) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var lenis = new Lenis({
    duration: 1.25,
    easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 0.9
  });
  window.__lenis = lenis;
  function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);

  // In-page links glide instead of jumping
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id === '#') return;
    var el = id === '#top' ? null : document.querySelector(id);
    if (id !== '#top' && !el) return;
    e.preventDefault();
    lenis.scrollTo(el || 0, { offset: -70 });
    history.replaceState(null, '', id);
  });

  // Pause smooth scrolling while a modal or lightbox locks the page
  new MutationObserver(function () {
    document.body.style.overflow === 'hidden' ? lenis.stop() : lenis.start();
  }).observe(document.body, { attributes: true, attributeFilter: ['style'] });
})();
