(function () {
  'use strict';

  const store = window.AdminStore;
  const templates = window.AdminTemplates;
  let activeFilter = 'all';

  function getRequestContacts(request) {
    const legacyContact = String(request.contact || '');
    const legacyEmail = legacyContact.includes('@') ? legacyContact : '';
    const legacyPhone = legacyContact && !legacyEmail ? legacyContact : '';
    return [
      { label: 'SĐT', value: request.phone || legacyPhone },
      { label: 'Email', value: request.email || legacyEmail },
    ].filter(({ value }) => value);
  }

  function renderDashboard() {
    const container = document.getElementById('dashboard-requests');
    if (!container) return;
    const pending = store.requests.filter((request) => request.status === 'waiting_quote').slice(0, 3);
    container.innerHTML = pending.length ? pending.map((request) => `
      <div class="dashboard-request">
        <div><strong>${store.escapeHTML(request.name)}</strong><span>${store.escapeHTML(request.productType)} · ${store.escapeHTML(request.color || 'Màu chưa chọn')}</span></div>
        <span>${store.escapeHTML(request.budget || 'Thảo luận thêm')}</span>
        <a class="text-link" href="requests.html">Xem yêu cầu</a>
      </div>
    `).join('') : '<p class="empty-note">Hiện không có yêu cầu nào chờ báo giá.</p>';
  }

  function render() {
    const body = document.getElementById('requests-table');
    const empty = document.getElementById('requests-empty');
    if (body && empty) {
      const requests = activeFilter === 'all' ? store.requests : store.requests.filter((request) => request.status === activeFilter);
      body.innerHTML = requests.map((request) => `
        <tr>
          <td><span class="order-id">#${store.escapeHTML(request.id.slice(-8))}</span><small class="cell-subtitle">${store.escapeHTML(request.createdAt || '')}</small></td>
          <td>${store.escapeHTML(request.name)}${getRequestContacts(request).map(({ label, value }) => `<small class="cell-subtitle">${label}: ${store.escapeHTML(value)}</small>`).join('')}</td>
          <td><strong>${store.escapeHTML(request.productName)}</strong> · ${store.escapeHTML(request.productType)}<small class="cell-subtitle">Màu: ${store.escapeHTML(request.color)} · ${store.escapeHTML(request.description || 'Không có mô tả')}</small></td>
          <td>${store.escapeHTML(request.budget || 'Thảo luận thêm')}</td>
          <td>${Number(request.quote) > 0 ? store.formatPrice(request.quote) : 'Chưa báo giá'}${request.quoteNote ? `<small class="cell-subtitle">${store.escapeHTML(request.quoteNote)}</small>` : ''}</td>
          <td>${templates.statusBadge(request.statusLabel)}${request.rejectionReason ? `<small class="cell-subtitle">${store.escapeHTML(request.rejectionReason)}</small>` : ''}</td>
          <td>${['waiting_quote', 'quoted'].includes(request.status) ? templates.rowActions('request', request.id, [{ action: 'quote', label: request.status === 'quoted' ? 'Cập nhật báo giá' : 'Báo giá' }]) : '—'}</td>
        </tr>
      `).join('');
      empty.hidden = requests.length > 0;
    }
    const pendingCount = store.requests.filter((request) => request.status === 'waiting_quote').length;
    const nav = document.getElementById('nav-request-count');
    const stat = document.getElementById('stat-request-count');
    if (nav) nav.textContent = pendingCount;
    if (stat) stat.textContent = pendingCount;
    renderDashboard();
  }

  async function saveQuote(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.dataset.saving === 'true') return;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const id = String(data.get('id'));
    const status = String(data.get('status'));
    const quotedPrice = String(data.get('quote') || '');
    const quoteMessage = String(data.get('quoteNote') || '').trim();
    const rejectionReason = String(data.get('rejectionReason') || '').trim();
    if (status === 'quoted' && (!quotedPrice || !quoteMessage)) {
      store.notify('Cần nhập giá và nội dung trước khi gửi báo giá.', 'error');
      return;
    }
    if (status === 'rejected' && !rejectionReason) {
      store.notify('Vui lòng nhập lý do không nhận yêu cầu.', 'error');
      return;
    }

    const submitButton = form.querySelector('[type="submit"]');
    const submitLabel = submitButton.textContent;
    form.dataset.saving = 'true';
    form.setAttribute('aria-busy', 'true');
    submitButton.disabled = true;
    submitButton.classList.add('is-loading');
    submitButton.textContent = 'Đang cập nhật...';
    try {
      await KellyApi.request(`/api/requests/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        authenticated: true,
        body: {
          status,
          ...(quotedPrice ? { quotedPrice: Number(quotedPrice) } : {}),
          ...(quoteMessage ? { quoteMessage } : {}),
          ...(rejectionReason ? { rejectionReason } : {}),
        },
      });
      await store.initialize();
      window.AdminApp.refreshData();
      document.getElementById('quote-dialog').close();
      store.notify(status === 'quoted' ? 'Gửi báo giá thành công!' : 'Từ chối yêu cầu thành công!');
    } catch (error) {
      console.error('Không thể cập nhật yêu cầu:', error);
      store.notify(error.message || 'Không thể cập nhật yêu cầu.', 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.classList.remove('is-loading');
      submitButton.textContent = submitLabel;
      form.removeAttribute('aria-busy');
      delete form.dataset.saving;
    }
  }

  function bind() {
    const form = document.getElementById('quote-form');
    if (form && form.dataset.adminBound !== 'true') {
      form.addEventListener('submit', saveQuote);
      form.dataset.adminBound = 'true';
    }
    document.getElementById('requests-table')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-request-action]');
      if (!button) return;
      const request = store.requests.find((item) => item.id === button.dataset.id);
      if (button.dataset.requestAction === 'quote' && request) window.AdminDialogs.openQuote(request);
    });

    document.querySelectorAll('.request-filter').forEach((button) => {
      button.addEventListener('click', () => {
        activeFilter = button.dataset.requestStatus;
        document.querySelectorAll('.request-filter').forEach((chip) => {
          const selected = chip === button;
          chip.classList.toggle('is-selected', selected);
          chip.setAttribute('aria-pressed', String(selected));
        });
        render();
      });
    });
    activeFilter = 'all';
  }

  window.AdminRequests = { render, renderDashboard, bind };
})();
