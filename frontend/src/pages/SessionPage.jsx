import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Popconfirm,
  App,
  Typography,
  Tooltip,
  Empty,
  Card,
  Col,
  Grid,
  Switch,
} from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../services/api";
import { SESSION_STATUS_OPTIONS, T } from "../constants";
import { groupSessionsByCampaign } from "../utils/formatters";
import useDebounce from "../hooks/useDebounce";
import PageHeader from "../components/common/PageHeader";
import FilterToolbar from "../components/common/FilterToolbar";
import {
  ClassCodeTag,
  SessionStatusTag,
} from "../components/common/StatusTags";
import CourseSelectorCard from "../components/sessions/CourseSelectorCard";
import SessionMonthBar from "../components/sessions/SessionMonthBar";
import SessionFormModal from "../components/sessions/SessionFormModal";
import SessionDetailModal from "../components/sessions/SessionDetailModal";
import SessionMobileView from "../components/sessions/SessionMobileView";

const { Text } = Typography;

export default function SessionPage() {
  const { message, modal } = App.useApp();
  const screens = Grid.useBreakpoint();

  // ── State dữ liệu (Khởi tạo từ SWR Cache giúp chuyển trang tức thì) ────────
  const [sessions, setSessions] = useState(
    () => api.getCached("/sessions")?.data ?? [],
  );
  const [campaigns, setCampaigns] = useState(
    () => api.getCached("/campaigns")?.data ?? [],
  );
  const [loading, setLoading] = useState(() => !api.getCached("/sessions"));
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // ── State Filter & Chọn khóa học / tháng ───────────────────────────────────
  const [searchCode, setSearchCode] = useState("");
  const debouncedSearchCode = useDebounce(searchCode, 200);
  const [filterStatus, setFilterStatus] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [chosenCampaignId, setChosenCampaignId] = useState(null);
  const [chosenMonthKey, setChosenMonthKey] = useState(null);

  // ── Gọi song song (Parallel Fetch) + SWR Cache ─────────────────────────────
  const loadData = useCallback(
    async (forceRefresh = false) => {
      try {
        const [sessionsRes, campaignsRes] = await Promise.all([
          api.fetchCached("/sessions", { force: forceRefresh }),
          api
            .fetchCached("/campaigns", { force: forceRefresh })
            .catch(() => null),
        ]);
        if (sessionsRes?.data) setSessions(sessionsRes.data);
        if (campaignsRes?.data) setCampaigns(campaignsRes.data);
      } catch (err) {
        message.error(err.message || "Không thể tải danh sách lớp học.");
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  useEffect(() => {
    let ignore = false;
    Promise.all([
      api.fetchCached("/sessions"),
      api.fetchCached("/campaigns").catch(() => null),
    ])
      .then(([sessionsRes, campaignsRes]) => {
        if (ignore) return;
        if (sessionsRes?.data) setSessions(sessionsRes.data);
        if (campaignsRes?.data) setCampaigns(campaignsRes.data);
      })
      .catch((err) => {
        if (!ignore)
          message.error(err.message || "Không thể tải danh sách lớp học.");
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
    [sessions, selectedSessionId],
  );

  // ── Cập nhật 1 session ngay lập tức khi thêm/xóa học viên trong DetailModal ─
  const handleSessionUpdated = useCallback(async (updatedSession) => {
    if (updatedSession && updatedSession._id) {
      setSessions((prev) =>
        prev.map((s) => (s._id === updatedSession._id ? updatedSession : s)),
      );
    } else {
      const res = await api.fetchCached("/sessions", { force: true });
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

  // ── Nhóm dữ liệu phân cấp (Bao gồm cả các tháng chưa có lớp của Khóa học) ──
  const groupedData = useMemo(() => {
    const base = groupSessionsByCampaign(filteredSessions);

    campaigns.forEach((camp) => {
      if (!base[camp._id]) {
        base[camp._id] = {
          campaign: camp,
          months: {},
          orderedMonths: camp.months ?? [],
        };
      } else {
        base[camp._id].campaign = camp;
        base[camp._id].orderedMonths =
          camp.months ?? base[camp._id].orderedMonths ?? [];
      }

      (camp.months ?? []).forEach((mk) => {
        if (!base[camp._id].months[mk]) {
          base[camp._id].months[mk] = {
            label: `Tháng ${mk}`,
            sessions: [],
          };
        }
      });
    });

    return base;
  }, [filteredSessions, campaigns]);

  const campaignIds = useMemo(() => Object.keys(groupedData), [groupedData]);

  const activeCampaignId = useMemo(() => {
    if (
      chosenCampaignId &&
      (campaignIds.includes(chosenCampaignId) ||
        campaigns.some((c) => c._id === chosenCampaignId))
    ) {
      return chosenCampaignId;
    }
    const firstWithSessions = campaigns.find((c) => {
      const g = groupedData[c._id];
      return g && Object.values(g.months).some((m) => m.sessions.length > 0);
    });
    return (
      firstWithSessions?._id ?? campaignIds[0] ?? campaigns[0]?._id ?? null
    );
  }, [chosenCampaignId, campaignIds, campaigns, groupedData]);

  // ── Dữ liệu Tháng & Lớp học theo Campaign đang chọn ────────────────────────
  const { currentCampaignMonths, sortedMonthKeys } = useMemo(() => {
    if (!activeCampaignId || !groupedData[activeCampaignId]) {
      return { currentCampaignMonths: {}, sortedMonthKeys: [] };
    }
    const { months, orderedMonths } = groupedData[activeCampaignId];
    const allKeys = [
      ...new Set([...orderedMonths, ...Object.keys(months)]),
    ].sort((a, b) => {
      const [mA, yA] = String(a).split("/").map(Number);
      const [mB, yB] = String(b).split("/").map(Number);
      return yA !== yB ? yA - yB : mA - mB;
    });

    return { currentCampaignMonths: months, sortedMonthKeys: allKeys };
  }, [groupedData, activeCampaignId]);

  const selectedMonthKey = useMemo(() => {
    if (chosenMonthKey && sortedMonthKeys.includes(chosenMonthKey)) {
      return chosenMonthKey;
    }
    const firstWithSessions = sortedMonthKeys.find(
      (mk) => (currentCampaignMonths[mk]?.sessions?.length ?? 0) > 0,
    );
    return firstWithSessions ?? sortedMonthKeys[0] ?? null;
  }, [chosenMonthKey, sortedMonthKeys, currentCampaignMonths]);

  const activeMonthSessions = useMemo(() => {
    if (!selectedMonthKey || !currentCampaignMonths[selectedMonthKey]) {
      return [];
    }
    return [...currentCampaignMonths[selectedMonthKey].sessions].sort((a, b) =>
      a.classCode.localeCompare(b.classCode),
    );
  }, [selectedMonthKey, currentCampaignMonths]);

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
            prev.map((s) => (s._id === editTarget._id ? data.data : s)),
          );
        } else {
          await loadData(true);
        }
      } else {
        const { data } = await api.post("/sessions", payload);
        message.success(`Đã tạo lớp học "${payload.classCode}".`);
        if (data?.data?._id) {
          setSessions((prev) => [data.data, ...prev]);
        } else {
          const res = await api.fetchCached("/sessions", { force: true });
          if (res?.data) setSessions(res.data);
        }
        if (payload.campaignId) setChosenCampaignId(payload.campaignId);
        if (payload.campaignMonth) setChosenMonthKey(payload.campaignMonth);
      }
      closeModal();
    } catch (err) {
      modal.error({
        title: "Không thể lưu lớp học",
        content: err.response?.data?.message || err.message || "Đã xảy ra lỗi.",
        okText: "Đã hiểu",
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
        const { data } = await api.put(`/sessions/${record._id}`, {
          isHidden: newHidden,
        });
        message.success(
          newHidden
            ? `Đã ẩn lớp "${record.classCode}" khỏi trang lịch học công khai.`
            : `Đã hiển thị công khai lớp "${record.classCode}".`,
        );
        setSessions((prev) =>
          prev.map((s) =>
            s._id === record._id
              ? data?.data?._id
                ? data.data
                : { ...s, isHidden: newHidden }
              : s,
          ),
        );
      } catch (err) {
        message.error(
          err.response?.data?.message ||
            err.message ||
            "Không thể cập nhật trạng thái hiển thị.",
        );
      } finally {
        setTogglingId(null);
      }
    },
    [message],
  );

  const handleDelete = useCallback(
    async (record) => {
      try {
        await api.delete(`/sessions/${record._id}`);
        message.success(`Đã xóa lớp học "${record.classCode}".`);
        setSessions((prev) => prev.filter((s) => s._id !== record._id));
      } catch (err) {
        message.error(
          err.response?.data?.message ||
            err.message ||
            "Không thể xóa lớp học.",
        );
      }
    },
    [message],
  );

  const openDetail = useCallback((record) => {
    setSelectedSessionId(record._id);
    setDetailOpen(true);
  }, []);
  const closeDetail = useCallback(() => setDetailOpen(false), []);

  // ── Cột bảng Session (Desktop): Tinh gọn, loại bỏ hoàn toàn Tag xanh/tím thừa ──
  const sessionColumns = useMemo(
    () => [
      {
        title: "Mã lớp",
        dataIndex: "classCode",
        key: "classCode",
        width: 105,
        sorter: (a, b) => a.classCode.localeCompare(b.classCode),
        defaultSortOrder: "ascend",
        render: (val, record) => (
          <ClassCodeTag code={val} muted={record.status !== "open"} />
        ),
      },
      {
        title: "Khung giờ",
        dataIndex: "timeSlot",
        key: "timeSlot",
        width: 155,
        render: (val) => (
          <span
            style={{
              fontWeight: 600,
              fontSize: 13.5,
              color: T.black,
              letterSpacing: -0.2,
            }}
          >
            {val}
          </span>
        ),
      },
      {
        title: "Lịch ngày học",
        key: "studyDates",
        width: 240,
        render: (_, record) => {
          const sortedDates = [...(record.studyDates ?? [])].sort(
            (a, b) => new Date(a) - new Date(b),
          );
          if (sortedDates.length === 0) return <Text type="secondary">—</Text>;

          return (
            <Tooltip
              title={sortedDates
                .map((d) => dayjs(d).format("DD/MM/YYYY"))
                .join(" · ")}
            >
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                <span style={{ color: T.black, fontWeight: 600 }}>
                  {sortedDates.map((date, index) => (
                    <span key={index} style={{ whiteSpace: "nowrap" }}>
                      {dayjs(date).format("DD/MM")}
                      {index < sortedDates.length - 1 && (
                        <span
                          style={{
                            color: "#C7C7CC",
                            fontWeight: 400,
                            margin: "0 5px",
                          }}
                        >
                          ·
                        </span>
                      )}
                    </span>
                  ))}
                </span>
                <span style={{ color: "#8E8E93", fontSize: 12, marginLeft: 6 }}>
                  ({sortedDates.length} buổi)
                </span>
              </div>
            </Tooltip>
          );
        },
      },
      {
        title: "Sĩ số",
        key: "capacity",
        width: 100,
        align: "center",
        render: (_, record) => {
          const isReached = record.currentBooked >= record.maxCapacity;
          return (
            <span style={{ fontSize: 13 }}>
              <strong
                style={{
                  color: isReached ? "#B91C1C" : T.black,
                  fontWeight: 700,
                }}
              >
                {record.currentBooked}
              </strong>
              <span style={{ color: "#8E8E93" }}> / {record.maxCapacity}</span>
            </span>
          );
        },
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        key: "status",
        width: 110,
        align: "center",
        render: (val) => <SessionStatusTag status={val} />,
      },
      {
        title: "Hiển thị",
        dataIndex: "isHidden",
        key: "isHidden",
        width: 105,
        align: "center",
        render: (_, record) => (
          <Tooltip
            title={
              !record.isHidden
                ? "Đang hiển thị trên lịch học Public (Click để ẩn)"
                : "Đang ẩn khỏi lịch học Public (Click để hiện)"
            }
          >
            <Switch
              checked={!record.isHidden}
              loading={togglingId === record._id}
              onChange={() => handleToggleHidden(record)}
              checkedChildren="Hiện"
              unCheckedChildren="Ẩn"
              style={{
                backgroundColor: !record.isHidden ? "#34C759" : undefined,
              }}
            />
          </Tooltip>
        ),
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 115,
        align: "center",
        fixed: "right",
        render: (_, record) => (
          <Space size={2}>
            <Tooltip title="Chi tiết học viên">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                style={{ color: "#1E4DB7" }}
                onClick={() => openDetail(record)}
                id={`btn-detail-${record._id}`}
              />
            </Tooltip>
            <Tooltip title="Chỉnh sửa">
              <Button
                type="text"
                size="small"
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
                  size="small"
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
    [togglingId, handleToggleHidden, openDetail, openEdit, handleDelete],
  );

  const hasActiveFilter = Boolean(searchCode.trim() || filterStatus);
  const resetFilters = useCallback(() => {
    setSearchCode("");
    setFilterStatus(null);
  }, []);

  const openSessionCount = useMemo(
    () => sessions.filter((s) => s.status === "open").length,
    [sessions],
  );

  return (
    <>
      <PageHeader
        title="Quản lý Lớp học"
        badgeText={
          sessions.length > 0
            ? `${sessions.length} lớp · ${openSessionCount} đang mở`
            : null
        }
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
            Đang lọc —{" "}
            <strong style={{ color: T.black }}>
              {filteredSessions.length}
            </strong>{" "}
            lớp
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
            style={{ width: "100%" }}
            id="search-session-code"
          />
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Select
            placeholder="Lọc trạng thái"
            allowClear
            value={filterStatus}
            onChange={(val) => setFilterStatus(val ?? null)}
            style={{ width: "100%" }}
            id="filter-session-status"
            options={SESSION_STATUS_OPTIONS}
          />
        </Col>
      </FilterToolbar>

      <CourseSelectorCard
        campaigns={campaigns}
        groupedData={groupedData}
        activeCampaignId={activeCampaignId}
        onSelectCampaign={(id) => {
          setChosenCampaignId(id);
          setChosenMonthKey(null);
        }}
      />

      {loading ? (
        !screens.md ? (
          <Card loading style={{ borderRadius: 12, marginTop: 4 }} />
        ) : (
          <div className="admin-saas-card">
            <Table
              loading={loading}
              dataSource={[]}
              columns={sessionColumns}
              scroll={{ x: 800 }}
            />
          </div>
        )
      ) : !activeCampaignId || sortedMonthKeys.length === 0 ? (
        <Empty
          description={
            hasActiveFilter
              ? "Không tìm thấy lớp học nào phù hợp với bộ lọc."
              : "Khóa học này chưa có lớp học nào. Hãy thêm mới!"
          }
          style={{ padding: "48px 0" }}
        />
      ) : screens.md ? (
        <div className="admin-saas-card">
          {/* Thanh chọn Tháng khoa học kèm thống kê nhanh */}
          <SessionMonthBar
            sortedMonthKeys={sortedMonthKeys}
            currentCampaignMonths={currentCampaignMonths}
            selectedMonthKey={selectedMonthKey}
            onSelectMonth={setChosenMonthKey}
            isMobile={false}
          />

          <Table
            rowKey="_id"
            dataSource={activeMonthSessions}
            columns={sessionColumns}
            size="middle"
            scroll={{ x: 800 }}
            pagination={
              activeMonthSessions.length > 8
                ? {
                    pageSize: 8,
                    showTotal: (t) => `${t} lớp`,
                    showSizeChanger: false,
                    style: { padding: "0 16px", margin: "12px 0" },
                  }
                : false
            }
            locale={{
              emptyText: `Tháng ${selectedMonthKey} chưa có lớp học nào.`,
            }}
          />
        </div>
      ) : (
        <SessionMobileView
          sortedMonthKeys={sortedMonthKeys}
          currentCampaignMonths={currentCampaignMonths}
          selectedMonthKey={selectedMonthKey}
          onSelectMonth={setChosenMonthKey}
          sessions={activeMonthSessions}
          onDetail={openDetail}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      <SessionFormModal
        open={modalOpen}
        editTarget={editTarget}
        campaigns={campaigns}
        defaultCampaignId={activeCampaignId}
        defaultMonth={selectedMonthKey}
        submitting={submitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <SessionDetailModal
        open={detailOpen && !!selectedSession}
        session={selectedSession}
        onClose={closeDetail}
        onSessionUpdated={handleSessionUpdated}
      />
    </>
  );
}
