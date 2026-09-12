'use strict';

const express = require('express');
const router = express.Router();

const {
  createCampaign,
  getAllCampaigns,
  updateCampaign,
  deleteCampaign,
} = require('../controllers/campaignController');

// GET    /api/campaigns      → Lấy danh sách tất cả khóa học
router.get('/', getAllCampaigns);

// POST   /api/campaigns      → Tạo khóa học mới
router.post('/', createCampaign);

// PUT    /api/campaigns/:id  → Cập nhật khóa học
router.put('/:id', updateCampaign);

// DELETE /api/campaigns/:id  → Xóa khóa học (bị chặn nếu còn lớp học liên kết)
router.delete('/:id', deleteCampaign);

module.exports = router;
