'use strict';

const mongoose = require('mongoose');

/**
 * Schema: ClassSessions
 *
 * Đại diện cho một "Lớp học" cụ thể thuộc một CourseCampaign.
 * Đây là collection trung tâm của hệ thống, nơi diễn ra xung đột đồng thời
 * khi nhiều Admin cùng cố gắng chốt slot cùng lúc.
 *
 * ============================================================
 * GHI CHÚ KIẾN TRÚC: CHỐNG XUNG ĐỘT ĐỒNG THỜI VỚI $inc
 * ============================================================
 *
 * VẤN ĐỀ (Race Condition):
 *   Admin A và Admin B cùng lúc đọc bản ghi có currentBooked = 4, maxCapacity = 5.
 *   Cả hai đều thấy "còn 1 slot" → cùng gọi save() → currentBooked thành 6.
 *   → Dữ liệu sai, lớp bị nhận quá sĩ số cho phép.
 *
 * GIẢI PHÁP (Atomic Update tại tầng Controller):
 *   Thay vì dùng find() → modify → save() (2 bước, không an toàn),
 *   Controller sẽ dùng findOneAndUpdate() với toán tử $inc VÀ bộ lọc
 *   điều kiện nguyên tử (atomic filter) ngay trong cùng một lệnh MongoDB:
 *
 *   // [CONTROLLER - sessionController.js]
 *   const updatedSession = await ClassSession.findOneAndUpdate(
 *     {
 *       _id: sessionId,
 *       status: 'open',                          // Chỉ cập nhật khi ca đang mở
 *       $expr: { $lt: ['$currentBooked', '$maxCapacity'] } // Atomic guard: currentBooked < maxCapacity
 *     },
 *     {
 *       $inc: { currentBooked: 1 }               // Tăng nguyên tử, tránh race condition
 *     },
 *     {
 *       new: true,      // Trả về document SAU KHI update
 *       runValidators: true,
 *     }
 *   );
 *
 *   if (!updatedSession) {
 *     // null → không tìm thấy document thỏa điều kiện
 *     // → ca đã đầy HOẶC đã đóng → trả về lỗi 409 Conflict cho client
 *     return res.status(409).json({ message: 'Slot đã đầy hoặc lớp học đã đóng.' });
 *   }
 *
 *   // Thành công → emit Socket.io event để broadcast trạng thái mới
 *   io.emit('session_updated', updatedSession);
 *
 * TẠI SAO AN TOÀN:
 *   MongoDB đảm bảo findOneAndUpdate() là một thao tác ATOMIC ở cấp document.
 *   Dù 100 Admin gọi đồng thời, chỉ duy nhất NHỮNG request thỏa
 *   điều kiện (currentBooked < maxCapacity) tại thời điểm DB xử lý mới thành công.
 *   Các request còn lại nhận về null và bị từ chối ngay lập tức.
 * ============================================================
 */
