---
title: "5.14 Imperative vs Declarative"
description: Bản lề của cả module. Khác biệt gói gọn trong hai lệnh chạy hai lần.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, mindset, yaml]
---

Tới đây bạn đã dựng, phơi, scale, cập nhật và rollback `first-app` mà chưa viết dòng YAML
nào. Module sẽ làm lại **toàn bộ** bằng file. Note này giải thích vì sao đáng làm lại.

## Hai lối

| | Imperative | Declarative |
| --- | --- | --- |
| Bạn nói | *làm việc này* | *tôi muốn trạng thái này* |
| Lệnh | `create`, `scale`, `set image`, `expose` | `apply -f` |
| Trạng thái mong muốn nằm ở | trong đầu bạn và lịch sử shell | trong file, trong git |
| Chạy lại lần hai | lỗi | không sao |
| Review được không | không | có, như mọi pull request |

## Bài tập 1 — Khác biệt trong hai lệnh

**Đoán trước:** chạy `kubectl create deployment` hai lần liên tiếp. Lần hai ra gì? Rồi
`kubectl apply -f` hai lần — lần hai ra gì?

```bash
kubectl create deployment thu --image=nginx:1.27-alpine; kubectl create deployment thu --image=nginx:1.27-alpine
```

**Kết quả lần hai:** `Error from server (AlreadyExists)`.

```bash
cat > /tmp/thu.yaml <<'EOY'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thu2
spec:
  replicas: 1
  selector:
    matchLabels: { app: thu2 }
  template:
    metadata:
      labels: { app: thu2 }
    spec:
      containers:
        - name: web
          image: nginx:1.27-alpine
EOY
kubectl apply -f /tmp/thu.yaml; kubectl apply -f /tmp/thu.yaml
```

**Kết quả:** lần đầu `created`, lần hai `unchanged`. Không lỗi, và **không làm gì cả**.

Đó chính là **idempotent**, và là toàn bộ khác biệt. `create` mô tả một hành động, mà
hành động thì chỉ làm được một lần. `apply` mô tả một đích đến, mà đích đến thì nói bao
nhiêu lần cũng vẫn là chỗ đó.

Nhờ vậy `kubectl apply -f .` chạy được vô số lần trong CI mà không cần biết cái gì đã
tồn tại, cái gì chưa.

```bash
kubectl delete deployment thu thu2 && rm /tmp/thu.yaml
```

## Bài tập 2 — Vì sao imperative âm thầm gây hại

**Đoán trước:** bạn `kubectl scale --replicas=5` cho kịp giờ cao điểm. Hôm sau đồng
nghiệp `kubectl apply -f deployment.yaml` (file ghi `replicas: 2`). Chuyện gì xảy ra với
5 Pod đang chạy?

**Kết quả:** tụt thẳng về 2. Không cảnh báo, không hỏi lại. Vì `apply` làm đúng việc của
nó — đưa cluster về đúng thứ file mô tả. Thay đổi bằng tay của bạn không được ghi ở đâu
cả, nên với cluster nó không tồn tại.

Đây là kiểu sự cố khó truy nhất, vì **không ai làm gì sai**. Người scale làm đúng, người
apply cũng làm đúng. Sai ở chỗ có **hai nguồn sự thật**.

Đó là lý do quy tắc thực tế rất gọn: **thay đổi bằng tay chỉ để soi và để chữa cháy;
mọi thứ tồn tại lâu hơn một sự cố đều phải nằm trong file.**

## `apply` biết phải đổi gì bằng cách nào

Nó không ghi đè cả object. Server so ba bên: file bạn gửi, trạng thái đang chạy, và bản
`apply` gần nhất mà nó nhớ. Chỉ những trường bạn thực sự khai mới bị đụng tới — nên
`apply` không xoá mất trường do controller tự điền.

Xem trước khi làm:

```bash
kubectl diff -f /tmp/thu.yaml
```

Nên thành phản xạ: `diff` trước, `apply` sau.

## Tự kiểm

- [ ] Giải thích được idempotent bằng đúng ví dụ `create` vs `apply`
- [ ] Kể được kịch bản `scale` bằng tay bị `apply` xoá mất
- [ ] Nói được vì sao "hai nguồn sự thật" là gốc của vấn đề
- [ ] Dùng `kubectl diff` trước khi apply

## Câu hỏi còn mở

- `kubectl edit` thuộc lối nào?
- Trường do controller tự điền (như `clusterIP`) mà bạn khai khác đi thì sao?
