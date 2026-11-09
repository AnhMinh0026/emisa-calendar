import { memo, useMemo, useRef, useEffect } from "react";
import { Flex, Typography } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import { T } from "../../constants";

const { Text } = Typography;

/**
 * Bảng màu tối giản chuẩn SaaS (Linear / Apple Minimalist)
 */
const PALETTE = {
  activeBg: "#1E4DB7",
  activeBorder: "#1E4DB7",
  activeText: "#FFFFFF",
  activeBadgeBg: "rgba(255, 255, 255, 0.22)",
  activeBadgeText: "#FFFFFF",

  inactiveBg: "#FFFFFF",
  inactiveBorder: "#E2E8F0",
  inactiveText: "#334155",
  inactiveBadgeBg: "#EBF3FE",
  inactiveBadgeText: "#1E4DB7",

  containerBg: "#F8FAFC",
  containerBorder: "#EEF2F6",
  yearBoxBg: "#EBF3FE",
  yearActiveBg: "#1E4DB7",
  yearActiveText: "#FFFFFF",
  yearInactiveText: "#1E4DB7",
};

/**
 * Thanh chọn Năm & Tháng khoa học cho trang Quản lý Lớp học (Tối ưu cho cả Web & Mobile)
 */
const SessionMonthBar = memo(function SessionMonthBar({
  sortedMonthKeys,
  currentCampaignMonths,
  selectedMonthKey,
  onSelectMonth,
  isMobile = false,
}) {
  const activeTabRef = useRef(null);

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

  const activeYear = useMemo(() => {
    if (!selectedMonthKey) return years[0] ?? "";
    const parts = String(selectedMonthKey).split("/");
    return parts[1] || years[0] || "";
  }, [selectedMonthKey, years]);

  const currentYearMonths = useMemo(
    () => monthsByYear[activeYear] ?? allParsed,
    [monthsByYear, activeYear, allParsed],
  );

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

  // ── GIAO DIỆN MOBILE ──
  if (isMobile) {
    const useGrid = currentYearMonths.length <= 4;

    return (
      <div
        style={{
          position: "sticky",
          top: 60,
          zIndex: 9,
          background: "rgba(255, 255, 255, 0.96)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          padding: "8px 4px 10px",
          margin: "0 -4px 12px",
          borderBottom: "1px solid #EFEFF4",
        }}
      >
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
                      ? PALETTE.yearActiveText
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
                      ? "rgba(255, 255, 255, 0.85)"
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
                        background: isActive ? "#4ADE80" : "#22C55E",
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

        {/* Tóm tắt trạng thái tinh gọn không lạm dụng Tag */}
        <Flex
          justify="space-between"
          align="center"
          wrap="wrap"
          gap={8}
          style={{
            background: "#FAFAFC",
            border: `1px solid ${PALETTE.inactiveBorder}`,
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
          }}
        >
          <Text strong style={{ fontSize: 12.5, color: T.black }}>
            Tháng {selectedMonthKey}
          </Text>

          <Flex align="center" gap={10} wrap="wrap">
            <span style={{ color: "#6E6E73" }}>
              Tổng: <strong style={{ color: T.black }}>{totalInMonth}</strong>
            </span>
            {openInMonth > 0 && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  color: "#15803D",
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#22C55E",
                  }}
                />
                {openInMonth} mở
              </span>
            )}
            {fullInMonth > 0 && (
              <span style={{ color: "#B91C1C", fontWeight: 600 }}>
                • {fullInMonth} đầy
              </span>
            )}
            {hiddenInMonth > 0 && (
              <span style={{ color: "#8E8E93" }}>• {hiddenInMonth} ẩn</span>
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
                        ? PALETTE.yearActiveText
                        : PALETTE.yearInactiveText,
                      boxShadow: isYrActive
                        ? "0 1px 3px rgba(0, 0, 0, 0.08)"
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
                background: "#EFEFF4",
                color: "#52525B",
                fontSize: 12.5,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              <CalendarOutlined style={{ fontSize: 12, color: "#6E6E73" }} />
              <span>Năm {activeYear}</span>
            </div>
          )}

          {/* Dải nút chọn Tháng */}
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
                    padding: "5px 12px",
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
                    transition: "all 0.18s ease",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 600,
                      letterSpacing: -0.1,
                    }}
                  >
                    Tháng {mm}
                  </span>

                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: isActive ? 600 : 500,
                      opacity: isActive ? 0.9 : 0.65,
                    }}
                  >
                    ({count})
                  </span>
                </div>
              );
            })}
          </div>
        </Flex>

        {/* Bên phải: Cụm thống kê tháng đang xem bằng Typography + Dot tinh gọn */}
        <Flex align="center" gap={12} wrap="wrap" style={{ flexShrink: 0, fontSize: 12.5 }}>
          <span style={{ color: "#6E6E73" }}>
            Tổng: <strong style={{ color: T.black }}>{totalInMonth} lớp</strong>
          </span>

          {openInMonth > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                color: "#15803D",
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#22C55E",
                }}
              />
              {openInMonth} đang mở
            </span>
          )}

          {fullInMonth > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                color: "#B91C1C",
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#EF4444",
                }}
              />
              {fullInMonth} đã đầy
            </span>
          )}

          {hiddenInMonth > 0 && (
            <span style={{ color: "#8E8E93", fontWeight: 500 }}>
              • {hiddenInMonth} đang ẩn
            </span>
          )}
        </Flex>
      </Flex>
    </div>
  );
});

export default SessionMonthBar;
