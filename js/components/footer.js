/**
 * footer.js  –  Component Footer
 */

(function () {
  'use strict';

  function render() {
    const html = `
      <footer class="site-footer">
        <p>© 2026 KellyCrochet · Đồ móc len thủ công</p>
      </footer>
    `;
    document.getElementById('footer-root').innerHTML = html;
  }

  window.Footer = { render };
  render();
})();

