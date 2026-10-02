import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const money = (n) => `${Number(n).toLocaleString('en-US')} ₫`;

/* Ảnh trả về từ menu-api có thể không tồn tại: database chỉ giữ TÊN file, còn
   file thì nằm trên volume. Hai thứ đó lệch nhau được, nên luôn cần fallback. */
function ItemImage({ item }) {
  const [broken, setBroken] = useState(false);

  if (!item.image || broken) {
    return (
      <div className="flex aspect-4/3 w-full items-center justify-center bg-bean-100 dark:bg-bean-900">
        <svg viewBox="0 0 24 24" fill="none" className="size-9 text-bean-300 dark:text-bean-700">
          <path
            d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Zm12 1h2a2.5 2.5 0 0 1 0 5h-2M5 21h11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={`/api/menu/images/${item.image}`}
      alt={item.name}
      onError={() => setBroken(true)}
      className="aspect-4/3 w-full bg-bean-100 object-cover dark:bg-bean-900"
    />
  );
}

/* Nối WebSocket của order-api và gọi onEvent cho mỗi sự kiện { type, id, status }.
   Rớt kết nối thì tự nối lại sau 2 giây. */
function useOrderEvents(onEvent, enabled = true) {
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    if (!enabled) return undefined;

    let socket;
    let retry;
    let stopped = false;

    const connect = () => {
      // Cùng host với trang, qua nginx (hoặc proxy của Vite) như mọi /api/* khác.
      const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
      socket = new WebSocket(`${scheme}://${window.location.host}/api/orders/ws`);
      socket.onmessage = (e) => {
        let event;
        try {
          event = JSON.parse(e.data);
        } catch {
          return;
        }
        handler.current(event);
      };
      socket.onclose = () => {
        if (!stopped) retry = setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(retry);
      socket.close();
    };
  }, [enabled]);
}

