---
title: "5.12 Cập nhật Deployment"
description: Sửa một dòng code, build tag mới, rồi xem hai ReplicaSet đổi ca mà dịch vụ không đứt giây nào.
status: growing
created: 2026-08-25
updated: 2026-09-04
tags: [k8s, deployment, rollout, image]
---

> **Cần làm xong [note 5.11](/blog/k8s/k8s-in-action/scaling) trước.** Nên để
> `replicas: 3` — rolling update chỉ lộ ra hết khi có nhiều hơn một Pod.

Đổi image không phải "sửa Pod". Không có Pod nào được sửa cả — **Pod là bất biến**. Cái
xảy ra là một ReplicaSet mới ra đời và hai bên đổi ca cho nhau.

## Bước 1 — Sửa code

Mở `app.js`, đổi câu chào để lát nữa nhìn là biết ngay bản nào đang chạy:

```js
app.get('/', (req, res) => {
  res.send(`
    <h1>Hello from this NodeJS app! -- phien ban 2</h1>
    <p>Try sending a request to /error and see what happens</p>
  `);
});
```

## Bước 2 — Build với tag MỚI

Đây là chỗ quyết định cả bài. Tag phải khác lần trước:

```bash
cd ~/k8s-lab/first-app && docker build -t hautrank2/kub-first-app:2 .
```

```bash
docker save hautrank2/kub-first-app:2 | sudo k3s ctr images import -
```

Vẫn phải import như [note 5.9](/blog/k8s/k8s-in-action/exposing-a-deployment-with-a-service) —
build lại là kho containerd lại lạc hậu.

## Bước 3 — Lấy đúng tên container

Lệnh `set image` nhận **tên container bên trong Pod**, không phải tên deployment. Lấy nó
ra:

```bash
kubectl get deploy first-app -o jsonpath='{.spec.template.spec.containers[*].name}{"\n"}'
```

**Kết quả:** `kub-first-app`.

Cách xem khác, thấy luôn cả image đang dùng:

```bash
kubectl describe deploy first-app | grep -A2 "Containers:"
```

## Bước 4 — Đổi image và nhìn nó lăn

Mở terminal thứ hai, để nguyên đó:

```bash
kubectl get pods -w
```

**Đoán trước:** trong lúc đổi từ 3 Pod cũ sang 3 Pod mới, tổng số Pod cao nhất là bao
nhiêu? Đúng 3, hay hơn?

Terminal đầu:

```bash
kubectl set image deployment/first-app kub-first-app=hautrank2/kub-first-app:2
```

**Kết quả:** Pod mới mọc lên **trước khi** Pod cũ chết, xen kẽ nhau. Tổng số Pod có lúc
lên tới **4**.

```bash
kubectl get rs -l app=first-app
```

```
NAME                   DESIRED   CURRENT   READY   AGE
first-app-57d69676b9   0         0         0       48m
first-app-6c4b8d9f77   3         3         3       35s
```

**Hai ReplicaSet cùng tồn tại.** Cái cũ bị vắt về 0 nhưng không bị xoá — nó là bản ghi
lịch sử, và là thứ để rollback ở note sau.

Nhịp đổi ca do hai con số quyết định:

| Tham số | Mặc định | Nghĩa |
| --- | --- | --- |
| `maxSurge` | 25% | Được vượt quá `replicas` bao nhiêu |
| `maxUnavailable` | 25% | Được thiếu bao nhiêu so với `replicas` |

Với `replicas: 3`, 25% làm tròn lên thành 1: nhiều nhất 4 Pod, ít nhất 2 Pod sẵn sàng.
Đó là lý do dịch vụ **không đứt giây nào** — khác hẳn cảnh một Pod chết ở
[note 5.10](/blog/k8s/k8s-in-action/container-restarts).

Lệnh theo dõi riêng, tự dừng đúng lúc xong:

```bash
kubectl rollout status deployment/first-app
```

## Bước 5 — Xác nhận bằng mắt

Mở lại `http://192.168.103.154:8080` và F5 vài lần. Phải thấy `-- phien ban 2`.

Đừng tin cột `UP-TO-DATE` trong `kubectl get deploy`: nó chỉ nói *"Pod đã được tạo theo
template mới nhất"*, không nói gì về nội dung thật bên trong container. Muốn chắc thì hỏi
thẳng:

```bash
kubectl exec deploy/first-app -- cat /app/app.js | grep h1
```

## Bài tập — Cập nhật mà không đổi gì

**Đoán trước:** chạy lại đúng lệnh `set image` với **cùng** tag `:2`. Có rollout mới
không?

```bash
kubectl set image deployment/first-app kub-first-app=hautrank2/kub-first-app:2; kubectl get rs -l app=first-app
```

**Kết quả:** kubectl in ra `image updated`, nhưng **không có ReplicaSet mới**, không Pod
nào bị thay.

Vì ReplicaSet được định danh bằng **hash của Pod template**. Template không đổi thì hash
không đổi, hash không đổi thì không có gì để tạo. Đây cũng là lý do "restart deployment"
không phải một cơ chế riêng — muốn ép thì:

```bash
kubectl rollout restart deployment/first-app
```

Lệnh này lén thêm một annotation timestamp vào template, làm hash đổi, và rollout diễn ra
như bình thường. Một mẹo, không phải tính năng.

## Vì sao bắt buộc phải đổi tag

Đây là hệ quả trực tiếp của bài tập trên, và là lỗi tốn nhiều giờ nhất trong cả module.

Giả sử bạn build lại code mới nhưng **giữ nguyên tag `:1`**, rồi import vào containerd.
Deployment vẫn ghi `hautrank2/kub-first-app:1` — y hệt trước. Template không đổi → hash
không đổi → **K8s không thấy có việc gì để làm**. Pod cũ chạy tiếp với code cũ, và không
có thông báo lỗi nào cả.

Tệ hơn: Pod nào tình cờ được tạo lại vì lý do khác (crash, scale, dời node) sẽ nhận bản
mới. Kết quả là cụm chạy **hai phiên bản code khác nhau dưới cùng một tag**, và không ai
biết Pod nào là bản nào.

Với `:latest` thì còn thêm một tầng hỏng nữa: `imagePullPolicy` mặc định thành `Always`,
kubelet bỏ qua image có sẵn trong containerd để đi hỏi registry — và lab local không có
registry, nên Pod rơi thẳng vào `ImagePullBackOff`. Đúng cái bẫy ở
[note 5.6](/blog/k8s/k8s-in-action/first-deployment-imperative).

Quy tắc gọn: **mỗi lần build là một tag mới, bất biến.** `:1`, `:2`, `:v1.4.2`, hoặc
digest. Cùng bài học ở
[tag vs digest](/blog/k8s/foundations/container/tag-vs-digest).

## Self-check

- [ ] Lấy được tên container mà không cần đoán, và nói được nó sinh ra từ đâu
- [ ] Giải thích được vì sao tổng số Pod tạm thời vượt `replicas`
- [ ] Nói được `maxSurge` và `maxUnavailable` mặc định là bao nhiêu
- [ ] Giải thích được vì sao build code mới mà giữ tag cũ thì không có gì xảy ra
- [ ] Nói được vì sao ReplicaSet cũ không bị xoá sau khi rollout xong

## Open questions

- `maxUnavailable: 0` thì cần thêm điều kiện gì để rollout không kẹt?
- Rollout đang chạy dở mà bạn `set image` lần nữa thì sao?
- Hai ReplicaSet cùng sống — vậy trong lúc rollout, request rơi vào bản cũ hay bản mới?
