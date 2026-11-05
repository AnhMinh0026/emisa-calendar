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
  TeamOutlined,
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
    key: '/admin/students',
    icon: <TeamOutlined />,
    label: 'Quản lý học viên',
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
  const selectedKey =
    menuItems.find((item) => location.pathname.startsWith(item.key))?.key ??
    '/admin/campaigns';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ── Desktop Sider: cố định bên trái (fixed 100vh), đồng bộ chiều cao Header 64px ── */}
      {!isMobile && (
        <Sider
          collapsible
          collapsedWidth={0}
          collapsed={collapsed}
          onCollapse={(c) => setCollapsed(c)}
          trigger={null}
          width={240}
          style={{
            background: token.colorBgContainer,
            borderRight: collapsed ? 'none' : `1px solid ${token.colorBorderSecondary}`,
            overflowY: 'auto',
            height: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 100,
          }}
        >
          {/* Logo / Branding — cao đúng 64px khớp tuyệt đối với Header bên phải */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              height: 64,
              padding: collapsed ? '0 12px' : '0 20px',
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
              boxSizing: 'border-box',
              transition: 'padding 0.2s',
              overflow: 'hidden',
              position: 'sticky',
              top: 0,
              background: token.colorBgContainer,
              zIndex: 1,
            }}
          >
            {!collapsed && (
              <Text strong style={{ fontSize: 16, whiteSpace: 'nowrap', lineHeight: 1 }}>
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
      )}

      {/* ── Mobile Off-canvas Drawer ───────────────────────────────────── */}
      <Drawer
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        styles={{
          header: { display: 'none' },
          body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' },
          wrapper: { width: 250 },
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
      <Layout
        style={{
          marginLeft: isMobile ? 0 : collapsed ? 0 : 240,
          transition: 'margin-left 0.2s',
          minHeight: '100vh',
        }}
      >
        {/* Header */}
        <Header
          style={{
            height: 64,
            lineHeight: '64px',
            padding: screens.md ? '0 24px' : '0 12px',
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 99,
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

        {/* Content */}
        <Content
          style={{
            margin: screens.md ? 24 : screens.sm ? 16 : 8,
            padding: screens.md ? 24 : 12,
            background: token.colorBgContainer,
            borderRadius: screens.md ? token.borderRadiusLG : 8,
            minHeight: 360,
          }}
        >
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
