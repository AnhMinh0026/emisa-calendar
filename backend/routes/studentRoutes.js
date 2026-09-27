'use strict';

const express = require('express');
const router = express.Router();

const {
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
} = require('../controllers/studentController');
const { verifyToken } = require('../middleware/authMiddleware');

// Tất cả các route quản lý học viên đều cần xác thực Admin qua verifyToken
router.get('/', verifyToken, getAllStudents);
router.post('/', verifyToken, createStudent);
router.put('/:id', verifyToken, updateStudent);
router.delete('/:id', verifyToken, deleteStudent);

module.exports = router;
