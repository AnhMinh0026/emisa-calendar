import { memo, useState } from 'react';
import { App, Card, Empty, Button, Dropdown, Pagination, Flex } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  MenuOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { T } from '../../constants';

const PAGE_SIZE = 10;

const renderCompactMonthsMobile = (months) => {
  if (!Array.isArray(months) || months.length === 0) return null;

  const sorted = [...months].sort((a, b) => {
    const [mA, yA] = String(a).split('/').map(Number);
    const [mB, yB] = String(b).split('/').map(Number);
    return yA !== yB ? yA - yB : mA - mB;
  });

  const parsed = sorted.map((mk) => {
    const [mm, yyyy] = String(mk).split('/');
    return { raw: mk, mm: mm || mk, yyyy: yyyy || '' };
  });

  const years = [...new Set(parsed.map((p) => p.yyyy).filter(Boolean))];
  const sameYear = years.length === 1;

  return (
    <div
      style={{
        marginTop: 10,
        paddingTop: 9,
        borderTop: '1px solid #F2F2F7',
        fontSize: 12.5,
      }}
    >
      <span style={{ color: '#8E8E93' }}>Lịch khai giảng: </span>
      <span style={{ color: T.black, fontWeight: 600 }}>
        Tháng{' '}
        {parsed.map((item, idx) => (
          <span key={item.raw}>
            {item.mm}
            {!sameYear && item.yyyy ? `/${item.yyyy}` : ''}
            {idx < parsed.length - 1 && (
              <span style={{ color: '#C7C7CC', fontWeight: 400, margin: '0 4px' }}>·</span>
            )}
          </span>
        ))}
      </span>
      {sameYear && years[0] && (
        <span style={{ color: '#8E8E93', fontSize: 12, marginLeft: 3 }}>/{years[0]}</span>
      )}
    </div>
  );
};

const CampaignMobileCard = memo(function CampaignMobileCard({
  record,
  togglingId,
  onToggleHidden,
  onEdit,
  onDelete,
}) {
  const { modal } = App.useApp();

  const actionItems = [
    {
      key: 'toggle-hidden',
      disabled: togglingId === record._id,
      icon: record.isHidden ? (
        <EyeOutlined style={{ color: '#1E4DB7' }} />
      ) : (
        <EyeInvisibleOutlined style={{ color: '#64748B' }} />
      ),
      label: (
        <span id={`btn-toggle-campaign-${record._id}`}>
          {record.isHidden ? 'Hiển thị khóa học' : 'Ẩn khóa học'}
        </span>
      ),
      onClick: () => onToggleHidden(record),
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: <span id={`btn-edit-campaign-${record._id}`}>Chỉnh sửa khóa học</span>,
      onClick: () => onEdit(record),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      danger: true,
      icon: <DeleteOutlined />,
      label: <span id={`btn-delete-campaign-${record._id}`}>Xóa khóa học</span>,
      onClick: () => {
        modal.confirm({
          title: 'Xác nhận xóa',
          content: `Bạn chắc chắn muốn xóa khóa học "${record.title}"?`,
          okText: 'Xóa',
          okButtonProps: { danger: true },
          cancelText: 'Hủy',
          centered: true,
          onOk: () => onDelete(record),
        });
      },
    },
  ];

  return (
    <div
      className="mobile-campaign-card"
      style={{
        padding: '15px 16px',
        border: '1px solid #ECECEE',
        borderRadius: 12,
        marginBottom: 10,
        backgroundColor: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        opacity: record.isHidden ? 0.85 : 1,
      }}
    >
      {/* Header: Tiêu đề & Menu Thao tác */}
      <Flex justify="space-between" align="center" gap={10}>
        <Flex align="center" gap={8} wrap="wrap" style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              fontWeight: 700,
              fontSize: 15,
              color: T.black,
              lineHeight: 1.35,
              letterSpacing: -0.2,
            }}
          >
            {record.title}
          </span>
          {record.isHidden && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: '#64748B',
                background: '#F1F5F9',
                padding: '1px 7px',
                borderRadius: 6,
                whiteSpace: 'nowrap',
              }}
            >
              Đang ẩn
            </span>
          )}
        </Flex>

        <Dropdown
          menu={{ items: actionItems }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            type="text"
            size="small"
            icon={<MenuOutlined style={{ fontSize: 14, color: '#475569' }} />}
            id={`btn-actions-campaign-${record._id}`}
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        </Dropdown>
      </Flex>

      {/* Mô tả */}
      {record.description?.trim() && (
        <div
          style={{
            marginTop: 6,
            color: '#6E6E73',
            fontSize: 13,
            lineHeight: 1.5,
            whiteSpace: 'normal',
            wordWrap: 'break-word',
          }}
        >
          {record.description}
        </div>
      )}

      {/* Các tháng học tinh gọn */}
      {renderCompactMonthsMobile(record.months)}
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
    return <Card loading style={{ borderRadius: 12, marginBottom: 12 }} />;
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
