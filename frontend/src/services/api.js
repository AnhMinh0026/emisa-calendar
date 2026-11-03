import axios from 'axios';

/**
 * Instance axios đã cấu hình sẵn baseURL trỏ tới Backend API.
 * Tích hợp:
 *  - JWT Authentication qua localStorage ('adminToken')
 *  - In-memory Cache (SWR - Stale-While-Revalidate) giúp chuyển trang 0ms không giật lag
 *  - Request Deduplication (gộp các request trùng lặp đang chạy song song)
 *  - Tự động Invalidate Cache thông minh khi có thao tác thêm/sửa/xóa
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Bộ nhớ đệm (In-memory Cache) & Quản lý Request đang chạy ────────────────
const responseCache = new Map(); // key -> { data, timestamp }
const inFlightRequests = new Map(); // key -> Promise
const FRESH_DURATION_MS = 2000; // Trong 2 giây coi là fresh tuyệt đối

const normalizeKey = (url, params) => {
  if (!params || Object.keys(params).length === 0) return url;
  const search = new URLSearchParams(params).toString();
  return `${url}?${search}`;
};

/**
 * Lấy dữ liệu từ cache đồng bộ (dùng để khởi tạo state ngay lập tức, tránh màn hình trắng/loading)
 */
export const getCachedData = (url, params) => {
  const key = normalizeKey(url, params);
  return responseCache.get(key)?.data ?? null;
};

/**
 * Xóa cache theo tiền tố URL (hoặc xóa toàn bộ nếu không truyền prefix)
 */
export const invalidateCache = (prefixes = []) => {
  if (!prefixes.length) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (prefixes.some((p) => key.startsWith(p))) {
      responseCache.delete(key);
    }
  }
};

/**
 * Gọi GET API có tích hợp Request Deduplication & Cache Update
 * @param {string} url Đường dẫn API
 * @param {object} options { params, force, signal }
 */
export const fetchWithCache = async (url, { params, force = false, signal } = {}) => {
  const key = normalizeKey(url, params);
  const now = Date.now();
  const cached = responseCache.get(key);

  // Nếu dữ liệu còn rất mới (< 2 giây) và không ép làm mới -> trả về luôn không cần gọi lại mạng
  if (!force && cached && now - cached.timestamp < FRESH_DURATION_MS) {
    return cached.data;
  }

  // Nếu đang có sẵn 1 request y hệt đang chạy -> dùng chung Promise đó (chống gọi trùng)
  if (!signal && inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  const requestPromise = api
    .get(url, { params, signal })
    .then((res) => {
      responseCache.set(key, { data: res.data, timestamp: Date.now() });
      return res.data;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  if (!signal) {
    inFlightRequests.set(key, requestPromise);
  }

  return requestPromise;
};

// Gắn kèm helper lên instance api để tiện truy cập
api.getCached = getCachedData;
api.fetchCached = fetchWithCache;
api.invalidateCache = invalidateCache;

// ── Request Interceptor ────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ──────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    const method = response.config?.method?.toLowerCase();
    const url = response.config?.url || '';

    // Nếu là GET request thành công -> lưu vào cache
    if (method === 'get') {
      const key = normalizeKey(url, response.config?.params);
      responseCache.set(key, { data: response.data, timestamp: Date.now() });
    }
    // Nếu là Mutation (POST, PUT, DELETE, PATCH) -> tự động làm mới cache liên quan
    else if (['post', 'put', 'delete', 'patch'].includes(method)) {
      if (url.includes('/campaigns')) {
        invalidateCache(['/campaigns', '/sessions']);
      } else if (url.includes('/sessions')) {
        invalidateCache(['/sessions', '/students']);
      } else if (url.includes('/students')) {
        invalidateCache(['/students', '/sessions']);
      } else if (url.includes('/settings')) {
        invalidateCache(['/settings']);
      }
    }

    return response;
  },
  (error) => {
    // Bỏ qua lỗi do hủy request chủ động (AbortController)
    if (axios.isCancel(error) || error.name === 'CanceledError') {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if (status === 401 && !isLoginRequest) {
      localStorage.removeItem('adminToken');
      responseCache.clear();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      'Lỗi kết nối tới server. Vui lòng thử lại.';

    return Promise.reject({ ...error, message });
  }
);

export default api;
