import { memo, useState, useMemo } from 'react';
import {
  App, Table, Button, Space, Popconfirm, Dropdown, Typography, Tooltip, Flex, Empty, Switch,
} from 'antd';
import {
  EditOutlined, DeleteOutlined, PlusOutlined, MenuOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { T } from '../../constants';
import { fmtMoney } from '../../utils/formatters';
import { ClassCodeTag, PaymentStatusTag, SessionStatusTag } from '../common/StatusTags';

const { Text } = Typography;

/**
 * Dòng hiển thị 1 học viên trên giao diện Mobile (bên trong khối Lớp học)
 * Bố cục 2 cột Trái (Tên + SĐT) - Phải (Trạng thái nợ + Tiền cọc) kèm nút menu ☰ tinh gọn
 */
const MobileStudentRow = memo(function MobileStudentRow({ st, idx, onEdit, onDelete }) {
  const { modal } = App.useApp();

  const actionItems = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: <span id={`btn-edit-student-mob-${st._id}`}>Chỉnh sửa học viên</span>,
      onClick: () => onEdit(st),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      danger: true,
      icon: <DeleteOutlined />,
      label: <span id={`btn-delete-student-mob-${st._id}`}>Xóa học viên</span>,
      onClick: () => {
        modal.confirm({
          title: 'Xác nhận xóa',
          content: `Bạn chắc chắn muốn xóa học viên "${st.name}"?`,
          okText: 'Xóa',
          okButtonProps: { danger: true },
          cancelText: 'Hủy',
          centered: true,
          onOk: () => onDelete(st),
        });
      },
    },
  ];

  return (
    <div
      style={{
        padding: '11px 12px 11px 14px',
        borderTop: idx === 0 ? 'none' : '1px solid #F1F5F9',
        background: '#FFFFFF',
      }}
    >
      <Flex justify="space-between" align="center" gap={8}>
        {/* Cột trái: Họ tên & Số điện thoại (+ ghi chú nếu có) */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: T.black,
              lineHeight: 1.35,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {st.name}
          </div>
          <div
            style={{
              marginTop: 2,
              fontSize: 12.5,
              color: '#64748B',
              lineHeight: 1.35,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
              {st.phone}
            </span>
            {st.paymentNote && (
              <span style={{ color: '#94A3B8', fontSize: 12 }}>
                • {st.paymentNote}
              </span>
            )}
          </div>
        </div>

        {/* Cột phải: Học phí (Nợ / Đã đóng đủ + Đã cọc) & Nút Menu ☰ */}
        <Flex align="center" gap={6} style={{ flexShrink: 0 }}>
          <div style={{ textAlign: 'right', lineHeight: 1.35 }}>
            {st.isFullyPaid ? (
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#15803D' }}>
                Đã đóng đủ
              </div>
            ) : (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626' }}>
                Nợ {fmtMoney(st.remainingAmount)}
              </div>
            )}
            <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
              Cọc {fmtMoney(st.depositAmount)}
            </div>
          </div>

          <Dropdown
            menu={{ items: actionItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="text"
              size="small"
              icon={<MenuOutlined style={{ fontSize: 13.5, color: '#64748B' }} />}
              id={`btn-actions-student-mob-${st._id}`}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          </Dropdown>
        </Flex>
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
  const isFull = (session.currentBooked ?? 0) >= (session.maxCapacity ?? 0);

  return (
    <div
      style={{
        border: '1px solid #ECECEE',
        borderRadius: 12,
        background: '#FFFFFF',
        overflow: 'hidden',
        marginBottom: 14,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
      }}
    >
      {/* Header của Lớp học */}
      <div
        style={{
          background: '#F8FAFC',
          padding: isMobile ? '10px 12px' : '11px 16px',
          borderBottom: '1px solid #EEF2F6',
        }}
      >
        {isMobile ? (
          /* Header Mobile tinh gọn: Hàng 1 (Mã lớp + Giờ học | Sĩ số + Nút thêm), Hàng 2 (Ngày học) */
          <div>
            <Flex justify="space-between" align="center" gap={8}>
              <Flex align="center" gap={8} style={{ minWidth: 0, flex: 1 }}>
                <ClassCodeTag
                  code={session.classCode}
                  fontSize={12}
                  muted={session.status !== 'open'}
                />
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 13.5,
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
                      color: '#64748B',
                      background: '#E2E8F0',
                      padding: '1px 6px',
                      borderRadius: 5,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Đang ẩn
                  </span>
                )}
              </Flex>

              <Flex align="center" gap={8} style={{ flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: isFull ? '#B91C1C' : '#475569',
                    background: isFull ? '#FEF2F2' : '#EEF2F6',
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}
                >
                  {session.currentBooked}/{session.maxCapacity} HV
                </span>

                {canAddMore && (
                  <Button
                    size="small"
                    icon={<PlusOutlined style={{ fontSize: 11 }} />}
                    onClick={() => onAddStudentToClass(session._id)}
                    style={{
                      height: 24,
                      padding: '0 8px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      borderRadius: 6,
                      borderColor: '#BFDBFE',
                      background: '#EBF3FE',
                      color: '#1E4DB7',
                    }}
                  >
                    Thêm
                  </Button>
                )}
              </Flex>
            </Flex>

            {sortedDates.length > 0 && (
              <div
                style={{
                  marginTop: 5,
                  fontSize: 12,
                  color: '#64748B',
                  lineHeight: 1.3,
                }}
              >
                Lịch học: <span style={{ color: '#334155', fontWeight: 500 }}>
                  {sortedDates.map((d) => dayjs(d).format('DD/MM')).join(' · ')}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Header Desktop đầy đủ */
          <Flex justify="space-between" align="center" gap={12}>
            <Flex align="center" gap={10} wrap="wrap">
              <ClassCodeTag
                code={session.classCode}
                fontSize={12.5}
                muted={session.status !== 'open'}
              />

              <span style={{ fontWeight: 700, fontSize: 13.5, color: T.black, letterSpacing: -0.2 }}>
                {session.timeSlot}
              </span>

              {sortedDates.length > 0 && (
                <>
                  <span style={{ color: '#D1D1D6' }}>|</span>
                  <span style={{ fontSize: 12.5, color: '#52525B', fontWeight: 500 }}>
                    {sortedDates.map((d) => dayjs(d).format('DD/MM')).join(' · ')}
                  </span>
                </>
              )}

              <SessionStatusTag status={session.status} />

              {session.isHidden && (
                <span
                  style={{
                    fontSize: 11.5,
                    color: '#6E6E73',
                    background: '#EFEFF4',
                    padding: '1px 8px',
                    borderRadius: 6,
                  }}
                >
                  Đang ẩn Public
                </span>
              )}
            </Flex>

            <Flex align="center" justify="flex-end" gap={12} wrap="wrap" style={{ fontSize: 12.5 }}>
              <Flex align="center" gap={10}>
                <span style={{ color: '#6E6E73' }}>
                  Sĩ số:{' '}
                  <strong
                    style={{
                      color: isFull ? '#B91C1C' : T.black,
                      fontWeight: 700,
                    }}
                  >
                    {session.currentBooked}
                  </strong>
                  /{session.maxCapacity}
                </span>

                {unpaidCount > 0 && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      color: '#B45309',
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#F59E0B',
                      }}
                    />
                    {unpaidCount} còn nợ
                  </span>
                )}
              </Flex>

              {canAddMore && (
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => onAddStudentToClass(session._id)}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 7,
                    borderColor: '#BFDBFE',
                    background: '#EBF3FE',
                    color: '#1E4DB7',
                  }}
                >
                  Thêm vào {session.classCode}
                </Button>
              )}
            </Flex>
          </Flex>
        )}
      </div>

      {/* Danh sách học viên trong lớp */}
      {students.length === 0 ? (
        <div
          style={{
            padding: '18px 16px',
            textAlign: 'center',
            color: '#8E8E93',
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

  const activeClassId = useMemo(() => {
    if (selectedClassId === 'ALL') return 'ALL';
    const exists = sessionGroups.some((g) => g.session._id === selectedClassId);
    return exists ? selectedClassId : 'ALL';
  }, [selectedClassId, sessionGroups]);

  const visibleGroups = useMemo(() => {
    let list = sessionGroups;
    if (activeClassId !== 'ALL') {
      return list.filter((g) => g.session._id === activeClassId);
    }
    if (!showEmptyClasses || hasActiveFilter) {
      const withStudents = list.filter((g) => g.students.length > 0);
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

  // Cột bảng học viên bên trong từng lớp
  const columns = useMemo(
    () => [
      {
        title: 'STT',
        key: 'stt',
        width: 55,
        align: 'center',
        render: (_, __, idx) => (
          <Text style={{ fontSize: 12, color: '#8E8E93' }}>
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
          <Text strong style={{ fontSize: 13.5, color: T.black }}>
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
          <span
            style={{
              fontSize: 12.5,
              color: '#475569',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}
          >
            {val}
          </span>
        ),
      },
      {
        title: 'Đã cọc',
        dataIndex: 'depositAmount',
        key: 'depositAmount',
        width: 125,
        align: 'right',
        render: (val) => (
          <Text style={{ color: T.black, fontWeight: 600, fontSize: 13 }}>
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
                color: n > 0 ? '#B91C1C' : '#94A3B8',
                fontWeight: n > 0 ? 600 : 400,
                fontSize: 13,
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
        width: 140,
        align: 'center',
        render: (val) => <PaymentStatusTag isFullyPaid={val} />,
      },
      {
        title: 'Ghi chú',
        dataIndex: 'paymentNote',
        key: 'paymentNote',
        ellipsis: true,
        render: (val) =>
          val ? (
            <span style={{ color: '#6E6E73', fontSize: 12.5 }}>{val}</span>
          ) : (
            <Text type="secondary">—</Text>
          ),
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 90,
        align: 'center',
        fixed: 'right',
        render: (_, record) => (
          <Space size={2}>
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
      {/* Thanh lọc nhanh theo Lớp học dạng Segmented vuông vắn, chuyên nghiệp */}
      <Flex
        justify="space-between"
        align="center"
        wrap="wrap"
        gap={10}
        style={{ marginBottom: 14 }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: '#F1F5F9',
            padding: 4,
            borderRadius: 8,
            overflowX: 'auto',
            maxWidth: '100%',
          }}
        >
          <div
            onClick={() => setSelectedClassId('ALL')}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              fontWeight: activeClassId === 'ALL' ? 600 : 500,
              fontSize: 12.5,
              cursor: 'pointer',
              userSelect: 'none',
              flexShrink: 0,
              background: activeClassId === 'ALL' ? '#FFFFFF' : 'transparent',
              color: activeClassId === 'ALL' ? '#1E4DB7' : '#475569',
              boxShadow:
                activeClassId === 'ALL' ? '0 1px 2px rgba(15, 23, 42, 0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Tất cả lớp ({totalMonthStudents})
          </div>

          {sessionGroups.map(({ session, students }) => {
            if (!showEmptyClasses && students.length === 0 && activeClassId !== session._id) {
              return null;
            }
            const isSelected = activeClassId === session._id;
            return (
              <div
                key={session._id}
                onClick={() => setSelectedClassId(session._id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontWeight: isSelected ? 600 : 500,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  userSelect: 'none',
                  flexShrink: 0,
                  background: isSelected ? '#FFFFFF' : 'transparent',
                  color: isSelected ? '#1E4DB7' : '#475569',
                  boxShadow: isSelected ? '0 1px 2px rgba(15, 23, 42, 0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {session.classCode}{' '}
                <span style={{ opacity: 0.75, fontWeight: 400 }}>
                  ({students.length}/{session.maxCapacity})
                </span>
              </div>
            );
          })}
        </div>

        {/* Tuỳ chọn hiện cả các lớp chưa có học viên */}
        {emptyClassCount > 0 && activeClassId === 'ALL' && !hasActiveFilter && (
          <Flex align="center" gap={6} style={{ flexShrink: 0 }}>
            <Text style={{ fontSize: 12, color: '#6E6E73' }}>
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
