---
title: "8.3 Chuẩn bị dự án"
description: "Một quán cà phê nhỏ: ba API, hai frontend, một database. Đủ để chạm vào cả hai loại volume mà section này cần."
status: growing
created: 2026-09-25
updated: 2026-09-29
tags: [k8s, deploy, docker, mongodb, react, env]
---

Section này dùng một dự án **khác** với section 7, và lần đầu có đủ ba thứ mà một hệ thật
luôn có: xác thực, database có state, và file do người dùng tải lên.

📦 [Tải source về](/code/kub-demo-cafe-system.zip) — giải nén ra thư mục
`kub-demo-cafe-system`.

## Cafe System

Khách xem menu và đặt đồ uống, không cần đăng nhập. Chủ quán đăng nhập vào trang quản trị
để thêm món kèm ảnh, và xem đơn.

```
        ┌──────────────┐                      ┌──────────────┐
 Khách  │  shop-web    │             Chủ quán │  admin-web   │
 ─────► │  :8210 (LB)  │             ───────► │  :8211 (LB)  │
        └──────┬───────┘                      └──────┬───────┘
               │  nginx proxy /api/*                 │
       ┌───────┴───────────┬─────────────────┬───────┘
       ▼                   ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  menu-api   │   │  order-api  │   │  auth-api   │  ← ClusterIP, không ra ngoài
└──────┬──────┘   └──────┬──────┘   └─────────────┘
       │ ảnh món         │ đơn hàng          ▲
       ▼                 ▼                   │ kiểm token
┌─────────────┐   ┌───────────────┐          │
│  thư mục    │   │  mongo :27017 │──────────┘
│  ảnh dùng   │   │  (PVC)        │
│  chung      │   └───────────────┘
└─────────────┘
```

