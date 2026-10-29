/**
 * pages/shop.js  –  Logic trang cửa hàng
 *
 * Chức năng:
 *  - Render toàn bộ sản phẩm
 *  - Filter theo danh mục / màu sắc / giá
 *  - Sort
 *  - Cập nhật số lượng hiển thị
 */

(function () {
  'use strict';

  // Trạng thái filter/sort hiện tại
  const state = {
    category: 'all',
    color:    'all',
    price:    'all',
    sort:     'newest',
    query:    '',
  };

  // ── Lọc và sắp xếp ────────────────────────────────────────

  function getFilteredProducts() {
    let list = [...PRODUCTS];

    // Filter category
    if (state.category !== 'all') {
      list = list.filter((p) => p.category === state.category);
    }

    // Filter color
    if (state.color !== 'all') {
      list = list.filter((p) => p.colors.includes(state.color));
    }

    // Filter price
    if (state.price !== 'all') {
      const maxPrice = Number(state.price);
      list = list.filter((p) => p.price < maxPrice);
    }

    if (state.query) {
      const normalize = window.SearchOverlay.normalizeSearchText;
      const query = normalize(state.query);
      list = list.filter((p) =>
        normalize(p.name).includes(query) ||
        normalize(p.category).includes(query) ||
        p.colors.some((color) => normalize(color).includes(query))
      );
    }

    // Sort
    if (state.sort === 'price-asc')  list.sort((a, b) => a.price - b.price);
    if (state.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    if (state.sort === 'newest') list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return list;
  }

  // ── Render ─────────────────────────────────────────────────

  function render() {
    const products = getFilteredProducts();

    // Cập nhật đếm
    const countEl = document.getElementById('product-count');
    if (countEl) countEl.textContent = `${products.length} sản phẩm`;

    // Render grid
    const grid = document.getElementById('shop-product-grid');
    if (!products.length) {
      grid.innerHTML = `
        <p style="grid-column:1/-1;color:var(--color-text-muted);font-size:var(--text-sm);padding:var(--space-8) 0">
          ${state.query ? 'Không tìm thấy sản phẩm phù hợp.' : 'Chưa có sản phẩm phù hợp với bộ lọc.'}
        </p>
      `;
    } else {
      ProductCard.renderGrid(products, 'shop-product-grid');
    }

    // Re-init animations (do grid mới được inject)
    Animations.init();
  }

  // ── Bind events ────────────────────────────────────────────

  function bindFilterEvents() {
    // Tất cả filter buttons
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const filterType = btn.dataset.filter;  // "category" | "color" | "price"
        const value      = btn.dataset.value;

        state[filterType] = value;

        // Cập nhật active class trong cùng nhóm
        const group = btn.closest('ul');
        group?.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        render();
      });
    });
  }

  function bindSortEvent() {
    document.getElementById('sort-select')?.addEventListener('change', (e) => {
      state.sort = e.target.value;
      render();
    });
  }

  function bindSearchEvent() {
    document.getElementById('shop-search-input')?.addEventListener('input', (e) => {
      state.query = e.target.value.trim();
      render();
    });
  }

  // ── Init ───────────────────────────────────────────────────

  function renderCategories(categories) {
    const list = document.querySelector('[data-filter-list="category"]');
    if (!list) return;
    const selected = state.category;
    list.innerHTML = `<li><button class="filter-btn${selected === 'all' ? ' active' : ''}" data-filter="category" data-value="all">Tất cả</button></li>`
      + categories.map((category) => `<li><button class="filter-btn${category.name === selected ? ' active' : ''}" data-filter="category" data-value="${ProductCard.escapeHTML(category.name)}">${ProductCard.escapeHTML(category.name)}</button></li>`).join('');
  }

  function renderColors() {
    const list = document.querySelector('[data-filter-list="color"]');
    if (!list) return;
    const selected = state.color;
    const colors = [...new Set(PRODUCTS.flatMap((product) => product.colors))];
    list.innerHTML = `<li><button class="filter-btn${selected === 'all' ? ' active' : ''}" data-filter="color" data-value="all">Tất cả</button></li>`
      + colors.map((color) => `<li><button class="filter-btn${color === selected ? ' active' : ''}" data-filter="color" data-value="${ProductCard.escapeHTML(color)}">${ProductCard.escapeHTML(color)}</button></li>`).join('');
  }

  async function init() {
    try {
      await ProductCatalog.load();
      const categories = await KellyApi.all('/api/categories');
      renderCategories(categories);
      renderColors();
    } catch (error) {
      console.error('Không thể tải dữ liệu cửa hàng:', error);
      const grid = document.getElementById('shop-product-grid');
      if (grid) grid.innerHTML = '<p role="alert">Không tải được dữ liệu cửa hàng. Vui lòng tải lại trang sau.</p>';
      return;
    }
    render();
    bindFilterEvents();
    bindSortEvent();
    bindSearchEvent();

    if (window.location.hash === '#shop-search-input') {
      const searchInput = document.getElementById('shop-search-input');
      searchInput?.focus();
      searchInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
