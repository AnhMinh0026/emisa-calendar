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
  MessageOutlined,
  CopyOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { T } from "../../constants";

const { Text } = Typography;

/**
 * Modal hiển thị chi tiết ca học & hỗ trợ sao chép thông tin nhanh để gửi qua Facebook / Zalo
 * Thiết kế Minimalist, gọn gàng trên 1 dòng, không rớt dòng gây rối mắt trên cả Web & Mobile
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

  const handleCopy = useCallback(async () => {
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
      message.success("Đã sao chép thông tin lớp học");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      message.error("Không thể sao chép, vui lòng thử lại");
    }
  }, [buildCopyText]);

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
        width={isMobile ? "calc(100vw - 24px)" : 540}
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
            padding: isMobile ? "20px 16px 20px" : "26px 28px 28px",
            boxShadow: "0 24px 48px rgba(0, 0, 0, 0.12)",
          },
          header: {
            marginBottom: isMobile ? 14 : 16,
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
                fontSize: isMobile ? 17 : 19,
                color: T.black,
                letterSpacing: -0.3,
                display: "block",
                lineHeight: 1.3,
              }}
            >
              Đăng ký lớp học
            </Text>
          </div>
        }
      >
        {session && (
          <div
            style={{
              background: "#FAFAFC",
              border: `1px solid ${T.gray2}`,
              borderRadius: 16,
              padding: isMobile ? "14px 14px" : "16px 18px",
              marginBottom: 18,
            }}
          >
            {/* Dòng tiêu đề thẻ: Khóa học + Mã lớp & Trạng thái chỗ trống */}
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
                    backgroundColor: "#F3E8FF",
                    color: "#7E22CE",
                    fontWeight: 700,
                    fontSize: 12,
                    padding: "2px 9px",
                    borderRadius: 6,
                    flexShrink: 0,
                    letterSpacing: 0.3,
                  }}
                >
                  {session.classCode}
                </span>
                <Text
                  strong
                  style={{
                    fontSize: isMobile ? 14 : 14.5,
                    color: T.black,
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
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: "#15803D",
                    background: "#F0FDF4",
                    padding: "2px 8px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  Còn {remainingSlots} chỗ
                </span>
              )}
            </Flex>

            {/* Chi tiết lịch học: Hiển thị gọn từng dòng, không lặp năm gây rớt dòng */}
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {/* Giờ học */}
              <Flex justify="space-between" align="center" gap={12}>
                <Text style={{ color: T.gray3, fontSize: 13, flexShrink: 0 }}>
                  Giờ học
                </Text>
                <Text
                  strong
                  style={{
                    color: T.black,
                    fontSize: isMobile ? 13.5 : 14,
                    whiteSpace: "nowrap",
                  }}
                >
                  {session.timeSlot}
                </Text>
              </Flex>

              {/* Ngày học */}
              <Flex justify="space-between" align="center" gap={12}>
                <Text style={{ color: T.gray3, fontSize: 13, flexShrink: 0 }}>
                  Ngày học
                </Text>
                <div
                  style={{
                    textAlign: "right",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontSize: isMobile ? 13 : 13.5,
                    fontWeight: 600,
                    color: T.black,
                  }}
                >
                  {sortedDates.map((d, index) => (
                    <span key={d}>
                      {dayjs(d).format("DD/MM")}
                      {index < sortedDates.length - 1 && (
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
                  {session.campaignMonth && (
                    <span
                      style={{
                        color: T.gray3,
                        fontWeight: 400,
                        fontSize: 12,
                        marginLeft: 5,
                      }}
                    >
                      (
                      {session.campaignMonth.split("/")[1] ||
                        session.campaignMonth}
                      )
                    </span>
                  )}
                </div>
              </Flex>
            </div>

            {/* Nút sao chép thông tin để dán vào khung chat */}
            <Button
              block
              onClick={handleCopy}
              icon={copied ? <CheckOutlined /> : <CopyOutlined />}
              style={{
                marginTop: 14,
                height: 38,
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 13,
                background: copied ? "#F0FDF4" : T.white,
                color: copied ? "#15803D" : T.black,
                borderColor: copied ? "#BBF7D0" : T.gray2,
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
                transition: "all 0.2s ease",
              }}
            >
              {copied
                ? "Đã sao chép thông tin lớp"
                : "Sao chép thông tin để gửi tư vấn"}
            </Button>
          </div>
        )}

        {/* Hướng dẫn ngắn gọn */}
        <Text
          style={{
            display: "block",
            color: T.gray3,
            fontSize: 13,
            lineHeight: 1.5,
            marginBottom: 14,
            textAlign: "center",
          }}
        >
          Nhấn vào kênh liên hệ bên dưới và{" "}
          <strong style={{ color: T.black }}>dán thông tin</strong> để chốt lịch
          học nhanh nhất
        </Text>

        {/* Nút liên hệ Facebook & Zalo cân đối */}
        <Flex gap={10}>
          <Button
            type="primary"
            icon={<FacebookFilled style={{ fontSize: 15 }} />}
            href={hasFB ? contactLinks.facebook : undefined}
            target="_blank"
            rel="noopener noreferrer"
            disabled={!hasFB}
            className="btn-center-content"
            style={{
              flex: 1,
              height: 40,
              borderRadius: 10,
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
            icon={<MessageOutlined style={{ fontSize: 15 }} />}
            href={hasZalo ? contactLinks.zalo : undefined}
            target="_blank"
            rel="noopener noreferrer"
            disabled={!hasZalo}
            className="btn-center-content"
            style={{
              flex: 1,
              height: 40,
              borderRadius: 10,
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
