import { useMemo } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Flex, Grid, Switch, Typography, App } from 'antd';
import dayjs from 'dayjs';
import ResponsiveModal from '../common/ResponsiveModal';
import { buildDisabledDate } from '../../utils/formatters';

const { Text } = Typography;

function SessionFormContent({ form, editTarget, campaigns }) {
  const screens = Grid.useBreakpoint();

  const initialValues = useMemo(() => {
    if (!editTarget) {
      return { isPublicVisible: true };
    }
    return {
      campaignId: editTarget.campaignId?._id ?? editTarget.campaignId,
      campaignMonth: editTarget.campaignMonth,
      classCode: editTarget.classCode,
      timeSlot: editTarget.timeSlot,
      maxCapacity: editTarget.maxCapacity,
      studyDates: (editTarget.studyDates ?? []).map((d) => dayjs(d)),
      isPublicVisible: !editTarget.isHidden,
    };
  }, [editTarget]);

  const selectedCampaignId = Form.useWatch('campaignId', form);
  const selectedMonth = Form.useWatch('campaignMonth', form);

  const monthOptionsForForm = useMemo(() => {
    if (!selectedCampaignId) return [];
    const camp = campaigns.find((c) => c._id === selectedCampaignId);
    return (camp?.months ?? []).map((m) => ({ value: m, label: `Tháng ${m}` }));
  }, [selectedCampaignId, campaigns]);

  const onCampaignChange = () => {
    form.setFieldsValue({ campaignMonth: undefined, studyDates: [] });
  };

  const onMonthChange = () => {
    form.setFieldsValue({ studyDates: [] });
  };

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
        name="campaignId"
        label="Khóa học"
        rules={[{ required: true, message: 'Vui lòng chọn khóa học.' }]}
      >
        <Select
          placeholder="Chọn khóa học..."
          showSearch
          optionFilterProp="label"
          onChange={onCampaignChange}
          allowClear
          id="select-campaign"
          options={campaigns.map((c) => ({ value: c._id, label: c.title }))}
        />
      </Form.Item>

      <Form.Item
        name="campaignMonth"
        label="Tháng học"
        rules={[{ required: true, message: 'Vui lòng chọn tháng.' }]}
        extra={!selectedCampaignId ? 'Chọn khóa học trước để xem các tháng có sẵn.' : undefined}
      >
        <Select
          placeholder={selectedCampaignId ? 'Chọn tháng...' : '— Chọn khóa học trước —'}
          disabled={!selectedCampaignId}
          options={monthOptionsForForm}
          onChange={onMonthChange}
          allowClear
          id="select-campaign-month"
        />
      </Form.Item>

      <Flex gap={12}>
        <Form.Item
          name="classCode"
          label="Mã lớp"
          style={{ flex: 1 }}
          rules={[{ required: true, message: 'Nhập mã lớp.' }]}
        >
          <Input
            placeholder="VD: K02, ÔN-01"
            maxLength={20}
            style={{ textTransform: 'uppercase' }}
            id="input-class-code"
          />
        </Form.Item>

        <Form.Item
          name="maxCapacity"
          label="Sĩ số tối đa"
          style={{ flex: 1 }}
          rules={[{ required: true, message: 'Nhập sĩ số.' }]}
        >
          <InputNumber
            min={1}
            max={999}
            style={{ width: '100%' }}
            placeholder="VD: 15"
            id="input-max-capacity"
          />
        </Form.Item>
      </Flex>

      <Form.Item
        name="timeSlot"
        label="Khung giờ học"
        rules={[
          { required: true, message: 'Nhập khung giờ.' },
          {
            pattern: /^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/,
            message: "Định dạng: 'HH:mm - HH:mm' (VD: 18:00 - 20:00)",
          },
        ]}
      >
        <Input
          placeholder="VD: 18:00 - 20:00"
          maxLength={15}
          id="input-time-slot"
        />
      </Form.Item>

      <Form.Item
        name="studyDates"
        label="Ngày học"
        extra={
          !selectedMonth
            ? 'Chọn tháng trước để mở DatePicker.'
            : `Chỉ có thể chọn ngày trong tháng ${selectedMonth}.`
        }
        rules={[
          {
            required: true,
            type: 'array',
            min: 1,
            message: 'Vui lòng chọn ít nhất một ngày học.',
          },
        ]}
      >
        <DatePicker
          multiple
          format="DD/MM/YYYY"
          disabled={!selectedMonth}
          disabledDate={buildDisabledDate(selectedMonth)}
          placeholder="Chọn các ngày học..."
          style={{ width: '100%' }}
          id="input-study-dates"
          allowClear
        />
      </Form.Item>

      <div
        style={{
          background: '#fafafa',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          padding: '10px 14px',
          marginTop: 4,
        }}
      >
        <Flex justify="space-between" align="center" gap={12}>
          <div>
            <Text strong style={{ display: 'block', fontSize: 13.5 }}>
              Hiển thị trên trang lịch học Public
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Tắt nếu đây là lớp nội bộ / lớp ôn tập không muốn khách ngoài nhìn thấy
            </Text>
          </div>
          <Form.Item name="isPublicVisible" valuePropName="checked" noStyle>
            <Switch
              checkedChildren="Hiện"
              unCheckedChildren="Ẩn"
              id="switch-session-public"
            />
          </Form.Item>
        </Flex>
      </div>
    </Form>
  );
}

/**
 * Modal / Drawer Thêm hoặc Chỉnh sửa Lớp học
 */
export default function SessionFormModal({
  open,
  editTarget,
  campaigns,
  submitting,
  onClose,
  onSubmit,
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  if (!open) return null;

  const handleOk = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const rawDates = values.studyDates;
    if (!rawDates || rawDates.length === 0) {
      message.error('Vui lòng chọn ít nhất một ngày học.');
      return;
    }

    onSubmit({
      campaignId: values.campaignId,
      campaignMonth: values.campaignMonth,
      classCode: values.classCode.trim().toUpperCase(),
      timeSlot: values.timeSlot.trim(),
      maxCapacity: values.maxCapacity,
      studyDates: rawDates.map((d) => dayjs(d).format('YYYY-MM-DD')),
      isHidden: !values.isPublicVisible,
    });
  };

  return (
    <ResponsiveModal
      title={editTarget ? `Sửa lớp học ${editTarget.classCode}` : 'Thêm Lớp học mới'}
      open={open}
      onClose={onClose}
      onSubmit={handleOk}
      submitText={editTarget ? 'Lưu thay đổi' : 'Tạo mới'}
      submitting={submitting}
      submitButtonId="drawer-btn-submit-session"
      width={540}
    >
      <SessionFormContent form={form} editTarget={editTarget} campaigns={campaigns} />
    </ResponsiveModal>
  );
}
