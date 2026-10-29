/**
 * animations.js  –  Scroll-reveal & hiệu ứng chung
 *
 * Sử dụng IntersectionObserver để trigger class .in-view
 * và .revealed khi phần tử vào viewport.
 *
 * Public API:
 *   Animations.observe(el)   → theo dõi 1 element
 *   Animations.init()        → theo dõi tất cả .section-fade-in & .img-reveal
 */

(function () {
  'use strict';

  document.documentElement.classList.add('js');

  function revealAll() {
    document.querySelectorAll('.section-fade-in').forEach((el) => {
      el.classList.add('in-view');
    });
    document.querySelectorAll('.img-reveal').forEach((el) => {
      el.classList.add('revealed');
    });
  }

  if (!('IntersectionObserver' in window)) {
    revealAll();
    return;
  }

  // ── Scroll Reveal Observer ─────────────────────────────────

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target); // chỉ trigger 1 lần
        }
      });
    },
    { threshold: 0.12 }
  );

  // ── Image Reveal Observer ──────────────────────────────────

  const imgObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          imgObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  function isInViewport(el) {
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  function reveal(el) {
    if (el.classList.contains('section-fade-in')) el.classList.add('in-view');
    if (el.classList.contains('img-reveal')) el.classList.add('revealed');
  }

  /**
   * Theo dõi 1 element để reveal
   * @param {Element} el
   */
  function observe(el) {
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || isInViewport(el)) {
      reveal(el);
      return;
    }
    if (el.classList.contains('section-fade-in')) revealObserver.observe(el);
    if (el.classList.contains('img-reveal'))      imgObserver.observe(el);
  }

  /**
   * Init: quét toàn bộ DOM và theo dõi
   */
  function init() {
    document.querySelectorAll('.section-fade-in, .img-reveal').forEach((el) => {
      observe(el);
    });
  }

  window.Animations = { observe, init };

  // Tự động init sau khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Delay nhỏ để các component khác render xong trước
    requestAnimationFrame(init);
  }
})();
