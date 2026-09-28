import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Table, Button, Modal, Drawer, Form, Input,
  Space, Tag, Popconfirm, App, Typography, Tooltip,
  Flex, Select, Switch, Row, Col, Grid, Card, Empty,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ReloadOutlined, FilterOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { Title, Text } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Tạo danh sách tháng để chọn trong Select (ví dụ: 24 tháng từ hiện tại)
// ─────────────────────────────────────────────────────────────────────────────
const generateMonthOptions = () => {
  const options = [];
  const start = dayjs().subtract(6, 'month');
  for (let i = 0; i < 30; i++) {
    const m = start.add(i, 'month');
    const value = m.format('MM/YYYY');
    options.push({ value, label: `Tháng ${m.format('M/YYYY')}` });
  }
  return options;
};

const MONTH_OPTIONS = generateMonthOptions();

// ─────────────────────────────────────────────────────────────────────────────
// CampaignPage — Quản lý Khóa học
// CRUD đầy đủ + Search theo tên + Filter theo tháng (local state)
// ─────────────────────────────────────────────────────────────────────────────
export default function CampaignPage() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();

  // ── State dữ liệu ──────────────────────────────────────────────────────────
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // ── State Filter ───────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [filterMonth, setFilterMonth] = useState(null); // 'MM/YYYY' | null
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/campaigns');
      setCampaigns(data.data ?? []);
    } catch (err) {
      message.error(err.message || 'Không thể tải danh sách khóa học.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  // ── Local Filter (phản hồi tức thì) ───────────────────────────────────────
  const filteredCampaigns = useMemo(() => {
    let result = campaigns;

    if (searchText.trim()) {
      const kw = searchText.trim().toLowerCase();
      result = result.filter((c) =>
        c.title?.toLowerCase().includes(kw) ||
        c.description?.toLowerCase().includes(kw)
      );
    }

    if (filterMonth) {
      result = result.filter((c) =>
        Array.isArray(c.months) && c.months.includes(filterMonth)
      );
    }

    return result;
  }, [campaigns, searchText, filterMonth]);

  const hasActiveFilter = searchText.trim() || filterMonth;
  const resetFilters = () => { setSearchText(''); setFilterMonth(null); };

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditTarget(record);
    form.setFieldsValue({
      title: record.title,
      description: record.description,
      months: record.months ?? [],
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }

    setSubmitting(true);
    try {
      const payload = {
        title: values.title.trim(),
        description: values.description?.trim() ?? '',
        months: values.months, // Mảng 'MM/YYYY'
      };

      if (editTarget) {
        await api.put(`/campaigns/${editTarget._id}`, payload);
        message.success(`Đã cập nhật khóa học "${payload.title}".`);
      } else {
        await api.post('/campaigns', payload);
        message.success(`Đã tạo khóa học "${payload.title}".`);
      }

      closeModal();
      fetchCampaigns();
    } catch (err) {
      message.error(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await api.delete(`/campaigns/${record._id}`);
      message.success(`Đã xóa khóa học "${record.title}".`);
      fetchCampaigns();
    } catch (err) {
      modal.error({
        title: 'Không thể xóa',
        content: err.message || 'Có lỗi xảy ra khi xóa khóa học.',
        okText: 'Đã hiểu',
      });
    }
  };

  const handleToggleHidden = async (record) => {
    const newHidden = !record.isHidden;
    setTogglingId(record._id);
    try {
      await api.put(`/campaigns/${record._id}`, { isHidden: newHidden });
      message.success(
        newHidden
          ? `Đã ẩn khóa học "${record.title}".`
          : `Đã hiển thị khóa học "${record.title}".`
      );
      setCampaigns((prev) =>
        prev.map((c) => (c._id === record._id ? { ...c, isHidden: newHidden } : c))
      );
    } catch (err) {
      message.error(err.message || 'Không thể cập nhật trạng thái hiển thị.');
    } finally {
      setTogglingId(null);
    }
  };

  // ── Cột bảng ──────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || <Text type="secondary">—</Text>,
    },
    {
      title: 'Các tháng học',
      dataIndex: 'months',
      key: 'months',
      render: (months) =>
        Array.isArray(months) && months.length > 0 ? (
          <Space size={4} wrap>
            {months.map((m) => (
              <Tag key={m} color="blue" style={{ fontWeight: 600, fontSize: 12 }}>
                {m}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Hiển thị',
      dataIndex: 'isHidden',
      key: 'isHidden',
      width: 110,
      align: 'center',
      render: (_, record) => (
        <Tooltip title={!record.isHidden ? 'Đang hiển thị cho học viên (Click để ẩn)' : 'Đang ẩn khỏi học viên (Click để hiện)'}>
          <Switch
            checked={!record.isHidden}
            loading={togglingId === record._id}
            onChange={() => handleToggleHidden(record)}
            checkedChildren="Hiện"
            unCheckedChildren="Ẩn"
            style={{
              backgroundColor: !record.isHidden ? '#34C759' : undefined,
            }}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 155,
      align: 'center',
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY HH:mm') : '—',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title={screens.md ? "Chỉnh sửa" : null}>
            <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Xác nhận xóa"
            description={`Bạn chắc chắn muốn xóa khóa học "${record.title}"?`}
            onConfirm={() => handleDelete(record)}
            okText="Xóa"
            okButtonProps={{ danger: true }}
            cancelText="Hủy"
            placement="topRight"
          >
            <Tooltip title={screens.md ? "Xóa" : null}>
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Flex
        justify="space-between"
        align="center"
        wrap="wrap"
        gap={12}
        style={{ marginBottom: 16 }}
      >
        <Title level={4} style={{ margin: 0, fontSize: !screens.md ? 18 : 20 }}>
          Quản lý Khóa học
        </Title>
        <Flex
          align="center"
          gap={8}
          style={{
            width: !screens.md ? '100%' : 'auto',
          }}
        >
          <Tooltip title={screens.md ? "Tải lại" : null}>
            <Button icon={<ReloadOutlined />} onClick={fetchCampaigns} loading={loading} />
          </Tooltip>
          {!screens.md && (
            <Button
              icon={<FilterOutlined />}
              onClick={() => setIsFilterOpen((prev) => !prev)}
              type={isFilterOpen ? 'primary' : 'default'}
              ghost={isFilterOpen}
              id="btn-toggle-filter-campaign"
              style={
                hasActiveFilter && !isFilterOpen
                  ? { borderColor: '#141414', color: '#141414', fontWeight: 600 }
                  : undefined
              }
            >
              Lọc{hasActiveFilter ? ' •' : ''}
            </Button>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            id="btn-add-campaign"
            style={{ flex: !screens.md ? 1 : undefined }}
          >
            Thêm Khóa học
          </Button>
        </Flex>
      </Flex>

      {/* ── Toolbar: Search + Filter tháng (Collapsible on Mobile, Normal on Desktop) ─ */}
      <div
        style={
          screens.md
            ? { marginBottom: 16 }
            : {
                maxHeight: isFilterOpen ? 260 : 0,
                opacity: isFilterOpen ? 1 : 0,
                overflow: isFilterOpen ? 'visible' : 'hidden',
                transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease, margin-bottom 0.3s ease',
                marginBottom: isFilterOpen ? 16 : 0,
                pointerEvents: isFilterOpen ? 'auto' : 'none',
              }
        }
      >
        <Row
          gutter={[12, 12]}
          align="middle"
          style={{
            padding: '12px 14px',
            background: '#fafafa',
            borderRadius: 8,
            border: '1px solid #f0f0f0',
          }}
        >
          <Col xs={24} sm={12} md={8}>
            <Input.Search
              placeholder="Tìm theo tên khóa học..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '100%' }}
              id="search-campaign"
            />
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Lọc theo tháng"
              allowClear
              showSearch
              value={filterMonth}
              onChange={(val) => setFilterMonth(val ?? null)}
              options={MONTH_OPTIONS}
              style={{ width: '100%' }}
              id="filter-campaign-month"
            />
          </Col>

          {hasActiveFilter && (
            <Col xs={24} md={10}>
              <Flex align="center" justify="space-between" gap={8} wrap="wrap">
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Tìm thấy <Text strong>{filteredCampaigns.length}</Text> / {campaigns.length} kết quả
                </Text>
                <Button size="small" onClick={resetFilters}>Xóa bộ lọc</Button>
              </Flex>
            </Col>
          )}
        </Row>
      </div>

      {/* ── Danh sách Khóa học: Table (Desktop) / Cards (Mobile) ───────── */}
      {screens.md ? (
        <Table
          rowKey="_id"
          dataSource={filteredCampaigns}
          columns={columns}
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `${total} / ${campaigns.length} khóa học`,
            showSizeChanger: false,
          }}
          scroll={{ x: 800 }}
          size="middle"
          locale={{
            emptyText: hasActiveFilter
              ? 'Không tìm thấy kết quả phù hợp.'
              : 'Chưa có khóa học nào. Hãy thêm mới!',
          }}
        />
      ) : loading ? (
        <Card loading style={{ borderRadius: 8, marginBottom: 12 }} />
      ) : filteredCampaigns.length === 0 ? (
        <Empty
          description={
            hasActiveFilter
              ? 'Không tìm thấy kết quả phù hợp.'
              : 'Chưa có khóa học nào. Hãy thêm mới!'
          }
          style={{ padding: '32px 0' }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filteredCampaigns.map((record) => (
            <div
              key={record._id}
              className="mobile-campaign-card"
              style={{
                padding: '16px',
                border: '1px solid #f0f0f0',
                borderRadius: '8px',
                marginBottom: '12px',
                backgroundColor: '#ffffff',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
              }}
            >
              {/* Header (Tiêu đề & Thao tác) */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                {/* Bên trái: Tiêu đề khóa học */}
                <div
                  style={{
                    flex: 1,
                    whiteSpace: 'normal',
                    wordWrap: 'break-word',
                    fontWeight: 'bold',
                    fontSize: '15px',
                    color: '#1f1f1f',
                    lineHeight: 1.4,
                  }}
                >
                  {record.title}
                </div>

                {/* Bên phải: Nhóm các icon thao tác (Switch Ẩn/Hiện, Edit, Delete) gap: 12px */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexShrink: 0,
                  }}
                >
                  <Tooltip
                    title={
                      screens.md
                        ? (!record.isHidden
                            ? 'Đang hiển thị (Click để ẩn)'
                            : 'Đang ẩn (Click để hiện)')
                        : null
                    }
                  >
                    <Switch
                      size="small"
                      checked={!record.isHidden}
                      loading={togglingId === record._id}
                      onChange={() => handleToggleHidden(record)}
                      checkedChildren="Hiện"
                      unCheckedChildren="Ẩn"
                      style={{
                        backgroundColor: !record.isHidden ? '#34C759' : undefined,
                      }}
                    />
                  </Tooltip>
                  <Tooltip title={screens.md ? "Chỉnh sửa" : null}>
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => openEdit(record)}
                      id={`btn-edit-campaign-${record._id}`}
                    />
                  </Tooltip>
                  <Popconfirm
                    title="Xác nhận xóa"
                    description={`Bạn chắc chắn muốn xóa khóa học "${record.title}"?`}
                    onConfirm={() => handleDelete(record)}
                    okText="Xóa"
                    okButtonProps={{ danger: true }}
                    cancelText="Hủy"
                    placement="topRight"
                  >
                    <Tooltip title={screens.md ? "Xóa" : null}>
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        id={`btn-delete-campaign-${record._id}`}
                      />
                    </Tooltip>
                  </Popconfirm>
                </div>
              </div>

              {/* Body (Mô tả): Nằm dưới tiêu đề, marginTop: 8px */}
              <div
                style={{
                  marginTop: '8px',
                  color: '#666666',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  whiteSpace: 'normal',
                  wordWrap: 'break-word',
                }}
              >
                {record.description?.trim() ? record.description : '—'}
              </div>

              {/* Các tháng học nếu có */}
              {Array.isArray(record.months) && record.months.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {record.months.map((m) => (
                    <Tag key={m} color="blue" style={{ fontWeight: 600, fontSize: 11, margin: 0 }}>
                      {m}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modal / Drawer Thêm / Sửa ────────────────────────────────────── */}
      {(() => {
        const campaignFormNode = (
          <Form form={form} layout="vertical" style={{ marginTop: screens.md ? 16 : 8 }} requiredMark="optional">
            <Form.Item
              name="title"
              label="Tiêu đề khóa học"
              rules={[{ required: true, message: 'Vui lòng nhập tiêu đề khóa học.' }]}
            >
              <Input
                placeholder="VD: Khoá cơ bản"
                maxLength={100}
                showCount
                id="input-campaign-title"
              />
            </Form.Item>

            <Form.Item name="description" label="Mô tả (tùy chọn)">
              <Input.TextArea
                rows={3}
                placeholder="Ghi chú thêm về khóa học..."
                maxLength={300}
                showCount
                id="input-campaign-description"
              />
            </Form.Item>

            {/* Chọn nhiều tháng */}
            <Form.Item
              name="months"
              label="Các tháng của khóa học"
              extra="Chọn một hoặc nhiều tháng. Thứ tự sẽ tự động sắp xếp tăng dần."
              rules={[{
                required: true,
                type: 'array',
                min: 1,
                message: 'Vui lòng chọn ít nhất một tháng.',
              }]}
            >
              <Select
                mode="multiple"
                placeholder="Chọn tháng..."
                options={MONTH_OPTIONS}
                showSearch
                optionFilterProp="label"
                allowClear
                id="select-campaign-months"
              />
            </Form.Item>
          </Form>
        );

        const formTitle = editTarget ? 'Chỉnh sửa Khóa học' : 'Thêm Khóa học mới';
        const submitText = editTarget ? 'Lưu thay đổi' : 'Tạo mới';

        return screens.md ? (
          <Modal
            title={formTitle}
            open={modalOpen}
            onCancel={closeModal}
            onOk={handleSubmit}
            okText={submitText}
            cancelText="Hủy"
            confirmLoading={submitting}
            destroyOnClose
            width={620}
          >
            {campaignFormNode}
          </Modal>
        ) : (
          <Drawer
            title={formTitle}
            placement="right"
            width="100%"
            open={modalOpen}
            onClose={closeModal}
            closeIcon={<ArrowLeftOutlined />}
            destroyOnClose
            styles={{
              body: { padding: '16px' },
            }}
            footer={
              <div
                style={{
                  paddingBottom: 'env(safe-area-inset-bottom, 20px)',
                  display: 'flex',
                  gap: 12,
                  justifyContent: 'flex-end',
                }}
              >
                <Button onClick={closeModal} style={{ flex: 1 }}>
                  Hủy
                </Button>
                <Button
                  type="primary"
                  onClick={handleSubmit}
                  loading={submitting}
                  style={{ flex: 1 }}
                  id="drawer-btn-submit-campaign"
                >
                  {submitText}
                </Button>
              </div>
            }
          >
            {campaignFormNode}
          </Drawer>
        );
      })()}
    </>
  );
}
