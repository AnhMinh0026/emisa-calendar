import axios from 'axios';

/**
 * Instance axios đã cấu hình sẵn baseURL trỏ tới Backend API.
 *
 * Sử dụng:
 *   import api from '@/services/api';
 *   const { data } = await api.get('/campaigns');
 *   const { data } = await api.post('/sessions', payload);
 *
 * TODO: Thêm request interceptor gắn JWT token khi Auth module hoàn thiện.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor ────────────────────────────────────────────────────
// TODO: Uncomment khi tích hợp JWT Auth
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('token');
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

// ── Response Interceptor ──────────────────────────────────────────────────
// Chuẩn hoá lỗi từ server thành object có trường `message` nhất quán
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Lỗi kết nối tới server. Vui lòng thử lại.';
    return Promise.reject({ ...error, message });
  }
);

export default api;
