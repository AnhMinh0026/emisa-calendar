'use strict';

const mongoose = require('mongoose');

/**
 * Schema: ClassSessions
 *
 * Đại diện cho một "Lớp học" cụ thể thuộc một CourseCampaign.
 * Đây là collection trung tâm của hệ thống, nơi diễn ra xung đột đồng thời
 * khi nhiều Admin cùng cố gắng chốt slot cùng lúc.
 */
const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Họ tên học viên là bắt buộc'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Số điện thoại học viên là bắt buộc'],
      trim: true,
    },
    /** Số tiền đặt cọc (VND). Optional, mặc định 0. */
    depositAmount: {
      type: Number,
      default: 0,
      min: [0, 'Tiền cọc không thể âm'],
    },
    /** Số tiền còn phải đóng thêm (VND). Optional, mặc định 0. */
    remainingAmount: {
      type: Number,
      default: 0,
      min: [0, 'Tiền còn nợ không thể âm'],
    },
    /** true = đã đóng đủ học phí. */
    isFullyPaid: {
      type: Boolean,
      default: false,
    },
    /** Ghi chú tuỳ ý của admin (VD: "Chờ chuyển khoản", "Đóng tiền mặt"). */
    paymentNote: {
      type: String,
      trim: true,
      default: '',
    },
    bookedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const classSessionSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseCampaign',
      required: [true, 'campaignId là bắt buộc'],
      index: true,
    },

    campaignMonth: {
      type: String,
      required: [true, 'campaignMonth là bắt buộc'],
      match: [/^\d{2}\/\d{4}$/, "campaignMonth phải đúng định dạng 'MM/YYYY'"],
      index: true,
    },

    classCode: {
      type: String,
      required: [true, 'classCode là bắt buộc'],
      trim: true,
      uppercase: true,
    },

    studyDates: {
      type: [Date],
      required: [true, 'studyDates là bắt buộc'],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'studyDates phải có ít nhất một ngày học',
      },
    },

    timeSlot: {
      type: String,
      required: [true, 'timeSlot là bắt buộc'],
      trim: true,
    },

    maxCapacity: {
      type: Number,
      required: [true, 'maxCapacity là bắt buộc'],
      min: [1, 'maxCapacity phải lớn hơn 0'],
    },

    currentBooked: {
      type: Number,
      default: 0,
      min: [0, 'currentBooked không thể âm'],
    },

    students: {
      type: [studentSchema],
      default: [],
    },

    status: {
      type: String,
      enum: {
        values: ['open', 'full', 'closed'],
        message: "status phải là 'open', 'full', hoặc 'closed'",
      },
      default: 'open',
      index: true,
    },

    /**
     * isHidden: Trạng thái ẩn/hiện của ca học trên trang Lịch học Public.
     *   false (mặc định) → Hiển thị công khai cho học viên.
     *   true             → Ẩn khỏi trang Public (VD: các lớp Ôn tập nội bộ),
     *                      nhưng vẫn giữ nguyên và quản lý bình thường ở trang Admin.
     */
    isHidden: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'classsessions',
  }
);

classSessionSchema.index({ campaignId: 1, campaignMonth: 1, timeSlot: 1, studyDates: 1 });
classSessionSchema.index({ _id: 1, status: 1 });

const ClassSession = mongoose.model('ClassSession', classSessionSchema);

module.exports = ClassSession;
