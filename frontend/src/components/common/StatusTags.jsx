import { memo } from 'react';

/**
 * Badge hiển thị mã lớp (Tone màu xanh #1E4DB7 trên nền #EBF3FE dịu mắt chuẩn Flexy)
 */
export const ClassCodeTag = memo(function ClassCodeTag({
  code,
  fontSize = 12,
  muted = false,
  style,
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: muted ? '#F1F5F9' : '#EBF3FE',
        color: muted ? '#64748B' : '#1E4DB7',
        border: muted ? '1px solid #E2E8F0' : '1px solid #DBEAFE',
        fontWeight: 700,
        fontSize,
        letterSpacing: 0.3,
        padding: '2px 9px',
        borderRadius: 7,
        lineHeight: '18px',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {code}
    </span>
  );
});

const SESSION_PILL_STYLES = {
  open: {
    bg: '#ECFDF3',
    text: '#15803D',
    dot: '#22C55E',
    label: 'Đang mở',
    mobileLabel: 'Còn chỗ',
  },
  full: {
    bg: '#FEF2F2',
    text: '#B91C1C',
    dot: '#EF4444',
    label: 'Đã đầy',
    mobileLabel: 'Đã đầy',
  },
  closed: {
    bg: '#F1F5F9',
    text: '#64748B',
    dot: '#94A3B8',
    label: 'Đã đóng',
    mobileLabel: 'Đã đóng',
  },
};

/**
 * Pill hiển thị trạng thái lớp học (Đang mở / Đã đầy / Đã đóng) kèm chấm tròn
 */
export const SessionStatusTag = memo(function SessionStatusTag({
  status,
  mobile = false,
  style,
}) {
  const cfg = SESSION_PILL_STYLES[status] ?? {
    bg: '#F1F5F9',
    text: '#64748B',
    dot: '#94A3B8',
    label: status,
    mobileLabel: status,
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        backgroundColor: cfg.bg,
        color: cfg.text,
        fontWeight: 600,
        fontSize: 12,
        padding: '2px 8px',
        borderRadius: 6,
        lineHeight: '18px',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: cfg.dot,
          flexShrink: 0,
        }}
      />
      {mobile ? cfg.mobileLabel : cfg.label}
    </span>
  );
});

/**
 * Badge hiển thị trạng thái đóng học phí của học viên (Hoàn tất / Còn nợ)
 */
export const PaymentStatusTag = memo(function PaymentStatusTag({
  isFullyPaid,
  compact = false,
}) {
  if (isFullyPaid) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          backgroundColor: '#ECFDF3',
          color: '#15803D',
          fontWeight: 600,
          fontSize: compact ? 11.5 : 12,
          padding: compact ? '1px 7px' : '2px 8px',
          borderRadius: 6,
          lineHeight: '18px',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: '#22C55E',
            flexShrink: 0,
          }}
        />
        {compact ? 'Hoàn tất' : 'Đã đóng xong'}
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FFFBEB',
        color: '#B45309',
        border: '1px solid #FEF3C7',
        fontWeight: 600,
        fontSize: compact ? 11.5 : 12,
        padding: compact ? '1px 7px' : '2px 8px',
        borderRadius: 6,
        lineHeight: '18px',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: '#FEC90F',
          flexShrink: 0,
        }}
      />
      Còn nợ
    </span>
  );
});
