---
title: "Thêm Pod spec và Container spec"
description: Ba chữ `spec` lồng nhau, và cách tra tài liệu ngay trong terminal thay vì mở Google.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, yaml, deployment]
---

Chỗ làm người mới hoa mắt nhất trong YAML của K8s là **`spec` lồng trong `spec` lồng
trong `spec`**. Nhìn ra được ba tầng đó thì file nào cũng đọc trôi.

## Ba tầng, mỗi tầng thuộc về một object khác nhau

```yaml
kind: Deployment
spec:                      # ① spec của DEPLOYMENT — replicas, selector, strategy
  replicas: 3
  template:                # ② một POD TEMPLATE — có metadata riêng
    metadata:
      labels: { app: first-app }
    spec:                  # ③ spec của POD — volumes, restartPolicy, nodeSelector
      containers:          #    và danh sách CONTAINER
        - name: first-app  # ④ spec của MỘT container — image, ports, env, probe
          image: nginx:1.27-alpine
```

Cách đọc: **từ `template` trở xuống không còn là Deployment nữa.** Đó là bản thiết kế
của một Pod, dán nguyên vào. Cắt phần đó ra, thêm `kind: Pod` lên đầu là có một Pod chạy
được ngay.

Vì thế câu hỏi kiểu *"đặt `volumes` ở đâu"* luôn có cùng một cách trả lời: hỏi nó thuộc
về **object nào**. Volume thuộc Pod → tầng ③. Image thuộc container → tầng ④.

## Bài tập 1 — `kubectl explain` thay cho Google

**Đoán trước:** muốn biết một container khai được những trường gì, phải mở tài liệu
trên mạng?

```bash
kubectl explain deployment.spec.template.spec.containers | head -30
```

**Kết quả:** danh sách đầy đủ kèm mô tả, lấy thẳng từ **schema của chính cluster bạn
đang chạy** — nên luôn đúng phiên bản, không bao giờ lệch như tài liệu trên mạng.

Đào sâu một trường:

```bash
kubectl explain deployment.spec.strategy.rollingUpdate
```

Xem hết mọi thứ có thể khai:

```bash
kubectl explain deployment --recursive | head -40
```

**Vì sao quan trọng:** `explain` là công cụ hay bị bỏ quên nhất của kubectl. Nó trả lời
được ba câu hỏi thường ngày mà Google trả lời tệ hơn: trường này tên chính xác là gì,
nó nằm ở tầng nào, và **bắt buộc hay không** (mục `-required-`).

## Bài tập 2 — Cùng một Pod template, hai kiểu dùng

**Đoán trước:** cắt riêng phần từ `template` xuống, đổi thành `kind: Pod`. Chạy được
không?

```bash
cat > /tmp/pod-tran.yaml <<'EOY'
apiVersion: v1
kind: Pod
metadata:
  name: cat-ra-tu-template
  labels:
    app: first-app
spec:
  containers:
    - name: first-app
      image: nginx:1.27-alpine
EOY
kubectl apply -f /tmp/pod-tran.yaml && kubectl get pods -l app=first-app
```

**Kết quả:** chạy ngay — và có một hệ quả bất ngờ: Pod này **mang nhãn `app=first-app`**,
nên Service `first-app` nhận luôn nó vào danh sách endpoint, dù chẳng Deployment nào sinh
ra nó.

```bash
kubectl get endpointslice -l kubernetes.io/service-name=first-app -o jsonpath='{.items[0].endpoints[*].addresses}{"\n"}'
```

Bốn địa chỉ thay vì ba. Ghép lỏng bằng label là con dao hai lưỡi: rất tiện, và cũng rất
dễ vô tình kéo nhầm Pod vào một Service đang chạy production.

Dọn:

```bash
kubectl delete -f /tmp/pod-tran.yaml && rm /tmp/pod-tran.yaml
```

## Vài trường hay dùng ở mỗi tầng

| Tầng | Trường thường gặp |
| --- | --- |
| ① Deployment | `replicas`, `selector`, `strategy`, `revisionHistoryLimit` |
| ③ Pod | `volumes`, `restartPolicy`, `nodeSelector`, `initContainers` |
| ④ Container | `image`, `ports`, `env`, `resources`, `livenessProbe`, `volumeMounts` |

Chú ý cặp dễ lẫn: `volumes` khai ở Pod, `volumeMounts` khai ở container. Một cái là *có
những ổ đĩa nào*, cái kia là *container này gắn ổ nào vào đâu*.

## Tự kiểm

- [ ] Chỉ ra được ranh giới nơi Deployment kết thúc và Pod bắt đầu
- [ ] Trả lời được "trường X đặt ở đâu" bằng cách hỏi nó thuộc object nào
- [ ] Dùng `kubectl explain` thay vì tìm trên mạng
- [ ] Nói được vì sao một Pod trần lại lọt vào Service của Deployment

## Câu hỏi còn mở

- `initContainers` chạy xong mới tới `containers` — vậy probe áp cho cái nào?
- Hai container trong một Pod cùng khai `ports: 80` thì sao?
