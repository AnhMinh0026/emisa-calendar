import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Row, Col, Card, Typography, Flex, Spin, Empty, Modal, Button, ConfigProvider, Grid,
} from 'antd';
import {
  FacebookFilled, MessageOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;

// ── Apple Design Tokens ───────────────────────────────────────────────────────
const T = {
  black: '#1D1D1F',
  white: '#FFFFFF',
  gray1: '#ececee',   // bg nhạt
  gray2: '#E5E5EA',   // viền
  gray3: '#8E8E93',   // text phụ
  gray4: '#AEAEB2',   // dot neutral
  green: '#34C759',
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  open: { dot: T.green, label: 'Còn chỗ', textColor: T.green },
  full: { dot: T.gray4, label: 'Đã đầy', textColor: T.gray3 },
  closed: { dot: T.gray4, label: 'Đã đóng', textColor: T.gray3 },
};

// ── Helper ────────────────────────────────────────────────────────────────────
const groupSessions = (sessions) => {
  const groups = {};
  sessions.forEach((s) => {
    const c = s.campaignId;
    if (!c?._id) return;
    const cId = c._id;
    const mk = s.campaignMonth ?? '??';
    if (!groups[cId]) groups[cId] = { campaign: c, months: {} };
    if (!groups[cId].months[mk]) groups[cId].months[mk] = [];
    groups[cId].months[mk].push(s);
  });
  return groups;
};

// ── Pill Button ───────────────────────────────────────────────────────────────
function Pill({ label, active, onClick, id }) {
  return (
    <div
      id={id}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '7px 18px', borderRadius: 20,
        background: active ? T.black : T.gray1,
        color: active ? T.white : T.black,
        fontWeight: active ? 600 : 400,
        fontSize: 14, cursor: 'pointer', flexShrink: 0,
        whiteSpace: 'nowrap', userSelect: 'none',
        transition: 'background 0.18s, color 0.18s',
      }}
    >
      {label}
    </div>
  );
}

