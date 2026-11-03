import { memo } from 'react';
import { Card, Flex, Grid } from 'antd';
import dayjs from 'dayjs';
import { T, CUSTOMER_STATUS_CFG } from '../../constants';

/**
 * Thẻ hiển thị thông tin lớp học cho khách hàng (được bọc React.memo để chống re-render thừa)
 */
const CustomerSessionCard = memo(function CustomerSessionCard({ session, onRegister }) {
  const screens = Grid.useBreakpoint();
  const isFull = session.status !== 'open';
  const cfg = CUSTOMER_STATUS_CFG[session.status] ?? CUSTOMER_STATUS_CFG.closed;
  const sortedDates = [...(session.studyDates ?? [])].sort((a, b) => new Date(a) - new Date(b));

  return (
    <Card
      className={`session-card ${!isFull ? 'session-card-interactive' : 'session-card-disabled'}`}
      hoverable={!isFull}
      onClick={() => !isFull && onRegister?.(session)}
      styles={{
        body: {
          padding: screens.md ? '12px 14px 16px' : '14px 16px 18px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        },
      }}
      style={{
        height: '100%',
        borderRadius: 12,
        background: T.white,
        border: `1px solid ${T.gray2}`,
        overflow: 'hidden',
        cursor: !isFull ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header: Mã lớp & Trạng thái */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
        <span
          className="session-tag-code"
          style={{
            backgroundColor: '#F3E8FF',
            color: '#7E22CE',
            border: 'none',
            fontWeight: 600,
            fontSize: screens.md ? 12 : 11,
            letterSpacing: 0.4,
            padding: '2px 8px',
            borderRadius: '6px',
            display: 'inline-block',
            lineHeight: '18px',
          }}
        >
          {session.classCode}
        </span>
        <Flex align="center" gap={4}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: cfg.dot,
              display: 'inline-block',
              flexShrink: 0,
              animation: !isFull ? 'statusPulse 2s infinite ease-in-out' : 'none',
            }}
          />
          <span
            className="session-status-text"
            style={{ fontSize: 10, color: cfg.textColor, fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            {cfg.label}
          </span>
        </Flex>
      </Flex>

      {/* Giờ học */}
      <div
        className="session-time-slot"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          fontSize: 13,
          lineHeight: 1.4,
        }}
      >
        <span style={{ color: T.gray3, fontSize: 13, flexShrink: 0 }}>Giờ học:</span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: T.black,
            letterSpacing: -0.2,
          }}
        >
          {session.timeSlot}
        </span>
      </div>

      {/* Ngày học */}
      <div
        className="session-dates-row"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          marginBottom: 8,
          fontSize: 13,
          lineHeight: 1.4,
          flex: 1,
        }}
      >
        <span style={{ color: T.gray3, fontSize: 13, flexShrink: 0, paddingTop: 1 }}>
          Ngày học:
        </span>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            flex: 1,
          }}
        >
          {sortedDates.map((d, i) => (
            <span
              key={i}
              className="session-date-tag"
              style={{
                background: T.gray1,
                color: T.black,
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: 4,
                display: 'inline-block',
                whiteSpace: 'nowrap',
              }}
            >
              {dayjs(d).format('DD/MM')}
            </span>
          ))}
        </div>
      </div>

      {/* Sĩ số */}
      <div
        className="session-capacity"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          lineHeight: 1.4,
          marginTop: 'auto',
          paddingTop: 8,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ color: T.gray3, fontSize: 13, flexShrink: 0 }}>Sĩ số:</span>
        <span style={{ color: T.black, fontWeight: 600, fontSize: 13 }}>
          {session.currentBooked}/{session.maxCapacity}
        </span>
        {!isFull && (
          <span style={{ color: T.gray3, fontSize: 12 }}>
            (còn {session.maxCapacity - session.currentBooked})
          </span>
        )}
      </div>
    </Card>
  );
});

export default CustomerSessionCard;

