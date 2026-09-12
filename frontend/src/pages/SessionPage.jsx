import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber,
  Select, Space, Tag, Popconfirm, App, Typography,
  Tooltip, Flex, Tabs, Empty, Badge, DatePicker,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ReloadOutlined, SearchOutlined, FilterOutlined,
  CalendarOutlined, TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { Title, Text } = Typography;

// ── Cấu hình tag trạng thái ───────────────────────────────────────────────
const STATUS_CONFIG = {
  open:   { color: 'success', label: 'Mở'   },
  full:   { color: 'error',   label: 'Đầy'  },
  closed: { color: 'default', label: 'Đóng' },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: groupSessions
// Nhóm mảng sessions thành cấu trúc phân cấp 2 tầng:
//   { [campaignId]: { campaign, months: { [MM/YYYY]: { label, sessions[] } } } }
//
// Tầng 1: Khóa học (Campaign)
// Tầng 2: Tháng (dựa theo campaignMonth của session)
// ─────────────────────────────────────────────────────────────────────────────
const groupSessions = (sessions, allCampaigns) => {
  // Tạo map campaignId → campaign để tra cứu nhanh
  const campaignMap = Object.fromEntries(allCampaigns.map((c) => [c._id, c]));

  const groups = {};

  sessions.forEach((session) => {
    const campaignObj = session.campaignId; // Đã populate
    if (!campaignObj?._id) return;

    const cId = campaignObj._id;
    const monthKey = session.campaignMonth ?? '??';

    if (!groups[cId]) {
      groups[cId] = {
        campaign: campaignObj,
        months:   {},
        // Dùng months[] của campaign để đảm bảo Tab thứ tự đúng
        orderedMonths: campaignObj.months ?? [],
      };
    }

    if (!groups[cId].months[monthKey]) {
      groups[cId].months[monthKey] = {
        label:    `Tháng ${monthKey}`,
        sessions: [],
      };
    }

    groups[cId].months[monthKey].sessions.push(session);
  });

  return groups;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: formatDates — Hiển thị mảng ngày rút gọn
// ─────────────────────────────────────────────────────────────────────────────
const formatDates = (dates) => {
  if (!dates?.length) return '—';
  return dates.map((d) => dayjs(d).format('DD/MM')).join(', ');
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: disabledDate — Chặn những ngày không thuộc campaignMonth đã chọn
// campaignMonth: 'MM/YYYY'
// ─────────────────────────────────────────────────────────────────────────────
const buildDisabledDate = (campaignMonth) => {
  if (!campaignMonth) return () => true; // Disable tất cả nếu chưa chọn tháng
  const [mm, yyyy] = campaignMonth.split('/').map(Number);
  return (current) => {
    if (!current) return false;
    return current.month() + 1 !== mm || current.year() !== yyyy;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SessionPage — Quản lý Lớp học
// Giao diện phân cấp: Khóa học → Tháng → Bảng Lớp học
// Form cascading: Khóa học → Tháng → Ngày học (DatePicker multiple + disabledDate)
// ─────────────────────────────────────────────────────────────────────────────
export default function SessionPage() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();

  // ── State dữ liệu ──────────────────────────────────────────────────────────
  const [sessions,   setSessions]   = useState([]);
  const [campaigns,  setCampaigns]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  // ── State Form cascading ──────────────────────────────────────────────────
  // selectedCampaignId và selectedMonth dùng để điều khiển Select phụ thuộc
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [selectedMonth,      setSelectedMonth]      = useState(null);

  // ── State Filter ───────────────────────────────────────────────────────────
  const [searchCode,   setSearchCode]   = useState('');
  const [filterStatus, setFilterStatus] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/sessions');
      setSessions(data.data ?? []);
    } catch (err) {
      message.error(err.message || 'Không thể tải danh sách lớp học.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  const fetchCampaigns = useCallback(async () => {
    try {
      const { data } = await api.get('/campaigns');
      setCampaigns(data.data ?? []);
    } catch { /* dữ liệu phụ */ }
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchCampaigns();
  }, [fetchSessions, fetchCampaigns]);

  // ── Filter cục bộ ─────────────────────────────────────────────────────────
  const filteredSessions = useMemo(() => {
    let result = sessions;
    if (searchCode.trim()) {
      const kw = searchCode.trim().toLowerCase();
      result = result.filter((s) => s.classCode?.toLowerCase().includes(kw));
    }
    if (filterStatus) {
      result = result.filter((s) => s.status === filterStatus);
    }
    return result;
  }, [sessions, searchCode, filterStatus]);

  // ── Nhóm dữ liệu phân cấp (Campaign → Tháng) ─────────────────────────────
  const groupedData = useMemo(
    () => groupSessions(filteredSessions, campaigns),
    [filteredSessions, campaigns]
  );
  const campaignIds = useMemo(() => Object.keys(groupedData), [groupedData]);

  // ── Các tháng của campaign đang chọn trong Form ───────────────────────────
  const monthOptionsForForm = useMemo(() => {
    if (!selectedCampaignId) return [];
    const camp = campaigns.find((c) => c._id === selectedCampaignId);
    return (camp?.months ?? []).map((m) => ({ value: m, label: `Tháng ${m}` }));
  }, [selectedCampaignId, campaigns]);

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setSelectedCampaignId(null);
    setSelectedMonth(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditTarget(record);
    const cId = record.campaignId?._id ?? record.campaignId;
    const cm   = record.campaignMonth;
    setSelectedCampaignId(cId);
    setSelectedMonth(cm);

    // studyDates → mảng dayjs để DatePicker multiple
    const dayjsDates = (record.studyDates ?? []).map((d) => dayjs(d));

    form.setFieldsValue({
      campaignId:    cId,
      campaignMonth: cm,
      classCode:     record.classCode,
      timeSlot:      record.timeSlot,
      maxCapacity:   record.maxCapacity,
      studyDates:    dayjsDates,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    setSelectedCampaignId(null);
    setSelectedMonth(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }

    // Chuyển mảng dayjs → ISO string
    const rawDates = values.studyDates;
    if (!rawDates || rawDates.length === 0) {
      message.error('Vui lòng chọn ít nhất một ngày học.');
      return;
    }
    const isoStudyDates = rawDates.map((d) => d.toISOString());

    setSubmitting(true);
    try {
      const payload = {
        campaignId:    values.campaignId,
        campaignMonth: values.campaignMonth,
        classCode:     values.classCode.trim().toUpperCase(),
        timeSlot:      values.timeSlot.trim(),
        maxCapacity:   values.maxCapacity,
        studyDates:    isoStudyDates,
      };

      if (editTarget) {
        await api.put(`/sessions/${editTarget._id}`, payload);
        message.success(`Đã cập nhật lớp học "${payload.classCode}".`);
      } else {
        await api.post('/sessions', payload);
        message.success(`Đã tạo lớp học "${payload.classCode}".`);
      }

      closeModal();
      fetchSessions();
    } catch (err) {
      modal.error({
        title:   'Không thể lưu lớp học',
        content: err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.',
        okText:  'Đã hiểu',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await api.delete(`/sessions/${record._id}`);
      message.success(`Đã xóa lớp học "${record.classCode}".`);
      fetchSessions();
    } catch (err) {
      message.error(err.message || 'Không thể xóa lớp học.');
    }
  };

  // ── Handler cascade: Khi đổi Campaign → reset Month + studyDates ──────────
  const onCampaignChange = (cId) => {
    setSelectedCampaignId(cId ?? null);
    setSelectedMonth(null);
    form.setFieldsValue({ campaignMonth: undefined, studyDates: [] });
  };

  // ── Handler cascade: Khi đổi Month → reset studyDates ────────────────────
  const onMonthChange = (month) => {
    setSelectedMonth(month ?? null);
    form.setFieldsValue({ studyDates: [] });
  };

  // ── Cột bảng Session ──────────────────────────────────────────────────────
  const sessionColumns = [
    {
      title:  'Mã lớp',
      dataIndex: 'classCode',
      key:    'classCode',
      width:  100,
      render: (val) => <Text strong code>{val}</Text>,
    },
    {
      title:  'Khung giờ',
      dataIndex: 'timeSlot',
      key:    'timeSlot',
      width:  145,
      render: (val) => <Tag color="geekblue">{val}</Tag>,
    },
    {
      title:   'Ngày học',
      key:     'studyDates',
      ellipsis: true,
      render:  (_, record) => (
        <Tooltip
          title={record.studyDates?.map((d) => dayjs(d).format('DD/MM/YYYY')).join(' · ')}
        >
          <Text style={{ fontSize: 12 }}>{formatDates(record.studyDates)}</Text>
        </Tooltip>
      ),
    },
    {
      title:  'Sĩ số',
      key:    'capacity',
      width:  100,
      align:  'center',
      render: (_, record) => (
        <Text>
          <Text
            strong
            style={{ color: record.currentBooked >= record.maxCapacity ? '#cf1322' : '#389e0d' }}
          >
            {record.currentBooked}
          </Text>
          <Text type="secondary"> / {record.maxCapacity}</Text>
        </Text>
      ),
    },
    {
      title:  'Trạng thái',
      dataIndex: 'status',
      key:    'status',
      width:  100,
      align:  'center',
      render: (val) => {
        const cfg = STATUS_CONFIG[val] ?? { color: 'default', label: val };
        return <Tag color={cfg.color} style={{ fontWeight: 600 }}>{cfg.label}</Tag>;
      },
    },
    {
      title:  'Thao tác',
      key:    'actions',
      width:  90,
      align:  'center',
      fixed:  'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Chỉnh sửa">
            <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Xác nhận xóa"
            description={`Xóa lớp học "${record.classCode}"?`}
            onConfirm={() => handleDelete(record)}
            okText="Xóa"
            okButtonProps={{ danger: true }}
            cancelText="Hủy"
            placement="topLeft"
          >
            <Tooltip title="Xóa">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Build cấu trúc Tabs phân cấp ──────────────────────────────────────────
  const campaignTabs = useMemo(() => {
    if (campaignIds.length === 0) return [];

    return campaignIds.map((cId) => {
      const { campaign, months, orderedMonths } = groupedData[cId];

      // Sắp xếp tháng theo thứ tự orderedMonths của Campaign
      const sortedMonthKeys = [
        ...orderedMonths.filter((m) => months[m]),  // Tháng có dữ liệu, giữ đúng thứ tự
        ...Object.keys(months).filter((m) => !orderedMonths.includes(m)), // Tháng orphan
      ];

      const totalSessions = Object.values(months).reduce(
        (sum, m) => sum + m.sessions.length, 0
      );

      const monthTabs = sortedMonthKeys.map((mk) => {
        const { label, sessions: mSessions } = months[mk];
        return {
          key:   mk,
          label: (
            <span>
              <CalendarOutlined style={{ marginRight: 5 }} />
              {label}
              <Badge
                count={mSessions.length}
                size="small"
                style={{ marginLeft: 6, backgroundColor: '#1D1D1F' }}
              />
            </span>
          ),
          children: (
            <Table
              rowKey="_id"
              dataSource={mSessions}
              columns={sessionColumns}
              size="small"
              scroll={{ x: 700 }}
              pagination={
                mSessions.length > 8
                  ? { pageSize: 8, showTotal: (t) => `${t} lớp`, showSizeChanger: false }
                  : false
              }
              locale={{ emptyText: 'Tháng này chưa có lớp học.' }}
            />
          ),
        };
      });

      const tabLabel = (
        <span>
          <TeamOutlined style={{ marginRight: 6 }} />
          {campaign.title}
          <Badge
            count={totalSessions}
            size="small"
            style={{ marginLeft: 6, backgroundColor: '#595959' }}
          />
        </span>
      );

      return {
        key:   cId,
        label: tabLabel,
        children: (
          <div style={{ paddingTop: 4 }}>
            {monthTabs.length === 0 ? (
              <Empty description="Khóa học này chưa có lớp học nào." />
            ) : (
              <Tabs type="card" size="small" items={monthTabs} style={{ marginTop: 4 }} />
            )}
          </div>
        ),
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedData, campaignIds]);

  const hasActiveFilter = searchCode.trim() || filterStatus;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Quản lý Lớp học</Title>
        <Space>
          <Tooltip title="Tải lại">
            <Button icon={<ReloadOutlined />} onClick={fetchSessions} loading={loading} />
          </Tooltip>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            id="btn-add-session"
          >
            Thêm Lớp học
          </Button>
        </Space>
      </Flex>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <Flex
        gap={12} align="center" wrap="wrap"
        style={{
          marginBottom: 16, padding: '12px 16px',
          background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0',
        }}
      >
        <FilterOutlined style={{ color: '#888', fontSize: 15 }} />

        <Input.Search
          placeholder="Tìm theo mã lớp..."
          allowClear
          value={searchCode}
          onChange={(e) => setSearchCode(e.target.value)}
          prefix={<SearchOutlined />}
          style={{ width: 220 }}
          id="search-session-code"
        />

        <Select
          placeholder="Lọc trạng thái"
          allowClear
          value={filterStatus}
          onChange={(val) => setFilterStatus(val ?? null)}
          style={{ width: 150 }}
          id="filter-session-status"
          options={[
            { value: 'open',   label: '🟢  Mở'  },
            { value: 'full',   label: '🔴  Đầy' },
            { value: 'closed', label: '⚫  Đóng' },
          ]}
        />

        {hasActiveFilter && (
          <Flex align="center" gap={8}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Đang lọc — <Text strong>{filteredSessions.length}</Text> lớp
            </Text>
            <Button size="small" onClick={() => { setSearchCode(''); setFilterStatus(null); }}>
              Xóa bộ lọc
            </Button>
          </Flex>
        )}
      </Flex>

      {/* ── Tabs phân cấp ────────────────────────────────────────────────── */}
      {loading ? (
        <Table loading={loading} dataSource={[]} columns={sessionColumns} />
      ) : campaignTabs.length === 0 ? (
        <Empty
          description={
            hasActiveFilter
              ? 'Không tìm thấy lớp học nào phù hợp với bộ lọc.'
              : 'Chưa có lớp học nào. Hãy thêm mới!'
          }
          style={{ padding: '48px 0' }}
        />
      ) : (
        <Tabs
          type="line"
          items={campaignTabs}
          tabBarStyle={{ marginBottom: 0 }}
          style={{
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #f0f0f0',
            padding: '0 16px 16px',
          }}
        />
      )}

      {/* ── Modal Thêm / Sửa (Cascading Form) ──────────────────────────── */}
      <Modal
        title={
          <Space>
            {editTarget ? <EditOutlined /> : <PlusOutlined />}
            {editTarget ? `Sửa lớp học ${editTarget.classCode}` : 'Thêm Lớp học mới'}
          </Space>
        }
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSubmit}
        okText={editTarget ? 'Lưu thay đổi' : 'Tạo mới'}
        cancelText="Hủy"
        confirmLoading={submitting}
        destroyOnHidden
        width={540}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }} requiredMark="optional">

          {/* ── Trường 1: Chọn Khóa học ──────────────────────────────── */}
          <Form.Item
            name="campaignId"
            label="Khóa học"
            rules={[{ required: true, message: 'Vui lòng chọn khóa học.' }]}
          >
            <Select
              placeholder="Chọn khóa học..."
              showSearch
              optionFilterProp="label"
              onChange={onCampaignChange}
              allowClear
              id="select-campaign"
              options={campaigns.map((c) => ({
                value: c._id,
                label: c.title,
              }))}
            />
          </Form.Item>

          {/* ── Trường 2: Chọn Tháng (phụ thuộc Khóa học đã chọn) ────── */}
          <Form.Item
            name="campaignMonth"
            label="Tháng học"
            rules={[{ required: true, message: 'Vui lòng chọn tháng.' }]}
            extra={!selectedCampaignId ? 'Chọn khóa học trước để xem các tháng có sẵn.' : undefined}
          >
            <Select
              placeholder={selectedCampaignId ? 'Chọn tháng...' : '— Chọn khóa học trước —'}
              disabled={!selectedCampaignId}
              options={monthOptionsForForm}
              onChange={onMonthChange}
              allowClear
              id="select-campaign-month"
            />
          </Form.Item>

          <Flex gap={12}>
            {/* Mã lớp */}
            <Form.Item
              name="classCode"
              label="Mã lớp"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Nhập mã lớp.' }]}
            >
              <Input
                placeholder="VD: K02"
                maxLength={20}
                style={{ textTransform: 'uppercase' }}
                id="input-class-code"
              />
            </Form.Item>

            {/* Sĩ số */}
            <Form.Item
              name="maxCapacity"
              label="Sĩ số tối đa"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Nhập sĩ số.' }]}
            >
              <InputNumber
                min={1} max={999}
                style={{ width: '100%' }}
                placeholder="VD: 15"
                id="input-max-capacity"
              />
            </Form.Item>
          </Flex>

          {/* Khung giờ */}
          <Form.Item
            name="timeSlot"
            label="Khung giờ học"
            rules={[
              { required: true, message: 'Nhập khung giờ.' },
              {
                pattern: /^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/,
                message: "Định dạng: 'HH:mm - HH:mm' (VD: 18:00 - 20:00)",
              },
            ]}
          >
            <Input
              placeholder="VD: 18:00 - 20:00"
              maxLength={15}
              id="input-time-slot"
            />
          </Form.Item>

          {/* ── Trường 3: Chọn Ngày học (DatePicker multiple + disabledDate) ── */}
          <Form.Item
            name="studyDates"
            label="Ngày học"
            extra={
              !selectedMonth
                ? 'Chọn tháng trước để mở DatePicker.'
                : `Chỉ có thể chọn ngày trong tháng ${selectedMonth}.`
            }
            rules={[{
              required:  true,
              type:      'array',
              min:       1,
              message:   'Vui lòng chọn ít nhất một ngày học.',
            }]}
          >
            <DatePicker
              multiple
              format="DD/MM/YYYY"
              disabled={!selectedMonth}
              disabledDate={buildDisabledDate(selectedMonth)}
              placeholder="Chọn các ngày học..."
              style={{ width: '100%' }}
              id="input-study-dates"
              allowClear
            />
          </Form.Item>

        </Form>
      </Modal>
    </>
  );
}