// ── SessionCard ───────────────────────────────────────────────────────────────
function SessionCard({ session, onRegister }) {
  const screens = Grid.useBreakpoint();
  const isFull = session.status !== 'open';
  const cfg = STATUS_CFG[session.status] ?? STATUS_CFG.closed;
  const sortedDates = [...(session.studyDates ?? [])].sort((a, b) => new Date(a) - new Date(b));

  return (
    <Card
      className="session-card"
      hoverable
      onClick={() => !isFull && onRegister?.(session)}
      styles={{
        body: {
          padding: '10px 8px 12px',
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
        cursor: isFull ? 'default' : 'pointer',
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
          fontSize: screens.md ? 16 : 15,
          fontWeight: 700,
          color: T.black,
          letterSpacing: -0.3,
          marginBottom: 8,
          lineHeight: 1.2,
        }}
      >
        {session.timeSlot}
      </div>

      {/* Sĩ số */}
      <div
        className="session-capacity"
        style={{
          fontSize: screens.md ? 14 : 13,
          color: '#8E8E93',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <span>Sĩ số:</span>
        <span style={{ color: T.black, fontWeight: 600 }}>
          {session.currentBooked}/{session.maxCapacity}
        </span>
        {!isFull && (
          <span style={{ color: '#8E8E93', fontSize: screens.md ? 13 : 12 }}>
            (còn {session.maxCapacity - session.currentBooked})
          </span>
        )}
      </div>

      {/* Ngày học: Render thẳng các Tag ngày học, không có chữ NGÀY HỌC */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          margin: '-2px',
          flex: 1,
          alignContent: 'flex-start',
        }}
      >
        {sortedDates.map((d, i) => (
          <span
            key={i}
            className="session-date-tag"
            style={{
              background: T.gray1,
              color: T.black,
              fontSize: screens.md ? '12px' : '10px',
              fontWeight: 600,
              padding: screens.md ? '2px 8px' : '0 4px',
              margin: 2,
              lineHeight: screens.md ? '20px' : '16px',
              borderRadius: screens.md ? 6 : 4,
              display: 'inline-block',
              whiteSpace: 'nowrap',
            }}
          >
            {dayjs(d).format('DD/MM')}
          </span>
        ))}
      </div>
    </Card>
  );
}

// ── ContactModal (thay thế RegisterModal) ────────────────────────────────────
function ContactModal({ open, session, contactLinks, onClose }) {
  const hasFB = !!contactLinks?.facebook?.trim();
  const hasZalo = !!contactLinks?.zalo?.trim();
  const sortedDates = [...(session?.studyDates ?? [])].sort((a, b) => new Date(a) - new Date(b));

  return (
    <ConfigProvider theme={{ token: { colorPrimary: T.black } }}>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width={420}
        destroyOnHidden
        centered
        title={
          <Flex align="center" gap={10}>
            <span style={{
              background: T.gray1, color: T.black,
              fontWeight: 700, fontSize: 13,
              padding: '3px 10px', borderRadius: 8,
            }}>
              {session?.classCode}
            </span>
            <Text strong style={{ fontSize: 15, color: T.black }}>
              Đăng ký lớp học
            </Text>
          </Flex>
        }
        styles={{ body: { paddingTop: 12 }, header: { paddingBottom: 12 } }}
      >
        {/* Thông tin lớp */}
        {session && (
          <div style={{ background: T.gray1, borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: T.black, letterSpacing: -0.3, marginBottom: 8 }}>
              {session.timeSlot}
            </div>
            <Flex wrap="wrap" gap={4}>
              {sortedDates.map((d, i) => (
                <span key={i} style={{
                  background: T.white, color: T.black,
                  fontSize: 11, fontWeight: 600,
                  padding: '3px 8px', borderRadius: 6,
                  border: `1px solid ${T.gray2}`,
                }}>
                  {dayjs(d).format('DD/MM/YYYY')}
                </span>
              ))}
            </Flex>
          </div>
        )}

        {/* CTA text */}
        <Paragraph style={{ color: T.gray3, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          Vui lòng liên hệ với chúng tôi qua{' '}
          <strong style={{ color: T.black }}>Facebook</strong> hoặc{' '}
          <strong style={{ color: T.black }}>Zalo</strong>{' '}
          để được tư vấn và chốt lịch học nhanh nhất.
        </Paragraph>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          {/* Facebook */}
          <a
            href={hasFB ? contactLinks.facebook : undefined}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: 1, display: 'block', textDecoration: 'none' }}
          >
            <button
              disabled={!hasFB}
              style={{
                width: '100%', height: 48,
                background: hasFB ? '#1877F2' : T.gray1,
                color: hasFB ? T.white : T.gray3,
                border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 600,
                cursor: hasFB ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'inherit', transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => { if (hasFB) e.currentTarget.style.opacity = '0.88'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              <FacebookFilled style={{ fontSize: 18 }} />
              Facebook
            </button>
          </a>

          {/* Zalo */}
          <a
            href={hasZalo ? contactLinks.zalo : undefined}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: 1, display: 'block', textDecoration: 'none' }}
          >
            <button
              disabled={!hasZalo}
              style={{
                width: '100%', height: 48,
                background: hasZalo ? '#0068FF' : T.gray1,
                color: hasZalo ? T.white : T.gray3,
                border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 600,
                cursor: hasZalo ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'inherit', transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => { if (hasZalo) e.currentTarget.style.opacity = '0.88'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              <MessageOutlined style={{ fontSize: 17 }} />
              Zalo
            </button>
          </a>
        </div>

        {/* Hint khi chưa cấu hình */}
        {!hasFB && !hasZalo && (
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 14, fontSize: 12 }}>
            Liên kết liên hệ chưa được cấu hình. Vui lòng quay lại sau.
          </Text>
        )}
      </Modal>
    </ConfigProvider>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function CustomerSchedulePage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [activeMonth, setActiveMonth] = useState(null);
  const [registerSession, setRegisterSession] = useState(null);
  const [contactLinks, setContactLinks] = useState(null);

  // ── Fetch sessions ─────────────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/sessions?isPublic=true');
      setSessions(data.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch contact links ────────────────────────────────────────────────────
  const fetchContactLinks = useCallback(async () => {
    try {
      const { data } = await api.get('/settings/contact_links');
      setContactLinks(data.data?.value ?? {});
    } catch {
      setContactLinks({});
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchContactLinks();
  }, [fetchSessions, fetchContactLinks]);

  // ── Grouped data ───────────────────────────────────────────────────────────
  const grouped = useMemo(() => groupSessions(sessions), [sessions]);
  const campaignList = useMemo(() => Object.values(grouped).map((g) => g.campaign), [grouped]);

  // Auto-select campaign đầu tiên
  useEffect(() => {
    if (campaignList.length === 0) return;
    if (activeCampaignId && grouped[activeCampaignId]) return;
    setActiveCampaignId(campaignList[0]._id);
    setActiveMonth(null);
  }, [campaignList]); // eslint-disable-line

  const monthList = useMemo(() => {
    if (!activeCampaignId || !grouped[activeCampaignId]) return [];
    return Object.keys(grouped[activeCampaignId].months).sort();
  }, [grouped, activeCampaignId]);

  useEffect(() => {
    if (monthList.length === 0) { setActiveMonth(null); return; }
    setActiveMonth((prev) => (monthList.includes(prev) ? prev : monthList[0]));
  }, [monthList]);

  const displaySessions = useMemo(() => {
    if (!activeCampaignId || !activeMonth) return [];
    const m = grouped[activeCampaignId]?.months[activeMonth] ?? [];
    return [...m].sort((a, b) => a.classCode.localeCompare(b.classCode));
  }, [grouped, activeCampaignId, activeMonth]);

  return (
    <div style={{
      minHeight: '100vh', background: T.white,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
    }}>
      {/* Page Header */}
      <div style={{
        background: T.white, borderBottom: `1px solid ${T.gray1}`,
        padding: '48px 24px 36px', textAlign: 'center',
      }}>
        <Title level={1} style={{
          color: T.black, margin: 0,
          fontWeight: 700, fontSize: 'clamp(28px, 5vw, 48px)',
          letterSpacing: -1.5, lineHeight: 1.1, fontFamily: 'inherit',
        }}>
          Lịch Học
        </Title>
        <Text style={{ color: T.gray3, fontSize: 16, display: 'block', marginTop: 10 }}>
          Chọn khóa học và đăng ký lớp phù hợp với bạn
        </Text>
      </div>

      <div style={{ maxWidth: 1380, margin: '0 auto', padding: '0 20px 64px' }}>

        {/* Sticky Filter Bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: `${T.white}ee`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          paddingTop: 16, paddingBottom: 4, marginBottom: 8,
        }}>
          {/* Khóa học */}
          <div style={{ marginBottom: 6 }}>
            <Text style={{ fontSize: 10, fontWeight: 700, color: T.gray3, textTransform: 'uppercase', letterSpacing: 1 }}>
              Khóa học
            </Text>
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {campaignList.map((c) => (
              <Pill
                key={c._id}
                id={`filter-campaign-${c._id}`}
                label={c.title}
                active={activeCampaignId === c._id}
                onClick={() => { setActiveCampaignId(c._id); setActiveMonth(null); }}
              />
            ))}
          </div>

          {/* Tháng */}
          {monthList.length > 0 && (
            <>
              <div style={{ marginBottom: 6, marginTop: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: 700, color: T.gray3, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Tháng
                </Text>
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {monthList.map((mk) => (
                  <Pill
                    key={mk}
                    id={`filter-month-${mk}`}
                    label={`Tháng ${mk}`}
                    active={activeMonth === mk}
                    onClick={() => setActiveMonth(mk)}
                  />
                ))}
              </div>
            </>
          )}
          <div style={{ height: 1, background: T.gray1, marginTop: 4 }} />
        </div>

        {/* Result count */}
        {!loading && displaySessions.length > 0 && (
          <div style={{ margin: '12px 0 20px' }}>
            <Text style={{ fontSize: 13, color: T.gray3 }}>{displaySessions.length} lớp học</Text>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <Flex justify="center" style={{ padding: '80px 0' }}>
            <Spin size="large" />
          </Flex>
        ) : displaySessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <Text style={{ color: T.gray3, fontSize: 15 }}>Tháng này chưa có lớp học nào.</Text>
          </div>
        ) : (
          <Row gutter={[{ xs: 8, sm: 16 }, { xs: 12, sm: 16 }]}>
            {displaySessions.map((session) => (
              <Col key={session._id} lg={6} md={8} sm={12} xs={12}>
                <SessionCard session={session} onRegister={setRegisterSession} />
              </Col>
            ))}
          </Row>
        )}
      </div>

      {/* Contact Modal */}
      <ContactModal
        open={!!registerSession}
        session={registerSession}
        contactLinks={contactLinks}
        onClose={() => setRegisterSession(null)}
      />

      {/* Hide scrollbar & Animations */}
      <style>{`
        *::-webkit-scrollbar { display: none !important; }
        * { -webkit-font-smoothing: antialiased; }

        @keyframes statusPulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(52, 199, 89, 0.7); opacity: 1; }
          70% { transform: scale(1); box-shadow: 0 0 0 4px rgba(52, 199, 89, 0); opacity: 0.8; }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(52, 199, 89, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
