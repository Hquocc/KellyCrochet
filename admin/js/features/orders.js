(function () {
  'use strict';

  const store = window.AdminStore;
  const templates = window.AdminTemplates;
  const ORDER_STAGES = [
    { code: 'pending_confirmation', label: 'Chờ xác nhận' },
    { code: 'preparing', label: 'Đang chuẩn bị' },
    { code: 'shipping', label: 'Đang giao' },
    { code: 'completed', label: 'Hoàn thành' },
  ];
  let activeFilter = 'all';

  function formatTimestamp(value) {
    if (!value) return 'Chưa ghi nhận thời gian';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return store.escapeHTML(value);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(date);
  }

  function renderOrderDetails(order) {
    const original = order.originalOrder;
    const customer = original.customer || {};
    const itemsTotal = order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const shippingFee = Math.max(0, order.total - itemsTotal);
    const currentStage = ORDER_STAGES.findIndex((stage) => stage.code === order.statusCode);
    const timeline = ORDER_STAGES.map((stage, index) => {
      const state = order.statusCode === 'cancelled'
        ? index === 0 ? 'is-complete' : ''
        : index < currentStage ? 'is-complete' : index === currentStage ? 'is-current' : '';
      return `<li class="order-timeline__step ${state}"><span class="order-timeline__marker"></span><span>${stage.label}</span></li>`;
    }).join('');
    const items = order.items.map((item) => `
      <li><span>${store.escapeHTML(item.name)}${item.color ? ` · ${store.escapeHTML(item.color)}` : ''} × ${item.qty}</span><strong>${store.formatPrice(item.price * item.qty)}</strong></li>
    `).join('');
    const history = `<li><span>${templates.statusBadge(order.status)}<small>Trạng thái hiện tại</small></span><time>${formatTimestamp(original.updatedAt || original.createdAt)}</time></li>`;
    const nextStage = currentStage >= 0 ? ORDER_STAGES[currentStage + 1] : null;
    const canCancel = ['pending_confirmation', 'preparing'].includes(order.statusCode);

    document.getElementById('order-detail-dialog').dataset.orderId = order.id;
    document.getElementById('order-detail-title').textContent = `Đơn hàng #${order.id.slice(-8).toUpperCase()}`;
    document.getElementById('order-detail-content').innerHTML = `
      <section class="order-detail-section">
        <div class="order-detail-summary"><span>Trạng thái hiện tại</span>${templates.statusBadge(order.status)}</div>
        <ol class="order-timeline">${timeline}</ol>
      </section>
      <section class="order-detail-section">
        <h3>Thông tin khách hàng</h3>
        <dl class="order-detail-facts">
          <div><dt>Người nhận</dt><dd>${store.escapeHTML(customer.name)}</dd></div>
          <div><dt>Điện thoại</dt><dd>${store.escapeHTML(customer.phone)}</dd></div>
          ${customer.email ? `<div><dt>Email</dt><dd>${store.escapeHTML(customer.email)}</dd></div>` : ''}
          <div><dt>Địa chỉ giao hàng</dt><dd>${store.escapeHTML(customer.address)}</dd></div>
          <div><dt>Ngày tạo đơn</dt><dd>${formatTimestamp(original.createdAt)}</dd></div>
          ${order.note ? `<div><dt>Ghi chú</dt><dd>${store.escapeHTML(order.note)}</dd></div>` : ''}
        </dl>
      </section>
      <section class="order-detail-section">
        <h3>Sản phẩm trong đơn</h3>
        <ul class="order-detail-items">${items}</ul>
        <dl class="order-detail-totals">
          <div><dt>Tiền sản phẩm</dt><dd>${store.formatPrice(itemsTotal)}</dd></div>
          <div><dt>Phí giao hàng</dt><dd>${store.formatPrice(shippingFee)}</dd></div>
          <div><dt>Tổng thanh toán · COD</dt><dd>${store.formatPrice(order.total)}</dd></div>
        </dl>
      </section>
      <section class="order-detail-section"><h3>Lịch sử cập nhật</h3><ol class="order-history">${history}</ol></section>
    `;
    document.getElementById('order-detail-actions').innerHTML = `
      ${canCancel ? '<button class="button button--outline order-cancel-button" type="button" data-order-status="cancelled">Huỷ đơn</button>' : ''}
      ${nextStage ? `<button class="button button--dark" type="button" data-order-status="${nextStage.code}">Chuyển sang: ${nextStage.label}</button>` : ''}
    `;
    document.getElementById('order-detail-dialog').showModal();
  }

  function renderRecent() {
    const container = document.getElementById('recent-orders');
    if (!container) return;
    container.innerHTML = store.orders.slice(0, 4).map((order) => `
      <div class="recent-order">
        <span class="recent-order__name">${store.escapeHTML(order.customerName)}</span>
        <span class="recent-order__price">${store.formatPrice(order.total)}</span>
        <span class="recent-order__meta">${store.escapeHTML(order.id.slice(-8))} · ${store.escapeHTML(store.itemSummary(order))}</span>
        ${templates.statusBadge(order.status)}
      </div>
    `).join('') || '<p class="empty-note">Chưa có đơn hàng.</p>';
  }

  function render() {
    const nav = document.getElementById('nav-order-count');
    if (nav) nav.textContent = store.orders.length;
    const body = document.getElementById('orders-table');
    const empty = document.getElementById('orders-empty');
    if (!body || !empty) return;
    const orders = activeFilter === 'all' ? store.orders : store.orders.filter((order) => order.statusCode === activeFilter);
    body.innerHTML = orders.map((order) => `
      <tr>
        <td><span class="order-id">#${store.escapeHTML(order.id.slice(-8).toUpperCase())}</span></td>
        <td>${store.escapeHTML(order.customerName)}<small class="cell-subtitle">${store.escapeHTML(order.phone)}</small></td>
        <td>${store.escapeHTML(order.date)}</td>
        <td>${store.formatPrice(order.total)}</td>
        <td>${templates.statusBadge(order.status)}</td>
        <td>${templates.rowActions('order', order.id, [{ action: 'details', label: 'Chi tiết' }])}</td>
      </tr>
    `).join('');
    empty.hidden = orders.length > 0;
  }

  async function updateStatus(id, nextStatus) {
    const order = store.orders.find((item) => item.id === id);
    if (!order) return;
    if (nextStatus === 'cancelled' && !window.confirm(`Xác nhận huỷ đơn hàng ${id.slice(-8)}?`)) return;
    try {
      await KellyApi.request(`/api/orders/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        authenticated: true,
        body: { status: nextStatus },
      });
      await store.initialize();
      window.AdminApp.refreshData();
      const updated = store.orders.find((item) => item.id === id);
      if (updated) renderOrderDetails(updated);
      store.notify(`Đã cập nhật trạng thái đơn hàng sang “${updated?.status || nextStatus}”.`);
    } catch (error) {
      console.error('Không thể cập nhật đơn hàng:', error);
      store.notify(error.message || 'Không thể cập nhật trạng thái đơn hàng.', 'error');
    }
  }

  function bind() {
    document.getElementById('orders-table')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-order-action="details"]');
      if (!button) return;
      const order = store.orders.find((item) => item.id === button.dataset.id);
      if (order) renderOrderDetails(order);
    });
    const actions = document.getElementById('order-detail-actions');
    if (actions && actions.dataset.adminBound !== 'true') {
      actions.addEventListener('click', (event) => {
        const button = event.target.closest('[data-order-status]');
        if (!button) return;
        const id = document.getElementById('order-detail-dialog').dataset.orderId;
        if (id) updateStatus(id, button.dataset.orderStatus);
      });
      actions.dataset.adminBound = 'true';
    }
    document.querySelectorAll('.filter-chip').forEach((button) => {
      button.addEventListener('click', () => {
        activeFilter = button.dataset.status;
        document.querySelectorAll('.filter-chip').forEach((chip) => {
          const selected = chip === button;
          chip.classList.toggle('is-selected', selected);
          chip.setAttribute('aria-pressed', String(selected));
        });
        render();
      });
    });
    activeFilter = 'all';
  }

  window.AdminOrders = { bind, render, renderRecent };
})();
