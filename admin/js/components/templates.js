(function () {
  'use strict';

  const { escapeHTML, statusClass } = window.AdminStore;

  window.AdminTemplates = {
    statusBadge(status) {
      return `<span class="status ${statusClass(status)}">${escapeHTML(status)}</span>`;
    },
    productCell(product) {
      const image = product.image || product.images?.[0] || '';
      const imageSource = image.startsWith('data:') ? image : `../${image}`;
      const imageCount = Array.isArray(product.images) ? product.images.length : (image ? 1 : 0);
      return `<div class="product-cell"><img src="${escapeHTML(imageSource)}" alt="" /><span>${escapeHTML(product.name)}${imageCount > 1 ? `<small class="product-image-count">${imageCount} ảnh</small>` : ''}</span></div>`;
    },
    rowActions(type, id, actions) {
      return `<div class="row-actions">${actions.map(({ action, label, danger = false }) => `
        <button type="button" class="text-action${danger ? ' text-action--danger' : ''}" data-${type}-action="${action}" data-id="${escapeHTML(id)}">${label}</button>
      `).join('')}</div>`;
    },
  };
})();
