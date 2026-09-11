---
title: "5.5 Object Deployment"
description: Vì sao không bao giờ tạo Pod trực tiếp, và ai thật sự giữ cho Pod sống lại.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, deployment, workload]
---

Bạn **có thể** tạo Pod trực tiếp. Chỉ là gần như không bao giờ nên. Note này chứng minh
lý do bằng một thí nghiệm hai dòng.

## Deployment lo cái gì

| Việc | Ai lo |
| --- | --- |
| Giữ đúng số bản sao | ReplicaSet, do Deployment tạo ra |
| Đổi sang image mới mà không chết dịch vụ | Deployment |
| Quay lại bản cũ | Deployment |
| Đặt container nào cạnh container nào | Pod |

Deployment **không trực tiếp** quản Pod. Nó quản ReplicaSet, ReplicaSet mới quản Pod —
ba tầng đã dựng ở
[Kiến trúc & khái niệm cốt lõi](/blog/k8s/getting-started/architecture-and-core-concepts).

## Bài tập — Pod trần và Pod có chủ

**Đoán trước:** tạo hai thứ cùng chạy `nginx` — một Pod trần và một Deployment. Xoá Pod
của cả hai. Cái nào mọc lại? Và cái mọc lại có **giữ nguyên tên** không?

```bash
kubectl run pod-tran --image=nginx:1.27-alpine
kubectl create deployment pod-co-chu --image=nginx:1.27-alpine
kubectl get pods
```

Giờ xoá cả hai Pod:

```bash
kubectl delete pod pod-tran
kubectl delete pod -l app=pod-co-chu
kubectl get pods
```

**Kết quả:**

```
NAME                          READY   STATUS    AGE
pod-co-chu-6b8d5f9c7d-k2m4x   1/1     Running   3s
```

`pod-tran` biến mất vĩnh viễn. `pod-co-chu` mọc lại — nhưng **tên hậu tố đã khác**.

Đây không phải "tự chữa lành". Không có gì hồi sinh Pod cũ cả: ReplicaSet muốn 1 Pod,
đếm được 0, nên **tạo một Pod hoàn toàn mới**. Pod cũ chết là chết thật.

Xem sợi dây sở hữu:

```bash
kubectl get pod -l app=pod-co-chu -o jsonpath='{.items[0].metadata.ownerReferences}'
```

`pod-tran` không có trường đó — nó là trẻ mồ côi, không ai chịu trách nhiệm.

**Vì sao quan trọng:** hệ quả trực tiếp là **đừng bao giờ trông cậy vào tên Pod hay IP
Pod**. Mỗi lần sinh lại là một danh tính mới. Cái ổn định duy nhất là **label** — và đó
chính là lý do Service tìm Pod bằng label chứ không bằng tên.

Dọn:

```bash
kubectl delete pod pod-tran --ignore-not-found && kubectl delete deployment pod-co-chu
```

## Khi nào thật sự dùng Pod trần

Gần như chỉ có hai: chạy một Pod tạm để soi (`kubectl run --rm -it`), và viết ví dụ
trong tài liệu. Ngoài ra thì không.

## Tự kiểm

- [ ] Giải thích được vì sao Pod mọc lại mang tên khác
- [ ] Nói được ai là chủ của một Pod, và tra được bằng lệnh nào
- [ ] Nói được vì sao không được dựa vào tên hoặc IP của Pod

## Câu hỏi còn mở

- DaemonSet và StatefulSet cũng sở hữu Pod — chúng khác Deployment chỗ nào?
- Xoá ReplicaSet mà giữ Deployment thì chuyện gì xảy ra?
