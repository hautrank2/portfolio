---
title: "8.3 Chuẩn bị dự án"
description: "Một quán cà phê nhỏ: ba API, hai frontend, một database. Đủ để chạm vào cả hai loại volume mà section này cần."
status: growing
created: 2026-09-25
updated: 2026-10-02
tags: [k8s, deploy, docker, mongodb, react, env]
---

Section này dùng một dự án **khác** với section 7, và lần đầu có đủ ba thứ mà một hệ thật
luôn có: xác thực, database có state, và file do người dùng tải lên.

📦 [Tải source về](/code/kub-demo-cafe-system.zip) — giải nén ra thư mục
`kub-demo-cafe-system`.

## Cả hệ trên AWS

Khách xem menu và đặt đồ uống, không cần đăng nhập. Chủ quán đăng nhập vào trang quản trị
để thêm món kèm ảnh, và xem đơn. Hình dưới là toàn bộ hệ đó khi đã chạy trên EKS: mỗi khối
là một tài nguyên mà các note từ 8.5 tới 8.18 sẽ tạo ra, đặt đúng chỗ nó nằm trong mạng.

![Cafe System on AWS EKS, infrastructure view: a VPC with public and private subnets in two Availability Zones, two Classic ELBs, a NAT Gateway, two EC2 worker nodes running the Pods, an EBS volume for MongoDB, EFS mount targets, the EKS control plane and IAM roles](/img/blog/k8s/cafe-eks-infrastructure.svg)

⬇ [Tải hình SVG](/img/blog/k8s/cafe-eks-infrastructure.svg) · ⬇ [Tải hình PNG](/img/blog/k8s/cafe-eks-infrastructure.png)

Chưa cần hiểu hết ngay. Quay lại hình này sau mỗi note — mỗi lần sẽ có thêm một khối bạn
vừa tự tay tạo.

| Khối trong hình | Tạo ở | Ai tạo |
| --- | --- | --- |
| IAM: `eksClusterRole`, `eksNodeRole` | [8.5](/blog/k8s/deploy-to-cloud/iam-roles) | Bạn |
| VPC, bốn subnet, Internet Gateway, NAT Gateway | [8.6](/blog/k8s/deploy-to-cloud/vpc-and-subnets) | CloudFormation |
| EFS file system, hai mount target | [8.7](/blog/k8s/deploy-to-cloud/efs-file-system) | Bạn |
| EKS control plane và add-on | [8.11](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks) | Bạn |
| Hai EC2 worker node | [8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes) | Node group |
| Hai Classic ELB, đĩa EBS | [8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster) | **Kubernetes**, từ YAML của bạn |

### Sáu thành phần chạy trong cụm

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

### Vì sao có hai khối "EC2 worker node · node group"

Đó là **một** node group, không phải hai. Node group là thứ *sinh ra* máy; bạn khai nó muốn
**hai máy**, và nó đặt mỗi máy vào một subnet private ở một Availability Zone khác nhau.
Hai khối trong hình là hai máy EC2 đó — cùng loại máy, cùng IAM role, cùng cấu hình.

Hai máy chứ không phải một, vì ba lý do:

| Lý do | Cụ thể |
| --- | --- |
| **Đủ chỗ** | Cả hệ cần khoảng 25 Pod, tính cả Pod hệ thống. Mỗi máy chỉ chứa được một số Pod giới hạn theo số IP của nó — xem [8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes) |
| **Chịu lỗi** | EKS bắt VPC có subnet ở hai AZ. Một máy hoặc cả một AZ hỏng thì Pod được xếp lại sang máy còn lại |
| **Để học** | Đây mới là lý do chính. Chỉ khi có hai máy ở hai nơi, bạn mới thấy được những thứ cụm một node che mất |

Lý do thứ ba đáng nói kỹ, vì cả nửa sau của section xoay quanh nó:

- **Đĩa EBS chỉ gắn vào một máy, trong một AZ.** Trong hình, nó nằm dưới máy bên trái, và
  Pod `mongo` buộc phải chạy ở đúng máy đó. Mongo một bản thì ổn.
