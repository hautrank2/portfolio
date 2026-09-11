---
title: "5.17 Làm việc với Label & Selector"
description: Thứ duy nhất nối các object với nhau trong K8s — và nó chỉ là chuỗi ký tự, không ai kiểm tra hộ.
status: growing
created: 2026-08-25
updated: 2026-09-05
tags: [k8s, label, yaml]
---

> **Nối tiếp [note 5.16](/blog/k8s/k8s-in-action/pod-and-container-spec).** Đang có
> `second-app-deployment` (1 replica, nhãn `app=second-app` + `tier=backend`) và Pod trần
> `ke-la` chỉ mang `app=second-app`.

Deployment tìm Pod bằng label. Service tìm Pod bằng label. Trong K8s **không có khoá
ngoại**, không có tham chiếu trực tiếp. Chỉ có nhãn và câu hỏi *"ai đang mang nhãn này?"*.

## Label là cặp key-value, và chỉ có thế

```yaml
metadata:
  labels:
    app: second-app
    tier: backend
```

Không có danh sách hợp lệ, không ai kiểm tra chính tả. Gõ `backned` thay vì `backend` thì
K8s vẫn nhận — chỉ là không selector nào tìm ra nó nữa, và bạn không nhận được một dòng
cảnh báo nào.

Đó là lý do hai bài tập dưới đây đáng làm thật thay vì đọc lướt: **mọi lỗi label đều là
lỗi im lặng.**

## Bài tập 1 — Lọc bằng selector

Cho `ke-la` một nhãn nữa để có cái mà lọc:

```bash
kubectl label pod ke-la env=dev --overwrite
kubectl label pods -l tier=backend env=prod --overwrite
```

**Đoán trước:** `-l tier=backend,env=prod` là AND hay OR?

```bash
kubectl get pods -L app,tier,env
```

```bash
kubectl get pods -l 'tier=backend,env=prod'
```

```bash
kubectl get pods -l 'app=second-app'
```

```bash
kubectl get pods -l 'tier!=backend'
```

```bash
kubectl get pods -l 'env in (dev, prod)'
```

**Kết quả:** dấu phẩy là **AND**, không phải OR. Muốn OR thì dùng dạng tập hợp
`in (...)`.

Để ý hai cờ chỉ khác nhau một chữ hoa:

| Cờ | Làm gì |
| --- | --- |
| `-l` | **Lọc** — chỉ hiện object khớp |
| `-L` | **Hiện thêm cột** — không lọc gì |

`-L` rất hay khi cần nhìn nhãn của mọi thứ cùng lúc mà không nhớ giá trị nào tồn tại.
Trong ba bài tới bạn sẽ dùng nó liên tục để nhìn ai đang mang nhãn gì.

## Bài tập 2 — Đổi nhãn một Pod đang chạy

**Đoán trước:** lấy Pod của Deployment, đổi nhãn `tier` của nó thành thứ khác. Pod đó bị
xoá, hay được tha? Còn Deployment phản ứng ra sao?

```bash
kubectl scale deployment second-app-deployment --replicas=3
```

```bash
POD=$(kubectl get pod -l 'app=second-app,tier=backend' -o name | head -1) && kubectl label $POD tier=bi-tha --overwrite
```

```bash
kubectl get pods -L app,tier
```

**Kết quả:** Pod đó **vẫn sống**, nhưng đã ra khỏi gia đình. Và Deployment lập tức **tạo
thêm một Pod mới** để bù — vì nó đếm theo nhãn, mà giờ chỉ còn 2 Pod khớp selector.

```
NAME                                     READY   STATUS    AGE   APP          TIER
second-app-deployment-6b7f9c4d55-2wq4z   1/1     Running   4m    second-app   backend
second-app-deployment-6b7f9c4d55-h8kp1   1/1     Running   4m    second-app   backend
second-app-deployment-6b7f9c4d55-x3n7v   1/1     Running   3s    second-app   backend   <- vừa sinh
second-app-deployment-6b7f9c4d55-m4kt2   1/1     Running   4m    second-app   bi-tha    <- mồ côi
ke-la                                    1/1     Running   9m    second-app   <none>
```

