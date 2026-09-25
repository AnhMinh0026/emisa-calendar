'use strict';

const express = require('express');
const router = express.Router();

const {
  createCampaign,
  getAllCampaigns,
  updateCampaign,
  deleteCampaign,
} = require('../controllers/campaignController');
const { verifyToken } = require('../middleware/authMiddleware');

// GET    /api/campaigns      → Lấy danh sách tất cả khóa học (Public)
router.get('/', getAllCampaigns);

// POST   /api/campaigns      → Tạo khóa học mới (Protected)
router.post('/', verifyToken, createCampaign);

// PUT    /api/campaigns/:id  → Cập nhật khóa học (Protected)
router.put('/:id', verifyToken, updateCampaign);

// DELETE /api/campaigns/:id  → Xóa khóa học (Protected)
router.delete('/:id', verifyToken, deleteCampaign);

module.exports = router;
