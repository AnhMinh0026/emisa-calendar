import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Input, Select, App, Col, Grid, Tabs, Empty, Card,
} from 'antd';
import api from '../services/api';
import { PAYMENT_STATUS_OPTIONS } from '../constants';
import useDebounce from '../hooks/useDebounce';
import PageHeader from '../components/common/PageHeader';
import FilterToolbar from '../components/common/FilterToolbar';
import StudentCourseSelector from '../components/students/StudentCourseSelector';
import StudentMonthContent from '../components/students/StudentMonthContent';
import StudentFormModal from '../components/students/StudentFormModal';

export default function StudentPage() {
  const { message, modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  // ── State dữ liệu (Khởi tạo từ SWR Cache giúp chuyển trang tức thì) ────────
  const [students, setStudents] = useState(
    () => api.getCached('/students')?.data ?? []
  );
  const [sessions, setSessions] = useState(
    () => api.getCached('/sessions')?.data ?? []
  );
  const [campaigns, setCampaigns] = useState(
    () => api.getCached('/campaigns')?.data ?? []
  );
  const [loading, setLoading] = useState(() => !api.getCached('/students'));
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [defaultSessionId, setDefaultSessionId] = useState(null);

  // ── State Chọn Khóa học, Tháng & Bộ lọc ────────────────────────────────────
  const [chosenCampaignId, setChosenCampaignId] = useState(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, 200);
  const [filterPaid, setFilterPaid] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ── Gọi song song (Parallel Fetch) + SWR Cache ─────────────────────────────
  const loadData = useCallback(
    async (forceRefresh = false) => {
      try {
        const [studentsRes, sessionsRes, campaignsRes] = await Promise.all([
          api.fetchCached('/students', { force: forceRefresh }),
          api.fetchCached('/sessions', { force: forceRefresh }).catch(() => null),
          api.fetchCached('/campaigns', { force: forceRefresh }).catch(() => null),
        ]);
        if (studentsRes?.data) setStudents(studentsRes.data);
        if (sessionsRes?.data) setSessions(sessionsRes.data);
        if (campaignsRes?.data) setCampaigns(campaignsRes.data);
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
      api.fetchCached('/campaigns').catch(() => null),
    ])
      .then(([studentsRes, sessionsRes, campaignsRes]) => {
        if (ignore) return;
        if (studentsRes?.data) setStudents(studentsRes.data);
        if (sessionsRes?.data) setSessions(sessionsRes.data);
        if (campaignsRes?.data) setCampaigns(campaignsRes.data);
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

  // ── Lọc danh sách học viên theo từ khóa & trạng thái học phí ───────────────
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

    return result;
  }, [students, debouncedSearch, filterPaid]);

  const hasActiveFilter = Boolean(searchText.trim() || filterPaid !== null);

  const resetFilters = useCallback(() => {
    setSearchText('');
    setFilterPaid(null);
  }, []);

  // ── Gom nhóm phân cấp: Khóa học -> Tháng -> Lớp học -> Học viên ────────────
  const { hierarchyMap, courseStatsMap, displayCampaigns } = useMemo(() => {
    const map = {};
    const stats = {};

    // Map học viên theo sessionId để tra cứu O(1)
    const studentsBySession = {};
    filteredStudents.forEach((st) => {
      const sId = String(st.sessionId);
      if (!studentsBySession[sId]) studentsBySession[sId] = [];
      studentsBySession[sId].push(st);
    });

    // Khởi tạo từ danh sách campaigns
    campaigns.forEach((c) => {
      map[c._id] = {
        campaign: c,
        months: {},
        orderedMonths: c.months ?? [],
      };
      stats[c._id] = {
        studentCount: 0,
        unpaidCount: 0,
        sessionCount: 0,
        months: [...(c.months ?? [])],
      };
    });

    // Gắn từng session và danh sách học viên tương ứng vào Khóa học -> Tháng
    sessions.forEach((session) => {
      const campObj = session.campaignId;
      const cId = campObj?._id ?? session.campaignId;
      if (!cId) return;

      if (!map[cId]) {
        map[cId] = {
          campaign: campObj?._id ? campObj : { _id: cId, title: 'Khóa học khác', months: [] },
          months: {},
          orderedMonths: campObj?.months ?? [],
        };
      }
      if (!stats[cId]) {
        stats[cId] = {
          studentCount: 0,
          unpaidCount: 0,
          sessionCount: 0,
          months: [...(campObj?.months ?? [])],
        };
      }

      const mKey = session.campaignMonth ?? '??';
      if (!map[cId].months[mKey]) {
        map[cId].months[mKey] = [];
      }

      const sessionStudents = studentsBySession[String(session._id)] ?? [];
      map[cId].months[mKey].push({
        session,
        students: sessionStudents,
      });

      stats[cId].sessionCount += 1;
      stats[cId].studentCount += sessionStudents.length;
      stats[cId].unpaidCount += sessionStudents.filter((s) => !s.isFullyPaid).length;
      if (!stats[cId].months.includes(mKey)) {
        stats[cId].months.push(mKey);
      }
    });

    // Sắp xếp các lớp trong từng tháng theo mã lớp (K01, K02, ..., ÔN-01)
    Object.values(map).forEach((cGroup) => {
      Object.keys(cGroup.months).forEach((mk) => {
        cGroup.months[mk].sort((a, b) =>
          (a.session.classCode ?? '').localeCompare(b.session.classCode ?? '')
        );
      });
    });

    const campList =
      campaigns.length > 0
        ? campaigns
        : Object.values(map).map((g) => g.campaign);

    return {
      hierarchyMap: map,
      courseStatsMap: stats,
      displayCampaigns: campList,
    };
  }, [campaigns, sessions, filteredStudents]);

  // ── Xác định Khóa học đang chọn ────────────────────────────────────────────
  const activeCampaignId = useMemo(() => {
    if (chosenCampaignId && hierarchyMap[chosenCampaignId]) {
      return chosenCampaignId;
    }
    // Ưu tiên chọn khóa học đầu tiên có học viên
    const firstWithStudents = displayCampaigns.find(
      (c) => (courseStatsMap[c._id]?.studentCount ?? 0) > 0
    );
    return firstWithStudents?._id ?? displayCampaigns[0]?._id ?? null;
  }, [chosenCampaignId, hierarchyMap, displayCampaigns, courseStatsMap]);

  // ── Danh sách Tháng của Khóa học đang chọn ─────────────────────────────────
  const { currentMonthsMap, sortedMonthKeys } = useMemo(() => {
    if (!activeCampaignId || !hierarchyMap[activeCampaignId]) {
      return { currentMonthsMap: {}, sortedMonthKeys: [] };
    }
    const { months, orderedMonths } = hierarchyMap[activeCampaignId];
    const allKeys = [
      ...orderedMonths.filter((m) => months[m]),
      ...Object.keys(months).filter((m) => !orderedMonths.includes(m)),
    ];
    return { currentMonthsMap: months, sortedMonthKeys: allKeys };
  }, [hierarchyMap, activeCampaignId]);

  const activeMonthKey = useMemo(() => {
    if (selectedMonthKey && sortedMonthKeys.includes(selectedMonthKey)) {
      return selectedMonthKey;
    }
    // Ưu tiên chọn tháng đầu tiên có học viên
    const firstMonthWithStudents = sortedMonthKeys.find((mk) =>
      (currentMonthsMap[mk] ?? []).some((g) => g.students.length > 0)
    );
    return firstMonthWithStudents ?? sortedMonthKeys[0] ?? null;
  }, [selectedMonthKey, sortedMonthKeys, currentMonthsMap]);

  // ── CRUD Handlers ──────────────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    setEditTarget(null);
    // Gợi ý lớp đầu tiên còn chỗ trong tháng đang xem
    const activeGroups = currentMonthsMap[activeMonthKey] ?? [];
    const firstOpen = activeGroups.find(
      (g) =>
        g.session.status === 'open' &&
        (g.session.currentBooked ?? 0) < (g.session.maxCapacity ?? 0)
    );
    setDefaultSessionId(firstOpen?.session._id ?? null);
    setModalOpen(true);
  }, [currentMonthsMap, activeMonthKey]);

  const openCreateForClass = useCallback((sessionId) => {
    setEditTarget(null);
    setDefaultSessionId(sessionId);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((record) => {
    setEditTarget(record);
    setDefaultSessionId(null);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditTarget(null);
    setDefaultSessionId(null);
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
        // Cập nhật lại sĩ số session tương ứng trong state
        setSessions((prev) =>
          prev.map((s) =>
            String(s._id) === String(record.sessionId)
              ? {
                  ...s,
                  currentBooked: Math.max(0, (s.currentBooked ?? 1) - 1),
                  status:
                    s.status === 'full' && (s.currentBooked ?? 1) - 1 < s.maxCapacity
                      ? 'open'
                      : s.status,
                }
              : s
          )
        );
      } catch (err) {
        message.error(
          err.response?.data?.message || err.message || 'Không thể xóa học viên.'
        );
      }
    },
    [message]
  );

  // Danh sách options lớp học cho Select trong Modal Thêm/Sửa Học viên (sắp xếp theo Khóa & Tháng)
  const sessionOptions = useMemo(
    () =>
      [...sessions]
        .sort((a, b) => (a.classCode ?? '').localeCompare(b.classCode ?? ''))
        .map((s) => ({
          value: s._id,
          label: `[${s.classCode}] ${s.campaignId?.title || ''} (${s.timeSlot}) - Tháng ${s.campaignMonth} (${s.currentBooked}/${s.maxCapacity})`,
        })),
    [sessions]
  );

  // ── Items cho Tabs Tháng trên Desktop ──────────────────────────────────────
  const monthTabItems = useMemo(
    () =>
      sortedMonthKeys.map((mk) => {
        const groups = currentMonthsMap[mk] ?? [];
        const studentCount = groups.reduce((sum, g) => sum + g.students.length, 0);
        return {
          key: mk,
          label: (
            <span>
              Tháng {mk}{' '}
              <span style={{ fontWeight: 400, opacity: 0.75 }}>({studentCount})</span>
            </span>
          ),
          children: (
            <StudentMonthContent
              sessionGroups={groups}
              isMobile={false}
              hasActiveFilter={hasActiveFilter}
              onAddStudentToClass={openCreateForClass}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ),
        };
      }),
    [
      sortedMonthKeys,
      currentMonthsMap,
      hasActiveFilter,
      openCreateForClass,
      openEdit,
      handleDelete,
    ]
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
        resetColSpan={{ xs: 24, md: 8 }}
        onReset={resetFilters}
      >
        <Col xs={24} sm={14} md={10}>
          <Input.Search
            placeholder="Tìm theo tên, SĐT, mã lớp, ghi chú..."
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '100%' }}
            id="search-student"
          />
        </Col>

        <Col xs={24} sm={10} md={6}>
          <Select
            placeholder="Trạng thái học phí"
            allowClear
            value={filterPaid}
            onChange={(val) => setFilterPaid(val ?? null)}
            style={{ width: '100%' }}
            id="filter-student-status"
            options={PAYMENT_STATUS_OPTIONS}
          />
        </Col>
      </FilterToolbar>

      {/* Tầng 1: Chọn Khóa học */}
      <StudentCourseSelector
        campaigns={displayCampaigns}
        courseStatsMap={courseStatsMap}
        activeCampaignId={activeCampaignId}
        onSelectCampaign={(id) => {
          setChosenCampaignId(id);
          setSelectedMonthKey(null);
        }}
      />

      {/* Tầng 2 & 3: Chọn Tháng -> Xem từng Lớp học & Học viên */}
      {loading ? (
        <Card loading style={{ borderRadius: 8, marginTop: 4 }} />
      ) : !activeCampaignId || sortedMonthKeys.length === 0 ? (
        <Empty
          description="Khóa học này chưa có lớp học hoặc học viên nào."
          style={{ padding: '48px 0' }}
        />
      ) : !isMobile ? (
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
            activeKey={activeMonthKey}
            onChange={setSelectedMonthKey}
            items={monthTabItems}
            className="month-tabs"
            style={{ marginTop: 4 }}
          />
        </div>
      ) : (
        <div>
          {/* Thanh chọn Tháng dạng Pill cuộn ngang trên Mobile */}
          <div
            className="mobile-month-pills-bar"
            style={{
              display: 'flex',
              overflowX: 'auto',
              gap: 8,
              padding: '4px 0 14px 0',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {sortedMonthKeys.map((mk) => {
              const groups = currentMonthsMap[mk] ?? [];
              const studentCount = groups.reduce((sum, g) => sum + g.students.length, 0);
              const isActive = mk === activeMonthKey;

              return (
                <div
                  key={mk}
                  onClick={() => setSelectedMonthKey(mk)}
                  className="mobile-month-pill"
                  style={{
                    borderRadius: 20,
                    padding: '6px 16px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.25s',
                    cursor: 'pointer',
                    flexShrink: 0,
                    userSelect: 'none',
                    backgroundColor: isActive ? '#EFF6FF' : '#ffffff',
                    color: isActive ? '#1D4ED8' : '#334155',
                    border: isActive ? '1.5px solid #3B82F6' : '1px solid #E2E8F0',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 13,
                    boxShadow: isActive ? '0 2px 8px rgba(59, 130, 246, 0.14)' : 'none',
                  }}
                >
                  Tháng {mk} ({studentCount})
                </div>
              );
            })}
          </div>

          <StudentMonthContent
            sessionGroups={currentMonthsMap[activeMonthKey] ?? []}
            isMobile
            hasActiveFilter={hasActiveFilter}
            onAddStudentToClass={openCreateForClass}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      <StudentFormModal
        open={modalOpen}
        editTarget={editTarget}
        defaultSessionId={defaultSessionId}
        sessionOptions={sessionOptions}
        submitting={submitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </>
  );
}
