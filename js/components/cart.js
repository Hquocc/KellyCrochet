/**
 * cart.js  –  Component Giỏ hàng (Cart Drawer)
 *
 * Lưu trữ: localStorage key "kc_cart"
 * Public API: CartDrawer.open() / close() / addItem(product, qty)
 */

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  /** @type {Array<{id:string|number, qty:number, color:string}>} */
  let storageError = null;
  let cartItems = loadFromStorage();
  let catalogReady = false;
  let catalogLoadError = null;
  let catalogPromise;

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);
  }

  // ── Storage helpers ────────────────────────────────────────

  function loadFromStorage() {
    try {
      const items = JSON.parse(localStorage.getItem('kc_cart') || '[]');
      if (!Array.isArray(items)) throw new Error('Dữ liệu giỏ hàng không phải danh sách.');
      if (items.some((item) =>
        !item || typeof item !== 'object' || Array.isArray(item)
        || !['string', 'number'].includes(typeof item.id)
        || !Number.isSafeInteger(item.qty) || item.qty < 1
        || typeof item.color !== 'string'
      )) throw new Error('Một hoặc nhiều sản phẩm trong giỏ hàng không hợp lệ.');
      return items;
    } catch (error) {
      storageError = error;
      console.error('Không thể đọc giỏ hàng trên thiết bị:', error);
      return [];
    }
  }

  function saveToStorage() {
    localStorage.setItem('kc_cart', JSON.stringify(cartItems));
  }

  // ── Cart logic ─────────────────────────────────────────────

  /** Tổng số lượng item trong giỏ */
  function getTotalCount() {
    return cartItems.reduce((sum, item) => sum + (Number.isSafeInteger(item.qty) ? item.qty : 0), 0);
  }

  /** Tổng tiền */
  function getTotalPrice() {
    return cartItems.reduce((sum, item) => {
      const product = getProductById(item.id);
      return sum + (product && Number.isSafeInteger(item.qty) ? product.price * item.qty : 0);
    }, 0);
  }

  /**
   * Thêm sản phẩm vào giỏ
   * @param {number} productId
   * @param {number} qty
   */
  function addItem(productId, qty = 1, color = '') {
    if (!catalogReady) {
      if (catalogLoadError) {
        window.Toast?.show('Không tải được sản phẩm. Vui lòng tải lại trang.');
        return;
      }
      window.Toast?.show('Đang tải sản phẩm, vui lòng thử lại sau giây lát.');
      catalogPromise.then((ready) => {
        if (ready) addItem(productId, qty, color);
      });
      return;
    }
    const product = getProductById(productId);
    if (!product || product.status === 'out_of_stock' || product.quantity < qty) {
      window.Toast?.show('Sản phẩm hiện không đủ hàng.');
      return;
    }
    const selectedColor = color || product.colors?.[0] || product.color;
    if (!selectedColor || !product.colors?.includes(selectedColor)) {
      window.Toast?.show('Vui lòng chọn màu sắc hợp lệ.');
      return;
    }
    const existing = cartItems.find((i) => String(i.id) === String(productId) && i.color === selectedColor);
    if (existing && existing.qty + qty > product.quantity) {
      window.Toast?.show('Số lượng trong kho không đủ.');
      return;
    }
    if (existing) {
      existing.qty += qty;
    } else {
      cartItems.push({ id: productId, qty, color: selectedColor });
    }
    saveToStorage();
    refresh();
    window.Header?.updateBadge(getTotalCount());
    window.Toast?.show('Đã thêm vào giỏ hàng ✓');
  }

  /**
   * Thay đổi số lượng
   * @param {number} productId
   * @param {number} delta  (+1 hoặc -1)
   */
  function changeQty(index, delta) {
    const item = cartItems[index];
    if (!item) return;
    const product = getProductById(item.id);
    if (delta > 0 && (!product || item.qty >= product.quantity)) {
      window.Toast?.show('Số lượng trong kho không đủ.');
      return;
    }
    item.qty += delta;
    if (item.qty <= 0) {
      cartItems.splice(index, 1);
    }
    saveToStorage();
    refresh();
    window.Header?.updateBadge(getTotalCount());
  }

  /**
   * Xoá 1 sản phẩm
   * @param {number} productId
   */
  function removeItem(index) {
    cartItems.splice(index, 1);
    saveToStorage();
    refresh();
    window.Header?.updateBadge(getTotalCount());
  }

  // ── Render ─────────────────────────────────────────────────

  function render() {
    const html = `
      <!-- Overlay (click để đóng) -->
      <div class="cart-overlay" id="cart-overlay"></div>

      <!-- Drawer -->
      <div class="cart-drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-label="Giỏ hàng">
        <div class="cart-drawer__header">
          <h2 class="cart-drawer__title">Giỏ hàng</h2>
          <button class="cart-drawer__close" id="cart-close-btn" aria-label="Đóng giỏ hàng">✕</button>
        </div>

        <div class="cart-drawer__body" id="cart-body"></div>

        <div class="cart-drawer__footer" id="cart-footer" style="display:none">
          <div class="cart-total">
            <span class="cart-total__label">Tổng cộng</span>
            <span class="cart-total__price" id="cart-total-price"></span>
          </div>
          <button class="btn btn--dark btn--full" id="cart-checkout-btn">TIẾN HÀNH ĐẶT HÀNG</button>
        </div>
      </div>
    `;

    document.getElementById('cart-drawer-root').innerHTML = html;
    bindEvents();
    refresh();
    window.Header?.updateBadge(getTotalCount());
  }

  /** Cập nhật nội dung body drawer */
  function refresh() {
    const body   = document.getElementById('cart-body');
    const footer = document.getElementById('cart-footer');
    const totalEl = document.getElementById('cart-total-price');
    if (!body) return;

    if (storageError) {
      body.innerHTML = '<div class="cart-empty"><p role="alert">Dữ liệu giỏ hàng trên thiết bị bị lỗi.</p><button class="btn btn--outline" type="button" data-clear-invalid-cart>Xoá dữ liệu lỗi</button></div>';
      if (footer) footer.style.display = 'none';
      return;
    }

    if (cartItems.length === 0) {
      body.innerHTML = `
        <div class="cart-empty">
          <p>Giỏ hàng trống.</p>
        </div>
      `;
      if (footer) footer.style.display = 'none';
      return;
    }

    body.innerHTML = cartItems.map((item, index) => {
      const product = getProductById(item.id);
      if (!product) return `
        <div class="cart-item cart-item--unavailable">
          <div><p class="cart-item__name">Sản phẩm không còn khả dụng</p><p role="alert">Hãy xoá sản phẩm này khỏi giỏ trước khi tiếp tục.</p></div>
          <button class="cart-item__remove" data-action="remove" data-index="${index}" aria-label="Xoá sản phẩm không khả dụng">✕</button>
        </div>`;
      const invalid = item.qty > product.quantity || !product.colors.includes(item.color);
      return `
        <div class="cart-item" data-id="${product.id}">
          <img
            class="cart-item__img"
            src="${escapeHTML(product.image)}"
            alt="${escapeHTML(product.name)}"
            onerror="this.src='assets/images/placeholder.jpg'"
          />
          <div>
            <p class="cart-item__name">${escapeHTML(product.name)}</p>
            <p class="cart-item__price">${formatPrice(product.price)} · ${escapeHTML(item.color)}</p>
            ${invalid ? '<p class="cart-item__warning" role="alert">Màu sắc hoặc số lượng hiện không còn khả dụng.</p>' : ''}
            <div class="qty-control">
              <button
                class="qty-btn"
                data-action="decrease"
                data-index="${index}"
                aria-label="Giảm số lượng"
              >−</button>
              <span class="qty-value">${escapeHTML(item.qty)}</span>
              <button
                class="qty-btn"
                data-action="increase"
                data-index="${index}"
                aria-label="Tăng số lượng"
              >+</button>
            </div>
          </div>
          <button
            class="cart-item__remove"
            data-action="remove"
            data-index="${index}"
            aria-label="Xoá ${product.name}"
          >✕</button>
        </div>
      `;
    }).join('');

    if (footer) {
      footer.style.display = 'block';
      if (totalEl) totalEl.textContent = formatPrice(getTotalPrice());
      const checkoutButton = document.getElementById('cart-checkout-btn');
      if (checkoutButton) {
        checkoutButton.disabled = cartItems.some((item) => {
          const product = getProductById(item.id);
          return !product || item.qty > product.quantity || !product.colors.includes(item.color);
        });
      }
    }
  }

  /** Gắn sự kiện cho drawer */
  function bindEvents() {
    const overlay  = document.getElementById('cart-overlay');
    const closeBtn = document.getElementById('cart-close-btn');
    const body     = document.getElementById('cart-body');
    const checkoutBtn = document.getElementById('cart-checkout-btn');

    overlay?.addEventListener('click', close);
    closeBtn?.addEventListener('click', close);

    // Sự kiện qty và remove dùng event delegation
    body?.addEventListener('click', (e) => {
      if (e.target.closest('[data-clear-invalid-cart]')) {
        try {
          localStorage.removeItem('kc_cart');
          storageError = null;
          cartItems = [];
          refresh();
          window.Header?.updateBadge(0);
        } catch (error) {
          console.error('Không thể xoá dữ liệu giỏ hàng bị lỗi:', error);
          window.Toast?.show('Không thể xoá dữ liệu giỏ hàng trên thiết bị.');
        }
        return;
      }
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const index = Number(btn.dataset.index);
      const action = btn.dataset.action;

      if (action === 'increase') {
        changeQty(index, +1);
        animateQtyBtn(btn);
      }
      if (action === 'decrease') {
        changeQty(index, -1);
        animateQtyBtn(btn);
      }
      if (action === 'remove') removeItem(index);
    });

    checkoutBtn?.addEventListener('click', handleCheckout);

    // Phím Escape đóng drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

  /** Hiệu ứng bounce khi bấm qty */
  function animateQtyBtn(btn) {
    btn.classList.remove('qty-bounce');
    void btn.offsetWidth; // reflow để reset animation
    btn.classList.add('qty-bounce');
  }

  /** Chuyển sang bước điền thông tin giao hàng */
  function handleCheckout() {
    if (cartItems.length === 0) return;
    window.location.href = 'checkout.html';
  }

  // ── Open / Close ───────────────────────────────────────────

  function open() {
    if (!catalogReady) {
      if (catalogLoadError) {
        window.Toast?.show('Không tải được sản phẩm. Vui lòng tải lại trang.');
        return;
      }
      window.Toast?.show('Đang tải giỏ hàng.');
      catalogPromise.then((ready) => {
        if (ready) open();
      });
      return;
    }
    document.getElementById('cart-overlay')?.classList.add('open');
    document.getElementById('cart-drawer')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    document.getElementById('cart-overlay')?.classList.remove('open');
    document.getElementById('cart-drawer')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Public API
  window.CartDrawer = { open, close, addItem };

  catalogPromise = window.ProductCatalog.load().then(() => {
    catalogReady = true;
    render();
    return true;
  }).catch((error) => {
    catalogLoadError = error;
    console.error('Không thể tải dữ liệu giỏ hàng:', error);
    const root = document.getElementById('cart-drawer-root');
    if (root) root.innerHTML = '<p role="alert">Không tải được giỏ hàng. Vui lòng tải lại trang.</p>';
    return false;
  });
})();
