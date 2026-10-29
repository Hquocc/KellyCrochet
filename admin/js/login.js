(function () {
  'use strict';

  const form = document.getElementById('admin-login-form');
  const errorMessage = document.getElementById('login-error');
  const submitButton = form.querySelector('[type="submit"]');

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
  }

  async function redirectIfAuthenticated() {
    if (!localStorage.getItem(KellyApi.TOKEN_KEY)) return;
    try {
      const user = await KellyApi.request('/api/auth/me', { authenticated: true });
      if (user.role === 'admin') window.location.replace('index.html');
      else KellyApi.clearToken();
    } catch (error) {
      if (error.status === 401) KellyApi.clearToken();
      else showError(error.message);
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    errorMessage.hidden = true;
    submitButton.disabled = true;
    try {
      const data = new FormData(form);
      const result = await KellyApi.request('/api/auth/login', {
        method: 'POST',
        body: {
          username: String(data.get('username')).trim(),
          password: String(data.get('password')),
        },
      });
      if (result.user?.role !== 'admin') {
        KellyApi.clearToken();
        showError('Tài khoản này không có quyền truy cập khu vực quản trị.');
        return;
      }
      KellyApi.setToken(result.token);
      window.location.replace('index.html');
    } catch (error) {
      console.error('Đăng nhập quản trị thất bại:', error);
      showError(error.message || 'Không thể đăng nhập. Vui lòng thử lại.');
    } finally {
      submitButton.disabled = false;
    }
  });

  redirectIfAuthenticated();
})();
