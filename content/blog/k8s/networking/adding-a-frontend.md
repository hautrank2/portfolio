---
title: "7.11 Thêm frontend đã container hoá"
description: Chạy frontend bằng Docker, bấm thử trên giao diện, và để chính trình duyệt chỉ ra chỗ hỏng — rồi mới đi sửa tasks-api.
status: growing
created: 2026-09-22
updated: 2026-09-22
tags: [k8s, frontend, react, docker, cors]
---

> Tiếp [7.10](/blog/k8s/networking/challenge-solution). Ba service đã nối xong trong cụm.

📦 [Tải source frontend](/code/kub-network-06-added-frontend.zip) — giải nén và đặt thư
mục `frontend` cạnh `auth-api`, `users-api`, `tasks-api`.

Một app React nhỏ: form thêm task, nút *Fetch Tasks*, và danh sách. Nó gọi `tasks-api`,
không gọi `users` hay `auth` — token để cứng là `abc`.

Note này chưa đụng tới cụm. Chỉ Docker, và một tab trình duyệt.

## Câu quan trọng nhất của cả note

**Container frontend là một chuyện, code React chạy ở đâu là chuyện khác.**

```
┌─ Cluster ───────────────────────┐
│  Pod frontend                   │      Trình duyệt
│  └─ phục vụ file tĩnh ─────────────►  React chạy Ở ĐÂY
│                                 │      │
│  Pod tasks ◄────────────────────┼──────┘ fetch() đi từ ngoài vào
│  Pod auth  ◄── chỉ gọi được từ trong cụm
└─────────────────────────────────┘
```

Container chỉ **giao file** cho trình duyệt. Lệnh `fetch()` chạy trên máy người dùng, nên
với nó cụm là một hệ thống ở xa:

| Thứ vừa học ở 7.8 | Có dùng được cho frontend không |
| --- | --- |
| Gọi `http://tasks-service:8000` bằng tên | **Không.** Trình duyệt không hỏi CoreDNS |
| Đọc địa chỉ từ biến môi trường | **Không.** Biến của React bị **nhúng lúc build** |
| Gọi `auth-service` (ClusterIP) | **Không.** Không có đường nào từ ngoài vào |

Vì vậy frontend chỉ gọi được Service nào có `EXTERNAL-IP`, và địa chỉ đó phải nằm sẵn
trong code lúc build.

## Bước 1 — Trỏ frontend vào `tasks-service`

Trong `frontend/src/App.js`, địa chỉ đang là của máy người viết khoá:

```js
fetch('http://192.168.99.100:32140/tasks', {
  headers: { 'Authorization': 'Bearer abc' }
})
```

Lấy `EXTERNAL-IP` của `tasks-service` trong cụm bạn:

```bash
kubectl get svc tasks-service
```

Rồi sửa **cả hai** chỗ `fetch` trong file:

```js
fetch('http://192.168.103.154:8000/tasks', { ... })
```

## Bước 2 — Build và chạy bằng Docker

```bash
docker build -t hautrank2/kub-demo-frontend:1 frontend
```

```bash
docker run --rm -p 8090:80 hautrank2/kub-demo-frontend:1
```

`Dockerfile` của frontend build hai tầng: tầng một có Node để chạy `npm run build`, tầng
hai chỉ mang đống file tĩnh và một web server phục vụ chúng ở cổng `80`. Image cuối
**không có Node**, đúng mẫu multi-stage ở
[note nền tảng](/blog/k8s/foundations/container/dockerfile-multistage). Phần cấu hình
server nằm trong `frontend/conf/nginx.conf`, để
[7.13](/blog/k8s/networking/reverse-proxy) mổ — ở đây chưa cần đụng vào.

## Bước 3 — Test bằng giao diện

Mở `http://localhost:8090`.

**Đoán trước:** trang hiện ra bình thường. Bấm *Fetch Tasks* thì sao? Nhập title, text rồi
bấm *Add Task* thì sao?

| Thao tác | Bạn thấy gì |
| --- | --- |
| Mở trang | Form và nút hiện đầy đủ — file tĩnh được giao tốt |
| *Fetch Tasks* | Danh sách trống trơn, không báo gì |
| *Add Task* | Ô nhập trống lại, nhưng danh sách không có gì mới |

Giao diện **không báo lỗi**, vì code không xử lý lỗi. Mở DevTools bằng `F12`, sang tab
**Console**:

