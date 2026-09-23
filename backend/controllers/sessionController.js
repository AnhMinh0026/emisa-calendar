'use strict';

const mongoose = require('mongoose');
const ClassSession = require('../models/ClassSession');
const CourseCampaign = require('../models/CourseCampaign');
const AuditLog = require('../models/AuditLog');

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: resolveAdminId
// Trả về ObjectId hợp lệ từ body, hoặc tạo mock ObjectId.
// TODO: Thay bằng req.user._id khi JWT Auth middleware hoàn thiện.
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
//
// Chuyển đổi chuỗi 'HH:mm' thành tổng số phút từ đầu ngày.
// Ví dụ: '07:30' → 450  |  '18:00' → 1080  |  '09:00' → 540
//
// @param   {string} timeStr  Chuỗi thời gian định dạng 'HH:mm'
// @returns {number}          Tổng số phút, hoặc -1 nếu không hợp lệ
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
//
// Tách timeSlot 'HH:mm - HH:mm' thành { start, end } (phút).
// @returns {{ start: number, end: number } | null}  null nếu định dạng sai
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
// HELPER: hasTimeConflict
//
// Kiểm tra xem hai khung giờ có xung đột (kể cả buffer 30 phút) không.
//
// QUY TẮC (1 giáo viên, buffer = 30 phút):
//   Ca mới HỢP LỆ khi và chỉ khi:
//     startNew >= endOld + BUFFER  (ca mới bắt đầu sau khi ca cũ xong + 30p)
//     OR
//     endNew   <= startOld - BUFFER (ca mới kết thúc trước khi ca cũ bắt đầu - 30p)
//
// @returns {boolean} true nếu có xung đột
// ─────────────────────────────────────────────────────────────────────────────
const BUFFER_MINUTES = 30;

