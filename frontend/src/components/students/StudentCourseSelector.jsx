import { useState, memo } from "react";
import {
  Card,
  Flex,
  Typography,
  Button,
  Modal,
  Empty,
  Grid,
  ConfigProvider,
  Tag,
} from "antd";
import {
  SwapOutlined,
  CheckOutlined,
  ArrowRightOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { T } from "../../constants";

const { Title, Text } = Typography;

/**
 * Rút gọn danh sách tháng ['09/2026', '10/2026', '11/2026', '12/2026']
 * thành dạng ngắn gọn trên 1 dòng: Tháng 09 · 10 · 11 · 12 /2026
 */
const formatMonthList = (monthKeys) => {
  if (!monthKeys || monthKeys.length === 0) return null;

  const sorted = [...monthKeys].sort((a, b) => {
    const [mA, yA] = String(a).split("/").map(Number);
    const [mB, yB] = String(b).split("/").map(Number);
    return yA !== yB ? yA - yB : mA - mB;
  });

  const parsed = sorted.map((mk) => {
    const [mm, yyyy] = String(mk).split("/");
    return { raw: mk, mm: mm || mk, yyyy: yyyy || "" };
  });

  const years = [...new Set(parsed.map((p) => p.yyyy).filter(Boolean))];
  const sameYear = years.length === 1;

  return { items: parsed, sameYear, year: sameYear ? years[0] : null };
};

/**
 * Thẻ hiển thị Khóa học đang xem & Modal chuyển đổi khóa học cho trang Quản lý Học viên
 */
const StudentCourseSelector = memo(function StudentCourseSelector({
  campaigns,
  courseStatsMap,
  activeCampaignId,
  onSelectCampaign,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;

  const activeCampaign = campaigns.find((c) => c._id === activeCampaignId);
  const activeStats = courseStatsMap[activeCampaignId] ?? {
    studentCount: 0,
    unpaidCount: 0,
    sessionCount: 0,
  };

  return (
    <>
      <Card
        size="small"
        style={{
          marginBottom: 16,
          borderRadius: 10,
          border: "1px solid #f0f0f0",
          background: "#ffffff",
          boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)",
        }}
        styles={{ body: { padding: !screens.md ? "12px 14px" : "12px 18px" } }}
      >
        <Flex
          justify="space-between"
          align={!screens.md ? "stretch" : "center"}
          vertical={!screens.md}
          gap={!screens.md ? 10 : 12}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text
              type="secondary"
              style={{ fontSize: 11, display: "block", lineHeight: 1.2 }}
            >
              Khóa học đang xem
            </Text>
            <Flex align="center" gap={10} wrap="wrap" style={{ marginTop: 4 }}>
              <Title
                level={4}
                style={{
                  margin: 0,
                  color: "#262626",
                  lineHeight: 1.35,
                  fontSize: !screens.md ? 17 : 20,
                }}
              >
                {activeCampaign?.title ?? "—"}
              </Title>

              {activeCampaign && (
                <Flex align="center" gap={6} wrap="wrap">
                  <Tag
                    icon={<TeamOutlined />}
                    style={{
                      margin: 0,
                      borderRadius: 999,
                      fontWeight: 600,
                      fontSize: 12,
                      padding: "1px 10px",
                      background: "#F4F4F6",
                      border: "none",
                      color: T.black,
                    }}
                  >
                    {activeStats.studentCount} học viên
                  </Tag>
                  {activeStats.unpaidCount > 0 && (
                    <Tag
                      color="warning"
                      style={{
                        margin: 0,
                        borderRadius: 999,
                        fontWeight: 600,
                        fontSize: 12,
                        padding: "1px 10px",
                      }}
                    >
                      {activeStats.unpaidCount} còn nợ
                    </Tag>
                  )}
                </Flex>
              )}
            </Flex>
          </div>

          <Button
            type="default"
            icon={<SwapOutlined />}
            onClick={() => setModalOpen(true)}
            id="btn-choose-student-course"
            style={{
              flexShrink: 0,
              width: !screens.md ? "100%" : "auto",
            }}
          >
            Chọn khóa học
          </Button>
        </Flex>
      </Card>

      <ConfigProvider theme={{ token: { colorPrimary: T.black } }}>
        <Modal
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          footer={null}
          width={isMobile ? "calc(100vw - 24px)" : 620}
          centered
          destroyOnHidden
          className="minimal-course-modal"
          style={
            isMobile
              ? { maxWidth: "calc(100vw - 24px)", margin: "0 auto" }
              : undefined
          }
          styles={{
            content: {
              borderRadius: isMobile ? 18 : 20,
              padding: isMobile ? "20px 14px 20px" : "26px 26px 28px",
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.12)",
            },
            header: {
              marginBottom: isMobile ? 14 : 18,
            },
            body: {
              paddingTop: 0,
            },
          }}
          title={
            <div style={{ paddingRight: 28 }}>
              <Title
                level={4}
                style={{
                  margin: 0,
                  color: T.black,
                  fontWeight: 700,
                  fontSize: isMobile ? 17.5 : 20,
                  letterSpacing: -0.4,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Chọn khóa học để xem học viên
              </Title>
              <Text
                style={{
                  color: T.gray3,
                  fontSize: isMobile ? 12.5 : 13.5,
                  fontWeight: 400,
                  display: "block",
                  marginTop: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Phân nhóm danh sách học viên theo từng khóa học, tháng và lớp
                học
              </Text>
            </div>
          }
        >
          {campaigns.length === 0 ? (
            <Empty
              description="Chưa có khóa học nào."
              style={{ padding: "24px 0" }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: isMobile ? 10 : 12,
                maxHeight: "70vh",
                overflowY: "auto",
                padding: "2px",
              }}
            >
              {campaigns.map((camp) => {
                const isSelected = activeCampaignId === camp._id;
                const stats = courseStatsMap[camp._id] ?? {
                  studentCount: 0,
                  unpaidCount: 0,
                  sessionCount: 0,
                  months: [],
                };
                const rawMonths =
                  camp.months?.length > 0 ? camp.months : stats.months;
                const monthInfo = formatMonthList(rawMonths);

                return (
                  <div
                    key={camp._id}
                    onClick={() => {
                      onSelectCampaign(camp._id);
                      setModalOpen(false);
                    }}
                    className={`course-modal-card ${isSelected ? "selected" : ""}`}
                    style={{
                      padding: isMobile ? "14px 14px" : "16px 20px",
                      borderRadius: isMobile ? 14 : 16,
                      background: isSelected ? "#FAFAFC" : T.white,
                      border: isSelected
                        ? `1.5px solid ${T.black}`
                        : `1px solid ${T.gray2}`,
                      cursor: "pointer",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    {/* Hàng 1: Tên khóa học + Trạng thái Đang xem / Mũi tên */}
                    <Flex justify="space-between" align="center" gap={10}>
                      <Flex
                        align="center"
                        gap={8}
                        style={{ minWidth: 0, flex: 1 }}
                      >
                        <Text
                          strong
                          style={{
                            fontSize: isMobile ? 15 : 16,
                            color: T.black,
                            letterSpacing: -0.3,
                            lineHeight: 1.35,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {camp.title}
                        </Text>
                        {camp.isHidden && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              color: T.gray3,
                              background: "#F4F4F6",
                              padding: "1px 7px",
                              borderRadius: 6,
                              flexShrink: 0,
                            }}
                          >
                            Đang ẩn
                          </span>
                        )}
                      </Flex>

                      <Flex align="center" gap={8} style={{ flexShrink: 0 }}>
                        {isSelected && !isMobile && (
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 600,
                              color: T.black,
                              background: "#EFEFF4",
                              padding: "2px 9px",
                              borderRadius: 999,
                            }}
                          >
                            Đang xem
                          </span>
                        )}
                        <div
                          className="course-modal-card-arrow"
                          style={{
                            width: isMobile ? 26 : 28,
                            height: isMobile ? 26 : 28,
                            borderRadius: "50%",
                            background: isSelected ? T.black : "#F4F4F6",
                            color: isSelected ? T.white : T.black,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "all 0.2s ease",
                          }}
                        >
                          {isSelected ? (
                            <CheckOutlined style={{ fontSize: 11 }} />
                          ) : (
                            <ArrowRightOutlined style={{ fontSize: 11 }} />
                          )}
                        </div>
                      </Flex>
                    </Flex>

                    {/* Hàng 2: Danh sách tháng (Trái) & Số lượng học viên / lớp (Phải) */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "nowrap",
                        gap: 8,
                        marginTop: isMobile ? 10 : 12,
                        paddingTop: isMobile ? 9 : 10,
                        borderTop: "1px solid #F2F2F7",
                        fontSize: isMobile ? 12.5 : 13,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        {monthInfo ? (
                          <>
                            <span style={{ color: T.black, fontWeight: 600 }}>
                              Tháng{" "}
                              {monthInfo.items.map((item, index) => (
                                <span key={item.raw}>
                                  {item.mm}
                                  {!monthInfo.sameYear && item.yyyy
                                    ? `/${item.yyyy}`
                                    : ""}
                                  {index < monthInfo.items.length - 1 && (
                                    <span
                                      style={{
                                        color: "#C7C7CC",
                                        fontWeight: 400,
                                        margin: "0 5px",
                                      }}
                                    >
                                      ·
                                    </span>
                                  )}
                                </span>
                              ))}
                            </span>
                            {monthInfo.sameYear && monthInfo.year && (
                              <span
                                style={{
                                  color: T.gray3,
                                  fontWeight: 400,
                                  marginLeft: 4,
                                  fontSize: isMobile ? 12 : 12.5,
                                }}
                              >
                                /{monthInfo.year}
                              </span>
                            )}
                          </>
                        ) : (
                          <span style={{ color: T.gray3 }}>Chưa có tháng</span>
                        )}
                      </div>

                      <Flex align="center" gap={6} style={{ flexShrink: 0 }}>
                        {stats.unpaidCount > 0 && (
                          <span
                            style={{
                              fontSize: isMobile ? 11.5 : 12,
                              fontWeight: 600,
                              color: "#D97706",
                              background: "#FEF3C7",
                              padding: "2px 8px",
                              borderRadius: 999,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {stats.unpaidCount} còn nợ
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: isMobile ? 11.5 : 12,
                            fontWeight: 600,
                            color: "#15803D",
                            background: "#F0FDF4",
                            padding: "2px 9px",
                            borderRadius: 999,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {stats.studentCount} học viên
                        </span>
                        <span
                          style={{
                            fontSize: isMobile ? 11.5 : 12,
                            fontWeight: 500,
                            color: T.gray3,
                            background: "#F4F4F6",
                            padding: "2px 8px",
                            borderRadius: 999,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {stats.sessionCount} lớp
                        </span>
                      </Flex>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      </ConfigProvider>
    </>
  );
});

export default StudentCourseSelector;
