(function () {
  'use strict';

  const MAX_PRODUCT_IMAGES = 10;
  const MAX_IMAGE_BYTES = 240 * 1024;
  const MAX_IMAGE_DIMENSION = 1400;
  let productImages = [];
  let isProcessingImages = false;

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
    productImages = (product?.images || []).map((src) => ({ src, name: '' }));
    renderProductImages();
    document.getElementById('product-dialog-title').textContent = product ? 'Sửa sản phẩm' : 'Thêm sản phẩm';
    dialog.showModal();
  }

  function renderProductImages() {
    const preview = document.getElementById('product-image-preview');
    if (!preview) return;
    preview.innerHTML = productImages.map(({ src, name }, index) => `
      <div class="image-preview">
        <img src="${window.AdminStore.escapeHTML(src)}" alt="" />
        ${index === 0 ? '<span class="image-preview__cover">Ảnh đại diện</span>' : ''}
        <button class="image-preview__remove" type="button" data-remove-image="${index}" aria-label="Xoá ảnh ${index + 1}"${isProcessingImages ? ' disabled' : ''}>Xoá</button>
        ${name ? `<span class="image-preview__name">${window.AdminStore.escapeHTML(name)}</span>` : ''}
      </div>
    `).join('');
    preview.dataset.hasImages = String(productImages.length > 0);
    preview.setAttribute('aria-label', `${productImages.length} ảnh đã chọn`);
  }

  function canvasToBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Không thể xử lý ảnh này.'));
        } else if (blob.type !== 'image/webp') {
          reject(new Error('Trình duyệt không hỗ trợ nén ảnh WebP.'));
        } else {
          resolve(blob);
        }
      }, 'image/webp', quality);
    });
  }

  async function compressImage(file) {
    if (!file.type.startsWith('image/')) throw new Error(`Tệp "${file.name}" không phải ảnh.`);
    if (file.size > 20 * 1024 * 1024) throw new Error(`Ảnh "${file.name}" vượt quá giới hạn 20 MB.`);

    const bitmap = await createImageBitmap(file);
    try {
      let scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
      while (scale >= 0.25) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Trình duyệt không thể xử lý ảnh.');
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

        for (const quality of [0.84, 0.76, 0.68, 0.60, 0.52]) {
          const blob = await canvasToBlob(canvas, quality);
          if (blob.size <= MAX_IMAGE_BYTES) {
            return await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = () => reject(new Error(`Không thể đọc ảnh "${file.name}".`));
              reader.readAsDataURL(blob);
            });
          }
        }
        scale *= 0.8;
      }
    } finally {
      bitmap.close();
    }
    throw new Error(`Ảnh "${file.name}" không thể nén xuống dưới 240 KB.`);
  }

  async function addProductImages(event) {
    const input = event.currentTarget;
    const files = [...input.files];
    input.value = '';
    if (!files.length) return;
    if (productImages.length + files.length > MAX_PRODUCT_IMAGES) {
      window.AdminStore.notify(`Mỗi sản phẩm được chọn tối đa ${MAX_PRODUCT_IMAGES} ảnh.`, 'error');
      return;
    }

    isProcessingImages = true;
    input.disabled = true;
    const submit = document.querySelector('#product-form [type="submit"]');
    const closeButtons = [...document.querySelectorAll('#product-dialog [data-close-dialog]')];
    if (submit) submit.disabled = true;
    closeButtons.forEach((button) => { button.disabled = true; });
    renderProductImages();
    try {
      const newImages = [];
      for (const file of files) {
        newImages.push({ src: await compressImage(file), name: file.name });
      }
      productImages.push(...newImages);
    } catch (error) {
      window.AdminStore.notify(error.message || 'Không thể xử lý ảnh.', 'error');
    } finally {
      isProcessingImages = false;
      input.disabled = false;
      if (submit) submit.disabled = false;
      closeButtons.forEach((button) => { button.disabled = false; });
      renderProductImages();
    }
  }

  async function prepareProductImages() {
    if (isProcessingImages) throw new Error('Vui lòng đợi ảnh được xử lý xong.');
    if (!productImages.length) throw new Error('Vui lòng chọn ít nhất một ảnh sản phẩm.');
    return productImages.map(({ src }) => src);
  }

  function bindProductImages() {
    const form = document.getElementById('product-form');
    if (!form || form.dataset.imagesBound === 'true') return;
    form.elements.images.addEventListener('change', addProductImages);
    document.getElementById('product-dialog').addEventListener('cancel', (event) => {
      if (isProcessingImages) event.preventDefault();
    });
    document.getElementById('product-image-preview').addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove-image]');
      if (!button) return;
      productImages.splice(Number(button.dataset.removeImage), 1);
      renderProductImages();
    });
    form.addEventListener('reset', () => {
      productImages = [];
      renderProductImages();
    });
    form.dataset.imagesBound = 'true';
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
    form.elements.status.value = request.status === 'rejected' ? 'rejected' : 'quoted';
    form.elements.quoteNote.value = request.quoteNote || '';
    form.elements.rejectionReason.value = request.rejectionReason || '';
    document.getElementById('quote-request-detail').textContent =
      `${request.name} · ${request.productType} · ${request.color || 'Chưa chọn màu'} · Ngân sách: ${request.budget || 'Thảo luận thêm'}. ${request.description || ''}`;
    dialog.showModal();
  }

  window.AdminDialogs = { bindProductImages, openProduct, openOrder, openQuote, prepareProductImages };
})();