| Service | Cổng | Biến môi trường cần | Gọi ai |
| --- | --- | --- | --- |
| **auth-api** | `3000` | `TOKEN_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Không ai — nó là đáy |
| **menu-api** | `3000` | `MONGODB_URI`, `AUTH_ADDRESS`, `MENU_IMAGE_FOLDER` | → auth, → mongo, → thư mục ảnh |
| **order-api** | `3000` | `MONGODB_URI`, `AUTH_ADDRESS` | → auth, → mongo |
| **shop-web** | `80` | Không có | → menu, order (qua nginx) |
| **admin-web** | `80` | Không có | → cả ba (qua nginx) |
| **mongo** | `27017` | Không có | — |

Ba API **đều nghe cổng 3000**. Việc phân biệt chúng là của Service, không phải của cổng
app — đúng như [section 7](/blog/k8s/networking) đã dựng nền.

## Vì sao chỉ hai Service ra ngoài

Mỗi frontend tự mang một nginx, và nginx proxy `/api/*` xuống các API bên trong cụm:

```nginx
location /api/auth/  { proxy_pass http://cafe-auth-service:3000/auth/; }
location /api/menu/  { proxy_pass http://cafe-menu-service:3000/menu/; }
location /api/orders { proxy_pass http://cafe-order-service:3000/orders; }
```

Đây là mẫu reverse proxy ở [note 7.13](/blog/k8s/networking/reverse-proxy), lần này dùng
ngay từ đầu. Đổi lại ba thứ:

| | |
| --- | --- |
| **Hai `LoadBalancer`** thay vì năm | Trên cloud, mỗi cái là một hoá đơn riêng |
| **Không cần CORS** | Trình duyệt chỉ gọi cùng origin với trang |
| **API không có đường vào từ internet** | `auth` đặc biệt không nên có |

Để ý tên service viết trần — `cafe-auth-service`, không phải `cafe-auth-service.default`. Nhờ vậy
**một file `nginx.conf` chạy được cả ở Docker Compose lẫn trong cụm**, vì Compose cũng
phân giải tên service y như vậy.

## Hai loại volume, hai bài toán khác nhau

Đây là điểm dự án này khác hẳn section 6 và 7, và cũng là lý do nó hợp với phần EFS:

| | **Ảnh món** | **Dữ liệu Mongo** |
| --- | --- | --- |
| Ai ghi | `menu-api`, khi admin upload | Chỉ tiến trình `mongod` |
| Bao nhiêu Pod cùng chạm vào | **Nhiều** — mọi bản `menu-api` phải đọc được | **Đúng một** |
| Access mode cần | `ReadWriteMany` → **EFS** | `ReadWriteOnce` → **PVC thường** |
| Hỏng thì thấy gì | Ảnh lúc hiện lúc mất, tuỳ Pod nào trả lời | Mất sạch menu và đơn sau mỗi lần Pod sinh lại |

Ở source khởi điểm, `menu-api` **chưa có volume nào** — ảnh ghi thẳng vào lớp ghi của
container. Đó là chủ ý: [note 8.15](/blog/k8s/deploy-to-cloud/getting-started-with-volumes)
sẽ cho bạn thấy nó gãy ở đâu trước khi gắn EFS vào.

> Ở dự án thật, ảnh thường nằm trên **S3** chứ không phải EFS. EFS ở đây là để học
> `ReadWriteMany` — một cơ chế của Kubernetes — chứ không phải vì nó là kiến trúc mẫu cho
> việc lưu ảnh.

## Bản đồ cổng

Section này dùng block **8210–8211**, chọn để không đụng thứ gì các section trước đã chiếm:

| Cổng trên node | Ai giữ |
| --- | --- |
| 80, 443 | Traefik của k3s |
| 3000 | `story-service` — [section 6](/blog/k8s/data-and-volumes) |
| 8000, 8080, 8081, 8090 | `tasks`, `users`, `frontend` — [section 7](/blog/k8s/networking) |
| **8210** | **`shop-web` của section này** |
| **8211** | **`admin-web` của section này** |

## Hai giá trị bạn phải tự đổi

### 1. Bí mật của `auth-api`

```yaml
TOKEN_KEY: 'doi-chuoi-nay-di'
ADMIN_PASSWORD: 'cafe1234'
```

Hai chuỗi này nằm ở **hai chỗ**: `docker-compose.yaml` và `kubernetes/auth-api.yaml`. Chúng
đang nằm thẳng trong YAML, ai chạy `kubectl describe pod` cũng đọc được — Secret giải
quyết chuyện đó, và đó là câu hỏi mở ở cuối note.

### 2. Tên image

```yaml
image: <your-docker-user>/kub-cafe-auth:1
```

Thay `<your-docker-user>` bằng tài khoản Docker Hub của bạn, ở cả `docker-compose.yaml`
lẫn năm file trong `kubernetes/`.

`MONGODB_URI` thì **không phải đổi**: `mongodb://cafe-mongo-service:27017/cafe` đúng ở cả hai
môi trường, vì Mongo chạy ngay trong cụm.

## Build năm image

```bash
cd kub-demo-cafe-system
```

```bash
for s in auth menu order; do docker build -t <your-docker-user>/kub-cafe-$s:1 ./$s-api; done
```

**PowerShell:**

```powershell
foreach ($s in "auth","menu","order") { docker build -t "<your-docker-user>/kub-cafe-${s}:1" "./$s-api" }
```

```bash
docker build -t <your-docker-user>/kub-cafe-shop:1 ./shop-web && docker build -t <your-docker-user>/kub-cafe-admin:1 ./admin-web
```

**PowerShell:**

```powershell
docker build -t "<your-docker-user>/kub-cafe-shop:1" ./shop-web; if ($?) { docker build -t "<your-docker-user>/kub-cafe-admin:1" ./admin-web }
```

Đưa lên registry — **bắt buộc** với EKS, vì node ở đó không có kho image của bạn:

```bash
for i in auth menu order shop admin; do docker push <your-docker-user>/kub-cafe-$i:1; done
```

**PowerShell:**

```powershell
foreach ($i in "auth","menu","order","shop","admin") { docker push "<your-docker-user>/kub-cafe-${i}:1" }
```

Nếu chạy lab bằng k3s hoặc k3d thì nhập thẳng vào node, nhanh hơn nhiều:

```bash
for i in auth menu order shop admin; do docker save <your-docker-user>/kub-cafe-$i:1 | sudo k3s ctr images import -; done
```

Hai đường này quyết định `imagePullPolicy` trong manifest: `Always` cho đường registry,
`IfNotPresent` cho đường nhập tay.

## Chạy thử bằng Docker trước

```bash
docker compose up -d --build
```

```bash
docker compose ps
```

Mở **trang quản trị** ở `http://localhost:8211`:

1. Đăng nhập bằng `admin@cafe.local` và mật khẩu bạn vừa đặt.
2. Thêm một món, chọn một ảnh bất kỳ dưới 2MB.
3. Món hiện ra trong danh sách, kèm ảnh.

Rồi mở **trang khách** ở `http://localhost:8210`:

1. Món vừa thêm phải hiện ra kèm ảnh.
2. Nhập số lượng, điền tên, bấm **Đặt đơn**.
3. Quay lại trang quản trị, bấm **Tải lại** ở mục đơn — đơn vừa đặt nằm đó.

Chuỗi này chạy được nghĩa là **cả năm mắt xích đều thông**: nginx proxy đúng, `menu` và
`order` nối được Mongo, và cả hai gọi được `auth` để kiểm token.

| Triệu chứng | Nơi hỏng |
| --- | --- |
| Đăng nhập báo `401` | Sai `ADMIN_EMAIL` hoặc `ADMIN_PASSWORD` |
| Thêm món báo `503 Không kiểm tra được token` | `menu-api` không gọi được `cafe-auth-service` |
| Menu trống dù đã thêm | `menu-api` không nối được Mongo — xem `docker compose logs cafe-menu-service` |
| Ảnh vỡ, các phần khác bình thường | File không nằm ở `MENU_IMAGE_FOLDER` |

Dọn trước khi sang cụm, để khỏi tranh cổng:

```bash
docker compose down
```

Thêm `-v` nếu muốn xoá luôn dữ liệu Mongo và ảnh đã upload.

## Một chi tiết của `order-api` đáng đọc

Client **chỉ gửi `itemId` và `quantity`**. Giá và tên món do server tự đọc từ Mongo rồi
tính `total`:

```js
const item = await Item.findById(line.itemId);
resolved.push({ itemId: item.id, name: item.name, price: item.price, quantity });
```

Hai lý do: không tin giá do client gửi, và **chép lại giá vào đơn** để chủ quán đổi giá
hôm sau không làm đổi đơn hôm nay.

## Self-check

- [ ] Kể năm service, cổng, và ai gọi ai
- [ ] Nói được vì sao chỉ hai Service cần `LoadBalancer`
- [ ] Giải thích vì sao `nginx.conf` dùng chung được cho Compose và cụm
- [ ] Phân biệt hai bài toán volume: ảnh món và dữ liệu Mongo
- [ ] Chạy được chuỗi thêm món → đặt đơn → xem đơn bằng Docker Compose

## Open questions

- `TOKEN_KEY` và `ADMIN_PASSWORD` đang nằm thẳng trong YAML. Secret thay đổi được gì, và **không** thay đổi được gì?
- Mongo chạy trong cụm với `replicas: 1`. Muốn ba bản thì thiếu gì ở Deployment?
- Ảnh lưu trên filesystem còn dữ liệu ở Mongo. Vì sao không nhét luôn ảnh vào database?
