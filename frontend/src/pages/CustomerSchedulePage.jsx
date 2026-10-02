import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Row, Col, Card, Typography, Flex, Spin, Modal, Button, ConfigProvider, Grid, DatePicker,
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

// ── parseMonthKey — Tách { month, year } từ chuỗi 'MM/YYYY' hoặc 'M/YYYY' ────
const parseMonthKey = (monthStr) => {
  if (!monthStr || typeof monthStr !== 'string') return null;
  const parts = monthStr.trim().split('/').map((p) => parseInt(p, 10));
  if (parts.length >= 2) {
    const [mm, yyyy] = parts;
    if (!isNaN(mm) && !isNaN(yyyy) && mm >= 1 && mm <= 12) return { month: mm, year: yyyy };
  } else if (parts.length === 1 && !isNaN(parts[0])) {
    const mm = parts[0];
    if (mm >= 1 && mm <= 12) return { month: mm, year: dayjs().year() };
  }
  return null;
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
        <span style={{ color: '#8E8E93', fontSize: 13, flexShrink: 0 }}>
          Giờ học:
        </span>
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
        <span style={{ color: '#8E8E93', fontSize: 13, flexShrink: 0, paddingTop: 1 }}>
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
        <span style={{ color: '#8E8E93', fontSize: 13, flexShrink: 0 }}>
          Sĩ số:
        </span>
        <span style={{ color: T.black, fontWeight: 600, fontSize: 13 }}>
          {session.currentBooked}/{session.maxCapacity}
        </span>
        {!isFull && (
          <span style={{ color: '#8E8E93', fontSize: 12 }}>
            (còn {session.maxCapacity - session.currentBooked})
          </span>
        )}
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
          <div style={{ background: T.gray1, borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
            {/* Giờ học */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              <span style={{ color: '#8E8E93', fontSize: 13, flexShrink: 0 }}>
                Giờ học:
              </span>
              <span
                style={{
                  fontSize: 14,
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
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              <span style={{ color: '#8E8E93', fontSize: 13, flexShrink: 0, paddingTop: 3 }}>
                Ngày học:
              </span>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  flex: 1,
                }}
              >
                {sortedDates.map((d, i) => (
                  <span
                    key={i}
                    style={{
                      background: T.white,
                      color: T.black,
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: `1px solid ${T.gray2}`,
                      display: 'inline-block',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {dayjs(d).format('DD/MM/YYYY')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CTA text */}
        <Paragraph style={{ color: T.gray3, fontSize: 14, lineHeight: 1.6, marginBottom: 20, textAlign: 'center' }}>
          Vui lòng liên hệ với chúng tôi qua{' '}
          <strong style={{ color: T.black }}>Facebook</strong> hoặc{' '}
          <strong style={{ color: T.black }}>Zalo</strong>{' '}
          để được tư vấn và chốt lịch học nhanh nhất.
        </Paragraph>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          {/* Facebook */}
          <Button
            type="primary"
            size="middle"
            icon={<FacebookFilled style={{ fontSize: 16 }} />}
            href={hasFB ? contactLinks.facebook : undefined}
            target="_blank"
            rel="noopener noreferrer"
            disabled={!hasFB}
            className="btn-center-content"
            style={{
              width: 130,
              height: 38,
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              background: hasFB ? '#1877F2' : undefined,
              borderColor: hasFB ? '#1877F2' : undefined,
              fontWeight: 600,
              fontSize: 14,
              boxShadow: 'none',
            }}
          >
            Facebook
          </Button>

          {/* Zalo */}
          <Button
            type="primary"
            size="middle"
            icon={<MessageOutlined style={{ fontSize: 15 }} />}
            href={hasZalo ? contactLinks.zalo : undefined}
            target="_blank"
            rel="noopener noreferrer"
            disabled={!hasZalo}
            className="btn-center-content"
            style={{
              width: 130,
              height: 38,
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              background: hasZalo ? '#0068FF' : undefined,
              borderColor: hasZalo ? '#0068FF' : undefined,
              fontWeight: 600,
              fontSize: 14,
              boxShadow: 'none',
            }}
          >
            Zalo
          </Button>
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
  const screens = Grid.useBreakpoint();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [activeMonth, setActiveMonth] = useState(null);
  const [filterDate, setFilterDate] = useState(null);
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
    let result = [...m].sort((a, b) => a.classCode.localeCompare(b.classCode));
    if (filterDate) {
      const targetStr = filterDate.format('YYYY-MM-DD');
      result = result.filter((s) =>
        (s.studyDates ?? []).some((d) => dayjs(d).format('YYYY-MM-DD') === targetStr)
      );
    }
    return result;
  }, [grouped, activeCampaignId, activeMonth, filterDate]);

  // Reset filterDate khi đổi tháng hoặc đổi khóa học
  useEffect(() => {
    setFilterDate(null);
  }, [activeMonth]);

  // Parse activeMonth để dùng cho defaultPickerValue & disabledDate
  const parsedActiveMonth = useMemo(() => parseMonthKey(activeMonth), [activeMonth]);

  const defaultPickerValue = useMemo(() => {
    if (!parsedActiveMonth) return dayjs();
    return dayjs().year(parsedActiveMonth.year).month(parsedActiveMonth.month - 1).date(1).startOf('day');
  }, [parsedActiveMonth]);

  const disabledDateFilter = useCallback(
    (current) => {
      if (!current || !parsedActiveMonth) return false;
      return (
        current.month() + 1 !== parsedActiveMonth.month ||
        current.year() !== parsedActiveMonth.year
      );
    },
    [parsedActiveMonth]
  );

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

        {/* Result count & Search bar */}
        {!loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: T.gray3, whiteSpace: 'nowrap' }}>
              {displaySessions.length} lớp học
            </Text>
            {activeMonth && (
              <div style={{ flex: 1 }}>
                <DatePicker
                  key={activeMonth}
                  placeholder="Tìm ngày học phù hợp"
                  allowClear
                  format="DD/MM/YYYY"
                  value={filterDate}
                  onChange={(val) => setFilterDate(val ?? null)}
                  defaultPickerValue={defaultPickerValue}
                  disabledDate={disabledDateFilter}
                  inputReadOnly={!screens.md}
                  style={{
                    width: '100%',
                    borderRadius: 20,
                    border: `1px solid ${filterDate ? T.black : T.gray2}`,
                    fontSize: 14,
                  }}
                  id="filter-session-date"
                  popupStyle={{ zIndex: 1100 }}
                />
              </div>
            )}
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
            <Text style={{ color: T.gray3, fontSize: 15 }}>
              {filterDate
                ? `Không có lớp học nào vào ngày ${filterDate.format('DD/MM/YYYY')}.`
                : 'Tháng này chưa có lớp học nào.'}
            </Text>
          </div>
        ) : (
          <Row gutter={[{ xs: 12, sm: 12, md: 16 }, { xs: 12, sm: 12, md: 16 }]}>
            {displaySessions.map((session) => (
              <Col key={session._id} xs={24} sm={24} md={12} lg={8} xl={6}>
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

        .session-card {
          transition: all 0.3s ease !important;
        }
        .session-card-interactive {
          cursor: pointer !important;
        }
        .session-card-interactive:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
        }
        .session-card-interactive:active {
          transform: translateY(0);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06) !important;
        }
        .session-card-disabled {
          cursor: default !important;
        }

        .btn-center-content {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          gap: 8px !important;
        }
        .btn-center-content .ant-btn-icon {
          margin: 0 !important;
          margin-inline-end: 0 !important;
        }
      `}</style>
    </div>
  );
}
