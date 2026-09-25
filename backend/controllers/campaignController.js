'use strict';

const mongoose = require('mongoose');
const CourseCampaign = require('../models/CourseCampaign');
const ClassSession = require('../models/ClassSession');

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: handleServerError — Chuẩn hoá lỗi trả về
// ─────────────────────────────────────────────────────────────────────────────
const handleServerError = (res, fn, error) => {
  console.error(`[${fn}] Error:`, error);

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ.',
      errors: Object.values(error.errors).map((e) => e.message),
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Lỗi server nội bộ.',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: validateMonths
// Kiểm tra mảng months hợp lệ: không rỗng, đúng định dạng MM/YYYY,
// không trùng lặp, sắp xếp theo thứ tự tăng dần.
// ─────────────────────────────────────────────────────────────────────────────
const parseAndValidateMonths = (rawMonths) => {
  if (!Array.isArray(rawMonths) || rawMonths.length === 0) {
    return { error: 'months phải là mảng không rỗng.' };
  }

  const pattern = /^\d{2}\/\d{4}$/;
  const invalid = rawMonths.filter((m) => typeof m !== 'string' || !pattern.test(m));
  if (invalid.length > 0) {
    return { error: `months chứa giá trị không hợp lệ: ${invalid.join(', ')}. Định dạng yêu cầu: MM/YYYY` };
  }

  // Loại bỏ trùng và sắp xếp tăng dần (YYYY-MM để sort đúng)
  const sorted = [...new Set(rawMonths)].sort((a, b) => {
    const [ma, ya] = a.split('/');
    const [mb, yb] = b.split('/');
    return Number(ya) !== Number(yb) ? Number(ya) - Number(yb) : Number(ma) - Number(mb);
  });

  return { months: sorted };
};

// ─────────────────────────────────────────────────────────────────────────────
// createCampaign — POST /api/campaigns
// ─────────────────────────────────────────────────────────────────────────────
const createCampaign = async (req, res) => {
  try {
    const { title, description, months, isHidden } = req.body;

    if (!title || !months) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc: title và months (mảng 'MM/YYYY').",
      });
    }

    const validated = parseAndValidateMonths(months);
    if (validated.error) {
      return res.status(400).json({ success: false, message: validated.error });
    }

    const campaign = await CourseCampaign.create({
      title,
      description,
      months: validated.months,
      isHidden: isHidden !== undefined ? Boolean(isHidden) : false,
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo khóa học thành công.',
      data: campaign,
    });
  } catch (error) {
    return handleServerError(res, 'createCampaign', error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// getAllCampaigns — GET /api/campaigns
// ─────────────────────────────────────────────────────────────────────────────
const getAllCampaigns = async (req, res) => {
  try {
    const { isPublic } = req.query;
    const filter = { isArchived: false };
    if (isPublic === 'true') {
      filter.isHidden = { $ne: true };
    }

    const campaigns = await CourseCampaign.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: campaigns.length,
      data: campaigns,
    });
  } catch (error) {
    return handleServerError(res, 'getAllCampaigns', error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// updateCampaign — PUT /api/campaigns/:id
// ─────────────────────────────────────────────────────────────────────────────
const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID khóa học không hợp lệ.' });
    }

    const { title, description, months, isHidden } = req.body;
    const updateFields = {};

    if (title       !== undefined) updateFields.title       = title;
    if (description !== undefined) updateFields.description = description;
    if (isHidden    !== undefined) updateFields.isHidden    = Boolean(isHidden);

    if (months !== undefined) {
      const validated = parseAndValidateMonths(months);
      if (validated.error) {
        return res.status(400).json({ success: false, message: validated.error });
      }

      // Kiểm tra: Nếu bỏ tháng nào đó, đảm bảo không có lớp học nào đang dùng tháng đó
      const current = await CourseCampaign.findById(id).lean();
      if (current) {
        const removedMonths = (current.months || []).filter(
          (m) => !validated.months.includes(m)
        );
        if (removedMonths.length > 0) {
          const linkedCount = await ClassSession.countDocuments({
            campaignId: id,
            campaignMonth: { $in: removedMonths },
          });
          if (linkedCount > 0) {
            return res.status(400).json({
              success: false,
              message: `Không thể bỏ tháng ${removedMonths.join(', ')} vì còn ${linkedCount} lớp học đang sử dụng.`,
            });
          }
        }
      }

      updateFields.months = validated.months;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có trường nào được cập nhật. Cung cấp ít nhất: title, description, months, hoặc isHidden.',
      });
    }

    const updated = await CourseCampaign.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Cập nhật khóa học thành công.',
      data: updated,
    });
  } catch (error) {
    return handleServerError(res, 'updateCampaign', error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// deleteCampaign — DELETE /api/campaigns/:id
//
// RÀNG BUỘC TOÀN VẸN DỮ LIỆU:
//   Trước khi xóa, kiểm tra xem có ClassSession nào đang tham chiếu
//   campaignId này không. Nếu có → từ chối 400, bảo toàn dữ liệu.
// ─────────────────────────────────────────────────────────────────────────────
const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID khóa học không hợp lệ.' });
    }

    const linkedSessionCount = await ClassSession.countDocuments({ campaignId: id });

    if (linkedSessionCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa! Khóa học này còn ${linkedSessionCount} lớp học liên kết. Hãy xóa các lớp học trước.`,
        linkedSessionCount,
      });
    }

    const deleted = await CourseCampaign.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học.' });
    }

    return res.status(200).json({
      success: true,
      message: `Đã xóa khóa học "${deleted.title}" thành công.`,
    });
  } catch (error) {
    return handleServerError(res, 'deleteCampaign', error);
  }
};

module.exports = { createCampaign, getAllCampaigns, updateCampaign, deleteCampaign };
