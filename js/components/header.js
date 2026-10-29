/**
 * header.js  –  Component Header
 *
 * Tự động highlight nav link hiện tại theo URL.
 * Đọc số lượng giỏ hàng từ Cart và cập nhật badge.
 */

(function () {
  'use strict';

  const NAV_LINKS = [
    { href: 'shop.html',   label: 'Cửa hàng' },
    { href: 'guides.html', label: 'Cẩm nang' },
    { href: 'custom.html', label: 'Đặt món riêng' },
    { href: 'orders.html', label: 'Đơn hàng' },
  ];

  /**
   * Trả về tên file trang hiện tại (vd: "shop.html")
   */
  function currentPage() {
    const path = window.location.pathname;
    return path.split('/').pop() || 'index.html';
  }

  /**
   * Render HTML header và gắn vào #header-root
   */
  function render() {
    const page = currentPage();

    const navHTML = NAV_LINKS.map(({ href, label }) => {
      const isActive = href === page ? 'active' : '';
      return `<a href="${href}" class="site-nav__link ${isActive}">${label}</a>`;
    }).join('');

    const html = `
      <header class="site-header">
        <div class="site-header__inner">

          <!-- Logo -->
          <a href="index.html" class="site-logo">KellyCrochet</a>

          <!-- Nav -->
          <nav class="site-nav" aria-label="Điều hướng chính">
            ${navHTML}
          </nav>

          <!-- Actions: Search + Cart -->
          <div class="site-header__actions">
            <button
              class="header-icon-btn"
              id="search-toggle-btn"
              aria-label="Tìm kiếm"
              title="Tìm kiếm"
            >
              <!-- Search icon (SVG inline) -->
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                <circle cx="11" cy="11" r="7"/>
                <line x1="16.5" y1="16.5" x2="22" y2="22"/>
              </svg>
            </button>

            <button
              class="header-icon-btn"
              id="cart-toggle-btn"
              aria-label="Giỏ hàng"
              title="Giỏ hàng"
            >
              <!-- Cart icon -->
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              <span class="cart-badge" id="cart-badge" aria-live="polite">0</span>
            </button>
          </div>

        </div>
      </header>
    `;

    document.getElementById('header-root').innerHTML = html;
    bindEvents();
  }

  /**
   * Gắn sự kiện sau khi render
   */
  function bindEvents() {
    document.getElementById('search-toggle-btn')?.addEventListener('click', () => {
      const shopSearchInput = document.getElementById('shop-search-input');
      if (shopSearchInput) {
        shopSearchInput.focus();
        shopSearchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      window.location.href = 'shop.html#shop-search-input';
    });

    document.getElementById('cart-toggle-btn')?.addEventListener('click', () => {
      // Gọi CartDrawer component (cart.js)
      window.CartDrawer?.open();
    });
  }

  /**
   * Cập nhật số trên badge giỏ hàng
   * Được gọi bởi cart.js mỗi khi giỏ hàng thay đổi
   * @param {number} count
   */
  function updateBadge(count) {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    badge.textContent = count;
    badge.classList.toggle('visible', count > 0);
  }

  // Public API
  window.Header = { render, updateBadge };

  // Khởi chạy
  render();
})();
