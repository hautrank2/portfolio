# menu-api

Quản lý **món trong menu** và **ảnh của món**. Đây là service duy nhất ghi vào cả hai loại
lưu trữ: metadata vào MongoDB, file ảnh vào một thư mục trên đĩa.

- Nghe cổng `3000` (cố định trong code, không đọc biến `PORT`)
- Biến môi trường: `MONGODB_URI`, `AUTH_ADDRESS`, `MENU_IMAGE_FOLDER` — xem `.env.template`
- Phụ thuộc: MongoDB (collection `items`), auth-api, và một thư mục ghi được

| Method | Path | Cần token | Ai gọi |
| --- | --- | --- | --- |
| `GET` | `/menu/items` | Không | shop-web, admin-web |
| `POST` | `/menu/items` | **Có** | admin-web |
| `PUT` | `/menu/items/:id` | **Có** | admin-web (nút Edit) |
| `PUT` | `/menu/items/:id/image` | **Có** | admin-web (nút Change image) |
| `GET` | `/menu/images/:file` | Không | thẻ `<img>` của cả hai frontend |
| `GET` | `/menu/health` | Không | bạn, và probe |

## Model `Item`

Collection `items`. `order-api` cũng **đọc** collection này để lấy tên và giá lúc đặt đơn.

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `name` | `String` | Bắt buộc |
| `price` | `Number` | Bắt buộc, `≥ 0`, được có phần thập phân (`2.5`) |
| `description` | `String` | Mặc định `''`. Mô tả ngắn hiện dưới tên món |
| `image` | `String` | **Tên file**, không phải đường dẫn, không phải nội dung ảnh. Món tạo mới bắt buộc có ảnh; món cũ có thể thiếu |
| `available` | `Boolean` | Mặc định `true`. Chưa có endpoint nào đổi nó |
| `createdAt` | `Date` | Mặc định `Date.now`, dùng để sắp xếp mới nhất trước |

Trường `image` là chỗ đáng chú ý nhất của cả dự án: **database chỉ giữ tên file, còn file
thì nằm trên đĩa.** Hai thứ này có thể lệch nhau, và không có ràng buộc nào ngăn:

| Tình huống | Kết quả |
| --- | --- |
| Có bản ghi, không có file | `GET /menu/images/...` trả `404`, ảnh hỏng trên trang |
| Có file, không có bản ghi | File nằm đó chiếm chỗ, không ai thấy |

Code cố giữ hai thứ khớp nhau: request `POST` bị từ chối thì xoá file multer vừa ghi; đổi
ảnh thì xoá file cũ. Nhưng vẫn không có transaction nào bọc cả
MongoDB lẫn đĩa — tiến trình chết giữa chừng thì vẫn lệch được.

---

## `GET /menu/items`

**Response `200`**

```json
{
  "items": [
    {
      "id": "66f0a1b2c3d4e5f60718293a",
      "name": "Cà phê sữa đá",
      "price": 25000,
      "description": "Phin truyền thống, sữa đặc",
      "image": "1727500000000-ca-phe-sua.jpg",
      "available": true
    }
  ]
}
```

Sắp xếp `createdAt` giảm dần. **Không phân trang** — trả về toàn bộ menu.

Menu rỗng trả `{"items": []}` kèm `200`, không phải `404`. Frontend dựa vào đó để hiện
*"Chưa có món nào"*.

**Lỗi**

| Mã | `message` | Nguyên nhân |
| --- | --- | --- |
| `500` | `Could not load menu.` | Không nối được MongoDB, hoặc `MONGODB_URI` sai |

---

## `POST /menu/items`

Thêm một món, **bắt buộc kèm ảnh**. Cùng với `PUT /menu/items/:id/image`, đây là hai endpoint
duy nhất trong cả hệ nhận `multipart`.

**Request** — `multipart/form-data`, **không phải JSON**:

