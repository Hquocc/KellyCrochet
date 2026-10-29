(function () {
  'use strict';

  const ADMIN_PAGES = new Set([
    'index.html', 'products.html', 'orders.html', 'requests.html',
    'categories.html', 'customers.html', 'reports.html', 'settings.html',
  ]);
  let navigationController;

  function renderDate() {
    const date = document.getElementById('today-date');
    if (date) {
      date.textContent = new Intl.DateTimeFormat('vi-VN', {
        day: 'numeric', month: 'long', year: 'numeric',
      }).format(new Date());
    }
  }

  function renderAnalytics() {
    const orders = window.AdminStore.orders;
    const pending = orders.filter((order) => order.statusCode === 'pending_confirmation').length;
    const newOrders = document.getElementById('stat-new-order-count');
    if (newOrders) newOrders.textContent = pending;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthOrders = orders.filter((order) =>
      new Date(order.originalOrder.createdAt) >= monthStart && order.statusCode !== 'cancelled'
    );
    const revenue = monthOrders.reduce((sum, order) => sum + order.total, 0);
    const completed = monthOrders.filter((order) => order.statusCode === 'completed');
    const average = completed.length
      ? Math.round(completed.reduce((sum, order) => sum + order.total, 0) / completed.length)
      : 0;
    const soldProducts = new Map();
    completed.forEach((order) => order.items.forEach((item) => {
      soldProducts.set(item.name, (soldProducts.get(item.name) || 0) + item.qty);
    }));
    const bestseller = [...soldProducts.entries()].sort((a, b) => b[1] - a[1])[0];
    const reportValues = document.querySelectorAll('.report-card strong');
    if (reportValues.length === 4) {
      reportValues[0].textContent = window.AdminStore.formatPrice(revenue);
      reportValues[1].textContent = completed.length;
      reportValues[2].textContent = window.AdminStore.formatPrice(average);
      reportValues[3].textContent = bestseller?.[0] || 'Chưa có dữ liệu';
      const reportNotes = document.querySelectorAll('.report-card small');
      if (reportNotes.length === 4) {
        reportNotes[0].textContent = 'Tổng đơn trong tháng, không tính đơn đã huỷ';
        reportNotes[1].textContent = `Trên tổng số ${monthOrders.length} đơn trong tháng`;
        reportNotes[2].textContent = 'Chỉ tính đơn đã hoàn thành trong tháng';
        reportNotes[3].textContent = bestseller ? `${bestseller[1]} sản phẩm đã bán` : 'Chưa có sản phẩm bán';
      }
      const note = document.querySelector('.report-note');
      if (note) note.textContent = 'Báo cáo được tổng hợp từ đơn hàng trên máy chủ.';
    }
    const dashboardRevenue = document.getElementById('dashboard-revenue');
    if (dashboardRevenue) dashboardRevenue.textContent = window.AdminStore.formatPrice(revenue);
    const monthRevenue = document.getElementById('stat-month-revenue');
    if (monthRevenue) monthRevenue.textContent = window.AdminStore.formatPrice(revenue);

    const today = new Date();
    const firstDay = new Date(today);
    firstDay.setHours(0, 0, 0, 0);
    firstDay.setDate(firstDay.getDate() - 6);
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(firstDay);
      date.setDate(firstDay.getDate() + index);
      return { date, total: 0 };
    });
    orders.filter((order) => order.statusCode !== 'cancelled').forEach((order) => {
      const createdAt = new Date(order.originalOrder.createdAt);
      const day = days.find(({ date }) =>
        date.getFullYear() === createdAt.getFullYear()
        && date.getMonth() === createdAt.getMonth()
        && date.getDate() === createdAt.getDate()
      );
      if (day) day.total += order.total;
    });
    const weekRevenue = days.reduce((sum, day) => sum + day.total, 0);
    const weekRevenueElement = document.getElementById('dashboard-week-revenue');
    if (weekRevenueElement) weekRevenueElement.textContent = window.AdminStore.formatPrice(weekRevenue);
    const chart = document.getElementById('dashboard-week-chart');
    if (chart) {
      const max = Math.max(...days.map((day) => day.total), 1);
      chart.innerHTML = days.map(({ date, total }, index) => {
        const label = new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(date);
        const height = Math.round(total / max * 100);
        return `<div class="chart-bar"><span${index === days.length - 1 ? ' class="chart-bar__highlight"' : ''} style="--bar-height:${height}%"></span><small>${window.AdminStore.escapeHTML(label)}</small></div>`;
      }).join('');
    }
  }

  function bindSharedComponents() {
    document.querySelectorAll('[data-close-dialog]').forEach((button) => {
      if (button.dataset.adminBound === 'true') return;
      button.addEventListener('click', () => button.closest('dialog')?.close());
      button.dataset.adminBound = 'true';
    });
    const logout = document.getElementById('admin-logout');
    if (logout && logout.dataset.adminBound !== 'true') {
      logout.addEventListener('click', () => {
        KellyApi.clearToken();
        window.location.replace('login.html');
      });
      logout.dataset.adminBound = 'true';
    }
  }

  function bindSettings() {
    const form = document.querySelector('.settings-fields');
    if (!form || form.dataset.adminBound === 'true') return;
    const fields = ['storeName', 'email', 'phone', 'address'];
    let settings = {};
    try {
      settings = JSON.parse(localStorage.getItem('kc_store_settings') || '{}');
    } catch (error) {
      console.error('Không thể đọc cài đặt đã lưu trên trình duyệt:', error);
      window.AdminStore.notify('Cài đặt đã lưu bị lỗi định dạng. Hãy lưu lại để thay thế dữ liệu lỗi.', 'error');
    }
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      window.AdminStore.notify('Cấu trúc cài đặt đã lưu không hợp lệ. Hãy lưu lại để thay thế dữ liệu lỗi.', 'error');
      settings = {};
    }
    fields.forEach((field) => {
      if (settings[field] && form.elements[field]) form.elements[field].value = settings[field];
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const value = Object.fromEntries(fields.map((field) => [field, String(data.get(field) || '').trim()]));
      try {
        localStorage.setItem('kc_store_settings', JSON.stringify(value));
        window.AdminStore.notify('Đã lưu cài đặt trên trình duyệt này.');
      } catch (error) {
        console.error('Không thể lưu cài đặt trên trình duyệt:', error);
        window.AdminStore.notify('Không thể lưu cài đặt trên trình duyệt này.', 'error');
      }
    });
    form.dataset.adminBound = 'true';
  }

  function renderPage() {
    window.AdminProducts.bind();
    window.AdminDirectory.bind();
    window.AdminOrders.bind();
    window.AdminRequests.bind();
    bindSharedComponents();
    bindSettings();
    refreshData();
  }

  function refreshData() {
    window.AdminProducts.render();
    window.AdminDirectory.renderCategories();
    window.AdminOrders.render();
    window.AdminOrders.renderRecent();
    window.AdminRequests.render();
    window.AdminDirectory.renderCustomers();
    window.AdminProducts.refreshCounts();
    renderAnalytics();
  }

  function updateNavigation(url) {
    document.querySelectorAll('.sidebar-nav__link').forEach((link) => {
      const active = new URL(link.href).pathname === url.pathname;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    const activeLink = document.querySelector('.sidebar-nav__link.is-active');
    const breadcrumb = document.querySelector('.breadcrumbs strong');
    if (activeLink && breadcrumb) breadcrumb.textContent = activeLink.dataset.pageTitle;
  }

  async function loadPage(url, { historyMode = 'push', scrollY = 0 } = {}) {
    navigationController?.abort();
    navigationController = new AbortController();
    const controller = navigationController;
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Tải trang thất bại (${response.status}): ${url.href}`);
      const html = await response.text();
      const nextDocument = new DOMParser().parseFromString(html, 'text/html');
      const nextContent = nextDocument.querySelector('.page-content');
      const currentContent = document.querySelector('.page-content');
      if (!nextContent || !currentContent) throw new Error(`Không tìm thấy nội dung trang: ${url.href}`);

      if (historyMode === 'push') {
        window.history.replaceState({ ...window.history.state, scrollY: window.scrollY }, '', window.location.href);
        window.history.pushState({ scrollY: 0 }, '', url.href);
      }
      currentContent.replaceWith(nextContent);
      document.title = nextDocument.title;
      updateNavigation(url);
      renderPage();
      window.scrollTo(0, scrollY);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.warn('Điều hướng nội bộ không khả dụng, chuyển sang tải trang bình thường:', error);
      if (historyMode === 'pop') window.location.reload();
      else window.location.assign(url.href);
    }
  }

  function bindNavigation() {
    if (window.location.protocol === 'file:') return;
    window.history.replaceState({ ...window.history.state, scrollY: window.scrollY }, '', window.location.href);
    document.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
      const url = new URL(link.href, window.location.href);
      const page = url.pathname.split('/').pop();
      const adminDirectory = new URL('.', window.location.href).pathname;
      if (url.origin !== window.location.origin || !url.pathname.startsWith(adminDirectory) || !ADMIN_PAGES.has(page) || url.hash) return;
      event.preventDefault();
      if (url.href !== window.location.href) loadPage(url);
    });
    window.addEventListener('popstate', (event) => {
      loadPage(new URL(window.location.href), { historyMode: 'pop', scrollY: event.state?.scrollY || 0 });
    });
  }

  async function init() {
    try {
      if (!localStorage.getItem(KellyApi.TOKEN_KEY)) {
        window.location.replace('login.html');
        return;
      }
      const user = await KellyApi.request('/api/auth/me', { authenticated: true });
      if (user.role !== 'admin') {
        KellyApi.clearToken();
        window.location.replace('login.html');
        return;
      }
      const username = document.getElementById('admin-username');
      if (username?.firstChild) username.firstChild.textContent = user.username;
      await window.AdminStore.initialize();
      renderDate();
      bindNavigation();
      renderPage();
    } catch (error) {
      console.error('Không thể khởi tạo trang quản trị:', error);
      if (error.status === 401) {
        KellyApi.clearToken();
        window.location.replace('login.html');
        return;
      }
      const message = document.createElement('p');
      message.setAttribute('role', 'alert');
      message.textContent = `Không thể tải dữ liệu quản trị: ${error.message}`;
      document.querySelector('.page-content')?.replaceChildren(message);
    }
  }

  window.AdminApp = { refreshData, renderPage };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
