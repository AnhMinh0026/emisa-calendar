import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Table, Button, Modal, Form, Input,
  Space, Tag, Popconfirm, App, Typography, Tooltip,
  Flex, Select,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ReloadOutlined, SearchOutlined, FilterOutlined,
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

  // ── State dữ liệu ──────────────────────────────────────────────────────────
  const [campaigns,  setCampaigns]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  // ── State Filter ───────────────────────────────────────────────────────────
  const [searchText,  setSearchText]  = useState('');
  const [filterMonth, setFilterMonth] = useState(null); // 'MM/YYYY' | null

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
      title:       record.title,
      description: record.description,
      months:      record.months ?? [],
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
        title:       values.title.trim(),
        description: values.description?.trim() ?? '',
        months:      values.months, // Mảng 'MM/YYYY'
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
        title:   'Không thể xóa',
        content: err.message || 'Có lỗi xảy ra khi xóa khóa học.',
        okText:  'Đã hiểu',
      });
    }
  };

  // ── Cột bảng ──────────────────────────────────────────────────────────────
  const columns = [
    {
      title:     'Tiêu đề',
      dataIndex: 'title',
      key:       'title',
      ellipsis:  true,
      render:    (text) => <Text strong>{text}</Text>,
    },
    {
      title:     'Mô tả',
      dataIndex: 'description',
      key:       'description',
      ellipsis:  true,
      render:    (text) => text || <Text type="secondary">—</Text>,
    },
    {
      title:     'Các tháng học',
      dataIndex: 'months',
      key:       'months',
      render:    (months) =>
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
      title:  'Ngày tạo',
      dataIndex: 'createdAt',
      key:    'createdAt',
      width:  155,
      align:  'center',
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY HH:mm') : '—',
    },
    {
      title:  'Thao tác',
      key:    'actions',
      width:  100,
      align:  'center',
      fixed:  'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Chỉnh sửa">
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
            <Tooltip title="Xóa">
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
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Quản lý Khóa học</Title>
        <Space>
          <Tooltip title="Tải lại">
            <Button icon={<ReloadOutlined />} onClick={fetchCampaigns} loading={loading} />
          </Tooltip>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            id="btn-add-campaign"
          >
            Thêm Khóa học
          </Button>
        </Space>
      </Flex>

      {/* ── Toolbar: Search + Filter tháng ──────────────────────────────── */}
      <Flex
        gap={12} align="center" wrap="wrap"
        style={{
          marginBottom: 16, padding: '12px 16px',
          background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0',
        }}
      >
        <FilterOutlined style={{ color: '#888', fontSize: 15 }} />

        <Input.Search
          placeholder="Tìm theo tên khóa học..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          prefix={<SearchOutlined />}
          style={{ width: 260 }}
          id="search-campaign"
        />

        <Select
          placeholder="Lọc theo tháng"
          allowClear
          showSearch
          value={filterMonth}
          onChange={(val) => setFilterMonth(val ?? null)}
          options={MONTH_OPTIONS}
          style={{ width: 180 }}
          id="filter-campaign-month"
        />

        {hasActiveFilter && (
          <Flex align="center" gap={8}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Tìm thấy <Text strong>{filteredCampaigns.length}</Text> / {campaigns.length} kết quả
            </Text>
            <Button size="small" onClick={resetFilters}>Xóa bộ lọc</Button>
          </Flex>
        )}
      </Flex>

      {/* ── Bảng ────────────────────────────────────────────────────────── */}
      <Table
        rowKey="_id"
        dataSource={filteredCampaigns}
        columns={columns}
        loading={loading}
        pagination={{
          pageSize:        10,
          showTotal:       (total) => `${total} / ${campaigns.length} khóa học`,
          showSizeChanger: false,
        }}
        scroll={{ x: 750 }}
        size="middle"
        locale={{
          emptyText: hasActiveFilter
            ? 'Không tìm thấy kết quả phù hợp.'
            : 'Chưa có khóa học nào. Hãy thêm mới!',
        }}
      />

      {/* ── Modal Thêm / Sửa ────────────────────────────────────────────── */}
      <Modal
        title={
          <Space>
            {editTarget ? <EditOutlined /> : <PlusOutlined />}
            {editTarget ? 'Chỉnh sửa Khóa học' : 'Thêm Khóa học mới'}
          </Space>
        }
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSubmit}
        okText={editTarget ? 'Lưu thay đổi' : 'Tạo mới'}
        cancelText="Hủy"
        confirmLoading={submitting}
        destroyOnHidden
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }} requiredMark="optional">

          <Form.Item
            name="title"
            label="Tiêu đề khóa học"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề khóa học.' }]}
          >
            <Input
              placeholder="VD: Khoá Hè Q3 2026"
              maxLength={100} showCount
              id="input-campaign-title"
            />
          </Form.Item>

          <Form.Item name="description" label="Mô tả (tùy chọn)">
            <Input.TextArea
              rows={2}
              placeholder="Ghi chú thêm về khóa học..."
              maxLength={300} showCount
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
      </Modal>
    </>
  );
}
