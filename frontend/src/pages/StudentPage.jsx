import { useEffect, useState, useCallback, useMemo } from "react";
import { Input, Select, App, Col, Grid, Empty, Card } from "antd";
import api from "../services/api";
import { PAYMENT_STATUS_OPTIONS } from "../constants";
import useDebounce from "../hooks/useDebounce";
import PageHeader from "../components/common/PageHeader";
import FilterToolbar from "../components/common/FilterToolbar";
import StudentCourseSelector from "../components/students/StudentCourseSelector";
import StudentMonthBar from "../components/students/StudentMonthBar";
import StudentMonthContent from "../components/students/StudentMonthContent";
import StudentFormModal from "../components/students/StudentFormModal";

export default function StudentPage() {
  const { message, modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  // ── State dữ liệu (Khởi tạo từ SWR Cache giúp chuyển trang tức thì) ────────
  const [students, setStudents] = useState(
    () => api.getCached("/students")?.data ?? [],
  );
  const [sessions, setSessions] = useState(
    () => api.getCached("/sessions")?.data ?? [],
  );
  const [campaigns, setCampaigns] = useState(
    () => api.getCached("/campaigns")?.data ?? [],
  );
  const [loading, setLoading] = useState(() => !api.getCached("/students"));
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [defaultSessionId, setDefaultSessionId] = useState(null);

  // ── State Chọn Khóa học, Tháng & Bộ lọc ────────────────────────────────────
  const [chosenCampaignId, setChosenCampaignId] = useState(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounce(searchText, 200);
  const [filterPaid, setFilterPaid] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ── Gọi song song (Parallel Fetch) + SWR Cache ─────────────────────────────
  const loadData = useCallback(
    async (forceRefresh = false) => {
      try {
        const [studentsRes, sessionsRes, campaignsRes] = await Promise.all([
          api.fetchCached("/students", { force: forceRefresh }),
          api
            .fetchCached("/sessions", { force: forceRefresh })
            .catch(() => null),
          api
            .fetchCached("/campaigns", { force: forceRefresh })
            .catch(() => null),
        ]);
        if (studentsRes?.data) setStudents(studentsRes.data);
        if (sessionsRes?.data) setSessions(sessionsRes.data);
        if (campaignsRes?.data) setCampaigns(campaignsRes.data);
      } catch (err) {
        message.error(
          err.response?.data?.message ||
            err.message ||
            "Không thể tải danh sách học viên.",
        );
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  useEffect(() => {
    let ignore = false;
    Promise.all([
      api.fetchCached("/students"),
      api.fetchCached("/sessions").catch(() => null),
      api.fetchCached("/campaigns").catch(() => null),
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
              "Không thể tải danh sách học viên.",
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
          st.paymentNote?.toLowerCase().includes(kw),
      );
    }

    if (filterPaid !== null) {
      result = result.filter((st) => Boolean(st.isFullyPaid) === filterPaid);
    }

    return result;
  }, [students, debouncedSearch, filterPaid]);

  const hasActiveFilter = Boolean(searchText.trim() || filterPaid !== null);

  const resetFilters = useCallback(() => {
    setSearchText("");
    setFilterPaid(null);
  }, []);

  // ── Gom nhóm phân cấp: Khóa học -> Tháng -> Lớp học -> Học viên ────────────
  const { hierarchyMap, courseStatsMap, displayCampaigns } = useMemo(() => {
    const map = {};
    const stats = {};

    const studentsBySession = {};
    filteredStudents.forEach((st) => {
      const sId = String(st.sessionId);
      if (!studentsBySession[sId]) studentsBySession[sId] = [];
      studentsBySession[sId].push(st);
    });

    campaigns.forEach((c) => {
      const initialMonths = {};
      (c.months ?? []).forEach((mk) => {
        initialMonths[mk] = [];
      });

      map[c._id] = {
        campaign: c,
        months: initialMonths,
        orderedMonths: c.months ?? [],
      };
      stats[c._id] = {
        studentCount: 0,
        unpaidCount: 0,
        sessionCount: 0,
        months: [...(c.months ?? [])],
      };
    });

    sessions.forEach((session) => {
      const campObj = session.campaignId;
      const cId = campObj?._id ?? session.campaignId;
      if (!cId) return;

      if (!map[cId]) {
        map[cId] = {
          campaign: campObj?._id
            ? campObj
            : { _id: cId, title: "Khóa học khác", months: [] },
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

      const mKey = session.campaignMonth ?? "??";
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
      stats[cId].unpaidCount += sessionStudents.filter(
        (s) => !s.isFullyPaid,
      ).length;
      if (!stats[cId].months.includes(mKey)) {
        stats[cId].months.push(mKey);
      }
    });

    Object.values(map).forEach((cGroup) => {
      Object.keys(cGroup.months).forEach((mk) => {
        cGroup.months[mk].sort((a, b) =>
          (a.session.classCode ?? "").localeCompare(b.session.classCode ?? ""),
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
    const firstWithStudents = displayCampaigns.find(
      (c) => (courseStatsMap[c._id]?.studentCount ?? 0) > 0,
    );
    return firstWithStudents?._id ?? displayCampaigns[0]?._id ?? null;
  }, [chosenCampaignId, hierarchyMap, displayCampaigns, courseStatsMap]);

  // ── Danh sách Tháng của Khóa học đang chọn (Sắp xếp tăng dần theo Năm & Tháng) ─
  const { currentMonthsMap, sortedMonthKeys } = useMemo(() => {
    if (!activeCampaignId || !hierarchyMap[activeCampaignId]) {
      return { currentMonthsMap: {}, sortedMonthKeys: [] };
    }
    const { months, orderedMonths } = hierarchyMap[activeCampaignId];
    const allKeys = [
      ...new Set([...orderedMonths, ...Object.keys(months)]),
    ].sort((a, b) => {
      const [mA, yA] = String(a).split("/").map(Number);
      const [mB, yB] = String(b).split("/").map(Number);
      return yA !== yB ? yA - yB : mA - mB;
    });
    return { currentMonthsMap: months, sortedMonthKeys: allKeys };
  }, [hierarchyMap, activeCampaignId]);

  const activeMonthKey = useMemo(() => {
    if (selectedMonthKey && sortedMonthKeys.includes(selectedMonthKey)) {
      return selectedMonthKey;
    }
    const firstMonthWithStudents = sortedMonthKeys.find((mk) =>
      (currentMonthsMap[mk] ?? []).some((g) => g.students.length > 0),
    );
    const firstMonthWithClasses = sortedMonthKeys.find(
      (mk) => (currentMonthsMap[mk]?.length ?? 0) > 0,
    );
    return (
      firstMonthWithStudents ??
      firstMonthWithClasses ??
      sortedMonthKeys[0] ??
      null
    );
  }, [selectedMonthKey, sortedMonthKeys, currentMonthsMap]);

  // ── CRUD Handlers ──────────────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    setEditTarget(null);
    const activeGroups = currentMonthsMap[activeMonthKey] ?? [];
    const firstOpen = activeGroups.find(
      (g) =>
        g.session.status === "open" &&
        (g.session.currentBooked ?? 0) < (g.session.maxCapacity ?? 0),
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
        await api.post("/students", payload);
        message.success(`Đã thêm học viên "${payload.name}".`);
      }

      closeModal();
      await loadData(true);
    } catch (err) {
      modal.error({
        title: "Không thể lưu học viên",
        content: err.response?.data?.message || err.message || "Đã xảy ra lỗi.",
        okText: "Đã hiểu",
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
        setSessions((prev) =>
          prev.map((s) =>
            String(s._id) === String(record.sessionId)
              ? {
                  ...s,
                  currentBooked: Math.max(0, (s.currentBooked ?? 1) - 1),
                  status:
                    s.status === "full" &&
                    (s.currentBooked ?? 1) - 1 < s.maxCapacity
                      ? "open"
                      : s.status,
                }
              : s,
          ),
        );
      } catch (err) {
        message.error(
          err.response?.data?.message ||
            err.message ||
            "Không thể xóa học viên.",
        );
      }
    },
    [message],
  );

  const sessionOptions = useMemo(
    () =>
      [...sessions]
        .sort((a, b) => (a.classCode ?? "").localeCompare(b.classCode ?? ""))
        .map((s) => ({
          value: s._id,
          label: `[${s.classCode}] ${s.campaignId?.title || ""} (${s.timeSlot}) - Tháng ${s.campaignMonth} (${s.currentBooked}/${s.maxCapacity})`,
        })),
    [sessions],
  );

  const totalUnpaid = useMemo(
    () => students.filter((s) => !s.isFullyPaid).length,
    [students],
  );

  return (
    <>
      <PageHeader
        title="Quản lý Học viên"
        badgeText={
          students.length > 0
            ? `${students.length} học viên${totalUnpaid > 0 ? ` · ${totalUnpaid} còn nợ` : ""}`
            : null
        }
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
            style={{ width: "100%" }}
            id="search-student"
          />
        </Col>

        <Col xs={24} sm={10} md={6}>
          <Select
            placeholder="Trạng thái học phí"
            allowClear
            value={filterPaid}
            onChange={(val) => setFilterPaid(val ?? null)}
            style={{ width: "100%" }}
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

      {/* Tầng 2 & 3: Chọn Năm & Tháng (Đồng bộ với trang Quản lý Lớp học) -> Xem từng Lớp học & Học viên */}
      {loading ? (
        <Card loading style={{ borderRadius: 12, marginTop: 4 }} />
      ) : !activeCampaignId || sortedMonthKeys.length === 0 ? (
        <Empty
          description="Khóa học này chưa có lớp học hoặc học viên nào."
          style={{ padding: "48px 0" }}
        />
      ) : !isMobile ? (
        <div className="admin-saas-card">
          <StudentMonthBar
            sortedMonthKeys={sortedMonthKeys}
            currentMonthsMap={currentMonthsMap}
            selectedMonthKey={activeMonthKey}
            onSelectMonth={setSelectedMonthKey}
            isMobile={false}
          />

          <div style={{ padding: "14px 16px 16px" }}>
            <StudentMonthContent
              sessionGroups={currentMonthsMap[activeMonthKey] ?? []}
              isMobile={false}
              hasActiveFilter={hasActiveFilter}
              onAddStudentToClass={openCreateForClass}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          </div>
        </div>
      ) : (
        <div>
          <StudentMonthBar
            sortedMonthKeys={sortedMonthKeys}
            currentMonthsMap={currentMonthsMap}
            selectedMonthKey={activeMonthKey}
            onSelectMonth={setSelectedMonthKey}
            isMobile
          />

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
