(function () {
  'use strict';

  const budgetLabels = {
    under300: 'Dưới 300.000₫',
    under500: 'Dưới 500.000₫',
    under1000: 'Dưới 1.000.000₫',
    discuss: 'Thảo luận thêm',
  };
  let categories = [];

  function showError(message) {
    window.Toast?.show(message);
    const form = document.getElementById('custom-order-form');
    let error = document.getElementById('custom-order-error');
    if (!error) {
      error = document.createElement('p');
      error.id = 'custom-order-error';
      error.setAttribute('role', 'alert');
      form.prepend(error);
    }
    error.textContent = message;
  }

  function renderCategories() {
    const group = document.getElementById('product-type-group');
    const hidden = document.getElementById('product-type-value');
    if (!group || !hidden) return;
    group.replaceChildren(...categories.map((category, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `tag${index === 0 ? ' tag--active' : ''}`;
      button.dataset.value = String(category._id);
      button.textContent = category.name;
      return button;
    }));
    hidden.value = categories[0]?._id || '';
    group.addEventListener('click', (event) => {
      const button = event.target.closest('.tag');
      if (!button) return;
      group.querySelectorAll('.tag').forEach((tag) => tag.classList.toggle('tag--active', tag === button));
      hidden.value = button.dataset.value;
    });
  }

  function validateForm(formData) {
    const errors = {};
    if (!String(formData.get('name') || '').trim()) errors.name = 'Vui lòng nhập tên của bạn.';
    const phone = String(formData.get('phone') || '').trim();
    const phoneInput = document.getElementById('customer-phone');
    if (!phone) errors.phone = 'Vui lòng nhập số điện thoại.';
    else if (!phoneInput.checkValidity()) errors.phone = phoneInput.title;

    const emailInput = document.getElementById('customer-email');
    const email = String(formData.get('email') || '').trim();
    if (!email || !emailInput.checkValidity()) errors.email = 'Vui lòng nhập địa chỉ email hợp lệ.';
    if (!formData.get('productType')) errors.productType = 'Vui lòng chọn danh mục sản phẩm.';
    if (!String(formData.get('productName') || '').trim()) errors.productName = 'Vui lòng nhập tên sản phẩm muốn làm.';
    if (!String(formData.get('color') || '').trim()) errors.color = 'Vui lòng nhập màu sắc mong muốn.';
    if (!String(formData.get('description') || '').trim()) errors.description = 'Vui lòng mô tả sản phẩm cần làm.';
    return errors;
  }

  function showErrors(errors) {
    document.querySelectorAll('.form-input').forEach((element) => element.classList.remove('error'));
    document.querySelectorAll('.form-error').forEach((element) => { element.textContent = ''; });
    Object.entries(errors).forEach(([field, message]) => {
      const input = document.getElementById(`customer-${field}`);
      const error = document.getElementById(`error-${field}`);
      input?.classList.add('error');
      if (error) error.textContent = message;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const errors = validateForm(data);
    if (Object.keys(errors).length) {
      showErrors(errors);
      return;
    }

    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const submitted = await KellyApi.request('/api/requests', {
        method: 'POST',
        body: {
          customer: {
            name: String(data.get('name')).trim(),
            phone: String(data.get('phone')).trim(),
            email: String(data.get('email')).trim(),
          },
          productName: String(data.get('productName')).trim(),
          category: String(data.get('productType')),
          budget: budgetLabels[data.get('budget')] || 'Thảo luận thêm',
          requestedColors: String(data.get('color')).split(/[,;\n]/).map((color) => color.trim()).filter(Boolean),
          description: String(data.get('description')).trim(),
        },
      });
      let trackingSaved = true;
      try {
        const trackedRequests = JSON.parse(localStorage.getItem('kc_custom_requests') || '[]');
        if (!Array.isArray(trackedRequests)) throw new Error('Dữ liệu theo dõi yêu cầu không hợp lệ.');
        trackedRequests.push({ id: submitted.requestId, token: submitted.trackingToken });
        localStorage.setItem('kc_custom_requests', JSON.stringify(trackedRequests));
      } catch (error) {
        trackingSaved = false;
        console.error('Không thể lưu mã theo dõi yêu cầu trên thiết bị:', error);
      }
      form.reset();
      document.getElementById('product-type-value').value = categories[0]?._id || '';
      document.querySelectorAll('#product-type-group .tag').forEach((tag, index) => {
        tag.classList.toggle('tag--active', index === 0);
      });
      window.Toast?.show(trackingSaved
        ? `Yêu cầu đã gửi! Mã #${submitted.requestId.slice(-8).toUpperCase()}. Theo dõi báo giá tại trang Đơn hàng của tôi.`
        : `Yêu cầu đã gửi (mã #${submitted.requestId.slice(-8).toUpperCase()}) nhưng thiết bị không lưu được mã theo dõi. Vui lòng liên hệ cửa hàng để nhận báo giá.`);
    } catch (error) {
      console.error('Không thể gửi yêu cầu làm sản phẩm:', error);
      showError(error.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      button.disabled = false;
    }
  }

  async function init() {
    try {
      categories = await KellyApi.all('/api/categories');
      renderCategories();
      if (!categories.length) showError('Cửa hàng chưa có danh mục nhận đặt riêng.');
    } catch (error) {
      console.error('Không thể tải danh mục sản phẩm:', error);
      showError(error.message || 'Không tải được danh mục sản phẩm.');
    }
    document.getElementById('custom-order-form')?.addEventListener('submit', handleSubmit);
    Animations.init();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
