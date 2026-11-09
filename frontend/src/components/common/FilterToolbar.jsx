import { Row, Col, Flex, Typography, Button, Grid } from 'antd';
import { T } from '../../constants';

const { Text } = Typography;

/**
 * Thanh công cụ lọc dùng chung:
 * - Trên Desktop: hiển thị cố định, tinh gọn chuẩn SaaS
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
  attached = false,
  children,
}) {
  const screens = Grid.useBreakpoint();

  return (
    <div
      style={
        screens.md
          ? { marginBottom: attached ? 0 : 16 }
          : {
              maxHeight: isOpen ? 260 : 0,
              opacity: isOpen ? 1 : 0,
              overflow: isOpen ? 'visible' : 'hidden',
              transition:
                'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease, margin-bottom 0.3s ease',
              marginBottom: isOpen ? 14 : 0,
              pointerEvents: isOpen ? 'auto' : 'none',
            }
      }
    >
      <Row
        gutter={[10, 10]}
        align="middle"
        style={
          attached && screens.md
            ? {
                padding: '12px 16px',
                background: '#FAFAFC',
                borderBottom: '1px solid #EFEFF4',
              }
            : {
                padding: '10px 12px',
                background: '#FAFAFC',
                borderRadius: 12,
                border: '1px solid #ECECEE',
              }
        }
      >
        {children}

        {hasActiveFilter && (
          <Col {...resetColSpan}>
            <Flex align="center" justify="space-between" gap={8} wrap="wrap">
              <Text style={{ fontSize: 13, color: '#6E6E73' }}>
                {summaryText ?? (
                  <>
                    Tìm thấy <strong style={{ color: T.black }}>{filteredCount}</strong> / {totalCount}{' '}
                    {unitLabel}
                  </>
                )}
              </Text>
              <Button
                size="small"
                onClick={onReset}
                style={{ borderRadius: 7, fontSize: 12, fontWeight: 500 }}
              >
                Xóa bộ lọc
              </Button>
            </Flex>
          </Col>
        )}
      </Row>
    </div>
  );
}