| Field | Bắt buộc | |
| --- | --- | --- |
| `name` | Có | |
| `price` | Có | Gửi dạng chuỗi, code tự `Number()`. Phải là số `≥ 0`, cho phép `2.5` |
| `description` | Không | Bỏ trống thì lưu `''` |
| `image` | **Có** | JPEG, PNG, GIF hoặc WebP, **tối đa 2MB**. Loại khác bị bỏ qua như không gửi |

Header `Authorization: Bearer <token>`.

```bash
curl -i -X POST http://localhost:8213/menu/items \
  -H "Authorization: Bearer $TOKEN" \
  -F 'name=Cà phê sữa đá' \
  -F 'price=25000' \
  -F 'description=Phin truyền thống, sữa đặc' \
  -F 'image=@ca-phe-sua.jpg'
```

Để ý: **không có `-H 'Content-Type: …'`**. Cứ thêm vào là hỏng, vì `curl` cần tự sinh
`boundary` cho `multipart`. Cùng lý do, đừng dùng `-d` chung với `-F`.

**Response `201`**

```json
{
  "item": {
    "id": "66f0a1b2c3d4e5f60718293a",
    "name": "Cà phê sữa đá",
    "price": 25000,
    "description": "Phin truyền thống, sữa đặc",
    "image": "1727500000000-ca-phe-sua.jpg",
    "available": true
  }
}
```

Tên file được sinh lại: `Date.now()` + tên gốc đã lọc ký tự (chỉ giữ `a-zA-Z0-9.-`). Nên
tên tiếng Việt có dấu sẽ thành một dãy `-`, và hai người tải cùng tên file không ghi đè
nhau.

**Lỗi**

| Mã | `message` | Nguyên nhân |
| --- | --- | --- |
| `401` | `Missing token.` | Không có header `Authorization` |
| `401` | `Invalid token.` | auth-api trả về không-`ok` |
| `413` | `Image is larger than 2MB.` | File > 2MB |
| `422` | `Missing name.` | `name` rỗng |
| `422` | `Price must be a number ≥ 0.` | `price` rỗng, không phải số, hoặc âm |
| `422` | `Missing image (JPEG, PNG, GIF or WebP).` | Không gửi `image`, hoặc file không phải ảnh |
| `422` | `Could not read image.` | Multer lỗi khi ghi — thường là `MENU_IMAGE_FOLDER` không ghi được |
| `500` | `Could not save item.` | Lỗi MongoDB |
| `503` | `Could not verify token.` | **Không gọi được auth-api** — sai `AUTH_ADDRESS`, hoặc auth chết |

Mọi request `422`/`500` đều xoá file multer đã kịp ghi xuống đĩa, nên không để lại file mồ côi.

Phân biệt `401` với `503` là kỹ năng đáng giữ: `401` nghĩa là *auth-api đã trả lời và nói
không*; `503` nghĩa là *chưa hỏi được ai cả*. Hai lỗi này sửa ở hai chỗ khác nhau.

Còn `Could not read image.` là lỗi khó nhất trong nhóm, vì thông báo không nói gì về quyền
ghi. Khi mount volume vào `MENU_IMAGE_FOLDER`, nếu thư mục thuộc `root` mà container chạy
bằng user khác thì mọi upload đều hỏng. Kiểm từ trong Pod:

```bash
kubectl exec deploy/cafe-menu-deployment -- sh -c 'touch /app/data/images/probe && echo ghi-duoc'
```

---

## `PUT /menu/items/:id`

Sửa tên, giá, mô tả. **JSON**, không đụng tới ảnh — đổi ảnh dùng endpoint riêng bên dưới.

```bash
curl -i -X PUT http://localhost:8213/menu/items/66f0a1b2c3d4e5f60718293a \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name": "Cà phê sữa đá", "price": 27000, "description": "Thêm sữa"}'
```

Gửi **đủ cả ba** trường: `description` thiếu thì được lưu thành `''`.

**Response `200`** — `{ "item": { ... } }`, cùng dạng với `POST`.

**Lỗi**

