(function () {
  'use strict';

  const form = document.getElementById('checkout-form');
  const itemsContainer = document.getElementById('checkout-items');
  const subtotalElement = document.getElementById('checkout-subtotal');
  const shippingElement = document.getElementById('checkout-shipping');
  const totalElement = document.getElementById('checkout-total');
  const errorElement = document.getElementById('checkout-error');
  const submitButton = document.getElementById('checkout-submit');

  const citySelect = document.getElementById('shipping-city');
  const wardSelect = document.getElementById('shipping-ward');

  const SHIPPING_FEE = 30000;
  let cart = [];
  let products = [];
  let customQuote;

  // Đường dẫn dữ liệu địa chính tinh gọn (đã gộp sẵn 34 tỉnh, giảm 86% dung lượng)
  const LOCATION_CLEAN_URL = 'assets/data/vietnam-locations-clean.json';
  const LOCATION_FALLBACK_URL = 'assets/data/vietnam-locations.json';
  let locationsData = [];

  function readCart() {
    const stored = JSON.parse(localStorage.getItem('kc_cart') || '[]');
    if (!Array.isArray(stored)) throw new Error('Dữ liệu giỏ hàng không hợp lệ.');
    return stored;
  }

  function showError(message) {
    errorElement.textContent = message;
    errorElement.hidden = false;
  }

  /* ═══════════════════════════════════════════════════════════
     TẢI DỮ LIỆU ĐỊA CHÍNH: 34 TỈNH/THÀNH VÀ XÃ/PHƯỜNG (TỐC ĐỘ CAO)
     ═══════════════════════════════════════════════════════════ */
  async function fetchLocationData() {
    // 1. Kiểm tra cache trong localStorage (tải tức thì 0ms)
    try {
      const cached = localStorage.getItem('kc_clean_locations_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}

    // 2. Tải file tinh gọn nội bộ (~180KB, đã gộp và lọc sẵn)
    try {
      const response = await fetch(LOCATION_CLEAN_URL);
      if (response.ok) {
        const data = await response.json();
        try { localStorage.setItem('kc_clean_locations_v2', JSON.stringify(data)); } catch (_) {}
        return data;
      }
    } catch (err) {
      console.warn('Không tải được clean JSON, thử fallback:', err);
    }

    // 3. Dự phòng file gốc nếu chưa có
    try {
      const response = await fetch(LOCATION_FALLBACK_URL);
      if (response.ok) {
        const raw = await response.json();
        return raw;
      }
    } catch (err) {
      console.error('Không thể tải dữ liệu địa chính:', err);
    }
    return [];
  }

  async function initAdministrativeLocation() {
    if (!citySelect || !wardSelect) return;

    citySelect.innerHTML = '<option value="">-- Đang tải tỉnh/thành... --</option>';

    locationsData = await fetchLocationData();

    if (!Array.isArray(locationsData) || locationsData.length === 0) {
      citySelect.innerHTML = '<option value="">-- Lỗi tải danh sách tỉnh --</option>';
      return;
    }

    // Đổ danh sách Tỉnh/Thành
    citySelect.innerHTML = '<option value="">-- Chọn Tỉnh / Thành phố --</option>' +
      locationsData.map((prov, index) => `<option value="${prov.fullName || prov.name}" data-index="${index}">${prov.name}</option>`).join('');

    // Khi chọn tỉnh -> Đổ ngay danh sách Phường/Xã (tức thì <1ms)
    citySelect.addEventListener('change', function () {
      const selectedIndex = citySelect.options[citySelect.selectedIndex]?.dataset.index;

      wardSelect.innerHTML = '<option value="">-- Chọn Xã / Phường --</option>';
      wardSelect.disabled = true;

      if (selectedIndex === undefined || selectedIndex === '') return;

      const prov = locationsData[Number(selectedIndex)];
      if (!prov || !Array.isArray(prov.wards)) return;

      wardSelect.innerHTML = '<option value="">-- Chọn Xã / Phường --</option>' +
        prov.wards.map((w) => `<option value="${w}">${w}</option>`).join('');
      wardSelect.disabled = false;
    });
  }

  function renderItems() {
    const productMap = new Map(products.map((product) => [String(product.id), product]));
    const items = cart.map((item) => ({ ...item, product: productMap.get(String(item.id)) }));
    const valid = items.filter(({ product, qty, color }) =>
      product && Number.isSafeInteger(qty) && qty > 0 && product.colors.includes(color)
    );

    itemsContainer.innerHTML = valid.map(({ product, qty, color }) => `
      <article class="checkout-order__item">
        <img class="checkout-order__item-img" src="${ProductCard.escapeHTML(product.image)}" alt="${ProductCard.escapeHTML(product.name)}" onerror="this.src='assets/images/placeholder.jpg'" />
        <div>
          <p class="checkout-order__item-name">${ProductCard.escapeHTML(product.name)}</p>
          <p class="checkout-order__item-qty">${ProductCard.escapeHTML(color)} · ${formatPrice(product.price)} × ${qty}</p>
        </div>
        <span class="checkout-order__item-price">${formatPrice(product.price * qty)}</span>
      </article>
    `).join('');

    if (valid.length === 0 || valid.length !== cart.length) {
      submitButton.disabled = true;
      showError(valid.length === 0
        ? 'Giỏ hàng đang trống hoặc sản phẩm đã ngừng bán.'
        : 'Một số sản phẩm hoặc màu sắc trong giỏ không còn hợp lệ.');
      return;
    }

    const subtotal = valid.reduce((sum, item) => sum + item.product.price * item.qty, 0);
    subtotalElement.textContent = formatPrice(subtotal);
    shippingElement.textContent = formatPrice(SHIPPING_FEE);
    totalElement.textContent = formatPrice(subtotal + SHIPPING_FEE);
    cart = valid;
  }

  function getTrackedRequest(requestId) {
    let records;
    try {
      records = JSON.parse(localStorage.getItem('kc_custom_requests') || '[]');
    } catch (error) {
      throw new Error('Không đọc được mã theo dõi báo giá trên thiết bị này.', { cause: error });
    }
    if (!Array.isArray(records)) throw new Error('Dữ liệu theo dõi báo giá không hợp lệ.');
    const record = records.find((item) => item?.id === requestId && /^[a-f\d]{64}$/i.test(item.token || ''));
    if (!record) throw new Error('Không tìm thấy mã theo dõi báo giá trên thiết bị này.');
    return record;
  }

  async function renderCustomQuote(requestId) {
    const record = getTrackedRequest(requestId);
    customQuote = await KellyApi.request(`/api/requests/${encodeURIComponent(requestId)}`, {
      trackingToken: record.token,
    });
    if (customQuote.status !== 'quoted' || !Number.isSafeInteger(customQuote.quotedPrice)) {
      throw new Error('Báo giá này không còn chờ xác nhận. Hãy xem lại trang Đơn hàng của tôi.');
    }

    document.title = `KellyCrochet – Xác nhận ${customQuote.productName}`;
    document.querySelector('#page-checkout .page-title').textContent = 'Xác nhận đặt món riêng';
    document.querySelector('.checkout-header__desc').textContent =
      'Kiểm tra sản phẩm theo yêu cầu và nhập địa chỉ giao hàng. Thanh toán khi nhận hàng (COD).';
    document.getElementById('checkout-order-title').textContent = 'SẢN PHẨM ĐẶT RIÊNG';
    const backLink = form.querySelector('.checkout-form__back');
    backLink.href = 'orders.html';
    backLink.textContent = 'Quay lại báo giá';
    itemsContainer.innerHTML = `
      <article class="checkout-order__item checkout-order__custom-item">
        <div class="checkout-order__custom-image" aria-hidden="true">✿</div>
        <div>
          <p class="checkout-order__item-name">${ProductCard.escapeHTML(customQuote.productName)}</p>
          <p class="checkout-order__item-qty">${ProductCard.escapeHTML(customQuote.category)} · Màu: ${ProductCard.escapeHTML((customQuote.requestedColors || []).join(', '))}</p>
          <p class="checkout-order__item-qty">${ProductCard.escapeHTML(customQuote.description)}</p>
          <p class="checkout-order__item-qty">Mã yêu cầu #${ProductCard.escapeHTML(requestId.slice(-8).toUpperCase())}</p>
        </div>
        <span class="checkout-order__item-price">${formatPrice(customQuote.quotedPrice)}</span>
      </article>
      <p class="checkout-order__custom-message">${ProductCard.escapeHTML(customQuote.quoteMessage)}</p>
    `;
    subtotalElement.textContent = formatPrice(customQuote.quotedPrice);
    shippingElement.textContent = formatPrice(SHIPPING_FEE);
    totalElement.textContent = formatPrice(customQuote.quotedPrice + SHIPPING_FEE);

    for (const [name, value] of Object.entries({
      name: customQuote.customer.name,
      phone: customQuote.customer.phone,
      email: customQuote.customer.email || '',
    })) {
      const input = form.elements[name];
      if (input) {
        input.value = value;
        input.readOnly = true;
      }
    }
    submitButton.textContent = 'XÁC NHẬN ĐẶT MÓN RIÊNG · COD';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    errorElement.hidden = true;
    if (!form.reportValidity() || submitButton.disabled) return;
    submitButton.disabled = true;
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = 'Đang xử lý đơn hàng...';

    const data = new FormData(form);
    const customer = {
      name: String(data.get('name')).trim(),
      phone: String(data.get('phone')).trim(),
      email: String(data.get('email') || '').trim(),
      address: [
        String(data.get('address')).trim(),
        String(data.get('neighborhood') || '').trim(),
        String(data.get('ward')).trim(),
        String(data.get('city')).trim(),
      ].filter(Boolean).join(', '),
    };

    let order;
    try {
      order = customQuote
        ? await KellyApi.request(`/api/requests/${encodeURIComponent(customQuote.id)}`, {
          method: 'POST',
          trackingToken: getTrackedRequest(customQuote.id).token,
          body: {
            customer: {
              address: customer.address,
            },
          },
        })
        : await KellyApi.request('/api/orders', {
          method: 'POST',
          body: {
            customer,
            note: String(data.get('note') || '').trim(),
            paymentMethod: 'COD',
            items: cart.map((item) => ({
              productId: item.id,
              color: item.color,
              quantity: item.qty,
            })),
          },
        });
    } catch (error) {
      console.error('Không thể tạo đơn hàng:', error);
      showError(error.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
      return;
    }

    window.ProductCatalog?.clearCache?.();
    let trackingSaved = false;
    try {
      const savedOrders = JSON.parse(localStorage.getItem('kc_orders') || '[]');
      if (!Array.isArray(savedOrders)) throw new Error('Danh sách theo dõi đơn trên thiết bị không hợp lệ.');
      savedOrders.unshift(order);
      localStorage.setItem('kc_orders', JSON.stringify(savedOrders));
      trackingSaved = true;
    } catch (error) {
      console.error('Đơn đã được tạo nhưng không thể lưu thông tin theo dõi trên thiết bị:', error);
    }
    let cartCleared = true;
    if (!customQuote) {
      cartCleared = false;
      try {
        localStorage.setItem('kc_cart', JSON.stringify([]));
        cartCleared = true;
      } catch (error) {
        console.error('Đơn đã được tạo nhưng không thể xoá giỏ hàng trên thiết bị:', error);
      }
    }
    const query = new URLSearchParams({
      orderId: order._id || order.id || '',
      trackingSaved: trackingSaved ? '1' : '0',
      cartCleared: cartCleared ? '1' : '0',
      ...(customQuote ? { customOrder: '1' } : {}),
    });
    window.location.href = `orders.html?${query}`;
  }

  async function init() {
    initAdministrativeLocation();

    try {
      const requestId = new URLSearchParams(window.location.search).get('requestId');
      if (requestId) {
        await renderCustomQuote(requestId);
      } else {
        cart = readCart();
        products = await ProductCatalog.load();
        renderItems();
      }
    } catch (error) {
      console.error('Không thể tải dữ liệu checkout:', error);
      showError(error.message || 'Không tải được dữ liệu đơn hàng. Vui lòng tải lại trang.');
      submitButton.disabled = true;
    }
    form?.addEventListener('submit', handleSubmit);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
