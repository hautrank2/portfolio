const http = require('http');

const express = require('express');
const mongoose = require('mongoose');
const { WebSocketServer } = require('ws');

const MONGODB_URI = process.env.MONGODB_URI;
const AUTH_ADDRESS = process.env.AUTH_ADDRESS;

// Đơn chỉ có hai trạng thái: 'new' lúc đặt, và 'received' (quán đã nhận) sau
// chừng này thời gian — giả lập quầy pha chế bấm nhận đơn.
const RECEIVE_AFTER_MS = 10 * 1000;

const app = express();
app.use(express.json());

// WebSocket dùng chung cổng 3000 với Express: cùng một http.Server, chỉ khác
// path. Nhờ vậy Service và Deployment không phải khai thêm cổng nào.
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/orders/ws' });

// Chỉ gửi id và status — socket này công khai, khách nào cũng nối được, nên
// không được lộ tên khách hay ghi chú. admin-web muốn chi tiết thì gọi
// GET /orders có token.
const broadcast = (event) => {
  const data = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) client.send(data);
  }
};

// Ping mỗi 30 giây. Hai việc: dọn socket đã chết mà không báo close, và giữ
// kết nối có dữ liệu chạy qua — nginx (proxy_read_timeout) và load balancer
// của AWS đều cắt kết nối im lặng quá 60 giây.
wss.on('connection', (socket) => {
  socket.isAlive = true;
  socket.on('pong', () => {
    socket.isAlive = true;
  });
});

setInterval(() => {
  for (const socket of wss.clients) {
    if (!socket.isAlive) {
      socket.terminate();
      continue;
    }
    socket.isAlive = false;
    socket.ping();
  }
}, 30 * 1000);

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

// Hẹn giờ chuyển đơn sang 'received'. Điều kiện status: 'new' làm cho việc này
// chạy lại bao nhiêu lần cũng được — đơn đã received thì không ai broadcast nữa.
//
// Hẹn giờ nằm trong bộ nhớ của Pod. Pod chết thì mất — nên lúc khởi động có
// resumePendingOrders() bên dưới để nhặt lại các đơn còn 'new'.
const scheduleReceived = (orderId, delay) => {
  setTimeout(async () => {
    try {
      const result = await Order.updateOne({ _id: orderId, status: 'new' }, { status: 'received' });
      if (result.modifiedCount === 1) {
        broadcast({ type: 'order', id: String(orderId), status: 'received' });
      }
    } catch (err) {
      console.log('Không đổi được trạng thái đơn:', orderId, err.message);
    }
  }, Math.max(0, delay));
};

const resumePendingOrders = async () => {
  const pending = await Order.find({ status: 'new' }, { createdAt: 1 });
  for (const order of pending) {
    scheduleReceived(order._id, order.createdAt.getTime() + RECEIVE_AFTER_MS - Date.now());
  }
  if (pending.length) console.log(`Hẹn giờ lại cho ${pending.length} đơn còn 'new'`);
};

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

app.post('/orders', async (req, res) => {
  const { customerName, note, lines } = req.body || {};

  if (!customerName || !Array.isArray(lines) || lines.length === 0) {
    return res.status(422).json({ message: 'Missing customer name or item list.' });
  }

  try {
    // Giá lấy từ database, không lấy từ client. Client chỉ gửi itemId và số lượng.
    const resolved = [];
    for (const line of lines) {
      const item = await Item.findById(line.itemId);
      if (!item) {
        return res.status(422).json({ message: `Item ${line.itemId} not found.` });
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

    broadcast({ type: 'order', id: order.id, status: order.status });
    scheduleReceived(order._id, RECEIVE_AFTER_MS);

    res.status(201).json({ order: { id: order.id, total: order.total, status: order.status } });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: 'Could not create order.' });
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
    res.status(500).json({ message: 'Could not load orders.' });
  }
});

app.get('/orders/health', (req, res) => {
  res.status(200).json({ status: 'ok', pod: process.env.HOSTNAME });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('order-api đã nối được MongoDB');
    return resumePendingOrders();
  })
  .catch((err) => console.log('KHÔNG NỐI ĐƯỢC MONGODB:', err.message));

// server.listen chứ không phải app.listen: app.listen tự tạo một http.Server
// khác, và WebSocket gắn vào `server` sẽ không bao giờ nhận được kết nối.
server.listen(3000, () => console.log('order-api nghe cổng 3000'));
