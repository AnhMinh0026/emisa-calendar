import { Row, Col, Flex, Typography, Button, Grid } from 'antd';

const { Text } = Typography;

/**
 * Thanh công cụ lọc dùng chung:
 * - Trên Desktop: hiển thị cố định
 * - Trên Mobile: đóng/mở mượt bằng hiệu ứng CSS transition
 */
export default function FilterToolbar({
  isOpen,
  hasActiveFilter,
  filteredCount,
  totalCount,
  unitLabel = 'kết quả',
  summaryText,
  onReset,
  resetColSpan = { xs: 24, md: 10 },
  children,
}) {
  const screens = Grid.useBreakpoint();

  return (
    <div
      style={
        screens.md
          ? { marginBottom: 16 }
          : {
              maxHeight: isOpen ? 260 : 0,
              opacity: isOpen ? 1 : 0,
              overflow: isOpen ? 'visible' : 'hidden',
              transition:
                'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease, margin-bottom 0.3s ease',
              marginBottom: isOpen ? 16 : 0,
              pointerEvents: isOpen ? 'auto' : 'none',
            }
      }
    >
      <Row
        gutter={[12, 12]}
        align="middle"
        style={{
          padding: '12px 14px',
          background: '#fafafa',
          borderRadius: 8,
          border: '1px solid #f0f0f0',
        }}
      >
        {children}

        {hasActiveFilter && (
          <Col {...resetColSpan}>
            <Flex align="center" justify="space-between" gap={8} wrap="wrap">
              <Text type="secondary" style={{ fontSize: 13 }}>
                {summaryText ?? (
                  <>
                    Tìm thấy <Text strong>{filteredCount}</Text> / {totalCount} {unitLabel}
                  </>
                )}
              </Text>
              <Button size="small" onClick={onReset}>
                Xóa bộ lọc
              </Button>
            </Flex>
          </Col>
        )}
      </Row>
    </div>
  );
}

