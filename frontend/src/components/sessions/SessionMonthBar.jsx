import { memo, useMemo, useRef, useEffect } from "react";
import { Flex, Typography, Tag } from "antd";
import { CalendarOutlined } from "@ant-design/icons";

const { Text } = Typography;

/**
 * Bảng màu hài hòa, dịu mắt cho Admin (Soft Blue / Slate — Không dùng màu đen nặng nề)
 */
const PALETTE = {
  activeBg: "#ffffff", // Nền xanh lam cực dịu khi đang chọn
  activeBorder: "#3B82F6", // Viền xanh lam tinh tế
  activeText: "#1D4ED8", // Chữ xanh đậm rõ nét
  activeBadgeBg: "#ffffff", // Badge đếm lớp nổi bật nhẹ nhàng
  activeBadgeText: "#FFFFFF",

  inactiveBg: "#FFFFFF",
  inactiveBorder: "#E2E8F0",
  inactiveText: "#334155",
  inactiveBadgeBg: "#F1F5F9",
  inactiveBadgeText: "#64748B",

  containerBg: "#F8FAFC", // Nền thanh chứa sáng và thoáng
  containerBorder: "#E2E8F0",
  yearBoxBg: "#EEF2F6",
  yearActiveBg: "#FFFFFF",
  yearActiveText: "#1E293B",
  yearInactiveText: "#64748B",
};

/**
 * Thanh chọn Năm & Tháng khoa học cho trang Quản lý Lớp học (Tối ưu cho cả Web & Mobile)
 * - Tự động phân nhóm theo NĂM nếu khóa học kéo dài qua nhiều năm (VD: 2025, 2026, 2027)
 * - Không lặp lại '/2026' ở từng nút tháng giúp tiết kiệm diện tích và không rối mắt
 * - Tích hợp hiệu ứng Sticky bám dính mượt mà khi cuộn danh sách lớp học trên Mobile
 * - Tone màu Soft Blue / Slate hài hòa, đồng bộ với bảng quản trị
 */