/**
 * Sub-schema: Student
 * Lưu thông tin một học viên đã đăng ký vào ca học.
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
    /**
     * campaignId: Tham chiếu tới CourseCampaign mà lớp học này thuộc về.
     * Quan hệ N-1: nhiều ClassSession → một CourseCampaign.
     */
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseCampaign',
      required: [true, 'campaignId là bắt buộc'],
      index: true, // Tối ưu query lọc lớp học theo kỳ
    },

    /**
     * campaignMonth: Tháng cụ thể của Khóa học mà lớp học này thuộc về.
     * Định dạng 'MM/YYYY' — phải nằm trong mảng months[] của Campaign.
     * Dùng làm key nhóm dữ liệu theo Tab tháng ở Frontend.
     * Ví dụ: '09/2026'
     */
    campaignMonth: {
      type: String,
      required: [true, 'campaignMonth là bắt buộc'],
      match: [/^\d{2}\/\d{4}$/, "campaignMonth phải đúng định dạng 'MM/YYYY'"],
      index: true,
    },

    /**
     * classCode: Mã định danh duy nhất của lớp học trong hệ thống.
     * Ví dụ: "K02", "K09B", "ADV-01".
     * Dùng để hiển thị và phân biệt trong Zalo Bot / Toast Message.
     */
    classCode: {
      type: String,
      required: [true, 'classCode là bắt buộc'],
      trim: true,
      uppercase: true,
    },

    /**
     * studyDates: Mảng các ngày học cụ thể của ca này.
     * Lưu dưới dạng Date để dễ query theo khoảng thời gian.
     * Ví dụ: [ISODate("2026-09-03"), ISODate("2026-09-10"), ISODate("2026-09-17")]
     */
    studyDates: {
      type: [Date],
      required: [true, 'studyDates là bắt buộc'],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'studyDates phải có ít nhất một ngày học',
      },
    },

    /**
     * timeSlot: Khung giờ học của ca.
     * Lưu dạng String để linh hoạt (VD: "07:30 - 09:00", "18:00 - 20:00").
     * Tầng Validation (Section 4.1 SRS) sẽ query tổ hợp (studyDates, timeSlot, campaignId)
     * để phát hiện trùng lịch trước khi cho phép tạo ca mới.
     */
    timeSlot: {
      type: String,
      required: [true, 'timeSlot là bắt buộc'],
      trim: true,
    },

    /**
     * maxCapacity: Sĩ số tối đa của lớp học.
     * Là ngưỡng cứng — toán tử $inc ở Controller sẽ chặn khi
     * currentBooked đã đạt hoặc vượt giá trị này.
     */
    maxCapacity: {
      type: Number,
      required: [true, 'maxCapacity là bắt buộc'],
      min: [1, 'maxCapacity phải lớn hơn 0'],
    },

    /**
     * currentBooked: Số lượng slot đã được chốt hiện tại.
     *
     * ⚠️  QUAN TRỌNG — NGUYÊN TẮC CẬP NHẬT:
     *   KHÔNG BAO GIỜ dùng document.currentBooked++ rồi save().
     *   LUÔN LUÔN dùng $inc trong findOneAndUpdate() kết hợp
     *   điều kiện ($expr: { $lt: ['$currentBooked', '$maxCapacity'] })
     *   để đảm bảo tính nguyên tử (atomic) và tránh race condition.
     *   (Xem chi tiết hướng dẫn trong block comment phía trên Schema)
     */
    currentBooked: {
      type: Number,
      default: 0,
      min: [0, 'currentBooked không thể âm'],
    },

    /**
     * status: Trạng thái hiện tại của lớp học.
     *   'open'    → Đang mở đăng ký, còn slot trống.
     *   'full'    → Đã đạt maxCapacity, không thể chốt thêm.
     *   'closed'  → Admin đóng thủ công (VD: hủy lớp, dời lịch).
     *
     * Trạng thái này sẽ được cập nhật bởi Controller sau mỗi lần
     * $inc thành công (nếu currentBooked === maxCapacity → status = 'full').
     * Ngoài ra dùng làm điều kiện lọc trong atomic query (status: 'open').
     */
    /**
     * students: Danh sách học viên đã đăng ký vào ca học.
     * Mỗi phần tử là một studentSchema object { name, phone, bookedAt }.
     * Được cập nhật bằng $push nguyên tử cùng lúc với $inc currentBooked.
     */
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
      index: true, // Tối ưu query lọc theo trạng thái
    },
  },
  {
    timestamps: true,
    collection: 'classsessions',
  }
);

// ---------------------------------------------------------------
// Compound Index: Hỗ trợ validation chống trùng lịch (SRS 4.1)
// Query: { campaignId, studyDates, timeSlot } để kiểm tra conflict
// ---------------------------------------------------------------
classSessionSchema.index({ campaignId: 1, campaignMonth: 1, timeSlot: 1, studyDates: 1 });

// ---------------------------------------------------------------
// Compound Index: Hỗ trợ query atomic khi chốt slot (SRS 4.2)
// Query: { _id, status, currentBooked (via $expr) }
// ---------------------------------------------------------------
classSessionSchema.index({ _id: 1, status: 1 });

const ClassSession = mongoose.model('ClassSession', classSessionSchema);

module.exports = ClassSession;