Pod mồ côi giờ **không ai quản**: không bị scale, không bị rollout đụng tới, và cũng
không nằm trong Service nữa. Nó chạy mãi cho tới khi có người xoá tay.

Để ý cái tên vẫn còn hash `6b7f9c4d55` của ReplicaSet cũ — tên không nói lên quyền sở
hữu. Thứ quyết định là nhãn, và cả `ownerReferences`:

```bash
kubectl get pod -l tier=bi-tha -o jsonpath='{.items[0].metadata.ownerReferences}{"\n"}'
```

Vẫn còn trỏ về ReplicaSet cũ, nhưng ReplicaSet không đếm nó nữa vì nhãn đã lệch. Nhãn
thắng.

**Vì sao quan trọng:** đây không phải trò vui — nó là kỹ thuật debug thật. Một Pod đang
lỗi mà bạn cần soi kỹ, đổi nhãn nó đi là **tách nó ra khỏi tuyến phục vụ** trong khi vẫn
giữ nguyên hiện trường, còn Deployment tự bù một Pod lành. Không mất dịch vụ, không mất
bằng chứng.

Dọn Pod mồ côi và trả replicas về 1:

```bash
kubectl delete pod -l tier=bi-tha && kubectl scale deployment second-app-deployment --replicas=1
```

## Nhãn ở hai chỗ khác nhau, đừng lẫn

`deployment.yaml` có nhãn ở **hai** nơi, và chúng không phải một:

```yaml
metadata:
  name: second-app-deployment
  # labels: ở đây là nhãn CỦA DEPLOYMENT
spec:
  selector:
    matchLabels: ...             # điều kiện Deployment dùng để TÌM Pod
  template:
    metadata:
      labels: ...                # nhãn DÁN LÊN POD sinh ra
```

Nhãn của Deployment không ảnh hưởng gì tới việc nó tìm Pod. Nó chỉ để **bạn** lọc
Deployment. Đó là lý do `kubectl get deploy -l app=second-app` có thể ra rỗng trong khi
`kubectl get pods -l app=second-app` ra đầy — file mẫu này không đặt nhãn cho chính
Deployment.

```bash
kubectl get deploy -l app=second-app
```

```bash
kubectl label deployment second-app-deployment app=second-app tier=backend
```

Giờ mới lọc được cả hai bằng cùng một selector.

## Đặt nhãn cho tử tế

Có bộ nhãn khuyến nghị chung, dùng thì công cụ khác hiểu được:

```yaml
labels:
  app.kubernetes.io/name: second-app
  app.kubernetes.io/instance: second-app-dev
  app.kubernetes.io/version: "2"
  app.kubernetes.io/component: backend
```

Tiền tố có dấu chấm là **không bắt buộc**, chỉ là quy ước để tránh đụng tên giữa các
công cụ. Trong lab thì `app` + `tier` là đủ.

## Tự kiểm

- [ ] Nói được vì sao K8s không có khoá ngoại giữa các object
- [ ] Phân biệt được `-l` và `-L`
- [ ] Biết dấu phẩy là AND, và cách viết OR
- [ ] Phân biệt được nhãn của Deployment với nhãn trong `template`
- [ ] Dùng được mẹo đổi nhãn để tách một Pod lỗi ra khỏi Service

## Câu hỏi còn mở

- Annotation cũng là key-value — vì sao selector lại không đọc được nó?
- Xoá hẳn nhãn `tier` khỏi một Pod (chứ không đổi giá trị) thì sao?
- `ownerReferences` vẫn trỏ về ReplicaSet cũ — vậy xoá ReplicaSet đó thì Pod mồ côi có
  bị xoá theo không?
