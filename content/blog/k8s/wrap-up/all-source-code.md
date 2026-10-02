---
title: "9.3 Toàn bộ source code đã dùng"
description: "Mỗi section một dự án, mỗi dự án một link tải. Kèm tên image, cổng, và những file bạn phải tự viết — để làm lại bất kỳ section nào từ đầu."
status: growing
created: 2026-10-02
updated: 2026-10-02
tags: [k8s, source, docker, lab]
---

Mọi dự án trong giáo trình, gom về một chỗ. Dùng note này khi muốn **làm lại một section**
mà không phải lần ngược từng note tìm link tải.

Tất cả đều là app Node.js nhỏ, không cần cài gì ngoài Docker và một cụm Kubernetes.

## Bảng tổng

| Section | Dự án | Tải về | Có sẵn YAML? |
| --- | --- | --- | --- |
| [Thực chiến](/blog/k8s/k8s-in-action) — imperative | `first-app` | [first-app.zip](/code/first-app.zip) | Không — section này gõ lệnh `kubectl` trực tiếp |
| [Thực chiến](/blog/k8s/k8s-in-action) — declarative | `second-app` | [second-app.zip](/code/second-app.zip) | Có `deployment.yaml`, `service.yaml` |
| [Dữ liệu & Volume](/blog/k8s/data-and-volumes) | `kub-data-01-starting-setup` | [kub-data-01-starting-setup.zip](/code/kub-data-01-starting-setup.zip) | Chỉ `docker-compose.yaml` |
| [Networking](/blog/k8s/networking) — ba API | `kub-network-01-starting-setup` | [kub-network-01-starting-setup.zip](/code/kub-network-01-starting-setup.zip) | Chỉ `docker-compose.yaml` |
| [Networking](/blog/k8s/networking) — frontend | `kub-network-06-added-frontend` | [kub-network-06-added-frontend.zip](/code/kub-network-06-added-frontend.zip) | Không |
| [Deploy lên cloud](/blog/k8s/deploy-to-cloud) | `kub-demo-cafe-system` | [kub-demo-cafe-system.zip](/code/kub-demo-cafe-system.zip) | **Không** — bạn tự viết cả tám file |

Hai section đầu — [Nền tảng](/blog/k8s/foundations) và
[Bắt đầu](/blog/k8s/getting-started) — không có dự án: lệnh của chúng chạy thẳng trên máy
Linux hoặc với image công khai như `nginx` và `busybox`.

## Từng dự án

### `first-app` và `second-app`

Một app Express một file, một endpoint. Đủ nhỏ để mọi sự chú ý dồn vào Kubernetes.

| | `first-app` | `second-app` |
| --- | --- | --- |
| Gồm | `app.js`, `Dockerfile`, `package.json` | Thêm `deployment.yaml`, `service.yaml` |
| Dùng để học | `kubectl create deployment`, `expose`, `scale`, `set image`, `rollout undo` | `kubectl apply -f`, `labels`, `selector`, `livenessProbe` |
| Image bạn build | `<your-docker-user>/kub-first-app` | `<your-docker-user>/kub-first-app`, tag mới |
| Bắt đầu ở | [Deployment đầu tiên](/blog/k8s/k8s-in-action/first-deployment-imperative) | [Viết file Deployment](/blog/k8s/k8s-in-action/writing-a-deployment-file) |

### `kub-data-01-starting-setup`

Một API ghi và đọc một file văn bản — thứ đơn giản nhất mà vẫn **mất dữ liệu** khi Pod
chết.

| | |
| --- | --- |
| Gồm | `app.js`, `Dockerfile`, `docker-compose.yaml`, thư mục `story/` |
| Dùng để học | `emptyDir`, `hostPath`, PV và PVC, biến môi trường, `ConfigMap` |
| Image bạn build | `<your-docker-user>/kub-data-app` |
| Bạn tự viết | `deployment.yaml`, `service.yaml`, `host-pv.yaml`, `host-pvc.yaml`, `environment.yaml` |
| Bắt đầu ở | [Dự án khởi điểm](/blog/k8s/data-and-volumes/starting-project) |

### `kub-network-01-starting-setup` và `kub-network-06-added-frontend`

Ba API gọi nhau, rồi thêm một frontend đứng trước.

| | |
| --- | --- |
| Gồm | `auth-api/`, `users-api/`, `tasks-api/`, `docker-compose.yaml`; và `frontend/` ở gói thứ hai |
| Dùng để học | Nhiều container một Pod, Pod gọi Pod bằng IP, biến môi trường và DNS, reverse proxy |
| Image bạn build | `kub-demo-auth`, `kub-demo-users`, `kub-demo-tasks`, `kub-demo-frontend` |
| Bạn tự viết | Một cặp Deployment + Service cho mỗi service |
| Bắt đầu ở | [Dự án khởi điểm & mục tiêu](/blog/k8s/networking/project-and-goals), rồi [Thêm frontend](/blog/k8s/networking/adding-a-frontend) |

### `kub-demo-cafe-system`

Dự án lớn nhất, và là dự án duy nhất có đủ ba thứ của một hệ thật: xác thực, database có
state, và file do người dùng tải lên.

```
kub-demo-cafe-system/
├── auth-api/       đăng nhập, cấp và kiểm token
├── menu-api/       món và ảnh món        → MongoDB + thư mục ảnh
├── order-api/      đơn hàng              → MongoDB
├── shop-web/       trang khách           (React + nginx)
├── admin-web/      trang quản trị        (React + nginx)
└── images/         ảnh đồ uống mẫu để upload thử
```

