(function () {
  'use strict';

  function renderProductCategories(selectedCategory) {
    const select = document.querySelector('#product-form [name="category"]');
    if (!select) return;
    const categories = window.AdminStore.categories.filter((category) => category.active || category.id === selectedCategory);
    select.replaceChildren(...categories.map((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = `${category.name}${category.active ? '' : ' (Đang ẩn)'}`;
      option.selected = category.id === selectedCategory;
      return option;
    }));
  }

  function openProduct(product) {
    const dialog = document.getElementById('product-dialog');
    if (!dialog) return;
    const form = document.getElementById('product-form');
    form.reset();
    form.elements.id.value = product ? product.id : '';
    form.elements.name.value = product?.name || '';
    const defaultCategory = product?.categoryId || window.AdminStore.categories.find((category) => category.active)?.id || '';
    renderProductCategories(defaultCategory);
    form.elements.colors.value = product?.colors?.join(', ') || '';
    form.elements.price.value = product?.price ?? '';
    form.elements.quantity.value = product?.quantity ?? 0;
    form.elements.desc.value = product?.desc || '';
    form.elements.images.value = (product?.images || []).join('\n');
    document.getElementById('product-dialog-title').textContent = product ? 'Sửa sản phẩm' : 'Thêm sản phẩm';
    dialog.showModal();
  }

  async function prepareProductImages() {
    const input = document.querySelector('#product-form [name="images"]');
    const images = String(input?.value || '').split(/\r?\n/).map((image) => image.trim()).filter(Boolean);
    if (images.length > 10) throw new Error('Mỗi sản phẩm được lưu tối đa 10 ảnh.');
    if (images.some((image) => image.length > 2048 || !/^(https?:\/\/|\/|assets\/)/i.test(image))) {
      throw new Error('Mỗi ảnh cần là URL http(s), đường dẫn tuyệt đối hoặc đường dẫn bắt đầu bằng assets/.');
    }
    return images;
  }

  function openOrder(order) {
    const dialog = document.getElementById('order-dialog');
    if (!dialog) return;
    const form = document.getElementById('order-form');
    form.reset();
    form.elements.id.value = order?.id || '';
    form.elements.customerName.value = order?.customerName || '';
    form.elements.phone.value = order?.phone || '';
    const customer = order?.originalOrder?.customer || {};
    form.elements.email.value = customer.email || '';
    form.elements.address.value = customer.address || '';
    form.elements.neighborhood.value = customer.neighborhood || '';
    form.elements.ward.value = customer.ward || '';
    form.elements.city.value = customer.city || '';
    form.elements.items.value = order ? window.AdminStore.itemSummary(order) : '';
    form.elements.total.value = order?.total ?? '';
    form.elements.note.value = order?.note || '';
    document.getElementById('order-dialog-title').textContent = order ? 'Cập nhật đơn hàng' : 'Tạo đơn hàng';
    dialog.showModal();
  }

  function openQuote(request) {
    const dialog = document.getElementById('quote-dialog');
    if (!dialog) return;
    const form = document.getElementById('quote-form');
    form.reset();
    form.elements.id.value = request.id;
    form.elements.quote.value = request.quote || '';
    form.elements.status.value = request.status === 'accepted' ? 'accepted' : request.status === 'rejected' ? 'rejected' : 'quoted';
    form.elements.quoteNote.value = request.quoteNote || '';
    form.elements.rejectionReason.value = request.rejectionReason || '';
    document.getElementById('quote-request-detail').textContent =
      `${request.name} · ${request.productType} · ${request.color || 'Chưa chọn màu'} · Ngân sách: ${request.budget || 'Thảo luận thêm'}. ${request.description || ''}`;
    dialog.showModal();
  }

  window.AdminDialogs = { openProduct, openOrder, openQuote, prepareProductImages };
})();
