import { memo } from 'react';
import { Card, Flex, Space, Button, Popconfirm, Typography, Tag, Empty, Switch } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ClassCodeTag, SessionStatusTag } from '../common/StatusTags';

const { Text } = Typography;

const MobileSessionCard = memo(function MobileSessionCard({
  session,
  togglingId,
  onToggleHidden,
  onDetail,
  onEdit,
  onDelete,
}) {
  return (
    <Card
      className="mobile-session-card"
      styles={{ body: { padding: '12px' } }}
      style={{
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        border: '1px solid #f0f0f0',
        marginBottom: 10,
        opacity: session.isHidden ? 0.85 : 1,
      }}
    >
      {/* Header: Mã lớp & Nhóm Icon Thao tác + Switch Ẩn/Hiện */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 10 }}>
        <Flex align="center" gap={6}>
          <ClassCodeTag code={session.classCode} fontSize={13} />
          {session.isHidden && (
            <Tag style={{ margin: 0, fontSize: 11, color: '#8c8c8c' }}>Đang ẩn</Tag>
          )}
        </Flex>
        <Space size={4} align="center">
          <Switch
            size="small"
            checked={!session.isHidden}
            loading={togglingId === session._id}
            onChange={() => onToggleHidden?.(session)}
            checkedChildren="Hiện"
            unCheckedChildren="Ẩn"
            style={{
              backgroundColor: !session.isHidden ? '#34C759' : undefined,
              marginRight: 2,
            }}
          />
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            style={{ color: '#1677ff' }}
            onClick={() => onDetail(session)}
            id={`btn-detail-${session._id}`}
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(session)}
            id={`btn-edit-${session._id}`}
          />
          <Popconfirm
            title="Xác nhận xóa"
            description={`Xóa lớp học "${session.classCode}"?`}
            onConfirm={() => onDelete(session)}
            okText="Xóa"
            okButtonProps={{ danger: true }}
            cancelText="Hủy"
            placement="bottomRight"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              id={`btn-delete-${session._id}`}
            />
          </Popconfirm>
        </Space>
      </Flex>

      {/* Giờ học */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <Text type="secondary" style={{ fontSize: 14, color: '#8c8c8c', flexShrink: 0 }}>
          Giờ học:
        </Text>
        <Text strong style={{ fontSize: 14, fontWeight: 600, color: '#1f1f1f' }}>
          {session.timeSlot}
        </Text>
      </div>

      {/* Ngày học */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <Text
          type="secondary"
          style={{
            fontSize: 14,
            color: '#8c8c8c',
            flexShrink: 0,
            paddingTop: 1,
          }}
        >
          Ngày học:
        </Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {session.studyDates?.map((date, index) => (
            <Tag
              key={index}
              color="blue"
              style={{ fontWeight: 600, fontSize: 12, margin: 0, padding: '1px 6px' }}
            >
              {dayjs(date).format('DD/MM')}
            </Tag>
          ))}
        </div>
      </div>

      {/* Sĩ số & Trạng thái */}
      <Flex
        justify="space-between"
        align="center"
        style={{ paddingTop: 8, borderTop: '1px dashed #f0f0f0' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text type="secondary" style={{ fontSize: 14, color: '#8c8c8c', flexShrink: 0 }}>
            Sĩ số:
          </Text>
          <span style={{ fontSize: 14 }}>
            <Text
              strong
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: session.currentBooked >= session.maxCapacity ? '#cf1322' : '#389e0d',
              }}
            >
              {session.currentBooked}
            </Text>
            <Text type="secondary" style={{ fontSize: 14, color: '#8c8c8c' }}>
              /{session.maxCapacity}
            </Text>
          </span>
        </div>
        <SessionStatusTag status={session.status} mobile />
      </Flex>
    </Card>
  );
});

/**
 * Giao diện Mobile cho SessionPage: Thanh chọn tháng dạng Pill cuộn ngang + Danh sách thẻ lớp học
 */
export default function SessionMobileView({
  sortedMonthKeys,
  currentCampaignMonths,
  selectedMonthKey,
  onSelectMonth,
  sessions,
  togglingId,
  onToggleHidden,
  onDetail,
  onEdit,
  onDelete,
}) {
  return (
    <div>
      {/* 1. Dải thẻ tháng dạng Pill cuộn ngang */}
      <div
        className="mobile-month-pills-bar"
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: '8px',
          padding: '8px 0 16px 0',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {sortedMonthKeys.map((mk) => {
          const monthData = currentCampaignMonths[mk];
          const label = monthData?.label ?? `Tháng ${mk}`;
          const count = monthData?.sessions?.length ?? 0;
          const isActive = mk === selectedMonthKey;

          return (
            <div
              key={mk}
              onClick={() => onSelectMonth(mk)}
              className="mobile-month-pill"
              style={{
                borderRadius: '20px',
                padding: '6px 16px',
                whiteSpace: 'nowrap',
                transition: 'all 0.3s',
                cursor: 'pointer',
                flexShrink: 0,
                userSelect: 'none',
                backgroundColor: isActive ? '#141414' : '#f0f2f5',
                color: isActive ? '#ffffff' : '#595959',
                fontWeight: isActive ? 600 : 400,
                fontSize: '13px',
                border: 'none',
                boxShadow: isActive ? '0 2px 6px rgba(0, 0, 0, 0.2)' : 'none',
              }}
            >
              {label} {count > 0 && `(${count})`}
            </div>
          );
        })}
      </div>

      {/* 2. Danh sách Card lớp học */}
      {sessions.length === 0 ? (
        <Empty
          description="Tháng này chưa có lớp học."
          style={{
            padding: '36px 0',
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #f0f0f0',
          }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {sessions.map((session) => (
            <MobileSessionCard
              key={session._id}
              session={session}
              togglingId={togglingId}
              onToggleHidden={onToggleHidden}
              onDetail={onDetail}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
