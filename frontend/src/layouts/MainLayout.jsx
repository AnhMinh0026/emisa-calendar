import { useState } from 'react';
import { Layout, Menu, Typography, theme, Button, Drawer, Grid } from 'antd';
import {
  BookOutlined,
  CalendarOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;

  const handleMenuClick = ({ key }) => {
    navigate(key);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

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
      {/* ── Desktop Sider: breakpoint lg, collapsedWidth 0 ────────────── */}
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        collapsed={collapsed}
        onCollapse={(c) => setCollapsed(c)}
        trigger={null}
        width={240}
        style={{
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          overflow: 'auto',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
          zIndex: 100,
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
            <Text strong style={{ fontSize: 16, whiteSpace: 'nowrap' }}>
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

      {/* ── Mobile Off-canvas Drawer ───────────────────────────────────── */}
      <Drawer
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={250}
        styles={{
          header: { display: 'none' },
          body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' },
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 16px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Text strong style={{ fontSize: 16 }}>
            Emisa Calendar
          </Text>
          <Button
            type="text"
            size="small"
            onClick={() => setDrawerOpen(false)}
            style={{ color: token.colorTextSecondary }}
          >
            ✕
          </Button>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            border: 'none',
            flex: 1,
            marginTop: 8,
          }}
        />
        <div style={{ padding: '16px', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <Button
            danger
            block
            icon={<LogoutOutlined />}
            onClick={() => {
              setDrawerOpen(false);
              handleLogout();
            }}
          >
            Đăng xuất
          </Button>
        </div>
      </Drawer>

      {/* ── Main area: Header + Content + Footer ────────────────────────── */}
      <Layout>
        {/* Header */}
        <Header
          style={{
            padding: screens.md ? '0 24px' : '0 12px',
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
          {/* Cạnh trái: Hamburger Menu (Mobile) hoặc Thu gọn Sider (Desktop) & Tiêu đề */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile ? (
              <Button
                type="text"
                icon={<MenuOutlined style={{ fontSize: 18 }} />}
                onClick={() => setDrawerOpen(true)}
                id="btn-mobile-menu"
                style={{ padding: '4px 8px' }}
                title="Mở menu"
              />
            ) : (
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
            )}

            <Text type="secondary" style={{ fontSize: 14 }}>
              {menuItems.find((m) => m.key === selectedKey)?.label ?? 'Dashboard'}
            </Text>
          </div>

          {/* Cạnh phải: Link trang Khách hàng & Nút Đăng xuất */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => window.open('/', '_blank')}
              style={{ fontSize: 13, color: token.colorTextSecondary }}
            >
              {screens.sm ? 'Xem trang Lịch học' : 'Xem lịch'}
            </Button>
            {!isMobile && (
              <Button
                type="text"
                danger
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                style={{ fontSize: 13 }}
              >
                Đăng xuất
              </Button>
            )}
          </div>
        </Header>

        {/* Content: Giảm padding/margin trên mobile để tối ưu không gian */}
        <Content
          style={{
            margin: screens.md ? 24 : (screens.sm ? 16 : 8),
            padding: screens.md ? 24 : 12,
            background: token.colorBgContainer,
            borderRadius: screens.md ? token.borderRadiusLG : 8,
            minHeight: 360,
          }}
        >
          {/* Các trang con (Campaigns, Sessions, Settings) được render tại đây */}
          <Outlet />
        </Content>

        {/* Footer */}
        <Footer style={{ textAlign: 'center', padding: '12px 16px' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Emisa Calendar ©{new Date().getFullYear()} — Hệ thống Quản lý Lịch học
          </Text>
        </Footer>
      </Layout>
    </Layout>
  );
}
