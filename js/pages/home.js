/**
 * pages/home.js  –  Logic trang chủ
 */

(function () {
  'use strict';

  const HOME_PRODUCT_LIMIT = 12;

  async function init() {
    try {
      await ProductCatalog.load();
      ProductCard.renderGrid(PRODUCTS.slice(0, HOME_PRODUCT_LIMIT), 'home-product-grid');
    } catch (error) {
      console.error('Không thể tải sản phẩm:', error);
      const grid = document.getElementById('home-product-grid');
      if (grid) grid.innerHTML = '<p role="alert">Không tải được sản phẩm. Vui lòng tải lại trang sau.</p>';
    }
    Animations.init();
  }

  // Chạy sau khi DOM load xong
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
