(function () {
  'use strict';

  const NAVIGATION = [
    { href: 'index.html', title: 'Tổng quan' },
    { href: 'products.html', title: 'Sản phẩm', countId: 'nav-product-count' },
    { href: 'orders.html', title: 'Đơn hàng', countId: 'nav-order-count' },
    { href: 'requests.html', title: 'Yêu cầu riêng', countId: 'nav-request-count' },
    { href: 'categories.html', title: 'Danh mục' },
    { href: 'customers.html', title: 'Khách hàng' },
    { href: 'reports.html', title: 'Báo cáo', groupBefore: 'PHÂN TÍCH & CÀI ĐẶT' },
    { href: 'settings.html', title: 'Cài đặt cửa hàng' },
  ];

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const currentItem = NAVIGATION.find((item) => item.href === currentPage) || NAVIGATION[0];
  const sidebar = document.getElementById('admin-sidebar');
  const topbar = document.getElementById('admin-topbar');

  sidebar.innerHTML = `
    <a class="brand" href="index.html">KellyCrochet<span>QUẢN TRỊ CỬA HÀNG</span></a>
    <p class="sidebar__label">QUẢN LÝ CỬA HÀNG</p>
    <nav class="sidebar-nav" aria-label="Điều hướng quản trị">
      ${NAVIGATION.map((item) => `${item.groupBefore ? `<p class="sidebar__label sidebar__label--secondary">${item.groupBefore}</p>` : ''}
        <a class="sidebar-nav__link${item.href === currentItem.href ? ' is-active' : ''}" href="${item.href}"${item.href === currentItem.href ? ' aria-current="page"' : ''} data-page-title="${item.title}">
          <span>${item.title}</span>${item.countId ? `<span class="nav-count" id="${item.countId}">0</span>` : ''}
        </a>`).join('')}
    </nav>
    <div class="sidebar__bottom">
      <div class="admin-profile"><span class="admin-profile__name" id="admin-username">Quản trị viên<small>Đang đăng nhập</small></span></div>
      <a class="store-link" href="../index.html">Xem cửa hàng</a>
    </div>
  `;

  topbar.innerHTML = `
    <div class="breadcrumbs">KellyCrochet <span>/</span> <strong>${currentItem.title}</strong></div>
    <div class="topbar__right"><span class="demo-badge">DỮ LIỆU MÁY CHỦ</span><span class="topbar__date" id="today-date"></span><button class="button button--outline" id="admin-logout" type="button">Đăng xuất</button></div>
  `;

  document.body.insertAdjacentHTML('beforeend', `
    <dialog class="admin-dialog" id="product-dialog" aria-labelledby="product-dialog-title">
      <form class="dialog-form" id="product-form">
        <div class="dialog-heading"><div><p class="panel-kicker">QUẢN LÝ SẢN PHẨM</p><h2 id="product-dialog-title">Thêm sản phẩm</h2></div><button class="dialog-close" type="button" data-close-dialog>Đóng</button></div>
        <input type="hidden" name="id" />
        <label class="settings-field">Tên sản phẩm<input name="name" required maxlength="100" /></label>
        <div class="dialog-fields"><label class="settings-field">Danh mục<select name="category" required></select></label><label class="settings-field">Màu sắc<textarea name="colors" rows="2" required maxlength="800" placeholder="Trắng, Đỏ, Xanh..."></textarea></label></div>
        <div class="dialog-fields"><label class="settings-field">Giá bán (₫)<input name="price" type="number" min="0" step="1" required /></label><label class="settings-field">Số lượng tồn kho<input name="quantity" type="number" min="0" step="1" required /></label></div>
        <label class="settings-field image-picker">Ảnh sản phẩm<input name="images" type="file" accept="image/*" multiple /><small>Chọn tối đa 10 ảnh. Ảnh đầu tiên là ảnh đại diện; ảnh được nén và lưu cùng sản phẩm.</small></label>
        <div class="image-preview-list" id="product-image-preview" aria-live="polite"></div>
        <label class="settings-field">Mô tả<textarea name="desc" rows="3" maxlength="5000" required></textarea></label>
        <p class="product-form-notice" id="product-form-notice" role="status" aria-live="polite" hidden></p>
        <div class="dialog-actions"><button class="button button--outline" type="button" data-close-dialog>Huỷ</button><button class="button button--dark" type="submit">Lưu sản phẩm</button></div>
      </form>
    </dialog>
    <dialog class="admin-dialog" id="category-dialog" aria-labelledby="category-dialog-title">
      <form class="dialog-form" id="category-form">
        <div class="dialog-heading"><div><p class="panel-kicker">QUẢN LÝ DANH MỤC</p><h2 id="category-dialog-title">Thêm danh mục</h2></div><button class="dialog-close" type="button" data-close-dialog>Đóng</button></div>
        <input type="hidden" name="id" />
        <label class="settings-field">Tên danh mục<input name="name" required maxlength="50" /></label>
        <label class="settings-field">Mô tả<textarea name="description" rows="3" maxlength="200"></textarea></label>
        <label class="settings-field">Trạng thái<select name="status" required><option value="visible">Đang hiển thị</option><option value="hidden">Đang ẩn</option></select></label>
        <div class="dialog-actions"><button class="button button--outline" type="button" data-close-dialog>Huỷ</button><button class="button button--dark" type="submit">Lưu danh mục</button></div>
      </form>
    </dialog>
    <dialog class="admin-dialog" id="order-dialog" aria-labelledby="order-dialog-title">
      <form class="dialog-form" id="order-form">
        <div class="dialog-heading"><div><p class="panel-kicker">QUẢN LÝ ĐƠN HÀNG</p><h2 id="order-dialog-title">Tạo đơn hàng</h2></div><button class="dialog-close" type="button" data-close-dialog>Đóng</button></div>
        <input type="hidden" name="id" />
        <div class="dialog-fields"><label class="settings-field">Tên khách hàng<input name="customerName" required maxlength="100" /></label><label class="settings-field">Số điện thoại<input name="phone" type="tel" maxlength="30" /></label></div>
        <label class="settings-field">Email<input name="email" type="email" maxlength="254" /></label>
        <label class="settings-field">Tỉnh / thành phố<input name="city" maxlength="120" /></label>
        <div class="dialog-fields"><label class="settings-field">Xã / phường<input name="ward" maxlength="120" /></label><label class="settings-field">Khu phố / ấp<input name="neighborhood" maxlength="120" /></label></div>
        <label class="settings-field">Địa chỉ chi tiết<input name="address" maxlength="250" /></label>
        <label class="settings-field">Sản phẩm / nội dung đơn<input name="items" required maxlength="300" /></label>
        <label class="settings-field">Tổng tiền (₫)<input name="total" type="number" min="0" step="1000" required /></label>
        <label class="settings-field">Ghi chú<input name="note" maxlength="300" /></label>
        <div class="dialog-actions"><button class="button button--outline" type="button" data-close-dialog>Huỷ</button><button class="button button--dark" type="submit">Lưu đơn hàng</button></div>
      </form>
    </dialog>
    <dialog class="admin-dialog order-detail-dialog" id="order-detail-dialog" aria-labelledby="order-detail-title">
      <div class="dialog-form">
        <div class="dialog-heading"><div><p class="panel-kicker">CHI TIẾT ĐƠN HÀNG</p><h2 id="order-detail-title">Đơn hàng</h2></div><button class="dialog-close" type="button" data-close-dialog>Đóng</button></div>
        <div id="order-detail-content"></div>
        <div class="order-detail-actions" id="order-detail-actions"></div>
      </div>
    </dialog>
    <dialog class="admin-dialog" id="quote-dialog" aria-labelledby="quote-dialog-title">
      <form class="dialog-form" id="quote-form">
        <div class="dialog-heading"><div><p class="panel-kicker">PHẢN HỒI KHÁCH HÀNG</p><h2 id="quote-dialog-title">Cập nhật báo giá</h2></div><button class="dialog-close" type="button" data-close-dialog>Đóng</button></div>
        <input type="hidden" name="id" /><div class="request-detail" id="quote-request-detail"></div>
        <label class="settings-field">Báo giá cuối cùng (₫)<input name="quote" type="number" min="0" step="1" /></label>
        <label class="settings-field">Trạng thái yêu cầu<select name="status" required><option value="quoted">Đã báo giá – chờ khách xác nhận</option><option value="rejected">Không nhận yêu cầu</option></select><small>Khách đồng ý báo giá bằng cách xác nhận đặt hàng trên trang Đơn hàng của tôi.</small></label>
        <label class="settings-field">Lời nhắn / nội dung báo giá<textarea name="quoteNote" rows="3" maxlength="3000" placeholder="Ví dụ: Giá đã gồm phí nguyên liệu và công làm..."></textarea></label>
        <label class="settings-field">Lý do không nhận<textarea name="rejectionReason" rows="2" maxlength="1000"></textarea></label>
        <div class="dialog-actions"><button class="button button--outline" type="button" data-close-dialog>Huỷ</button><button class="button button--dark" type="submit">Cập nhật báo giá</button></div>
      </form>
    </dialog>
    <div class="admin-loading" id="admin-loading" role="status" aria-live="polite" hidden>
      <span class="admin-loading__spinner" aria-hidden="true"></span>
      <span id="admin-loading-message">Đang tải...</span>
    </div>
  `);
})();
