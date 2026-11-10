import { memo, useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Modal,
  ConfigProvider,
  Flex,
  Typography,
  message,
} from "antd";
import {
  FacebookFilled,
  EnvironmentFilled,
  CloseOutlined,
  CustomerServiceOutlined,
  CompassOutlined,
  ExportOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { T } from "../../constants";

const { Text } = Typography;

/**
 * Trích xuất URL src từ mã <iframe> Google Maps hoặc tự động tạo link embed từ Địa chỉ Studio
 */
function resolveMapEmbedSrc(rawEmbed = "", fallbackAddress = "") {
  const trimmed = String(rawEmbed || "").trim();
  if (trimmed) {
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
    const candidate = srcMatch ? srcMatch[1].trim() : trimmed;
    if (/^https?:\/\//i.test(candidate)) {
      return candidate;
    }
  }
  const addr = String(fallbackAddress || "").trim();
  if (addr) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(addr)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
  }
  return "";
}

/**
 * Nút tròn nổi (Speed-Dial Contact & Studio Map Widget) với hiệu ứng Spring Stagger mượt mà.
 * Khi bấm vào nút tròn sẽ bung 3 lựa chọn theo nhịp:
 *  1. Facebook
 *  2. Zalo
 *  3. Địa chỉ Studio (Có dòng địa chỉ bấm nhảy thẳng sang Google Maps + Bản đồ Google Maps nhúng trực tiếp)
 */
