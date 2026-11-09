import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Table,
  Button,
  Input,
  Space,
  Popconfirm,
  App,
  Typography,
  Tooltip,
  Select,
  Switch,
  Col,
  Grid,
} from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../services/api";
import { MONTH_OPTIONS, T } from "../constants";
import useDebounce from "../hooks/useDebounce";
import PageHeader from "../components/common/PageHeader";
import FilterToolbar from "../components/common/FilterToolbar";
import CampaignFormModal from "../components/campaigns/CampaignFormModal";
import CampaignMobileList from "../components/campaigns/CampaignMobileList";

const { Text } = Typography;

/**
 * Rút gọn danh sách tháng ['09/2026', '10/2026', '11/2026', '12/2026']
 * thành dạng Typography tinh gọn: Tháng 09 · 10 · 11 · 12 /2026 (thay cho hàng loạt Tag xanh)
 */
const renderCompactMonths = (months) => {
  if (!Array.isArray(months) || months.length === 0) {
    return <Text type="secondary">—</Text>;
  }

  const sorted = [...months].sort((a, b) => {
    const [mA, yA] = String(a).split("/").map(Number);
    const [mB, yB] = String(b).split("/").map(Number);
    return yA !== yB ? yA - yB : mA - mB;
  });

  const parsed = sorted.map((mk) => {
    const [mm, yyyy] = String(mk).split("/");
    return { raw: mk, mm: mm || mk, yyyy: yyyy || "" };
  });

  const years = [...new Set(parsed.map((p) => p.yyyy).filter(Boolean))];
  const sameYear = years.length === 1;

  return (
    <span style={{ fontSize: 13, lineHeight: 1.5 }}>
      <span style={{ color: "#6E6E73" }}>Tháng </span>
      <span style={{ color: T.black, fontWeight: 600 }}>
        {parsed.map((item, idx) => (
          <span key={item.raw}>
            {item.mm}
            {!sameYear && item.yyyy ? `/${item.yyyy}` : ""}
            {idx < parsed.length - 1 && (
              <span
                style={{ color: "#C7C7CC", fontWeight: 400, margin: "0 5px" }}
              >
                ·
              </span>
            )}
          </span>
        ))}
      </span>
      {sameYear && years[0] && (
        <span style={{ color: "#8E8E93", fontSize: 12.5, marginLeft: 3 }}>
          /{years[0]}
        </span>
      )}
    </span>
  );
};

