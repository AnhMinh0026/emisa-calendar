import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App as AntApp } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

import MainLayout from './layouts/MainLayout';
import CampaignPage from './pages/CampaignPage';
import SessionPage from './pages/SessionPage';
import CustomerSchedulePage from './pages/CustomerSchedulePage';
import SettingsPage from './pages/SettingsPage';

// Cấu hình dayjs dùng locale tiếng Việt toàn cục
dayjs.locale('vi');

// ─── App Root ────────────────────────────────────────────────────────────────
// ConfigProvider đặt trong main.jsx — không lặp lại ở đây.
// AntApp cung cấp context cho App.useApp() (message, modal, notification).
export default function App() {
  return (
    <AntApp>
      <BrowserRouter>
        <Routes>
          {/* ── Public route: Lịch học cho khách hàng ── */}
          <Route path="/schedule" element={<CustomerSchedulePage />} />

          {/* ── Admin routes: bọc trong MainLayout ──── */}
          <Route element={<MainLayout />}>
            {/* Redirect root → /campaigns */}
            <Route index element={<Navigate to="/campaigns" replace />} />

            {/* Quản lý khóa học */}
            <Route path="/campaigns" element={<CampaignPage />} />

            {/* Quản lý lớp học */}
            <Route path="/sessions" element={<SessionPage />} />

            {/* Cấu hình hệ thống */}
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AntApp>
  );
}
