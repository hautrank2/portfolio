import { useCallback, useEffect, useState } from 'react';

const money = (n) => `${n.toLocaleString('vi-VN')}đ`;

export default function App() {
  const [items, setItems] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState(null);

  const loadMenu = useCallback(async () => {
    try {
      const res = await fetch('/api/menu/items');
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      setMessage({ type: 'err', text: 'Không tải được menu.' });
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const lines = items
    .map((item) => ({ itemId: item.id, quantity: Number(quantities[item.id] || 0) }))
    .filter((line) => line.quantity > 0);

  const total = lines.reduce((sum, line) => {
    const item = items.find((i) => i.id === line.itemId);
    return sum + (item ? item.price * line.quantity : 0);
  }, 0);

  async function submitOrder(event) {
    event.preventDefault();
    setMessage(null);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, note, lines }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'err', text: data.message || 'Đặt đơn thất bại.' });
        return;
      }

      setMessage({ type: 'ok', text: `Đã đặt đơn, tổng ${money(data.order.total)}.` });
      setQuantities({});
      setNote('');
    } catch (err) {
      setMessage({ type: 'err', text: 'Không gọi được order-api.' });
    }
  }

  return (
    <div className="wrap">
      <h1>Cà phê Nhỏ</h1>
      <p className="muted">Chọn món, để lại tên, và đơn sẽ hiện ở màn hình pha chế.</p>

      {message && <div className={`note ${message.type}`}>{message.text}</div>}

      <form onSubmit={submitOrder}>
        {items.length === 0 && <p className="muted">Chưa có món nào trong menu.</p>}

        {items.map((item) => (
          <div className="card" key={item.id}>
            {item.image ? (
              <img src={`/api/menu/images/${item.image}`} alt={item.name} />
            ) : (
              <img alt="" />
            )}
            <div className="grow">
              <div>{item.name}</div>
              <div className="muted price">{money(item.price)}</div>
            </div>
            <input
              type="number"
              min="0"
              value={quantities[item.id] || ''}
              onChange={(e) =>
                setQuantities({ ...quantities, [item.id]: e.target.value })
              }
            />
          </div>
        ))}

        <div className="row">
          <input
            placeholder="Tên của bạn"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <input
            placeholder="Ghi chú, ví dụ ít đá"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="row">
          <button type="submit" disabled={lines.length === 0 || !customerName}>
            Đặt đơn {total > 0 && `· ${money(total)}`}
          </button>
          <button type="button" onClick={loadMenu}>
            Tải lại menu
          </button>
        </div>
      </form>
    </div>
  );
}