export default function CampaignPage() {
  const { message, modal } = App.useApp();
  const screens = Grid.useBreakpoint();

  // ── State dữ liệu (Khởi tạo từ SWR Cache giúp chuyển trang tức thì) ────────
  const [campaigns, setCampaigns] = useState(
    () => api.getCached("/campaigns")?.data ?? [],
  );
  const [loading, setLoading] = useState(() => !api.getCached("/campaigns"));
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // ── State Filter ───────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounce(searchText, 200);
  const [filterMonth, setFilterMonth] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ── Fetch dữ liệu ──────────────────────────────────────────────────────────
  const fetchCampaigns = useCallback(
    async (forceRefresh = false) => {
      try {
        const res = await api.fetchCached("/campaigns", {
          force: forceRefresh,
        });
        setCampaigns(res?.data ?? []);
      } catch (err) {
        message.error(err.message || "Không thể tải danh sách khóa học.");
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  useEffect(() => {
    let ignore = false;
    api
      .fetchCached("/campaigns")
      .then((res) => {
        if (!ignore) setCampaigns(res?.data ?? []);
      })
      .catch((err) => {
        if (!ignore)
          message.error(err.message || "Không thể tải danh sách khóa học.");
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
    fetchCampaigns(true);
  }, [fetchCampaigns]);

  // ── Local Filter (Sử dụng debouncedSearch giúp gõ phím mượt khi nhiều data) ─
  const filteredCampaigns = useMemo(() => {
    let result = campaigns;

    if (debouncedSearch.trim()) {
      const kw = debouncedSearch.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.title?.toLowerCase().includes(kw) ||
          c.description?.toLowerCase().includes(kw),
      );
    }

    if (filterMonth) {
      result = result.filter(
        (c) => Array.isArray(c.months) && c.months.includes(filterMonth),
      );
    }

    return result;
  }, [campaigns, debouncedSearch, filterMonth]);

  const hasActiveFilter = Boolean(searchText.trim() || filterMonth);
  const resetFilters = useCallback(() => {
    setSearchText("");
    setFilterMonth(null);
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
        const { data } = await api.put(`/campaigns/${editTarget._id}`, payload);
        message.success(`Đã cập nhật khóa học "${payload.title}".`);
        if (data?.data) {
          setCampaigns((prev) =>
            prev.map((c) => (c._id === editTarget._id ? data.data : c)),
          );
        } else {
          fetchCampaigns(true);
        }
      } else {
        const { data } = await api.post("/campaigns", payload);
        message.success(`Đã tạo khóa học "${payload.title}".`);
        if (data?.data) {
          setCampaigns((prev) => [data.data, ...prev]);
        } else {
          fetchCampaigns(true);
        }
      }
      closeModal();
    } catch (err) {
      message.error(err.message || "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = useCallback(
    async (record) => {
      try {
        await api.delete(`/campaigns/${record._id}`);
        message.success(`Đã xóa khóa học "${record.title}".`);
        setCampaigns((prev) => prev.filter((c) => c._id !== record._id));
      } catch (err) {
        modal.error({
          title: "Không thể xóa",
          content: err.message || "Có lỗi xảy ra khi xóa khóa học.",
          okText: "Đã hiểu",
        });
      }
    },
    [message, modal],
  );

  const handleToggleHidden = useCallback(
    async (record) => {
      const newHidden = !record.isHidden;
      setTogglingId(record._id);
      try {
        await api.put(`/campaigns/${record._id}`, { isHidden: newHidden });
        message.success(
          newHidden
            ? `Đã ẩn khóa học "${record.title}".`
            : `Đã hiển thị khóa học "${record.title}".`,
        );
        setCampaigns((prev) =>
          prev.map((c) =>
            c._id === record._id ? { ...c, isHidden: newHidden } : c,
          ),
        );
      } catch (err) {
        message.error(err.message || "Không thể cập nhật trạng thái hiển thị.");
      } finally {
        setTogglingId(null);
      }
    },
    [message],
  );

  const visibleCount = useMemo(
    () => campaigns.filter((c) => !c.isHidden).length,
    [campaigns],
  );

  // ── Cột bảng Desktop ──────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        title: "Khóa học",
        dataIndex: "title",
        key: "title",
        width: 200,
        ellipsis: true,
        render: (text) => (
          <Text
            strong
            style={{ color: T.black, fontSize: 13.5, letterSpacing: -0.2 }}
          >
            {text}
          </Text>
        ),
      },
      {
        title: "Mô tả chi tiết",
        dataIndex: "description",
        width: 200,
        key: "description",
        ellipsis: true,
        render: (text) =>
          text ? (
            <span style={{ color: "#6E6E73", fontSize: 13 }}>{text}</span>
          ) : (
            <Text type="secondary">—</Text>
          ),
      },
      {
        title: "Lịch khai giảng",
        dataIndex: "months",
        key: "months",
        width: 250,
        render: (months) => renderCompactMonths(months),
      },
      {
        title: "Hiển thị",
        dataIndex: "isHidden",
        key: "isHidden",
        width: 110,
        align: "center",
        render: (_, record) => (
          <Tooltip
            title={
              !record.isHidden
                ? "Đang hiển thị cho học viên (Click để ẩn)"
                : "Đang ẩn khỏi học viên (Click để hiện)"
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
        title: "Ngày tạo",
        dataIndex: "createdAt",
        key: "createdAt",
        width: 145,
        align: "center",
        render: (val) => (
          <span style={{ color: "#6E6E73", fontSize: 12.5 }}>
            {val ? dayjs(val).format("DD/MM/YYYY HH:mm") : "—"}
          </span>
        ),
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 96,
        align: "center",
        fixed: "right",
        render: (_, record) => (
          <Space size={2}>
            <Tooltip title="Chỉnh sửa">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEdit(record)}
                id={`btn-edit-campaign-${record._id}`}
              />
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
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  id={`btn-delete-campaign-${record._id}`}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [togglingId, handleToggleHidden, openEdit, handleDelete],
  );

  return (
    <>
      <PageHeader
        title="Quản lý Khóa học"
        badgeText={
          campaigns.length > 0
            ? `${campaigns.length} khóa học · ${visibleCount} đang hiện`
            : null
        }
        loading={loading}
        onReload={handleReload}
        isFilterOpen={isFilterOpen}
        onToggleFilter={() => setIsFilterOpen((prev) => !prev)}
        hasActiveFilter={hasActiveFilter}
        filterBtnId="btn-toggle-filter-campaign"
        onAdd={openCreate}
        addLabel="Thêm Khóa học"
        addBtnId="btn-add-campaign"
      />

      {screens.md ? (
        <div className="admin-saas-card">
          <FilterToolbar
            attached
            isOpen={isFilterOpen}
            hasActiveFilter={hasActiveFilter}
            filteredCount={filteredCampaigns.length}
            totalCount={campaigns.length}
            unitLabel="kết quả"
            onReset={resetFilters}
          >
            <Col xs={24} sm={12} md={8}>
              <Input.Search
                placeholder="Tìm theo tên khóa học..."
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: "100%" }}
                id="search-campaign"
              />
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Lọc theo tháng"
                allowClear
                showSearch
                value={filterMonth}
                onChange={(val) => setFilterMonth(val ?? null)}
                options={MONTH_OPTIONS}
                style={{ width: "100%" }}
                id="filter-campaign-month"
              />
            </Col>
          </FilterToolbar>

          <Table
            rowKey="_id"
            dataSource={filteredCampaigns}
            columns={columns}
            loading={loading}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `${total} / ${campaigns.length} khóa học`,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50"],
              style: { padding: "0 16px", margin: "12px 0" },
            }}
            scroll={{ x: 800 }}
            size="middle"
            locale={{
              emptyText: hasActiveFilter
                ? "Không tìm thấy kết quả phù hợp."
                : "Chưa có khóa học nào. Hãy thêm mới!",
            }}
          />
        </div>
      ) : (
        <>
          <FilterToolbar
            isOpen={isFilterOpen}
            hasActiveFilter={hasActiveFilter}
            filteredCount={filteredCampaigns.length}
            totalCount={campaigns.length}
            unitLabel="kết quả"
            onReset={resetFilters}
          >
            <Col xs={24} sm={12} md={8}>
              <Input.Search
                placeholder="Tìm theo tên khóa học..."
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: "100%" }}
                id="search-campaign"
              />
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Lọc theo tháng"
                allowClear
                showSearch
                value={filterMonth}
                onChange={(val) => setFilterMonth(val ?? null)}
                options={MONTH_OPTIONS}
                style={{ width: "100%" }}
                id="filter-campaign-month"
              />
            </Col>
          </FilterToolbar>

          <CampaignMobileList
            loading={loading}
            campaigns={filteredCampaigns}
            hasActiveFilter={hasActiveFilter}
            togglingId={togglingId}
            onToggleHidden={handleToggleHidden}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </>
      )}

      <CampaignFormModal
        open={modalOpen}
        editTarget={editTarget}
        submitting={submitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </>
  );
}
