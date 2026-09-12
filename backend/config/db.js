'use strict';

const mongoose = require('mongoose');

/**
 * Kết nối tới MongoDB Atlas bằng Mongoose.
 *
 * Hàm này được thiết kế để gọi MỘT LẦN DUY NHẤT khi server khởi động.
 * Mongoose sẽ tự duy trì connection pool (mặc định 5 connections) và
 * tự động kết nối lại khi mạng bị gián đoạn.
 *
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    // Đọc MONGO_URI từ biến môi trường (đã được dotenv load trước đó)
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error(
        'MONGO_URI chưa được cấu hình. Kiểm tra lại file .env của bạn.'
      );
    }

    const conn = await mongoose.connect(uri);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Lỗi kết nối MongoDB: ${error.message}`);
    // Thoát process với mã lỗi 1 để Render/PM2 tự restart server
    process.exit(1);
  }
};

module.exports = connectDB;
