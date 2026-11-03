import { useMemo } from 'react';
import { Form, Input, Select, Grid } from 'antd';
import ResponsiveModal from '../common/ResponsiveModal';
import { MONTH_OPTIONS } from '../../constants';

function CampaignFormContent({ form, editTarget }) {
  const screens = Grid.useBreakpoint();

  const initialValues = useMemo(
    () =>
      editTarget
        ? {
            title: editTarget.title,
            description: editTarget.description,
            months: editTarget.months ?? [],
          }
        : {
            title: '',
            description: '',
            months: [],
          },
    [editTarget]
  );

  return (
    <Form
      key={editTarget?._id || 'create'}
      form={form}
      layout="vertical"
      initialValues={initialValues}
      style={{ marginTop: screens.md ? 16 : 8 }}
      requiredMark="optional"
    >
      <Form.Item
        name="title"
        label="Tiêu đề khóa học"
        rules={[{ required: true, message: 'Vui lòng nhập tiêu đề khóa học.' }]}
      >
        <Input
          placeholder="VD: Khoá cơ bản"
          maxLength={100}
          showCount
          id="input-campaign-title"
        />
      </Form.Item>

      <Form.Item name="description" label="Mô tả (tùy chọn)">
        <Input.TextArea
          rows={3}
          placeholder="Ghi chú thêm về khóa học..."
          maxLength={300}
          showCount
          id="input-campaign-description"
        />
      </Form.Item>

      <Form.Item
        name="months"
        label="Các tháng của khóa học"
        extra="Chọn một hoặc nhiều tháng. Thứ tự sẽ tự động sắp xếp tăng dần."
        rules={[
          {
            required: true,
            type: 'array',
            min: 1,
            message: 'Vui lòng chọn ít nhất một tháng.',
          },
        ]}
      >
        <Select
          mode="multiple"
          placeholder="Chọn tháng..."
          options={MONTH_OPTIONS}
          showSearch
          optionFilterProp="label"
          allowClear
          id="select-campaign-months"
        />
      </Form.Item>
    </Form>
  );
}

/**
 * Modal / Drawer Thêm hoặc Chỉnh sửa Khóa học
 */
export default function CampaignFormModal({
  open,
  editTarget,
  submitting,
  onClose,
  onSubmit,
}) {
  const [form] = Form.useForm();

  if (!open) return null;

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit({
        title: values.title.trim(),
        description: values.description?.trim() ?? '',
        months: values.months,
      });
    } catch {
      // Lỗi validate trên form
    }
  };

  return (
    <ResponsiveModal
      title={editTarget ? 'Chỉnh sửa Khóa học' : 'Thêm Khóa học mới'}
      open={open}
      onClose={onClose}
      onSubmit={handleOk}
      submitText={editTarget ? 'Lưu thay đổi' : 'Tạo mới'}
      submitting={submitting}
      submitButtonId="drawer-btn-submit-campaign"
      width={620}
    >
      <CampaignFormContent form={form} editTarget={editTarget} />
    </ResponsiveModal>
  );
}
