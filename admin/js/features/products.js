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
    if (form.dataset.saving === 'true') return;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const colors = String(data.get('colors')).split(/[,;\n]/).map((color) => color.trim()).filter(Boolean);
    const id = String(data.get('id') || '');
    const notifyForm = (message, type = 'status') => {
      const notice = document.getElementById('product-form-notice');
      notice.textContent = message;
      notice.dataset.type = type;
      notice.hidden = false;
    };
    if (!colors.length || colors.length > 20) {
      const message = 'Nhập từ 1 đến 20 màu sắc, phân cách bằng dấu phẩy.';
      notifyForm(message, 'error');
      store.notify(message, 'error');
      return;
    }

    const submitButton = form.querySelector('[type="submit"]');
    const submitLabel = submitButton.textContent;
    form.dataset.saving = 'true';
    form.setAttribute('aria-busy', 'true');
    submitButton.disabled = true;
    submitButton.classList.add('is-loading');
    submitButton.textContent = id ? 'Đang cập nhật...' : 'Đang thêm...';
    notifyForm(id ? 'Đang cập nhật sản phẩm...' : 'Đang thêm sản phẩm...');

    try {
      const images = await window.AdminDialogs.prepareProductImages();
      const product = {
        name: String(data.get('name')).trim(),
        category: String(data.get('category')),
        colors: [...new Set(colors)],
        price: Number(data.get('price')),
        quantity: Number(data.get('quantity')),
        images,
        description: String(data.get('desc')).trim(),
      };
      await KellyApi.request(id ? `/api/products/${encodeURIComponent(id)}` : '/api/products', {
        method: id ? 'PATCH' : 'POST',
        authenticated: true,
        body: product,
      });
      await reload();
      document.getElementById('product-dialog').close();
      store.notify(id ? 'Cập nhật sản phẩm thành công!' : 'Thêm sản phẩm thành công!');
    } catch (error) {
      console.error('Không thể lưu sản phẩm:', error);
      notifyForm(error.message || 'Không thể lưu sản phẩm.', 'error');
      store.notify(error.message || 'Không thể lưu sản phẩm.', 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.classList.remove('is-loading');
      submitButton.textContent = submitLabel;
      form.removeAttribute('aria-busy');
      delete form.dataset.saving;
    }
  }

  async function remove(id, button) {
    const product = store.products.find((item) => item.id === id);
    if (!product || !window.confirm(`Xoá sản phẩm “${product.name}”?`)) return;
    const stopLoading = store.beginButtonLoading(button, 'Đang xóa...');
    if (button && !stopLoading) return;
    try {
      await KellyApi.request(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE', authenticated: true });
      await reload();
      store.notify('Xóa sản phẩm thành công!');
    } catch (error) {
      console.error('Không thể xoá sản phẩm:', error);
      store.notify(error.message || 'Không thể xoá sản phẩm.', 'error');
    } finally {
      stopLoading?.();
    }
  }

  function bind() {
    window.AdminDialogs.bindProductImages();
    document.getElementById('product-search')?.addEventListener('input', (event) => render(event.currentTarget.value));
    document.getElementById('add-product-button')?.addEventListener('click', () => window.AdminDialogs.openProduct());
    const form = document.getElementById('product-form');
    if (form && form.dataset.adminBound !== 'true') {
      form.addEventListener('submit', save);
      form.addEventListener('reset', () => {
        const notice = document.getElementById('product-form-notice');
        notice.hidden = true;
        notice.textContent = '';
        delete notice.dataset.type;
      });
      form.dataset.adminBound = 'true';
    }
    document.getElementById('products-table')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-product-action]');
      if (!button) return;
      const product = store.products.find((item) => item.id === button.dataset.id);
      if (button.dataset.productAction === 'edit' && product) window.AdminDialogs.openProduct(product);
      if (button.dataset.productAction === 'delete') remove(button.dataset.id, button);
    });
  }

  window.AdminProducts = { bind, refreshCounts, render };
})();
