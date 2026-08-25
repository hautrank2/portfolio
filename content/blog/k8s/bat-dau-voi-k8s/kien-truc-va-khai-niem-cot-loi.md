---
title: "Kiến trúc & khái niệm cốt lõi"
description: Pod, ReplicaSet, Deployment, Service — bốn tầng và lý do vì sao không gộp lại thành một.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, architecture]
---

[Cluster là gì](/blog/k8s/bat-dau-voi-k8s/cluster-la-gi) đã dựng bức tranh máy móc:
control plane quyết định, node thực thi. Note này đi vào thứ bạn thật sự gõ ra hằng
ngày — **các object**.

## Đơn vị nhỏ nhất không phải container

Đây là chỗ trượt đầu tiên của gần như tất cả mọi người:

> K8s không chạy container. Nó chạy **Pod**.

Một Pod là một hoặc nhiều container **luôn nằm cùng một máy**, dùng chung:

- **network namespace** — các container trong Pod gọi nhau qua `localhost`, và cả Pod chỉ có **một** IP
- **volume** — cùng mount được một thư mục
- **vòng đời** — sinh cùng nhau, chết cùng nhau

Nếu bạn đã đọc [namespace và cgroup](/blog/k8s/nen-tang/linux/namespace-va-cgroup),
Pod chính là *"một nhóm container chia chung một phần các namespace"* — không có phép
màu nào mới ở đây.

Đa số Pod chỉ có một container. Cái thứ hai xuất hiện khi có việc phải chạy **sát** app
đến mức không tách máy được: sidecar proxy, đẩy log, hoặc một init container chạy trước
rồi thoát.

## Bốn tầng, mỗi tầng một controller

```
Deployment          "tôi muốn version v2, đổi dần, đừng chết dịch vụ"
    │ tạo & quản
    ▼
ReplicaSet          "tôi muốn luôn có đúng 3 Pod của template này"
    │ tạo & quản
    ▼
  Pod               "tôi là một nhóm container trên một node"
    │ chứa
    ▼
Container           containerd chạy thật
```

Câu hỏi hợp lý: **sao không gộp làm một?** Vì mỗi tầng trông coi đúng một thứ, và
chúng đổi theo nhịp khác nhau:

| Tầng | Lo đúng một việc | Đổi khi nào |
| --- | --- | --- |
| Deployment | phiên bản và cách chuyển đổi | bạn đổi image |
| ReplicaSet | **số lượng** | scale, hoặc Pod chết |
| Pod | đặt container cạnh nhau | mỗi lần sinh lại |

Rolling update lộ rõ nhất vì sao cần tách: đổi image không phải sửa ReplicaSet cũ, mà là
**tạo một ReplicaSet mới** rồi tăng dần nó lên trong khi hạ dần cái cũ xuống. Hai
ReplicaSet cùng tồn tại một lúc — và đó cũng là cách rollback hoạt động: cái cũ vẫn còn
đó với `replicas: 0`, chỉ việc nâng lại.

```bash
kubectl get rs
```

```
NAME             DESIRED   CURRENT   READY   AGE
web-6d4f8b9c7d   3         3         3       30s   <- v2
web-7c9b5f4a21   0         0         0       12m   <- v1, giữ lại để rollback
```

## Pod không có địa chỉ đáng tin

Pod chết là mất luôn IP; Pod mới lên mang IP khác. Nên **không bao giờ** gọi Pod bằng
IP. Đó là lý do có Service:

- một **tên DNS ổn định** (`web.default.svc.cluster.local`) và một IP ảo không đổi
- một danh sách endpoint được K8s tự cập nhật mỗi khi Pod sinh/tử

Điểm cần đóng đinh: Service là load balancer **tầng 4** — nó không đọc HTTP, không biết
path, không phân biệt host. Muốn định tuyến theo `/api` thì phải lên tầng 7, tức
Ingress. Đúng ranh giới đã dựng ở [L4 và L7](/blog/k8s/nen-tang/mang/l4-vs-l7) và
[reverse proxy](/blog/k8s/nen-tang/mang/reverse-proxy).

## Sợi dây nối tất cả: label

Deployment không giữ danh sách Pod của nó. Service cũng không. Cả hai chỉ nói *"cái nào
mang nhãn này thì của tôi"*:

```yaml
spec:
  selector:
    matchLabels: { app: web }     # Deployment tìm Pod của mình
  template:
    metadata:
      labels: { app: web }        # Pod sinh ra mang nhãn đó
```

Ghép **lỏng** kiểu này là lý do bạn có thể thêm một Service mới trỏ vào Pod đang chạy
mà không phải sửa Deployment. Và cũng là lý do gõ sai một chữ trong label thì mọi thứ
vẫn `Running`, chỉ là Service rỗng không — không có lỗi nào báo cho bạn cả.

## Tự kiểm

- [ ] Giải thích được vì sao đơn vị nhỏ nhất là Pod chứ không phải container
- [ ] Kể được Deployment / ReplicaSet / Pod mỗi cái lo gì
- [ ] Nói được chuyện gì xảy ra với ReplicaSet cũ sau một lần rolling update
- [ ] Nói được vì sao Service không định tuyến được theo path

## Câu hỏi còn mở

- StatefulSet khác Deployment ở đâu, và vì sao DB cần nó?
- Service tìm ra Pod qua label — vậy ai ghi danh sách endpoint, và ghi lúc nào?
