---
title: Bắt đầu từ đâu khi bạn là dev frontend
description: Vì sao tôi học K8s, và thứ tự nào hợp lý khi không làm ops.
status: seed
created: 2026-08-18
updated: 2026-08-20
tags: [k8s, mindset]
---

Tôi làm frontend. Lý do học Kubernetes không phải để vận hành cluster production, mà vì
một chuyện rất cụ thể: mỗi lần app lên staging bị lỗi, tôi không đọc nổi thứ team ops
gửi qua Slack.

## Mục tiêu tôi đặt ra

Không phải "thành thạo K8s". Cụ thể hơn nhiều:

1. Đọc hiểu một file manifest bất kỳ trong repo của team
2. Tự debug được tới bước "Pod của tôi lỗi vì lý do X", thay vì chỉ báo "nó không chạy"
3. Deploy được một app Next.js lên cluster local từ số 0

## Môi trường tôi dùng

Không cần cloud, không tốn tiền. `kind` chạy cluster ngay trong Docker:

```bash
kind create cluster --name lab
kubectl cluster-info --context kind-lab
```

Xong thì kiểm tra:

```bash
kubectl get nodes
```

```
NAME                 STATUS   ROLES           AGE   VERSION
lab-control-plane    Ready    control-plane   40s   v1.31.0
```

## Thứ tự tôi thấy sai khi mới bắt đầu

Tôi nhảy thẳng vào `Deployment` và copy YAML từ blog. Kết quả là gõ được lệnh nhưng
không hiểu gì — vì `Deployment` chỉ có nghĩa khi đã hiểu `Pod`, mà `Pod` chỉ có nghĩa
khi đã hiểu container là gì ở mức kernel.

Nên roadmap này bắt đầu từ container, không phải từ `kubectl apply`.

## Câu hỏi còn mở

- `kind` khác `minikube` ở điểm nào đáng kể ngoài chuyện nó chạy node bằng container?
- Có nên học qua managed cluster (GKE/EKS) sớm không, hay để sau?
