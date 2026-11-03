import { memo, useState } from 'react';
import { Card, Empty, Switch, Button, Popconfirm, Tag, Pagination } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

const PAGE_SIZE = 10;

const CampaignMobileCard = memo(function CampaignMobileCard({
  record,
  togglingId,
  onToggleHidden,
  onEdit,
  onDelete,
}) {
  return (
    <div
      className="mobile-campaign-card"
      style={{
        padding: '16px',
        border: '1px solid #f0f0f0',
        borderRadius: '8px',
        marginBottom: '12px',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Header: Tiêu đề & Thao tác */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div
          style={{
            flex: 1,
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            fontWeight: 'bold',
            fontSize: '15px',
            color: '#1f1f1f',
            lineHeight: 1.4,
          }}
        >
          {record.title}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <Switch
            size="small"
            checked={!record.isHidden}
            loading={togglingId === record._id}
            onChange={() => onToggleHidden(record)}
            checkedChildren="Hiện"
            unCheckedChildren="Ẩn"
            style={{
              backgroundColor: !record.isHidden ? '#34C759' : undefined,
            }}
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
            id={`btn-edit-campaign-${record._id}`}
          />
          <Popconfirm
            title="Xác nhận xóa"
            description={`Bạn chắc chắn muốn xóa khóa học "${record.title}"?`}
            onConfirm={() => onDelete(record)}
            okText="Xóa"
            okButtonProps={{ danger: true }}
            cancelText="Hủy"
            placement="topRight"
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              id={`btn-delete-campaign-${record._id}`}
            />
          </Popconfirm>
        </div>
      </div>

      {/* Mô tả */}
      <div
        style={{
          marginTop: '8px',
          color: '#666666',
          fontSize: '13px',
          lineHeight: 1.5,
          whiteSpace: 'normal',
          wordWrap: 'break-word',
        }}
      >
        {record.description?.trim() ? record.description : '—'}
      </div>

      {/* Các tháng học */}
      {Array.isArray(record.months) && record.months.length > 0 && (
        <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {record.months.map((m) => (
            <Tag key={m} color="blue" style={{ fontWeight: 600, fontSize: 11, margin: 0 }}>
              {m}
            </Tag>
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * Danh sách thẻ khóa học trên giao diện Mobile (tích hợp phân trang khi dữ liệu lớn)
 */
export default function CampaignMobileList({
  loading,
  campaigns,
  hasActiveFilter,
  togglingId,
  onToggleHidden,
  onEdit,
  onDelete,
}) {
  const [page, setPage] = useState(1);

  if (loading) {
    return <Card loading style={{ borderRadius: 8, marginBottom: 12 }} />;
  }

  if (campaigns.length === 0) {
    return (
      <Empty
        description={
          hasActiveFilter
            ? 'Không tìm thấy kết quả phù hợp.'
            : 'Chưa có khóa học nào. Hãy thêm mới!'
        }
        style={{ padding: '32px 0' }}
      />
    );
  }

  const maxPage = Math.max(1, Math.ceil(campaigns.length / PAGE_SIZE));
  const currentPage = Math.min(page, maxPage);
  const pagedData = campaigns.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {pagedData.map((record) => (
        <CampaignMobileCard
          key={record._id}
          record={record}
          togglingId={togglingId}
          onToggleHidden={onToggleHidden}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}

      {campaigns.length > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <Pagination
            size="small"
            current={currentPage}
            pageSize={PAGE_SIZE}
            total={campaigns.length}
            onChange={setPage}
            showSizeChanger={false}
          />
        </div>
      )}
    </div>
  );
}
