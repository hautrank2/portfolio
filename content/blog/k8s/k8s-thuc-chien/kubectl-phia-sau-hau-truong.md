---
title: "kubectl: chuyện gì xảy ra phía sau"
description: kubectl không có quyền năng gì đặc biệt. Nó là một client HTTP — và chứng minh được trong hai lệnh.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, kubectl, api]
---

Cảm giác ban đầu là `kubectl` "điều khiển" cluster. Không. Nó chỉ **gửi HTTP request tới
api-server**, y hệt `curl`. Chứng minh được ngay bây giờ.

## Bài tập 1 — Xem đúng request kubectl gửi đi

**Đoán trước:** `kubectl get pods` gửi đi mấy request, tới URL nào, bằng method gì?

```bash
kubectl get pods -v=8 2>&1 | grep -E "GET|Request Headers|Response Status" | head
```

**Kết quả:** đại khái

```
GET https://127.0.0.1:6443/api/v1/namespaces/default/pods?limit=500
Response Status: 200 OK
```

Chỉ vậy. Một `GET`, một URL REST rất đoán được: `/api/v1/namespaces/<ns>/pods`. Cấu
trúc URL khớp đúng với cột `APIVERSION` bạn thấy trong `kubectl api-resources`.

`-v=8` là mức chi tiết in cả header và body. Rất đáng nhớ để debug lỗi phân quyền: bạn
thấy chính xác request nào bị `403` chứ không phải đoán.

## Bài tập 2 — Bỏ kubectl đi, gọi API bằng curl

**Đoán trước:** `curl https://127.0.0.1:6443/api/v1/pods` trực tiếp thì được gì? Dữ
liệu, hay bị chặn?

```bash
kubectl proxy --port=8001
```

Ở terminal khác:

```bash
curl -s localhost:8001/api/v1/namespaces/default/pods | head -20
```

**Kết quả:** JSON đầy đủ, đúng thứ `kubectl get pods` nhận được trước khi nó vẽ thành
bảng.

Gọi thẳng vào cổng 6443 mà không qua proxy thì bị từ chối, vì thiếu chứng chỉ client.
`kubectl proxy` mở một cửa **không cần xác thực ở phía bạn** rồi tự đính danh tính từ
kubeconfig vào. Chính vì thế đừng bao giờ mở nó ra ngoài `localhost`.

**Vì sao quan trọng:** hiểu điều này thì ba chuyện sau hết bí ẩn cùng lúc:

- Mọi thứ nói chuyện với K8s — Helm, ArgoCD, dashboard, controller bạn tự viết — đều
  chỉ gọi cùng REST API này. Không có kênh đặc quyền nào.
- Phân quyền (RBAC) áp ở tầng HTTP, nên `kubectl` **không thể** làm gì mà API không cho.
- `kubectl get pods -w` không phải vòng lặp hỏi lại. Nó là một request `?watch=true`
  giữ mở, api-server đẩy sự kiện xuống. Cùng cơ chế mà kubelet và mọi controller đang
  dùng.

## Ba tầng cần tách bạch

```
kubectl        chỉ dịch lệnh của bạn thành HTTP, rồi vẽ bảng
  │  HTTPS + chứng chỉ từ kubeconfig
  ▼
api-server     xác thực → phân quyền → kiểm tra hợp lệ → ghi etcd
  │
  ▼
controller     theo dõi thay đổi rồi hành động   <- việc THẬT xảy ra ở đây
```

Nên khi `kubectl apply` trả về `created`, **chưa có container nào chạy**. Nó chỉ nghĩa
là api-server đã ghi xong. Phần còn lại là việc của controller, và diễn ra sau đó.

## Tự kiểm

- [ ] Nói được kubectl thực chất là gì trong một câu
- [ ] Dùng được `-v=8` để xem request thật
- [ ] Giải thích được vì sao `apply` trả về ngay mà Pod vẫn `Pending`
- [ ] Nói được `-w` hoạt động bằng cơ chế gì

## Câu hỏi còn mở

- Nếu mọi client đều dùng chung API, vì sao vẫn cần client library (client-go)?
- `kubectl apply` tính ra phần khác biệt ở đâu — máy bạn hay server?
