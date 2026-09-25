import { Navigate, useLocation } from 'react-router-dom';

/**
 * Component bảo vệ các route chỉ dành cho Quản trị viên (Admin).
 * Kiểm tra token 'adminToken' trong localStorage:
 * - Nếu hợp lệ: cho phép render các route con (children hoặc Outlet)
 * - Nếu không có: chuyển hướng về trang /login
 */
export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem('adminToken');

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
