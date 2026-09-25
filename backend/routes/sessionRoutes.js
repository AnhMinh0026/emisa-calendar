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
const { verifyToken } = require('../middleware/authMiddleware');

// GET    /api/sessions           → Lấy danh sách lớp học (Public)
router.get('/', getAllSessions);

// POST   /api/sessions           → Tạo lớp học mới (Protected)
router.post('/', verifyToken, createSession);

// PUT    /api/sessions/:id       → Cập nhật lớp học (Protected)
router.put('/:id', verifyToken, updateSession);

// DELETE /api/sessions/:id       → Xóa lớp học (Protected)
router.delete('/:id', verifyToken, deleteSession);

// POST   /api/sessions/:id/book  → Chốt 1 slot (Protected)
router.post('/:id/book', verifyToken, bookSlot);

// POST   /api/sessions/:id/unbook → Hủy 1 slot (Protected)
router.post('/:id/unbook', verifyToken, unbookSlot);

// DELETE /api/sessions/:sessionId/students/:studentId → Xóa học viên khỏi lớp (Protected)
router.delete('/:sessionId/students/:studentId', verifyToken, removeStudent);

module.exports = router;
