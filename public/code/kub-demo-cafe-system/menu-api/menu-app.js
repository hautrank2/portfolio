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
  description: { type: String, default: '' },
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

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  // Chỉ nhận ảnh. Không lọc thì .html/.svg được phục vụ cùng origin với
  // admin-web — nơi token nằm trong localStorage.
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)),
});

// Bọc upload.single để lỗi của multer (file quá 2MB...) trả JSON thay vì
// trang lỗi HTML mặc định của Express.
const uploadImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const tooLarge = err.code === 'LIMIT_FILE_SIZE';
      return res
        .status(tooLarge ? 413 : 422)
        .json({ message: tooLarge ? 'Image is larger than 2MB.' : 'Could not read image.' });
    }
    next();
  });
};

// Xoá file ảnh trên volume. File không còn thì thôi — mục tiêu là nó không
// tồn tại, và nó đã không tồn tại.
const removeImage = async (filename) => {
  if (!filename) return;
  try {
    await fs.promises.unlink(path.join(IMAGE_FOLDER, path.basename(filename)));
  } catch (err) {
    if (err.code !== 'ENOENT') console.log('Không xoá được ảnh:', filename, err.message);
  }
};

// '' và chữ đều không phải giá. Cho phép số thập phân: 2.5 hợp lệ.
const parsePrice = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const toJson = (item) => ({
  id: item.id,
  name: item.name,
  price: item.price,
  description: item.description,
  image: item.image,
  available: item.available,
});

// id sai định dạng thì findById ném CastError → 500. Chặn trước, trả 404.
const findItem = async (id) => (mongoose.isValidObjectId(id) ? Item.findById(id) : null);

const requireAdmin = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: 'Missing token.' });
  }

  const token = header.split(' ')[1];

  try {
    const response = await fetch(`http://${AUTH_ADDRESS}/auth/verify/${token}`);
    if (!response.ok) {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    next();
  } catch (err) {
    console.log('Không gọi được auth-api:', err.message);
    res.status(503).json({ message: 'Could not verify token.' });
  }
};

app.get('/menu/items', async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.status(200).json({ items: items.map(toJson) });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: 'Could not load menu.' });
  }
});

app.post('/menu/items', requireAdmin, uploadImage, async (req, res) => {
  const { name, description } = req.body;
  const price = parsePrice(req.body.price);

  // Multer đã ghi file xuống đĩa trước khi tới đây. Từ chối request thì phải
  // tự dọn, không thì thành file mồ côi.
  const reject = async (message) => {
    await removeImage(req.file && req.file.filename);
    res.status(422).json({ message });
  };

  if (!name || !name.trim()) return reject('Missing name.');
  if (price === null) return reject('Price must be a number ≥ 0.');
  if (!req.file) return reject('Missing image (JPEG, PNG, GIF or WebP).');

  try {
    const item = await new Item({
      name: name.trim(),
      price,
      description: (description || '').trim(),
      image: req.file.filename,
    }).save();

    res.status(201).json({ item: toJson(item) });
  } catch (err) {
    console.log(err.message);
    await removeImage(req.file.filename);
    res.status(500).json({ message: 'Could not save item.' });
  }
});

// Sửa tên, giá, mô tả. JSON, không đụng tới ảnh — ảnh có endpoint riêng.
app.put('/menu/items/:id', requireAdmin, async (req, res) => {
  const { name, description } = req.body || {};
  const price = parsePrice((req.body || {}).price);

  if (!name || !name.trim()) {
    return res.status(422).json({ message: 'Missing name.' });
  }
  if (price === null) {
    return res.status(422).json({ message: 'Price must be a number ≥ 0.' });
  }

  try {
    const item = await findItem(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });

    item.name = name.trim();
    item.price = price;
    item.description = (description || '').trim();
    await item.save();

    res.status(200).json({ item: toJson(item) });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: 'Could not save item.' });
  }
});

// Đổi ảnh: lưu file mới, trỏ bản ghi sang nó, rồi mới xoá file cũ. Làm ngược
// lại mà lưu DB lỗi thì món mất luôn ảnh.
app.put('/menu/items/:id/image', requireAdmin, uploadImage, async (req, res) => {
  if (!req.file) {
    return res.status(422).json({ message: 'Missing image (JPEG, PNG, GIF or WebP).' });
  }

  try {
    const item = await findItem(req.params.id);
    if (!item) {
      await removeImage(req.file.filename);
      return res.status(404).json({ message: 'Item not found.' });
    }

    const oldImage = item.image;
    item.image = req.file.filename;
    await item.save();
    await removeImage(oldImage);

    res.status(200).json({ item: toJson(item) });
  } catch (err) {
    console.log(err.message);
    await removeImage(req.file.filename);
    res.status(500).json({ message: 'Could not change image.' });
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
      res.status(404).json({ message: 'Image not found.' });
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
