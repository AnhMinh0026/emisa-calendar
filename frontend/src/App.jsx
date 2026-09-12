import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App as AntApp } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

import MainLayout from './layouts/MainLayout';
import CampaignPage from './pages/CampaignPage';
import SessionPage from './pages/SessionPage';

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
          <Route element={<MainLayout />}>
            {/* Redirect root → /campaigns */}
            <Route index element={<Navigate to="/campaigns" replace />} />

            {/* Quản lý khóa học */}
            <Route path="/campaigns" element={<CampaignPage />} />

            {/* Quản lý lớp học */}
            <Route path="/sessions" element={<SessionPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AntApp>
  );
}
