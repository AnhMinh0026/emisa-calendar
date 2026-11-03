import { useState, useEffect } from 'react';

/**
 * Hook trì hoãn cập nhật giá trị (debounce) giúp tối ưu hiệu năng khi tìm kiếm/lọc trên tập dữ liệu lớn.
 * @param {any} value Giá trị gốc
 * @param {number} delay Thời gian trễ (ms), mặc định 200ms
 */
export default function useDebounce(value, delay = 200) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  // Nếu xóa trắng (chuỗi rỗng), trả về ngay lập tức để trải nghiệm nút Clear mượt mà
  return value === '' || value === null || value === undefined ? value : debouncedValue;
}
