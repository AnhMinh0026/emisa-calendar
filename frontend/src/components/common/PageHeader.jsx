import { Flex, Typography, Tooltip, Button, Grid } from 'antd';
import { ReloadOutlined, FilterOutlined, PlusOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

/**
 * Header dùng chung cho các trang quản trị (Khóa học, Lớp học, Học viên)
 * Sử dụng bảng màu Flexy (#1E4DB7 · #EBF3FE)
 */
export default function PageHeader({
  title,
  subtitle,
  badgeText,
  loading,
  onReload,
  isFilterOpen,
  onToggleFilter,
  hasActiveFilter,
  filterBtnId,
  onAdd,
  addLabel,
  addBtnId,
}) {
  const screens = Grid.useBreakpoint();

  return (
    <Flex
      justify="space-between"
      align={!screens.md ? 'flex-start' : 'center'}
      wrap="wrap"
      gap={12}
      style={{ marginBottom: 18 }}
    >
      <div>
        <Flex align="baseline" gap={10} wrap="wrap">
          <Title
            level={4}
            style={{
              margin: 0,
              fontSize: !screens.md ? 18.5 : 21,
              fontWeight: 700,
              color: '#0F172A',
              letterSpacing: -0.4,
            }}
          >
            {title}
          </Title>

          {badgeText && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                color: '#475569',
                fontSize: 12,
                fontWeight: 600,
                padding: '1px 8px',
                borderRadius: 6,
                lineHeight: '18px',
              }}
            >
              {badgeText}
            </span>
          )}
        </Flex>

        {subtitle && (
          <Text
            style={{
              display: 'block',
              color: '#64748B',
              fontSize: 13,
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        )}
      </div>

      <Flex align="center" gap={8} style={{ width: !screens.md ? '100%' : 'auto' }}>
        <Tooltip title={screens.md ? 'Làm mới dữ liệu' : null}>
          <Button
            icon={<ReloadOutlined />}
            onClick={onReload}
            loading={loading}
            style={{ borderRadius: 9 }}
          />
        </Tooltip>

        {!screens.md && onToggleFilter && (
          <Button
            icon={<FilterOutlined />}
            onClick={onToggleFilter}
            type={isFilterOpen ? 'primary' : 'default'}
            ghost={isFilterOpen}
            id={filterBtnId}
            style={{
              borderRadius: 9,
              ...(hasActiveFilter && !isFilterOpen
                ? { borderColor: '#1E4DB7', color: '#1E4DB7', fontWeight: 600 }
                : {}),
            }}
          >
            Lọc{hasActiveFilter ? ' •' : ''}
          </Button>
        )}

        {onAdd && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onAdd}
            id={addBtnId}
            style={{
              flex: !screens.md ? 1 : undefined,
              borderRadius: 9,
              fontWeight: 600,
              boxShadow: '0 2px 6px rgba(30, 77, 183, 0.22)',
            }}
          >
            {addLabel}
          </Button>
        )}
      </Flex>
    </Flex>
  );
}
