import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App as AntApp, Flex, Spin } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

import ProtectedRoute from './components/ProtectedRoute';
import CustomerSchedulePage from './pages/CustomerSchedulePage';

// Lazy-load các trang Admin & Login để tối ưu tốc độ tải trang chủ khách hàng
const MainLayout = lazy(() => import('./layouts/MainLayout'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const CampaignPage = lazy(() => import('./pages/CampaignPage'));
const SessionPage = lazy(() => import('./pages/SessionPage'));
const StudentPage = lazy(() => import('./pages/StudentPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Cấu hình dayjs dùng locale tiếng Việt toàn cục
dayjs.locale('vi');

function PageFallback() {
  return (
    <Flex justify="center" align="center" style={{ minHeight: '60vh' }}>
      <Spin size="large" />
    </Flex>
  );
}

// ─── App Root ────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AntApp>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* ── 1. Public Routes ── */}
            <Route path="/" element={<CustomerSchedulePage />} />
            <Route path="/schedule" element={<CustomerSchedulePage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* ── 2. Admin Routes (Prefix /admin): Bảo vệ bởi ProtectedRoute ── */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/campaigns" replace />} />
              <Route path="campaigns" element={<CampaignPage />} />
              <Route path="sessions" element={<SessionPage />} />
              <Route path="students" element={<StudentPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* ── 3. Fallback: Trả về trang chủ khách hàng ── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AntApp>
  );
}