function Stepper({ value, onChange }) {
  const btn =
    'grid size-9 shrink-0 place-items-center rounded-lg border border-bean-200 text-lg leading-none transition ' +
    'hover:border-bean-400 hover:bg-bean-100 disabled:opacity-35 disabled:hover:bg-transparent ' +
    'dark:border-bean-800 dark:hover:border-bean-600 dark:hover:bg-bean-900';

  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= 0} aria-label="Decrease">
        −
      </button>
      <input
        type="number"
        min="0"
        value={value || 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 w-12 rounded-lg border border-bean-200 bg-transparent text-center text-sm font-medium tabular-nums outline-none focus:border-bean-500 dark:border-bean-800"
      />
      <button type="button" className={btn} onClick={() => onChange(value + 1)} aria-label="Increase">
        +
      </button>
    </div>
  );
}

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState(null);
  const [sending, setSending] = useState(false);
  const [placed, setPlaced] = useState([]);

  useOrderEvents((event) => {
    if (event.type !== 'order') return;
    // Socket phát sự kiện của MỌI đơn — chỉ giữ những đơn mình đã đặt.
    setPlaced((prev) => prev.map((o) => (o.id === event.id ? { ...o, status: event.status } : o)));
  });

  const loadMenu = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/menu/items');
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      setMessage({ type: 'err', text: 'Could not load the menu.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  /* Client chỉ gửi itemId và quantity. Giá do order-api lấy từ database —
     con số dưới đây chỉ để hiển thị, không phải để tin. */
  const lines = useMemo(
    () =>
      items
        .map((item) => ({ item, quantity: Number(quantities[item.id] || 0) }))
        .filter((line) => line.quantity > 0),
    [items, quantities]
  );

  const total = lines.reduce((sum, l) => sum + l.item.price * l.quantity, 0);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const canSubmit = lines.length > 0 && customerName.trim().length > 0 && !sending;

  function setQuantity(id, value) {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, value) }));
  }

  async function submitOrder(event) {
    event.preventDefault();
    setMessage(null);
    setSending(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          note,
          lines: lines.map((l) => ({ itemId: l.item.id, quantity: l.quantity })),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'err', text: data.message || 'Could not place order.' });
        return;
      }

      setMessage({ type: 'ok', text: `Order placed, total ${money(data.order.total)}.` });
      setPlaced((prev) => [
        { id: data.order.id, total: data.order.total, status: data.order.status || 'new', customerName },
        ...prev,
      ]);
      setQuantities({});
      setNote('');
    } catch (err) {
      setMessage({ type: 'err', text: 'Could not reach order-api.' });
    } finally {
      setSending(false);
    }
  }

  const field =
    'w-full rounded-xl border border-bean-200 bg-bean-50 px-3.5 py-2.5 text-sm outline-none transition ' +
    'placeholder:text-bean-400 focus:border-bean-500 focus:ring-2 focus:ring-bean-500/15 ' +
    'dark:border-bean-800 dark:bg-bean-900/40 dark:placeholder:text-bean-600';

  return (
    <div className="min-h-dvh font-sans">
      <header className="sticky top-0 z-20 border-b border-bean-200/70 bg-bean-50/85 backdrop-blur dark:border-bean-800/70 dark:bg-bean-950/85">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3.5">
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
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold tracking-tight">Cafe System</h1>
            <p className="truncate text-xs text-bean-500 dark:text-bean-400">
              Pick your drinks, leave your name — your order goes straight to the bar
            </p>
          </div>
          <button
            type="button"
            onClick={loadMenu}
            className="rounded-xl border border-bean-200 px-3 py-2 text-xs font-medium transition hover:border-bean-400 hover:bg-bean-100 dark:border-bean-800 dark:hover:border-bean-600 dark:hover:bg-bean-900"
          >
            Reload
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 lg:pb-10">
        {message && (
          <div
            role="status"
            className={
              'mb-5 rounded-xl border px-4 py-3 text-sm ' +
              (message.type === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300')
            }
          >
            {message.text}
          </div>
        )}

        {/* Đơn khách đã đặt trong phiên này. Trạng thái do WebSocket đẩy về. */}
        {placed.length > 0 && (
          <section className="mb-5 space-y-2 rounded-2xl border border-bean-200 p-4 dark:border-bean-800 dark:bg-bean-900/30">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-bean-500 dark:text-bean-400">
              Your orders
            </h2>
            <ul className="space-y-1.5">
              {placed.map((order) => (
                <li key={order.id} className="flex items-center gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {order.customerName} · <span className="tabular-nums">{money(order.total)}</span>
                  </span>
                  <span
                    className={
                      'rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                      (order.status === 'received'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-bean-100 text-bean-600 dark:bg-bean-800 dark:text-bean-300')
                    }
                  >
                    {order.status === 'received' ? 'Received' : 'New'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <form onSubmit={submitOrder} className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-bean-500 dark:text-bean-400">
              Menu
            </h2>

            {loading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse overflow-hidden rounded-2xl border border-bean-200 dark:border-bean-800"
                  >
                    <div className="aspect-4/3 bg-bean-100 dark:bg-bean-900" />
                    <div className="space-y-2 p-3">
                      <div className="h-3 w-3/4 rounded bg-bean-100 dark:bg-bean-900" />
                      <div className="h-3 w-1/3 rounded bg-bean-100 dark:bg-bean-900" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-bean-300 px-6 py-14 text-center dark:border-bean-800">
                <p className="text-sm font-medium">The menu is empty</p>
                <p className="mx-auto mt-1 max-w-xs text-xs text-bean-500 dark:text-bean-400">
                  Open the admin page, add the first item, then press Reload.
                </p>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {items.map((item) => {
                  const quantity = Number(quantities[item.id] || 0);

                  return (
                    <li
                      key={item.id}
                      className={
                        'overflow-hidden rounded-2xl border bg-bean-50 transition dark:bg-bean-900/30 ' +
                        (quantity > 0
                          ? 'border-bean-500 ring-2 ring-bean-500/15'
                          : 'border-bean-200 hover:border-bean-300 dark:border-bean-800 dark:hover:border-bean-700')
                      }
                    >
                      <ItemImage item={item} />
                      <div className="space-y-2.5 p-3">
                        <div>
                          <p className="text-sm font-medium leading-snug">{item.name}</p>
                          {item.description && (
                            <p className="line-clamp-2 text-xs text-bean-500 dark:text-bean-400">
                              {item.description}
                            </p>
                          )}
                          <p className="text-sm text-bean-500 tabular-nums dark:text-bean-400">
                            {money(item.price)}
                          </p>
                        </div>
                        <Stepper value={quantity} onChange={(v) => setQuantity(item.id, v)} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Trên màn hình rộng: cột phải dính theo. Trên điện thoại: thanh dưới đáy. */}
          <aside className="fixed inset-x-0 bottom-0 z-20 border-t border-bean-200 bg-bean-50/95 backdrop-blur lg:sticky lg:top-20 lg:rounded-2xl lg:border lg:bg-bean-50 lg:backdrop-blur-none dark:border-bean-800 dark:bg-bean-950/95 lg:dark:bg-bean-900/30">
            <div className="mx-auto max-w-6xl space-y-3 p-4">
              <div className="hidden items-baseline justify-between lg:flex">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-bean-500 dark:text-bean-400">
                  Your order
                </h2>
                <span className="text-xs text-bean-500 dark:text-bean-400">{count} {count === 1 ? 'item' : 'items'}</span>
              </div>

              {lines.length > 0 && (
                <ul className="hidden max-h-56 space-y-1.5 overflow-y-auto text-sm lg:block">
                  {lines.map((l) => (
                    <li key={l.item.id} className="flex gap-2">
                      <span className="w-6 shrink-0 text-bean-500 tabular-nums dark:text-bean-400">
                        {l.quantity}×
                      </span>
                      <span className="min-w-0 flex-1 truncate">{l.item.name}</span>
                      <span className="tabular-nums">{money(l.item.price * l.quantity)}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <input
                  className={field}
                  placeholder="Your name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <input
                  className={field}
                  placeholder="Note, e.g. less ice"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="flex w-full items-center justify-between gap-3 rounded-xl bg-bean-800 px-4 py-3 text-sm font-semibold text-bean-50 transition hover:bg-bean-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-bean-800 dark:bg-bean-200 dark:text-bean-900 dark:hover:bg-bean-100 dark:disabled:hover:bg-bean-200"
              >
                <span>{sending ? 'Sending…' : 'Place order'}</span>
                <span className="tabular-nums">{money(total)}</span>
              </button>

              {/* Nói rõ vì sao nút đang tắt, thay vì để người dùng tự đoán. */}
              {!canSubmit && !sending && (
                <p className="text-center text-xs text-bean-500 dark:text-bean-400">
                  {lines.length === 0 ? 'Pick at least one item' : 'Enter your name'}
                </p>
              )}
            </div>
          </aside>
        </form>
      </main>
    </div>
  );
}
