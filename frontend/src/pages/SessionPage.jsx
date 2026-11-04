import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Table, Button, Input, Select, Space, Tag, Popconfirm, App,
  Typography, Tooltip, Tabs, Empty, Card, Col, Grid, Switch,
} from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';
import { SESSION_STATUS_OPTIONS } from '../constants';
import { groupSessionsByCampaign } from '../utils/formatters';
import useDebounce from '../hooks/useDebounce';
import PageHeader from '../components/common/PageHeader';
import FilterToolbar from '../components/common/FilterToolbar';
import { SessionStatusTag } from '../components/common/StatusTags';
import CourseSelectorCard from '../components/sessions/CourseSelectorCard';
import SessionFormModal from '../components/sessions/SessionFormModal';
import SessionDetailModal from '../components/sessions/SessionDetailModal';
import SessionMobileView from '../components/sessions/SessionMobileView';

const { Text } = Typography;

export default function SessionPage() {
  const { message, modal } = App.useApp();
  const screens = Grid.useBreakpoint();

  // ── State dữ liệu (Khởi tạo từ SWR Cache giúp chuyển trang tức thì) ────────
  const [sessions, setSessions] = useState(
    () => api.getCached('/sessions')?.data ?? []
  );
  const [campaigns, setCampaigns] = useState(
    () => api.getCached('/campaigns')?.data ?? []
  );
  const [loading, setLoading] = useState(() => !api.getCached('/sessions'));
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // ── State Filter & Chọn khóa học ───────────────────────────────────────────
  const [searchCode, setSearchCode] = useState('');
  const debouncedSearchCode = useDebounce(searchCode, 200);
  const [filterStatus, setFilterStatus] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [chosenCampaignId, setChosenCampaignId] = useState(null);
  const [activeMobileMonth, setActiveMobileMonth] = useState(null);

  // ── Gọi song song (Parallel Fetch) + SWR Cache ─────────────────────────────
  const loadData = useCallback(
    async (forceRefresh = false) => {
      try {
        const [sessionsRes, campaignsRes] = await Promise.all([
          api.fetchCached('/sessions', { force: forceRefresh }),
          api.fetchCached('/campaigns', { force: forceRefresh }).catch(() => null),
        ]);
        if (sessionsRes?.data) setSessions(sessionsRes.data);
        if (campaignsRes?.data) setCampaigns(campaignsRes.data);
      } catch (err) {
        message.error(err.message || 'Không thể tải danh sách lớp học.');
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  useEffect(() => {
    let ignore = false;
    Promise.all([
      api.fetchCached('/sessions'),
      api.fetchCached('/campaigns').catch(() => null),
    ])
      .then(([sessionsRes, campaignsRes]) => {
        if (ignore) return;
        if (sessionsRes?.data) setSessions(sessionsRes.data);
        if (campaignsRes?.data) setCampaigns(campaignsRes.data);
      })
      .catch((err) => {
        if (!ignore) message.error(err.message || 'Không thể tải danh sách lớp học.');
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

  // ── selectedSession: derive từ sessions state để tự động đồng bộ ───────────
  const selectedSession = useMemo(
    () => sessions.find((s) => s._id === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  );

  // ── Cập nhật 1 session ngay lập tức khi thêm/xóa học viên trong DetailModal ─
  const handleSessionUpdated = useCallback(async (updatedSession) => {
    if (updatedSession && updatedSession._id) {
      setSessions((prev) =>
        prev.map((s) => (s._id === updatedSession._id ? updatedSession : s))
      );
    } else {
      const res = await api.fetchCached('/sessions', { force: true });
      if (res?.data) setSessions(res.data);
    }
  }, []);

  // ── Filter cục bộ (Debounced) ──────────────────────────────────────────────
  const filteredSessions = useMemo(() => {
    let result = sessions;
    if (debouncedSearchCode.trim()) {
      const kw = debouncedSearchCode.trim().toLowerCase();
      result = result.filter((s) => s.classCode?.toLowerCase().includes(kw));
    }
    if (filterStatus) {
      result = result.filter((s) => s.status === filterStatus);
    }
    return result;
  }, [sessions, debouncedSearchCode, filterStatus]);

  // ── Nhóm dữ liệu phân cấp (Derived State không cần useEffect) ──────────────
  const groupedData = useMemo(
    () => groupSessionsByCampaign(filteredSessions),
    [filteredSessions]
  );
  const campaignIds = useMemo(() => Object.keys(groupedData), [groupedData]);

  const activeCampaignId = useMemo(() => {
    if (chosenCampaignId && (campaignIds.includes(chosenCampaignId) || campaigns.some((c) => c._id === chosenCampaignId))) {
      return chosenCampaignId;
    }
    return campaignIds[0] ?? campaigns[0]?._id ?? null;
  }, [chosenCampaignId, campaignIds, campaigns]);

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
        const { data } = await api.put(`/sessions/${editTarget._id}`, payload);
        message.success(`Đã cập nhật lớp học "${payload.classCode}".`);
        if (data?.data?._id) {
          setSessions((prev) =>
            prev.map((s) => (s._id === editTarget._id ? data.data : s))
          );
        } else {
          await loadData(true);
        }
      } else {
        const { data } = await api.post('/sessions', payload);
        message.success(`Đã tạo lớp học "${payload.classCode}".`);
        if (data?.data?._id) {
          setSessions((prev) => [data.data, ...prev]);
        } else {
          const res = await api.fetchCached('/sessions', { force: true });
          if (res?.data) setSessions(res.data);
        }
      }
      closeModal();
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

  const handleToggleHidden = useCallback(
    async (record) => {
      const newHidden = !record.isHidden;
      setTogglingId(record._id);
      try {
        const { data } = await api.put(`/sessions/${record._id}`, { isHidden: newHidden });
        message.success(
          newHidden
            ? `Đã ẩn lớp "${record.classCode}" khỏi trang lịch học công khai.`
            : `Đã hiển thị công khai lớp "${record.classCode}".`
        );
        setSessions((prev) =>
          prev.map((s) =>
            s._id === record._id
              ? data?.data?._id
                ? data.data
                : { ...s, isHidden: newHidden }
              : s
          )
        );
      } catch (err) {
        message.error(
          err.response?.data?.message || err.message || 'Không thể cập nhật trạng thái hiển thị.'
        );
      } finally {
        setTogglingId(null);
      }
    },
    [message]
  );

  const handleDelete = useCallback(
    async (record) => {
      try {
        await api.delete(`/sessions/${record._id}`);
        message.success(`Đã xóa lớp học "${record.classCode}".`);
        setSessions((prev) => prev.filter((s) => s._id !== record._id));
      } catch (err) {
        message.error(
          err.response?.data?.message || err.message || 'Không thể xóa lớp học.'
        );
      }
    },
    [message]
  );

  const openDetail = useCallback((record) => setSelectedSessionId(record._id), []);
  const closeDetail = useCallback(() => setSelectedSessionId(null), []);

  // ── Cột bảng Session (Desktop) ─────────────────────────────────────────────
  const sessionColumns = useMemo(
    () => [
      {
        title: 'Mã lớp',
        dataIndex: 'classCode',
        key: 'classCode',
        width: 110,
        sorter: (a, b) => a.classCode.localeCompare(b.classCode),
        defaultSortOrder: 'ascend',
        render: (val) => (
          <Tag color="purple" style={{ fontWeight: 600, margin: 0 }}>
            {val}
          </Tag>
        ),
      },
      {
        title: 'Khung giờ',
        dataIndex: 'timeSlot',
        key: 'timeSlot',
        width: 170,
        render: (val) => (
          <Tag color="blue" style={{ fontWeight: 600, fontSize: 12 }}>
            {val}
          </Tag>
        ),
      },
      {
        title: 'Ngày học',
        key: 'studyDates',
        width: 220,
        render: (_, record) => (
          <Tooltip
            title={record.studyDates
              ?.map((d) => dayjs(d).format('DD/MM/YYYY'))
              .join(' · ')}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {record.studyDates?.map((date, index) => (
                <Tag
                  key={index}
                  color="blue"
                  style={{ fontWeight: 600, fontSize: 12, margin: 0 }}
                >
                  {dayjs(date).format('DD/MM')}
                </Tag>
              ))}
            </div>
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
              style={{
                color:
                  record.currentBooked >= record.maxCapacity ? '#cf1322' : '#389e0d',
              }}
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
        render: (val) => <SessionStatusTag status={val} />,
      },
      {
        title: 'Hiển thị',
        dataIndex: 'isHidden',
        key: 'isHidden',
        width: 105,
        align: 'center',
        render: (_, record) => (
          <Tooltip
            title={
              !record.isHidden
                ? 'Đang hiển thị trên lịch học Public (Click để ẩn)'
                : 'Đang ẩn khỏi lịch học Public (Click để hiện)'
            }
          >
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
    ],
    [togglingId, handleToggleHidden, openDetail, openEdit, handleDelete]
  );

  // ── Dữ liệu Tháng & Lớp học theo Campaign đang chọn ────────────────────────
  const { currentCampaignMonths, sortedMonthKeys } = useMemo(() => {
    if (!activeCampaignId || !groupedData[activeCampaignId]) {
      return { currentCampaignMonths: {}, sortedMonthKeys: [] };
    }
    const { months, orderedMonths } = groupedData[activeCampaignId];
    const keys = [
      ...orderedMonths.filter((m) => months[m]),
      ...Object.keys(months).filter((m) => !orderedMonths.includes(m)),
    ];
    return { currentCampaignMonths: months, sortedMonthKeys: keys };
  }, [groupedData, activeCampaignId]);

  const selectedMobileMonthKey = useMemo(() => {
    if (activeMobileMonth && sortedMonthKeys.includes(activeMobileMonth)) {
      return activeMobileMonth;
    }
    return sortedMonthKeys[0] ?? null;
  }, [activeMobileMonth, sortedMonthKeys]);

  const activeMobileSessions = useMemo(() => {
    if (!selectedMobileMonthKey || !currentCampaignMonths[selectedMobileMonthKey]) {
      return [];
    }
    return [...currentCampaignMonths[selectedMobileMonthKey].sessions].sort((a, b) =>
      a.classCode.localeCompare(b.classCode)
    );
  }, [selectedMobileMonthKey, currentCampaignMonths]);

  const activeMonthTabs = useMemo(() => {
    if (!activeCampaignId || !groupedData[activeCampaignId]) return [];
    return sortedMonthKeys.map((mk) => {
      const { label, sessions: mSessions } = currentCampaignMonths[mk] ?? {};
      const sortedSessions = [...(mSessions ?? [])].sort((a, b) =>
        a.classCode.localeCompare(b.classCode)
      );
      return {
        key: mk,
        label: <span>{label}</span>,
        children: (
          <Table
            rowKey="_id"
            dataSource={sortedSessions}
            columns={sessionColumns}
            size="small"
            scroll={{ x: 800 }}
            pagination={
              sortedSessions.length > 8
                ? { pageSize: 8, showTotal: (t) => `${t} lớp`, showSizeChanger: false }
                : false
            }
            locale={{ emptyText: 'Tháng này chưa có lớp học.' }}
          />
        ),
      };
    });
  }, [
    sortedMonthKeys,
    currentCampaignMonths,
    activeCampaignId,
    groupedData,
    sessionColumns,
  ]);

  const hasActiveFilter = Boolean(searchCode.trim() || filterStatus);
  const resetFilters = useCallback(() => {
    setSearchCode('');
    setFilterStatus(null);
  }, []);

  return (
    <>
      <PageHeader
        title="Quản lý Lớp học"
        loading={loading}
        onReload={handleReload}
        isFilterOpen={isFilterOpen}
        onToggleFilter={() => setIsFilterOpen((prev) => !prev)}
        hasActiveFilter={hasActiveFilter}
        filterBtnId="btn-toggle-filter"
        onAdd={openCreate}
        addLabel="Thêm Lớp học"
        addBtnId="btn-add-session"
      />

      <FilterToolbar
        isOpen={isFilterOpen}
        hasActiveFilter={hasActiveFilter}
        summaryText={
          <>
            Đang lọc — <Text strong>{filteredSessions.length}</Text> lớp
          </>
        }
        onReset={resetFilters}
      >
        <Col xs={24} sm={12} md={8}>
          <Input.Search
            placeholder="Tìm theo mã lớp..."
            allowClear
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            style={{ width: '100%' }}
            id="search-session-code"
          />
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Select
            placeholder="Lọc trạng thái"
            allowClear
            value={filterStatus}
            onChange={(val) => setFilterStatus(val ?? null)}
            style={{ width: '100%' }}
            id="filter-session-status"
            options={SESSION_STATUS_OPTIONS}
          />
        </Col>
      </FilterToolbar>

      <CourseSelectorCard
        campaigns={campaigns}
        groupedData={groupedData}
        activeCampaignId={activeCampaignId}
        onSelectCampaign={setChosenCampaignId}
      />

      {loading ? (
        !screens.md ? (
          <Card loading style={{ borderRadius: 8, marginTop: 4 }} />
        ) : (
          <Table
            loading={loading}
            dataSource={[]}
            columns={sessionColumns}
            scroll={{ x: 800 }}
          />
        )
      ) : !activeCampaignId || activeMonthTabs.length === 0 ? (
        <Empty
          description={
            hasActiveFilter
              ? 'Không tìm thấy lớp học nào phù hợp với bộ lọc.'
              : 'Khóa học này chưa có lớp học nào. Hãy thêm mới!'
          }
          style={{ padding: '48px 0' }}
        />
      ) : screens.md ? (
        <div
          style={{
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #f0f0f0',
            padding: '0 16px 16px',
          }}
        >
          <Tabs
            type="card"
            size="small"
            items={activeMonthTabs}
            className="month-tabs"
            style={{ marginTop: 4 }}
          />
        </div>
      ) : (
        <SessionMobileView
          sortedMonthKeys={sortedMonthKeys}
          currentCampaignMonths={currentCampaignMonths}
          selectedMonthKey={selectedMobileMonthKey}
          onSelectMonth={setActiveMobileMonth}
          sessions={activeMobileSessions}
          togglingId={togglingId}
          onToggleHidden={handleToggleHidden}
          onDetail={openDetail}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      <SessionFormModal
        open={modalOpen}
        editTarget={editTarget}
        campaigns={campaigns}
        submitting={submitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <SessionDetailModal
        open={!!selectedSession}
        session={selectedSession}
        onClose={closeDetail}
        onSessionUpdated={handleSessionUpdated}
      />
    </>
  );
}
