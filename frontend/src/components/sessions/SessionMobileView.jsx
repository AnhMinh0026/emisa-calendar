import { memo } from 'react';
import { App, Card, Flex, Button, Dropdown, Typography, Empty } from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { T } from '../../constants';
import { ClassCodeTag, SessionStatusTag } from '../common/StatusTags';
import SessionMonthBar from './SessionMonthBar';

const { Text } = Typography;

const MobileSessionCard = memo(function MobileSessionCard({
  session,
  onDetail,
  onEdit,
  onDelete,
}) {
  const { modal } = App.useApp();

  const sortedDates = [...(session.studyDates ?? [])].sort(
    (a, b) => new Date(a) - new Date(b)
  );

  const actionItems = [
    {
      key: 'detail',
      icon: <EyeOutlined style={{ color: '#1E4DB7' }} />,
      label: <span id={`btn-detail-${session._id}`}>Xem chi tiết</span>,
      onClick: () => onDetail(session),
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: <span id={`btn-edit-${session._id}`}>Chỉnh sửa lớp</span>,
      onClick: () => onEdit(session),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      danger: true,
      icon: <DeleteOutlined />,
      label: <span id={`btn-delete-${session._id}`}>Xóa lớp học</span>,
      onClick: () => {
        modal.confirm({
          title: 'Xác nhận xóa',
          content: `Bạn chắc chắn muốn xóa lớp học "${session.classCode}"?`,
          okText: 'Xóa',
          okButtonProps: { danger: true },
          cancelText: 'Hủy',
          centered: true,
          onOk: () => onDelete(session),
        });
      },
    },
  ];

  return (
    <Card
      className="mobile-session-card"
      styles={{ body: { padding: '14px' } }}
      style={{
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        border: '1px solid #ECECEE',
        marginBottom: 10,
        opacity: session.isHidden ? 0.85 : 1,
      }}
    >
      {/* Header: Mã lớp + Giờ học & Menu Thao tác */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 10 }}>
        <Flex align="center" gap={8} style={{ minWidth: 0, flex: 1 }}>
          <ClassCodeTag code={session.classCode} fontSize={12} muted={session.status !== 'open'} />
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: T.black,
              letterSpacing: -0.2,
              whiteSpace: 'nowrap',
            }}
          >
            {session.timeSlot}
          </span>
          {session.isHidden && (
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
            id={`btn-actions-${session._id}`}
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        </Dropdown>
      </Flex>

      {/* Lịch ngày học tinh gọn */}
      {sortedDates.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            columnGap: 6,
            rowGap: 6,
            marginBottom: 10,
          }}
        >
          {sortedDates.map((date, index) => (
            <div
              key={index}
              style={{
                background: '#FAFAFC',
                border: '1px solid #ECECEE',
                borderRadius: 8,
                padding: '5px 4px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 10, color: '#8E8E93', lineHeight: 1.2 }}>
                Buổi {index + 1}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.black, lineHeight: 1.25 }}>
                {dayjs(date).format('DD/MM')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sĩ số & Trạng thái */}
      <Flex
        justify="space-between"
        align="center"
        style={{ paddingTop: 9, borderTop: '1px solid #F2F2F7' }}
      >
        <div style={{ fontSize: 13 }}>
          <Text style={{ color: '#6E6E73', fontSize: 13 }}>Sĩ số: </Text>
          <strong
            style={{
              color: session.currentBooked >= session.maxCapacity ? '#B91C1C' : T.black,
              fontWeight: 700,
            }}
          >
            {session.currentBooked}
          </strong>
          <span style={{ color: '#8E8E93' }}>/{session.maxCapacity} học viên</span>
        </div>
        <SessionStatusTag status={session.status} mobile />
      </Flex>
    </Card>
  );
});

/**
 * Giao diện Mobile cho SessionPage: Thanh chọn tháng khoa học + Danh sách thẻ lớp học
 */
export default function SessionMobileView({
  sortedMonthKeys,
  currentCampaignMonths,
  selectedMonthKey,
  onSelectMonth,
  sessions,
  onDetail,
  onEdit,
  onDelete,
}) {
  return (
    <div>
      <SessionMonthBar
        sortedMonthKeys={sortedMonthKeys}
        currentCampaignMonths={currentCampaignMonths}
        selectedMonthKey={selectedMonthKey}
        onSelectMonth={onSelectMonth}
        isMobile
      />

      {sessions.length === 0 ? (
        <Empty
          description="Tháng này chưa có lớp học."
          style={{
            padding: '36px 0',
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #ECECEE',
          }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {sessions.map((session) => (
            <MobileSessionCard
              key={session._id}
              session={session}
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
