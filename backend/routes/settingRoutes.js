'use strict';

const express = require('express');
const { getSetting, upsertSetting } = require('../controllers/settingController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/settings/:key (Public)
router.get('/:key', getSetting);

// PUT /api/settings/:key (Protected)
router.put('/:key', verifyToken, upsertSetting);

module.exports = router;
