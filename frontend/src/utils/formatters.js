import dayjs from 'dayjs';

/**
 * Định dạng tiền tệ VNĐ an toàn với null/undefined/NaN
 */
export const fmtMoney = (val, emptyFallback = '0đ') => {
  const n = Number(val);
  if (val === null || val === undefined || isNaN(n)) return emptyFallback;
  if (n === 0) return '0đ';
  return `${n.toLocaleString('vi-VN')}đ`;
};

/**
 * Hiển thị danh sách ngày học dạng chuỗi rút gọn 'DD/MM, DD/MM'
 */
export const formatDates = (dates) => {
  if (!dates?.length) return '—';
  return dates.map((d) => dayjs(d).format('DD/MM')).join(', ');
};

/**
 * Tách { month, year } từ chuỗi 'MM/YYYY' hoặc 'M/YYYY'
 */
export const parseMonthKey = (monthStr) => {
  if (!monthStr || typeof monthStr !== 'string') return null;
  const parts = monthStr.trim().split('/').map((p) => parseInt(p, 10));
  if (parts.length >= 2) {
    const [mm, yyyy] = parts;
    if (!isNaN(mm) && !isNaN(yyyy) && mm >= 1 && mm <= 12) return { month: mm, year: yyyy };
  } else if (parts.length === 1 && !isNaN(parts[0])) {
    const mm = parts[0];
    if (mm >= 1 && mm <= 12) return { month: mm, year: dayjs().year() };
  }
  return null;
};

/**
 * Chặn những ngày không thuộc tháng campaignMonth ('MM/YYYY') trên DatePicker
 */
export const buildDisabledDate = (campaignMonth) => {
  if (!campaignMonth) return () => true;
  const parsed = parseMonthKey(campaignMonth);
  if (!parsed) return () => true;
  return (current) => {
    if (!current) return false;
    return current.month() + 1 !== parsed.month || current.year() !== parsed.year;
  };
};

/**
 * Nhóm danh sách sessions theo cấu trúc phân cấp Khóa học -> Tháng (dùng cho Admin SessionPage)
 */
export const groupSessionsByCampaign = (sessions) => {
  const groups = {};

  sessions.forEach((session) => {
    const campaignObj = session.campaignId;
    if (!campaignObj?._id) return;

    const cId = campaignObj._id;
    const monthKey = session.campaignMonth ?? '??';

    if (!groups[cId]) {
      groups[cId] = {
        campaign: campaignObj,
        months: {},
        orderedMonths: campaignObj.months ?? [],
      };
    }

    if (!groups[cId].months[monthKey]) {
      groups[cId].months[monthKey] = {
        label: `Tháng ${monthKey}`,
        sessions: [],
      };
    }

    groups[cId].months[monthKey].sessions.push(session);
  });

  return groups;
};

/**
 * Nhóm danh sách sessions cho trang Lịch học khách hàng
 */
export const groupPublicSessions = (sessions) => {
  const groups = {};
  sessions.forEach((s) => {
    if (s.isHidden || s.campaignId?.isHidden) return;
    const c = s.campaignId;
    if (!c?._id) return;
    const cId = c._id;
    const mk = s.campaignMonth ?? '??';
    if (!groups[cId]) groups[cId] = { campaign: c, months: {} };
    if (!groups[cId].months[mk]) groups[cId].months[mk] = [];
    groups[cId].months[mk].push(s);
  });
  return groups;
};

/**
 * Helper formatter & parser cho InputNumber tiền tệ
 */
export const moneyFormatter = (v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '');
export const moneyParser = (v) => v?.replace(/,/g, '') || 0;

