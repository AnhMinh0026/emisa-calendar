import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Table, Button, Modal, Drawer, Form, Input, InputNumber,
  Select, Space, Tag, Popconfirm, App, Typography,
  Tooltip, Flex, Empty, Switch, Row, Col, Grid, Card,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ReloadOutlined, FilterOutlined, UserOutlined,
  DollarOutlined, TeamOutlined, PhoneOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { Title, Text } = Typography;

// Helper: Formatter tiền VND
const fmtMoney = (val) => {
  const n = Number(val);
  if (val === null || val === undefined || isNaN(n)) return '0đ';
  if (n === 0) return '0đ';
  return `${n.toLocaleString('vi-VN')}đ`;
};

export default function StudentPage() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();

  // ── State dữ liệu ──────────────────────────────────────────────────────────
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  // ── State Bộ lọc ───────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [filterPaid, setFilterPaid] = useState(null); // true | false | null
  const [filterSession, setFilterSession] = useState(null); // sessionId | null
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ── Fetch dữ liệu học viên & danh sách lớp ──────────────────────────────────
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/students');
      setStudents(data.data ?? []);
    } catch (err) {
      message.error(err.response?.data?.message || err.message || 'Không thể tải danh sách học viên.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  const fetchSessions = useCallback(async () => {
    try {
      const { data } = await api.get('/sessions');
      setSessions(data.data ?? []);
    } catch {
      /* dữ liệu phụ trợ */
    }
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchSessions();
  }, [fetchStudents, fetchSessions]);

  // ── Lọc danh sách học viên (Local Filter tức thì) ───────────────────────────
  const filteredStudents = useMemo(() => {
    let result = students;

    if (searchText.trim()) {
      const kw = searchText.trim().toLowerCase();
      result = result.filter((st) =>
        st.name?.toLowerCase().includes(kw) ||
        st.phone?.toLowerCase().includes(kw) ||
        st.classCode?.toLowerCase().includes(kw) ||
        st.campaignTitle?.toLowerCase().includes(kw) ||
        st.paymentNote?.toLowerCase().includes(kw)
      );
    }

    if (filterPaid !== null) {
      result = result.filter((st) => Boolean(st.isFullyPaid) === filterPaid);
    }

    if (filterSession) {
      result = result.filter((st) => st.sessionId === filterSession);
    }

    return result;
  }, [students, searchText, filterPaid, filterSession]);

  const hasActiveFilter = searchText.trim() || filterPaid !== null || filterSession !== null;
  const resetFilters = () => {
    setSearchText('');
    setFilterPaid(null);
    setFilterSession(null);
  };

  // ── Xử lý Form Thêm / Sửa ──────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    form.resetFields();
    form.setFieldsValue({
      depositAmount: 0,
      remainingAmount: 0,
      isFullyPaid: false,
    });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditTarget(record);
    form.setFieldsValue({
      name: record.name,
      phone: record.phone,
      sessionId: record.sessionId,
      depositAmount: record.depositAmount ?? 0,
      remainingAmount: record.remainingAmount ?? 0,
      isFullyPaid: Boolean(record.isFullyPaid),
      paymentNote: record.paymentNote ?? '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    form.resetFields();
  };

  /**
   * LOGIC TỰ ĐỘNG TÍNH TOÁN THEO YÊU CẦU:
   * Khi bật 'Đã đóng xong' = true:
   *   - Tự động gán trường Còn nợ = 0
   *   - Cộng dồn số tiền nợ (nếu có) vào trường Tiền cọc (tổng tiền đã thu)
   * Khi 'Đã đóng xong' = false:
   *   - Cho phép Admin nhập tay hoặc sửa lại cả trường Tiền cọc và Còn nợ tự do.
   */
  const handleValuesChange = (changedValues, allValues) => {
    if ('isFullyPaid' in changedValues) {
      if (changedValues.isFullyPaid === true) {
        const currentDeposit = Number(allValues.depositAmount || 0);
        const currentRemaining = Number(allValues.remainingAmount || 0);
        const totalCollected = currentDeposit + currentRemaining;

        form.setFieldsValue({
          depositAmount: totalCollected,
          remainingAmount: 0,
        });
      }
    }
  };

  const handleSubmit = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: values.name.trim(),
        phone: values.phone.trim(),
        sessionId: values.sessionId,
        depositAmount: Number(values.depositAmount) || 0,
        remainingAmount: Number(values.remainingAmount) || 0,
        isFullyPaid: Boolean(values.isFullyPaid),
        paymentNote: values.paymentNote?.trim() ?? '',
      };

      if (editTarget) {
        await api.put(`/students/${editTarget._id}`, payload);
        message.success(`Đã cập nhật học viên "${payload.name}".`);
      } else {
        await api.post('/students', payload);
        message.success(`Đã thêm học viên "${payload.name}".`);
      }

      closeModal();
      fetchStudents();
    } catch (err) {
      modal.error({
        title: 'Không thể lưu học viên',
        content: err.response?.data?.message || err.message || 'Đã xảy ra lỗi.',
        okText: 'Đã hiểu',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await api.delete(`/students/${record._id}`);
      message.success(`Đã xóa học viên "${record.name}".`);
      fetchStudents();
    } catch (err) {
      message.error(err.response?.data?.message || err.message || 'Không thể xóa học viên.');
    }
  };

  // ── Cột bảng cho Desktop / Tablet ──────────────────────────────────────────
  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 50,
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
      width: 250,
      render: (val) => <Text strong style={{ fontSize: 13 }}>{val}</Text>,
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      width: 125,
      render: (val) => <Text code style={{ fontSize: 12 }}>{val}</Text>,
    },
    {
      title: 'Lớp đang học',
      key: 'classCode',
      width: 160,
      render: (_, record) => (
        <div>
          <Tag
            style={{
              backgroundColor: '#F3E8FF',
              color: '#7E22CE',
              border: 'none',
              fontWeight: 600,
              fontSize: 12,
              borderRadius: 6,
            }}
          >
            {record.classCode}
          </Tag>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
            {record.campaignTitle}
          </div>
        </div>
      ),
    },
    {
      title: 'Đã cọc',
      dataIndex: 'depositAmount',
      key: 'depositAmount',
      width: 120,
      align: 'right',
      render: (val) => (
        <Text style={{ color: '#1677ff', fontWeight: 600, fontSize: 12 }}>
          {fmtMoney(val)}
        </Text>
      ),
    },
    {
      title: 'Còn nợ',
      dataIndex: 'remainingAmount',
      key: 'remainingAmount',
      width: 120,
      align: 'right',
      render: (val) => {
        const n = Number(val ?? 0);
        return (
          <Text style={{ color: n > 0 ? '#cf1322' : '#8c8c8c', fontWeight: n > 0 ? 600 : 400, fontSize: 12 }}>
            {fmtMoney(n)}
          </Text>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isFullyPaid',
      key: 'isFullyPaid',
      width: 130,
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
      width: 225,
      render: (val) => val || <Text type="secondary">—</Text>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 90,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title={screens.md ? "Chỉnh sửa" : null}>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
              id={`btn-edit-student-${record._id}`}
            />
          </Tooltip>
          <Popconfirm
            title="Xác nhận xóa"
            description={`Xóa học viên "${record.name}" khỏi hệ thống?`}
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
                icon={<DeleteOutlined />}
                id={`btn-delete-student-${record._id}`}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Danh sách options lớp học cho Select
  const sessionOptions = useMemo(() => {
    return sessions.map((s) => ({
      value: s._id,
      label: `[${s.classCode}] ${s.campaignId?.title || ''} (${s.timeSlot}) - Tháng ${s.campaignMonth}`,
    }));
  }, [sessions]);

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
          Quản lý Học viên
        </Title>
        <Flex
          align="center"
          gap={8}
          style={{ width: !screens.md ? '100%' : 'auto' }}
        >
          <Tooltip title={screens.md ? "Tải lại" : null}>
            <Button icon={<ReloadOutlined />} onClick={fetchStudents} loading={loading} />
          </Tooltip>
          {!screens.md && (
            <Button
              icon={<FilterOutlined />}
              onClick={() => setIsFilterOpen((prev) => !prev)}
              type={isFilterOpen ? 'primary' : 'default'}
              ghost={isFilterOpen}
              id="btn-toggle-filter-student"
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
            id="btn-add-student-page"
            style={{ flex: !screens.md ? 1 : undefined }}
          >
            Thêm Học viên
          </Button>
        </Flex>
      </Flex>

      {/* ── Toolbar: Search + Lọc Trạng thái & Lớp học (Collapsible on Mobile, Normal on Desktop) ── */}
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
              placeholder="Tìm theo tên, SĐT, mã lớp..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '100%' }}
              id="search-student"
            />
          </Col>

          <Col xs={12} sm={6} md={5}>
            <Select
              placeholder="Trạng thái"
              allowClear
              value={filterPaid}
              onChange={(val) => setFilterPaid(val ?? null)}
              style={{ width: '100%' }}
              id="filter-student-status"
              options={[
                { value: true, label: '✓ Đã đóng xong' },
                { value: false, label: '⏳ Còn nợ' },
              ]}
            />
          </Col>

          <Col xs={12} sm={6} md={5}>
            <Select
              placeholder="Lọc theo Lớp học"
              allowClear
              showSearch
              optionFilterProp="label"
              value={filterSession}
              onChange={(val) => setFilterSession(val ?? null)}
              style={{ width: '100%' }}
              id="filter-student-session"
              options={sessionOptions}
            />
          </Col>

          {hasActiveFilter && (
            <Col xs={24} md={6}>
              <Flex align="center" justify="space-between" gap={8} wrap="wrap">
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Tìm thấy <Text strong>{filteredStudents.length}</Text> / {students.length} học viên
                </Text>
                <Button size="small" onClick={resetFilters}>
                  Xóa bộ lọc
                </Button>
              </Flex>
            </Col>
          )}
        </Row>
      </div>

      {/* ── Bảng (Desktop) hoặc Danh sách Thẻ (Mobile) ────────────────── */}
      {screens.md ? (
        <Table
          rowKey="_id"
          dataSource={filteredStudents}
          columns={columns}
          loading={loading}
          size="small"
          scroll={{ x: 950 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `${total} / ${students.length} học viên`,
            showSizeChanger: false,
          }}
          locale={{
            emptyText: hasActiveFilter
              ? 'Không tìm thấy học viên nào phù hợp.'
              : 'Chưa có học viên nào trong hệ thống.',
          }}
        />
      ) : loading ? (
        <Card loading style={{ borderRadius: 8, marginBottom: 12 }} />
      ) : filteredStudents.length === 0 ? (
        <Empty
          description={
            hasActiveFilter
              ? 'Không tìm thấy học viên nào phù hợp.'
              : 'Chưa có học viên nào trong hệ thống.'
          }
          style={{ padding: '36px 0', background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0' }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filteredStudents.map((st) => (
            <Card
              key={st._id}
              className="mobile-student-card"
              styles={{ body: { padding: '12px 14px' } }}
              style={{
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                border: '1px solid #f0f0f0',
                marginBottom: 10,
                background: '#fff',
              }}
            >
              {/* Header: Tag Mã lớp + Họ tên (trái) & Nhóm thao tác Sửa/Xóa (phải) */}
              <Flex justify="space-between" align="flex-start" style={{ marginBottom: 8 }}>
                <Flex align="center" gap={8} style={{ minWidth: 0, flex: 1 }}>
                  <Tag
                    style={{
                      backgroundColor: '#F3E8FF',
                      color: '#7E22CE',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: 12,
                      borderRadius: 6,
                      margin: 0,
                    }}
                  >
                    {st.classCode}
                  </Tag>
                  <Text strong style={{ fontSize: 15, color: '#1f1f1f', wordBreak: 'break-word' }}>
                    {st.name}
                  </Text>
                </Flex>

                <Space size={2} style={{ flexShrink: 0 }}>
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openEdit(st)}
                    id={`btn-edit-student-mob-${st._id}`}
                  />
                  <Popconfirm
                    title="Xác nhận xóa"
                    description={`Xóa học viên "${st.name}"?`}
                    onConfirm={() => handleDelete(st)}
                    okText="Xóa"
                    okButtonProps={{ danger: true }}
                    cancelText="Hủy"
                    placement="bottomRight"
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      id={`btn-delete-student-mob-${st._id}`}
                    />
                  </Popconfirm>
                </Space>
              </Flex>

              {/* Dòng 2: Số điện thoại + Tên khóa học */}
              <Flex align="center" gap={8} wrap="wrap" style={{ marginBottom: 8 }}>
                <Text code style={{ fontSize: 12 }}>
                  <PhoneOutlined style={{ marginRight: 4, color: '#888' }} />
                  {st.phone}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {st.campaignTitle}
                </Text>
              </Flex>

              {/* Dòng 3: Khối Tài chính (Cọc + Nợ / Trạng thái) */}
              <Flex justify="space-between" align="center" style={{ paddingTop: 6, borderTop: '1px dashed #f0f0f0' }}>
                <Space size={6} wrap>
                  <Tag color="blue" style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>
                    Cọc: {fmtMoney(st.depositAmount)}
                  </Tag>
                  {st.isFullyPaid ? (
                    <Tag color="success" style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>
                      ✓ Đã đóng xong
                    </Tag>
                  ) : (
                    <Tag color="error" style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>
                      Nợ: {fmtMoney(st.remainingAmount)}
                    </Tag>
                  )}
                </Space>

                {st.paymentNote && (
                  <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic', maxWidth: '45%' }} ellipsis>
                    {st.paymentNote}
                  </Text>
                )}
              </Flex>
            </Card>
          ))}
        </div>
      )}

      {/* ── Modal / Drawer Thêm / Chỉnh sửa Học viên ───────────────────── */}
      {(() => {
        const studentFormNode = (
          <Form
            form={form}
            layout="vertical"
            style={{ marginTop: screens.md ? 16 : 8 }}
            requiredMark="optional"
            onValuesChange={handleValuesChange}
          >
            {/* Lớp học */}
            <Form.Item
              name="sessionId"
              label="Lớp học đăng ký"
              rules={[{ required: true, message: 'Vui lòng chọn lớp học.' }]}
            >
              <Select
                placeholder="Chọn lớp học..."
                showSearch
                optionFilterProp="label"
                options={sessionOptions}
                id="select-student-session"
              />
            </Form.Item>

            <Row gutter={12}>
              {/* Họ tên */}
              <Col xs={24} sm={12}>
                <Form.Item
                  name="name"
                  label="Họ và tên"
                  rules={[{ required: true, message: 'Vui lòng nhập họ tên học viên.' }]}
                >
                  <Input
                    placeholder="VD: Nguyễn Văn A"
                    prefix={<UserOutlined style={{ color: '#bbb' }} />}
                    id="input-student-name"
                    autoComplete="off"
                  />
                </Form.Item>
              </Col>

              {/* Số điện thoại */}
              <Col xs={24} sm={12}>
                <Form.Item
                  name="phone"
                  label="Số điện thoại"
                  rules={[
                    { required: true, message: 'Vui lòng nhập số điện thoại.' },
                    { pattern: /^[0-9+\-\s]{8,15}$/, message: 'Số điện thoại không hợp lệ.' },
                  ]}
                >
                  <Input
                    placeholder="VD: 0901234567"
                    prefix={<PhoneOutlined style={{ color: '#bbb' }} />}
                    id="input-student-phone"
                    autoComplete="off"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              {/* Tiền đã cọc */}
              <Col xs={24} sm={12}>
                <Form.Item
                  name="depositAmount"
                  label="Số tiền đã cọc (đ)"
                >
                  <InputNumber
                    min={0}
                    step={100000}
                    formatter={(v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                    parser={(v) => v?.replace(/,/g, '') || 0}
                    style={{ width: '100%' }}
                    placeholder="0"
                    prefix={<DollarOutlined style={{ color: '#bbb' }} />}
                    id="input-student-deposit"
                  />
                </Form.Item>
              </Col>

              {/* Tiền còn nợ */}
              <Col xs={24} sm={12}>
                <Form.Item
                  name="remainingAmount"
                  label="Số tiền còn nợ (đ)"
                >
                  <InputNumber
                    min={0}
                    step={100000}
                    formatter={(v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                    parser={(v) => v?.replace(/,/g, '') || 0}
                    style={{ width: '100%' }}
                    placeholder="0"
                    id="input-student-remaining"
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Switch Đã đóng xong */}
            <Form.Item
              name="isFullyPaid"
              label="Trạng thái hoàn thành học phí"
              valuePropName="checked"
              extra="Khi bật 'Đã đóng xong', hệ thống sẽ tự động gán Còn nợ = 0 và cộng dồn nợ vào Tiền cọc."
            >
              <Switch
                checkedChildren="✓ Đã đóng xong"
                unCheckedChildren="Còn nợ"
                id="switch-student-fully-paid"
              />
            </Form.Item>

            {/* Ghi chú thanh toán */}
            <Form.Item
              name="paymentNote"
              label="Ghi chú thanh toán"
            >
              <Input.TextArea
                rows={2}
                placeholder="VD: Đã đóng tiền mặt, Chuyển khoản qua Techcombank..."
                id="input-student-note"
              />
            </Form.Item>
          </Form>
        );

        const formTitle = editTarget ? 'Chỉnh sửa thông tin Học viên' : 'Thêm Học viên mới';
        const submitText = editTarget ? 'Lưu thay đổi' : 'Thêm học viên';

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
            width={540}
          >
            {studentFormNode}
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
                  id="drawer-btn-submit-student"
                >
                  {submitText}
                </Button>
              </div>
            }
          >
            {studentFormNode}
          </Drawer>
        );
      })()}
    </>
  );
}
