'use strict';

// ─────────────────────────────────────────────
// 1. Load biến môi trường từ file .env
//    (Phải gọi TRƯỚC KHI import bất kỳ module nào dùng process.env)
// ─────────────────────────────────────────────
require('dotenv').config();

const express       = require('express');
const cors          = require('cors');

const connectDB      = require('./config/db');
const sessionRoutes  = require('./routes/sessionRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const settingRoutes  = require('./routes/settingRoutes');

// ─────────────────────────────────────────────
// 2. Kết nối MongoDB Atlas
// ─────────────────────────────────────────────
connectDB();

// ─────────────────────────────────────────────
// 3. Khởi tạo ứng dụng Express
// ─────────────────────────────────────────────
const app = express();

// ─────────────────────────────────────────────
// 4. Middleware cơ bản
// ─────────────────────────────────────────────

// Cho phép cross-origin requests (React Web + React Native gọi API)
app.use(cors());

// Parse request body dạng JSON
app.use(express.json());

// ─────────────────────────────────────────────
// 5. Routes
// ─────────────────────────────────────────────

// Health-check endpoint — dùng để kiểm tra server còn sống
// GET /  →  { message: "Emisa Calendar API is running!" }
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Emisa Calendar API is running!' });
});

// ── API Routes ──────────────────────────────────────────
app.use('/api/campaigns', campaignRoutes);
app.use('/api/sessions',  sessionRoutes);
app.use('/api/settings',  settingRoutes);

// TODO: Mount thêm khi phát triển các module khác
// app.use('/api/admins', require('./routes/adminRoutes'));
// app.use('/api/logs',   require('./routes/auditLogRoutes'));

// ─────────────────────────────────────────────
// 6. Khởi động server
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
