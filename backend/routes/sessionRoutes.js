'use strict';

const express = require('express');
const router = express.Router();

const {
  getAllSessions,
  createSession,
  updateSession,
  deleteSession,
  bookSlot,
  unbookSlot,
  removeStudent,
} = require('../controllers/sessionController');

// GET    /api/sessions           → Lấy danh sách lớp học (có populate Campaign)
//                                  Query param: ?campaignId=<id> để lọc theo kỳ
router.get('/', getAllSessions);

// POST   /api/sessions           → Tạo lớp học mới (chống trùng lịch + buffer 30p)
router.post('/', createSession);

// PUT    /api/sessions/:id       → Cập nhật lớp học (ràng buộc maxCapacity + lịch)
router.put('/:id', updateSession);

// DELETE /api/sessions/:id       → Xóa lớp học
router.delete('/:id', deleteSession);

// POST   /api/sessions/:id/book  → Chốt 1 slot (atomic, chống race condition SRS 4.2)
// TODO: Thêm authMiddleware khi Auth module hoàn thiện:
//   router.post('/:id/book', authMiddleware, bookSlot);
router.post('/:id/book', bookSlot);

// POST   /api/sessions/:id/unbook → Hủy 1 slot (atomic $inc -1, tự đổi status)
router.post('/:id/unbook', unbookSlot);

// DELETE /api/sessions/:sessionId/students/:studentId → Xóa học viên khỏi lớp
// Dùng $pull học viên + $inc currentBooked -1 trong cùng một lệnh atomic.
router.delete('/:sessionId/students/:studentId', removeStudent);

module.exports = router;
