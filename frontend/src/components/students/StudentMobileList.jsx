import { memo, useState } from 'react';
import { Card, Empty, Flex, Space, Button, Popconfirm, Typography, Tag, Pagination } from 'antd';
import { EditOutlined, DeleteOutlined, PhoneOutlined } from '@ant-design/icons';
import { fmtMoney } from '../../utils/formatters';
import { ClassCodeTag } from '../common/StatusTags';

const { Text } = Typography;
const PAGE_SIZE = 10;

const StudentMobileCard = memo(function StudentMobileCard({ st, onEdit, onDelete }) {
  return (
    <Card
      className="mobile-student-card"
      styles={{ body: { padding: '12px 14px' } }}
      style={{
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        border: '1px solid #f0f0f0',
        marginBottom: 10,
        background: '#fff',
      }}
    >
      {/* Header: Tag Mã lớp + Họ tên & Nhóm thao tác Sửa/Xóa */}
      <Flex justify="space-between" align="flex-start" style={{ marginBottom: 8 }}>
        <Flex align="center" gap={8} style={{ minWidth: 0, flex: 1 }}>
          <ClassCodeTag code={st.classCode} fontSize={12} />
          <Text strong style={{ fontSize: 15, color: '#1f1f1f', wordBreak: 'break-word' }}>
            {st.name}
          </Text>
        </Flex>

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

      {/* Dòng 2: Số điện thoại + Tên khóa học */}
      <Flex align="center" gap={8} wrap="wrap" style={{ marginBottom: 8 }}>
        <Text code style={{ fontSize: 12 }}>
          <PhoneOutlined style={{ marginRight: 4, color: '#888' }} />
          {st.phone}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {st.campaignTitle}
        </Text>
      </Flex>

      {/* Dòng 3: Khối Tài chính */}
      <Flex
        justify="space-between"
        align="center"
        style={{ paddingTop: 6, borderTop: '1px dashed #f0f0f0' }}
      >
        <Space size={6} wrap>
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
        </Space>

        {st.paymentNote && (
          <Text
            type="secondary"
            style={{ fontSize: 11, fontStyle: 'italic', maxWidth: '45%' }}
            ellipsis
          >
            {st.paymentNote}
          </Text>
        )}
      </Flex>
    </Card>
  );
});

/**
 * Danh sách thẻ học viên trên Mobile (có phân trang giúp mượt mà khi có hàng trăm học viên)
 */
export default function StudentMobileList({
  loading,
  students,
  hasActiveFilter,
  onEdit,
  onDelete,
}) {
  const [page, setPage] = useState(1);

  if (loading) {
    return <Card loading style={{ borderRadius: 8, marginBottom: 12 }} />;
  }

  if (students.length === 0) {
    return (
      <Empty
        description={
          hasActiveFilter
            ? 'Không tìm thấy học viên nào phù hợp.'
            : 'Chưa có học viên nào trong hệ thống.'
        }
        style={{
          padding: '36px 0',
          background: '#fff',
          borderRadius: 8,
          border: '1px solid #f0f0f0',
        }}
      />
    );
  }

  const maxPage = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const currentPage = Math.min(page, maxPage);
  const pagedStudents = students.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {pagedStudents.map((st) => (
        <StudentMobileCard
          key={st._id}
          st={st}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}

      {students.length > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <Pagination
            size="small"
            current={currentPage}
            pageSize={PAGE_SIZE}
            total={students.length}
            onChange={setPage}
            showSizeChanger={false}
          />
        </div>
      )}
    </div>
  );
}
