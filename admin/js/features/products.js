(function () {
  'use strict';

  const store = window.AdminStore;
  const templates = window.AdminTemplates;

  function render(query) {
    const body = document.getElementById('products-table');
    const empty = document.getElementById('products-empty');
    if (!body || !empty) return;
    const searchInput = document.getElementById('product-search');
    const normalizedQuery = (query ?? searchInput?.value ?? '').trim().toLocaleLowerCase('vi');
    const products = store.products.filter((product) =>
      `${product.name} ${product.category} ${product.colors.join(' ')}`.toLocaleLowerCase('vi').includes(normalizedQuery)
    );

    body.innerHTML = products.map((product) => `
      <tr>
        <td>${templates.productCell(product)}</td>
        <td><span class="category-tag">${store.escapeHTML(product.category)}</span></td>
        <td>${store.escapeHTML(product.colors.join(', '))}</td>
        <td>${store.formatPrice(product.price)}</td>
        <td>${product.quantity}</td>
        <td>${templates.statusBadge(product.statusLabel)}</td>
        <td>${templates.rowActions('product', product.id, [{ action: 'edit', label: 'Sửa' }, { action: 'delete', label: 'Xoá', danger: true }])}</td>
      </tr>
    `).join('');
    empty.hidden = products.length > 0;
  }

  function refreshCounts() {
    const nav = document.getElementById('nav-product-count');
    const stat = document.getElementById('stat-product-count');
    if (nav) nav.textContent = store.products.length;
    if (stat) stat.textContent = store.products.filter((product) => product.status === 'selling').length;
  }

  async function reload() {
    await store.initialize();
    window.AdminApp.refreshData();
  }

  async function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    let images;
    try {
      images = await window.AdminDialogs.prepareProductImages();
    } catch (error) {
      store.notify(error.message || 'Danh sách ảnh không hợp lệ.', 'error');
      return;
    }

    const colors = String(data.get('colors')).split(/[,;\n]/).map((color) => color.trim()).filter(Boolean);
    const product = {
      name: String(data.get('name')).trim(),
      category: String(data.get('category')),
      colors: [...new Set(colors)],
      price: Number(data.get('price')),
      quantity: Number(data.get('quantity')),
      images,
      description: String(data.get('desc')).trim(),
    };
    if (!product.colors.length || product.colors.length > 20) {
      store.notify('Nhập từ 1 đến 20 màu sắc, phân cách bằng dấu phẩy.', 'error');
      return;
    }

    const id = String(data.get('id') || '');
    try {
      await KellyApi.request(id ? `/api/products/${encodeURIComponent(id)}` : '/api/products', {
        method: id ? 'PATCH' : 'POST',
        authenticated: true,
        body: product,
      });
      await reload();
      document.getElementById('product-dialog').close();
      store.notify(id ? 'Đã cập nhật sản phẩm trên máy chủ.' : 'Đã thêm sản phẩm vào cửa hàng.');
    } catch (error) {
      console.error('Không thể lưu sản phẩm:', error);
      store.notify(error.message || 'Không thể lưu sản phẩm.', 'error');
    }
  }

  async function remove(id) {
    const product = store.products.find((item) => item.id === id);
    if (!product || !window.confirm(`Xoá sản phẩm “${product.name}”?`)) return;
    try {
      await KellyApi.request(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE', authenticated: true });
      await reload();
      store.notify('Đã xoá sản phẩm.');
    } catch (error) {
      console.error('Không thể xoá sản phẩm:', error);
      store.notify(error.message || 'Không thể xoá sản phẩm.', 'error');
    }
  }

  function bind() {
    document.getElementById('product-search')?.addEventListener('input', (event) => render(event.currentTarget.value));
    document.getElementById('add-product-button')?.addEventListener('click', () => window.AdminDialogs.openProduct());
    const form = document.getElementById('product-form');
    if (form && form.dataset.adminBound !== 'true') {
      form.addEventListener('submit', save);
      form.dataset.adminBound = 'true';
    }
    document.getElementById('products-table')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-product-action]');
      if (!button) return;
      const product = store.products.find((item) => item.id === button.dataset.id);
      if (button.dataset.productAction === 'edit' && product) window.AdminDialogs.openProduct(product);
      if (button.dataset.productAction === 'delete') remove(button.dataset.id);
    });
  }

  window.AdminProducts = { bind, refreshCounts, render };
})();
