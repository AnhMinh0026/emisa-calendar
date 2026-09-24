'use strict';

const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// SystemSetting — Cấu hình hệ thống dạng key-value linh hoạt
//
// Ví dụ records:
//   { key: 'contact_links', value: { facebook: '...', zalo: '...' } }
// ─────────────────────────────────────────────────────────────────────────────
const systemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'key là bắt buộc.'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'value là bắt buộc.'],
    },
  },
  {
    timestamps: true,
    collection: 'system_settings',
  }
);

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
