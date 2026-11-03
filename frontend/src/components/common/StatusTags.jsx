import { memo } from 'react';
import { Tag } from 'antd';
import { STATUS_CONFIG } from '../../constants';

/**
 * Tag hiển thị mã lớp (nền tím nhạt, chữ tím đậm đồng bộ toàn hệ thống)
 */
export const ClassCodeTag = memo(function ClassCodeTag({ code, fontSize = 12, style }) {
  return (
    <Tag
      style={{
        backgroundColor: '#F3E8FF',
        color: '#7E22CE',
        border: 'none',
        fontWeight: 600,
        fontSize,
        padding: '2px 8px',
        borderRadius: 6,
        margin: 0,
        ...style,
      }}
    >
      {code}
    </Tag>
  );
});

/**
 * Tag hiển thị trạng thái lớp học (Mở / Đầy / Đóng)
 */
export const SessionStatusTag = memo(function SessionStatusTag({ status, mobile = false, style }) {
  const cfg = STATUS_CONFIG[status] ?? { color: 'default', label: status, mobileLabel: status };
  return (
    <Tag color={cfg.color} style={{ fontWeight: 600, margin: 0, ...style }}>
      {mobile ? cfg.mobileLabel : cfg.label}
    </Tag>
  );
});

/**
 * Tag hiển thị trạng thái đóng học phí của học viên
 */
export const PaymentStatusTag = memo(function PaymentStatusTag({ isFullyPaid, compact = false }) {
  if (isFullyPaid) {
    return (
      <Tag color="success" style={{ fontWeight: 600, margin: 0, fontSize: compact ? 11 : 12 }}>
        {compact ? '✓ Xong' : '✓ Đã đóng xong'}
      </Tag>
    );
  }
  return (
    <Tag color="orange" style={{ fontWeight: 600, margin: 0, fontSize: compact ? 11 : 12 }}>
      ⏳ Còn nợ
    </Tag>
  );
});