- **`menu-api` chạy hai bản, mỗi bản một máy.** Hai bản phải thấy cùng một thư mục ảnh —
  và một đĩa EBS không làm được việc đó. Vì vậy mới có EFS, với **một mount target ở mỗi
  AZ**, để máy nào cũng với tới.

Trên cụm một node ở các section trước, hai điều này không bao giờ lộ ra: mọi Pod nằm chung
một máy, nên volume kiểu gì cũng "dùng chung" được.

Hai lưu ý khi đọc hình:

- **Vị trí các Pod chỉ là một ví dụ.** Scheduler tự quyết Pod nào nằm ở máy nào, và có thể
  khác đi ở lần chạy của bạn. Chỉ `mongo` là bị ghim — vào máy cùng AZ với đĩa của nó.
- **Control plane không nằm trong hai máy này.** Nó là khối riêng bên phải, do AWS vận hành.
  Hai máy chỉ là worker: nơi container của bạn thật sự chạy.

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

Ở manifest bạn sẽ viết lúc đầu, `menu-api` **chưa có volume nào** — ảnh ghi thẳng vào lớp
ghi của container. Đó là chủ ý: [note 8.15](/blog/k8s/deploy-to-cloud/getting-started-with-volumes)
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

## Source có gì, và thiếu gì

Giải nén ra, bạn có **code của năm service** và một thư mục ảnh mẫu:

```
kub-demo-cafe-system/
├── auth-api/      menu-api/      order-api/     ← ba API Node.js, mỗi cái có Dockerfile
├── shop-web/      admin-web/                    ← hai frontend React + nginx
└── images/                                      ← vài tấm ảnh đồ uống để upload thử
```

Thứ **cố ý không có** là mọi file YAML. Bạn sẽ tự viết chúng, đúng lúc cần tới:

| File | Viết ở | Để làm gì |
| --- | --- | --- |
| `docker-compose.yaml` | Note này | Chạy thử cả hệ trên máy, trước khi đụng tới cụm |
| Sáu file trong `kubernetes/` | [8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster) | Mongo, ba API, hai frontend trên cụm |
| `kubernetes/efs.yaml` | [8.17](/blog/k8s/deploy-to-cloud/persistent-volume-for-efs) | Volume dùng chung cho ảnh món |

Viết tay bảy file nghe nhiều, nhưng chúng lặp lại cùng một mẫu Service + Deployment đã học
ở [section 5](/blog/k8s/k8s-in-action) — và gõ lại một lần là cách chắc nhất để đọc được
manifest của người khác sau này.

## Viết `docker-compose.yaml`

Tạo file `docker-compose.yaml` ở **gốc** thư mục `kub-demo-cafe-system`:

```yaml
services:
  cafe-mongo-service:
    image: mongo:6
    volumes:
      - mongo-data:/data/db

  cafe-auth-service:
    build: ./auth-api
    image: <your-docker-user>/kub-cafe-auth:1
    environment:
      TOKEN_KEY: 'doi-chuoi-nay-di'
      ADMIN_EMAIL: 'admin@cafe.local'
      ADMIN_PASSWORD: 'cafe1234'

  cafe-menu-service:
    build: ./menu-api
    image: <your-docker-user>/kub-cafe-menu:1
    environment:
      MONGODB_URI: 'mongodb://cafe-mongo-service:27017/cafe'
      AUTH_ADDRESS: 'cafe-auth-service:3000'
      MENU_IMAGE_FOLDER: '/app/data/images'
    volumes:
      - menu-images:/app/data/images

  cafe-order-service:
    build: ./order-api
    image: <your-docker-user>/kub-cafe-order:1
    environment:
      MONGODB_URI: 'mongodb://cafe-mongo-service:27017/cafe'
      AUTH_ADDRESS: 'cafe-auth-service:3000'

  shop-web:
    build: ./shop-web
    image: <your-docker-user>/kub-cafe-shop:1
    ports:
      - '8210:80'

  admin-web:
    build: ./admin-web
    image: <your-docker-user>/kub-cafe-admin:1
    ports:
      - '8211:80'

volumes:
  mongo-data:
  menu-images:
```

Ba điều đáng để ý trong file này:

