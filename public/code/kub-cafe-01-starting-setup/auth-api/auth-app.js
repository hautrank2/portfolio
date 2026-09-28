const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const TOKEN_KEY = process.env.TOKEN_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Chỉ một tài khoản admin, khai bằng biến môi trường. Đủ cho lab, và giữ
// auth-api ở đúng vai trò của nó: ký token và kiểm token, không giữ dữ liệu.
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(422).json({ message: 'Thiếu email hoặc mật khẩu.' });
  }

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Sai email hoặc mật khẩu.' });
  }

  const token = jwt.sign({ email, role: 'admin' }, TOKEN_KEY, {
    expiresIn: '8h',
  });

  res.status(200).json({ token, email });
});

app.get('/auth/verify/:token', (req, res) => {
  try {
    const payload = jwt.verify(req.params.token, TOKEN_KEY);
    res.status(200).json({ email: payload.email, role: payload.role });
  } catch (err) {
    res.status(401).json({ message: 'Token không hợp lệ.' });
  }
});

app.get('/auth/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(3000, () => console.log('auth-api nghe cổng 3000'));