const FloatingContactWidget = memo(function FloatingContactWidget({
  contactLinks,
}) {
  const [open, setOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const containerRef = useRef(null);

  const fbUrl = contactLinks?.facebook?.trim() || "";
  const zaloUrl = contactLinks?.zalo?.trim() || "";
  const studioAddress = contactLinks?.address?.trim() || "";
  const customMapUrl = contactLinks?.mapUrl?.trim() || "";
  const rawMapEmbed = contactLinks?.mapEmbed?.trim() || "";

  const resolvedMapUrl = useMemo(
    () =>
      customMapUrl ||
      (studioAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studioAddress)}`
        : "https://www.google.com/maps"),
    [customMapUrl, studioAddress],
  );

  const embedMapSrc = useMemo(
    () => resolveMapEmbedSrc(rawMapEmbed, studioAddress),
    [rawMapEmbed, studioAddress],
  );

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  const handleSelectFacebook = useCallback(() => {
    setOpen(false);
    if (!fbUrl) {
      message.info("Link Facebook đang được cập nhật.");
      return;
    }
    window.open(fbUrl, "_blank", "noopener,noreferrer");
  }, [fbUrl]);

  const handleSelectZalo = useCallback(() => {
    setOpen(false);
    if (!zaloUrl) {
      message.info("Link Zalo đang được cập nhật.");
      return;
    }
    window.open(zaloUrl, "_blank", "noopener,noreferrer");
  }, [zaloUrl]);

  const handleSelectAddress = useCallback(() => {
    setOpen(false);
    setAddressModalOpen(true);
  }, []);

  const menuOptions = [
    {
      key: "facebook",
      id: "btn-floating-facebook",
      title: "Facebook",
      subtitle: "Nhắn tin qua Fanpage",
      onClick: handleSelectFacebook,
      delayOpen: "80ms",
      delayClose: "0ms",
      iconBg: "linear-gradient(135deg, #1877F2 0%, #0C5DC7 100%)",
      iconShadow: "0 6px 14px rgba(24, 119, 242, 0.28)",
      icon: <FacebookFilled style={{ color: "#FFFFFF", fontSize: 17 }} />,
    },
    {
      key: "zalo",
      id: "btn-floating-zalo",
      title: "Zalo",
      subtitle: "Chat tư vấn trực tiếp",
      onClick: handleSelectZalo,
      delayOpen: "40ms",
      delayClose: "35ms",
      iconBg: "#EBF4FF",
      iconShadow: "0 6px 14px rgba(0, 104, 255, 0.18)",
      icon: (
        <img
          src="/icons8-zalo-48.png"
          alt="Zalo"
          style={{
            width: 22,
            height: 22,
            objectFit: "contain",
            display: "block",
          }}
        />
      ),
    },
    {
      key: "address",
      id: "btn-floating-address",
      title: "Địa chỉ Studio",
      subtitle: studioAddress || "Xem bản đồ & chỉ đường",
      onClick: handleSelectAddress,
      delayOpen: "0ms",
      delayClose: "70ms",
      iconBg: "linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)",
      iconShadow: "0 6px 14px rgba(225, 29, 72, 0.28)",
      icon: <EnvironmentFilled style={{ color: "#FFFFFF", fontSize: 17 }} />,
    },
  ];

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: "fixed",
          right: 22,
          bottom: 22,
          zIndex: 990,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          pointerEvents: "none",
        }}
      >
        {/* Danh sách 3 lựa chọn bung lên với hiệu ứng Staggered Spring mượt mà */}
        <div
          aria-hidden={!open}
          style={{
            marginBottom: 14,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 10,
            pointerEvents: open ? "auto" : "none",
          }}
        >
          {menuOptions.map((item) => (
            <button
              key={item.key}
              type="button"
              id={item.id}
              onClick={item.onClick}
              className="floating-contact-item"
              style={{
                width: 244,
                border: "1px solid rgba(236, 236, 238, 0.95)",
                background: "rgba(255, 255, 255, 0.96)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                padding: "10px 12px",
                borderRadius: 16,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 11,
                textAlign: "left",
                boxShadow: "0 10px 26px rgba(15, 23, 42, 0.10)",
                opacity: open ? 1 : 0,
                transform: open
                  ? "translateY(0) scale(1)"
                  : "translateY(16px) scale(0.86)",
                transitionDelay: open ? item.delayOpen : item.delayClose,
              }}
            >
              <Flex align="center" gap={11} style={{ minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: item.iconBg,
                    boxShadow: item.iconShadow,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: T.black,
                      lineHeight: 1.25,
                      letterSpacing: -0.2,
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "#6E6E73",
                      lineHeight: 1.3,
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.subtitle}
                  </div>
                </div>
              </Flex>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "#F5F5F7",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <RightOutlined style={{ fontSize: 10, color: "#8E8E93" }} />
              </span>
            </button>
          ))}
        </div>

        {/* Nút tròn chính (Trigger) */}
        <button
          type="button"
          id="btn-floating-contact-toggle"
          aria-label="Thông tin liên hệ và địa chỉ"
          onClick={() => setOpen((prev) => !prev)}
          className="floating-contact-trigger"
          style={{
            pointerEvents: "auto",
            width: 54,
            height: 54,
            borderRadius: "50%",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            background: open
              ? "#1D1D1F"
              : "linear-gradient(135deg, #2C2C2E 0%, #1D1D1F 100%)",
            color: T.white,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 28px rgba(29, 29, 31, 0.26)",
          }}
        >
          {/* Chấm xanh trạng thái hoạt động ở góc nút tròn */}
          {!open && (
            <span
              style={{
                position: "absolute",
                top: 3,
                right: 3,
                width: 11,
                height: 11,
                borderRadius: "50%",
                background: "#22C55E",
                border: "2px solid #FFFFFF",
                boxShadow: "0 2px 6px rgba(34, 197, 94, 0.45)",
              }}
            />
          )}

          {/* Icon xoay mượt mà khi đóng/mở */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)",
              transform: open
                ? "rotate(90deg) scale(0.92)"
                : "rotate(0deg) scale(1)",
            }}
          >
            {open ? (
              <CloseOutlined style={{ fontSize: 18 }} />
            ) : (
              <CustomerServiceOutlined style={{ fontSize: 22 }} />
            )}
          </span>
        </button>
      </div>

      {/* Modal hiển thị Địa chỉ dạng Text (bấm vào nhảy tới Google Maps) + Bản đồ nhúng trực tiếp */}
      <ConfigProvider theme={{ token: { colorPrimary: T.black } }}>
        <Modal
          open={addressModalOpen}
          onCancel={() => setAddressModalOpen(false)}
          footer={null}
          width={480}
          centered
          destroyOnHidden
          className="minimal-course-modal"
          styles={{
            content: {
              borderRadius: 20,
              padding: "22px 22px 22px",
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.14)",
            },
          }}
          title={
            <Flex align="center" gap={10}>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  background:
                    "linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)",
                  color: "#FFFFFF",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 17,
                  flexShrink: 0,
                  boxShadow: "0 4px 12px rgba(225, 29, 72, 0.25)",
                }}
              >
                <EnvironmentFilled />
              </span>
              <div>
                <Text
                  strong
                  style={{
                    fontSize: 17.5,
                    color: T.black,
                    display: "block",
                    lineHeight: 1.25,
                    letterSpacing: -0.3,
                  }}
                >
                  Địa chỉ Studio
                </Text>
                <Text
                  style={{ fontSize: 12.5, color: T.gray3, fontWeight: 400 }}
                >
                  Nhấn vào địa chỉ hoặc bản đồ để xem chỉ đường
                </Text>
              </div>
            </Flex>
          }
        >
          {/* Khối Địa chỉ dạng Text — bấm trực tiếp nhảy thẳng tới Google Maps */}
          {studioAddress ? (
            <a
              href={resolvedMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="address-text-link"
              id="link-studio-address-text"
              style={{
                display: "block",
                background: "#FAFAFC",
                border: `1px solid ${T.gray2}`,
                borderRadius: 14,
                padding: "12px 14px",
                marginTop: 12,
                marginBottom: 12,
                color: T.black,
                cursor: "pointer",
              }}
            >
              {/* Dòng 1: Trọn 100% chiều ngang cho text địa chỉ nằm gọn 1 dòng */}
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.black,
                  lineHeight: 1.4,
                  letterSpacing: -0.2,
                }}
              >
                {studioAddress}
              </div>

              {/* Dòng 2: Hướng dẫn mở bản đồ + Icon mở tab nằm cùng hàng bên dưới */}
              <Flex
                justify="space-between"
                align="center"
                gap={8}
                style={{ marginTop: 6 }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#1E4DB7",
                    fontWeight: 500,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <CompassOutlined />
                  <span>Chạm để mở vị trí trên Google Maps</span>
                </div>

                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: "#FFFFFF",
                    border: "1px solid #ECECEE",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#1E4DB7",
                    flexShrink: 0,
                  }}
                >
                  <ExportOutlined style={{ fontSize: 11.5 }} />
                </span>
              </Flex>
            </a>
          ) : (
            <div
              style={{
                background: "#FAFAFC",
                border: `1px solid ${T.gray2}`,
                borderRadius: 14,
                padding: "14px 16px",
                marginTop: 12,
                marginBottom: 12,
                fontSize: 13.5,
                color: T.gray3,
                lineHeight: 1.5,
              }}
            >
              Địa chỉ Studio đang được cập nhật. Bạn vui lòng nhắn tin qua
              Facebook hoặc Zalo để được hướng dẫn chi tiết nhé!
            </div>
          )}

          {/* Khung Bản đồ Google Maps nhúng trực tiếp */}
          {embedMapSrc && (
            <div
              style={{
                borderRadius: 14,
                overflow: "hidden",
                border: `1px solid ${T.gray2}`,
                height: 240,
                background: "#F2F2F7",
                boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.04)",
              }}
            >
              <iframe
                title="Bản đồ vị trí Studio"
                src={embedMapSrc}
                width="100%"
                height="100%"
                style={{ border: 0, display: "block" }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </Modal>
      </ConfigProvider>
    </>
  );
});

export default FloatingContactWidget;
