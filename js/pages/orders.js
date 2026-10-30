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

  function loadTrackedRequests() {
    const container = document.getElementById('custom-requests-container');
    if (!container) return;
    let records;
    try {
      records = JSON.parse(localStorage.getItem('kc_custom_requests') || '[]');
      if (!Array.isArray(records)) throw new Error('Dữ liệu theo dõi yêu cầu không hợp lệ.');
    } catch (error) {
      console.error('Không thể tải yêu cầu đặt riêng đã lưu:', error);
      container.innerHTML = '<p role="alert">Không đọc được mã theo dõi yêu cầu trên thiết bị này.</p>';
      return;
    }

    records = records.filter((record) =>
      record && /^[a-f\d]{24}$/i.test(record.id) && /^[a-f\d]{64}$/i.test(record.token)
    );
    if (!records.length) {
      container.innerHTML = '<p class="orders-empty__msg">Yêu cầu đặt riêng và báo giá bạn gửi trên thiết bị này sẽ hiện ở đây.</p>';
      return;
    }

    container.innerHTML = '<p class="orders-empty__msg" role="status">Đang tải trạng thái yêu cầu...</p>';
    Promise.all(records.map(async (record) => {
      try {
        const request = await KellyApi.request(`/api/requests/${encodeURIComponent(record.id)}`, {
          trackingToken: record.token,
        });
        return { record, request };
      } catch (error) {
        console.error('Không thể tải trạng thái yêu cầu:', error);
        return { record, error };
      }
    })).then((results) => {
      container.innerHTML = results.map(({ record, request, error }) => {
        if (error) {
          return `<article class="custom-request-card"><p role="alert">Không thể tải yêu cầu #${escapeHTML(record.id.slice(-8).toUpperCase())}. Vui lòng tải lại trang hoặc liên hệ cửa hàng.</p></article>`;
        }
        const statuses = {
          waiting_quote: 'Đang chờ báo giá',
          quoted: 'Đã có báo giá',
          accepted: 'Đã đặt hàng',
          rejected: 'Cửa hàng không nhận',
        };
        const id = escapeHTML(request.id);
        const orderId = escapeHTML(request.orderId || '');
        return `
          <article class="custom-request-card" data-status="${escapeHTML(request.status)}">
            <div class="custom-request-card__header">
              <div>
                <h3 class="custom-request-card__name">${escapeHTML(request.productName)}</h3>
                <p class="custom-request-card__meta">Mã yêu cầu #${escapeHTML(request.id.slice(-8).toUpperCase())} · ${escapeHTML(request.category)}</p>
                <p class="custom-request-card__meta">Màu mong muốn: ${escapeHTML((request.requestedColors || []).join(', '))}</p>
                <p class="custom-request-card__description">${escapeHTML(request.description)}</p>
              </div>
              <span class="custom-request-card__status">${escapeHTML(statuses[request.status] || 'Đang xử lý')}</span>
            </div>
            ${request.status === 'quoted' ? `
              <div class="custom-request-card__quote">
                <div>
                  <p class="custom-request-card__price">Giá sản phẩm: ${formatPrice(request.quotedPrice || 0)}</p>
                  <p class="custom-request-card__meta">Phí giao hàng: ${formatPrice(30000)} · Tổng COD: ${formatPrice((request.quotedPrice || 0) + 30000)}</p>
                  <p class="custom-request-card__message">${escapeHTML(request.quoteMessage)}</p>
                </div>
                <a class="btn btn--dark" href="checkout.html?requestId=${encodeURIComponent(request.id)}">Đồng ý &amp; đặt hàng</a>
              </div>
            ` : ''}
            ${request.status === 'rejected' ? `<p class="custom-request-card__reason"><strong>Lý do:</strong> ${escapeHTML(request.rejectionReason || 'Cửa hàng hiện chưa thể nhận yêu cầu này.')}</p>` : ''}
            ${request.status === 'accepted' ? `<p class="custom-request-card__message">Đã đặt thành công. Mã đơn <span class="order-code">#${escapeHTML(orderId.slice(-8).toUpperCase())}</span>; đơn hàng hiển thị trong danh sách bên trên.</p>` : ''}
          </article>`;
      }).join('');
    });
  }

  function bindCustomRequestActions() {
    const container = document.getElementById('custom-requests-container');
    if (!container || container.dataset.bound === 'true') return;
    container.dataset.bound = 'true';
  }

  function render() {
    loadTrackedRequests();
    const container = document.getElementById('orders-container');
    if (!container) return;
    const query = new URLSearchParams(window.location.search);
    const createdOrderId = query.get('orderId') || '';
    const customOrder = query.get('customOrder') === '1';
    const trackingSaved = query.get('trackingSaved') !== '0';
    const cartCleared = query.get('cartCleared') !== '0';
    let orders;
    try {
      orders = loadOrders();
    } catch (error) {
      console.error('Không thể tải đơn hàng đã lưu:', error);
      container.innerHTML = createdOrderId
        ? `<p role="alert">Đơn hàng <span class="order-code">#${escapeHTML(createdOrderId.slice(-8).toUpperCase())}</span> đã được gửi, nhưng danh sách theo dõi trên thiết bị bị lỗi. Hãy lưu mã đơn để liên hệ với cửa hàng.</p>`
        : '<p role="alert">Không đọc được danh sách đơn hàng trên thiết bị này.</p>';
      return;
    }

    const savedOrder = orders.find((order) => String(order._id || order.id || '') === createdOrderId);
    let confirmation = '';
    if (createdOrderId) {
      confirmation = `<p class="orders-confirmation" role="status">${customOrder ? 'Đơn đặt riêng đã được xác nhận' : 'Đơn hàng'} <span class="order-code">#${escapeHTML(createdOrderId.slice(-8).toUpperCase())}</span> đã được gửi đến cửa hàng.${trackingSaved ? '' : ' Không thể lưu trạng thái theo dõi trên thiết bị; hãy giữ lại mã đơn để liên hệ với cửa hàng.'}${cartCleared ? '' : ' Giỏ hàng trên thiết bị chưa được xoá; hãy kiểm tra trước khi đặt đơn tiếp.'}</p>`;
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
        const customDescription = item.customDescription
          ? `<small class="order-item__meta">Đặt riêng · Màu mong muốn: ${escapeHTML((item.requestedColors || []).join(', '))}. ${escapeHTML(item.customDescription)}</small>`
          : '';
        return `${escapeHTML(name)}${color} ×${escapeHTML(quantity)}${customDescription}`;
      }).join(', ');
      const customer = order.customer || {};
      const status = STATUS_LABELS[order.status] || order.status || 'Chờ xác nhận';
      const address = customer.address || [customer.neighborhood, customer.ward, customer.city].filter(Boolean).join(', ');
      const orderId = order._id || order.id || '';
      const total = order.totalAmount ?? order.total ?? 0;

      return `
        <article class="order-item">
          <div>
            <p class="order-item__name">Đơn hàng <span class="order-code">#${escapeHTML(String(orderId).slice(-8).toUpperCase())}</span></p>
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

  function init() {
    bindCustomRequestActions();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
