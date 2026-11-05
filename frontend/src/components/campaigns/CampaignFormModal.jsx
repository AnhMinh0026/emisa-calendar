import { useEffect, useMemo, useState } from 'react';
import { Form, Input, Select, DatePicker, Button, Grid, Flex, Typography, Tag } from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import ResponsiveModal from '../common/ResponsiveModal';

const { Text } = Typography;

const MONTHS_IN_YEAR = [
  '01', '02', '03', '04', '05', '06',
  '07', '08', '09', '10', '11', '12',
];

/**
 * Sắp xếp mảng tháng 'MM/YYYY' tăng dần theo thời gian
 */
function sortMonthKeys(list = []) {
  return [...list].sort((a, b) => {
    const [mA, yA] = String(a).split('/').map(Number);
    const [mB, yB] = String(b).split('/').map(Number);
    return yA !== yB ? yA - yB : mA - mB;
  });
}

/**
 * Bộ chọn Tháng trực quan dạng lưới 12 tháng theo từng Năm (Dành cho Web).
 * Cho phép chọn bất kỳ năm nào tùy ý qua DatePicker Năm hoặc nút tiến/lùi năm (‹ / ›).
 */
function CampaignMonthGridPicker({ value = [], onChange }) {
  const [selectedYear, setSelectedYear] = useState(null);
  const selectedSet = useMemo(() => new Set(value), [value]);

  const defaultYearFromValue = useMemo(() => {
    if (value && value.length > 0) {
      const [, firstYr] = String(value[0]).split('/');
      if (firstYr && !Number.isNaN(Number(firstYr))) {
        return Number(firstYr);
      }
    }
    return dayjs().year();
  }, [value]);

  const currentYear = selectedYear ?? defaultYearFromValue;

  // Thống kê số tháng đã chọn theo từng năm để hiển thị lối tắt chuyển nhanh
  const yearsWithSelection = useMemo(() => {
    const counts = {};
    (value ?? []).forEach((mk) => {
      const [, yyyy] = String(mk).split('/');
      const yr = Number(yyyy);
      if (!Number.isNaN(yr)) {
        counts[yr] = (counts[yr] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([yr, count]) => ({ year: Number(yr), count }))
      .sort((a, b) => a.year - b.year);
  }, [value]);

  const toggleMonth = (mm) => {
    const key = `${mm}/${currentYear}`;
    const next = selectedSet.has(key)
      ? value.filter((item) => item !== key)
      : [...value, key];
    onChange?.(sortMonthKeys(next));
  };

  const removeMonthKey = (key) => {
    onChange?.(sortMonthKeys(value.filter((item) => item !== key)));
  };

  const yearMonthKeys = useMemo(
    () => MONTHS_IN_YEAR.map((mm) => `${mm}/${currentYear}`),
    [currentYear]
  );

  const selectedInCurrentYear = useMemo(
    () => yearMonthKeys.filter((k) => selectedSet.has(k)).length,
    [yearMonthKeys, selectedSet]
  );

  const isAllCurrentYearSelected = selectedInCurrentYear === 12;

  const handleToggleAllInYear = () => {
    if (isAllCurrentYearSelected) {
      const next = value.filter((k) => !k.endsWith(`/${currentYear}`));
      onChange?.(sortMonthKeys(next));
    } else {
      const merged = new Set([...value, ...yearMonthKeys]);
      onChange?.(sortMonthKeys(Array.from(merged)));
    }
  };

  const sortedSelected = useMemo(() => sortMonthKeys(value), [value]);

  return (
    <div
      style={{
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: 14,
      }}
    >
      {/* Thanh điều hướng Năm tùy ý (‹ Năm YYYY ›) + Các năm đang có tháng được chọn + Chọn nhanh cả năm */}
      <Flex
        justify="space-between"
        align="center"
        wrap="wrap"
        gap={8}
        style={{ marginBottom: 12 }}
      >
        <Flex align="center" gap={8} wrap="wrap">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: 2,
              gap: 2,
            }}
          >
            <Button
              type="text"
              size="small"
              icon={<LeftOutlined style={{ fontSize: 11 }} />}
              onClick={() => setSelectedYear(currentYear - 1)}
              title="Năm trước"
              style={{ width: 26, height: 26 }}
            />
            <DatePicker
              picker="year"
              size="small"
              allowClear={false}
              inputReadOnly
              value={dayjs().year(currentYear)}
              onChange={(date) => {
                if (date) setSelectedYear(date.year());
              }}
              format={(val) => `Năm ${val.year()}`}
              variant="borderless"
              style={{ width: 105, fontWeight: 700, padding: '0 4px' }}
              id="picker-campaign-year-web"
            />
            <Button
              type="text"
              size="small"
              icon={<RightOutlined style={{ fontSize: 11 }} />}
              onClick={() => setSelectedYear(currentYear + 1)}
              title="Năm tiếp theo"
              style={{ width: 26, height: 26 }}
            />
          </div>

          {/* Hiển thị các năm đang có tháng được chọn để nhảy nhanh qua lại */}
          {yearsWithSelection.map(({ year, count }) => {
            const isActive = year === currentYear;
            return (
              <button
                key={year}
                type="button"
                onClick={() => setSelectedYear(year)}
                style={{
                  border: isActive ? '1px solid #3B82F6' : '1px solid #E2E8F0',
                  background: isActive ? '#EFF6FF' : '#FFFFFF',
                  color: isActive ? '#1D4ED8' : '#475569',
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span>{year}</span>
                <span
                  style={{
                    background: isActive ? '#DBEAFE' : '#F1F5F9',
                    color: isActive ? '#1D4ED8' : '#64748B',
                    borderRadius: 999,
                    padding: '0 6px',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </Flex>

        <button
          type="button"
          onClick={handleToggleAllInYear}
          style={{
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            color: '#334155',
            borderRadius: 7,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {isAllCurrentYearSelected
            ? `Bỏ chọn năm ${currentYear}`
            : `Chọn cả năm ${currentYear}`}
        </button>
      </Flex>

      {/* Lưới 12 nút Tháng to, thoáng, dễ bấm */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 8,
        }}
      >
        {MONTHS_IN_YEAR.map((mm) => {
          const key = `${mm}/${currentYear}`;
          const isSelected = selectedSet.has(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleMonth(mm)}
              style={{
                height: 38,
                borderRadius: 8,
                border: isSelected
                  ? '1.5px solid #2563EB'
                  : '1px solid #CBD5E1',
                background: isSelected ? '#EFF6FF' : '#FFFFFF',
                color: isSelected ? '#1D4ED8' : '#1E293B',
                fontWeight: isSelected ? 700 : 500,
                fontSize: 13.5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
                boxShadow: isSelected
                  ? '0 2px 6px rgba(37, 99, 235, 0.12)'
                  : '0 1px 2px rgba(15, 23, 42, 0.03)',
              }}
            >
              {isSelected && <CheckOutlined style={{ fontSize: 12 }} />}
              <span>Tháng {Number(mm)}</span>
            </button>
          );
        })}
      </div>

      {/* Thanh tóm tắt các tháng đã chọn (có thể bấm X để xóa nhanh từng tháng) */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px dashed #CBD5E1',
        }}
      >
        <Flex
          justify="space-between"
          align="center"
          style={{ marginBottom: sortedSelected.length > 0 ? 8 : 0 }}
        >
          <Text style={{ fontSize: 12.5, color: '#475569', fontWeight: 600 }}>
            <CalendarOutlined style={{ marginRight: 6, color: '#2563EB' }} />
            Đã chọn ({sortedSelected.length} tháng)
          </Text>
          {sortedSelected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange?.([])}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#DC2626',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Bỏ chọn tất cả
            </button>
          )}
        </Flex>

        {sortedSelected.length > 0 ? (
          <Flex gap={6} wrap="wrap">
            {sortedSelected.map((mk) => (
              <Tag
                key={mk}
                closable
                onClose={(e) => {
                  e.preventDefault();
                  removeMonthKey(mk);
                }}
                closeIcon={<CloseOutlined style={{ fontSize: 10, color: '#1D4ED8' }} />}
                style={{
                  margin: 0,
                  padding: '3px 9px',
                  borderRadius: 6,
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1E40AF',
                  fontSize: 12.5,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                Tháng {mk}
              </Tag>
            ))}
          </Flex>
        ) : (
          <Text type="secondary" style={{ fontSize: 12.5 }}>
            Chưa chọn tháng nào. Hãy bấm vào các ô tháng phía trên để chọn.
          </Text>
        )}
      </div>
    </div>
  );
}

/**
 * Bộ chọn Tháng trên Mobile: Giữ nguyên ô Select multiple gọn gàng như cũ,
 * kèm bộ chọn Năm tùy ý (‹ Năm YYYY › + DatePicker Năm) ở góc phải để chọn bất kỳ năm nào.
 */
function MobileCampaignMonthSelect({ value = [], onChange }) {
  const [selectedYear, setSelectedYear] = useState(null);

  const defaultYear = useMemo(() => {
    if (value && value.length > 0) {
      const [, firstYr] = String(value[0]).split('/');
      if (firstYr && !Number.isNaN(Number(firstYr))) {
        return Number(firstYr);
      }
    }
    return dayjs().year();
  }, [value]);

  const activeYear = selectedYear ?? defaultYear;

  const monthOptions = useMemo(() => {
    const currentYearOpts = MONTHS_IN_YEAR.map((mm) => ({
      value: `${mm}/${activeYear}`,
      label: `Tháng ${Number(mm)}/${activeYear}`,
    }));
    const currentYearSet = new Set(currentYearOpts.map((o) => o.value));
    const otherSelectedOpts = (value ?? [])
      .filter((mk) => !currentYearSet.has(mk))
      .map((mk) => {
        const [mm, yyyy] = String(mk).split('/');
        return {
          value: mk,
          label: `Tháng ${Number(mm)}/${yyyy}`,
        };
      });
    return [...currentYearOpts, ...otherSelectedOpts];
  }, [activeYear, value]);

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 14, color: 'rgba(0, 0, 0, 0.88)' }}>
          Các tháng của khóa học
        </Text>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#FFFFFF',
            border: '1px solid #D9D9D9',
            borderRadius: 6,
            padding: 1,
          }}
        >
          <Button
            type="text"
            size="small"
            icon={<LeftOutlined style={{ fontSize: 10 }} />}
            onClick={() => setSelectedYear(activeYear - 1)}
            style={{ width: 24, height: 24 }}
          />
          <DatePicker
            picker="year"
            size="small"
            allowClear={false}
            inputReadOnly
            value={dayjs().year(activeYear)}
            onChange={(date) => {
              if (date) setSelectedYear(date.year());
            }}
            format={(val) => `Năm ${val.year()}`}
            variant="borderless"
            style={{ width: 96, fontWeight: 600, padding: '0 2px' }}
            id="select-campaign-year-mobile"
          />
          <Button
            type="text"
            size="small"
            icon={<RightOutlined style={{ fontSize: 10 }} />}
            onClick={() => setSelectedYear(activeYear + 1)}
            style={{ width: 24, height: 24 }}
          />
        </div>
      </Flex>
      <Select
        mode="multiple"
        placeholder={`Chọn tháng năm ${activeYear}...`}
        value={value}
        onChange={(next) => onChange?.(sortMonthKeys(next))}
        options={monthOptions}
        showSearch
        optionFilterProp="label"
        allowClear
        style={{ width: '100%' }}
        id="select-campaign-months"
      />
    </div>
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
  const screens = Grid.useBreakpoint();

  // Đồng bộ & xóa sạch state cũ mỗi khi mở modal hoặc chuyển đổi giữa Thêm mới / Chỉnh sửa
  useEffect(() => {
    if (!open) return;
    if (editTarget) {
      form.setFieldsValue({
        title: editTarget.title ?? '',
        description: editTarget.description ?? '',
        months: editTarget.months ?? [],
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        title: '',
        description: '',
        months: [],
      });
    }
  }, [open, editTarget, form]);

  const handleClose = () => {
    form.resetFields();
    onClose?.();
  };

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
      onClose={handleClose}
      onSubmit={handleOk}
      submitText={editTarget ? 'Lưu thay đổi' : 'Tạo mới'}
      submitting={submitting}
      submitButtonId="drawer-btn-submit-campaign"
      width={620}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: screens.md ? 10 : 8 }}
        requiredMark="optional"
      >
        <Form.Item
          name="title"
          label="Tiêu đề khóa học"
          style={{ marginBottom: screens.md ? 14 : 20 }}
          rules={[{ required: true, message: 'Vui lòng nhập tiêu đề khóa học.' }]}
        >
          <Input
            placeholder="VD: Khoá cơ bản"
            maxLength={100}
            showCount
            id="input-campaign-title"
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Mô tả (tùy chọn)"
          style={{ marginBottom: screens.md ? 20 : 28 }}
        >
          <Input.TextArea
            rows={screens.md ? 2 : 5}
            placeholder="Ghi chú thêm về khóa học..."
            maxLength={300}
            showCount
            id="input-campaign-description"
          />
        </Form.Item>

        <Form.Item
          name="months"
          style={{ marginBottom: 4 }}
          label={screens.md ? 'Các tháng của khóa học' : undefined}
          extra={
            screens.md
              ? 'Bấm trực tiếp vào các ô tháng để chọn hoặc bỏ chọn. Thứ tự tháng sẽ tự động sắp xếp tăng dần.'
              : 'Chọn năm ở nút nhỏ bên phải rồi chọn một hoặc nhiều tháng. Thứ tự sẽ tự động sắp xếp tăng dần.'
          }
          rules={[
            {
              required: true,
              type: 'array',
              min: 1,
              message: 'Vui lòng chọn ít nhất một tháng.',
            },
          ]}
        >
          {screens.md ? (
            <CampaignMonthGridPicker key={editTarget?._id ?? 'create'} />
          ) : (
            <MobileCampaignMonthSelect key={editTarget?._id ?? 'create'} />
          )}
        </Form.Item>
      </Form>
    </ResponsiveModal>
  );
}
