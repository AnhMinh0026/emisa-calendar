import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App as AntApp } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

import MainLayout from './layouts/MainLayout';
import CampaignPage from './pages/CampaignPage';
import SessionPage from './pages/SessionPage';
import CustomerSchedulePage from './pages/CustomerSchedulePage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

// Cấu hình dayjs dùng locale tiếng Việt toàn cục
dayjs.locale('vi');

// ─── App Root ────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AntApp>
      <BrowserRouter>
        <Routes>
          {/* ── 1. Public Routes ── */}
          {/* Trang chủ mặc định: Lịch học khách hàng */}
          <Route path="/" element={<CustomerSchedulePage />} />
          <Route path="/schedule" element={<CustomerSchedulePage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* ── 2. Admin Routes (Prefix /admin): Bảo vệ bởi ProtectedRoute ──── */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* Redirect /admin → /admin/campaigns */}
            <Route index element={<Navigate to="/admin/campaigns" replace />} />
            <Route path="campaigns" element={<CampaignPage />} />
            <Route path="sessions" element={<SessionPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* ── 3. Fallback: Trả về trang chủ khách hàng ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AntApp>
  );
}
