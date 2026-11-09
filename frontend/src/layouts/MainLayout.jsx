import { useState } from 'react';
import { Layout, Menu, Typography, theme, Button, Drawer, Grid, ConfigProvider } from 'antd';
import {
  BookOutlined,
  CalendarOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  SettingOutlined,
  LogoutOutlined,
  ExportOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

// Bảng màu Flexy Admin (#1E4DB7 · #1A9BFC · #FEC90F · #0BB2FB)
const ADMIN_PRIMARY = '#1E4DB7';
const ADMIN_SECONDARY = '#1A9BFC';
const ADMIN_ACCENT = '#FEC90F';

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

  const activeMenuLabel =
    menuItems.find((m) => m.key === selectedKey)?.label ?? 'Dashboard';

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: ADMIN_PRIMARY,
          colorInfo: ADMIN_SECONDARY,
          colorWarning: ADMIN_ACCENT,
          borderRadius: 8,
        },
        components: {
          Menu: {
            itemSelectedBg: ADMIN_PRIMARY,
            itemSelectedColor: '#FFFFFF',
            itemHoverBg: '#EBF3FE',
            itemHoverColor: ADMIN_PRIMARY,
            itemBorderRadius: 10,
            itemMarginInline: 12,
            itemHeight: 42,
          },
          Table: {
            headerBg: '#F8FAFC',
            headerColor: '#64748B',
            headerSplitColor: 'transparent',
            rowHoverBg: '#F4F8FF',
            borderColor: '#EEF2F6',
          },
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', background: '#F4F6FA' }}>
        {/* ── Desktop Sider: cố định bên trái (fixed 100vh), đồng bộ chiều cao Header 60px ── */}
        {!isMobile && (
          <Sider
            collapsible
            collapsedWidth={0}
            collapsed={collapsed}
            onCollapse={(c) => setCollapsed(c)}
            trigger={null}
            width={248}
            style={{
              background: '#FFFFFF',
              borderRight: collapsed ? 'none' : '1px solid #E8EEF5',
              overflowY: 'auto',
              height: '100vh',
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              zIndex: 100,
              boxShadow: '2px 0 12px rgba(30, 77, 183, 0.03)',
            }}
          >
            {/* Logo / Branding — cao đúng 60px khớp tuyệt đối với Header bên phải */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                height: 60,
                padding: collapsed ? '0 12px' : '0 20px',
                borderBottom: '1px solid #EEF2F6',
                boxSizing: 'border-box',
                transition: 'padding 0.2s',
                overflow: 'hidden',
                position: 'sticky',
                top: 0,
                background: '#FFFFFF',
                zIndex: 1,
              }}
            >
              {!collapsed && (
                <>
                  <div
                    style={{
                      position: 'relative',
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      background: `linear-gradient(135deg, ${ADMIN_PRIMARY} 0%, ${ADMIN_SECONDARY} 100%)`,
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 15,
                      flexShrink: 0,
                      boxShadow: '0 3px 8px rgba(30, 77, 183, 0.25)',
                    }}
                  >
                    E
                    <span
                      style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: ADMIN_ACCENT,
                        border: '2px solid #FFFFFF',
                      }}
                    />
                  </div>
                  <div style={{ minWidth: 0, lineHeight: 1.2 }}>
                    <Text
                      strong
                      style={{
                        fontSize: 15.5,
                        color: '#0F172A',
                        whiteSpace: 'nowrap',
                        display: 'block',
                        letterSpacing: -0.3,
                      }}
                    >
                      Emisa Calendar
                    </Text>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: '#64748B',
                        letterSpacing: 0.4,
                        textTransform: 'uppercase',
                      }}
                    >
                      Admin Workspace
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Nhãn phân mục Menu */}
            {!collapsed && (
              <div
                style={{
                  padding: '18px 22px 6px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#94A3B8',
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                }}
              >
                Quản trị
              </div>
            )}

            {/* Navigation Menu */}
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              items={menuItems}
              onClick={handleMenuClick}
              style={{
                border: 'none',
                fontWeight: 500,
                fontSize: 13.5,
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
            wrapper: { width: 256 },
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              borderBottom: '1px solid #EEF2F6',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  position: 'relative',
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `linear-gradient(135deg, ${ADMIN_PRIMARY} 0%, ${ADMIN_SECONDARY} 100%)`,
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                E
                <span
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: ADMIN_ACCENT,
                    border: '1.5px solid #FFFFFF',
                  }}
                />
              </div>
              <Text strong style={{ fontSize: 15, color: '#0F172A' }}>
                Emisa Calendar
              </Text>
            </div>
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
              fontWeight: 500,
            }}
          />
          <div style={{ padding: '16px', borderTop: '1px solid #EEF2F6' }}>
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
            marginLeft: isMobile ? 0 : collapsed ? 0 : 248,
            transition: 'margin-left 0.2s',
            minHeight: '100vh',
            background: '#F4F6FA',
          }}
        >
          {/* Header */}
          <Header
            style={{
              height: 60,
              lineHeight: '60px',
              padding: screens.md ? '0 24px' : '0 12px',
              background: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderBottom: '1px solid #E8EEF5',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              zIndex: 99,
            }}
          >
            {/* Cạnh trái: Hamburger Menu (Mobile) hoặc Thu gọn Sider (Desktop) & Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isMobile ? (
                <Button
                  type="text"
                  icon={<MenuOutlined style={{ fontSize: 17 }} />}
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
                    fontSize: 16,
                    cursor: 'pointer',
                    color: '#64748B',
                    padding: '6px 8px',
                    borderRadius: 8,
                    lineHeight: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#EBF3FE';
                    e.currentTarget.style.color = ADMIN_PRIMARY;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#64748B';
                  }}
                  title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
                >
                  {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                </span>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                {!isMobile && (
                  <>
                    <span style={{ color: '#94A3B8', fontWeight: 500 }}>Admin</span>
                    <span style={{ color: '#CBD5E1' }}>/</span>
                  </>
                )}
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{activeMenuLabel}</span>
              </div>
            </div>

            {/* Cạnh phải: Link trang Khách hàng & Nút Đăng xuất */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button
                size="small"
                icon={<ExportOutlined style={{ fontSize: 12 }} />}
                onClick={() => window.open('/', '_blank')}
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: ADMIN_PRIMARY,
                  borderRadius: 8,
                  borderColor: '#BFDBFE',
                  background: '#EBF3FE',
                  height: 32,
                  padding: '0 12px',
                }}
              >
                {screens.sm ? 'Xem trang Lịch học' : 'Xem lịch'}
              </Button>
              {!isMobile && (
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<LogoutOutlined />}
                  onClick={handleLogout}
                  style={{ fontSize: 12.5, fontWeight: 500, height: 32, borderRadius: 8 }}
                >
                  Đăng xuất
                </Button>
              )}
            </div>
          </Header>

          {/* Content */}
          <Content
            style={{
              margin: screens.md ? '20px 24px' : screens.sm ? '14px 16px' : '10px 8px',
              padding: screens.md ? 24 : 14,
              background: '#FFFFFF',
              borderRadius: screens.md ? 16 : 12,
              border: '1px solid #E8EEF5',
              boxShadow: '0 4px 20px rgba(30, 77, 183, 0.04)',
              minHeight: 360,
            }}
          >
            <Outlet />
          </Content>

          {/* Footer */}
          <Footer style={{ textAlign: 'center', padding: '8px 16px 18px', background: 'transparent' }}>
            <Text style={{ fontSize: 12, color: '#94A3B8' }}>
              Emisa Calendar ©{new Date().getFullYear()} — Hệ thống Quản lý Lịch học
            </Text>
          </Footer>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
