---
title: "5.15 Viết file cấu hình Deployment"
description: Bốn trường bắt buộc, và một lỗi kinh điển K8s bắt được ngay từ lúc apply.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, yaml, deployment]
---

Giờ dựng lại `first-app` bằng file. Xoá bản imperative đi để không lẫn:

```bash
kubectl delete deployment first-app
```

Service thì **giữ lại** — sẽ tự bắt được Pod mới, và đó là một điểm đáng thấy tận mắt.

## File tối thiểu

```yaml
apiVersion: apps/v1          # Deployment ở nhóm apps, không phải v1
kind: Deployment
metadata:
  name: first-app
spec:
  replicas: 3
  selector:                  # Deployment tìm Pod của nó bằng cái này
    matchLabels:
      app: first-app
  template:                  # từ đây trở xuống là một Pod
    metadata:
      labels:
        app: first-app       # PHẢI khớp matchLabels ở trên
    spec:
      containers:
        - name: first-app
          image: nginx:1.27-alpine
```

Lưu thành `deployment.yaml` rồi:

```bash
kubectl apply -f deployment.yaml && kubectl get pods -l app=first-app
```

## Bài tập 1 — Service tự bắt lại Pod mới

**Đoán trước:** Service `first-app` tạo từ note trước vẫn còn, trong khi Deployment đã bị
xoá rồi dựng lại. Có phải tạo lại Service không?

```bash
PORT=$(kubectl get svc first-app -o jsonpath='{.spec.ports[0].nodePort}') && curl -s -o /dev/null -w '%{http_code}\n' localhost:$PORT
```

**Kết quả:** `200`, không phải làm gì cả.

Service không hề biết Deployment tồn tại. Nó chỉ hỏi *"Pod nào mang nhãn `app=first-app`?"*
Pod mới mang đúng nhãn đó nên tự động vào danh sách. **Ghép bằng label, không ghép bằng
tên** — nói ở note kiến trúc, giờ thì thấy hệ quả.

## Bài tập 2 — Cố tình cho selector lệch khỏi labels

**Đoán trước:** đổi `matchLabels` thành `app: sai` mà giữ nguyên nhãn trong `template`.
Apply được không? Nếu hỏng thì hỏng lúc nào — lúc apply, hay lúc Pod chạy?

```bash
sed 's/^      app: first-app$/      app: sai/' deployment.yaml | kubectl apply -f - 2>&1 | tail -3
```

**Kết quả:** api-server **từ chối ngay tại chỗ**:

```
The Deployment "first-app" is invalid: spec.template.metadata.labels:
Invalid value: ... `selector` does not match template `labels`
```

Đây là một trong số ít lỗi K8s bắt được **trước khi** có gì chạy, và lý do rất rõ: một
Deployment mà selector không khớp template sẽ đẻ ra Pod rồi lập tức không nhận ra chúng
là của mình — đếm mãi vẫn thấy 0, nên tạo tiếp, vô hạn. Không cho tạo là đúng.

Đối chiếu với bài `targetPort` sai ở
[Exposing một Deployment với một Service](/blog/k8s/k8s-thuc-chien/phoi-deployment-bang-service):
chỗ đó K8s **không** bắt được, vì nó không có cách nào biết container nghe cổng nào.
Ranh giới giữa hai loại lỗi này đáng nhớ.

## Bài tập 3 — Xem cluster điền thêm những gì

**Đoán trước:** file bạn gửi 20 dòng. Object trong cluster có bao nhiêu dòng?

```bash
kubectl get deployment first-app -o yaml | wc -l
```

**Kết quả:** thường **trên 60**. Phần thừa là mặc định do server điền —
`strategy.rollingUpdate`, `terminationGracePeriodSeconds`, `imagePullPolicy`,
`revisionHistoryLimit`, cộng toàn bộ `status`.

Nên nhớ: **file của bạn là tập con**, không phải bản sao của object. Đừng bao giờ
`get -o yaml` rồi lưu lại làm file nguồn — bạn sẽ mang theo cả `status` và
`resourceVersion`, những thứ không thuộc về bạn.

## Tự kiểm

- [ ] Viết được Deployment YAML từ đầu, không nhìn
- [ ] Giải thích được vì sao `selector` phải khớp `template.labels`
- [ ] Nói được vì sao Service không cần sửa khi Deployment bị dựng lại
- [ ] Phân biệt được lỗi K8s bắt được lúc apply và lỗi nó không thể bắt

## Câu hỏi còn mở

- Bỏ hẳn `selector` đi thì sao — có mặc định không?
- Vì sao `apiVersion` của Deployment là `apps/v1` mà Pod chỉ là `v1`?
