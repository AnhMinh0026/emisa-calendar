import { memo } from "react";
import { Modal, Typography, Flex, ConfigProvider, Grid } from "antd";
import { CheckOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { T } from "../../constants";

const { Title, Text } = Typography;

/**
 * Rút gọn danh sách tháng ['09/2026', '10/2026', '11/2026', '12/2026']
 * thành dạng ngắn gọn trên 1 dòng duy nhất: Tháng 09 · 10 · 11 · 12
 */
const formatMonthList = (monthKeys) => {
  if (!monthKeys || monthKeys.length === 0) return null;

  const parsed = monthKeys.map((mk) => {
    const [mm, yyyy] = String(mk).split("/");
    return { raw: mk, mm: mm || mk, yyyy: yyyy || "" };
  });

  const years = [...new Set(parsed.map((p) => p.yyyy).filter(Boolean))];
  const sameYear = years.length === 1;

  return { items: parsed, sameYear, year: sameYear ? years[0] : null };
};

/**
 * Modal chọn khóa học phong cách Minimalist — Tối ưu chống rớt dòng cho cả Mobile & Desktop
 */
const CourseSelectModal = memo(function CourseSelectModal({
  open,
  onClose,
  campaignList,
  grouped,
  activeCampaignId,
  onSelectCampaign,
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;

  return (
    <ConfigProvider theme={{ token: { colorPrimary: T.black } }}>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width={isMobile ? "calc(100vw - 24px)" : 660}
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
            padding: isMobile ? "20px 14px 20px" : "28px 28px 30px",
            boxShadow: "0 24px 48px rgba(0, 0, 0, 0.10)",
          },
          header: {
            marginBottom: isMobile ? 14 : 20,
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
                fontSize: isMobile ? 17.5 : 22,
                letterSpacing: -0.4,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Chọn khóa học phù hợp với bạn
            </Title>
            <Text
              style={{
                color: T.gray3,
                fontSize: isMobile ? 12.5 : 14,
                fontWeight: 400,
                display: "block",
                marginTop: 3,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {isMobile
                ? "Chạm vào khóa học để xem lịch và ca học chi tiết"
                : "Chạm vào khóa học để xem lịch khai giảng và các ca học chi tiết"}
            </Text>
          </div>
        }
      >
        <div
          className="course-modal-list"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? 10 : 14,
            maxHeight: "72vh",
            overflowY: "auto",
            padding: "4px 2px",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {campaignList.map((campaign) => {
            const isSelected = activeCampaignId === campaign._id;
            const campaignGroup = grouped[campaign._id];
            const monthKeys = campaignGroup
              ? Object.keys(campaignGroup.months).sort()
              : [];
            const monthInfo = formatMonthList(monthKeys);

            return (
              <div
                key={campaign._id}
                id={`filter-campaign-${campaign._id}`}
                onClick={() => {
                  onSelectCampaign(campaign._id);
                  onClose();
                }}
                className={`course-modal-card ${isSelected ? "selected" : ""}`}
                style={{
                  padding: isMobile ? "14px 14px" : "20px 22px",
                  borderRadius: isMobile ? 14 : 16,
                  background: isSelected ? "#FAFAFC" : T.white,
                  border: isSelected
                    ? `1.5px solid ${T.black}`
                    : `1px solid ${T.gray2}`,
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                {/* Hàng 1: Tên khóa học (1 dòng duy nhất, không bao giờ rớt dòng) + Mũi tên */}
                <Flex justify="space-between" align="center" gap={10}>
                  <Text
                    strong
                    style={{
                      fontSize: isMobile ? 15 : 16.5,
                      color: T.black,
                      letterSpacing: -0.3,
                      lineHeight: 1.35,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {campaign.title}
                  </Text>

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

                {/* Hàng 2: Mô tả khóa học */}
                {campaign.description?.trim() && (
                  <Text
                    style={{
                      display: "block",
                      color: "#6E6E73",
                      fontSize: isMobile ? 12.5 : 13.5,
                      lineHeight: 1.5,
                      marginTop: 5,
                    }}
                  >
                    {campaign.description}
                  </Text>
                )}

                {/* Hàng 3: Lịch khai giảng (Trái) & Số lớp còn chỗ (Phải) — Gọn trên 1 dòng duy nhất */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "nowrap",
                    gap: 8,
                    marginTop: isMobile ? 10 : 14,
                    paddingTop: isMobile ? 9 : 12,
                    borderTop: "1px solid #F2F2F7",
                    fontSize: isMobile ? 12.5 : 13,
                  }}
                >
                  {/* Bên trái: Tháng 09 · 10 · 11 · 12 (Chỉ viết chữ "Tháng" 1 lần ở đầu) */}
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
                    {monthInfo && (
                      <>
                        {!isMobile && (
                          <span style={{ color: T.gray3, marginRight: 6 }}>
                            Khai giảng:
                          </span>
                        )}
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
                    )}
                  </div>

                  {/* Bên phải: Trạng thái số lớp còn chỗ */}
                  {/* <div style={{ flexShrink: 0 }}>
                    {openCount > 0 ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: isMobile ? 11.5 : 12,
                          fontWeight: 600,
                          color: '#15803D',
                          background: '#F0FDF4',
                          padding: isMobile ? '2px 8px' : '3px 10px',
                          borderRadius: 999,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: T.green,
                          }}
                        />
                        {openCount} lớp còn chỗ
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: isMobile ? 11.5 : 12,
                          fontWeight: 500,
                          color: T.gray3,
                          background: '#F4F4F6',
                          padding: isMobile ? '2px 8px' : '3px 10px',
                          borderRadius: 999,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {allCourseSessions.length} lớp
                      </span>
                    )}
                  </div> */}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </ConfigProvider>
  );
});

export default CourseSelectModal;
