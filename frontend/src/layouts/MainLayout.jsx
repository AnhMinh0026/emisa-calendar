import { useState } from 'react';
import { Layout, Menu, Typography, Avatar, theme, Button } from 'antd';
import {
  BookOutlined,
  CalendarOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ScheduleOutlined,
  SettingOutlined,
  LogoutOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

// ─── Menu items ─────────────────────────────────────────────────────────────
const menuItems = [
  {
    key: '/admin/campaigns',
    icon: <BookOutlined />,
    label: 'Quản lý khóa học',
  },
  {
    key: '/admin/sessions',
    icon: <CalendarOutlined />,
    label: 'Quản lý lớp học',
  },
  {
    key: '/admin/settings',
    icon: <SettingOutlined />,
    label: 'Cấu hình hệ thống',
  },
];

// ─── MainLayout ──────────────────────────────────────────────────────────────
export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const handleMenuClick = ({ key }) => navigate(key);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login', { replace: true });
  };

  // Xác định menu item đang active dựa trên pathname hiện tại
  const selectedKey = menuItems.find((item) =>
    location.pathname.startsWith(item.key)
  )?.key ?? '/admin/campaigns';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <Sider
        collapsible
        collapsed={collapsed}
        trigger={null}               // Tắt trigger mặc định, dùng nút custom trong Header
        width={240}
        style={{
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          overflow: 'auto',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
        }}
      >
        {/* Logo / Branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: collapsed ? '20px 12px' : '20px 20px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            transition: 'padding 0.2s',
            overflow: 'hidden',
          }}
        >
          {!collapsed && (
            <Text strong style={{ fontSize: 15, whiteSpace: 'nowrap' }}>
              Emisa Calendar
            </Text>
          )}
        </div>

        {/* Navigation Menu */}
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            border: 'none',
            marginTop: 8,
          }}
        />
      </Sider>

      {/* ── Main area: Header + Content + Footer ────────────────────────── */}
      <Layout>
        {/* Header */}
        <Header
          style={{
            padding: '0 24px',
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          {/* Cạnh trái: Nút thu gọn & Tiêu đề */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span
              id="sidebar-toggle"
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: 18,
                cursor: 'pointer',
                color: token.colorTextSecondary,
                padding: '4px 8px',
                borderRadius: token.borderRadius,
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = token.colorBgTextHover;
                e.currentTarget.style.color = token.colorText;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = token.colorTextSecondary;
              }}
              title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>

            <Text type="secondary" style={{ fontSize: 14 }}>
              {menuItems.find((m) => m.key === selectedKey)?.label ?? 'Dashboard'}
            </Text>
          </div>

          {/* Cạnh phải: Link trang Khách hàng & Nút Đăng xuất */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => window.open('/', '_blank')}
              style={{ fontSize: 13, color: token.colorTextSecondary }}
            >
              Xem trang Lịch học
            </Button>
            <Button
              type="text"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{ fontSize: 13 }}
            >
              Đăng xuất
            </Button>
          </div>
        </Header>

        {/* Content */}
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
            minHeight: 360,
          }}
        >
          {/* Các trang con (Campaigns, Sessions) được render tại đây */}
          <Outlet />
        </Content>

        {/* Footer */}
        <Footer style={{ textAlign: 'center', padding: '12px 24px' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Emisa Calendar ©{new Date().getFullYear()} — Hệ thống Quản lý Lịch học
          </Text>
        </Footer>
      </Layout>
    </Layout>
  );
}
