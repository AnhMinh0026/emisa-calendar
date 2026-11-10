import { useEffect, useState, useMemo } from 'react';
import { Form, Input, Button, Typography, Card, Flex, App, Divider } from 'antd';
import {
  FacebookFilled,
  MessageOutlined,
  SaveOutlined,
  LinkOutlined,
  EnvironmentOutlined,
  CompassOutlined,
  CodeOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;

const SETTING_KEY = 'contact_links';
const SETTING_URL = `/settings/${SETTING_KEY}`;

/**
 * Trích xuất URL src hợp lệ từ thẻ <iframe ...> của Google Maps hoặc tạo URL embed từ địa chỉ text
 */
function extractMapEmbedSrc(rawEmbed = '', fallbackAddress = '') {
  const trimmed = String(rawEmbed || '').trim();
  if (trimmed) {
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
    const candidate = srcMatch ? srcMatch[1].trim() : trimmed;
    if (/^https?:\/\//i.test(candidate)) {
      return candidate;
    }
  }
  const addr = String(fallbackAddress || '').trim();
  if (addr) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(addr)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
  }
  return '';
}

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [initialValues] = useState(() => {
    const cached = api.getCached(SETTING_URL)?.data?.value;
    return {
      facebook: cached?.facebook ?? '',
      zalo: cached?.zalo ?? '',
      address: cached?.address ?? '',
      mapUrl: cached?.mapUrl ?? '',
      mapEmbed: cached?.mapEmbed ?? '',
    };
  });
  const [loading, setLoading] = useState(() => !api.getCached(SETTING_URL));
  const [saving, setSaving] = useState(false);
  const { message } = App.useApp();

  // Theo dõi giá trị form thời gian thực để hiển thị bản xem trước bản đồ
  const watchedAddress = Form.useWatch('address', form);
  const watchedMapUrl = Form.useWatch('mapUrl', form);
  const watchedMapEmbed = Form.useWatch('mapEmbed', form);

  const previewEmbedSrc = useMemo(
    () => extractMapEmbedSrc(watchedMapEmbed, watchedAddress),
    [watchedMapEmbed, watchedAddress]
  );

  const previewJumpUrl = useMemo(() => {
    const custom = String(watchedMapUrl || '').trim();
    if (custom) return custom;
    const addr = String(watchedAddress || '').trim();
    if (addr) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    }
    return '';
  }, [watchedMapUrl, watchedAddress]);

  useEffect(() => {
    let ignore = false;
    const hasCached = !!api.getCached(SETTING_URL);

    api
      .fetchCached(SETTING_URL)
      .then((res) => {
        if (ignore) return;
        const value = res?.data?.value ?? {};
        form.setFieldsValue({
          facebook: value.facebook ?? '',
          zalo: value.zalo ?? '',
          address: value.address ?? '',
          mapUrl: value.mapUrl ?? '',
          mapEmbed: value.mapEmbed ?? '',
        });
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
          address: values.address?.trim() ?? '',
          mapUrl: values.mapUrl?.trim() ?? '',
          mapEmbed: values.mapEmbed?.trim() ?? '',
        },
      });
      message.success('Đã lưu cấu hình liên hệ & bản đồ thành công!');
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
          <Title
            level={4}
            style={{
              margin: 0,
              fontSize: 21,
              fontWeight: 700,
              color: '#1D1D1F',
              letterSpacing: -0.4,
            }}
          >
            Cấu hình hệ thống
          </Title>
          <Text style={{ fontSize: 13, color: '#6E6E73', display: 'block', marginTop: 2 }}>
            Quản lý các thông tin liên hệ và bản đồ địa chỉ studio hiển thị cho khách hàng
          </Text>
        </div>
      </Flex>

      <Card
        title={
          <Flex align="center" gap={8}>
            <LinkOutlined style={{ color: '#1E4DB7' }} />
            <span style={{ fontWeight: 600, color: '#1D1D1F' }}>
              Thông tin liên hệ & Bản đồ Studio
            </span>
          </Flex>
        }
        style={{
          maxWidth: 680,
          borderRadius: 12,
          border: '1px solid #ECECEE',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
        }}
      >
        <Paragraph type="secondary" style={{ marginBottom: 20, fontSize: 13 }}>
          Các thông tin này sẽ hiển thị trên trang lịch học công khai (<Text code>/</Text>) trong
          cửa sổ <strong>"Đăng ký lớp học"</strong> và tại <strong>nút tròn Liên hệ nhanh</strong> ở
          góc màn hình.
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

          <Divider style={{ margin: '18px 0' }} />

          <Form.Item
            name="address"
            label={
              <Flex align="center" gap={6}>
                <EnvironmentOutlined style={{ color: '#E11D48', fontSize: 16 }} />
                <span>Địa chỉ Studio (dạng chữ — bấm vào nhảy tới Google Maps)</span>
              </Flex>
            }
            extra="Khi khách hàng bấm trực tiếp vào dòng chữ địa chỉ này, trình duyệt sẽ mở thẳng vị trí trên Google Maps."
          >
            <Input
              placeholder="VD: Lầu 2, 123 Nguyễn Huệ, Quận 1, TP.HCM"
              prefix={<EnvironmentOutlined style={{ color: '#E11D48' }} />}
              allowClear
              id="input-studio-address"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="mapUrl"
            label={
              <Flex align="center" gap={6}>
                <CompassOutlined style={{ color: '#1E4DB7', fontSize: 16 }} />
                <span>Link Google Maps khi bấm vào địa chỉ (tùy chọn)</span>
              </Flex>
            }
            extra="Dán link rút gọn (https://maps.app.goo.gl/...) nếu muốn chỉ định ghim chính xác. Nếu để trống, hệ thống tự động tìm theo Địa chỉ Studio."
            rules={[
              {
                type: 'url',
                message: 'Vui lòng nhập URL hợp lệ.',
                warningOnly: true,
              },
            ]}
          >
            <Input
              placeholder="https://maps.app.goo.gl/..."
              prefix={<CompassOutlined style={{ color: '#1E4DB7' }} />}
              allowClear
              id="input-studio-map-url"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="mapEmbed"
            label={
              <Flex align="center" gap={6}>
                <CodeOutlined style={{ color: '#0F172A', fontSize: 15 }} />
                <span>Mã nhúng bản đồ Google Maps (&lt;iframe&gt; hoặc URL Embed — tùy chọn)</span>
              </Flex>
            }
            extra="Trên Google Maps bấm Chia sẻ → Nhúng bản đồ → Sao chép HTML rồi dán vào đây. Nếu để trống, hệ thống vẫn tự động nhúng bản đồ theo Địa chỉ Studio phía trên."
          >
            <Input.TextArea
              rows={3}
              placeholder='<iframe src="https://www.google.com/maps/embed?pb=..." ...></iframe>'
              allowClear
              id="input-studio-map-embed"
              style={{ borderRadius: 8, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5 }}
            />
          </Form.Item>

          {/* Bản xem trước trực tiếp Địa chỉ bấm nhảy sang Map & Bản đồ nhúng */}
          {(watchedAddress?.trim() || previewEmbedSrc) && (
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: 14,
                marginTop: 8,
              }}
            >
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                  marginBottom: 8,
                }}
              >
                Xem trước hiển thị cho khách hàng
              </div>

              {watchedAddress?.trim() && (
                <a
                  href={previewJumpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="address-text-link"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 10,
                    padding: '10px 12px',
                    marginBottom: previewEmbedSrc ? 10 : 0,
                    color: '#0F172A',
                  }}
                >
                  <Flex align="center" gap={8} style={{ minWidth: 0 }}>
                    <EnvironmentOutlined style={{ color: '#E11D48', fontSize: 16, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.4 }}>
                      {watchedAddress.trim()}
                    </span>
                  </Flex>
                  <ExportOutlined style={{ color: '#1E4DB7', fontSize: 13, flexShrink: 0 }} />
                </a>
              )}

              {previewEmbedSrc && (
                <div
                  style={{
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: '1px solid #E2E8F0',
                    height: 210,
                    background: '#EEF2F6',
                  }}
                >
                  <iframe
                    title="Xem trước bản đồ Studio"
                    src={previewEmbedSrc}
                    width="100%"
                    height="100%"
                    style={{ border: 0, display: 'block' }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}
            </div>
          )}

          <Divider style={{ margin: '18px 0' }} />

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
