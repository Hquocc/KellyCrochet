(function () {
  'use strict';

  const STATUS_LABELS = {
    pending_confirmation: 'Chờ xác nhận',
    preparing: 'Đang chuẩn bị',
    shipping: 'Đang giao',
    completed: 'Hoàn thành',
    cancelled: 'Đã huỷ',
  };

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);
  }

  function loadOrders() {
    const orders = JSON.parse(localStorage.getItem('kc_orders') || '[]');
    if (!Array.isArray(orders)) throw new Error('Dữ liệu theo dõi đơn hàng không hợp lệ.');
    return orders;
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value || '') : new Intl.DateTimeFormat('vi-VN').format(date);
  }

  function render() {
    const container = document.getElementById('orders-container');
    if (!container) return;
    const query = new URLSearchParams(window.location.search);
    const createdOrderId = query.get('orderId') || '';
    const trackingSaved = query.get('trackingSaved') !== '0';
    const cartCleared = query.get('cartCleared') !== '0';
    let orders;
    try {
      orders = loadOrders();
    } catch (error) {
      console.error('Không thể tải đơn hàng đã lưu:', error);
      container.innerHTML = createdOrderId
        ? `<p role="alert">Đơn hàng #${escapeHTML(createdOrderId.slice(-8).toUpperCase())} đã được gửi, nhưng danh sách theo dõi trên thiết bị bị lỗi. Hãy lưu mã đơn để liên hệ với cửa hàng.</p>`
        : '<p role="alert">Không đọc được danh sách đơn hàng trên thiết bị này.</p>';
      return;
    }

    const savedOrder = orders.find((order) => String(order._id || order.id || '') === createdOrderId);
    let confirmation = '';
    if (createdOrderId) {
      confirmation = `<p class="orders-confirmation" role="status">Đơn hàng #${escapeHTML(createdOrderId.slice(-8).toUpperCase())} đã được gửi đến cửa hàng.${trackingSaved ? '' : ' Không thể lưu trạng thái theo dõi trên thiết bị; hãy giữ lại mã đơn để liên hệ với cửa hàng.'}${cartCleared ? '' : ' Giỏ hàng trên thiết bị chưa được xoá; hãy kiểm tra trước khi đặt đơn tiếp.'}</p>`;
      if (!savedOrder) {
        container.innerHTML = `${confirmation}<a href="shop.html" class="btn btn--dark">TIẾP TỤC MUA SẮM</a>`;
        return;
      }
    }

    if (orders.length === 0) {
      container.innerHTML = `
        ${confirmation}
        <div class="orders-empty">
          <p class="orders-empty__msg">Bạn chưa có đơn hàng nào trên thiết bị này.</p>
          <a href="shop.html" class="btn btn--dark">MUA SẮM NGAY</a>
        </div>`;
      return;
    }

    container.innerHTML = `${confirmation}${orders.map((order) => {
      const items = (order.items || []).map((item) => {
        const name = item.productName || item.name || 'Sản phẩm';
        const quantity = item.quantity || item.qty || 0;
        const color = item.color ? ` · ${escapeHTML(item.color)}` : '';
        return `${escapeHTML(name)}${color} ×${escapeHTML(quantity)}`;
      }).join(', ');
      const customer = order.customer || {};
      const status = STATUS_LABELS[order.status] || order.status || 'Chờ xác nhận';
      const address = customer.address || [customer.neighborhood, customer.ward, customer.city].filter(Boolean).join(', ');
      const orderId = order._id || order.id || '';
      const total = order.totalAmount ?? order.total ?? 0;

      return `
        <article class="order-item">
          <div>
            <p class="order-item__name">Đơn hàng #${escapeHTML(String(orderId).slice(-8).toUpperCase())}</p>
            <p class="order-item__meta">${escapeHTML(formatDate(order.createdAt || order.date))} · ${items}</p>
            <p class="order-item__meta">${escapeHTML(customer.name || '')} · ${escapeHTML(customer.phone || '')}</p>
            <p class="order-item__meta">${escapeHTML(address)}</p>
            ${order.note ? `<p class="order-item__meta">Ghi chú: ${escapeHTML(order.note)}</p>` : ''}
            <p class="order-item__meta">Thanh toán khi nhận hàng (COD) · ${escapeHTML(status)}</p>
          </div>
          <div style="text-align:right">
            <p class="order-item__price">${formatPrice(total)}</p>
            <p class="order-item__qty">${(order.items || []).reduce((sum, item) => sum + (item.quantity || item.qty || 0), 0)} sản phẩm</p>
          </div>
        </article>`;
    }).join('')}`;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
