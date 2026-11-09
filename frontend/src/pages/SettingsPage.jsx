import { useEffect, useState } from 'react';
import { Form, Input, Button, Typography, Card, Flex, App, Divider } from 'antd';
import {
  FacebookFilled, MessageOutlined, SaveOutlined, LinkOutlined,
} from '@ant-design/icons';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;

const SETTING_KEY = 'contact_links';
const SETTING_URL = `/settings/${SETTING_KEY}`;

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [initialValues] = useState(() => {
    const cached = api.getCached(SETTING_URL)?.data?.value;
    return {
      facebook: cached?.facebook ?? '',
      zalo: cached?.zalo ?? '',
    };
  });
  const [loading, setLoading] = useState(() => !api.getCached(SETTING_URL));
  const [saving, setSaving] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    let ignore = false;
    const hasCached = !!api.getCached(SETTING_URL);

    api
      .fetchCached(SETTING_URL)
      .then((res) => {
        if (ignore) return;
        const value = res?.data?.value ?? {};
        form.setFieldsValue({ facebook: value.facebook ?? '', zalo: value.zalo ?? '' });
      })
      .catch(() => {
        if (!ignore && !hasCached) {
          message.error('Không thể tải cấu hình. Vui lòng thử lại.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [form, message]);

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setSaving(true);
    try {
      await api.put(SETTING_URL, {
        value: {
          facebook: values.facebook?.trim() ?? '',
          zalo: values.zalo?.trim() ?? '',
        },
      });
      message.success('Đã lưu cấu hình liên hệ thành công!');
    } catch (err) {
      message.error(err.response?.data?.message || 'Lưu thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontSize: 21, fontWeight: 700, color: '#1D1D1F', letterSpacing: -0.4 }}>
            Cấu hình hệ thống
          </Title>
          <Text style={{ fontSize: 13, color: '#6E6E73', display: 'block', marginTop: 2 }}>
            Quản lý các thông tin liên hệ hiển thị cho khách hàng
          </Text>
        </div>
      </Flex>

      <Card
        title={
          <Flex align="center" gap={8}>
            <LinkOutlined style={{ color: '#1D1D1F' }} />
            <span style={{ fontWeight: 600, color: '#1D1D1F' }}>Liên kết mạng xã hội</span>
          </Flex>
        }
        style={{ maxWidth: 600, borderRadius: 12, border: '1px solid #ECECEE', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)' }}
      >
        <Paragraph type="secondary" style={{ marginBottom: 20, fontSize: 13 }}>
          Các link này sẽ hiển thị trong trang lịch học công khai (<Text code>/</Text>) khi khách
          hàng click <strong>"Đăng ký ngay"</strong>. Để trống nếu chưa muốn hiển thị.
        </Paragraph>

        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          disabled={loading}
          requiredMark="optional"
        >
          <Form.Item
            name="facebook"
            label={
              <Flex align="center" gap={6}>
                <FacebookFilled style={{ color: '#1877F2', fontSize: 16 }} />
                <span>Link Facebook</span>
              </Flex>
            }
            rules={[
              {
                type: 'url',
                message: 'Vui lòng nhập URL hợp lệ (bắt đầu bằng http:// hoặc https://).',
                warningOnly: true,
              },
            ]}
          >
            <Input
              placeholder="https://facebook.com/your-page"
              prefix={<FacebookFilled style={{ color: '#1877F2' }} />}
              allowClear
              id="input-facebook-link"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="zalo"
            label={
              <Flex align="center" gap={6}>
                <MessageOutlined style={{ color: '#0068FF', fontSize: 16 }} />
                <span>Link Zalo (OA hoặc cá nhân)</span>
              </Flex>
            }
            rules={[
              {
                type: 'url',
                message: 'Vui lòng nhập URL hợp lệ.',
                warningOnly: true,
              },
            ]}
          >
            <Input
              placeholder="https://zalo.me/your-id"
              prefix={<MessageOutlined style={{ color: '#0068FF' }} />}
              allowClear
              id="input-zalo-link"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Divider style={{ margin: '16px 0' }} />

          <Flex justify="flex-end">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
              id="btn-save-settings"
              style={{ borderRadius: 8, minWidth: 140 }}
            >
              Lưu cấu hình
            </Button>
          </Flex>
        </Form>
      </Card>
    </>
  );
}
