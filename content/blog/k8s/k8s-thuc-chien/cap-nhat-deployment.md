---
title: "5.12 Cập nhật Deployment"
description: Rolling update nhìn từ bên trong — hai ReplicaSet cùng sống, và hai con số quyết định nhịp.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, deployment, rollout]
---

Đổi image không phải "sửa Pod". Không có Pod nào được sửa cả — **Pod là bất biến**.
Cái xảy ra là một ReplicaSet mới ra đời và hai bên đổi ca cho nhau.

## Bài tập 1 — Nhìn hai ReplicaSet đổi ca

**Đoán trước:** trong lúc đổi từ 3 Pod cũ sang 3 Pod mới, tổng số Pod cao nhất là bao
nhiêu? Đúng 3, hay hơn?

Mở terminal thứ hai:

```bash
kubectl get rs -l app=first-app -w
```

Terminal đầu — nhớ là tên container trùng tên deployment:

```bash
kubectl set image deployment/first-app first-app=nginx:1.28-alpine
```

**Kết quả:** ReplicaSet cũ tụt dần 3→2→1→0 trong khi cái mới lên 0→1→2→3, **xen kẽ nhau**
chứ không tuần tự. Tổng số Pod có lúc lên tới **4**.

Vì mặc định của `strategy: RollingUpdate` là:

| Tham số | Mặc định | Nghĩa |
| --- | --- | --- |
| `maxSurge` | 25% | Được vượt quá `replicas` bao nhiêu |
| `maxUnavailable` | 25% | Được thiếu bao nhiêu so với `replicas` |

Với `replicas: 3`, 25% làm tròn lên thành 1: nhiều nhất 4 Pod, ít nhất 2 Pod sẵn sàng.
Đó là lý do dịch vụ không có phút nào chết hẳn.

Theo dõi có sẵn lệnh riêng, dừng đúng lúc xong:

```bash
kubectl rollout status deployment/first-app
```

## Bài tập 2 — Xác nhận đã đổi thật

**Đoán trước:** `kubectl get deploy` hiện `UP-TO-DATE 3` nghĩa là image mới đã chạy?

```bash
kubectl exec deploy/first-app -- nginx -v
```

**Kết quả:** in ra đúng phiên bản mới. Đây là kiểm tra đáng tin hơn hẳn cột
`UP-TO-DATE` — cột đó chỉ nói *"Pod đã được tạo theo template mới nhất"*, không nói gì
về việc bên trong container thật sự là gì.

## Bài tập 3 — Cập nhật mà không đổi gì

**Đoán trước:** chạy lại đúng lệnh `set image` với **cùng** tag. Có rollout mới không?

```bash
kubectl set image deployment/first-app first-app=nginx:1.28-alpine
```

**Kết quả:** `deployment.apps/first-app image updated` — nhưng `kubectl get rs` cho thấy
**không có ReplicaSet mới**, không Pod nào bị thay.

Vì ReplicaSet được định danh bằng **hash của Pod template**. Template không đổi thì hash
không đổi, hash không đổi thì không có gì để tạo. Cũng vì vậy mà "restart deployment"
không phải một lệnh có sẵn — muốn ép thì:

```bash
kubectl rollout restart deployment/first-app
```

Lệnh này lén thêm một annotation timestamp vào template, làm hash đổi, và rollout diễn
ra như bình thường. Một mẹo, không phải cơ chế riêng.

## Cạm bẫy `:latest`

```bash
kubectl set image deployment/first-app first-app=nginx:latest
```

Tag di động là thảm hoạ: đẩy image mới lên cùng tag thì template **không đổi**, hash
không đổi, K8s không thấy có gì để làm. Pod chỉ nhận bản mới khi tình cờ được tạo lại vì
lý do khác — nên cụm Pod chạy hai phiên bản khác nhau mà không ai hay.

Quy tắc: **luôn dùng tag bất biến** (`v1.4.2`) hoặc digest. Cùng bài học ở
[tag vs digest](/blog/k8s/nen-tang/container/tag-vs-digest).

## Tự kiểm

- [ ] Giải thích được vì sao tổng số Pod tạm thời vượt `replicas`
- [ ] Nói được `maxSurge` và `maxUnavailable` mặc định là bao nhiêu
- [ ] Giải thích được vì sao set cùng một image hai lần thì lần hai không làm gì
- [ ] Nói được vì sao `:latest` nguy hiểm trong Deployment

## Câu hỏi còn mở

- `maxUnavailable: 0` thì cần thêm điều kiện gì để rollout không kẹt?
- Rollout đang chạy dở mà bạn `set image` lần nữa thì sao?
