import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Table, Button, Input, Select, Space, Popconfirm, App,
  Typography, Tooltip, Col, Grid,
} from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../services/api';
import { PAYMENT_STATUS_OPTIONS } from '../constants';
import { fmtMoney } from '../utils/formatters';
import useDebounce from '../hooks/useDebounce';
import PageHeader from '../components/common/PageHeader';
import FilterToolbar from '../components/common/FilterToolbar';
import { ClassCodeTag, PaymentStatusTag } from '../components/common/StatusTags';
import StudentFormModal from '../components/students/StudentFormModal';
import StudentMobileList from '../components/students/StudentMobileList';

const { Text } = Typography;

export default function StudentPage() {
  const { message, modal } = App.useApp();
  const screens = Grid.useBreakpoint();

  // ── State dữ liệu (Khởi tạo từ SWR Cache giúp chuyển trang tức thì) ────────
  const [students, setStudents] = useState(
    () => api.getCached('/students')?.data ?? []
  );
  const [sessions, setSessions] = useState(
    () => api.getCached('/sessions')?.data ?? []
  );
  const [loading, setLoading] = useState(() => !api.getCached('/students'));
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  // ── State Bộ lọc ───────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, 200);
  const [filterPaid, setFilterPaid] = useState(null);
  const [filterSession, setFilterSession] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ── Gọi song song (Parallel Fetch) + SWR Cache ─────────────────────────────
  const loadData = useCallback(
    async (forceRefresh = false) => {
      try {
        const [studentsRes, sessionsRes] = await Promise.all([
          api.fetchCached('/students', { force: forceRefresh }),
          api.fetchCached('/sessions', { force: forceRefresh }).catch(() => null),
        ]);
        if (studentsRes?.data) setStudents(studentsRes.data);
        if (sessionsRes?.data) setSessions(sessionsRes.data);
      } catch (err) {
        message.error(
          err.response?.data?.message ||
            err.message ||
            'Không thể tải danh sách học viên.'
        );
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  useEffect(() => {
    let ignore = false;
    Promise.all([
      api.fetchCached('/students'),
      api.fetchCached('/sessions').catch(() => null),
    ])
      .then(([studentsRes, sessionsRes]) => {
        if (ignore) return;
        if (studentsRes?.data) setStudents(studentsRes.data);
        if (sessionsRes?.data) setSessions(sessionsRes.data);
      })
      .catch((err) => {
        if (!ignore) {
          message.error(
            err.response?.data?.message ||
              err.message ||
              'Không thể tải danh sách học viên.'
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [message]);

  const handleReload = useCallback(() => {
    setLoading(true);
    loadData(true);
  }, [loadData]);

  // ── Lọc danh sách học viên (Debounced) ──────────────────────────────────────
  const filteredStudents = useMemo(() => {
    let result = students;

    if (debouncedSearch.trim()) {
      const kw = debouncedSearch.trim().toLowerCase();
      result = result.filter(
        (st) =>
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
  }, [students, debouncedSearch, filterPaid, filterSession]);

  const hasActiveFilter = Boolean(
    searchText.trim() || filterPaid !== null || filterSession !== null
  );

  const resetFilters = useCallback(() => {
    setSearchText('');
    setFilterPaid(null);
    setFilterSession(null);
  }, []);

  // ── CRUD Handlers ──────────────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    setEditTarget(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((record) => {
    setEditTarget(record);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditTarget(null);
  }, []);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (editTarget) {
        await api.put(`/students/${editTarget._id}`, payload);
        message.success(`Đã cập nhật học viên "${payload.name}".`);
      } else {
        await api.post('/students', payload);
        message.success(`Đã thêm học viên "${payload.name}".`);
      }

      closeModal();
      // Tải ngầm dữ liệu mới mà không làm nhấp nháy bảng
      await loadData(true);
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

  const handleDelete = useCallback(
    async (record) => {
      try {
        await api.delete(`/students/${record._id}`);
        message.success(`Đã xóa học viên "${record.name}".`);
        setStudents((prev) => prev.filter((st) => st._id !== record._id));
      } catch (err) {
        message.error(
          err.response?.data?.message || err.message || 'Không thể xóa học viên.'
        );
      }
    },
    [message]
  );

  // ── Cột bảng cho Desktop / Tablet ──────────────────────────────────────────
  const columns = useMemo(
    () => [
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
        render: (val) => (
          <Text strong style={{ fontSize: 13 }}>
            {val}
          </Text>
        ),
      },
      {
        title: 'Số điện thoại',
        dataIndex: 'phone',
        key: 'phone',
        width: 125,
        render: (val) => (
          <Text code style={{ fontSize: 12 }}>
            {val}
          </Text>
        ),
      },
      {
        title: 'Lớp đang học',
        key: 'classCode',
        width: 160,
        render: (_, record) => (
          <div>
            <ClassCodeTag code={record.classCode} fontSize={12} />
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
            <Text
              style={{
                color: n > 0 ? '#cf1322' : '#8c8c8c',
                fontWeight: n > 0 ? 600 : 400,
                fontSize: 12,
              }}
            >
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
        render: (val) => <PaymentStatusTag isFullyPaid={val} />,
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
            <Tooltip title="Chỉnh sửa">
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
              <Tooltip title="Xóa">
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
    ],
    [openEdit, handleDelete]
  );

  // Danh sách options lớp học cho Select
  const sessionOptions = useMemo(
    () =>
      sessions.map((s) => ({
        value: s._id,
        label: `[${s.classCode}] ${s.campaignId?.title || ''} (${s.timeSlot}) - Tháng ${s.campaignMonth}`,
      })),
    [sessions]
  );

  return (
    <>
      <PageHeader
        title="Quản lý Học viên"
        loading={loading}
        onReload={handleReload}
        isFilterOpen={isFilterOpen}
        onToggleFilter={() => setIsFilterOpen((prev) => !prev)}
        hasActiveFilter={hasActiveFilter}
        filterBtnId="btn-toggle-filter-student"
        onAdd={openCreate}
        addLabel="Thêm Học viên"
        addBtnId="btn-add-student-page"
      />

      <FilterToolbar
        isOpen={isFilterOpen}
        hasActiveFilter={hasActiveFilter}
        filteredCount={filteredStudents.length}
        totalCount={students.length}
        unitLabel="học viên"
        resetColSpan={{ xs: 24, md: 6 }}
        onReset={resetFilters}
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
            options={PAYMENT_STATUS_OPTIONS}
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
      </FilterToolbar>

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
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          locale={{
            emptyText: hasActiveFilter
              ? 'Không tìm thấy học viên nào phù hợp.'
              : 'Chưa có học viên nào trong hệ thống.',
          }}
        />
      ) : (
        <StudentMobileList
          loading={loading}
          students={filteredStudents}
          hasActiveFilter={hasActiveFilter}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      <StudentFormModal
        open={modalOpen}
        editTarget={editTarget}
        sessionOptions={sessionOptions}
        submitting={submitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </>
  );
}
