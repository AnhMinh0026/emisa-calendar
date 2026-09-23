import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber,
  Select, Space, Tag, Popconfirm, App, Typography,
  Tooltip, Flex, Tabs, Empty, Badge, DatePicker, Divider, Switch,
  ConfigProvider,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ReloadOutlined, SearchOutlined, FilterOutlined,
  CalendarOutlined, TeamOutlined, EyeOutlined,
  UserAddOutlined, DollarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { Title, Text } = Typography;

// ── Cấu hình tag trạng thái ───────────────────────────────────────────────
const STATUS_CONFIG = {
  open: { color: 'success', label: 'Mở' },
  full: { color: 'error', label: 'Đầy' },
  closed: { color: 'default', label: 'Đóng' },
};

// Formatter VND — null/undefined/NaN safe
const fmtMoney = (val) => {
  const n = Number(val);
  if (val === null || val === undefined || isNaN(n)) return '—';
  if (n === 0) return '0đ';
  return `${n.toLocaleString('vi-VN')}đ`;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: groupSessions
// Nhóm mảng sessions thành cấu trúc phân cấp 2 tầng:
//   { [campaignId]: { campaign, months: { [MM/YYYY]: { label, sessions[] } } } }
// ─────────────────────────────────────────────────────────────────────────────
const groupSessions = (sessions, allCampaigns) => {
  const groups = {};

  sessions.forEach((session) => {
    const campaignObj = session.campaignId; // Đã populate
    if (!campaignObj?._id) return;

    const cId = campaignObj._id;
    const monthKey = session.campaignMonth ?? '??';

    if (!groups[cId]) {
      groups[cId] = {
        campaign: campaignObj,
        months: {},
        orderedMonths: campaignObj.months ?? [],
      };
    }

    if (!groups[cId].months[monthKey]) {
      groups[cId].months[monthKey] = {
        label: `Tháng ${monthKey}`,
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
// ─────────────────────────────────────────────────────────────────────────────
const buildDisabledDate = (campaignMonth) => {
  if (!campaignMonth) return () => true;
  const [mm, yyyy] = campaignMonth.split('/').map(Number);
  return (current) => {
    if (!current) return false;
    return current.month() + 1 !== mm || current.year() !== yyyy;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: DetailModal
//
// Modal quản lý danh sách học viên cho một ca học cụ thể.
//
// LUỒNG STATE AN TOÀN (tránh vỡ UI / Modal rỗng):
//   Sau mỗi thao tác thêm/xóa học viên, component GỌI CALLBACK onRefresh()
//   lên SessionPage. SessionPage sẽ:
//     1. fetchSessions() → lấy data mới nhất từ server
//     2. Tìm lại session hiện tại trong data mới
//     3. Cập nhật selectedSession state → Modal tự re-render với data đúng
//   KHÔNG tự mutate state sessions bằng tay.
// ─────────────────────────────────────────────────────────────────────────────
function DetailModal({ open, session, onClose, onRefresh }) {
  const { message, modal } = App.useApp();
  const [studentForm] = Form.useForm();
  const [booking, setBooking] = useState(false);
  const [removingId, setRemovingId] = useState(null); // studentId đang xóa

  // Reset form mỗi khi mở modal với session mới
  useEffect(() => {
    if (open) {
      studentForm.resetFields();
    }
  }, [open, session?._id, studentForm]);

  // ── Thêm học viên ────────────────────────────────────────────────────────
  const handleAddStudent = async () => {
    let values;
    try {
      values = await studentForm.validateFields();
    } catch {
      return;
    }

    setBooking(true);
    try {
      await api.post(`/sessions/${session._id}/book`, {
        name: values.name.trim(),
        phone: values.phone.trim(),
        depositAmount: values.depositAmount ?? 0,
        remainingAmount: values.remainingAmount ?? 0,
        isFullyPaid: values.isFullyPaid ?? false,
        paymentNote: values.paymentNote?.trim() ?? '',
      });

      message.success(`Đã thêm học viên "${values.name.trim()}" vào lớp.`);
      studentForm.resetFields();
      // Gọi lên cha để fetch lại và đồng bộ state
      await onRefresh();
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message;
      if (status === 409) {
        message.error('Lớp học đã đầy! Không thể thêm học viên.');
      } else {
        message.error(msg || 'Không thể thêm học viên. Vui lòng thử lại.');
      }
    } finally {
      setBooking(false);
    }
  };

  // ── Xóa học viên ────────────────────────────────────────────────────────
  const handleRemoveStudent = async (studentId) => {
    setRemovingId(studentId);
    try {
      await api.delete(`/sessions/${session._id}/students/${studentId}`);
      message.success('Đã xóa học viên khỏi lớp.');
      // Gọi lên cha để fetch lại và đồng bộ state
      await onRefresh();
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      message.error(msg || 'Không thể xóa học viên. Vui lòng thử lại.');
    } finally {
      setRemovingId(null);
    }
  };

  // ── Cột bảng học viên ─────────────────────────────────────────────────
  const studentColumns = [
    {
      title: 'STT',
      key: 'stt',
      width: 46,
      align: 'center',
      render: (_, __, idx) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{idx + 1}</Text>
      ),
    },
    {
      title: 'Họ tên',
      dataIndex: 'name',
      key: 'name',
      render: (val) => <Text strong>{val}</Text>,
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
      render: (val) => <Text code style={{ fontSize: 12 }}>{val}</Text>,
    },
    {
      title: 'Tiền cọc',
      dataIndex: 'depositAmount',
      key: 'depositAmount',
      width: 110,
      align: 'right',
      render: (val) => {
        const n = Number(val ?? 0);
        return (
          <Text style={{ color: '#1677ff', fontSize: 12 }}>
            {fmtMoney(n)}
          </Text>
        );
      },
    },
    {
      title: 'Còn nợ',
      dataIndex: 'remainingAmount',
      key: 'remainingAmount',
      width: 110,
      align: 'right',
      render: (val) => {
        const n = Number(val ?? 0);
        return (
          <Text style={{ color: n > 0 ? '#d46b08' : '#8c8c8c', fontSize: 12 }}>
            {fmtMoney(n)}
          </Text>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isFullyPaid',
      key: 'isFullyPaid',
      width: 110,
      align: 'center',
      render: (val) =>
        val ? (
          <Tag color="success" style={{ fontWeight: 600 }}>✓ Đã đóng xong</Tag>
        ) : (
          <Tag color="orange" style={{ fontWeight: 600 }}>⏳ Còn nợ</Tag>
        ),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'paymentNote',
      key: 'paymentNote',
      ellipsis: true,
      render: (val) =>
        val ? (
          <Text type="secondary" style={{ fontSize: 12 }}>{val}</Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
        ),
    },
    {
      title: 'Đăng ký',
      dataIndex: 'bookedAt',
      key: 'bookedAt',
      width: 110,
      render: (val) =>
        val ? (
          <Text type="secondary" style={{ fontSize: 11 }}>
            {dayjs(val).format('DD/MM/YY HH:mm')}
          </Text>
        ) : '—',
    },
    {
      title: '',
      key: 'actions',
      width: 52,
      align: 'center',
      render: (_, record) => (
        <Popconfirm
          title="Xóa học viên"
          description="Chắc chắn xóa học viên này?"
          onConfirm={() => handleRemoveStudent(record._id)}
          okText="Xóa"
          okButtonProps={{ danger: true }}
          cancelText="Hủy"
          placement="topRight"
          disabled={removingId === record._id}
        >
          <Tooltip title="Xóa học viên">
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              loading={removingId === record._id}
              id={`btn-remove-student-${record._id}`}
            />
          </Tooltip>
        </Popconfirm>
      ),
    },
  ];

  if (!session) return null;

  const students = session.students ?? [];
  const isFull = session.status !== 'open';
  const statusCfg = STATUS_CONFIG[session.status] ?? { color: 'default', label: session.status };

  return (
    <Modal
      title={
        <Flex align="center" gap={8}>
          <span>Chi tiết lớp học</span>
          <Text code style={{ fontSize: 14 }}>{session.classCode}</Text>
          <Tag color={statusCfg.color} style={{ marginLeft: 4 }}>{statusCfg.label}</Tag>
        </Flex>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={1400}
    >
      {/* ── Thông tin tóm tắt ──────────────────────────────────────────── */}
      <Flex
        gap={36}
        wrap="wrap"
        style={{
          background: '#f5f5f5',
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 20,
          fontSize: 26,
        }}
      >
        <Text>
          Sĩ số:{' '}
          <Text
            strong
            style={{ color: isFull ? '#cf1322' : '#389e0d' }}
          >
            {session.currentBooked}
          </Text>
          <Text type="secondary"> / {session.maxCapacity}</Text>
        </Text>

        <Text>
          Giờ học: {session.timeSlot}
        </Text>

        <Text>
          Ngày học: {formatDates(session.studyDates)}
        </Text>
      </Flex>

      {/* ── Phần 1: Form thêm học viên ─────────────────────────────────── */}
      <Title level={5} style={{ marginBottom: 12 }}>
        <UserAddOutlined style={{ marginRight: 6, color: '#1677ff' }} />
        Thêm học viên vào lớp
      </Title>

      {isFull ? (
        <div
          style={{
            background: '#fff1f0',
            border: '1px solid #ffa39e',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 20,
            color: '#cf1322',
            fontSize: 13,
          }}
        >
          🚫 Lớp học đã đầy hoặc đã đóng, không thể thêm học viên mới.
        </div>
      ) : (
        <Form
          form={studentForm}
          layout="vertical"
          style={{ marginBottom: 4 }}
          onFinish={handleAddStudent}
          initialValues={{ depositAmount: 0, remainingAmount: 0, isFullyPaid: false }}
        >
          {/* Hàng 1: Họ tên + SĐT + Tiền cọc + Còn nợ */}
          <Flex gap={12} wrap="wrap">
            <Form.Item
              name="name"
              label="Họ và tên"
              rules={[{ required: true, message: 'Nhập họ tên' }]}
              style={{ flex: '2 1 160px', marginBottom: 8 }}
            >
              <Input
                placeholder="Nguyễn Văn A"
                prefix={<UserAddOutlined style={{ color: '#bbb' }} />}
                id="input-student-name"
                autoComplete="off"
              />
            </Form.Item>

            <Form.Item
              name="phone"
              label="Số điện thoại"
              rules={[
                { required: true, message: 'Nhập SĐT' },
                { pattern: /^[0-9+\-\s]{8,15}$/, message: 'SĐT không hợp lệ' },
              ]}
              style={{ flex: '1 1 130px', marginBottom: 8 }}
            >
              <Input
                placeholder="0901234567"
                id="input-student-phone"
                autoComplete="off"
              />
            </Form.Item>

            <Form.Item
              name="depositAmount"
              label="Tiền cọc (đ)"
              style={{ flex: '1 1 120px', marginBottom: 8 }}
            >
              <InputNumber
                min={0}
                step={100000}
                formatter={(v) => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                parser={(v) => v?.replace(/,/g, '') || 0}
                style={{ width: '100%' }}
                placeholder="0"
                id="input-deposit"
                prefix={<DollarOutlined style={{ color: '#bbb' }} />}
              />
            </Form.Item>

            <Form.Item
              name="remainingAmount"
              label="Còn nợ (đ)"
              style={{ flex: '1 1 120px', marginBottom: 8 }}
            >
              <InputNumber
                min={0}
                step={100000}
                formatter={(v) => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                parser={(v) => v?.replace(/,/g, '') || 0}
                style={{ width: '100%' }}
                placeholder="0"
                id="input-remaining"
              />
            </Form.Item>
          </Flex>

          {/* Hàng 2: Ghi chú + Switch thanh toán + Submit */}
          <Flex gap={12} align="flex-end" wrap="wrap">
            <Form.Item
              name="paymentNote"
              label="Ghi chú thanh toán"
              style={{ flex: '3 1 200px', marginBottom: 8 }}
            >
              <Input
                placeholder="VD: Chờ chuyển khoản, Đã đóng tiền mặt..."
                id="input-payment-note"
                autoComplete="off"
              />
            </Form.Item>

            <Form.Item
              name="isFullyPaid"
              label="Đã đóng xong"
              valuePropName="checked"
              style={{ marginBottom: 8 }}
            >
              <Switch
                checkedChildren="✓"
                unCheckedChildren="✗"
                id="switch-fully-paid"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                icon={<PlusOutlined />}
                loading={booking}
                id="btn-add-student"
              >
                Thêm vào lớp
              </Button>
            </Form.Item>
          </Flex>
        </Form>
      )}

      {/* ── Phần 2: Danh sách học viên ─────────────────────────────────── */}
      <Divider style={{ margin: '8px 0 14px' }} />
      <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
        <Title level={5} style={{ margin: 0 }}>
          <TeamOutlined style={{ marginRight: 6, color: '#1677ff' }} />
          Danh sách lớp
        </Title>
        <Badge
          count={students.length}
          showZero
          style={{ backgroundColor: students.length > 0 ? '#1677ff' : '#d9d9d9' }}
        />
      </Flex>

      <Table
        rowKey="_id"
        dataSource={session?.students ?? []}
        columns={studentColumns}
        size="small"
        scroll={{ x: 820 }}
        pagination={
          students.length > 8
            ? { pageSize: 8, showTotal: (t) => `${t} học viên`, showSizeChanger: false }
            : false
        }
        locale={{
          emptyText: (
            <Empty
              description="Chưa có học viên nào đăng ký."
              imageStyle={{ height: 48 }}
            />
          ),
        }}
        style={{ borderRadius: 8, overflow: 'hidden' }}
      />
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SessionPage — Quản lý Lớp học
// ─────────────────────────────────────────────────────────────────────────────
export default function SessionPage() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();

  // ── State dữ liệu ──────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  // ── State Detail Modal ─────────────────────────────────────────────────────
  // selectedSession: session đang xem chi tiết (luôn lấy từ state sessions[])
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // ── State Form cascading ───────────────────────────────────────────────────
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  // ── State Filter ───────────────────────────────────────────────────────────
  const [searchCode, setSearchCode] = useState('');
  const [filterStatus, setFilterStatus] = useState(null);

  // ── Fetch sessions (Single Source of Truth) ────────────────────────────────
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

  // ── selectedSession: luôn lấy từ sessions state (không tự mutate) ─────────
  // Đây là điểm mấu chốt chống vỡ UI: khi sessions được fetch lại,
  // selectedSession tự động cập nhật vì được derive từ sessions[].
  const selectedSession = useMemo(
    () => sessions.find((s) => s._id === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  );

  // ── Callback cho DetailModal: fetch lại sessions sau khi thêm/xóa HV ──────
  // Sau khi fetch xong, selectedSession tự được cập nhật nhờ useMemo trên.
  const handleDetailRefresh = useCallback(async () => {
    await fetchSessions();
  }, [fetchSessions]);

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

  // ── Nhóm dữ liệu phân cấp ─────────────────────────────────────────────────
  const groupedData = useMemo(
    () => groupSessions(filteredSessions, campaigns),
    [filteredSessions, campaigns]
  );
  const campaignIds = useMemo(() => Object.keys(groupedData), [groupedData]);

  // ── Tháng của campaign trong Form ─────────────────────────────────────────
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
    const cm = record.campaignMonth;
    setSelectedCampaignId(cId);
    setSelectedMonth(cm);
    const dayjsDates = (record.studyDates ?? []).map((d) => dayjs(d));
    form.setFieldsValue({
      campaignId: cId,
      campaignMonth: cm,
      classCode: record.classCode,
      timeSlot: record.timeSlot,
      maxCapacity: record.maxCapacity,
      studyDates: dayjsDates,
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

    const rawDates = values.studyDates;
    if (!rawDates || rawDates.length === 0) {
      message.error('Vui lòng chọn ít nhất một ngày học.');
      return;
    }
    const isoStudyDates = rawDates.map((d) => d.toISOString());

    setSubmitting(true);
    try {
      const payload = {
        campaignId: values.campaignId,
        campaignMonth: values.campaignMonth,
        classCode: values.classCode.trim().toUpperCase(),
        timeSlot: values.timeSlot.trim(),
        maxCapacity: values.maxCapacity,
        studyDates: isoStudyDates,
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
        title: 'Không thể lưu lớp học',
        content: err.response?.data?.message || err.message || 'Đã xảy ra lỗi.',
        okText: 'Đã hiểu',
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
      message.error(err.response?.data?.message || err.message || 'Không thể xóa lớp học.');
    }
  };

  // ── Mở Detail Modal ────────────────────────────────────────────────────────
  const openDetail = (record) => {
    setSelectedSessionId(record._id);
  };

  const closeDetail = () => {
    setSelectedSessionId(null);
  };

  // ── Handler cascade ────────────────────────────────────────────────────────
  const onCampaignChange = (cId) => {
    setSelectedCampaignId(cId ?? null);
    setSelectedMonth(null);
    form.setFieldsValue({ campaignMonth: undefined, studyDates: [] });
  };

  const onMonthChange = (month) => {
    setSelectedMonth(month ?? null);
    form.setFieldsValue({ studyDates: [] });
  };

  // ── Cột bảng Session ──────────────────────────────────────────────────────
  const sessionColumns = [
    {
      title: 'Mã lớp',
      dataIndex: 'classCode',
      key: 'classCode',
      width: 100,
      render: (val) => <Text strong code>{val}</Text>,
    },
    {
      title: 'Khung giờ',
      dataIndex: 'timeSlot',
      key: 'timeSlot',
      width: 180,
      render: (val) => <Tag color="geekblue">{val}</Tag>,
    },
    {
      title: 'Ngày học',
      key: 'studyDates',
      width: 190,
      ellipsis: true,
      render: (_, record) => (
        <Tooltip
          title={record.studyDates?.map((d) => dayjs(d).format('DD/MM/YYYY')).join(' · ')}
        >
          <Text style={{ fontSize: 12 }}>{formatDates(record.studyDates)}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Sĩ số',
      key: 'capacity',
      width: 90,
      align: 'center',
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
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 95,
      align: 'center',
      render: (val) => {
        const cfg = STATUS_CONFIG[val] ?? { color: 'default', label: val };
        return <Tag color={cfg.color} style={{ fontWeight: 600 }}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Chi tiết học viên">
            <Button
              type="text"
              icon={<EyeOutlined />}
              style={{ color: '#1677ff' }}
              onClick={() => openDetail(record)}
              id={`btn-detail-${record._id}`}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
              id={`btn-edit-${record._id}`}
            />
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
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                id={`btn-delete-${record._id}`}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Build Tabs phân cấp Campaign → Tháng ──────────────────────────────────
  const campaignTabs = useMemo(() => {
    if (campaignIds.length === 0) return [];

    return campaignIds.map((cId) => {
      const { campaign, months, orderedMonths } = groupedData[cId];

      const sortedMonthKeys = [
        ...orderedMonths.filter((m) => months[m]),
        ...Object.keys(months).filter((m) => !orderedMonths.includes(m)),
      ];

      const monthTabs = sortedMonthKeys.map((mk) => {
        const { label, sessions: mSessions } = months[mk];
        return {
          key: mk,
          label: (
            <span>
              {/* <CalendarOutlined style={{ marginRight: 5 }} /> */}
              {label}
            </span>
          ),
          children: (
            <Table
              rowKey="_id"
              dataSource={mSessions}
              columns={sessionColumns}
              size="small"
              scroll={{ x: 750 }}
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

      return {
        key: cId,
        label: (
          <span>
            {/* <TeamOutlined style={{ marginRight: 6 }} /> */}
            {campaign.title}
          </span>
        ),
        children: (
          <div style={{ paddingTop: 4 }}>
            {monthTabs.length === 0 ? (
              <Empty description="Khóa học này chưa có lớp học nào." />
            ) : (
              <Tabs
                type="card"
                size="small"
                items={monthTabs}
                className="month-tabs"
                style={{ marginTop: 4 }}
              />
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
            { value: 'open', label: '🟢  Mở' },
            { value: 'full', label: '🔴  Đầy' },
            { value: 'closed', label: '⚫  Đóng' },
          ]}
        />
        {hasActiveFilter && (
          <Flex align="center" gap={8}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Đang lọc — <Text strong>{filteredSessions.length}</Text> lớp
            </Text>
            <Button
              size="small"
              onClick={() => { setSearchCode(''); setFilterStatus(null); }}
            >
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
        <ConfigProvider
          theme={{
            components: {
              Tabs: {
                itemSelectedColor: '#1677ff', // Màu chữ xanh khi active (cả 2 cấp Tab)
                itemHoverColor: '#69b1ff',    // Xanh nhạt khi hover
                inkBarColor: '#1677ff',       // Thanh underline Tab cấp 1
              },
            },
          }}
        >
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
        </ConfigProvider>
      )}

      {/* ── Modal Thêm / Sửa ─────────────────────────────────────────────── */}
      <Modal
        title={
          <Space>
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
              options={campaigns.map((c) => ({ value: c._id, label: c.title }))}
            />
          </Form.Item>

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

          <Form.Item
            name="studyDates"
            label="Ngày học"
            extra={
              !selectedMonth
                ? 'Chọn tháng trước để mở DatePicker.'
                : `Chỉ có thể chọn ngày trong tháng ${selectedMonth}.`
            }
            rules={[{
              required: true,
              type: 'array',
              min: 1,
              message: 'Vui lòng chọn ít nhất một ngày học.',
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

      {/* ── Modal Chi tiết học viên ──────────────────────────────────────── */}
      <DetailModal
        open={!!selectedSession}
        session={selectedSession}
        onClose={closeDetail}
        onRefresh={handleDetailRefresh}
      />
    </>
  );
}
