import { useEffect } from 'react';
import { Form, Input, InputNumber, Select, Switch, Row, Col, Grid } from 'antd';
import { UserOutlined, PhoneOutlined, DollarOutlined } from '@ant-design/icons';
import ResponsiveModal from '../common/ResponsiveModal';
import { moneyFormatter, moneyParser } from '../../utils/formatters';

/**
 * Modal / Drawer Thêm hoặc Chỉnh sửa Học viên
 */
export default function StudentFormModal({
  open,
  editTarget,
  defaultSessionId,
  sessionOptions,
  submitting,
  onClose,
  onSubmit,
}) {
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();

  // Đồng bộ & xóa sạch dữ liệu cũ mỗi khi mở modal hoặc chuyển đổi giữa Thêm mới / Chỉnh sửa
  useEffect(() => {
    if (!open) return;
    if (editTarget) {
      form.setFieldsValue({
        name: editTarget.name ?? '',
        phone: editTarget.phone ?? '',
        sessionId: editTarget.sessionId,
        depositAmount: editTarget.depositAmount ?? 0,
        remainingAmount: editTarget.remainingAmount ?? 0,
        isFullyPaid: Boolean(editTarget.isFullyPaid),
        paymentNote: editTarget.paymentNote ?? '',
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        name: '',
        phone: '',
        sessionId: defaultSessionId ?? undefined,
        depositAmount: 0,
        remainingAmount: 0,
        isFullyPaid: false,
        paymentNote: '',
      });
    }
  }, [open, editTarget, defaultSessionId, form]);

  // Tự động gán Còn nợ = 0 và cộng dồn vào Tiền cọc khi bật 'Đã đóng xong' = true
  const handleValuesChange = (changedValues, allValues) => {
    if ('isFullyPaid' in changedValues && changedValues.isFullyPaid === true) {
      const currentDeposit = Number(allValues.depositAmount || 0);
      const currentRemaining = Number(allValues.remainingAmount || 0);
      form.setFieldsValue({
        depositAmount: currentDeposit + currentRemaining,
        remainingAmount: 0,
      });
    }
  };

  const handleClose = () => {
    form.resetFields();
    onClose?.();
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit({
        name: values.name.trim(),
        phone: values.phone.trim(),
        sessionId: values.sessionId,
        depositAmount: Number(values.depositAmount) || 0,
        remainingAmount: Number(values.remainingAmount) || 0,
        isFullyPaid: Boolean(values.isFullyPaid),
        paymentNote: values.paymentNote?.trim() ?? '',
      });
    } catch {
      // Lỗi validate trên form
    }
  };

  return (
    <ResponsiveModal
      title={editTarget ? 'Chỉnh sửa thông tin Học viên' : 'Thêm Học viên mới'}
      open={open}
      onClose={handleClose}
      onSubmit={handleOk}
      submitText={editTarget ? 'Lưu thay đổi' : 'Thêm học viên'}
      submitting={submitting}
      submitButtonId="drawer-btn-submit-student"
      width={540}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: screens.md ? 16 : 8 }}
        requiredMark="optional"
        onValuesChange={handleValuesChange}
      >
        <Form.Item
          name="sessionId"
          label="Lớp học đăng ký"
          rules={[{ required: true, message: 'Vui lòng chọn lớp học.' }]}
        >
          <Select
            placeholder="Chọn lớp học..."
            showSearch
            optionFilterProp="label"
            options={sessionOptions}
            id="select-student-session"
          />
        </Form.Item>

        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="name"
              label="Họ và tên"
              rules={[{ required: true, message: 'Vui lòng nhập họ tên học viên.' }]}
            >
              <Input
                placeholder="VD: Nguyễn Văn A"
                prefix={<UserOutlined style={{ color: '#bbb' }} />}
                id="input-student-name"
                autoComplete="off"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              name="phone"
              label="Số điện thoại"
              rules={[
                { required: true, message: 'Vui lòng nhập số điện thoại.' },
                { pattern: /^[0-9+\-\s]{8,15}$/, message: 'Số điện thoại không hợp lệ.' },
              ]}
            >
              <Input
                placeholder="VD: 0901234567"
                prefix={<PhoneOutlined style={{ color: '#bbb' }} />}
                id="input-student-phone"
                autoComplete="off"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item name="depositAmount" label="Số tiền đã cọc (đ)">
              <InputNumber
                min={0}
                step={100000}
                formatter={moneyFormatter}
                parser={moneyParser}
                style={{ width: '100%' }}
                placeholder="0"
                prefix={<DollarOutlined style={{ color: '#bbb' }} />}
                id="input-student-deposit"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name="remainingAmount" label="Số tiền còn nợ (đ)">
              <InputNumber
                min={0}
                step={100000}
                formatter={moneyFormatter}
                parser={moneyParser}
                style={{ width: '100%' }}
                placeholder="0"
                id="input-student-remaining"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="isFullyPaid"
          label="Trạng thái hoàn thành học phí"
          valuePropName="checked"
          extra="Khi bật 'Đã đóng xong', hệ thống sẽ tự động gán Còn nợ = 0 và cộng dồn nợ vào Tiền cọc."
        >
          <Switch
            checkedChildren="✓ Đã đóng xong"
            unCheckedChildren="Còn nợ"
            id="switch-student-fully-paid"
          />
        </Form.Item>

        <Form.Item name="paymentNote" label="Ghi chú thanh toán">
          <Input.TextArea
            rows={2}
            placeholder="VD: Đã đóng tiền mặt, Chuyển khoản qua Techcombank..."
            id="input-student-note"
          />
        </Form.Item>
      </Form>
    </ResponsiveModal>
  );
}
