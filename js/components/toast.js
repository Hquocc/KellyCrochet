/**
 * toast.js  –  Component thông báo nhanh (Toast)
 *
 * Public API: Toast.show(message, duration?)
 */

(function () {
  'use strict';

  function render() {
    document.getElementById('toast-root').innerHTML =
      `<div class="toast-wrap" id="toast-wrap" aria-live="polite"></div>`;
  }

  /**
   * Hiển thị toast notification
   * @param {string} message
   * @param {number} duration  ms, mặc định 2500
   */
  function show(message, duration = 2500) {
    const wrap = document.getElementById('toast-wrap');
    if (!wrap) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    wrap.appendChild(toast);

    // Tự động tắt
    setTimeout(() => {
      toast.classList.add('dismiss');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
  }

  window.Toast = { show };
  render();
})();

