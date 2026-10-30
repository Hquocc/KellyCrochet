(function () {
  'use strict';

  const PRODUCT_STATUS = { selling: 'Đang bán', out_of_stock: 'Hết hàng' };
  const ORDER_STATUS = {
    pending_confirmation: 'Chờ xác nhận',
    preparing: 'Đang chuẩn bị',
    shipping: 'Đang giao',
    completed: 'Hoàn thành',
    cancelled: 'Đã huỷ',
  };
  const REQUEST_STATUS = {
    waiting_quote: 'Chờ báo giá',
    quoted: 'Đã báo giá',
    accepted: 'Đã chốt',
    rejected: 'Không nhận',
  };
  let products = [];
  let orders = [];
  let requests = [];
  let categories = [];
  let customers = [];

  function notify(message, type = 'success') {
    let notice = document.getElementById('admin-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'admin-notice';
      notice.className = 'admin-notice';
      notice.setAttribute('role', 'status');
      notice.setAttribute('aria-live', 'polite');
      document.body.append(notice);
    }
    notice.textContent = message;
    notice.dataset.type = type;
    notice.classList.add('is-visible');
    window.clearTimeout(notice.timeoutId);
    notice.timeoutId = window.setTimeout(() => notice.classList.remove('is-visible'), 4500);
  }

  function beginButtonLoading(button, label = 'Đang xử lý...') {
    if (!button || button.disabled) return null;
    const originalText = button.textContent;
    button.disabled = true;
    button.classList.add('is-loading');
    button.textContent = label;
    return () => {
      button.disabled = false;
      button.classList.remove('is-loading');
      button.textContent = originalText;
    };
  }

  function normalizeCategory(category) {
    return {
      ...category,
      id: String(category._id),
      active: category.status === 'visible',
    };
  }

  function normalizeProduct(product) {
    const category = product.category;
    return {
      ...product,
      id: String(product._id),
      categoryId: String(typeof category === 'object' ? category._id : category),
      category: typeof category === 'object' ? category.name : '',
      color: product.colors.join(', '),
      image: product.images[0],
      desc: product.description,
      statusLabel: PRODUCT_STATUS[product.status] || product.status,
    };
  }

  function normalizeOrder(order) {
    const customer = order.customer || {};
    const status = ORDER_STATUS[order.status] || order.status;
    return {
      id: String(order._id),
      originalOrder: order,
      customerName: customer.name || 'Khách hàng',
      phone: customer.phone || '',
      note: order.note || '',
      date: order.createdAt ? new Intl.DateTimeFormat('vi-VN').format(new Date(order.createdAt)) : '',
      total: order.totalAmount,
      status,
      statusCode: order.status,
      statusHistory: [{ status, at: order.updatedAt || order.createdAt, note: 'Trạng thái hiện tại' }],
      items: order.items.map((item) => ({
        id: String(item.productId),
        customRequestId: item.customRequestId ? String(item.customRequestId) : '',
        name: item.productName,
        qty: item.quantity,
        price: item.priceAtPurchase,
        color: item.color,
        requestedColors: item.requestedColors || [],
        customDescription: item.customDescription || '',
      })),
    };
  }

  // ─── FIX: Bảo vệ khỏi category null, requestedColors undefined ───────────
  function normalizeRequest(request) {
    const customer = request.customer || {};

    // category có thể là null (bị xóa), string ObjectId, hoặc object được populate
    const cat = request.category;
    const categoryObj = (cat !== null && cat !== undefined && typeof cat === 'object') ? cat : null;
    const productType = categoryObj?.name ?? request.productName ?? 'Không rõ';
    const categoryId  = categoryObj ? String(categoryObj._id) : String(cat || '');

    // requestedColors có thể undefined ở bản ghi cũ
    const colors = Array.isArray(request.requestedColors) ? request.requestedColors : [];

    return {
      ...request,
      id: String(request._id),
      name: customer.name || 'Khách hàng',
      phone: customer.phone || '',
      email: customer.email || '',
      productType,
      categoryId,
      color: colors.join(', '),
      quote: request.quotedPrice || 0,
      quoteNote: request.quoteMessage || '',
      statusLabel: REQUEST_STATUS[request.status] || request.status,
      createdAt: request.createdAt
        ? new Intl.DateTimeFormat('vi-VN').format(new Date(request.createdAt))
        : '',
    };
  }
  // ─────────────────────────────────────────────────────────────────────────

  function aggregateCustomers(ordersList) {
    const byPhone = new Map();
    ordersList.forEach((order) => {
      const customer = order.originalOrder.customer || {};
      const key = customer.phone || customer.email || customer.name;
      if (!key) return;
      const aggregate = byPhone.get(key) || {
        name: customer.name || 'Khách hàng',
        email: customer.email || '',
        phone: customer.phone || '',
        orders: 0,
        spent: 0,
      };
      aggregate.orders += 1;
      aggregate.spent += order.total;
      byPhone.set(key, aggregate);
    });
    return [...byPhone.values()].sort((a, b) => b.spent - a.spent);
  }

  async function initialize() {
    const [productRows, categoryRows, orderRows, requestRows] = await Promise.all([
      KellyApi.all('/api/products', { authenticated: true }),
      KellyApi.all('/api/categories', { authenticated: true }),
      KellyApi.all('/api/orders', { authenticated: true }),
      KellyApi.all('/api/requests', { authenticated: true }),
    ]);
    categories = categoryRows.map(normalizeCategory);
    products = productRows.map(normalizeProduct);
    orders = orderRows.map(normalizeOrder);
    requests = requestRows.map(normalizeRequest);
    customers = aggregateCustomers(orders);
  }

  function statusClass(status) {
    if (['Hoàn thành', 'Đã chốt'].includes(status)) return 'status--complete';
    if (status === 'Đang giao') return 'status--shipping';
    if (['Đã huỷ', 'Không nhận'].includes(status)) return 'status--cancelled';
    return 'status--pending';
  }

  function itemSummary(order) {
    return order.items.map((item) =>
      `${item.name}${item.color ? ` (${item.color})` : ''}${item.qty > 1 ? ` ×${item.qty}` : ''}`
    ).join(', ');
  }

  window.AdminStore = {
    ORDER_STATUS,
    PRODUCT_STATUS,
    REQUEST_STATUS,
    aggregateCustomers,
    beginButtonLoading,
    escapeHTML: (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]),
    formatPrice: (price) => `${Number(price || 0).toLocaleString('vi-VN')}₫`,
    initialize,
    itemSummary,
    normalizeOrder,
    normalizeProduct,
    normalizeRequest,
    notify,
    statusClass,
    get products() { return products; },
    set products(value) { products = value; },
    get orders() { return orders; },
    set orders(value) { orders = value; },
    get requests() { return requests; },
    set requests(value) { requests = value; },
    get categories() { return categories; },
    set categories(value) { categories = value; },
    get customers() { return customers; },
    set customers(value) { customers = value; },
  };
})();
