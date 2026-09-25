'use strict';

const jwt = require('jsonwebtoken');

/**
 * POST /api/auth/login
 * Đăng nhập quản trị viên dựa trên thông tin trong .env
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.',
      });
    }

    const envUsername = process.env.ADMIN_USERNAME;
    const envPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret_emisa';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    if (username !== envUsername || password !== envPassword) {
      return res.status(401).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
      });
    }

    // Tạo JWT token
    const token = jwt.sign(
      {
        username,
        role: 'admin',
      },
      jwtSecret,
      { expiresIn }
    );

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công.',
      token,
      user: {
        username,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi máy chủ trong quá trình đăng nhập.',
    });
  }
};

module.exports = {
  login,
};