| Mã | `message` | Nguyên nhân |
| --- | --- | --- |
| `401` / `503` | | Như `POST /menu/items` |
| `404` | `Item not found.` | Không có món với `id` này, hoặc `id` không đúng định dạng ObjectId |
| `422` | `Missing name.` | `name` rỗng |
| `422` | `Price must be a number ≥ 0.` | `price` rỗng, không phải số, hoặc âm |
| `500` | `Could not save item.` | Lỗi MongoDB |

Đổi giá **không** làm thay đổi đơn cũ: order-api đã chụp lại giá vào đơn lúc đặt.

---

## `PUT /menu/items/:id/image`

Thay ảnh của một món. `multipart/form-data`, một field `image` (cùng quy tắc với `POST`).

```bash
curl -i -X PUT http://localhost:8213/menu/items/66f0a1b2c3d4e5f60718293a/image \
  -H "Authorization: Bearer $TOKEN" \
  -F 'image=@ca-phe-sua-moi.jpg'
```

Thứ tự làm: ghi file mới → trỏ bản ghi sang file mới → **xoá file cũ**. Lưu DB lỗi thì xoá
file mới và giữ nguyên ảnh cũ — món không bao giờ bị mất ảnh giữa chừng.

**Response `200`** — `{ "item": { ... } }` với `image` là tên file mới.

**Lỗi**

| Mã | `message` | Nguyên nhân |
| --- | --- | --- |
| `401` / `503` | | Như `POST /menu/items` |
| `404` | `Item not found.` | Không có món với `id` này |
| `413` | `Image is larger than 2MB.` | File > 2MB |
| `422` | `Missing image (JPEG, PNG, GIF or WebP).` | Không gửi `image`, hoặc file không phải ảnh |
| `500` | `Could not change image.` | Lỗi MongoDB |

---

## `GET /menu/images/:file`

Trả file ảnh thẳng từ `MENU_IMAGE_FOLDER`, **không qua database**. Đường dẫn được bọc bằng
`path.basename()` nên không leo ra ngoài thư mục được.

**Response `200`** — nội dung file, `Content-Type` do Express đoán theo đuôi.

**Lỗi**

| Mã | `message` | Nguyên nhân |
| --- | --- | --- |
| `404` | `Image not found.` | Pod **này** không có file đó |

Chữ **Pod này** là cả bài học của section:

> Chạy `replicas: 2` với một volume **không** `ReadWriteMany` thì mỗi Pod có thư mục ảnh
> riêng. Ảnh upload vào Pod A, và mọi request rơi vào Pod B đều `404`. Ảnh hỏng **một nửa
> số lần tải trang**, và `kubectl logs` của Pod B không hé lộ gì bất thường.

Đây chính là lý do dự án này cần EFS chứ không phải một `PersistentVolume` thường. Lỗi nửa
vời đó là lỗi tốn thời gian nhất trong cả section — nên khi thấy ảnh chập chờn, việc đầu
tiên là kiểm `accessModes` của PVC, không phải đọc log.

---

## `GET /menu/health`

```json
{ "status": "ok", "pod": "cafe-menu-deployment-7d9f-abcde", "images": 3 }
```

| Trường | |
| --- | --- |
| `pod` | Giá trị `HOSTNAME` — **tên Pod đang phục vụ request này** |
| `images` | Số file đang thấy trong `MENU_IMAGE_FOLDER` |

Hai trường này là công cụ chẩn đoán tốt nhất của dự án. Gọi nhiều lần liên tiếp:

```bash
for i in $(seq 6); do curl -s http://<ip>:8210/api/menu/health; echo; done
```

Nếu `pod` đổi qua lại mà `images` **khác nhau** giữa các Pod, bạn đã tự tay chứng minh
volume không dùng chung — trước cả khi có ai báo ảnh hỏng.

Endpoint này luôn `200` khi tiến trình còn sống, kể cả khi **MongoDB đã chết**. Một
`livenessProbe` trỏ vào đây sẽ xanh trong lúc mọi endpoint khác trả `500`.
