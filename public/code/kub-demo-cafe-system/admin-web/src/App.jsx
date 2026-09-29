import { useCallback, useEffect, useState } from 'react';

const money = (n) => `${Number(n).toLocaleString('vi-VN')}đ`;

const when = (iso) =>
  new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const field =
  'w-full rounded-xl border border-bean-200 bg-bean-50 px-3.5 py-2.5 text-sm outline-none transition ' +
  'placeholder:text-bean-400 focus:border-bean-500 focus:ring-2 focus:ring-bean-500/15 ' +
  'dark:border-bean-800 dark:bg-bean-900/40 dark:placeholder:text-bean-600';

const primary =
  'rounded-xl bg-bean-800 px-4 py-2.5 text-sm font-semibold text-bean-50 transition ' +
  'hover:bg-bean-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-bean-800 ' +
  'dark:bg-bean-200 dark:text-bean-900 dark:hover:bg-bean-100 dark:disabled:hover:bg-bean-200';

const ghost =
  'rounded-xl border border-bean-200 px-3 py-2 text-xs font-medium transition ' +
  'hover:border-bean-400 hover:bg-bean-100 disabled:opacity-40 ' +
  'dark:border-bean-800 dark:hover:border-bean-600 dark:hover:bg-bean-900';

function Logo() {
  return (
    <div className="grid size-9 place-items-center rounded-xl bg-bean-800 text-bean-50 dark:bg-bean-200 dark:text-bean-900">
      <svg viewBox="0 0 24 24" fill="none" className="size-5">
        <path
          d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Zm12 1h2a2.5 2.5 0 0 1 0 5h-2M5 21h11"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function Banner({ message }) {
  if (!message) return null;

  return (
    <div
      role="status"
      className={
        'rounded-xl border px-4 py-3 text-sm ' +
        (message.type === 'ok'
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
          : 'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300')
      }
    >
      {message.text}
    </div>
  );
}

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
  const [busy, setBusy] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  function logout() {
    localStorage.removeItem('cafe-token');
    setToken('');
    setOrders([]);
  }

  const loadItems = useCallback(async () => {
    const res = await fetch('/api/menu/items');
    const data = await res.json();
    setItems(data.items || []);
  }, []);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    setLoadingOrders(true);

    try {
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });

      /* 401 nghĩa là auth-api đã trả lời và nói không — token hết 8 giờ.
         503 thì khác hẳn: chưa hỏi được auth-api. Đừng đăng xuất vì 503. */
      if (res.status === 401) {
        setMessage({ type: 'err', text: 'Token hết hạn, đăng nhập lại.' });
        logout();
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'err', text: data.message || 'Không đọc được đơn.' });
        return;
      }

      setOrders(data.orders || []);
    } catch (err) {
      setMessage({ type: 'err', text: 'Không gọi được order-api.' });
    } finally {
      setLoadingOrders(false);
    }
  }, [token]);

  useEffect(() => {
    loadItems();
    loadOrders();
  }, [loadItems, loadOrders]);

  async function login(event) {
    event.preventDefault();
    setMessage(null);
    setBusy(true);

    try {
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
    } catch (err) {
      setMessage({ type: 'err', text: 'Không gọi được auth-api.' });
    } finally {
      setBusy(false);
    }
  }

  async function addItem(event) {
    event.preventDefault();
    setMessage(null);
    setBusy(true);

    /* multipart/form-data — KHÔNG tự đặt Content-Type, để trình duyệt sinh
       boundary. Đặt tay là menu-api không parse được. */
    const body = new FormData();
    body.append('name', name);
    body.append('price', price);
    if (file) body.append('image', file);

    try {
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
    } catch (err) {
      setMessage({ type: 'err', text: 'Không gọi được menu-api.' });
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="grid min-h-dvh place-items-center px-4 font-sans">
        <div className="w-full max-w-sm space-y-5">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="text-base font-semibold tracking-tight">Cafe System · Admin</h1>
              <p className="text-xs text-bean-500 dark:text-bean-400">
                Tài khoản khai bằng biến môi trường của auth-api
              </p>
            </div>
          </div>

          <Banner message={message} />

          <form
            onSubmit={login}
            className="space-y-3 rounded-2xl border border-bean-200 p-5 dark:border-bean-800 dark:bg-bean-900/30"
          >
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-bean-500 dark:text-bean-400">Email</span>
              <input className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-bean-500 dark:text-bean-400">Mật khẩu</span>
              <input
                className={field}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ADMIN_PASSWORD"
              />
            </label>

            <button type="submit" disabled={busy || !password} className={`${primary} w-full`}>
              {busy ? 'Đang kiểm…' : 'Đăng nhập'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh font-sans">
      <header className="sticky top-0 z-20 border-b border-bean-200/70 bg-bean-50/85 backdrop-blur dark:border-bean-800/70 dark:bg-bean-950/85">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3.5">
          <Logo />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold tracking-tight">Cafe System · Admin</h1>
            <p className="truncate text-xs text-bean-500 dark:text-bean-400">{email}</p>
          </div>
          <button type="button" onClick={logout} className={ghost}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <Banner message={message} />

        <div className="grid gap-6 lg:grid-cols-[22rem_1fr] lg:items-start">
          <section className="space-y-3 rounded-2xl border border-bean-200 p-5 lg:sticky lg:top-20 dark:border-bean-800 dark:bg-bean-900/30">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-bean-500 dark:text-bean-400">
              Thêm món
            </h2>

            <form onSubmit={addItem} className="space-y-3">
              <input
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tên món"
              />
              <input
                className={field}
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Giá"
              />

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-bean-300 px-3.5 py-3 text-sm transition hover:border-bean-500 dark:border-bean-700 dark:hover:border-bean-500">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                  className="sr-only"
                />
                {file ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="size-11 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-bean-100 text-bean-400 dark:bg-bean-900 dark:text-bean-600">
                    +
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{file ? file.name : 'Chọn ảnh'}</span>
                  <span className="block text-xs text-bean-500 dark:text-bean-400">
                    {file ? `${(file.size / 1024).toFixed(0)} KB` : 'Không bắt buộc · tối đa 2MB'}
                  </span>
                </span>
              </label>

              <button type="submit" disabled={busy || !name || !price} className={`${primary} w-full`}>
                {busy ? 'Đang lưu…' : 'Thêm món'}
              </button>
            </form>
          </section>

          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-bean-500 dark:text-bean-400">
                  Menu hiện có
                </h2>
                <span className="text-xs text-bean-500 dark:text-bean-400">{items.length} món</span>
              </div>

              {items.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-bean-300 px-6 py-10 text-center text-sm text-bean-500 dark:border-bean-800 dark:text-bean-400">
                  Chưa có món nào.
                </p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-bean-200 p-2.5 dark:border-bean-800 dark:bg-bean-900/30"
                    >
                      {item.image ? (
                        <img
                          src={`/api/menu/images/${item.image}`}
                          alt=""
                          className="size-12 shrink-0 rounded-lg bg-bean-100 object-cover dark:bg-bean-900"
                        />
                      ) : (
                        <span className="size-12 shrink-0 rounded-lg bg-bean-100 dark:bg-bean-900" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-sm text-bean-500 tabular-nums dark:text-bean-400">
                          {money(item.price)}
                        </p>
                      </div>
                      {/* Tên file ảnh: thứ duy nhất database giữ. Không có file
                          tương ứng trên volume thì ảnh bên trên sẽ trống. */}
                      <code className="hidden max-w-28 truncate text-[0.65rem] text-bean-400 sm:block dark:text-bean-600">
                        {item.image || 'chưa có ảnh'}
                      </code>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-bean-500 dark:text-bean-400">
                  Đơn gần đây
                </h2>
                <button type="button" onClick={loadOrders} disabled={loadingOrders} className={ghost}>
                  {loadingOrders ? 'Đang tải…' : 'Tải lại'}
                </button>
              </div>

              {orders.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-bean-300 px-6 py-10 text-center text-sm text-bean-500 dark:border-bean-800 dark:text-bean-400">
                  Chưa có đơn nào.
                </p>
              ) : (
                <ul className="space-y-2">
                  {orders.map((order) => (
                    <li
                      key={order.id}
                      className="rounded-xl border border-bean-200 p-3.5 dark:border-bean-800 dark:bg-bean-900/30"
                    >
                      <div className="flex items-baseline gap-3">
                        <p className="min-w-0 flex-1 truncate text-sm font-medium">
                          {order.customerName}
                        </p>
                        <span className="rounded-full bg-bean-100 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-bean-600 dark:bg-bean-800 dark:text-bean-300">
                          {order.status}
                        </span>
                        <span className="text-sm font-semibold tabular-nums">
                          {money(order.total)}
                        </span>
                      </div>

                      <ul className="mt-2 space-y-0.5 text-sm text-bean-600 dark:text-bean-300">
                        {order.lines.map((l, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="w-6 shrink-0 tabular-nums">{l.quantity}×</span>
                            <span className="min-w-0 flex-1 truncate">{l.name}</span>
                            {/* Giá chụp lại lúc đặt, không đọc lại từ menu. */}
                            <span className="tabular-nums">{money(l.price * l.quantity)}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-2 flex items-baseline gap-3 text-xs text-bean-500 dark:text-bean-400">
                        <span className="min-w-0 flex-1 truncate italic">{order.note || '—'}</span>
                        <span className="shrink-0 tabular-nums">{when(order.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
