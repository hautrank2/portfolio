const express = require('express');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const AUTH_ADDRESS = process.env.AUTH_ADDRESS;

const app = express();
app.use(express.json());

// Cùng collection `items` mà menu-api ghi vào. order-api chỉ đọc, để lấy
// tên và giá tại thời điểm đặt.
const Item = mongoose.model(
  'Item',
  new mongoose.Schema({ name: String, price: Number }),
  'items'
);

const orderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  note: { type: String, default: '' },
  lines: [
    {
      itemId: String,
      name: String,
      price: Number,
      quantity: Number,
    },
  ],
  total: { type: Number, required: true },
  status: { type: String, default: 'new' },
  createdAt: { type: Date, default: Date.now },
});

const Order = mongoose.model('Order', orderSchema);

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

app.post('/orders', async (req, res) => {
  const { customerName, note, lines } = req.body || {};

  if (!customerName || !Array.isArray(lines) || lines.length === 0) {
    return res.status(422).json({ message: 'Thiếu tên khách hoặc danh sách món.' });
  }

  try {
    // Giá lấy từ database, không lấy từ client. Client chỉ gửi itemId và số lượng.
    const resolved = [];
    for (const line of lines) {
      const item = await Item.findById(line.itemId);
      if (!item) {
        return res.status(422).json({ message: `Không có món ${line.itemId}.` });
      }
      resolved.push({
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: Number(line.quantity) || 1,
      });
    }

    const total = resolved.reduce((sum, l) => sum + l.price * l.quantity, 0);

    const order = await new Order({
      customerName,
      note: note || '',
      lines: resolved,
      total,
    }).save();

    res.status(201).json({ order: { id: order.id, total: order.total } });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: 'Không tạo được đơn.' });
  }
});

app.get('/orders', requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(50);
    res.status(200).json({
      orders: orders.map((o) => ({
        id: o.id,
        customerName: o.customerName,
        note: o.note,
        lines: o.lines,
        total: o.total,
        status: o.status,
        createdAt: o.createdAt,
      })),
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: 'Không đọc được đơn.' });
  }
});

app.get('/orders/health', (req, res) => {
  res.status(200).json({ status: 'ok', pod: process.env.HOSTNAME });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('order-api đã nối được MongoDB'))
  .catch((err) => console.log('KHÔNG NỐI ĐƯỢC MONGODB:', err.message));

app.listen(3000, () => console.log('order-api nghe cổng 3000'));
