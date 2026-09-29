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
| `GET` | `/menu/images/:file` | Không | thẻ `<img>` của cả hai frontend |
| `GET` | `/menu/health` | Không | bạn, và probe |

## Model `Item`

Collection `items`. `order-api` cũng **đọc** collection này để lấy tên và giá lúc đặt đơn.

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `name` | `String` | Bắt buộc |
| `price` | `Number` | Bắt buộc |
| `image` | `String` | **Tên file**, không phải đường dẫn, không phải nội dung ảnh |
| `available` | `Boolean` | Mặc định `true`. Chưa có endpoint nào đổi nó |
| `createdAt` | `Date` | Mặc định `Date.now`, dùng để sắp xếp mới nhất trước |

Trường `image` là chỗ đáng chú ý nhất của cả dự án: **database chỉ giữ tên file, còn file
thì nằm trên đĩa.** Hai thứ này có thể lệch nhau, và không có ràng buộc nào ngăn:

| Tình huống | Kết quả |
| --- | --- |
| Có bản ghi, không có file | `GET /menu/images/...` trả `404`, ảnh hỏng trên trang |
| Có file, không có bản ghi | File nằm đó chiếm chỗ, không ai thấy |

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
| `500` | `Không đọc được menu.` | Không nối được MongoDB, hoặc `MONGODB_URI` sai |

---

## `POST /menu/items`

Thêm một món, kèm ảnh nếu có. Đây là endpoint **duy nhất** trong cả hệ nhận `multipart`.

**Request** — `multipart/form-data`, **không phải JSON**:

| Field | Bắt buộc | |
| --- | --- | --- |
| `name` | Có | |
| `price` | Có | Gửi dạng chuỗi, code tự `Number()` |
| `image` | Không | File ảnh, **tối đa 2MB** |

Header `Authorization: Bearer <token>`.

```bash
curl -i -X POST http://localhost:8213/menu/items \
  -H "Authorization: Bearer $TOKEN" \
  -F 'name=Cà phê sữa đá' \
  -F 'price=25000' \
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
    "image": "1727500000000-ca-phe-sua.jpg"
  }
}
```

Tên file được sinh lại: `Date.now()` + tên gốc đã lọc ký tự (chỉ giữ `a-zA-Z0-9.-`). Nên
tên tiếng Việt có dấu sẽ thành một dãy `-`, và hai người tải cùng tên file không ghi đè
nhau.

**Lỗi**

| Mã | `message` | Nguyên nhân |
| --- | --- | --- |
| `401` | `Thiếu token.` | Không có header `Authorization` |
| `401` | `Token không hợp lệ.` | auth-api trả về không-`ok` |
| `422` | `Thiếu tên hoặc giá.` | `name` hoặc `price` rỗng |
| `500` | `Không lưu được món.` | Lỗi MongoDB |
| `503` | `Không kiểm tra được token.` | **Không gọi được auth-api** — sai `AUTH_ADDRESS`, hoặc auth chết |
| `500` | *(stack trace của multer)* | File > 2MB, hoặc `MENU_IMAGE_FOLDER` không ghi được |

Phân biệt `401` với `503` là kỹ năng đáng giữ: `401` nghĩa là *auth-api đã trả lời và nói
không*; `503` nghĩa là *chưa hỏi được ai cả*. Hai lỗi này sửa ở hai chỗ khác nhau.

Còn `500` từ multer là lỗi khó nhất trong nhóm, vì thông báo không nói gì về quyền ghi. Khi
mount volume vào `MENU_IMAGE_FOLDER`, nếu thư mục thuộc `root` mà container chạy bằng user
khác thì mọi upload đều `500`. Kiểm từ trong Pod:

```bash
kubectl exec deploy/cafe-menu-deployment -- sh -c 'touch /app/data/images/probe && echo ghi-duoc'
```

---

## `GET /menu/images/:file`

Trả file ảnh thẳng từ `MENU_IMAGE_FOLDER`, **không qua database**. Đường dẫn được bọc bằng
`path.basename()` nên không leo ra ngoài thư mục được.

**Response `200`** — nội dung file, `Content-Type` do Express đoán theo đuôi.

**Lỗi**

| Mã | `message` | Nguyên nhân |
| --- | --- | --- |
| `404` | `Không tìm thấy ảnh.` | Pod **này** không có file đó |

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
