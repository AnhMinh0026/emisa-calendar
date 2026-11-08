import { memo } from 'react';
import { Card, Flex, Grid } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { T, CUSTOMER_STATUS_CFG } from '../../constants';

/**
 * Thẻ hiển thị thông tin lớp học cho khách hàng
 * Kết hợp Header & Footer tinh gọn (Phương án 1) + Lịch học chia ô tối đa 4 buổi/dòng (Phương án 3)
 */
const CustomerSessionCard = memo(function CustomerSessionCard({ session, onRegister }) {
  const screens = Grid.useBreakpoint();
  const isFull = session.status !== 'open';
  const cfg = CUSTOMER_STATUS_CFG[session.status] ?? CUSTOMER_STATUS_CFG.closed;
  const sortedDates = [...(session.studyDates ?? [])].sort((a, b) => new Date(a) - new Date(b));
  const remainingSeats = Math.max(0, (session.maxCapacity ?? 0) - (session.currentBooked ?? 0));

  return (
    <Card
      className={`session-card ${!isFull ? 'session-card-interactive' : 'session-card-disabled'}`}
      hoverable={!isFull}
      onClick={() => !isFull && onRegister?.(session)}
      styles={{
        body: {
          padding: screens.md ? '16px' : '15px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        },
      }}
      style={{
        height: '100%',
        borderRadius: 16,
        background: T.white,
        border: `1px solid ${T.gray2}`,
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.025)',
        overflow: 'hidden',
        cursor: !isFull ? 'pointer' : 'default',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isFull ? 0.78 : 1,
      }}
    >
      {/* ── Hàng 1: Mã lớp + Giờ học (Trái) & Badge trạng thái (Phải) ── */}
      <Flex
        justify="space-between"
        align="center"
        gap={8}
        style={{ marginBottom: 14, flexWrap: 'nowrap' }}
      >
        <Flex align="center" gap={8} style={{ minWidth: 0, flex: 1 }}>
          <span
            className="session-tag-code"
            style={{
              backgroundColor: isFull ? '#8E8E93' : T.black,
              color: T.white,
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: 0.3,
              padding: '3px 9px',
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: '18px',
              flexShrink: 0,
            }}
          >
            {session.classCode}
          </span>

          <span
            className="session-time-slot"
            style={{
              fontSize: screens.md ? 14.5 : 14,
              fontWeight: 700,
              color: T.black,
              letterSpacing: -0.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {session.timeSlot}
          </span>
        </Flex>

        {/* Pill trạng thái */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: !isFull ? '#ECFDF3' : '#F4F4F6',
            color: !isFull ? '#15803D' : T.gray3,
            padding: '3px 10px',
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: !isFull ? '#22C55E' : cfg.dot,
              display: 'inline-block',
              flexShrink: 0,
              animation: !isFull ? 'statusPulse 2s infinite ease-in-out' : 'none',
            }}
          />
          {!isFull && remainingSeats > 0 ? `Còn ${remainingSeats} chỗ` : cfg.label}
        </span>
      </Flex>

      {/* ── Hàng 2: Lịch các buổi học (Tối đa 4 buổi / 1 dòng, buổi thứ 5 tự động xuống dòng) ── */}
      <div
        className="session-dates-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          columnGap: 6,
          rowGap: 8,
          marginBottom: 14,
          flex: 1,
          alignContent: 'start',
        }}
      >
        {sortedDates.map((d, i) => (
          <div
            key={i}
            className="session-date-box"
            style={{
              background: '#FAFAFC',
              border: '1px solid #ECECEE',
              borderRadius: 10,
              padding: '6px 4px',
              textAlign: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                color: T.gray3,
                fontWeight: 500,
                lineHeight: 1.2,
                marginBottom: 2,
                whiteSpace: 'nowrap',
              }}
            >
              Buổi {i + 1}
            </div>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: T.black,
                lineHeight: 1.25,
                letterSpacing: -0.2,
                whiteSpace: 'nowrap',
              }}
            >
              {dayjs(d).format('DD/MM')}
            </div>
          </div>
        ))}
      </div>

      {/* ── Hàng 3: Footer Sĩ số (Trái) & CTA Đăng ký (Phải) ── */}
      <Flex
        justify="space-between"
        align="center"
        style={{
          marginTop: 'auto',
          paddingTop: 11,
          borderTop: '1px solid #F2F2F7',
          fontSize: 12.5,
          lineHeight: 1.4,
        }}
      >
        <span style={{ color: T.gray3 }}>
          Sĩ số:{' '}
          <strong style={{ color: T.black, fontWeight: 600 }}>
            {session.currentBooked}/{session.maxCapacity} học viên
          </strong>
        </span>

        {!isFull ? (
          <span
            className="session-card-cta"
            style={{
              color: '#7E22CE',
              fontWeight: 600,
              fontSize: 12.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              transition: 'transform 0.2s ease, color 0.2s ease',
            }}
          >
            Đăng ký
            <ArrowRightOutlined className="session-card-cta-arrow" style={{ fontSize: 11, transition: 'transform 0.2s ease' }} />
          </span>
        ) : (
          <span style={{ color: T.gray3, fontSize: 12, fontWeight: 500 }}>
            {cfg.label}
          </span>
        )}
      </Flex>
    </Card>
  );
});

export default CustomerSessionCard;
