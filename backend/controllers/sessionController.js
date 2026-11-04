'use strict';

const mongoose = require('mongoose');
const ClassSession = require('../models/ClassSession');
const CourseCampaign = require('../models/CourseCampaign');
const AuditLog = require('../models/AuditLog');

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: resolveAdminId
// ─────────────────────────────────────────────────────────────────────────────
const resolveAdminId = (rawId) =>
  rawId && mongoose.Types.ObjectId.isValid(rawId)
    ? new mongoose.Types.ObjectId(rawId)
    : new mongoose.Types.ObjectId();

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
// HELPER: parseTime
// ─────────────────────────────────────────────────────────────────────────────
const parseTime = (timeStr) => {
  if (typeof timeStr !== 'string') return -1;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return -1;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours > 23 || minutes > 59) return -1;
  return hours * 60 + minutes;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: parseTimeSlot
// ─────────────────────────────────────────────────────────────────────────────
const parseTimeSlot = (timeSlot) => {
  const parts = timeSlot.split('-').map((s) => s.trim());
  if (parts.length !== 2) return null;
  const start = parseTime(parts[0]);
  const end = parseTime(parts[1]);
  if (start === -1 || end === -1 || start >= end) return null;
  return { start, end };
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: checkTimeOverlap
// ─────────────────────────────────────────────────────────────────────────────
const checkTimeOverlap = (timeSlot1, timeSlot2) => {
  const slot1 = parseTimeSlot(timeSlot1);
  const slot2 = parseTimeSlot(timeSlot2);
  if (!slot1 || !slot2) return false;
  return slot1.start < slot2.end && slot2.start < slot1.end;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: parseDateInfo
// ─────────────────────────────────────────────────────────────────────────────
const parseDateInfo = (val) => {
  if (!val) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);
      if (month < 1 || month > 12 || day < 1 || day > 31) return null;
      return {
        year,
        month,
        day,
        dateObj: new Date(Date.UTC(year, month - 1, day, 0, 0, 0)),
        dateStr: `${match[1]}-${match[2]}-${match[3]}`,
        displayStr: `${match[3]}/${match[2]}/${match[1]}`,
      };
    }
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const iso = vnTime.toISOString().slice(0, 10);
  const [year, month, day] = iso.split('-').map(Number);
  return {
    year,
    month,
    day,
    dateObj: new Date(Date.UTC(year, month - 1, day, 0, 0, 0)),
    dateStr: iso,
    displayStr: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: formatToLocalYYYYMMDD
// ─────────────────────────────────────────────────────────────────────────────
const formatToLocalYYYYMMDD = (dateVal) => {
  if (typeof dateVal === 'string') {
    const match = dateVal.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const d = new Date(dateVal);
  const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return vnTime.toISOString().slice(0, 10);
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: checkScheduleConflict
// ─────────────────────────────────────────────────────────────────────────────
const checkScheduleConflict = async (parsedDates, timeSlot, excludeId = null) => {
  const newDateStrings = parsedDates.map(formatToLocalYYYYMMDD);

  const query = excludeId ? { _id: { $ne: excludeId } } : {};
  const allSessions = await ClassSession.find(query)
    .populate('campaignId', 'title')
    .select('classCode timeSlot studyDates campaignId')
    .lean();

  for (const session of allSessions) {
    if (checkTimeOverlap(timeSlot, session.timeSlot)) {
      const existingDateStrings = (session.studyDates || []).map(formatToLocalYYYYMMDD);
      const overlappedDates = newDateStrings.filter((ds) => existingDateStrings.includes(ds));

      if (overlappedDates.length > 0) {
        const fmtDate = (iso) => {
          const [y, m, d] = iso.split('-');
          return `${d}/${m}/${y}`;
        };
        const overlappedFormatted = overlappedDates.map(fmtDate).join(', ');
        const campaignTitle = session.campaignId?.title || '(Khóa học không xác định)';
        const errorMsg = `Trùng lịch với Lớp ${session.classCode} (${campaignTitle}) vào các ngày: ${overlappedFormatted} (Khung giờ: ${session.timeSlot}).`;

        return {
          success: false,
          message: errorMsg,
          conflictWith: {
            classCode: session.classCode,
            campaignTitle,
            timeSlot: session.timeSlot,
            overlappedDates,
          },
        };
      }
    }
  }

  return null;
};

// ══════════════════════════════════════════════════════════════════════════════
// CONTROLLER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// getAllSessions — GET /api/sessions
// ─────────────────────────────────────────────────────────────────────────────
const getAllSessions = async (req, res) => {
  try {
    const { campaignId, isPublic } = req.query;
    let filter = {};

    if (isPublic === 'true') {
      const activeCampaigns = await CourseCampaign.find({ isHidden: { $ne: true } }).select('_id');
      const activeCampaignIds = activeCampaigns.map((c) => c._id);

      if (campaignId) {
        filter = {
          $and: [
            { campaignId },
            { campaignId: { $in: activeCampaignIds } },
            { isHidden: { $ne: true } },
          ],
        };
      } else {
        filter = {
          campaignId: { $in: activeCampaignIds },
          isHidden: { $ne: true },
        };
      }
    } else if (campaignId) {
      filter = { campaignId };
    }

    const sessions = await ClassSession.find(filter)
      .populate('campaignId', 'title months description isHidden')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    return handleServerError(res, 'getAllSessions', error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// createSession — POST /api/sessions
// ─────────────────────────────────────────────────────────────────────────────
const createSession = async (req, res) => {
  try {
    const {
      campaignId,
      campaignMonth,
      classCode,
      studyDates,
      timeSlot,
      maxCapacity,
      isHidden,
    } = req.body;

    if (!campaignId || !campaignMonth || !classCode || !studyDates || !timeSlot || !maxCapacity) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: campaignId, campaignMonth, classCode, studyDates, timeSlot, maxCapacity.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      return res.status(400).json({ success: false, message: 'campaignId không đúng định dạng ObjectId.' });
    }

    if (!/^\d{2}\/\d{4}$/.test(campaignMonth)) {
      return res.status(400).json({ success: false, message: "campaignMonth phải đúng định dạng 'MM/YYYY'." });
    }

    const campaign = await CourseCampaign.findById(campaignId).lean();
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học.' });
    }
    if (!campaign.months.includes(campaignMonth)) {
      return res.status(400).json({
        success: false,
        message: `Tháng '${campaignMonth}' không thuộc khóa học "${campaign.title}". Các tháng hợp lệ: ${campaign.months.join(', ')}.`,
      });
    }

    const dates = Array.isArray(studyDates) ? studyDates : [studyDates];
    const parsedInfos = dates.map(parseDateInfo);

    if (parsedInfos.some((info) => !info)) {
      return res.status(400).json({ success: false, message: 'studyDates chứa giá trị ngày không hợp lệ.' });
    }

    const [targetMonth, targetYear] = campaignMonth.split('/').map(Number);
    const invalidDates = parsedInfos.filter((info) => {
      return info.month !== targetMonth || info.year !== targetYear;
    });
    if (invalidDates.length > 0) {
      const formatted = invalidDates.map((info) => info.displayStr);
      return res.status(400).json({
        success: false,
        message: `Các ngày học sau không thuộc tháng ${campaignMonth}: ${formatted.join(', ')}.`,
      });
    }

    const parsedDates = parsedInfos.map((info) => info.dateObj);

    const parsedSlot = parseTimeSlot(timeSlot);
    if (!parsedSlot) {
      return res.status(400).json({
        success: false,
        message: "timeSlot không hợp lệ. Yêu cầu định dạng 'HH:mm - HH:mm', thời gian bắt đầu < kết thúc.",
      });
    }

    const conflict = await checkScheduleConflict(parsedDates, timeSlot);
    if (conflict) return res.status(400).json(conflict);

    const session = await ClassSession.create({
      campaignId,
      campaignMonth,
      classCode,
      studyDates: parsedDates,
      timeSlot,
      maxCapacity: Number(maxCapacity),
      isHidden: isHidden !== undefined ? Boolean(isHidden) : false,
    });

    const populatedSession = await ClassSession.findById(session._id)
      .populate('campaignId', 'title months description isHidden')
      .lean();

    await AuditLog.create({
      adminId: resolveAdminId(req.body.adminId),
      actionType: 'SESSION_CREATE',
      targetClass: session.classCode,
      metadata: { sessionId: session._id, campaignId: session.campaignId, maxCapacity: session.maxCapacity },
      timestamp: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: `Tạo lớp học "${session.classCode}" thành công.`,
      data: populatedSession || session,
    });
  } catch (error) {
    return handleServerError(res, 'createSession', error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// updateSession — PUT /api/sessions/:id
// ─────────────────────────────────────────────────────────────────────────────
const updateSession = async (req, res) => {
  try {
    const { id: sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'ID lớp học không hợp lệ.' });
    }

    const current = await ClassSession.findById(sessionId);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học.' });
    }

    const { classCode, campaignMonth, studyDates, timeSlot, maxCapacity, status, isHidden } = req.body;
    const updateFields = {};

    const effectiveCampaignMonth = campaignMonth ?? current.campaignMonth;
    if (campaignMonth !== undefined) {
      if (!/^\d{2}\/\d{4}$/.test(campaignMonth)) {
        return res.status(400).json({ success: false, message: "campaignMonth phải đúng định dạng 'MM/YYYY'." });
      }
      const parentCampaign = await CourseCampaign.findById(current.campaignId).lean();
      if (!parentCampaign) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học cha.' });
      }
      if (!parentCampaign.months.includes(campaignMonth)) {
        return res.status(400).json({
          success: false,
          message: `Tháng '${campaignMonth}' không thuộc khóa học "${parentCampaign.title}". Các tháng hợp lệ: ${parentCampaign.months.join(', ')}.`,
        });
      }
      updateFields.campaignMonth = campaignMonth;
    }

    if (maxCapacity !== undefined) {
      const newCap = Number(maxCapacity);

      if (isNaN(newCap) || newCap < 1) {
        return res.status(400).json({ success: false, message: 'maxCapacity phải là số nguyên dương.' });
      }

      if (newCap < current.currentBooked) {
        return res.status(400).json({
          success: false,
          message: `Không thể giảm sĩ số xuống ${newCap} vì đã có ${current.currentBooked} slot được chốt.`,
        });
      }

      updateFields.maxCapacity = newCap;
      updateFields.status = newCap === current.currentBooked ? 'full' : 'open';
    }

    const newTimeSlot = timeSlot ?? current.timeSlot;
    const newStudyDates = studyDates ?? null;

    if (timeSlot !== undefined || studyDates !== undefined) {
      const parsedSlot = parseTimeSlot(newTimeSlot);
      if (!parsedSlot) {
        return res.status(400).json({
          success: false,
          message: "timeSlot không hợp lệ. Yêu cầu định dạng 'HH:mm - HH:mm', thời gian bắt đầu < kết thúc.",
        });
      }

      let parsedDates;
      if (newStudyDates) {
        const arr = Array.isArray(newStudyDates) ? newStudyDates : [newStudyDates];
        const parsedInfos = arr.map(parseDateInfo);
        if (parsedInfos.some((info) => !info)) {
          return res.status(400).json({ success: false, message: 'studyDates chứa giá trị ngày không hợp lệ.' });
        }

        const [tMonth, tYear] = effectiveCampaignMonth.split('/').map(Number);
        const wrongDates = parsedInfos.filter(
          (info) => info.month !== tMonth || info.year !== tYear
        );
        if (wrongDates.length > 0) {
          const formatted = wrongDates.map((info) => info.displayStr);
          return res.status(400).json({
            success: false,
            message: `Các ngày học sau không thuộc tháng ${effectiveCampaignMonth}: ${formatted.join(', ')}.`,
          });
        }

        parsedDates = parsedInfos.map((info) => info.dateObj);
        updateFields.studyDates = parsedDates;
      } else {
        parsedDates = current.studyDates;
      }

      if (timeSlot !== undefined) {
        updateFields.timeSlot = newTimeSlot;
      }

      const conflict = await checkScheduleConflict(
        parsedDates,
        newTimeSlot,
        sessionId
      );
      if (conflict) return res.status(400).json(conflict);
    }

    if (classCode !== undefined) updateFields.classCode = classCode;
    if (isHidden !== undefined) updateFields.isHidden = Boolean(isHidden);
    if (status !== undefined) {
      const validStatuses = ['open', 'full', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: `status phải là một trong: ${validStatuses.join(', ')}.` });
      }
      updateFields.status = status;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ success: false, message: 'Không có trường nào được cập nhật.' });
    }

    const updated = await ClassSession.findByIdAndUpdate(
      sessionId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).populate('campaignId', 'title months description isHidden');

    await AuditLog.create({
      adminId: resolveAdminId(req.body.adminId),
      actionType: 'SESSION_UPDATE',
      targetClass: updated.classCode,
      metadata: { sessionId: updated._id, updatedFields: Object.keys(updateFields) },
      timestamp: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: `Cập nhật lớp học "${updated.classCode}" thành công.`,
      data: updated,
    });
  } catch (error) {
    return handleServerError(res, 'updateSession', error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// deleteSession — DELETE /api/sessions/:id
// ─────────────────────────────────────────────────────────────────────────────
const deleteSession = async (req, res) => {
  try {
    const { id: sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'ID lớp học không hợp lệ.' });
    }

    const deleted = await ClassSession.findByIdAndDelete(sessionId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học.' });
    }

    try {
      await AuditLog.create({
        adminId: resolveAdminId(req.body?.adminId),
        actionType: 'SESSION_DELETE',
        targetClass: deleted.classCode,
        metadata: { sessionId: deleted._id, campaignId: deleted.campaignId },
        timestamp: new Date(),
      });
    } catch (logErr) {
      console.warn('[deleteSession] AuditLog failed (non-critical):', logErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Đã xóa lớp học "${deleted.classCode}" thành công.`,
    });
  } catch (error) {
    return handleServerError(res, 'deleteSession', error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// bookSlot — POST /api/sessions/:id/book
// ─────────────────────────────────────────────────────────────────────────────
const bookSlot = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const { name, phone, depositAmount, remainingAmount, isFullyPaid, paymentNote } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Họ tên học viên là bắt buộc.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Số điện thoại học viên là bắt buộc.' });
    }

    const newStudent = {
      name: name.trim(),
      phone: phone.trim(),
      depositAmount: Number(depositAmount) || 0,
      remainingAmount: Number(remainingAmount) || 0,
      isFullyPaid: Boolean(isFullyPaid),
      paymentNote: (paymentNote ?? '').trim(),
      bookedAt: new Date(),
    };

    const updatedSession = await ClassSession.findOneAndUpdate(
      {
        _id: sessionId,
        status: 'open',
        $expr: { $lt: ['$currentBooked', '$maxCapacity'] },
      },
      {
        $inc: { currentBooked: 1 },
        $push: { students: newStudent },
      },
      { new: true, runValidators: true }
    ).populate('campaignId', 'title months description isHidden');

    if (!updatedSession) {
      return res.status(409).json({
        success: false,
        message: 'Slot đã đầy hoặc lớp học đã đóng. Không thể chốt thêm.',
      });
    }

    if (updatedSession.currentBooked >= updatedSession.maxCapacity) {
      await ClassSession.updateOne({ _id: sessionId }, { $set: { status: 'full' } });
      updatedSession.status = 'full';
    }

    try {
      await AuditLog.create({
        adminId: resolveAdminId(req.body.adminId),
        actionType: 'SESSION_BOOK',
        targetClass: updatedSession.classCode,
        metadata: {
          sessionId: updatedSession._id,
          student: { name: newStudent.name, phone: newStudent.phone },
          currentBooked: updatedSession.currentBooked,
          maxCapacity: updatedSession.maxCapacity,
          newStatus: updatedSession.status,
        },
        timestamp: new Date(),
      });
    } catch (logErr) {
      console.warn('[bookSlot] AuditLog failed (non-critical):', logErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Đã thêm học viên "${newStudent.name}" vào ca ${updatedSession.classCode}.`,
      data: updatedSession,
    });
  } catch (error) {
    return handleServerError(res, 'bookSlot', error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// unbookSlot — POST /api/sessions/:id/unbook
// ─────────────────────────────────────────────────────────────────────────────
const unbookSlot = async (req, res) => {
  try {
    const { id: sessionId } = req.params;

    const updatedSession = await ClassSession.findOneAndUpdate(
      {
        _id: sessionId,
        status: { $ne: 'closed' },
        $expr: { $gt: ['$currentBooked', 0] },
      },
      { $inc: { currentBooked: -1 } },
      { new: true, runValidators: true }
    );

    if (!updatedSession) {
      return res.status(409).json({
        success: false,
        message: 'Không thể hủy slot: lớp học đã đóng hoặc chưa có slot nào được chốt.',
      });
    }

    if (updatedSession.currentBooked < updatedSession.maxCapacity && updatedSession.status === 'full') {
      await ClassSession.updateOne({ _id: sessionId }, { $set: { status: 'open' } });
      updatedSession.status = 'open';
    }

    await AuditLog.create({
      adminId: resolveAdminId(req.body.adminId),
      actionType: 'SESSION_UNBOOK',
      targetClass: updatedSession.classCode,
      metadata: {
        sessionId: updatedSession._id,
        currentBooked: updatedSession.currentBooked,
        maxCapacity: updatedSession.maxCapacity,
        newStatus: updatedSession.status,
      },
      timestamp: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: `Hủy slot thành công cho ca ${updatedSession.classCode}.`,
      data: updatedSession,
    });
  } catch (error) {
    return handleServerError(res, 'unbookSlot', error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// removeStudent — DELETE /api/sessions/:sessionId/students/:studentId
// ─────────────────────────────────────────────────────────────────────────────
const removeStudent = async (req, res) => {
  try {
    const { sessionId, studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'sessionId không hợp lệ.' });
    }
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: 'studentId không hợp lệ.' });
    }

    const updatedSession = await ClassSession.findOneAndUpdate(
      {
        _id: sessionId,
        'students._id': studentId,
        $expr: { $gt: ['$currentBooked', 0] },
      },
      {
        $pull: { students: { _id: studentId } },
        $inc: { currentBooked: -1 },
      },
      { new: true, runValidators: true }
    ).populate('campaignId', 'title months description isHidden');

    if (!updatedSession) {
      const session = await ClassSession.findById(sessionId).lean();
      if (!session) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học.' });
      }
      return res.status(404).json({ success: false, message: 'Không tìm thấy học viên trong lớp học này.' });
    }

    if (updatedSession.currentBooked < updatedSession.maxCapacity && updatedSession.status === 'full') {
      await ClassSession.updateOne({ _id: sessionId }, { $set: { status: 'open' } });
      updatedSession.status = 'open';
    }

    try {
      await AuditLog.create({
        adminId: resolveAdminId(req.body?.adminId),
        actionType: 'SESSION_STUDENT_REMOVE',
        targetClass: updatedSession.classCode,
        metadata: {
          sessionId: updatedSession._id,
          studentId,
          currentBooked: updatedSession.currentBooked,
          newStatus: updatedSession.status,
        },
        timestamp: new Date(),
      });
    } catch (logErr) {
      console.warn('[removeStudent] AuditLog failed (non-critical):', logErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Đã xóa học viên khỏi lớp học.',
      data: updatedSession,
    });
  } catch (error) {
    return handleServerError(res, 'removeStudent', error);
  }
};

module.exports = {
  getAllSessions,
  createSession,
  updateSession,
  deleteSession,
  bookSlot,
  unbookSlot,
  removeStudent,
};
