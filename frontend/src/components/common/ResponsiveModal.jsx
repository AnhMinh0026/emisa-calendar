import { Modal, Drawer, Button, Grid } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

/**
 * Component hiển thị Modal trên Desktop (>= md) và Drawer toàn màn hình trên Mobile (< md).
 * Giúp tái sử dụng thống nhất cho tất cả các form Thêm/Sửa và xem chi tiết.
 */
export default function ResponsiveModal({
  title,
  open,
  onClose,
  onSubmit,
  submitText = 'Lưu thay đổi',
  cancelText = 'Hủy',
  submitting = false,
  submitButtonId,
  width = 540,
  footer, // Nếu truyền null sẽ ẩn footer trên Modal; nếu truyền ReactNode sẽ dùng custom footer
  children,
}) {
  const screens = Grid.useBreakpoint();

  if (screens.md) {
    return (
      <Modal
        title={title}
        open={open}
        onCancel={onClose}
        onOk={onSubmit}
        okText={submitText}
        cancelText={cancelText}
        confirmLoading={submitting}
        footer={footer}
        destroyOnHidden
        width={width}
        style={width > 800 ? { maxWidth: '95vw', top: 20 } : undefined}
      >
        {children}
      </Modal>
    );
  }

  const defaultDrawerFooter = (
    <div
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 20px)',
        display: 'flex',
        gap: 12,
        justifyContent: 'flex-end',
      }}
    >
      <Button onClick={onClose} style={{ flex: 1 }}>
        {cancelText}
      </Button>
      {onSubmit && (
        <Button
          type="primary"
          onClick={onSubmit}
          loading={submitting}
          style={{ flex: 1 }}
          id={submitButtonId}
        >
          {submitText}
        </Button>
      )}
    </div>
  );

  return (
    <Drawer
      title={title}
      placement="right"
      open={open}
      onClose={onClose}
      closeIcon={<ArrowLeftOutlined />}
      destroyOnHidden
      styles={{
        body: { padding: '16px' },
        wrapper: { width: '100%' },
      }}
      footer={footer !== undefined ? footer : defaultDrawerFooter}
    >
      {children}
    </Drawer>
  );
}
