(function () {
  'use strict';

  const form = document.getElementById('checkout-form');
  const itemsContainer = document.getElementById('checkout-items');
  const subtotalElement = document.getElementById('checkout-subtotal');
  const shippingElement = document.getElementById('checkout-shipping');
  const totalElement = document.getElementById('checkout-total');
  const errorElement = document.getElementById('checkout-error');
  const submitButton = document.getElementById('checkout-submit');
  const SHIPPING_FEE = 30000;
  let cart = [];
  let products = [];

  function readCart() {
    const stored = JSON.parse(localStorage.getItem('kc_cart') || '[]');
    if (!Array.isArray(stored)) throw new Error('Dữ liệu giỏ hàng không hợp lệ.');
    return stored;
  }

  function showError(message) {
    errorElement.textContent = message;
    errorElement.hidden = false;
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

  async function handleSubmit(event) {
    event.preventDefault();
    errorElement.hidden = true;
    if (!form.reportValidity() || submitButton.disabled) return;
    submitButton.disabled = true;

    const data = new FormData(form);
    const customer = {
      name: String(data.get('name')).trim(),
      phone: String(data.get('phone')).trim(),
      email: String(data.get('email') || '').trim(),
      address: [
        String(data.get('address')).trim(),
        String(data.get('neighborhood')).trim(),
        String(data.get('ward')).trim(),
        String(data.get('city')).trim(),
      ].filter(Boolean).join(', '),
    };

    let order;
    try {
      order = await KellyApi.request('/api/orders', {
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
      return;
    }

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
    let cartCleared = false;
    try {
      localStorage.setItem('kc_cart', JSON.stringify([]));
      cartCleared = true;
    } catch (error) {
      console.error('Đơn đã được tạo nhưng không thể xoá giỏ hàng trên thiết bị:', error);
    }
    const query = new URLSearchParams({
      orderId: order._id || order.id || '',
      trackingSaved: trackingSaved ? '1' : '0',
      cartCleared: cartCleared ? '1' : '0',
    });
    window.location.href = `orders.html?${query}`;
  }

  async function init() {
    try {
      cart = readCart();
      products = await ProductCatalog.load();
      renderItems();
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