const SessionMonthBar = memo(function SessionMonthBar({
  sortedMonthKeys,
  currentCampaignMonths,
  selectedMonthKey,
  onSelectMonth,
  isMobile = false,
}) {
  const activeTabRef = useRef(null);

  // Phân tích danh sách tháng thành cấu trúc theo Năm: { '2026': [{ raw: '09/2026', mm: '09', yyyy: '2026' }, ...] }
  const { years, monthsByYear, allParsed } = useMemo(() => {
    const byYear = {};
    const parsedList = [];

    (sortedMonthKeys ?? []).forEach((mk) => {
      const [mm, yyyy] = String(mk).split("/");
      const yearKey = yyyy || "Khác";
      const item = { raw: mk, mm: mm || mk, yyyy: yearKey };
      parsedList.push(item);
      if (!byYear[yearKey]) byYear[yearKey] = [];
      byYear[yearKey].push(item);
    });

    const yearKeys = Object.keys(byYear).sort((a, b) => Number(a) - Number(b));
    return { years: yearKeys, monthsByYear: byYear, allParsed: parsedList };
  }, [sortedMonthKeys]);

  // Xác định năm đang chọn dựa trên selectedMonthKey
  const activeYear = useMemo(() => {
    if (!selectedMonthKey) return years[0] ?? "";
    const parts = String(selectedMonthKey).split("/");
    return parts[1] || years[0] || "";
  }, [selectedMonthKey, years]);

  // Các tháng thuộc năm đang chọn
  const currentYearMonths = useMemo(
    () => monthsByYear[activeYear] ?? allParsed,
    [monthsByYear, activeYear, allParsed],
  );

  // Tự động cuộn ngang mượt để đưa nút tháng đang chọn vào giữa khung nhìn
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedMonthKey]);

  if (!sortedMonthKeys || sortedMonthKeys.length === 0) return null;

  // Khi đổi Năm: tự động chuyển sang tháng đầu tiên có lớp (hoặc tháng đầu tiên) của năm đó
  const handleSelectYear = (yr) => {
    const monthsInYr = monthsByYear[yr] ?? [];
    if (monthsInYr.length === 0) return;
    const firstWithClasses = monthsInYr.find(
      (m) => (currentCampaignMonths[m.raw]?.sessions?.length ?? 0) > 0,
    );
    onSelectMonth((firstWithClasses ?? monthsInYr[0]).raw);
  };

  // Thống kê của tháng đang chọn
  const activeMonthSessions =
    (selectedMonthKey && currentCampaignMonths[selectedMonthKey]?.sessions) ||
    [];
  const totalInMonth = activeMonthSessions.length;
  const openInMonth = activeMonthSessions.filter(
    (s) => s.status === "open",
  ).length;
  const fullInMonth = activeMonthSessions.filter(
    (s) => s.status === "full",
  ).length;
  const hiddenInMonth = activeMonthSessions.filter((s) => s.isHidden).length;

  const hasMultipleYears = years.length > 1;

  // ── GIAO DIỆN MOBILE (Có hiệu ứng Sticky bám dính khi cuộn danh sách lớp) ──
  if (isMobile) {
    const useGrid = currentYearMonths.length <= 4;

    return (
      <div
        style={{
          position: "sticky",
          top: 64, // Bám ngay bên dưới thanh Header (cao 64px) của MainLayout
          zIndex: 9,
          background: "rgba(255, 255, 255, 0.96)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          padding: "8px 4px 10px",
          margin: "0 -4px 12px",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        {/* Hàng 1 (Mobile): Chọn Năm (trải rộng 100%, không còn bị ép bởi dropdown) */}
        {hasMultipleYears && (
          <div
            className="mobile-month-pills-bar"
            style={{
              display: "inline-flex",
              background: PALETTE.yearBoxBg,
              padding: 3,
              borderRadius: 8,
              gap: 3,
              overflowX: "auto",
              maxWidth: "100%",
              marginBottom: 8,
            }}
          >
            {years.map((yr) => {
              const isYrActive = yr === activeYear;
              return (
                <div
                  key={yr}
                  onClick={() => handleSelectYear(yr)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: isYrActive ? 700 : 500,
                    background: isYrActive
                      ? PALETTE.yearActiveBg
                      : "transparent",
                    color: isYrActive
                      ? PALETTE.activeText
                      : PALETTE.yearInactiveText,
                    boxShadow: isYrActive
                      ? "0 1px 3px rgba(0,0,0,0.08)"
                      : "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  Năm {yr}
                </div>
              );
            })}
          </div>
        )}

        {/* Hàng 2 (Mobile): Dải nút Tháng trong năm đang chọn */}
        <div
          className="mobile-month-pills-bar"
          style={{
            display: useGrid ? "grid" : "flex",
            gridTemplateColumns: useGrid
              ? `repeat(${currentYearMonths.length}, minmax(0, 1fr))`
              : undefined,
            overflowX: useGrid ? "visible" : "auto",
            gap: 8,
            padding: "2px 0 8px 0",
          }}
        >
          {currentYearMonths.map(({ raw, mm }) => {
            const mSessions = currentCampaignMonths[raw]?.sessions ?? [];
            const count = mSessions.length;
            const openCount = mSessions.filter(
              (s) => s.status === "open",
            ).length;
            const isActive = raw === selectedMonthKey;

            return (
              <div
                key={raw}
                ref={isActive ? activeTabRef : null}
                onClick={() => onSelectMonth(raw)}
                className="mobile-month-pill"
                style={{
                  borderRadius: 10,
                  padding: "7px 6px",
                  textAlign: "center",
                  cursor: "pointer",
                  userSelect: "none",
                  flexShrink: 0,
                  minWidth: useGrid ? 0 : 84,
                  background: isActive ? PALETTE.activeBg : PALETTE.inactiveBg,
                  color: isActive ? PALETTE.activeText : PALETTE.inactiveText,
                  border: isActive
                    ? `1.5px solid ${PALETTE.activeBorder}`
                    : `1px solid ${PALETTE.inactiveBorder}`,
                  boxShadow: isActive
                    ? "0 2px 8px rgba(59, 130, 246, 0.14)"
                    : "0 1px 2px rgba(0, 0, 0, 0.02)",
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 600,
                    lineHeight: 1.25,
                    whiteSpace: "nowrap",
                  }}
                >
                  Tháng {mm}
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    marginTop: 2,
                    fontSize: 11.5,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive
                      ? PALETTE.activeText
                      : PALETTE.inactiveBadgeText,
                    whiteSpace: "nowrap",
                  }}
                >
                  {openCount > 0 && (
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "#22C55E",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <span>{count} lớp</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Hàng 3 (Mobile): Thanh tóm tắt trạng thái của tháng đang chọn */}
        <Flex
          justify="space-between"
          align="center"
          wrap="wrap"
          gap={8}
          style={{
            background: "#FFFFFF",
            border: `1px solid ${PALETTE.inactiveBorder}`,
            borderRadius: 8,
            padding: "7px 12px",
          }}
        >
          <Text strong style={{ fontSize: 13, color: "#1E293B" }}>
            Tháng {selectedMonthKey}
          </Text>

          <Flex align="center" gap={6} wrap="wrap">
            <Tag
              style={{
                margin: 0,
                fontSize: 11.5,
                fontWeight: 600,
                borderRadius: 6,
                background: "#F1F5F9",
                color: "#334155",
                border: "none",
              }}
            >
              Tổng: {totalInMonth} lớp
            </Tag>
            {openInMonth > 0 && (
              <Tag
                color="success"
                style={{
                  margin: 0,
                  fontSize: 11.5,
                  fontWeight: 600,
                  borderRadius: 6,
                }}
              >
                {openInMonth} mở
              </Tag>
            )}
            {fullInMonth > 0 && (
              <Tag
                color="error"
                style={{
                  margin: 0,
                  fontSize: 11.5,
                  fontWeight: 600,
                  borderRadius: 6,
                }}
              >
                {fullInMonth} đầy
              </Tag>
            )}
            {hiddenInMonth > 0 && (
              <Tag
                style={{
                  margin: 0,
                  fontSize: 11.5,
                  borderRadius: 6,
                  color: "#64748B",
                }}
              >
                {hiddenInMonth} ẩn
              </Tag>
            )}
          </Flex>
        </Flex>
      </div>
    );
  }

  // ── GIAO DIỆN DESKTOP ──────────────────────────────────────────────────────
  return (
    <div
      style={{
        padding: "12px 16px",
        borderBottom: `1px solid ${PALETTE.containerBorder}`,
        background: PALETTE.containerBg,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
      }}
    >
      <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
        {/* Bên trái: Bộ chọn Năm + Dải Tháng của năm đó */}
        <Flex align="center" gap={10} style={{ flex: 1, minWidth: 0 }}>
          {hasMultipleYears ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: PALETTE.yearBoxBg,
                padding: 3,
                borderRadius: 9,
                gap: 2,
                flexShrink: 0,
              }}
            >
              {years.map((yr) => {
                const isYrActive = yr === activeYear;
                const yrClassCount = (monthsByYear[yr] ?? []).reduce(
                  (sum, m) =>
                    sum + (currentCampaignMonths[m.raw]?.sessions?.length ?? 0),
                  0,
                );
                return (
                  <div
                    key={yr}
                    onClick={() => handleSelectYear(yr)}
                    style={{
                      padding: "5px 11px",
                      borderRadius: 7,
                      fontSize: 12.5,
                      fontWeight: isYrActive ? 700 : 500,
                      background: isYrActive
                        ? PALETTE.yearActiveBg
                        : "transparent",
                      color: isYrActive
                        ? PALETTE.activeText
                        : PALETTE.yearInactiveText,
                      boxShadow: isYrActive
                        ? "0 1px 3px rgba(15, 23, 42, 0.08)"
                        : "none",
                      cursor: "pointer",
                      userSelect: "none",
                      whiteSpace: "nowrap",
                      transition: "all 0.18s ease",
                    }}
                  >
                    {yr}
                    <span
                      style={{
                        marginLeft: 4,
                        fontSize: 11,
                        opacity: 0.75,
                        fontWeight: 500,
                      }}
                    >
                      ({yrClassCount})
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                borderRadius: 8,
                background: "#EEF2F6",
                color: "#475569",
                fontSize: 12.5,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              <CalendarOutlined style={{ fontSize: 12, color: "#64748B" }} />
              <span>Năm {activeYear}</span>
            </div>
          )}

          {/* Dải nút chọn Tháng (Cuộn ngang mượt mà, không lặp lại '/2026') */}
          <div
            className="mobile-month-pills-bar"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              overflowX: "auto",
              padding: "2px 2px",
              flex: 1,
              minWidth: 0,
            }}
          >
            {currentYearMonths.map(({ raw, mm }) => {
              const mSessions = currentCampaignMonths[raw]?.sessions ?? [];
              const count = mSessions.length;
              const openCount = mSessions.filter(
                (s) => s.status === "open",
              ).length;
              const isActive = raw === selectedMonthKey;

              return (
                <div
                  key={raw}
                  ref={isActive ? activeTabRef : null}
                  onClick={() => onSelectMonth(raw)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "6px 13px",
                    borderRadius: 9,
                    cursor: "pointer",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    background: isActive
                      ? PALETTE.activeBg
                      : PALETTE.inactiveBg,
                    color: isActive ? PALETTE.activeText : PALETTE.inactiveText,
                    border: isActive
                      ? `1.5px solid ${PALETTE.activeBorder}`
                      : `1px solid ${PALETTE.inactiveBorder}`,
                    boxShadow: isActive
                      ? "0 2px 8px rgba(59, 130, 246, 0.12)"
                      : "0 1px 2px rgba(15, 23, 42, 0.02)",
                    transition: "all 0.18s ease",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: isActive ? 700 : 600,
                      letterSpacing: -0.1,
                    }}
                  >
                    Tháng {mm}
                  </span>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11.5,
                      fontWeight: 600,
                      padding: "1px 7px",
                      borderRadius: 999,
                      background: isActive
                        ? PALETTE.activeBadgeBg
                        : PALETTE.inactiveBadgeBg,
                      color: isActive
                        ? PALETTE.activeBadgeText
                        : PALETTE.inactiveBadgeText,
                    }}
                  >
                    {openCount > 0 && (
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: isActive ? "#86EFAC" : "#22C55E",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </Flex>

        {/* Bên phải: Cụm thống kê tháng đang xem */}
        <Flex align="center" gap={6} wrap="wrap" style={{ flexShrink: 0 }}>
          <Tag
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              padding: "2px 9px",
              background: "#FFFFFF",
              borderColor: "#E2E8F0",
              color: "#334155",
            }}
          >
            Tổng: {totalInMonth} lớp
          </Tag>
          {openInMonth > 0 && (
            <Tag
              color="success"
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                padding: "2px 9px",
              }}
            >
              {openInMonth} đang mở
            </Tag>
          )}
          {fullInMonth > 0 && (
            <Tag
              color="error"
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                padding: "2px 9px",
              }}
            >
              {fullInMonth} đã đầy
            </Tag>
          )}
          {hiddenInMonth > 0 && (
            <Tag
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                padding: "2px 9px",
                color: "#64748B",
              }}
            >
              {hiddenInMonth} đang ẩn
            </Tag>
          )}
        </Flex>
      </Flex>
    </div>
  );
});

export default SessionMonthBar;
