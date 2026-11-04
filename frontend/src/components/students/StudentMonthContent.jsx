import { memo, useState, useMemo } from 'react';
import {
  Table, Button, Space, Popconfirm, Typography, Tooltip, Tag, Flex, Empty, Switch,
} from 'antd';
import {
  EditOutlined, DeleteOutlined, PlusOutlined, PhoneOutlined, ClockCircleOutlined, CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { fmtMoney } from '../../utils/formatters';
import { ClassCodeTag, PaymentStatusTag, SessionStatusTag } from '../common/StatusTags';

const { Text } = Typography;

/**
 * Thẻ hiển thị 1 học viên trên giao diện Mobile (bên trong khối Lớp học)
 */
const MobileStudentRow = memo(function MobileStudentRow({ st, idx, onEdit, onDelete }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderTop: idx === 0 ? 'none' : '1px solid #f0f0f0',
        background: '#fff',
      }}
    >
      <Flex justify="space-between" align="flex-start" gap={8}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Flex align="center" gap={6} wrap="wrap">
            <Text type="secondary" style={{ fontSize: 12 }}>
              #{idx + 1}
            </Text>
            <Text strong style={{ fontSize: 14, color: '#1f1f1f' }}>
              {st.name}
            </Text>
            <Text code style={{ fontSize: 11.5 }}>
              <PhoneOutlined style={{ marginRight: 3, color: '#888' }} />
              {st.phone}
            </Text>
          </Flex>

          <Flex align="center" gap={6} wrap="wrap" style={{ marginTop: 6 }}>
            <Tag color="blue" style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>
              Cọc: {fmtMoney(st.depositAmount)}
            </Tag>
            {st.isFullyPaid ? (
              <Tag color="success" style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>
                ✓ Đã đóng xong
              </Tag>
            ) : (
              <Tag color="error" style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>
                Nợ: {fmtMoney(st.remainingAmount)}
              </Tag>
            )}
            {st.paymentNote && (
              <Text
                type="secondary"
                style={{ fontSize: 11.5, fontStyle: 'italic' }}
              >
                • {st.paymentNote}
              </Text>
            )}
          </Flex>
        </div>

        <Space size={2} style={{ flexShrink: 0 }}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(st)}
            id={`btn-edit-student-mob-${st._id}`}
          />
          <Popconfirm
            title="Xác nhận xóa"
            description={`Xóa học viên "${st.name}"?`}
            onConfirm={() => onDelete(st)}
            okText="Xóa"
            okButtonProps={{ danger: true }}
            cancelText="Hủy"
            placement="bottomRight"
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              id={`btn-delete-student-mob-${st._id}`}
            />
          </Popconfirm>
        </Space>
      </Flex>
    </div>
  );
});

/**
 * Khối hiển thị 1 Lớp học kèm danh sách học viên của lớp đó
 */
