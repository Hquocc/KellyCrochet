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
    const galleryControls = images.length > 1 ? `
      <div class="product-detail__gallery-controls" aria-label="Điều khiển thư viện ảnh">
        <button class="product-detail__gallery-arrow" type="button" data-gallery-prev aria-label="Ảnh trước">‹</button>
        <span class="product-detail__gallery-count" id="product-gallery-count" aria-live="polite">1 / ${images.length}</span>
        <div class="product-detail__gallery-dots">
          ${images.map((image, index) => `<button type="button" class="product-detail__gallery-dot${index === 0 ? ' is-active' : ''}" data-gallery-slide="${index}" aria-label="Xem ảnh ${index + 1}" aria-pressed="${index === 0}"></button>`).join('')}
        </div>
        <button class="product-detail__gallery-arrow" type="button" data-gallery-next aria-label="Ảnh tiếp theo"${images.length === 1 ? ' disabled' : ''}>›</button>
      </div>
    ` : '';

    container.innerHTML = `
      <div class="product-detail__gallery">
        <div class="product-detail__gallery-viewport" id="product-gallery-viewport" tabindex="0" aria-label="Ảnh sản phẩm, vuốt ngang để xem thêm">
          <div class="product-detail__gallery-track">
            ${images.map((image, index) => `
              <div class="product-detail__gallery-slide" role="group" aria-label="Ảnh ${index + 1} trên ${images.length}">
                <img class="product-detail__img img-reveal" src="${escapeHTML(image)}" alt="${escapeHTML(product.name)}${images.length > 1 ? ` - ảnh ${index + 1}` : ''}" ${index ? 'loading="lazy"' : ''} onerror="this.src='assets/images/placeholder.jpg'" />
              </div>
            `).join('')}
          </div>
        </div>
        ${galleryControls}
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
    const gallery = document.getElementById('product-gallery-viewport');
    const galleryRoot = gallery.closest('.product-detail__gallery');
    const galleryDots = [...container.querySelectorAll('[data-gallery-slide]')];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let activeSlide = 0;
    let autoAdvanceTimer;
    const updateGalleryControls = () => {
      activeSlide = gallery.clientWidth
        ? Math.min(images.length - 1, Math.round(gallery.scrollLeft / gallery.clientWidth))
        : 0;
      galleryDots.forEach((dot, index) => {
        dot.classList.toggle('is-active', index === activeSlide);
        dot.setAttribute('aria-pressed', String(index === activeSlide));
      });
      const count = document.getElementById('product-gallery-count');
      if (count) count.textContent = `${activeSlide + 1} / ${images.length}`;
    };
    const stopAutoAdvance = () => {
      window.clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = undefined;
    };
    const scheduleAutoAdvance = () => {
      stopAutoAdvance();
      if (images.length < 2 || reducedMotion.matches || document.hidden
        || galleryRoot.matches(':hover') || galleryRoot.contains(document.activeElement)) return;
      autoAdvanceTimer = window.setTimeout(() => scrollToSlide(activeSlide + 1), 4000);
    };
    const scrollToSlide = (index) => {
      const nextSlide = (index + images.length) % images.length;
      gallery.scrollTo({
        left: nextSlide * gallery.clientWidth,
        behavior: reducedMotion.matches ? 'auto' : 'smooth',
      });
      scheduleAutoAdvance();
    };
    gallery.addEventListener('scroll', () => {
      updateGalleryControls();
      scheduleAutoAdvance();
    }, { passive: true });
    galleryDots.forEach((dot) => dot.addEventListener('click', () => scrollToSlide(Number(dot.dataset.gallerySlide))));
    container.querySelector('[data-gallery-prev]')?.addEventListener('click', () => scrollToSlide(activeSlide - 1));
    container.querySelector('[data-gallery-next]')?.addEventListener('click', () => scrollToSlide(activeSlide + 1));
    galleryRoot.addEventListener('pointerenter', stopAutoAdvance);
    galleryRoot.addEventListener('pointerleave', scheduleAutoAdvance);
    galleryRoot.addEventListener('pointerdown', stopAutoAdvance);
    galleryRoot.addEventListener('pointerup', scheduleAutoAdvance);
    galleryRoot.addEventListener('focusin', stopAutoAdvance);
    galleryRoot.addEventListener('focusout', () => window.setTimeout(scheduleAutoAdvance));
    gallery.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollToSlide(activeSlide - 1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollToSlide(activeSlide + 1);
      }
    });
    document.addEventListener('visibilitychange', scheduleAutoAdvance);
    reducedMotion.addEventListener('change', scheduleAutoAdvance);
    updateGalleryControls();
    scheduleAutoAdvance();
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
