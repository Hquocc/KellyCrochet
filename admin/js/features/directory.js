(function () {
  'use strict';

  const store = window.AdminStore;
  const templates = window.AdminTemplates;

  function renderCategories() {
    const body = document.getElementById('categories-table');
    if (!body) return;
    body.innerHTML = store.categories.map((category) => {
      const count = store.products.filter((product) => product.categoryId === category.id).length;
      const status = category.active ? 'Đang hiển thị' : 'Đang ẩn';
      return `<tr>
        <td><span class="category-name">${store.escapeHTML(category.name)}</span></td>
        <td><span class="category-description">${store.escapeHTML(category.description || 'Chưa có mô tả.')}</span></td>
        <td>${count} sản phẩm</td><td>${templates.statusBadge(status)}</td>
        <td>${templates.rowActions('category', category.id, [{ action: 'edit', label: 'Sửa' }, { action: 'delete', label: 'Xoá', danger: true }])}</td>
      </tr>`;
    }).join('');
    const empty = document.getElementById('categories-empty');
    if (empty) empty.hidden = store.categories.length > 0;
  }

  function openCategory(category) {
    const form = document.getElementById('category-form');
    form.reset();
    form.elements.id.value = category?.id || '';
    form.elements.name.value = category?.name || '';
    form.elements.description.value = category?.description || '';
    form.elements.status.value = category?.active === false ? 'hidden' : 'visible';
    document.getElementById('category-dialog-title').textContent = category ? 'Sửa danh mục' : 'Thêm danh mục';
    document.getElementById('category-dialog').showModal();
  }

  async function saveCategory(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const id = String(data.get('id') || '');
    const name = String(data.get('name')).trim();
    if (!name) {
      store.notify('Vui lòng nhập tên danh mục.', 'error');
      return;
    }
    try {
      await KellyApi.request(id ? `/api/categories/${encodeURIComponent(id)}` : '/api/categories', {
        method: id ? 'PATCH' : 'POST',
        authenticated: true,
        body: {
          name,
          description: String(data.get('description') || '').trim(),
          status: String(data.get('status')),
        },
      });
      await store.initialize();
      window.AdminApp.refreshData();
      document.getElementById('category-dialog').close();
      store.notify(id ? 'Đã cập nhật danh mục.' : 'Đã thêm danh mục.');
    } catch (error) {
      console.error('Không thể lưu danh mục:', error);
      store.notify(error.message || 'Không thể lưu danh mục.', 'error');
    }
  }

  async function removeCategory(id) {
    const category = store.categories.find((item) => item.id === id);
    if (!category) return;
    if (!window.confirm(`Xoá danh mục “${category.name}”?`)) return;
    try {
      await KellyApi.request(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE', authenticated: true });
      await store.initialize();
      window.AdminApp.refreshData();
      store.notify('Đã xoá danh mục.');
    } catch (error) {
      console.error('Không thể xoá danh mục:', error);
      store.notify(error.message || 'Không thể xoá danh mục.', 'error');
    }
  }

  function renderCustomers(query = '') {
    const body = document.getElementById('customers-table');
    const empty = document.getElementById('customers-empty');
    if (!body || !empty) return;
    const normalized = query.trim().toLocaleLowerCase('vi');
    const customers = store.customers.filter((customer) =>
      `${customer.name} ${customer.email} ${customer.phone}`.toLocaleLowerCase('vi').includes(normalized)
    );
    body.innerHTML = customers.map((customer) => `
      <tr>
        <td><div class="customer-cell"><span class="customer-avatar">${store.escapeHTML(customer.name.charAt(0))}</span><span>${store.escapeHTML(customer.name)}</span></div></td>
        <td>${store.escapeHTML(customer.email)}</td><td>${store.escapeHTML(customer.phone)}</td>
        <td>${customer.orders} đơn</td><td>${store.formatPrice(customer.spent)}</td>
      </tr>
    `).join('');
    empty.hidden = customers.length > 0;
  }

  function bind() {
    document.getElementById('add-category-button')?.addEventListener('click', () => openCategory());
    const form = document.getElementById('category-form');
    if (form && form.dataset.adminBound !== 'true') {
      form.addEventListener('submit', saveCategory);
      form.dataset.adminBound = 'true';
    }
    document.getElementById('categories-table')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-category-action]');
      if (!button) return;
      const category = store.categories.find((item) => item.id === button.dataset.id);
      if (button.dataset.categoryAction === 'edit' && category) openCategory(category);
      if (button.dataset.categoryAction === 'delete') removeCategory(button.dataset.id);
    });
    document.getElementById('customer-search')?.addEventListener('input', (event) => renderCustomers(event.currentTarget.value));
  }

  window.AdminDirectory = { renderCategories, renderCustomers, bind };
})();
