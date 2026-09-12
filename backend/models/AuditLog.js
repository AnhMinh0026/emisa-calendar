'use strict';

const mongoose = require('mongoose');

/**
 * Schema: AuditLogs
 *
 * Ghi lại lịch sử mọi hành động quan trọng của Admin trong hệ thống.
 * Phục vụ mục đích: kiểm toán, phát hiện bất thường, và truy vết sự cố.
 *
 * Collection này chỉ được THÊM MỚI (append-only) — không update, không xóa.
 * Để tối ưu bộ nhớ cho dữ liệu lớn, có thể cấu hình TTL index sau này.
 */
const auditLogSchema = new mongoose.Schema(
  {
    /**
     * adminId: Tham chiếu tới Admin đã thực hiện hành động.
     * Lưu ObjectId để có thể populate thông tin Admin khi cần.
     */
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'adminId là bắt buộc'],
      index: true,
    },

    /**
     * actionType: Loại hành động được thực hiện.
     * Dùng Enum để đảm bảo tính nhất quán của dữ liệu log.
     *
     * Các giá trị hiện tại:
     *   SESSION_BOOK    → Admin chốt 1 slot trong một lớp học.
     *   SESSION_UNBOOK  → Admin hủy 1 slot đã chốt.
     *   SESSION_CREATE  → Admin tạo mới một lớp học.
     *   SESSION_UPDATE  → Admin cập nhật thông tin lớp học.
     *   SESSION_DELETE  → Admin xóa một lớp học.
     *   SESSION_CLOSE   → Admin đóng thủ công một lớp học.
     *   CAMPAIGN_CREATE → Admin tạo mới một khóa học.
     *   CAMPAIGN_UPDATE → Admin cập nhật thông tin khóa học.
     *   CAMPAIGN_DELETE → Admin xóa một khóa học.
     *   ADMIN_CREATE    → Super Admin tạo tài khoản Admin mới.
     *   ADMIN_UPDATE    → Super Admin cập nhật tài khoản Admin.
     *   ADMIN_DELETE    → Super Admin vô hiệu hóa tài khoản Admin.
     */
    actionType: {
      type: String,
      required: [true, 'actionType là bắt buộc'],
      enum: {
        values: [
          'SESSION_BOOK',
          'SESSION_UNBOOK',
          'SESSION_CREATE',
          'SESSION_UPDATE',
          'SESSION_DELETE',
          'SESSION_CLOSE',
          'CAMPAIGN_CREATE',
          'CAMPAIGN_UPDATE',
          'CAMPAIGN_DELETE',
          'ADMIN_CREATE',
          'ADMIN_UPDATE',
          'ADMIN_DELETE',
        ],
        message: 'actionType không hợp lệ',
      },
      index: true,
    },

    /**
     * targetClass: Thông tin định danh của đối tượng bị tác động.
     * Lưu classCode (String) để dễ đọc trong log, không cần join/populate.
     * Ví dụ: "K02", "K09B", hoặc campaign title cho các action liên quan Campaign.
     */
    targetClass: {
      type: String,
      trim: true,
      default: null,
    },

    /**
     * metadata: Thông tin bổ sung dạng tự do cho từng loại action.
     * Ví dụ: { prevStatus: 'open', newStatus: 'full', delta: 1 }
     * Dùng Mixed type để linh hoạt mở rộng mà không cần thay đổi Schema.
     */
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    /**
     * timestamp: Thời điểm chính xác hành động được ghi nhận.
     * Đặt default là Date.now và index để hỗ trợ query theo khoảng thời gian.
     * (Không dùng createdAt của timestamps để kiểm soát rõ hơn)
     */
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    // Tắt updatedAt vì AuditLog là immutable (append-only)
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    collection: 'auditlogs',
  }
);

// ---------------------------------------------------------------
// Compound Index: Query log theo Admin + khoảng thời gian
// ---------------------------------------------------------------
auditLogSchema.index({ adminId: 1, timestamp: -1 });

// ---------------------------------------------------------------
// Compound Index: Query log theo loại hành động + thời gian
// ---------------------------------------------------------------
auditLogSchema.index({ actionType: 1, timestamp: -1 });

// ---------------------------------------------------------------
// TTL Index (tùy chọn - hiện đang tắt):
// Tự động xóa log cũ hơn 365 ngày để kiểm soát dung lượng Atlas.
// Bỏ comment dòng dưới để kích hoạt:
// auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });
// ---------------------------------------------------------------

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
