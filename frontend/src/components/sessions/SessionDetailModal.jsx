import { useState, useMemo, useCallback } from 'react';
import {
  Table, Button, Form, Input, InputNumber, Tag, Popconfirm, App,
  Typography, Tooltip, Flex, Empty, Divider, Switch, List, Grid,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, TeamOutlined,
  UserAddOutlined, DollarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';
import { fmtMoney, formatDates, moneyFormatter, moneyParser } from '../../utils/formatters';
import ResponsiveModal from '../common/ResponsiveModal';
import { ClassCodeTag, SessionStatusTag, PaymentStatusTag } from '../common/StatusTags';

const { Title, Text } = Typography;

/**
 * Modal / Drawer quản lý danh sách học viên của một lớp học cụ thể.
 * Tối ưu: Nhận trực tiếp updatedSession từ response API sau khi thêm/xóa học viên
 * để cập nhật tức thì vào state của trang cha mà không cần tải lại toàn bộ danh sách lớp.
 */
export default function SessionDetailModal({
  open,
  session,
  onClose,
  onSessionUpdated,
}) {
  const { message } = App.useApp();
  const [studentForm] = Form.useForm();
  const [booking, setBooking] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const screens = Grid.useBreakpoint();

  // Tự động gán Còn nợ = 0 và cộng dồn vào Tiền cọc khi bật "Đã đóng xong"
  const handleValuesChange = (changedValues, allValues) => {
    if ('isFullyPaid' in changedValues && changedValues.isFullyPaid === true) {
      const currentDeposit = Number(allValues.depositAmount || 0);
      const currentRemaining = Number(allValues.remainingAmount || 0);
      studentForm.setFieldsValue({
        depositAmount: currentDeposit + currentRemaining,
        remainingAmount: 0,
      });
    }
  };

  // ── Thêm học viên ────────────────────────────────────────────────────────
  const handleAddStudent = async () => {
    if (!session) return;
    let values;
    try {
      values = await studentForm.validateFields();
    } catch {
      return;
    }

    setBooking(true);
    try {
      const { data } = await api.post(`/sessions/${session._id}/book`, {
        name: values.name.trim(),
        phone: values.phone.trim(),
        depositAmount: values.depositAmount ?? 0,
        remainingAmount: values.remainingAmount ?? 0,
        isFullyPaid: values.isFullyPaid ?? false,
        paymentNote: values.paymentNote?.trim() ?? '',
      });

      message.success(`Đã thêm học viên "${values.name.trim()}" vào lớp.`);
      studentForm.resetFields();
      onSessionUpdated(data?.data);
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
  const handleRemoveStudent = useCallback(
    async (studentId) => {
      if (!session) return;
      setRemovingId(studentId);
      try {
        const { data } = await api.delete(`/sessions/${session._id}/students/${studentId}`);
        message.success('Đã xóa học viên khỏi lớp.');
        onSessionUpdated(data?.data);
      } catch (err) {
        const msg = err.response?.data?.message || err.message;
        message.error(msg || 'Không thể xóa học viên. Vui lòng thử lại.');
      } finally {
        setRemovingId(null);
      }
    },
    [session, message, onSessionUpdated]
  );

  const studentColumns = useMemo(
    () => [
      {
        title: 'STT',
        key: 'stt',
        width: 46,
        align: 'center',
        render: (_, __, idx) => (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {idx + 1}
          </Text>
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
        render: (val) => (
          <Text code style={{ fontSize: 12 }}>
            {val}
          </Text>
        ),
      },
      {
        title: 'Tiền cọc',
        dataIndex: 'depositAmount',
        key: 'depositAmount',
        width: 110,
        align: 'right',
        render: (val) => (
          <Text style={{ color: '#1677ff', fontSize: 12 }}>{fmtMoney(val ?? 0, '—')}</Text>
        ),
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
              {fmtMoney(n, '—')}
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
        render: (val) => <PaymentStatusTag isFullyPaid={val} />,
      },
      {
        title: 'Ghi chú',
        dataIndex: 'paymentNote',
        key: 'paymentNote',
        ellipsis: true,
        render: (val) => (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {val || '—'}
          </Text>
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
          ) : (
            '—'
          ),
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
    ],
    [removingId, handleRemoveStudent]
  );

  if (!open || !session) return null;

  const students = session.students ?? [];
  const isFull = session.status !== 'open';

  const detailTitle = (
    <Flex align="center" gap={8} wrap="wrap">
      <span>Chi tiết lớp học</span>
      <ClassCodeTag code={session.classCode} fontSize={13} />
      <SessionStatusTag status={session.status} style={{ marginLeft: 4 }} />
    </Flex>
  );

  const mobileFooter = (
    <div
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 20px)',
        display: 'flex',
        gap: 8,
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Button onClick={onClose} style={{ flex: 1 }}>
        Hủy
      </Button>
      {!isFull && (
        <Button
          type="primary"
          onClick={handleAddStudent}
          loading={booking}
          icon={<PlusOutlined />}
          style={{ flex: 2 }}
          id="drawer-btn-add-student"
        >
          Thêm vào lớp
        </Button>
      )}
    </div>
  );

  return (
    <ResponsiveModal
      title={detailTitle}
      open={open}
      onClose={onClose}
      width={1400}
      footer={screens.md ? null : mobileFooter}
    >
      {/* ── Thông tin tóm tắt ──────────────────────────────────────────── */}
      <Flex
        gap={16}
        wrap="wrap"
        style={{
          background: '#f5f5f5',
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 20,
          fontSize: 14,
        }}
      >
        <Text>
          Sĩ số:{' '}
          <Text strong style={{ color: isFull ? '#cf1322' : '#389e0d' }}>
            {session.currentBooked}
          </Text>
          <Text type="secondary"> / {session.maxCapacity}</Text>
        </Text>
        <Text>Giờ học: {session.timeSlot}</Text>
        <Text>Ngày học: {formatDates(session.studyDates)}</Text>
      </Flex>

      {/* ── Phần 1: Form thêm học viên ─────────────────────────────────── */}
      <Title level={5} style={{ marginBottom: 12 }}>
        <UserAddOutlined style={{ marginRight: 6, color: '#1677ff' }} />
        Thêm học viên vào lớp
      </Title>

      {isFull && (
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
          🚫 Lớp học đã đầy, xóa học viên cũ để thêm học viên mới.
        </div>
      )}

      <Form
        key={session._id}
        form={studentForm}
        layout="vertical"
        style={{ marginBottom: 4, display: isFull ? 'none' : 'block' }}
        onFinish={handleAddStudent}
        onValuesChange={handleValuesChange}
        initialValues={{ depositAmount: 0, remainingAmount: 0, isFullyPaid: false }}
      >
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
              formatter={moneyFormatter}
              parser={moneyParser}
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
              formatter={moneyFormatter}
              parser={moneyParser}
              style={{ width: '100%' }}
              placeholder="0"
              id="input-remaining"
            />
          </Form.Item>
        </Flex>

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

          {screens.md && (
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
          )}
        </Flex>
      </Form>

      {/* ── Phần 2: Danh sách học viên ─────────────────────────────────── */}
      <Divider style={{ margin: '8px 0 14px' }} />
      <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
        <Title level={5} style={{ margin: 0 }}>
          <TeamOutlined style={{ marginRight: 6, color: '#1677ff' }} />
          Danh sách lớp
        </Title>
      </Flex>

      {screens.md ? (
        <Table
          rowKey="_id"
          dataSource={students}
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
                styles={{ image: { height: 48 } }}
              />
            ),
          }}
          style={{ borderRadius: 8, overflow: 'hidden' }}
        />
      ) : (
        <List
          split={false}
          dataSource={students}
          locale={{
            emptyText: (
              <Empty
                description="Chưa có học viên nào đăng ký."
                styles={{ image: { height: 48 } }}
                style={{ padding: '24px 0' }}
              />
            ),
          }}
          pagination={
            students.length > 8
              ? { pageSize: 8, size: 'small', align: 'center' }
              : false
          }
          renderItem={(student, index) => (
            <div
              key={student._id || index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: '#8c8c8c', fontSize: 12 }}>#{index + 1}</Text>
                  <Text strong style={{ fontSize: 14 }}>
                    {student.name}
                  </Text>
                </div>
                <div style={{ marginTop: 4 }}>
                  <Tag
                    style={{
                      margin: 0,
                      fontSize: 11,
                      background: '#fafafa',
                      border: '1px solid #e8e8e8',
                    }}
                  >
                    {student.phone}
                  </Tag>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                  }}
                >
                  <Tag color="blue" style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>
                    Cọc: {fmtMoney(student.depositAmount ?? 0)}
                  </Tag>
                  {student.isFullyPaid ? (
                    <Tag color="success" style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>
                      ✓ Xong
                    </Tag>
                  ) : (
                    <Tag color="error" style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>
                      Nợ: {fmtMoney(student.remainingAmount ?? 0)}
                    </Tag>
                  )}
                </div>
                <Popconfirm
                  title="Xóa học viên"
                  description="Chắc chắn xóa học viên này?"
                  onConfirm={() => handleRemoveStudent(student._id)}
                  okText="Xóa"
                  okButtonProps={{ danger: true }}
                  cancelText="Hủy"
                  placement="topRight"
                  disabled={removingId === student._id}
                >
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    loading={removingId === student._id}
                    id={`btn-remove-student-${student._id}`}
                  />
                </Popconfirm>
              </div>
            </div>
          )}
        />
      )}
    </ResponsiveModal>
  );
}
