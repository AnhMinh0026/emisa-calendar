import { memo, useState, useCallback } from "react";
import {
  Modal,
  Button,
  ConfigProvider,
  Flex,
  Typography,
  Grid,
  message,
} from "antd";
import {
  FacebookFilled,
  CopyOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { T } from "../../constants";

const { Text } = Typography;

/**
 * Modal hiển thị chi tiết ca học & hỗ trợ sao chép thông tin nhanh để gửi qua Facebook / Zalo
 * Đồng bộ ngôn ngữ thiết kế với CustomerSessionCard (Phương án 1)
 */
const ContactModal = memo(function ContactModal({
  open,
  session,
  contactLinks,
  onClose,
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;
  const [copied, setCopied] = useState(false);

  const hasFB = !!contactLinks?.facebook?.trim();
  const hasZalo = !!contactLinks?.zalo?.trim();

  const sortedDates = [...(session?.studyDates ?? [])].sort(
    (a, b) => new Date(a) - new Date(b),
  );
  const courseTitle = session?.campaignId?.title || "";
  const remainingSlots = session
    ? Math.max(0, (session.maxCapacity ?? 0) - (session.currentBooked ?? 0))
    : 0;

  // Chuẩn bị nội dung tin nhắn mẫu để khách hàng dán trực tiếp vào khung chat tư vấn
  const buildCopyText = useCallback(() => {
    if (!session) return "";
    const fullDates = sortedDates
      .map((d) => dayjs(d).format("DD/MM/YYYY"))
      .join(", ");
    const lines = [
      "Xin chào, mình muốn đăng ký lớp học:",
      courseTitle ? `- Khóa học: ${courseTitle}` : null,
      `- Mã lớp: ${session.classCode}${session.campaignMonth ? ` (Tháng ${session.campaignMonth})` : ""}`,
      `- Giờ học: ${session.timeSlot}`,
      `- Ngày học: ${fullDates}`,
    ].filter(Boolean);
    return lines.join("\n");
  }, [session, sortedDates, courseTitle]);

  const copyToClipboard = useCallback(
    async (showNotice = true) => {
      const text = buildCopyText();
      if (!text) return;

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        }
        setCopied(true);
        if (showNotice) {
          message.success("Đã sao chép thông tin lớp học");
        }
        setTimeout(() => setCopied(false), 2500);
      } catch {
        if (showNotice) {
          message.error("Không thể sao chép, vui lòng thử lại");
        }
      }
    },
    [buildCopyText],
  );

  const handleClose = useCallback(() => {
    setCopied(false);
    onClose?.();
  }, [onClose]);

  return (
    <ConfigProvider theme={{ token: { colorPrimary: T.black } }}>
      <Modal
        open={open}
        onCancel={handleClose}
        footer={null}
        width={isMobile ? "calc(100vw - 24px)" : 480}
        destroyOnHidden
        centered
        className="minimal-course-modal"
        style={
          isMobile
            ? { maxWidth: "calc(100vw - 24px)", margin: "0 auto" }
            : undefined
        }
        styles={{
          content: {
            borderRadius: isMobile ? 18 : 20,
            padding: isMobile ? "20px 16px 20px" : "24px 26px 26px",
            boxShadow: "0 24px 48px rgba(0, 0, 0, 0.12)",
          },
          header: {
            marginBottom: isMobile ? 12 : 14,
          },
          body: {
            paddingTop: 0,
          },
        }}
        title={
          <div style={{ paddingRight: 28 }}>
            <Text
              strong
              style={{
                fontSize: isMobile ? 17.5 : 19,
                color: T.black,
                letterSpacing: -0.3,
                display: "block",
                lineHeight: 1.25,
              }}
            >
              Đăng ký lớp học
            </Text>
            <Text
              style={{
                fontSize: isMobile ? 12.5 : 13,
                color: T.gray3,
                fontWeight: 400,
                display: "block",
                marginTop: 2,
              }}
            >
              Kiểm tra thông tin ca học và gửi tư vấn
            </Text>
          </div>
        }
      >
        {session && (
          <>
            <div
              style={{
                background: "#FAFAFC",
                border: `1px solid ${T.gray2}`,
                borderRadius: 16,
                padding: isMobile ? "14px" : "16px",
                marginBottom: 12,
              }}
            >
              {/* ── Hàng 1: Mã lớp (Nền đen) + Tên khóa học & Pill chỗ trống ── */}
              <Flex
                justify="space-between"
                align="center"
                gap={8}
                style={{
                  paddingBottom: 12,
                  marginBottom: 12,
                  borderBottom: "1px solid #EFEFF4",
                }}
              >
                <Flex align="center" gap={8} style={{ minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      backgroundColor: T.black,
                      color: T.white,
                      fontWeight: 700,
                      fontSize: 12,
                      padding: "3px 9px",
                      borderRadius: 8,
                      flexShrink: 0,
                      letterSpacing: 0.3,
                      lineHeight: "18px",
                    }}
                  >
                    {session.classCode}
                  </span>
                  <Text
                    strong
                    style={{
                      fontSize: isMobile ? 14 : 15,
                      color: T.black,
                      letterSpacing: -0.2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {courseTitle || `Lớp ${session.classCode}`}
                  </Text>
                </Flex>

                {remainingSlots > 0 && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "#15803D",
                      background: "#ECFDF3",
                      padding: "3px 10px",
                      borderRadius: 999,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#22C55E",
                        display: "inline-block",
                      }}
                    />
                    Còn {remainingSlots} chỗ
                  </span>
                )}
              </Flex>

              {/* ── Hàng 2: Khung giờ học & Lịch khai giảng (Chia 2 ô ngang hàng) ── */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: session.campaignMonth
                    ? "repeat(2, minmax(0, 1fr))"
                    : "1fr",
                  gap: 8,
                  marginBottom: sortedDates.length > 0 ? 10 : 0,
                }}
              >
                <div
                  style={{
                    background: T.white,
                    border: "1px solid #ECECEE",
                    borderRadius: 12,
                    padding: "8px 12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11.5,
                      color: T.gray3,
                      marginBottom: 2,
                    }}
                  >
                    Khung giờ học
                  </div>
                  <div
                    style={{
                      fontSize: isMobile ? 13.5 : 14,
                      fontWeight: 700,
                      color: T.black,
                      letterSpacing: -0.2,
                    }}
                  >
                    {session.timeSlot}
                  </div>
                </div>

                {session.campaignMonth && (
                  <div
                    style={{
                      background: T.white,
                      border: "1px solid #ECECEE",
                      borderRadius: 12,
                      padding: "8px 12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11.5,
                        color: T.gray3,
                        marginBottom: 2,
                      }}
                    >
                      Lịch khai giảng
                    </div>
                    <div
                      style={{
                        fontSize: isMobile ? 13.5 : 14,
                        fontWeight: 700,
                        color: T.black,
                        letterSpacing: -0.2,
                      }}
                    >
                      Tháng {session.campaignMonth}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Hàng 3: Lưới các buổi học (Tối đa 4 buổi/dòng, buổi thứ 5 tự xuống dòng) ── */}
              {sortedDates.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    columnGap: 6,
                    rowGap: 8,
                  }}
                >
                  {sortedDates.map((d, i) => (
                    <div
                      key={i}
                      style={{
                        background: T.white,
                        border: "1px solid #ECECEE",
                        borderRadius: 10,
                        padding: "6px 4px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10.5,
                          color: T.gray3,
                          fontWeight: 500,
                          lineHeight: 1.2,
                          marginBottom: 2,
                          whiteSpace: "nowrap",
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
                          whiteSpace: "nowrap",
                        }}
                      >
                        {dayjs(d).format("DD/MM")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Nút sao chép thông tin (Tách riêng bên ngoài khung thông tin lớp) ── */}
            <Button
              block
              onClick={() => copyToClipboard(true)}
              icon={copied ? <CheckOutlined /> : <CopyOutlined />}
              style={{
                height: 40,
                borderRadius: 12,
                marginBottom: 16,
                fontWeight: 600,
                fontSize: 13.5,
                background: copied ? "#ECFDF3" : T.white,
                color: copied ? "#15803D" : T.black,
                borderColor: copied ? "#BBF7D0" : T.gray2,
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                transition: "all 0.2s ease",
              }}
            >
              {copied
                ? "Đã sao chép thông tin lớp"
                : "Sao chép thông tin để gửi tư vấn"}
            </Button>
          </>
        )}

        {/* Hướng dẫn ngắn gọn */}
        <Text
          style={{
            display: "block",
            color: T.gray3,
            fontSize: 13,
            lineHeight: 1.5,
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          Nhấn vào kênh liên hệ bên dưới và{" "}
          <strong style={{ color: T.black }}>dán thông tin</strong> để chốt lịch
          học nhanh nhất
        </Text>

        {/* Nút liên hệ Facebook & Zalo cân đối (tự động copy nếu khách bấm thẳng) */}
        <Flex gap={10}>
          <Button
            type="primary"
            icon={<FacebookFilled style={{ fontSize: 15 }} />}
            href={hasFB ? contactLinks.facebook : undefined}
            target="_blank"
            rel="noopener noreferrer"
            disabled={!hasFB}
            onClick={() => {
              if (!copied) copyToClipboard(false);
            }}
            className="btn-center-content"
            style={{
              flex: 1,
              height: 42,
              borderRadius: 12,
              background: hasFB ? "#1877F2" : undefined,
              borderColor: hasFB ? "#1877F2" : undefined,
              fontWeight: 600,
              fontSize: 14,
              boxShadow: "none",
            }}
          >
            Facebook
          </Button>

          <Button
            type="primary"
            icon={
              <img
                src="/icons8-zalo-48.png"
                alt="Zalo"
                style={{
                  width: 18,
                  height: 18,
                  objectFit: "contain",
                  display: "block",
                  opacity: hasZalo ? 1 : 0.45,
                  filter: hasZalo ? "none" : "grayscale(100%)",
                }}
              />
            }
            href={hasZalo ? contactLinks.zalo : undefined}
            target="_blank"
            rel="noopener noreferrer"
            disabled={!hasZalo}
            onClick={() => {
              if (!copied) copyToClipboard(false);
            }}
            className="btn-center-content"
            style={{
              flex: 1,
              height: 42,
              borderRadius: 12,
              background: hasZalo ? "#0068FF" : undefined,
              borderColor: hasZalo ? "#0068FF" : undefined,
              fontWeight: 600,
              fontSize: 14,
              boxShadow: "none",
            }}
          >
            Zalo
          </Button>
        </Flex>

        {/* Hint khi chưa cấu hình */}
        {!hasFB && !hasZalo && (
          <Text
            type="secondary"
            style={{
              display: "block",
              textAlign: "center",
              marginTop: 12,
              fontSize: 12,
            }}
          >
            Liên kết liên hệ chưa được cấu hình. Vui lòng quay lại sau.
          </Text>
        )}
      </Modal>
    </ConfigProvider>
  );
});

export default ContactModal;