const hasTimeConflict = (startNew, endNew, startOld, endOld) => {
  const isValid =
    startNew >= endOld + BUFFER_MINUTES ||
    endNew <= startOld - BUFFER_MINUTES;
  return !isValid;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: checkScheduleConflict
//
// Tái sử dụng logic kiểm tra xung đột cho cả createSession và updateSession.
//
// @param {string}   campaignId    - ID khóa học
// @param {Date[]}   parsedDates   - Mảng ngày đã parse
// @param {number}   startNew      - Phút bắt đầu ca cần kiểm tra
// @param {number}   endNew        - Phút kết thúc ca cần kiểm tra
// @param {string}   [excludeId]   - sessionId cần bỏ qua (dùng khi update)
// @param {string}   timeSlot      - Chuỗi timeSlot gốc (cho message lỗi)
// @returns {object|null} Trả về object lỗi nếu có xung đột, null nếu không
// ─────────────────────────────────────────────────────────────────────────────
const checkScheduleConflict = async (campaignId, parsedDates, startNew, endNew, timeSlot, excludeId = null) => {
  const filter = {
    campaignId,
    studyDates: { $elemMatch: { $in: parsedDates } },
  };

  // Khi update: bỏ qua chính ca đang được sửa để không tự xung đột với mình
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const candidates = await ClassSession.find(filter).lean();

  for (const existing of candidates) {
    const parsed = parseTimeSlot(existing.timeSlot);
    if (!parsed) continue; // Dữ liệu cũ không chuẩn → bỏ qua

    if (hasTimeConflict(startNew, endNew, parsed.start, parsed.end)) {
      return {
        success: false,
        message: `Xung đột lịch! Lớp học (${timeSlot}) không đảm bảo buffer ${BUFFER_MINUTES} phút với lớp học "${existing.classCode}" (${existing.timeSlot}) diễn ra cùng ngày.`,
        conflictWith: {
          classCode: existing.classCode,
          timeSlot: existing.timeSlot,
          studyDates: existing.studyDates,
        },
      };
    }
  }

  return null; // Không có xung đột
};

// ══════════════════════════════════════════════════════════════════════════════
// CONTROLLER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// getAllSessions — GET /api/sessions
// Lấy toàn bộ lớp học, populate thông tin Campaign.
// ─────────────────────────────────────────────────────────────────────────────
const getAllSessions = async (req, res) => {
  try {
    const { campaignId } = req.query;
    const filter = campaignId ? { campaignId } : {};

    const sessions = await ClassSession.find(filter)
      .populate('campaignId', 'title months description') // Populate Campaign (months thay month)
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
// Tạo một lớp học mới thuộc một CourseCampaign.
//
// LOGIC CHỐNG TRÙNG LỊCH NÂNG CAO (SRS 4.1 — 1 giáo viên, buffer 30 phút):
//   Bước 1: Query DB lấy tất cả ca đã có bất kỳ ngày trùng với studyDates mới.
//   Bước 2: Với từng ca tìm được, parse timeSlot ra phút rồi chạy thuật toán:
//     Ca mới hợp lệ khi: startNew >= endOld + 30  OR  endNew <= startOld - 30
//   Nếu vi phạm → 400 Bad Request kèm thông tin ca bị xung đột.
// ─────────────────────────────────────────────────────────────────────────────
const createSession = async (req, res) => {
  try {
    const { campaignId, campaignMonth, classCode, studyDates, timeSlot, maxCapacity } = req.body;

    // ── Validate đầu vào cơ bản ────────────────────────────────────────────
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

    // ── Validate campaignMonth có trong Campaign.months không ──────────────
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
    const parsedDates = dates.map((d) => new Date(d));

    if (parsedDates.some((d) => isNaN(d.getTime()))) {
      return res.status(400).json({ success: false, message: 'studyDates chứa giá trị ngày không hợp lệ.' });
    }

    // ── Validate tất cả studyDates phải thuộc campaignMonth ────────────────
    const [targetMonth, targetYear] = campaignMonth.split('/').map(Number);
    const invalidDates = parsedDates.filter((d) => {
      return d.getMonth() + 1 !== targetMonth || d.getFullYear() !== targetYear;
    });
    if (invalidDates.length > 0) {
      const formatted = invalidDates.map((d) =>
        `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
      );
      return res.status(400).json({
        success: false,
        message: `Các ngày học sau không thuộc tháng ${campaignMonth}: ${formatted.join(', ')}.`,
      });
    }

    // ── Validate và parse timeSlot ─────────────────────────────────────────
    const parsedSlot = parseTimeSlot(timeSlot);
    if (!parsedSlot) {
      return res.status(400).json({
        success: false,
        message: "timeSlot không hợp lệ. Yêu cầu định dạng 'HH:mm - HH:mm', thời gian bắt đầu < kết thúc.",
      });
    }

    // ── Kiểm tra xung đột lịch (SRS 4.1) ─────────────────────────────────
    const conflict = await checkScheduleConflict(
      campaignId, parsedDates, parsedSlot.start, parsedSlot.end, timeSlot
    );
    if (conflict) return res.status(400).json(conflict);

    // ── Tạo lớp học ────────────────────────────────────────────────────────
    const session = await ClassSession.create({
      campaignId,
      campaignMonth,
      classCode,
      studyDates: parsedDates,
      timeSlot,
      maxCapacity: Number(maxCapacity),
    });

    // ── Ghi AuditLog ──────────────────────────────────────────────────────
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
      data: session,
    });
  } catch (error) {
    return handleServerError(res, 'createSession', error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// updateSession — PUT /api/sessions/:id
//
// Cập nhật thông tin lớp học với các ràng buộc logic:
//
//   • Nếu cập nhật maxCapacity:
//       - Bắt buộc maxCapacity mới >= currentBooked hiện tại
//       - Tự động cập nhật status: bằng → 'full', lớn hơn → 'open'
//
//   • Nếu cập nhật timeSlot hoặc studyDates:
//       - Tái sử dụng thuật toán kiểm tra buffer 30 phút
//       - Thêm { _id: { $ne: sessionId } } để bỏ qua chính ca đang sửa
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

    const { classCode, campaignMonth, studyDates, timeSlot, maxCapacity, status } = req.body;
    const updateFields = {};

    // ── Validate campaignMonth nếu được cập nhật ──────────────────────────
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

    // ── Ràng buộc maxCapacity ─────────────────────────────────────────────
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
      // Tự động cập nhật status theo sức chứa mới
      updateFields.status = newCap === current.currentBooked ? 'full' : 'open';
    }

    // ── Ràng buộc timeSlot / studyDates ──────────────────────────────────
    const newTimeSlot = timeSlot ?? current.timeSlot;
    const newStudyDates = studyDates ?? null;

    if (timeSlot !== undefined || studyDates !== undefined) {
      // Parse và validate timeSlot (dùng giá trị mới hoặc giữ nguyên)
      const parsedSlot = parseTimeSlot(newTimeSlot);
      if (!parsedSlot) {
        return res.status(400).json({
          success: false,
          message: "timeSlot không hợp lệ. Yêu cầu định dạng 'HH:mm - HH:mm', thời gian bắt đầu < kết thúc.",
        });
      }

      // Parse studyDates (dùng giá trị mới nếu có, hoặc giữ nguyên từ DB)
      let parsedDates;
      if (newStudyDates) {
        const arr = Array.isArray(newStudyDates) ? newStudyDates : [newStudyDates];
        parsedDates = arr.map((d) => new Date(d));
        if (parsedDates.some((d) => isNaN(d.getTime()))) {
          return res.status(400).json({ success: false, message: 'studyDates chứa giá trị ngày không hợp lệ.' });
        }

        // Validate tất cả ngày mới phải thuộc effectiveCampaignMonth
        const [tMonth, tYear] = effectiveCampaignMonth.split('/').map(Number);
        const wrongDates = parsedDates.filter(
          (d) => d.getMonth() + 1 !== tMonth || d.getFullYear() !== tYear
        );
        if (wrongDates.length > 0) {
          const formatted = wrongDates.map((d) =>
            `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
          );
          return res.status(400).json({
            success: false,
            message: `Các ngày học sau không thuộc tháng ${effectiveCampaignMonth}: ${formatted.join(', ')}.`,
          });
        }

        updateFields.studyDates = parsedDates;
      } else {
        parsedDates = current.studyDates;
      }

      if (timeSlot !== undefined) {
        updateFields.timeSlot = newTimeSlot;
      }

      // Kiểm tra xung đột, BỎ QUA chính ca đang sửa ({ _id: { $ne: sessionId } })
      const conflict = await checkScheduleConflict(
        current.campaignId.toString(),
        parsedDates,
        parsedSlot.start,
        parsedSlot.end,
        newTimeSlot,
        sessionId  // ← excludeId: loại trừ bản thân
      );
      if (conflict) return res.status(400).json(conflict);
    }

    // ── Các trường cập nhật đơn giản ──────────────────────────────────────
    if (classCode !== undefined) updateFields.classCode = classCode;
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
    ).populate('campaignId', 'title months');

    // ── Ghi AuditLog ──────────────────────────────────────────────────────
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
// Xóa một lớp học.
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

    // ── Ghi AuditLog (tách riêng — lỗi log KHÔNG làm fail response) ───────
    // req.body có thể undefined khi DELETE không gửi Content-Type body
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
//
// Chốt 1 slot trong một lớp học.
//
// LUỒNG XỬ LÝ ATOMIC (chống Race Condition — SRS 4.2):
//   Thay vì find() → check → save() (2 round-trips, không an toàn),
//   ta dùng MỘT lệnh findOneAndUpdate() duy nhất với:
//     • Filter nguyên tử: status='open' + $expr đảm bảo currentBooked < maxCapacity
//     • $inc: { currentBooked: 1 } tăng đồng thời, an toàn 100%
//   MongoDB đảm bảo chỉ một request thắng nếu nhiều Admin gọi cùng lúc.
// ─────────────────────────────────────────────────────────────────────────────
const bookSlot = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const { name, phone, depositAmount, remainingAmount, isFullyPaid, paymentNote } = req.body;

    // ── Bước 1: Validate dữ liệu học viên ────────────────────────────────
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

    // ── Bước 2: Atomic update — $push học viên + $inc currentBooked ───────
    // Một lệnh duy nhất, đảm bảo nguyên tử: chỉ thành công khi status='open'
    // VÀ currentBooked < maxCapacity (atomic guard qua $expr).
    const updatedSession = await ClassSession.findOneAndUpdate(
      {
        _id: sessionId,
        status: 'open',
        $expr: { $lt: ['$currentBooked', '$maxCapacity'] }, // Điều kiện nguyên tử
      },
      {
        $inc: { currentBooked: 1 },       // Tăng sĩ số nguyên tử
        $push: { students: newStudent },   // Thêm học viên vào danh sách
      },
      { new: true, runValidators: true }
    ).populate('campaignId', 'title months'); // Populate để Frontend không bị vỡ data

    // ── Bước 3: Kiểm tra kết quả ──────────────────────────────────────────
    // null → không document nào thỏa filter → ca đã đầy HOẶC đã đóng
    if (!updatedSession) {
      return res.status(409).json({
        success: false,
        message: 'Slot đã đầy hoặc lớp học đã đóng. Không thể chốt thêm.',
      });
    }

    // ── Bước 4: Tự động chuyển status → 'full' nếu vừa đạt maxCapacity ───
    if (updatedSession.currentBooked >= updatedSession.maxCapacity) {
      await ClassSession.updateOne({ _id: sessionId }, { $set: { status: 'full' } });
      updatedSession.status = 'full';
    }

    // ── Bước 5: Ghi AuditLog ─────────────────────────────────────────────
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

    // TODO: Emit Socket.io event để broadcast real-time cho tất cả client
    // io.emit('session_updated', updatedSession);

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
//
// Hủy 1 slot đã được chốt.
//
// LUỒNG XỬ LÝ ATOMIC:
//   Dùng $inc: { currentBooked: -1 } kết hợp điều kiện nguyên tử
//   $expr: { $gt: ['$currentBooked', 0] } để đảm bảo không giảm xuống âm.
//   Sau khi giảm: nếu currentBooked < maxCapacity → tự động đổi status về 'open'.
// ─────────────────────────────────────────────────────────────────────────────
const unbookSlot = async (req, res) => {
  try {
    const { id: sessionId } = req.params;

    // ── Bước 1: Atomic decrease ───────────────────────────────────────────
    // Guard: status không phải 'closed' VÀ currentBooked > 0
    const updatedSession = await ClassSession.findOneAndUpdate(
      {
        _id: sessionId,
        status: { $ne: 'closed' },                          // Không cho unbook ca đã đóng
        $expr: { $gt: ['$currentBooked', 0] },             // Điều kiện nguyên tử: > 0
      },
      { $inc: { currentBooked: -1 } },
      { new: true, runValidators: true }
    );

    // ── Bước 2: Kiểm tra kết quả ──────────────────────────────────────────
    if (!updatedSession) {
      return res.status(409).json({
        success: false,
        message: 'Không thể hủy slot: lớp học đã đóng hoặc chưa có slot nào được chốt.',
      });
    }

    // ── Bước 3: Tự động chuyển status → 'open' nếu còn chỗ trống ─────────
    if (updatedSession.currentBooked < updatedSession.maxCapacity && updatedSession.status === 'full') {
      await ClassSession.updateOne({ _id: sessionId }, { $set: { status: 'open' } });
      updatedSession.status = 'open';
    }

    // ── Bước 4: Ghi AuditLog ─────────────────────────────────────────────
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

    // TODO: Emit Socket.io event để broadcast real-time
    // io.emit('session_updated', updatedSession);

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
//
// Xóa một học viên khỏi danh sách đăng ký của ca học.
//
// LUỒNG XỬ LÝ ATOMIC:
//   Dùng $pull để xóa sub-document khỏi mảng students VÀ $inc: { currentBooked: -1 }
//   trong cùng một lệnh findOneAndUpdate() để đảm bảo nguyên tử.
//   Guard: currentBooked > 0 để không giảm xuống âm.
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

    // ── Atomic: $pull học viên + $inc currentBooked ────────────────────────
    const updatedSession = await ClassSession.findOneAndUpdate(
      {
        _id: sessionId,
        'students._id': studentId,           // Đảm bảo học viên tồn tại
        $expr: { $gt: ['$currentBooked', 0] }, // Guard: không giảm xuống âm
      },
      {
        $pull: { students: { _id: studentId } }, // Xóa học viên khỏi mảng
        $inc: { currentBooked: -1 },              // Giảm sĩ số nguyên tử
      },
      { new: true, runValidators: true }
    ).populate('campaignId', 'title months');

    if (!updatedSession) {
      // Có thể học viên không tồn tại hoặc currentBooked đã = 0
      const session = await ClassSession.findById(sessionId).lean();
      if (!session) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học.' });
      }
      return res.status(404).json({ success: false, message: 'Không tìm thấy học viên trong lớp học này.' });
    }

    // ── Tự động chuyển status → 'open' nếu vừa mở chỗ trống ──────────────
    if (updatedSession.currentBooked < updatedSession.maxCapacity && updatedSession.status === 'full') {
      await ClassSession.updateOne({ _id: sessionId }, { $set: { status: 'open' } });
      updatedSession.status = 'open';
    }

    // ── Ghi AuditLog ──────────────────────────────────────────────────────
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
