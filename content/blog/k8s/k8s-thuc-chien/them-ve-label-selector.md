---
title: "5.21 Thêm về Label & Selector"
description: matchExpressions, và một trường bạn sẽ không bao giờ sửa được sau khi tạo.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, label, yaml]
---

Note trước dùng label ở mức `key=value`. Còn một dạng nữa, và một cái bẫy đáng biết
trước khi dính.

## `matchExpressions` — điều kiện phức tạp hơn

```yaml
spec:
  selector:
    matchLabels:
      app: first-app
    matchExpressions:
      - key: tier
        operator: In
        values: [frontend, web]
      - key: deprecated
        operator: DoesNotExist
```

Bốn toán tử: `In`, `NotIn`, `Exists`, `DoesNotExist`. Mọi điều kiện — kể cả `matchLabels`
— đều ghép bằng **AND**.

Hai toán tử `Exists` / `DoesNotExist` không cần `values`, và rất hợp cho kiểu nhãn dùng
làm cờ:

```bash
kubectl get pods -l 'canary'          # có nhãn canary, giá trị gì cũng được
kubectl get pods -l '!canary'         # không có nhãn canary
```

## Bài tập 1 — Trường không bao giờ sửa được

**Đoán trước:** Deployment đang chạy, bạn muốn đổi `selector.matchLabels` từ
`app: first-app` sang `app: web`. Apply sẽ rolling update sang nhãn mới, hay báo lỗi?

```bash
sed 's/app: first-app/app: web/g' k8s/deployment.yaml | kubectl apply -f - 2>&1 | tail -3
```

**Kết quả:** bị chặn thẳng:

```
The Deployment "first-app" is invalid: spec.selector: Invalid value: ...
  field is immutable
```

`spec.selector` của Deployment là **bất biến** kể từ `apps/v1`. Lý do rất thực tế: đổi
selector nghĩa là Deployment lập tức mất dấu toàn bộ Pod hiện có — chúng thành mồ côi,
còn nó thì đẻ một lứa mới. Cấm hẳn là an toàn hơn cho phép rồi để người ta tự bắn vào
chân.

**Cách duy nhất** là xoá và tạo lại, tức có downtime, trừ khi bạn dựng Deployment mới
song song rồi chuyển Service sang.

**Vì sao quan trọng:** đây là lý do đáng bỏ ra ba mươi giây suy nghĩ về bộ nhãn **ngay
lần đầu**. Gần như mọi thứ trong K8s sửa được lúc chạy; cái này thì không.

## Bài tập 2 — Selector bắt nhầm Pod của app khác

**Đoán trước:** hai Deployment khác nhau nhưng cùng đặt nhãn `tier: frontend`, rồi một
Service chỉ chọn theo `tier: frontend`. Chuyện gì xảy ra?

```bash
kubectl create deployment app-khac --image=nginx:1.27-alpine
kubectl label deployment app-khac tier=frontend --overwrite
kubectl label pods -l app=app-khac tier=frontend --overwrite
kubectl label pods -l app=first-app tier=frontend --overwrite
```

```bash
kubectl get endpointslice -l kubernetes.io/service-name=first-app -o jsonpath='{.items[0].endpoints[*].addresses}{"\n"}'
kubectl get pods -l tier=frontend -L app
```

**Kết quả:** Service `first-app` vẫn chỉ bắt Pod `app=first-app`, vì selector của nó khai
`app: first-app`. Nhưng nếu bạn *đã* viết selector là `tier: frontend` thì lúc này nó
đang cân tải sang cả một app hoàn toàn khác — **không lỗi, không cảnh báo**, chỉ là một
phần request nhận về nội dung sai.

Đây là loại sự cố tệ nhất trong K8s: mọi thứ xanh, chỉ có kết quả là sai.

Quy tắc: **selector phải đủ hẹp để chỉ định danh một workload.** Nhãn mô tả chung
(`tier`, `env`) dùng để *lọc khi xem*, không dùng để *ghép nối*.

Dọn:

```bash
kubectl delete deployment app-khac
```

## Tự kiểm

- [ ] Viết được `matchExpressions` với bốn toán tử
- [ ] Nhớ rằng `spec.selector` của Deployment bất biến, và nói được vì sao
- [ ] Phân biệt được nhãn dùng để ghép nối và nhãn dùng để lọc

## Câu hỏi còn mở

- `selector` của Service có bất biến không? Vì sao khác Deployment?
- Đổi nhãn trong `template.metadata.labels` mà giữ nguyên selector thì sao?
