(function () {
  'use strict';

  const TOKEN_KEY = 'kc_access_token';

  async function request(path, { method = 'GET', body, authenticated = false, trackingToken } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (trackingToken) headers['X-Request-Token'] = trackingToken;
    if (authenticated) {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      headers.Authorization = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetch(path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      throw new Error('Không thể kết nối đến máy chủ. Hãy kiểm tra kết nối và thử lại.', { cause: error });
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error('Máy chủ trả về dữ liệu không hợp lệ.', { cause: error });
    }
    if (!response.ok) {
      const error = new Error(payload.error?.message || 'Yêu cầu không thành công.');
      error.status = response.status;
      throw error;
    }
    return payload.data;
  }

  async function all(path, { authenticated = false, query = {} } = {}) {
    const items = [];
    let page = 1;
    let totalPages = 1;
    do {
      const params = new URLSearchParams({ ...query, page: String(page), limit: '100' });
      const result = await request(`${path}?${params}`, { authenticated });
      if (!Array.isArray(result.items)) throw new Error('Máy chủ trả về danh sách không hợp lệ.');
      items.push(...result.items);
      totalPages = result.totalPages;
      page += 1;
    } while (page <= totalPages);
    return items;
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  window.KellyApi = { all, clearToken, request, setToken, TOKEN_KEY };
})();
