/**
 * search.js  –  Component Tìm kiếm overlay
 *
 * Public API: SearchOverlay.open() / close()
 */

(function () {
  'use strict';

  function render() {
    const html = `
      <div class="search-overlay" id="search-overlay" role="dialog" aria-modal="true" aria-label="Tìm kiếm">
        <button class="search-overlay__close" id="search-close-btn" aria-label="Đóng tìm kiếm">✕</button>
        <div class="search-overlay__inner">
          <div class="search-input-wrap">
            <!-- Search icon -->
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <circle cx="11" cy="11" r="7"/>
              <line x1="16.5" y1="16.5" x2="22" y2="22"/>
            </svg>
            <input
              class="search-input"
              id="search-input"
              type="text"
              placeholder="Tìm sản phẩm..."
              autocomplete="off"
              aria-label="Từ khoá tìm kiếm"
            />
          </div>
          <div class="search-results" id="search-results" aria-live="polite"></div>
        </div>
      </div>
    `;

    document.getElementById('search-overlay-root').innerHTML = html;
    bindEvents();
  }

  function bindEvents() {
    const overlay  = document.getElementById('search-overlay');
    const closeBtn = document.getElementById('search-close-btn');
    const input    = document.getElementById('search-input');

    closeBtn?.addEventListener('click', close);

    // Click ra ngoài (trên overlay chính) để đóng
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    // Tìm kiếm realtime
    input?.addEventListener('input', (e) => {
      handleSearch(e.target.value.trim());
    });

    // Phím Escape đóng
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

  function normalizeSearchText(value) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
  }

  /**
   * Lọc sản phẩm và render kết quả
   * @param {string} query
   */
  function handleSearch(query) {
    const resultsEl = document.getElementById('search-results');
    if (!resultsEl) return;

    if (!query) {
      resultsEl.innerHTML = '';
      return;
    }

    if (!window.ProductCatalog?.loaded) {
      resultsEl.textContent = 'Đang tải sản phẩm...';
      window.ProductCatalog.load().then(() => handleSearch(query)).catch((error) => {
        console.error('Không thể tải sản phẩm để tìm kiếm:', error);
        resultsEl.textContent = 'Không tải được sản phẩm. Vui lòng thử lại sau.';
      });
      return;
    }

    const normalizedQuery = normalizeSearchText(query);
    const matched = PRODUCTS.filter((p) =>
      normalizeSearchText(p.name).includes(normalizedQuery) ||
      normalizeSearchText(p.category).includes(normalizedQuery) ||
      p.colors.some((color) => normalizeSearchText(color).includes(normalizedQuery))
    );

    if (matched.length === 0) {
      resultsEl.innerHTML = `
        <p style="grid-column:1/-1; color:var(--color-text-muted); font-size:var(--text-sm);">
          Không tìm thấy sản phẩm nào.
        </p>
      `;
      return;
    }

    resultsEl.innerHTML = matched
      .map((p) => window.ProductCard?.renderMini(p) || '')
      .join('');
  }

  function open() {
    document.getElementById('search-overlay')?.classList.add('open');
    // Focus vào input sau khi animation
    setTimeout(() => {
      document.getElementById('search-input')?.focus();
    }, 50);
  }

  function close() {
    document.getElementById('search-overlay')?.classList.remove('open');
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').innerHTML = '';
  }

  window.SearchOverlay = { open, close, normalizeSearchText };
  render();
})();
