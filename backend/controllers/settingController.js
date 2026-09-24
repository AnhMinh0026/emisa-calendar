'use strict';

const SystemSetting = require('../models/SystemSetting');

// Default value khi key chưa tồn tại
const DEFAULTS = {
  contact_links: { facebook: '', zalo: '' },
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/settings/:key
// Trả về setting theo key. Nếu chưa tồn tại thì trả về default value.
// ─────────────────────────────────────────────────────────────────────────────
const getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const doc = await SystemSetting.findOne({ key }).lean();

    if (doc) {
      return res.json({ success: true, data: doc });
    }

    // Chưa tồn tại → trả về default
    const defaultValue = DEFAULTS[key] ?? null;
    return res.json({
      success: true,
      data: { key, value: defaultValue },
    });
  } catch (err) {
    console.error('[settingController] getSetting error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy cấu hình.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/settings/:key
// Upsert setting (tạo mới nếu chưa có, cập nhật nếu đã có).
// Body: { value: any }
// ─────────────────────────────────────────────────────────────────────────────
const upsertSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ success: false, message: 'Thiếu trường value trong request body.' });
    }

    const doc = await SystemSetting.findOneAndUpdate(
      { key },
      { $set: { value } },
      { upsert: true, new: true, runValidators: true }
    ).lean();

    res.json({ success: true, data: doc, message: 'Cấu hình đã được lưu.' });
  } catch (err) {
    console.error('[settingController] upsertSetting error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi lưu cấu hình.' });
  }
};

module.exports = { getSetting, upsertSetting };
