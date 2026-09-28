const path = require('path');
const fs = require('fs');

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');

const MONGODB_URI = process.env.MONGODB_URI;
const AUTH_ADDRESS = process.env.AUTH_ADDRESS;
// Thư mục này là chỗ EFS được mount vào. Đổi mountPath trong Deployment thì
// phải đổi biến này theo — không có gì kiểm giúp bạn.
const IMAGE_FOLDER = process.env.MENU_IMAGE_FOLDER || '/app/data/images';

fs.mkdirSync(IMAGE_FOLDER, { recursive: true });

const app = express();
app.use(express.json());

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String },
  available: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const Item = mongoose.model('Item', itemSchema);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, IMAGE_FOLDER),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '-');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

const requireAdmin = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: 'Thiếu token.' });
  }

  const token = header.split(' ')[1];

  try {
    const response = await fetch(`http://${AUTH_ADDRESS}/auth/verify/${token}`);
    if (!response.ok) {
      return res.status(401).json({ message: 'Token không hợp lệ.' });
    }
    next();
  } catch (err) {
    console.log('Không gọi được auth-api:', err.message);
    res.status(503).json({ message: 'Không kiểm tra được token.' });
  }
};

app.get('/menu/items', async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.status(200).json({
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        image: i.image,
        available: i.available,
      })),
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: 'Không đọc được menu.' });
  }
});

app.post('/menu/items', requireAdmin, upload.single('image'), async (req, res) => {
  const { name, price } = req.body;

  if (!name || !price) {
    return res.status(422).json({ message: 'Thiếu tên hoặc giá.' });
  }

  try {
    const item = await new Item({
      name,
      price: Number(price),
      image: req.file ? req.file.filename : null,
    }).save();

    res.status(201).json({
      item: { id: item.id, name: item.name, price: item.price, image: item.image },
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: 'Không lưu được món.' });
  }
});

// Ảnh đọc thẳng từ thư mục được mount, không qua database.
app.get('/menu/images/:file', (req, res) => {
  const filePath = path.join(IMAGE_FOLDER, path.basename(req.params.file));

  res.sendFile(filePath, (err) => {
    if (err) {
      // Pod này không có file đó. Nếu chạy nhiều bản mà không dùng
      // ReadWriteMany, đây là lỗi bạn sẽ gặp.
      console.log('Không đọc được ảnh:', filePath);
      res.status(404).json({ message: 'Không tìm thấy ảnh.' });
    }
  });
});

// Trả về tên Pod đang phục vụ, để thấy request rơi vào bản nào.
app.get('/menu/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    pod: process.env.HOSTNAME,
    images: fs.readdirSync(IMAGE_FOLDER).length,
  });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('menu-api đã nối được MongoDB'))
  .catch((err) => console.log('KHÔNG NỐI ĐƯỢC MONGODB:', err.message));

app.listen(3000, () => console.log('menu-api nghe cổng 3000'));
