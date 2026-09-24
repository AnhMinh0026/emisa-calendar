'use strict';

const express = require('express');
const { getSetting, upsertSetting } = require('../controllers/settingController');

const router = express.Router();

// GET /api/settings/:key
router.get('/:key', getSetting);

// PUT /api/settings/:key
router.put('/:key', upsertSetting);

module.exports = router;
