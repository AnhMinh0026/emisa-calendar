import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, App } from 'antd';
import { UserOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();

  // Nếu đã đăng nhập trước đó, điều hướng thẳng tới trang quản trị
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      navigate('/admin/campaigns', { replace: true });
    }
  }, [navigate]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        username: values.username.trim(),
        password: values.password,
      });

      if (response.data?.success && response.data?.token) {
        localStorage.setItem('adminToken', response.data.token);
        message.success('Đăng nhập thành công!');

        // Điều hướng tới trang trước đó (nếu có) hoặc mặc định /admin/campaigns
        const originPath = location.state?.from?.pathname || '/admin/campaigns';
        navigate(originPath, { replace: true });
      } else {
        message.error(response.data?.message || 'Đăng nhập không thành công.');
      }
    } catch (error) {
      message.error(error.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F5F7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Card đăng nhập phong cách Apple tối giản */}
        <Card
          bordered={false}
          style={{
            borderRadius: 20,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
            padding: '12px 10px',
            background: '#FFFFFF',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28, marginTop: 10 }}>

            <Title
              level={3}
              style={{
                margin: 0,
                color: '#1D1D1F',
                fontWeight: 700,
                letterSpacing: -0.5,
              }}
            >
              Emisa Admin
            </Title>
            <Text type="secondary" style={{ fontSize: 14, display: 'block', marginTop: 6 }}>
              Đăng nhập để quản lý lịch và khóa học
            </Text>
          </div>

          {/* Form */}
          <Form
            name="admin-login"
            layout="vertical"
            onFinish={onFinish}
            autoComplete="off"
            requiredMark={false}
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#8E8E93', marginRight: 4 }} />}
                placeholder="Tên đăng nhập"
                size="large"
                style={{
                  height: 46,
                  borderRadius: 12,
                  background: '#F5F5F7',
                  border: '1px solid transparent',
                  fontSize: 14,
                }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#8E8E93', marginRight: 4 }} />}
                placeholder="Mật khẩu"
                size="large"
                style={{
                  height: 46,
                  borderRadius: 12,
                  background: '#F5F5F7',
                  border: '1px solid transparent',
                  fontSize: 14,
                }}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 24, marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: 46,
                  borderRadius: 12,
                  background: '#1D1D1F',
                  borderColor: '#1D1D1F',
                  fontWeight: 600,
                  fontSize: 15,
                  boxShadow: 'none',
                }}
              >
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>

          {/* Link chuyển nhanh sang trang Xem lịch khách hàng */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Button
              type="link"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/')}
              style={{ color: '#8E8E93', fontSize: 13 }}
            >
              Xem trang Lịch học khách hàng
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
