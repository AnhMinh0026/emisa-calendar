import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Table, Button, Input, Space, Tag, Popconfirm, App,
  Typography, Tooltip, Select, Switch, Col, Grid,
} from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';
import { MONTH_OPTIONS } from '../constants';
import useDebounce from '../hooks/useDebounce';
import PageHeader from '../components/common/PageHeader';
import FilterToolbar from '../components/common/FilterToolbar';
import CampaignFormModal from '../components/campaigns/CampaignFormModal';
import CampaignMobileList from '../components/campaigns/CampaignMobileList';

const { Text } = Typography;

export default function CampaignPage() {
  const { message, modal } = App.useApp();
  const screens = Grid.useBreakpoint();

  // ── State dữ liệu (Khởi tạo từ SWR Cache giúp chuyển trang tức thì) ────────
  const [campaigns, setCampaigns] = useState(
    () => api.getCached('/campaigns')?.data ?? []
  );
  const [loading, setLoading] = useState(() => !api.getCached('/campaigns'));
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // ── State Filter ───────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, 200);
  const [filterMonth, setFilterMonth] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ── Fetch dữ liệu ──────────────────────────────────────────────────────────
  const fetchCampaigns = useCallback(
    async (forceRefresh = false) => {
      try {
        const res = await api.fetchCached('/campaigns', { force: forceRefresh });
        setCampaigns(res?.data ?? []);
      } catch (err) {
        message.error(err.message || 'Không thể tải danh sách khóa học.');
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  useEffect(() => {
    let ignore = false;
    api
      .fetchCached('/campaigns')
      .then((res) => {
        if (!ignore) setCampaigns(res?.data ?? []);
      })
      .catch((err) => {
        if (!ignore) message.error(err.message || 'Không thể tải danh sách khóa học.');
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
          c.description?.toLowerCase().includes(kw)
      );
    }

    if (filterMonth) {
      result = result.filter(
        (c) => Array.isArray(c.months) && c.months.includes(filterMonth)
      );
    }

    return result;
  }, [campaigns, debouncedSearch, filterMonth]);

  const hasActiveFilter = Boolean(searchText.trim() || filterMonth);
  const resetFilters = useCallback(() => {
    setSearchText('');
    setFilterMonth(null);
  }, []);

  // ── CRUD Handlers (Cập nhật trực tiếp state nội bộ tránh giật/reload bảng) ─
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
            prev.map((c) => (c._id === editTarget._id ? data.data : c))
          );
        } else {
          fetchCampaigns(true);
        }
      } else {
        const { data } = await api.post('/campaigns', payload);
        message.success(`Đã tạo khóa học "${payload.title}".`);
        if (data?.data) {
          setCampaigns((prev) => [data.data, ...prev]);
        } else {
          fetchCampaigns(true);
        }
      }
      closeModal();
    } catch (err) {
      message.error(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
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
          title: 'Không thể xóa',
          content: err.message || 'Có lỗi xảy ra khi xóa khóa học.',
          okText: 'Đã hiểu',
        });
      }
    },
    [message, modal]
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
            : `Đã hiển thị khóa học "${record.title}".`
        );
        setCampaigns((prev) =>
          prev.map((c) => (c._id === record._id ? { ...c, isHidden: newHidden } : c))
        );
      } catch (err) {
        message.error(err.message || 'Không thể cập nhật trạng thái hiển thị.');
      } finally {
        setTogglingId(null);
      }
    },
    [message]
  );

  // ── Cột bảng Desktop ──────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        title: 'Tiêu đề',
        dataIndex: 'title',
        key: 'title',
        ellipsis: true,
        render: (text) => <Text strong>{text}</Text>,
      },
      {
        title: 'Mô tả',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        render: (text) => text || <Text type="secondary">—</Text>,
      },
      {
        title: 'Các tháng học',
        dataIndex: 'months',
        key: 'months',
        render: (months) =>
          Array.isArray(months) && months.length > 0 ? (
            <Space size={4} wrap>
              {months.map((m) => (
                <Tag key={m} color="blue" style={{ fontWeight: 600, fontSize: 12 }}>
                  {m}
                </Tag>
              ))}
            </Space>
          ) : (
            <Text type="secondary">—</Text>
          ),
      },
      {
        title: 'Hiển thị',
        dataIndex: 'isHidden',
        key: 'isHidden',
        width: 110,
        align: 'center',
        render: (_, record) => (
          <Tooltip
            title={
              !record.isHidden
                ? 'Đang hiển thị cho học viên (Click để ẩn)'
                : 'Đang ẩn khỏi học viên (Click để hiện)'
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
        title: 'Ngày tạo',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 155,
        align: 'center',
        render: (val) => (val ? dayjs(val).format('DD/MM/YYYY HH:mm') : '—'),
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 100,
        align: 'center',
        fixed: 'right',
        render: (_, record) => (
          <Space size={4}>
            <Tooltip title="Chỉnh sửa">
              <Button
                type="text"
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
    [togglingId, handleToggleHidden, openEdit, handleDelete]
  );

  return (
    <>
      <PageHeader
        title="Quản lý Khóa học"
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
            style={{ width: '100%' }}
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
            style={{ width: '100%' }}
            id="filter-campaign-month"
          />
        </Col>
      </FilterToolbar>

      {screens.md ? (
        <Table
          rowKey="_id"
          dataSource={filteredCampaigns}
          columns={columns}
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `${total} / ${campaigns.length} khóa học`,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
          }}
          scroll={{ x: 800 }}
          size="middle"
          locale={{
            emptyText: hasActiveFilter
              ? 'Không tìm thấy kết quả phù hợp.'
              : 'Chưa có khóa học nào. Hãy thêm mới!',
          }}
        />
      ) : (
        <CampaignMobileList
          loading={loading}
          campaigns={filteredCampaigns}
          hasActiveFilter={hasActiveFilter}
          togglingId={togglingId}
          onToggleHidden={handleToggleHidden}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
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
