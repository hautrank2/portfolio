---
title: "Deployment đầu tiên — kiểu imperative"
description: Một lệnh, ba object. Đây là app sẽ theo bạn suốt cả module.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, deployment, kubectl]
---

Đây là chỗ `first-app` ra đời. Nó sống suốt module này — scale, cập nhật, rollback, viết
lại thành YAML, gắn probe. **Đừng xoá nó** cho tới note tóm tắt.

## Một lệnh

```bash
kubectl create deployment first-app --image=nginx:1.27-alpine
```

Container bên trong được đặt tên **trùng tên deployment** — `first-app`. Chi tiết vụn
vặt này sẽ cần tới ở note cập nhật image, nên nhớ lấy.

## Bài tập 1 — Một lệnh tạo ra bao nhiêu object

**Đoán trước:** lệnh trên tạo ra mấy object? Một (Deployment), hay nhiều hơn?

```bash
kubectl get all
```

**Kết quả:** **ba**.

```
NAME                             READY   STATUS    AGE
pod/first-app-5c9d8b7f4d-x8k2p   1/1     Running   20s

NAME                        READY   UP-TO-DATE   AVAILABLE
deployment.apps/first-app   1/1     1            1

NAME                                   DESIRED   CURRENT   READY
replicaset.apps/first-app-5c9d8b7f4d   1         1         1
```

Bạn tạo **một**, hai cái còn lại do controller tạo — đúng bước 3 và 4 trong
[bảy bước của một apply](/blog/k8s/bat-dau-voi-k8s/master-node).

Để ý chuỗi `5c9d8b7f4d` xuất hiện ở cả tên ReplicaSet và tên Pod. Đó là **hash của Pod
template**. Đổi image là hash đổi, nên ReplicaSet mới có tên mới — cơ chế nền của rolling
update.

## Bài tập 2 — Nhìn Pod đi qua các trạng thái

**Đoán trước:** giữa lúc gõ lệnh và lúc `Running`, Pod đi qua mấy trạng thái?

Mở một terminal thứ hai:

```bash
kubectl get pods -w
```

Rồi ở terminal đầu:

```bash
kubectl create deployment tam --image=nginx:1.27-alpine
```

**Kết quả:** `Pending` → `ContainerCreating` → `Running`.

Ba trạng thái ứng đúng với ba bên khác nhau đang làm việc:

| Trạng thái | Ai đang bận | Kẹt ở đây nghĩa là |
| --- | --- | --- |
| `Pending` | scheduler chưa chọn được node | Không node nào đủ chỗ, hoặc có taint |
| `ContainerCreating` | kubelet đang kéo image | Mạng chậm, sai tên image, thiếu quyền registry |
| `Running` | — | Container đã chạy (**chưa chắc app đã sẵn sàng**) |

Biết Pod kẹt ở đâu là biết ngay phải đi hỏi ai. Đây là bảng bạn sẽ dùng nhiều nhất
trong đời làm K8s.

```bash
kubectl delete deployment tam
```

## Bài tập 3 — describe là nơi có câu trả lời

```bash
kubectl describe pod -l app=first-app | tail -15
```

**Vì sao quan trọng:** phần `Events` ở cuối là **nhật ký của kubelet và scheduler cho
riêng Pod này** — `Scheduled`, `Pulling`, `Pulled`, `Created`, `Started`. Chín trên
mười lần Pod không lên, nguyên nhân nằm nguyên văn ở đó, không cần đoán.

Nhớ là Events chỉ giữ khoảng một giờ. Pod hỏng từ hôm qua thì mục này rỗng.

## Tự kiểm

- [ ] Nói được một lệnh `create deployment` sinh ra ba object nào
- [ ] Giải thích được chuỗi hash trong tên ReplicaSet đến từ đâu
- [ ] Ứng mỗi trạng thái Pod với thành phần đang chịu trách nhiệm
- [ ] Phản xạ đầu tiên khi Pod không lên là `describe`, không phải `logs`

## Câu hỏi còn mở

- `Running` mà app chưa phục vụ được thì cột nào cho biết? (gợi ý: `READY 0/1`)
- Vì sao `kubectl get all` lại không hề "all" — Secret, ConfigMap, Ingress đâu?
