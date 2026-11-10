import { useEffect, useState, useMemo, useCallback } from "react";
import { Row, Col, Typography, Flex, Spin } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../services/api";
import { T } from "../constants";
import { groupPublicSessions, parseMonthKey } from "../utils/formatters";
import ScheduleFilterBar from "../components/schedule/ScheduleFilterBar";
import CourseSelectModal from "../components/schedule/CourseSelectModal";
import CustomerSessionCard from "../components/schedule/CustomerSessionCard";
import ContactModal from "../components/schedule/ContactModal";
import FloatingContactWidget from "../components/schedule/FloatingContactWidget";

const { Title, Text } = Typography;

export default function CustomerSchedulePage() {
  // Khởi tạo từ cache (SWR) nếu đã có dữ liệu trước đó giúp hiển thị tức thì 0ms
  const [sessions, setSessions] = useState(
    () => api.getCached("/sessions?isPublic=true")?.data ?? [],
  );
  const [contactLinks, setContactLinks] = useState(
    () => api.getCached("/settings/contact_links")?.data?.value ?? null,
  );
  const [loading, setLoading] = useState(
    () => !api.getCached("/sessions?isPublic=true"),
  );

  // Khi mới vào web: selectedCampaignId = null để hiện nút mời chọn khóa học ở giữa màn hình
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [filterDate, setFilterDate] = useState(null);
  const [registerSession, setRegisterSession] = useState(null);

  // ── Gọi song song (Parallel Fetch) + SWR Cache ─────────────────────────────
  useEffect(() => {
    let ignore = false;
    Promise.all([
      api.fetchCached("/sessions?isPublic=true"),
      api
        .fetchCached("/settings/contact_links")
        .catch(() => ({ data: { value: {} } })),
    ])
      .then(([sessionsRes, settingsRes]) => {
        if (ignore) return;
        setSessions(sessionsRes?.data ?? []);
        setContactLinks(settingsRes?.data?.value ?? {});
      })
      .catch(() => {
        // Giữ nguyên dữ liệu hiện có nếu mạng chập chờn
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // ── Nhóm dữ liệu theo Khóa học & Tháng ─────────────────────────────────────
  const grouped = useMemo(() => groupPublicSessions(sessions), [sessions]);
  const campaignList = useMemo(
    () => Object.values(grouped).map((g) => g.campaign),
    [grouped],
  );

  const activeCampaignId = useMemo(() => {
    if (selectedCampaignId && grouped[selectedCampaignId])
      return selectedCampaignId;
    return null;
  }, [selectedCampaignId, grouped]);

  const activeCampaign = useMemo(
    () => (activeCampaignId ? grouped[activeCampaignId]?.campaign : null),
    [activeCampaignId, grouped],
  );

  const monthList = useMemo(() => {
    if (!activeCampaignId || !grouped[activeCampaignId]) return [];
    return Object.keys(grouped[activeCampaignId].months).sort();
  }, [grouped, activeCampaignId]);

  const activeMonth = useMemo(() => {
    if (selectedMonth && monthList.includes(selectedMonth))
      return selectedMonth;
    return monthList[0] ?? null;
  }, [selectedMonth, monthList]);

  // ── Lọc danh sách lớp hiển thị ─────────────────────────────────────────────
  const displaySessions = useMemo(() => {
    if (!activeCampaignId || !activeMonth) return [];
    const m = grouped[activeCampaignId]?.months[activeMonth] ?? [];
    let result = [...m].sort((a, b) => a.classCode.localeCompare(b.classCode));

    if (filterDate) {
      const targetStr = filterDate.format("YYYY-MM-DD");
      result = result.filter((s) =>
        (s.studyDates ?? []).some(
          (d) => dayjs(d).format("YYYY-MM-DD") === targetStr,
        ),
      );
    }
    return result;
  }, [grouped, activeCampaignId, activeMonth, filterDate]);

  // ── Cấu hình DatePicker theo tháng đang chọn ──────────────────────────────
  const parsedActiveMonth = useMemo(
    () => parseMonthKey(activeMonth),
    [activeMonth],
  );

  const defaultPickerValue = useMemo(() => {
    if (!parsedActiveMonth) return dayjs();
    return dayjs()
      .year(parsedActiveMonth.year)
      .month(parsedActiveMonth.month - 1)
      .date(1)
      .startOf("day");
  }, [parsedActiveMonth]);

  const disabledDateFilter = useCallback(
    (current) => {
      if (!current || !parsedActiveMonth) return false;
      return (
        current.month() + 1 !== parsedActiveMonth.month ||
        current.year() !== parsedActiveMonth.year
      );
    },
    [parsedActiveMonth],
  );

  const handleSelectCampaign = useCallback((id) => {
    setSelectedCampaignId(id);
    setSelectedMonth(null);
    setFilterDate(null);
  }, []);

  const handleSelectMonth = useCallback((mk) => {
    setSelectedMonth(mk);
    setFilterDate(null);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.white,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
      }}
    >
      {/* Page Header */}
      <div
        style={{
          background: T.white,
          borderBottom: `1px solid ${T.gray1}`,
          padding: "48px 24px 36px",
          textAlign: "center",
        }}
      >
        <Title
          level={1}
          style={{
            color: T.black,
            margin: 0,
            fontWeight: 700,
            fontSize: "clamp(28px, 5vw, 48px)",
            letterSpacing: -1.5,
            lineHeight: 1.1,
            fontFamily: "inherit",
          }}
        >
          Lịch Học
        </Title>
        {/* <Text
          style={{
            color: T.gray3,
            fontSize: 16,
            display: "block",
            marginTop: 10,
          }}
        >
          Chọn khóa học và đăng ký lớp phù hợp với bạn
        </Text> */}
      </div>

      <div style={{ maxWidth: 1380, margin: "0 auto", padding: "0 20px 64px" }}>
        <ScheduleFilterBar
          activeCampaign={activeCampaign}
          campaignCount={campaignList.length}
          onOpenCourseModal={() => setCourseModalOpen(true)}
          monthList={monthList}
          activeMonth={activeMonth}
          onSelectMonth={handleSelectMonth}
          loading={loading}
          sessionCount={displaySessions.length}
          filterDate={filterDate}
          onChangeFilterDate={setFilterDate}
          defaultPickerValue={defaultPickerValue}
          disabledDateFilter={disabledDateFilter}
        />

        {/* Nội dung chính */}
        {loading ? (
          <Flex justify="center" style={{ padding: "80px 0" }}>
            <Spin size="large" />
          </Flex>
        ) : !activeCampaign ? (
          /* Trạng thái khi mới vào trang (chưa chọn khóa học): Màn hình hướng dẫn tinh tế ở giữa */
          <div
            onClick={() => setCourseModalOpen(true)}
            style={{
              maxWidth: 460,
              margin: "28px auto 0",
              padding: "40px 28px",
              borderRadius: 20,
              background: "#FAFAFC",
              border: `1px dashed ${T.gray2}`,
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.25s ease",
            }}
            className="empty-course-prompt"
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: "#F3E8FF",
                color: "#7E22CE",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                marginBottom: 14,
              }}
            >
              <CalendarOutlined />
            </div>
            <Title
              level={5}
              style={{
                margin: "0 0 6px",
                color: T.black,
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              Chưa chọn khóa học
            </Title>
            <Text
              style={{
                color: T.gray3,
                fontSize: 14,
                lineHeight: 1.5,
                display: "block",
              }}
            >
              Hãy nhấn vào nút{" "}
              <strong style={{ color: T.black }}>
                "Chọn khóa học phù hợp"
              </strong>{" "}
              phía trên để xem lịch khai giảng và danh sách các lớp đang mở.
            </Text>
          </div>
        ) : displaySessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <Text style={{ color: T.gray3, fontSize: 15 }}>
              {filterDate
                ? `Không có lớp học nào vào ngày ${filterDate.format("DD/MM/YYYY")}.`
                : "Tháng này chưa có lớp học nào."}
            </Text>
          </div>
        ) : (
          <Row
            gutter={[
              { xs: 12, sm: 12, md: 16 },
              { xs: 12, sm: 12, md: 16 },
            ]}
          >
            {displaySessions.map((session) => (
              <Col key={session._id} xs={24} sm={24} md={12} lg={8} xl={6}>
                <CustomerSessionCard
                  session={session}
                  onRegister={setRegisterSession}
                />
              </Col>
            ))}
          </Row>
        )}
      </div>

      {/* Modal chọn khóa học */}
      <CourseSelectModal
        open={courseModalOpen}
        onClose={() => setCourseModalOpen(false)}
        campaignList={campaignList}
        grouped={grouped}
        activeCampaignId={activeCampaignId}
        onSelectCampaign={handleSelectCampaign}
      />

      {/* Modal liên hệ đăng ký */}
      <ContactModal
        open={!!registerSession}
        session={registerSession}
        contactLinks={contactLinks}
        onClose={() => setRegisterSession(null)}
      />

      {/* Nút tròn nổi Thông tin liên hệ & Địa chỉ Studio */}
      <FloatingContactWidget contactLinks={contactLinks} />
    </div>
  );
}
