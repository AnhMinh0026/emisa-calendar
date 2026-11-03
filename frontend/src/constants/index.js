import dayjs from 'dayjs';

// ── Apple Design Tokens (Customer Schedule & Login) ──────────────────────────
export const T = {
  black: '#1D1D1F',
  white: '#FFFFFF',
  gray1: '#ececee', // bg nhạt
  gray2: '#E5E5EA', // viền
  gray3: '#8E8E93', // text phụ
  gray4: '#AEAEB2', // dot neutral
  green: '#34C759',
};

// ── Cấu hình trạng thái lớp học (Admin) ──────────────────────────────────────
export const STATUS_CONFIG = {
  open: { color: 'success', label: 'Mở', mobileLabel: 'Còn chỗ' },
  full: { color: 'error', label: 'Đầy', mobileLabel: 'Đã đầy' },
  closed: { color: 'default', label: 'Đóng', mobileLabel: 'Đã đóng' },
};

// ── Cấu hình trạng thái lớp học (Customer Page) ──────────────────────────────
export const CUSTOMER_STATUS_CFG = {
  open: { dot: T.green, label: 'Còn chỗ', textColor: T.green },
  full: { dot: T.gray4, label: 'Đã đầy', textColor: T.gray3 },
  closed: { dot: T.gray4, label: 'Đã đóng', textColor: T.gray3 },
};

// ── Options lọc trạng thái lớp học ───────────────────────────────────────────
export const SESSION_STATUS_OPTIONS = [
  { value: 'open', label: '🟢  Mở' },
  { value: 'full', label: '🔴  Đầy' },
  { value: 'closed', label: '⚫  Đóng' },
];

// ── Options lọc trạng thái đóng học phí ──────────────────────────────────────
export const PAYMENT_STATUS_OPTIONS = [
  { value: true, label: '✓ Đã đóng xong' },
  { value: false, label: '⏳ Còn nợ' },
];

// ── Danh sách 30 tháng cho Select (từ 6 tháng trước) ─────────────────────────
export const generateMonthOptions = () => {
  const options = [];
  const start = dayjs().subtract(6, 'month');
  for (let i = 0; i < 30; i++) {
    const m = start.add(i, 'month');
    const value = m.format('MM/YYYY');
    options.push({ value, label: `Tháng ${m.format('M/YYYY')}` });
  }
  return options;
};

export const MONTH_OPTIONS = generateMonthOptions();

