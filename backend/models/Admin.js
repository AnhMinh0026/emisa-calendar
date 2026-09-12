'use strict';

const mongoose = require('mongoose');

/**
 * Schema: Admins
 *
 * Lưu danh sách tài khoản quản trị viên (Admin).
 * Hệ thống KHÔNG giới hạn số lượng Admin — tạo và phân quyền linh hoạt.
 *
 * Trường roleLevel (Number):
 *   - Cho phép phân tầng quyền hạn trong tương lai.
 *   - Ví dụ quy ước: 1 = Super Admin, 2 = Admin, 3 = Viewer-Admin.
 *   - Tầng Controller sẽ kiểm tra roleLevel để cấp/chặn quyền truy cập các endpoint nhạy cảm.
 */
const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username là bắt buộc'],
      unique: true,
      trim: true,
      lowercase: true,
    },

    // Hỗ trợ cả hai cơ chế xác thực: PIN (Mobile App) và Password (Web)
    pinCode: {
      type: String,
      default: null,
      select: false, // Không trả về trường này khi query mặc định
    },
    password: {
      type: String,
      default: null,
      select: false, // Không trả về trường này khi query mặc định
    },

    name: {
      type: String,
      required: [true, 'Tên hiển thị là bắt buộc'],
      trim: true,
    },

    /**
     * roleLevel: Mức phân quyền của Admin.
     * Quy ước giá trị (có thể mở rộng):
     *   1 → Super Admin  : Toàn quyền, bao gồm tạo/xóa Admin khác.
     *   2 → Admin        : Toàn quyền CRUD Khóa học, Lớp học, Sĩ số.
     *   3 → Viewer-Admin : Chỉ xem, không chỉnh sửa dữ liệu.
     */
    roleLevel: {
      type: Number,
      required: [true, 'roleLevel là bắt buộc'],
      enum: {
        values: [1, 2, 3],
        message: 'roleLevel phải là 1, 2, hoặc 3',
      },
      default: 2,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
    collection: 'admins',
  }
);

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