```
Access to fetch at 'http://192.168.103.154:8000/tasks' from origin
'http://localhost:8090' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

Sang tab **Network**, bấm lại *Fetch Tasks*: request `tasks` hiện ra màu đỏ, và với
*Add Task* bạn còn thấy một request `OPTIONS` đi trước.

## Bước 4 — Vì sao `curl` chạy mà giao diện thì không

Cùng URL đó, `curl` vẫn ra dữ liệu:

```bash
curl -s -H "Authorization: Bearer abc" http://192.168.103.154:8000/tasks
```

Khác biệt nằm ở **trình duyệt**, không nằm ở server. Trang đang mở ở origin
`http://localhost:8090` mà gọi sang `http://192.168.103.154:8000` — khác origin, nên
trình duyệt chặn không cho đọc kết quả, trừ khi server nói rõ là cho phép. `curl` không có
luật đó nên không quan tâm.

Đây là lý do phải test bằng giao diện: lỗi này **không bao giờ** xuất hiện nếu bạn chỉ thử
bằng `curl`.

## Bước 5 — Sửa `tasks-api`

Thêm vào `tasks-api/tasks-app.js`, ngay sau `bodyParser`:

```js
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  next();
})
```

Ba dòng, ba việc khác nhau:

| Header | Vì sao cần |
| --- | --- |
| `Allow-Origin` | Cho phép trang ở origin khác đọc kết quả |
| `Allow-Methods` | `POST /tasks` có một request `OPTIONS` đi trước — gọi là **preflight** |
| `Allow-Headers` | Vì request mang `Authorization` và `Content-Type`, hai header không nằm trong danh sách mặc định |

Đặt khối này **trước** các route, vì Express chạy middleware theo thứ tự khai báo. Để
xuống dưới `app.get('/tasks')` là header không kịp gắn vào.

Build tag mới rồi rollout:

```bash
docker build -t hautrank2/kub-demo-tasks:2 tasks-api && docker save hautrank2/kub-demo-tasks:2 | sudo k3s ctr images import -
```

Sửa `image:` trong `kubernetes/tasks-deployment.yaml` thành `:2`:

```bash
kubectl apply -f kubernetes/tasks-deployment.yaml && kubectl rollout status deployment tasks-deployment --timeout=60s
```

## Bước 6 — Test lại bằng giao diện

Tải lại `http://localhost:8090`, không cần build lại frontend — chỉ `tasks` đổi.

| Thao tác | Giờ phải thấy |
| --- | --- |
| *Add Task* với title `t1`, text `noi dung` | Ô nhập trống lại, Console không còn dòng đỏ |
| *Fetch Tasks* | Task `t1` hiện trong danh sách |
| Tab Network | `OPTIONS` rồi `POST`, cả hai `200`/`201` |

Danh sách không tự cập nhật sau khi thêm — phải bấm *Fetch Tasks*. Đó là do code React,
không phải lỗi mạng.

## Ba chỗ vừa phải gõ cứng

| Chỗ | Giá trị | Vấn đề |
| --- | --- | --- |
| `App.js` | `http://192.168.103.154:8000` | Đổi cụm là phải **build lại image** |
| `tasks-app.js` | `Allow-Origin: *` | Mở cho mọi origin, chỉ hợp lab |
| `App.js` | `Bearer abc` | Token giả, frontend chưa hề gọi `login` |

Hai dòng đầu là cái giá của việc cho trình duyệt gọi thẳng `tasks-api`.
[Note 7.13](/blog/k8s/networking/reverse-proxy) xoá cả hai bằng một cách khác hẳn.

## Dọn và chuẩn bị cho note sau

Dừng container đang chạy bằng `Ctrl+C` ở terminal đang giữ nó, rồi đưa image frontend tới
cụm:

```bash
docker save hautrank2/kub-demo-frontend:1 | sudo k3s ctr images import -
```

## Self-check

- [ ] Giải thích được vì sao frontend **không** dùng được DNS của cụm
- [ ] Nói được vì sao `curl` không bị CORS chặn còn trình duyệt thì có
- [ ] Biết `OPTIONS` xuất hiện lúc nào và để làm gì
- [ ] Biết mở DevTools xem Console và Network để tìm nguyên nhân, thay vì đoán
- [ ] Nói được vì sao sửa `tasks` xong không cần build lại frontend

## Open questions

- `REACT_APP_*` trong CRA được nhúng lúc build — vậy một image dùng cho cả staging lẫn production kiểu gì?
- `Allow-Origin: *` có ảnh hưởng gì khi API cần cookie?
