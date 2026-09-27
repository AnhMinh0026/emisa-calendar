'use strict';

const mongoose = require('mongoose');
const ClassSession = require('../models/ClassSession');
const AuditLog = require('../models/AuditLog');

const resolveAdminId = (adminId) => {
  if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
    return new mongoose.Types.ObjectId(adminId);
  }
  return new mongoose.Types.ObjectId();
};

const handleServerError = (res, fnName, error) => {
  console.error(`[${fnName}] Error:`, error);
  return res.status(500).json({
    success: false,
    message: 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau.',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};

/**
 * getAllStudents — GET /api/students
 * Lấy toàn bộ danh sách học viên từ tất cả các lớp học.
 */
const getAllStudents = async (req, res) => {
  try {
    const sessions = await ClassSession.find()
      .populate('campaignId', 'title months')
      .sort({ createdAt: -1 })
      .lean();

    const allStudents = [];

    sessions.forEach((session) => {
      (session.students || []).forEach((st) => {
        allStudents.push({
          _id: st._id,
          name: st.name,
          phone: st.phone,
          depositAmount: st.depositAmount ?? 0,
          remainingAmount: st.remainingAmount ?? 0,
          isFullyPaid: Boolean(st.isFullyPaid),
          paymentNote: st.paymentNote ?? '',
          bookedAt: st.bookedAt,
          sessionId: session._id,
          classCode: session.classCode,
          campaignId: session.campaignId?._id,
          campaignTitle: session.campaignId?.title || '—',
          campaignMonth: session.campaignMonth,
          timeSlot: session.timeSlot,
        });
      });
    });

    // Sắp xếp học viên mới nhất lên đầu
    allStudents.sort((a, b) => new Date(b.bookedAt || 0) - new Date(a.bookedAt || 0));

    return res.status(200).json({
      success: true,
      count: allStudents.length,
      data: allStudents,
    });
  } catch (error) {
    return handleServerError(res, 'getAllStudents', error);
  }
};

/**
 * createStudent — POST /api/students
 * Thêm một học viên vào một lớp học cụ thể.
 */
const createStudent = async (req, res) => {
  try {
    const { sessionId, name, phone, depositAmount, remainingAmount, isFullyPaid, paymentNote } = req.body;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn lớp học hợp lệ.' });
    }
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
    ).populate('campaignId', 'title months');

    if (!updatedSession) {
      return res.status(409).json({
        success: false,
        message: 'Lớp học đã đầy hoặc đã đóng. Không thể thêm học viên.',
      });
    }

    if (updatedSession.currentBooked >= updatedSession.maxCapacity) {
      await ClassSession.updateOne({ _id: sessionId }, { $set: { status: 'full' } });
    }

    try {
      await AuditLog.create({
        adminId: resolveAdminId(req.body?.adminId),
        actionType: 'STUDENT_CREATE',
        targetClass: updatedSession.classCode,
        metadata: {
          sessionId: updatedSession._id,
          studentName: newStudent.name,
          studentPhone: newStudent.phone,
        },
        timestamp: new Date(),
      });
    } catch (logErr) {
      console.warn('[createStudent] AuditLog failed (non-critical):', logErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `Đã thêm học viên "${newStudent.name}" vào lớp ${updatedSession.classCode}.`,
      data: newStudent,
    });
  } catch (error) {
    return handleServerError(res, 'createStudent', error);
  }
};

/**
 * updateStudent — PUT /api/students/:id
 * Cập nhật thông tin học viên (hỗ trợ chuyển lớp nếu sessionId thay đổi).
 */
const updateStudent = async (req, res) => {
  try {
    const { id: studentId } = req.params;
    const { sessionId, name, phone, depositAmount, remainingAmount, isFullyPaid, paymentNote } = req.body;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: 'ID học viên không hợp lệ.' });
    }

    // Tìm lớp học hiện tại chứa học viên này
    const currentSession = await ClassSession.findOne({ 'students._id': studentId });
    if (!currentSession) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy học viên.' });
    }

    const currentStudentObj = currentSession.students.find((s) => s._id.toString() === studentId);
    const targetSessionId = sessionId || currentSession._id.toString();

    // Trường hợp 1: Chuyển sang lớp khác
    if (targetSessionId !== currentSession._id.toString()) {
      if (!mongoose.Types.ObjectId.isValid(targetSessionId)) {
        return res.status(400).json({ success: false, message: 'Lớp học mới không hợp lệ.' });
      }

      // Xóa khỏi lớp cũ
      await ClassSession.updateOne(
        { _id: currentSession._id },
        {
          $pull: { students: { _id: studentId } },
          $inc: { currentBooked: -1 },
        }
      );
      if (currentSession.status === 'full') {
        await ClassSession.updateOne({ _id: currentSession._id }, { $set: { status: 'open' } });
      }

      // Thêm vào lớp mới
      const updatedStudent = {
        _id: currentStudentObj._id,
        name: name !== undefined ? name.trim() : currentStudentObj.name,
        phone: phone !== undefined ? phone.trim() : currentStudentObj.phone,
        depositAmount: depositAmount !== undefined ? Number(depositAmount) : currentStudentObj.depositAmount,
        remainingAmount: remainingAmount !== undefined ? Number(remainingAmount) : currentStudentObj.remainingAmount,
        isFullyPaid: isFullyPaid !== undefined ? Boolean(isFullyPaid) : currentStudentObj.isFullyPaid,
        paymentNote: paymentNote !== undefined ? paymentNote.trim() : currentStudentObj.paymentNote,
        bookedAt: currentStudentObj.bookedAt,
      };

      const newSession = await ClassSession.findOneAndUpdate(
        {
          _id: targetSessionId,
          status: 'open',
          $expr: { $lt: ['$currentBooked', '$maxCapacity'] },
        },
        {
          $inc: { currentBooked: 1 },
          $push: { students: updatedStudent },
        },
        { new: true }
      );

      if (!newSession) {
        // Rollback lại vào lớp cũ nếu lớp mới bị đầy
        await ClassSession.updateOne(
          { _id: currentSession._id },
          {
            $push: { students: currentStudentObj },
            $inc: { currentBooked: 1 },
          }
        );
        return res.status(409).json({ success: false, message: 'Lớp học chuyển tới đã đầy hoặc đã đóng.' });
      }

      if (newSession.currentBooked >= newSession.maxCapacity) {
        await ClassSession.updateOne({ _id: targetSessionId }, { $set: { status: 'full' } });
      }

      return res.status(200).json({
        success: true,
        message: 'Đã cập nhật và chuyển lớp học viên thành công.',
      });
    }

    // Trường hợp 2: Cập nhật thông tin trong cùng lớp
    await ClassSession.updateOne(
      { 'students._id': studentId },
      {
        $set: {
          'students.$.name': name ? name.trim() : currentStudentObj.name,
          'students.$.phone': phone ? phone.trim() : currentStudentObj.phone,
          'students.$.depositAmount': depositAmount !== undefined ? Number(depositAmount) : currentStudentObj.depositAmount,
          'students.$.remainingAmount': remainingAmount !== undefined ? Number(remainingAmount) : currentStudentObj.remainingAmount,
          'students.$.isFullyPaid': isFullyPaid !== undefined ? Boolean(isFullyPaid) : currentStudentObj.isFullyPaid,
          'students.$.paymentNote': paymentNote !== undefined ? paymentNote.trim() : currentStudentObj.paymentNote,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Đã cập nhật thông tin học viên thành công.',
    });
  } catch (error) {
    return handleServerError(res, 'updateStudent', error);
  }
};

/**
 * deleteStudent — DELETE /api/students/:id
 * Xóa một học viên khỏi hệ thống (tự động giảm sĩ số lớp).
 */
const deleteStudent = async (req, res) => {
  try {
    const { id: studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: 'ID học viên không hợp lệ.' });
    }

    const session = await ClassSession.findOneAndUpdate(
      { 'students._id': studentId },
      {
        $pull: { students: { _id: studentId } },
        $inc: { currentBooked: -1 },
      },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy học viên để xóa.' });
    }

    if (session.currentBooked < session.maxCapacity && session.status === 'full') {
      await ClassSession.updateOne({ _id: session._id }, { $set: { status: 'open' } });
    }

    try {
      await AuditLog.create({
        adminId: resolveAdminId(req.body?.adminId),
        actionType: 'STUDENT_DELETE',
        targetClass: session.classCode,
        metadata: { sessionId: session._id, studentId },
        timestamp: new Date(),
      });
    } catch (logErr) {
      console.warn('[deleteStudent] AuditLog failed (non-critical):', logErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Đã xóa học viên thành công.',
    });
  } catch (error) {
    return handleServerError(res, 'deleteStudent', error);
  }
};

module.exports = {
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
};
