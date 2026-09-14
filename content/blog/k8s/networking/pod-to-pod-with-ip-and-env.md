---
title: "7.7 Pod gọi Pod bằng IP & biến môi trường"
description: Hai cách đầu tiên để nối hai Pod — và cả hai đều gãy, mỗi cái một kiểu.
status: growing
created: 2026-09-14
updated: 2026-09-14
tags: [k8s, network, service, env]
---

Hai Pod **khác nhau** thì `localhost` không còn tác dụng — mỗi Pod một network namespace,
một IP riêng. Note này đi qua hai cách nối đầu tiên, và cho bạn thấy chúng gãy ở đâu.

Dựng hai bên để thử:

```bash
kubectl create deployment backend --image=nginx:1.27-alpine --port=80 && kubectl expose deployment backend --port=80
```

```bash
kubectl run caller --image=busybox:1.36 --restart=Never -- sh -c 'sleep 3600'
```

## Cách 1 — Ghi thẳng IP của Pod

```bash
BE=$(kubectl get pod -l app=backend -o jsonpath='{.items[0].status.podIP}') && echo $BE && kubectl exec caller -- wget -qO- http://$BE | head -3
```

Chạy được. Giờ giết Pod backend:

```bash
kubectl delete pod -l app=backend && sleep 6 && kubectl exec caller -- wget -qO- -T 3 http://$BE 2>&1 | tail -2
```

**Kết quả:** treo rồi timeout. IP cũ trỏ vào hư không, Pod mới đã mang IP khác.

Nếu IP đó nằm trong code hay trong `deployment.yaml`, bạn phải **sửa tay và deploy lại**
mỗi lần Pod backend sinh lại — mà Pod sinh lại là chuyện xảy ra hằng ngày. Cách này chỉ
tồn tại để bạn thấy nó sai.

## Cách 2 — Biến môi trường K8s tự sinh

K8s tự bơm thông tin của **mọi Service đang tồn tại** vào biến môi trường của Pod mới:

```bash
kubectl exec caller -- printenv | grep BACKEND
```

```
BACKEND_SERVICE_HOST=10.43.201.55
BACKEND_SERVICE_PORT=80
BACKEND_PORT_80_TCP_ADDR=10.43.201.55
```

Quy tắc đặt tên: **tên Service viết hoa, gạch ngang thành gạch dưới**, rồi thêm hậu tố.
`auth-api` → `AUTH_API_SERVICE_HOST`.

Dùng được ngay, và trỏ vào ClusterIP nên **không gãy khi Pod đổi IP**:

```bash
kubectl exec caller -- sh -c 'wget -qO- http://$BACKEND_SERVICE_HOST:$BACKEND_SERVICE_PORT' | head -3
```

Tốt hơn hẳn cách 1. Nhưng nó có một lỗ hổng chí mạng.

## Bài tập — Chỗ cách 2 gãy

**Đoán trước:** tạo một Service **mới** ngay bây giờ. Pod `caller` đang chạy có nhận được
biến môi trường của Service đó không?

```bash
kubectl create deployment other --image=nginx:1.27-alpine --port=80 && kubectl expose deployment other --port=80
```

```bash
kubectl exec caller -- printenv | grep -c OTHER
```

**Kết quả:** `0`. Không có biến nào cả.

Biến môi trường được bơm vào **đúng một lần, lúc container khởi động**. Service tạo sau đó
thì Pod đang chạy không bao giờ biết tới — y hệt chuyện ConfigMap ở
[note 6.15](/blog/k8s/data-and-volumes/environment-variables-and-configmap).

```bash
kubectl delete pod caller && kubectl run caller --image=busybox:1.36 --restart=Never -- sh -c 'sleep 3600' && sleep 8 && kubectl exec caller -- printenv | grep -c OTHER
```

Giờ mới có. **Thứ tự tạo quyết định kết quả** — và trong một cụm thật, bạn không kiểm
soát được thứ tự đó: Pod bị dời node, scale, rollout đều sinh lại vào những thời điểm
ngẫu nhiên.

## Hai cách, hai kiểu gãy

| Cách | Gãy khi nào | Triệu chứng |
| --- | --- | --- |
| **IP thủ công** | Pod backend sinh lại | Timeout, phải sửa tay |
| **Biến môi trường** | Service tạo **sau** Pod | Biến không tồn tại, app crash lúc đọc |

Cái thứ hai khó chịu hơn vì nó **không phải lúc nào cũng sai** — deploy theo đúng thứ tự
thì chạy ngon, và lỗi chỉ xuất hiện vài tuần sau khi có một lần restart không may.

Còn một phiền toái nữa: cụm có 50 Service thì mỗi Pod nhận **hàng trăm** biến môi trường
nó không dùng tới.

```bash
kubectl exec caller -- printenv | wc -l
```

## Dọn

```bash
kubectl delete deployment backend other; kubectl delete svc backend other; kubectl delete pod caller
```

## Self-check

- [ ] Nói được vì sao `localhost` không dùng được giữa hai Pod
- [ ] Suy ra được tên biến môi trường từ tên Service
- [ ] Giải thích được vì sao biến môi trường phụ thuộc thứ tự tạo
- [ ] Nói được vì sao lỗi kiểu đó khó phát hiện hơn lỗi sai IP

## Open questions

- Tắt hẳn việc bơm biến môi trường được không? (gợi ý: `enableServiceLinks`)
- Nếu cả hai cách đều gãy, cách thứ ba dựa vào cái gì để không gãy?
