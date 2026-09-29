# order-api

Nhận đơn từ khách và trả danh sách đơn cho màn hình pha chế. Chỉ ghi vào MongoDB — **không
chạm vào file nào**, nên nó không liên quan gì tới bài toán EFS.

- Nghe cổng `3000` (cố định trong code, không đọc biến `PORT`)
- Biến môi trường: `MONGODB_URI`, `AUTH_ADDRESS` — xem `.env.template`
- Phụ thuộc: MongoDB (đọc `items`, ghi `orders`), auth-api (chỉ cho `GET /orders`)

| Method | Path | Cần token | Ai gọi |
| --- | --- | --- | --- |
| `POST` | `/orders` | **Không** | shop-web — khách đặt đơn |
| `GET` | `/orders` | **Có** | admin-web — màn hình pha chế |
| `GET` | `/orders/health` | Không | bạn, và probe |

Bất đối xứng ở cột "Cần token" là chủ ý: **ai cũng đặt được đơn, nhưng chỉ chủ quán xem
được danh sách đơn.** Đây là hình dạng thật của một quán cà phê, và nó khác mọi thứ bạn đã
dựng ở section 6 và 7 — nơi mọi endpoint đều công khai.

## Model `Order`

Collection `orders`.

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `customerName` | `String` | Bắt buộc |
| `note` | `String` | Mặc định `''` |
| `lines[]` | `itemId`, `name`, `price`, `quantity` | **Chụp lại** tên và giá lúc đặt |
| `total` | `Number` | Bắt buộc, do server tính |
| `status` | `String` | Mặc định `'new'`. Chưa có endpoint nào đổi nó |
| `createdAt` | `Date` | Mặc định `Date.now` |

`lines[]` lưu cả `name` và `price` thay vì chỉ `itemId` — đó không phải trùng lặp dữ liệu
do lười. Đơn hàng là **bản ghi lịch sử**: chủ quán tăng giá cà phê tuần sau thì đơn tuần
này vẫn phải hiện đúng số tiền khách đã trả. Nếu chỉ lưu `itemId` rồi `populate` khi đọc,
mọi đơn cũ sẽ tự đổi giá theo — và không ai phát hiện ra cho tới lúc đối chiếu sổ sách.

---

## `POST /orders`

Công khai, không cần token.

**Request**

```json
{
  "customerName": "Hậu",
  "note": "ít đá",
  "lines": [
    { "itemId": "66f0a1b2c3d4e5f60718293a", "quantity": 2 }
  ]
}
```

Client **chỉ gửi `itemId` và `quantity`**. Không gửi giá, và có gửi thì server cũng bỏ qua:

```js
const item = await Item.findById(line.itemId);   // giá lấy từ database
```

Đây là nguyên tắc đáng mang đi: **giá trị nào ảnh hưởng tới tiền thì lấy từ server, không
lấy từ client.** Nếu tin giá do client gửi, ai cũng mở DevTools và đặt cà phê giá `1đ`.

**Response `201`**

```json
{ "order": { "id": "66f0aabbccddeeff00112233", "total": 50000 } }
```

Chỉ trả `id` và `total` — khách không cần thấy lại toàn bộ đơn.

**Lỗi**

| Mã | `message` | Nguyên nhân |
| --- | --- | --- |
| `422` | `Thiếu tên khách hoặc danh sách món.` | Thiếu `customerName`, hoặc `lines` không phải array, hoặc rỗng |
| `422` | `Không có món <id>.` | `itemId` không tồn tại trong collection `items` |
| `500` | `Không tạo được đơn.` | Lỗi MongoDB, hoặc `itemId` **không đúng định dạng ObjectId** |

Hai dòng cuối dễ lẫn nhau, và cách phân biệt đáng nhớ:

| `itemId` gửi lên | Kết quả |
| --- | --- |
| Đúng định dạng, không có trong DB | `422 Không có món …` |
| Sai định dạng, ví dụ `"abc"` | `500` — `findById` ném lỗi cast trước khi kịp kiểm |

Và một lỗi cấu hình gây ra `422` trông như lỗi dữ liệu:

> `order-api` và `menu-api` **phải trỏ vào cùng một database**. Hai `MONGODB_URI` khác
> nhau — khác host, hay chỉ khác tên db ở cuối chuỗi — thì `POST /orders` luôn trả
> `422 Không có món <id>` dù menu trên trang đang hiện đầy món. Trang web trông hoàn toàn
> bình thường, `menu-api` không có lỗi gì, và `order-api` cũng không.

Kiểm bằng cách so hai biến từ chính hai tiến trình:

```bash
kubectl exec deploy/cafe-menu-deployment -- printenv MONGODB_URI && kubectl exec deploy/cafe-order-deployment -- printenv MONGODB_URI
```

Cùng họ với `AUTH_API_ADDRESS` gõ thiếu chữ và `selector` lệch nhãn: **K8s không kiểm được
thứ nằm bên trong container.**

---

## `GET /orders`

Cần `Authorization: Bearer <token>`. Trả **50 đơn mới nhất**, `createdAt` giảm dần.

**Response `200`**

```json
{
  "orders": [
    {
      "id": "66f0aabbccddeeff00112233",
      "customerName": "Hậu",
      "note": "ít đá",
      "lines": [
        { "itemId": "66f0a1b2…", "name": "Cà phê sữa đá", "price": 25000, "quantity": 2 }
      ],
      "total": 50000,
      "status": "new",
      "createdAt": "2026-09-29T02:11:43.512Z"
    }
  ]
}
```

**Lỗi**

| Mã | `message` | Nguyên nhân |
| --- | --- | --- |
| `401` | `Thiếu token.` | Không có header `Authorization` |
| `401` | `Token không hợp lệ.` | Token sai, hoặc đã quá 8 giờ |
| `500` | `Không đọc được đơn.` | Lỗi MongoDB |
| `503` | `Không kiểm tra được token.` | Không gọi được auth-api — sai `AUTH_ADDRESS`, hoặc auth chết |

`admin-web` bắt riêng `401` và tự đăng xuất, nên triệu chứng bạn thấy trên trang là **bị
đẩy về form đăng nhập** chứ không phải một thông báo lỗi. Gặp chuyện đó thì kiểm `401` hay
`503` bằng tab Network, vì `503` cũng làm trang trông như hỏng nhưng nguyên nhân hoàn toàn
khác.

---

## `GET /orders/health`

```json
{ "status": "ok", "pod": "cafe-order-deployment-5c8b-xyz12" }
```

`pod` là `HOSTNAME` — tên Pod phục vụ request này, tiện để thấy request rơi vào bản nào khi
chạy nhiều `replicas`.

Luôn `200` khi tiến trình còn sống, **kể cả khi MongoDB đã chết**. Một `livenessProbe` trỏ
vào đây sẽ xanh trong lúc `POST /orders` trả `500` — nên đừng coi probe xanh là bằng chứng
service hoạt động đúng.
