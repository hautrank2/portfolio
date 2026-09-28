import { useCallback, useEffect, useState } from 'react';

const money = (n) => `${Number(n).toLocaleString('vi-VN')}đ`;

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('cafe-token') || '');
  const [email, setEmail] = useState('admin@cafe.local');
  const [password, setPassword] = useState('');
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState(null);

  const loadItems = useCallback(async () => {
    const res = await fetch('/api/menu/items');
    const data = await res.json();
    setItems(data.items || []);
  }, []);

  const loadOrders = useCallback(async () => {
    if (!token) return;

    const res = await fetch('/api/orders', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      setMessage({ type: 'err', text: 'Token hết hạn, đăng nhập lại.' });
      logout();
      return;
    }

    const data = await res.json();
    setOrders(data.orders || []);
  }, [token]);

  useEffect(() => {
    loadItems();
    loadOrders();
  }, [loadItems, loadOrders]);

  function logout() {
    localStorage.removeItem('cafe-token');
    setToken('');
    setOrders([]);
  }

  async function login(event) {
    event.preventDefault();
    setMessage(null);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setMessage({ type: 'err', text: data.message || 'Đăng nhập thất bại.' });
      return;
    }

    localStorage.setItem('cafe-token', data.token);
    setToken(data.token);
    setPassword('');
  }

  async function addItem(event) {
    event.preventDefault();
    setMessage(null);

    const body = new FormData();
    body.append('name', name);
    body.append('price', price);
    if (file) body.append('image', file);

    const res = await fetch('/api/menu/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    const data = await res.json();

    if (!res.ok) {
      setMessage({ type: 'err', text: data.message || 'Thêm món thất bại.' });
      return;
    }

    setMessage({ type: 'ok', text: `Đã thêm ${data.item.name}.` });
    setName('');
    setPrice('');
    setFile(null);
    event.target.reset();
    loadItems();
  }

  if (!token) {
    return (
      <div className="wrap">
        <h1>Quản trị · Cà phê Nhỏ</h1>
        <p className="muted">Đăng nhập bằng tài khoản khai trong auth-api.</p>

        {message && <div className={`note ${message.type}`}>{message.text}</div>}

        <form onSubmit={login} className="card">
          <div className="row">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
            />
            <button type="submit">Đăng nhập</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="row">
        <h1 className="grow">Quản trị · Cà phê Nhỏ</h1>
        <button className="ghost" onClick={logout}>
          Đăng xuất
        </button>
      </div>

      {message && <div className={`note ${message.type}`}>{message.text}</div>}

      <h2>Thêm món</h2>
      <form onSubmit={addItem} className="card">
        <div className="row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên món" />
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Giá"
          />
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
          <button type="submit" disabled={!name || !price}>
            Thêm
          </button>
        </div>
      </form>

      <h2>Menu hiện có</h2>
      {items.map((item) => (
        <div className="card item" key={item.id}>
          {item.image ? <img src={`/api/menu/images/${item.image}`} alt={item.name} /> : <img alt="" />}
          <div className="grow">
            <div>{item.name}</div>
            <div className="muted">{money(item.price)}</div>
          </div>
          <div className="muted">{item.image || 'chưa có ảnh'}</div>
        </div>
      ))}

      <h2>
        Đơn gần đây <button className="ghost" onClick={loadOrders}>Tải lại</button>
      </h2>
      <table>
        <thead>
          <tr>
            <th>Khách</th>
            <th>Món</th>
            <th>Tổng</th>
            <th>Lúc</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                {order.customerName}
                {order.note && <div className="muted">{order.note}</div>}
              </td>
              <td>
                {order.lines.map((l) => `${l.name} x${l.quantity}`).join(', ')}
              </td>
              <td>{money(order.total)}</td>
              <td className="muted">{new Date(order.createdAt).toLocaleString('vi-VN')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
