import { memo } from "react";
import { DatePicker, Grid } from "antd";
import { T } from "../../constants";

/**
 * Tab chọn Tháng (Tầng 2): Thiết kế Minimalist Underline Tab gọn gàng, không lặp icon gây rối mắt
 */
const MonthTab = memo(function MonthTab({ monthKey, active, onClick, id }) {
  const parts = String(monthKey).split("/");
  const mm = parts[0] || monthKey;
  const yyyy = parts[1] || "";

  return (
    <div
      id={id}
      onClick={onClick}
      className={`schedule-month-tab ${active ? "active" : ""}`}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "baseline",
        gap: 3,
        padding: "10px 18px 12px",
        cursor: "pointer",
        flexShrink: 0,
        whiteSpace: "nowrap",
        userSelect: "none",
        color: active ? T.black : T.gray3,
        transition: "color 0.2s ease",
      }}
    >
      <span
        style={{
          fontSize: 14.5,
          fontWeight: active ? 600 : 500,
          letterSpacing: -0.2,
        }}
      >
        Tháng {mm}
      </span>
      {yyyy && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 400,
            color: active ? "#6E6E73" : T.gray4,
          }}
        >
          /{yyyy}
        </span>
      )}

      {/* Thanh gạch chân điểm nhấn khi active */}
      <span
        style={{
          position: "absolute",
          bottom: -1,
          left: active ? 14 : "50%",
          right: active ? 14 : "50%",
          height: 2,
          borderRadius: 2,
          background: active ? T.black : "transparent",
          transition: "all 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </div>
  );
});

/**
 * Thanh lọc cố định (Sticky Filter Bar) với nút chọn Khóa học căn giữa màn hình
 */
export default function ScheduleFilterBar({
  activeCampaign,
  campaignCount,
  onOpenCourseModal,
  monthList,
  activeMonth,
  onSelectMonth,
  loading,
  sessionCount,
  filterDate,
  onChangeFilterDate,
  defaultPickerValue,
  disabledDateFilter,
}) {
  const screens = Grid.useBreakpoint();

  return (
    <>
      {/* Sticky Filter Bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: `${T.white}f2`,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          paddingTop: 22,
          paddingBottom: activeCampaign ? 0 : 12,
          marginBottom: 18,
        }}
      >
        {/* Tầng 1: Nút Khóa học căn giữa màn hình */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: activeCampaign && monthList.length > 0 ? 14 : 6,
          }}
        >
          {activeCampaign ? (
            /* Khi ĐÃ chọn khóa học: Hiển thị Pill Khóa học đang chọn ở chính giữa + nút Đổi */
            <div
              id="btn-open-course-modal"
              onClick={onOpenCourseModal}
              className="course-trigger-selected"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                padding: "7px 8px 7px 16px",
                borderRadius: 999,
                background: T.white,
                border: `1.5px solid ${T.black}`,
                boxShadow: "0 6px 20px rgba(29, 29, 31, 0.08)",
                cursor: "pointer",
                userSelect: "none",
                maxWidth: "100%",
                transition: "all 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {/* <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#9333EA',
                  boxShadow: '0 0 8px rgba(147, 51, 234, 0.65)',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.gray3,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  flexShrink: 0,
                }}
              >
                Khóa học:
              </span> */}
              <span
                style={{
                  fontSize: 14.5,
                  fontWeight: 700,
                  color: T.black,
                  letterSpacing: -0.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {activeCampaign.title}
              </span>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "5px 12px",
                  borderRadius: 999,
                  background: "#F2F2F7",
                  color: T.black,
                  fontSize: 12,
                  fontWeight: 600,
                  flexShrink: 0,
                  transition: "background 0.2s ease",
                }}
              >
                Đổi khóa học
              </span>
            </div>
          ) : (
            /* Khi MỚI VÀO WEB (Chưa chọn khóa học): Nút CTA nổi bật tinh tế ở giữa màn hình */
            <button
              type="button"
              id="btn-open-course-modal"
              onClick={onOpenCourseModal}
              className="course-trigger-cta"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 26px",
                borderRadius: 999,
                background: T.black,
                color: T.white,
                border: "none",
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: -0.2,
                cursor: "pointer",
                boxShadow: "0 10px 28px rgba(29, 29, 31, 0.2)",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <span>Chọn khóa học phù hợp</span>
              {campaignCount > 0 && (
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "rgba(255, 255, 255, 0.14)",
                    color: "#E5E5EA",
                  }}
                >
                  {campaignCount} khóa
                </span>
              )}
            </button>
          )}
        </div>

        {/* Tầng 2: Tháng khai giảng (Chỉ hiển thị khi đã chọn khóa học) */}
        {activeCampaign && monthList.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: screens.md ? "center" : "flex-start",
              gap: 4,
              overflowX: "auto",
              borderBottom: `1px solid ${T.gray2}`,
              paddingBottom: 1,
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {monthList.map((mk) => (
              <MonthTab
                key={mk}
                id={`filter-month-${mk}`}
                monthKey={mk}
                active={activeMonth === mk}
                onClick={() => onSelectMonth(mk)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thanh trạng thái số lượng lớp & Tìm ngày học (Chỉ hiển thị khi đã chọn khóa học) */}
      {!loading && activeCampaign && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            width: "100%",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#F5F5F7",
              padding: "5px 12px",
              borderRadius: 8,
              border: "1px solid rgba(0, 0, 0, 0.04)",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: T.black,
              }}
            >
              {sessionCount}
            </span>
            <span style={{ fontSize: 13, color: T.gray3 }}>lớp học</span>
          </div>

          {activeMonth && (
            <div style={{ flex: screens.md ? "0 1 280px" : 1, minWidth: 200 }}>
              <DatePicker
                key={activeMonth}
                placeholder="Tìm ngày học phù hợp"
                allowClear
                format="DD/MM/YYYY"
                value={filterDate}
                onChange={(val) => onChangeFilterDate(val ?? null)}
                defaultPickerValue={defaultPickerValue}
                disabledDate={disabledDateFilter}
                inputReadOnly={!screens.md}
                style={{
                  width: "100%",
                  borderRadius: 10,
                  border: `1px solid ${filterDate ? T.black : T.gray2}`,
                  fontSize: 13.5,
                  height: 36,
                }}
                id="filter-session-date"
                styles={{ popup: { root: { zIndex: 1100 } } }}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
