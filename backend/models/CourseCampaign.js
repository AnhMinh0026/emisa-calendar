'use strict';

const mongoose = require('mongoose');

/**
 * Schema: CourseCampaigns
 *
 * Đại diện cho một "Khóa học" — cấp tổ chức cao nhất.
 * Mỗi CourseCampaign có thể kéo dài qua nhiều tháng và
 * chứa nhiều ClassSession (quan hệ 1-N).
 *
 * Ví dụ: "Khóa Hè Q3" có months: ['07/2026', '08/2026', '09/2026']
 */
const courseCampaignSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Tiêu đề khóa học là bắt buộc'],
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: '',
    },

    /**
     * months: Mảng các tháng của khóa học.
     * Định dạng chuỗi 'MM/YYYY' — dễ đọc, dễ so sánh.
     * Ví dụ: ['09/2026', '10/2026', '11/2026']
     *
     * Dùng làm danh sách whitelist để:
     *   1. Hiển thị Tab tháng trong SessionPage.
     *   2. Validate campaignMonth của ClassSession khi tạo/sửa.
     */
    months: {
      type: [String],
      required: [true, 'Khóa học phải có ít nhất một tháng'],
      validate: {
        validator: (arr) => {
          if (!Array.isArray(arr) || arr.length === 0) return false;
          // Mỗi phần tử phải đúng định dạng MM/YYYY
          return arr.every((m) => /^\d{2}\/\d{4}$/.test(m));
        },
        message: "months phải là mảng không rỗng, mỗi phần tử định dạng 'MM/YYYY' (VD: '09/2026')",
      },
    },

    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'coursecampaigns',
  }
);

// Index để tăng tốc query và sort
courseCampaignSchema.index({ months: 1 });

const CourseCampaign = mongoose.model('CourseCampaign', courseCampaignSchema);

module.exports = CourseCampaign;
