---
title: "Làm việc với Label & Selector"
description: Thứ duy nhất nối các object với nhau trong K8s — và nó chỉ là chuỗi ký tự, không ai kiểm tra hộ.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, label, yaml]
---

Deployment tìm Pod bằng label. Service tìm Pod bằng label. Trong K8s **không có khoá
ngoại**, không có tham chiếu trực tiếp. Chỉ có nhãn và câu hỏi *"ai mang nhãn này?"*.

## Label là cặp key-value, và chỉ có thế

```yaml
metadata:
  labels:
    app: first-app
    tier: frontend
    env: dev
```

Không có danh sách hợp lệ, không ai kiểm tra chính tả. Gõ `frontent` thay vì `frontend`
thì K8s vẫn nhận — chỉ là không selector nào tìm ra nó nữa.

## Bài tập 1 — Lọc bằng selector

```bash
kubectl label deployment first-app tier=frontend env=dev --overwrite
kubectl label pods -l app=first-app tier=frontend --overwrite
```

**Đoán trước:** `-l tier=frontend,env=dev` là AND hay OR?

```bash
kubectl get pods -l tier=frontend
kubectl get pods -l 'tier=frontend,app=first-app'
kubectl get pods -l 'tier!=backend'
kubectl get pods -l 'app in (first-app, second-app)'
kubectl get pods -L tier,app
```

**Kết quả:** dấu phẩy là **AND**, không phải OR. Muốn OR thì dùng dạng tập hợp
`in (...)`.

Để ý hai cờ khác nhau một chữ hoa:

| Cờ | Làm gì |
| --- | --- |
| `-l` | **Lọc** — chỉ hiện object khớp |
| `-L` | **Hiện thêm cột** — không lọc gì |

`-L` rất hay khi cần nhìn nhãn của mọi thứ cùng lúc mà không nhớ giá trị nào tồn tại.

## Bài tập 2 — Đổi nhãn một Pod đang chạy

**Đoán trước:** lấy một Pod của Deployment, đổi nhãn `app` của nó thành thứ khác. Pod đó
bị xoá, hay được tha? Còn Deployment thì phản ứng ra sao?

```bash
POD=$(kubectl get pod -l app=first-app -o name | head -1) && kubectl label $POD app=bi-tha --overwrite
kubectl get pods -L app
```

**Kết quả:** Pod đó **vẫn sống**, nhưng đã ra khỏi gia đình. Và Deployment lập tức
**tạo thêm một Pod mới** để bù — vì nó đếm theo nhãn, giờ chỉ còn 2.

```
NAME                         READY   STATUS    AGE   APP
first-app-6d4f8b9c7d-c7wnp   1/1     Running   12m   first-app
first-app-6d4f8b9c7d-m4kt2   1/1     Running   12m   first-app
first-app-6d4f8b9c7d-p9x3k   1/1     Running   4s    first-app   <- vừa sinh
first-app-6d4f8b9c7d-x8k2p   1/1     Running   12m   bi-tha      <- mồ côi
```

Pod mồ côi đó giờ **không ai quản**: không bị scale, không bị rollout đụng tới, và cũng
không nằm trong Service nữa. Nó sẽ chạy mãi cho tới khi có người xoá tay.

**Vì sao quan trọng:** đây không phải trò vui — nó là kỹ thuật debug thật. Một Pod đang
lỗi mà bạn cần soi kỹ, đổi nhãn nó đi là **tách nó ra khỏi tuyến phục vụ** trong khi vẫn
giữ nguyên hiện trường, còn Deployment tự bù một Pod lành. Không mất dịch vụ, không mất
bằng chứng.

Dọn Pod mồ côi:

```bash
kubectl delete pod -l app=bi-tha
```

## Đặt nhãn cho tử tế

Có bộ nhãn khuyến nghị chung, dùng thì công cụ khác hiểu được:

```yaml
labels:
  app.kubernetes.io/name: first-app
  app.kubernetes.io/instance: first-app-dev
  app.kubernetes.io/version: "1.27"
  app.kubernetes.io/component: frontend
```

Tiền tố có dấu chấm là **không bắt buộc**, chỉ là quy ước để tránh đụng tên. Trong lab
thì `app: first-app` là đủ.

## Tự kiểm

- [ ] Nói được vì sao K8s không có khoá ngoại giữa các object
- [ ] Phân biệt được `-l` và `-L`
- [ ] Biết dấu phẩy là AND, và cách viết OR
- [ ] Dùng được mẹo đổi nhãn để tách một Pod lỗi ra khỏi Service

## Câu hỏi còn mở

- Annotation cũng là key-value — vì sao selector lại không đọc được nó?
- Xoá hẳn nhãn `app` khỏi một Pod (chứ không đổi giá trị) thì sao?