const ClassStudentSection = memo(function ClassStudentSection({
  sessionGroup,
  isMobile,
  columns,
  onAddStudentToClass,
  onEdit,
  onDelete,
}) {
  const { session, students } = sessionGroup;
  const unpaidCount = students.filter((s) => !s.isFullyPaid).length;
  const sortedDates = [...(session.studyDates ?? [])].sort((a, b) => new Date(a) - new Date(b));
  const canAddMore =
    session.status === 'open' && (session.currentBooked ?? 0) < (session.maxCapacity ?? 0);

  return (
    <div
      style={{
        border: '1px solid #e8e8e8',
        borderRadius: 10,
        background: '#fff',
        overflow: 'hidden',
        marginBottom: 16,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
      }}
    >
      {/* Header của Lớp học */}
      <div
        style={{
          background: '#fafafa',
          padding: isMobile ? '10px 12px' : '10px 16px',
          borderBottom: students.length > 0 ? '1px solid #f0f0f0' : 'none',
        }}
      >
        <Flex
          justify="space-between"
          align={isMobile ? 'flex-start' : 'center'}
          vertical={isMobile}
          gap={isMobile ? 8 : 12}
        >
          {/* Cụm thông tin lớp bên trái */}
          <Flex align="center" gap={10} wrap="wrap">
            <ClassCodeTag code={session.classCode} fontSize={13} />
            <SessionStatusTag status={session.status} />
            {session.isHidden && (
              <Tag style={{ margin: 0, fontSize: 11, color: '#8c8c8c' }}>Đang ẩn Public</Tag>
            )}

            <Flex align="center" gap={4} style={{ fontSize: 12.5, color: '#595959' }}>
              <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
              <Text strong style={{ fontSize: 12.5 }}>
                {session.timeSlot}
              </Text>
            </Flex>

            {sortedDates.length > 0 && (
              <Flex align="center" gap={4} style={{ fontSize: 12.5, color: '#595959' }}>
                <CalendarOutlined style={{ color: '#8c8c8c' }} />
                <span>
                  {sortedDates.map((d) => dayjs(d).format('DD/MM')).join(' · ')}
                </span>
              </Flex>
            )}
          </Flex>

          {/* Cụm thống kê sĩ số & nút thêm nhanh bên phải */}
          <Flex
            align="center"
            justify={isMobile ? 'space-between' : 'flex-end'}
            gap={8}
            wrap="wrap"
            style={{ width: isMobile ? '100%' : 'auto' }}
          >
            <Space size={6} wrap>
              <Tag
                style={{
                  margin: 0,
                  fontWeight: 600,
                  fontSize: 12,
                  background: '#fff',
                  borderColor: '#d9d9d9',
                }}
              >
                Sĩ số:{' '}
                <span
                  style={{
                    color:
                      session.currentBooked >= session.maxCapacity ? '#cf1322' : '#389e0d',
                  }}
                >
                  {session.currentBooked}
                </span>
                /{session.maxCapacity}
              </Tag>

              {unpaidCount > 0 && (
                <Tag color="warning" style={{ margin: 0, fontWeight: 600, fontSize: 12 }}>
                  {unpaidCount} còn nợ
                </Tag>
              )}
            </Space>

            {canAddMore && (
              <Button
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => onAddStudentToClass(session._id)}
                style={{ fontSize: 12, borderRadius: 6 }}
              >
                Thêm vào {session.classCode}
              </Button>
            )}
          </Flex>
        </Flex>
      </div>

      {/* Danh sách học viên trong lớp */}
      {students.length === 0 ? (
        <div
          style={{
            padding: '18px 16px',
            textAlign: 'center',
            color: '#8c8c8c',
            fontSize: 13,
          }}
        >
          Lớp {session.classCode} chưa có học viên nào.
        </div>
      ) : isMobile ? (
        <div>
          {students.map((st, idx) => (
            <MobileStudentRow
              key={st._id}
              st={st}
              idx={idx}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <Table
          rowKey="_id"
          dataSource={students}
          columns={columns}
          size="small"
          pagination={false}
          scroll={{ x: 820 }}
        />
      )}
    </div>
  );
});

/**
 * Nội dung hiển thị các Lớp học & Học viên trong 1 Tháng cụ thể
 */
const StudentMonthContent = memo(function StudentMonthContent({
  sessionGroups,
  isMobile,
  hasActiveFilter,
  onAddStudentToClass,
  onEdit,
  onDelete,
}) {
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [showEmptyClasses, setShowEmptyClasses] = useState(false);

  // Đảm bảo selectedClassId hợp lệ khi đổi tháng
  const activeClassId = useMemo(() => {
    if (selectedClassId === 'ALL') return 'ALL';
    const exists = sessionGroups.some((g) => g.session._id === selectedClassId);
    return exists ? selectedClassId : 'ALL';
  }, [selectedClassId, sessionGroups]);

  // Lọc danh sách lớp hiển thị trong tháng
  const visibleGroups = useMemo(() => {
    let list = sessionGroups;
    if (activeClassId !== 'ALL') {
      return list.filter((g) => g.session._id === activeClassId);
    }
    if (!showEmptyClasses || hasActiveFilter) {
      const withStudents = list.filter((g) => g.students.length > 0);
      // Nếu tất cả các lớp trong tháng đều trống thì vẫn hiện để admin biết
      if (withStudents.length > 0 || hasActiveFilter) {
        return withStudents;
      }
    }
    return list;
  }, [sessionGroups, activeClassId, showEmptyClasses, hasActiveFilter]);

  const totalMonthStudents = useMemo(
    () => sessionGroups.reduce((sum, g) => sum + g.students.length, 0),
    [sessionGroups]
  );

  const emptyClassCount = useMemo(
    () => sessionGroups.filter((g) => g.students.length === 0).length,
    [sessionGroups]
  );

  // Cột bảng học viên bên trong từng lớp (Không cần cột Lớp đang học lặp lại)
  const columns = useMemo(
    () => [
      {
        title: 'STT',
        key: 'stt',
        width: 55,
        align: 'center',
        render: (_, __, idx) => (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {idx + 1}
          </Text>
        ),
      },
      {
        title: 'Họ tên học viên',
        dataIndex: 'name',
        key: 'name',
        width: 220,
        render: (val) => (
          <Text strong style={{ fontSize: 13 }}>
            {val}
          </Text>
        ),
      },
      {
        title: 'Số điện thoại',
        dataIndex: 'phone',
        key: 'phone',
        width: 135,
        render: (val) => (
          <Text code style={{ fontSize: 12 }}>
            {val}
          </Text>
        ),
      },
      {
        title: 'Đã cọc',
        dataIndex: 'depositAmount',
        key: 'depositAmount',
        width: 125,
        align: 'right',
        render: (val) => (
          <Text style={{ color: '#1677ff', fontWeight: 600, fontSize: 12.5 }}>
            {fmtMoney(val)}
          </Text>
        ),
      },
      {
        title: 'Còn nợ',
        dataIndex: 'remainingAmount',
        key: 'remainingAmount',
        width: 125,
        align: 'right',
        render: (val) => {
          const n = Number(val ?? 0);
          return (
            <Text
              style={{
                color: n > 0 ? '#cf1322' : '#8c8c8c',
                fontWeight: n > 0 ? 600 : 400,
                fontSize: 12.5,
              }}
            >
              {fmtMoney(n)}
            </Text>
          );
        },
      },
      {
        title: 'Trạng thái',
        dataIndex: 'isFullyPaid',
        key: 'isFullyPaid',
        width: 135,
        align: 'center',
        render: (val) => <PaymentStatusTag isFullyPaid={val} />,
      },
      {
        title: 'Ghi chú',
        dataIndex: 'paymentNote',
        key: 'paymentNote',
        ellipsis: true,
        render: (val) => val || <Text type="secondary">—</Text>,
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 90,
        align: 'center',
        fixed: 'right',
        render: (_, record) => (
          <Space size={4}>
            <Tooltip title="Chỉnh sửa">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit(record)}
                id={`btn-edit-student-${record._id}`}
              />
            </Tooltip>
            <Popconfirm
              title="Xác nhận xóa"
              description={`Xóa học viên "${record.name}" khỏi lớp ${record.classCode}?`}
              onConfirm={() => onDelete(record)}
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
                  id={`btn-delete-student-${record._id}`}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [onEdit, onDelete]
  );

  return (
    <div style={{ paddingTop: 4 }}>
      {/* Thanh chọn nhanh Lớp học (Class Pills) trong tháng */}
      <Flex
        justify="space-between"
        align="center"
        wrap="wrap"
        gap={10}
        style={{ marginBottom: 14 }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 2,
            maxWidth: '100%',
          }}
        >
          <Button
            size="small"
            type={activeClassId === 'ALL' ? 'primary' : 'default'}
            onClick={() => setSelectedClassId('ALL')}
            style={{
              borderRadius: 999,
              fontWeight: activeClassId === 'ALL' ? 600 : 400,
              fontSize: 12.5,
              flexShrink: 0,
            }}
          >
            Tất cả lớp ({totalMonthStudents} HV)
          </Button>

          {sessionGroups.map(({ session, students }) => {
            if (!showEmptyClasses && students.length === 0 && activeClassId !== session._id) {
              return null;
            }
            const isSelected = activeClassId === session._id;
            return (
              <Button
                key={session._id}
                size="small"
                type={isSelected ? 'primary' : 'default'}
                onClick={() => setSelectedClassId(session._id)}
                style={{
                  borderRadius: 999,
                  fontWeight: isSelected ? 600 : 500,
                  fontSize: 12.5,
                  flexShrink: 0,
                }}
              >
                {session.classCode} ({students.length}/{session.maxCapacity})
              </Button>
            );
          })}
        </div>

        {/* Tuỳ chọn hiện cả các lớp chưa có học viên */}
        {emptyClassCount > 0 && activeClassId === 'ALL' && !hasActiveFilter && (
          <Flex align="center" gap={6} style={{ flexShrink: 0 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Hiện lớp trống ({emptyClassCount})
            </Text>
            <Switch
              size="small"
              checked={showEmptyClasses}
              onChange={setShowEmptyClasses}
            />
          </Flex>
        )}
      </Flex>

      {/* Danh sách các khối Lớp học */}
      {visibleGroups.length === 0 ? (
        <Empty
          description={
            hasActiveFilter
              ? 'Không có học viên nào khớp với bộ lọc trong tháng này.'
              : 'Tháng này chưa có học viên nào đăng ký.'
          }
          style={{ padding: '36px 0' }}
        />
      ) : (
        visibleGroups.map((group) => (
          <ClassStudentSection
            key={group.session._id}
            sessionGroup={group}
            isMobile={isMobile}
            columns={columns}
            onAddStudentToClass={onAddStudentToClass}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  );
});

export default StudentMonthContent;

