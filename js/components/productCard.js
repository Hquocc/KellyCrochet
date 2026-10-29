/**
 * productCard.js  –  Component thẻ sản phẩm
 *
 * Public API:
 *   ProductCard.render(product)      → HTML string đầy đủ
 *   ProductCard.renderMini(product)  → HTML string nhỏ (dùng trong search)
 *   ProductCard.renderGrid(products, containerId)  → inject vào DOM
 */

(function () {
  'use strict';

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);
  }

  /**
   * Render 1 product card đầy đủ
   * @param {object} product
   * @returns {string} HTML
   */
  function render(product) {
    const id = escapeHTML(product.id);
    const name = escapeHTML(product.name);
    const image = escapeHTML(product.image);
    const category = escapeHTML(product.category || '');
    const available = product.status !== 'out_of_stock' && product.quantity > 0;
    const color = escapeHTML(product.colors?.[0] || product.color || '');
    return `
      <a
        href="product.html?id=${encodeURIComponent(product.id)}"
        class="product-card"
        aria-label="${name} – ${formatPrice(product.price)}"
      >
        <div class="product-card__img-wrap">
          <img
            class="product-card__img"
            src="${image}"
            alt="${name}"
            loading="lazy"
            onerror="this.src='assets/images/placeholder.jpg'"
          />
          <div class="product-card__overlay">
            <button
              class="product-card__quick-add"
              data-product-id="${id}"
              data-product-color="${color}"
              ${available ? '' : 'disabled'}
              aria-label="${available ? 'Thêm nhanh ' + name + ' vào giỏ' : name + ' đã hết hàng'}"
            >
              ${available ? '+ Thêm vào giỏ' : 'Hết hàng'}
            </button>
          </div>
        </div>
        <div class="product-card__meta">
          <span class="product-card__name">${name}</span>
          <span class="product-card__price">${formatPrice(product.price)}</span>
        </div>
        <p class="product-card__cat" data-cat="${category}">
          ${category.toUpperCase()}
        </p>
      </a>
    `;
  }

  /**
   * Render card mini (dùng trong search overlay)
   * @param {object} product
   * @returns {string} HTML
   */
  function renderMini(product) {
    const id = escapeHTML(product.id);
    const name = escapeHTML(product.name);
    return `
      <a href="product.html?id=${encodeURIComponent(product.id)}" class="product-card">
        <div class="product-card__img-wrap" style="aspect-ratio:1/1">
          <img
            class="product-card__img"
            src="${escapeHTML(product.image)}"
            alt="${name}"
            loading="lazy"
            onerror="this.src='assets/images/placeholder.jpg'"
          />
        </div>
        <div class="product-card__meta">
          <span class="product-card__name" style="font-size:var(--text-sm)">${name}</span>
          <span class="product-card__price">${formatPrice(product.price)}</span>
        </div>
      </a>
    `;
  }

  /**
   * Inject danh sách cards vào container
   * @param {object[]} products
   * @param {string}   containerId
   */
  function renderGrid(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (products.length === 0) {
      container.innerHTML = `
        <p style="grid-column:1/-1;color:var(--color-text-muted);font-size:var(--text-sm);padding:var(--space-8) 0">
          Không có sản phẩm.
        </p>
      `;
      return;
    }

    container.innerHTML = products.map(render).join('');
    if (container.dataset.quickAddBound !== 'true') {
      container.addEventListener('click', (event) => {
        const button = event.target.closest('[data-product-id]');
        if (!button) return;
        event.preventDefault();
        window.CartDrawer?.addItem(button.dataset.productId, 1, button.dataset.productColor);
      });
      container.dataset.quickAddBound = 'true';
    }

    // Kích hoạt scroll animation cho từng card
    container.querySelectorAll('.product-card').forEach((card) => {
      window.Animations?.observe(card);
    });
  }

  window.ProductCard = { escapeHTML, render, renderMini, renderGrid };
})();
