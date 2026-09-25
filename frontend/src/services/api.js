import axios from 'axios';

/**
 * Instance axios đã cấu hình sẵn baseURL trỏ tới Backend API.
 * Tích hợp JWT Authentication qua localStorage ('adminToken').
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor ────────────────────────────────────────────────────
// Tự động đính kèm token vào header Authorization nếu có trong localStorage
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
// Bắt lỗi 401 (hết hạn / sai token) để xóa token và chuyển hướng về /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if (status === 401 && !isLoginRequest) {
      localStorage.removeItem('adminToken');
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