- **Tên service của Compose trùng với tên Service sẽ đặt trên cụm** — `cafe-auth-service`,
  `cafe-menu-service`, `cafe-order-service`, `cafe-mongo-service`. Đó là lý do `nginx.conf` và các
  biến `AUTH_ADDRESS`, `MONGODB_URI` không phải đổi khi lên Kubernetes.
- **Chỉ hai frontend mở cổng ra máy.** Ba API và Mongo không có `ports`, giống hệt việc
  chúng sẽ là `ClusterIP` trên cụm.
- **Hai volume có tên** — `mongo-data` và `menu-images` — giữ dữ liệu Mongo và ảnh món qua
  mỗi lần `docker compose down`. Trên cụm, hai vai đó thuộc về EBS và EFS.

### Hai giá trị phải đổi trước khi chạy

**1. Tên image.** Thay `<your-docker-user>` ở **cả năm chỗ** bằng tài khoản Docker Hub của
bạn. Để nguyên thì Compose báo `invalid reference format`, vì `<` và `>` không hợp lệ trong
tên image.

**2. Bí mật của `auth-api`.** Đổi `TOKEN_KEY` và `ADMIN_PASSWORD` thành giá trị của riêng
bạn. Hai chuỗi này sẽ xuất hiện lần nữa trong `kubernetes/auth-api.yaml` ở 8.14 — chúng nằm
thẳng trong YAML, ai chạy `kubectl describe pod` cũng đọc được. Secret giải quyết chuyện
đó, và đó là câu hỏi mở ở cuối note.

`MONGODB_URI` thì **không phải đổi**: `mongodb://cafe-mongo-service:27017/cafe` đúng ở cả hai
môi trường, vì Mongo chạy ngay bên cạnh các API.

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

1. Đăng nhập bằng `admin@cafe.local` và mật khẩu bạn vừa đặt, bấm **Log in**.
2. Ở khung **Add item**, điền tên và giá, chọn một ảnh trong thư mục `images/` của source
   (hoặc ảnh bất kỳ dưới 2MB), bấm **Add item**.
3. Món hiện ra trong danh sách, kèm ảnh.

Rồi mở **trang khách** ở `http://localhost:8210`:

1. Món vừa thêm phải hiện ra kèm ảnh.
2. Nhập số lượng, điền tên, bấm **Place order**.
3. Quay lại trang quản trị — đơn vừa đặt hiện ở mục **Recent orders**. Chưa thấy thì bấm
   **Reload**.

Chuỗi này chạy được nghĩa là **cả năm mắt xích đều thông**: nginx proxy đúng, `menu` và
`order` nối được Mongo, và cả hai gọi được `auth` để kiểm token.

| Triệu chứng | Nơi hỏng |
| --- | --- |
| Đăng nhập báo `Wrong email or password.` | Sai `ADMIN_EMAIL` hoặc `ADMIN_PASSWORD` |
| Thêm món báo `Could not verify token.` | `menu-api` không gọi được `cafe-auth-service` |
| Thêm món báo `Could not save item.` | `menu-api` không nối được Mongo — xem `docker compose logs cafe-menu-service` |
| `docker compose up` báo `invalid reference format` | Còn sót `<your-docker-user>` trong `docker-compose.yaml` |
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
- [ ] Viết được `docker-compose.yaml` cho cả hệ, và nói được vì sao chỉ hai service có `ports`
- [ ] Nói được vì sao chỉ hai Service cần `LoadBalancer`
- [ ] Giải thích vì sao `nginx.conf` dùng chung được cho Compose và cụm
- [ ] Phân biệt hai bài toán volume: ảnh món và dữ liệu Mongo
- [ ] Chạy được chuỗi thêm món → đặt đơn → xem đơn bằng Docker Compose

## Open questions

- `TOKEN_KEY` và `ADMIN_PASSWORD` đang nằm thẳng trong YAML. Secret thay đổi được gì, và **không** thay đổi được gì?
- Mongo chạy trong cụm với `replicas: 1`. Muốn ba bản thì thiếu gì ở Deployment?
- Ảnh lưu trên filesystem còn dữ liệu ở Mongo. Vì sao không nhét luôn ảnh vào database?
