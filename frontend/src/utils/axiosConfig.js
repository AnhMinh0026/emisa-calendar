/**
 * Cấu hình Axios Interceptors cho hệ thống Emisa Calendar.
 * Tái xuất instance `api` từ services/api.js để đảm bảo tính nhất quán.
 */
import api from '../services/api';

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('adminToken', token);
  } else {
    localStorage.removeItem('adminToken');
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('adminToken');
};

export const clearAuthToken = () => {
  localStorage.removeItem('adminToken');
};

export default api;
