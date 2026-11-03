import { Flex, Typography, Tooltip, Button, Grid } from 'antd';
import { ReloadOutlined, FilterOutlined, PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;

/**
 * Header dùng chung cho các trang quản trị (Khóa học, Lớp học, Học viên)
 */
export default function PageHeader({
  title,
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
      align="center"
      wrap="wrap"
      gap={12}
      style={{ marginBottom: 16 }}
    >
      <Title level={4} style={{ margin: 0, fontSize: !screens.md ? 18 : 20 }}>
        {title}
      </Title>

      <Flex align="center" gap={8} style={{ width: !screens.md ? '100%' : 'auto' }}>
        <Tooltip title={screens.md ? 'Tải lại' : null}>
          <Button icon={<ReloadOutlined />} onClick={onReload} loading={loading} />
        </Tooltip>

        {!screens.md && onToggleFilter && (
          <Button
            icon={<FilterOutlined />}
            onClick={onToggleFilter}
            type={isFilterOpen ? 'primary' : 'default'}
            ghost={isFilterOpen}
            id={filterBtnId}
            style={
              hasActiveFilter && !isFilterOpen
                ? { borderColor: '#141414', color: '#141414', fontWeight: 600 }
                : undefined
            }
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
            style={{ flex: !screens.md ? 1 : undefined }}
          >
            {addLabel}
          </Button>
        )}
      </Flex>
    </Flex>
  );
}

