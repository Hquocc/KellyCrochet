(function () {
  'use strict';

  const escapeHTML = ProductCard.escapeHTML;
  let currentQty = 1;

  function renderNotFound(message) {
    const container = document.getElementById('product-detail');
    if (!container) return;
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:var(--space-16) 0;color:var(--color-text-muted)">
        <p role="alert">${escapeHTML(message)}</p>
        <a href="shop.html" class="btn btn--outline" style="margin-top:var(--space-6)">Về cửa hàng</a>
      </div>
    `;
  }

  function renderProductDetail(product) {
    const container = document.getElementById('product-detail');
    if (!container) return;
    document.title = `KellyCrochet – ${product.name}`;
    const images = product.images?.length ? product.images : [product.image];
    const featuresHTML = (product.features || []).map((feature) =>
      `<li class="product-detail__feature">${escapeHTML(feature)}</li>`
    ).join('');
    const colorOptions = product.colors.map((color) =>
      `<option value="${escapeHTML(color)}">${escapeHTML(color)}</option>`
    ).join('');
    const available = product.status !== 'out_of_stock' && product.quantity > 0;

    container.innerHTML = `
      <div class="product-detail__gallery">
        <img class="product-detail__img img-reveal" id="product-main-image" src="${escapeHTML(images[0])}" alt="${escapeHTML(product.name)}" onerror="this.src='assets/images/placeholder.jpg'" />
        ${images.length > 1 ? `<div class="product-detail__thumbnails">${images.map((image, index) =>
          `<button type="button" class="product-detail__thumbnail" data-image-index="${index}" aria-label="Xem ảnh ${index + 1}"><img src="${escapeHTML(image)}" alt="" loading="lazy" /></button>`
        ).join('')}</div>` : ''}
      </div>
      <div class="product-detail__info">
        <div class="product-detail__breadcrumb"><a href="shop.html">${escapeHTML(product.category.toUpperCase())}</a><span>/</span><span>${escapeHTML(product.name.toUpperCase())}</span></div>
        <h1 class="product-detail__name">${escapeHTML(product.name)}</h1>
        <p class="product-detail__price">${formatPrice(product.price)}</p>
        <p class="product-detail__desc">${escapeHTML(product.desc)}</p>
        ${featuresHTML ? `<ul class="product-detail__features">${featuresHTML}</ul>` : ''}
        <p>${available ? `Còn ${product.quantity} sản phẩm` : 'Sản phẩm hiện đã hết hàng.'}</p>
        <label class="form-label" for="product-color">MÀU SẮC</label>
        <select class="form-select" id="product-color">${colorOptions}</select>
        <div class="product-detail__actions">
          <div class="qty-control qty-control--lg" id="qty-control">
            <button class="qty-btn" id="qty-decrease" aria-label="Giảm">−</button>
            <span class="qty-value" id="qty-value">1</span>
            <button class="qty-btn" id="qty-increase" aria-label="Tăng">+</button>
          </div>
          <button class="btn btn--dark product-detail__add-btn" id="add-to-cart-btn" ${available ? '' : 'disabled'}>
            ${available ? 'THÊM VÀO GIỎ' : 'HẾT HÀNG'}
          </button>
        </div>
        <a href="custom.html" class="product-detail__custom-link">Muốn màu khác? Đặt món riêng →</a>
      </div>
    `;

    currentQty = 1;
    const quantity = document.getElementById('qty-value');
    document.getElementById('qty-decrease')?.addEventListener('click', () => {
      if (currentQty > 1) currentQty -= 1;
      quantity.textContent = currentQty;
    });
    document.getElementById('qty-increase')?.addEventListener('click', () => {
      if (currentQty < product.quantity) currentQty += 1;
      quantity.textContent = currentQty;
    });
    document.getElementById('add-to-cart-btn')?.addEventListener('click', () => {
      CartDrawer.addItem(product.id, currentQty, document.getElementById('product-color').value);
      CartDrawer.open();
    });
    container.querySelectorAll('[data-image-index]').forEach((button) => {
      button.addEventListener('click', () => {
        const image = images[Number(button.dataset.imageIndex)];
        document.getElementById('product-main-image').src = image;
      });
    });
    Animations.init();
  }

  async function init() {
    try {
      await ProductCatalog.load();
      const id = new URLSearchParams(window.location.search).get('id');
      const product = getProductById(id);
      if (!product) {
        renderNotFound('Không tìm thấy sản phẩm.');
        return;
      }
      renderProductDetail(product);
      ProductCard.renderGrid(getRelatedProducts(product.id, product.category, 3), 'related-product-grid');
    } catch (error) {
      console.error('Không thể tải sản phẩm:', error);
      renderNotFound('Không tải được sản phẩm. Vui lòng tải lại trang sau.');
    }
    Animations.init();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