Mỗi API có một file `API.md` mô tả từng route, và mỗi service có `.env.template` liệt kê
biến môi trường nó cần.

| | |
| --- | --- |
| Dùng để học | Cả section 8: EBS cho Mongo, EFS cho ảnh, load balancer cho hai frontend |
| Image bạn build | `kub-cafe-auth`, `kub-cafe-menu`, `kub-cafe-order`, `kub-cafe-shop`, `kub-cafe-admin` |
| Cổng | `8210` trang khách, `8211` trang quản trị |
| Bắt đầu ở | [8.3 Chuẩn bị dự án](/blog/k8s/deploy-to-cloud/preparing-the-project) |

Gói tải về **cố ý không có file YAML nào**. Tám file bạn tự viết, theo thứ tự:

| File | Viết ở | Nội dung |
| --- | --- | --- |
| `docker-compose.yaml` | [8.3](/blog/k8s/deploy-to-cloud/preparing-the-project) | Cả hệ trên máy, để thử trước |
| `kubernetes/mongo.yaml` | [8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster) | PVC + Service + Deployment |
| `kubernetes/auth-api.yaml` | 8.14 | Service `ClusterIP` + Deployment |
| `kubernetes/menu-api.yaml` | 8.14, sửa ở [8.17](/blog/k8s/deploy-to-cloud/persistent-volume-for-efs) và [8.18](/blog/k8s/deploy-to-cloud/using-the-efs-volume) | Thêm volume EFS, rồi rải Pod qua các node |
| `kubernetes/order-api.yaml` | 8.14 | Service `ClusterIP` + Deployment |
| `kubernetes/shop-web.yaml` | 8.14 | Service `LoadBalancer` + Deployment |
| `kubernetes/admin-web.yaml` | 8.14 | Service `LoadBalancer` + Deployment |
| `kubernetes/efs.yaml` | [8.17](/blog/k8s/deploy-to-cloud/persistent-volume-for-efs) | StorageClass + PV + PVC |

Nội dung đầy đủ của cả tám file nằm ngay trong các note đó — chép từ note, không cần tìm ở
đâu khác.

## Ba giá trị luôn phải thay

Mọi dự án đều dùng chung vài placeholder. Để nguyên chúng là nguyên nhân của phần lớn lỗi
"chép đúng mà không chạy":

| Placeholder | Thay bằng | Để nguyên thì |
| --- | --- | --- |
| `<your-docker-user>` | Tài khoản Docker Hub của bạn | Docker báo `invalid reference format`; Pod kẹt `InvalidImageName` |
| `<file-system-id>` | `FileSystemId` của EFS, dạng `fs-…` | Pod kẹt `ContainerCreating` khi mount |
| `<account-id>`, `<region>`, `<vpc-id>`… | Giá trị của tài khoản AWS bạn | Lệnh `aws` báo lỗi cú pháp hoặc không tìm thấy |

Trên PowerShell, dấu `<` là toán tử — nên lệnh còn placeholder sẽ báo **lỗi cú pháp** thay
vì lỗi "không tìm thấy". Thay xong rồi mới chạy.

## Build và đưa image lên đâu

Hai đường, và đường nào quyết định `imagePullPolicy` trong manifest:

| Cụm | Đưa image lên | `imagePullPolicy` |
| --- | --- | --- |
| k3s trên VM | `docker save <image>` rồi `k3s ctr images import` | `IfNotPresent` |
| k3d | `k3d image import <image> -c <cluster-name>` | `IfNotPresent` |
| EKS, hoặc bất kỳ cụm nào ở xa | `docker push` lên Docker Hub | `Always` |

Build trên máy ARM (Mac chip M, một số máy Windows mới) cho cụm x86 thì thêm
`--platform linux/amd64`, nếu không Pod báo `exec format error`.

## Làm lại một section từ đầu

1. Tải gói của section đó ở bảng tổng, giải nén.
2. Dựng cụm sạch — miễn phí, một lệnh:

```bash
k3d cluster create lab --agents 2
```

3. Mở note đầu tiên của section (cột *Bắt đầu ở*) và đi tuần tự.
4. Xong thì xoá cụm:

```bash
k3d cluster delete lab
```

Riêng [section 8](/blog/k8s/deploy-to-cloud) cần AWS cho phần EBS, EFS và load balancer.
Mỗi note của nó có mục **"Nếu chỉ đọc chứ không bật EKS"**, nói rõ phần nào làm được trên
k3d. Nếu bật EKS thật, kết thúc bằng
[8.19](/blog/k8s/deploy-to-cloud/cleaning-up) — đừng để cụm chạy qua đêm.

## Self-check

- [ ] Biết mỗi section dùng dự án nào, và tải ở đâu
- [ ] Kể được tám file YAML của Cafe System và note nào viết file nào
- [ ] Nói được ba placeholder phải thay, và triệu chứng khi quên
- [ ] Biết chọn `imagePullPolicy` theo cách đưa image lên cụm

## Open questions

- Các dự án ở đây đều là Node.js. Đổi sang ngôn ngữ bạn dùng hằng ngày thì phần nào của
  manifest phải đổi, phần nào giữ nguyên?
- Tám file YAML của Cafe System lặp lại cùng một mẫu. Mảng nào ở
  [9.2](/blog/k8s/wrap-up/what-to-learn-next) giúp bớt lặp?
