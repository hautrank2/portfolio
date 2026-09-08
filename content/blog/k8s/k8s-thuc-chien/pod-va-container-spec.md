---
title: "5.16 Thêm Pod spec và Container spec"
description: Ba chữ spec lồng nhau, và cách tra tài liệu ngay trong terminal thay vì mở Google.
status: growing
created: 2026-08-25
updated: 2026-09-05
tags: [k8s, yaml, deployment]
---

> **Nối tiếp [note 5.15](/blog/k8s/k8s-thuc-chien/viet-file-deployment).** Đang có
> `second-app-deployment` chạy từ file, cộng một Pod trần tên `ke-la`.

Chỗ làm người mới hoa mắt nhất trong YAML của K8s là **`spec` lồng trong `spec` lồng
trong `spec`**. Nhìn ra được ba tầng đó thì file nào cũng đọc trôi.

## Ba tầng, mỗi tầng thuộc về một object khác nhau

```yaml
kind: Deployment
spec:                            # ① spec của DEPLOYMENT — replicas, selector, strategy
  replicas: 1
  selector:
    matchLabels:
      app: second-app
      tier: backend
  template:                      # ② một POD TEMPLATE — có metadata riêng
    metadata:
      labels:
        app: second-app
        tier: backend
    spec:                        # ③ spec của POD — volumes, restartPolicy, nodeSelector
      containers:                #    và danh sách container
        - name: second-node      # ④ spec của MỘT container — image, ports, env, probe
          image: academind/kub-first-app:2
```

Cách đọc: **từ `template` trở xuống không còn là Deployment nữa.** Đó là bản thiết kế của
một Pod, dán nguyên vào. Cắt phần đó ra, thêm `kind: Pod` lên đầu là có một Pod chạy được
ngay — bài tập 2 làm đúng thế.

Vì vậy câu hỏi kiểu *"đặt `volumes` ở đâu"* luôn có cùng một cách trả lời: hỏi nó thuộc
về **object nào**. Volume thuộc Pod → tầng ③. Image thuộc container → tầng ④.

Để ý `template` có `metadata` riêng nhưng **không có `name`**. Pod sinh ra từ template
được đặt tên tự động: tên Deployment + hash template + hậu tố ngẫu nhiên. Khai `name` ở
đó là vô nghĩa — ba Pod không thể trùng tên.

## Bài tập 1 — `kubectl explain` thay cho Google

**Đoán trước:** muốn biết một container khai được những trường gì, phải mở tài liệu trên
mạng?

```bash
kubectl explain deployment.spec.template.spec.containers | head -30
```

**Kết quả:** danh sách đầy đủ kèm mô tả, lấy thẳng từ **schema của chính cluster bạn đang
chạy** — nên luôn đúng phiên bản, không bao giờ lệch như tài liệu trên mạng.

Đào sâu một trường:

```bash
kubectl explain deployment.spec.strategy.rollingUpdate
```

Xem hết mọi thứ có thể khai:

```bash
kubectl explain deployment --recursive | head -40
```

**Vì sao quan trọng:** `explain` là công cụ hay bị bỏ quên nhất của kubectl. Nó trả lời
ba câu hỏi thường ngày mà Google trả lời tệ hơn: trường này tên chính xác là gì, nó nằm ở
tầng nào, và **bắt buộc hay không** (mục `-required-`).

Thử ngay với chính chỗ dễ nhầm nhất — đường dẫn tới nhãn của Pod:

```bash
kubectl explain deployment.spec.template.metadata.labels
```

## Bài tập 2 — Cùng một Pod template, hai kiểu dùng

**Đoán trước:** cắt riêng phần từ `template` xuống, đổi thành `kind: Pod`. Chạy được
không? Và Deployment có coi nó là Pod của mình không?

```bash
cat > /tmp/pod-tran.yaml <<'EOY'
apiVersion: v1
kind: Pod
metadata:
  name: cat-ra-tu-template
  labels:
    app: second-app
    tier: backend
spec:
  containers:
    - name: second-node
      image: academind/kub-first-app:2
EOY
kubectl apply -f /tmp/pod-tran.yaml
```

```bash
kubectl get pods -L app,tier && kubectl get deploy second-app-deployment
```

**Kết quả:** Pod chạy ngay — và có một hệ quả bất ngờ. Lần này nó mang **đủ cả hai nhãn**
mà selector đòi, nên Deployment **nhận nó là con**. Cột `READY` nhảy lên `2/1`, rồi
Deployment lập tức **xoá bớt một Pod** để về đúng `replicas: 1`.

Rất có thể nó xoá chính Pod nó tự sinh ra, chứ không phải Pod bạn vừa tạo — controller
không phân biệt "con ruột", nó chỉ đếm theo nhãn.

Đối chiếu với Pod `ke-la` ở note trước: chỉ có `app`, thiếu `tier` → Deployment không đếm.
Cùng một cơ chế, khác đúng một nhãn.

**Vì sao quan trọng:** ghép lỏng bằng label là con dao hai lưỡi. Rất tiện, và cũng rất dễ
vô tình để một Pod lạ bị một Deployment nhận nuôi rồi xoá mất Pod thật.

Dọn:

```bash
kubectl delete -f /tmp/pod-tran.yaml && rm /tmp/pod-tran.yaml
```

## Bài tập 3 — Thêm container thứ hai vào Pod

Trong `deployment.yaml` có sẵn hai dòng bị comment, đặt đúng chỗ để gợi ý:

```yaml
      containers:
        - name: second-node
          image: academind/kub-first-app:2
        # - name: ...
        #   image: ...
```

**Đoán trước:** thêm một container nữa vào đúng đó. Nó thành Pod thứ hai, hay nằm chung
Pod với cái cũ?

```yaml
        - name: ban-dong-hanh
          image: busybox:1.36
          command: ["sh", "-c", "while true; do sleep 30; done"]
```

```bash
kubectl apply -f deployment.yaml && kubectl get pods -l app=second-app
```

**Kết quả:** vẫn **một** Pod, nhưng cột `READY` là `2/2`. Hai container nằm chung một Pod
— chung IP, chung network namespace, chung vòng đời.

Chứng minh chúng dùng chung mạng: container `busybox` gọi được app qua `localhost`, dù
app chạy ở container khác.

```bash
kubectl exec deploy/second-app-deployment -c ban-dong-hanh -- wget -qO- localhost:8080
```

Ra trang chào của app Node. Đây là điều **không** làm được giữa hai Pod — đó mới là ranh
giới thật, và là toàn bộ ý nghĩa của Pod như một đơn vị.

Nhớ cờ `-c`: Pod nhiều container thì `exec` và `logs` bắt buộc phải nói rõ container nào.

Bỏ container thứ hai đi rồi apply lại trước khi đi tiếp:

```bash
kubectl apply -f deployment.yaml && kubectl get pods -l app=second-app
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
- [ ] Giải thích được vì sao Pod đủ nhãn thì bị Deployment nhận nuôi rồi xoá bớt
- [ ] Nói được hai container chung Pod thì chung những gì

## Câu hỏi còn mở

- `initContainers` chạy xong mới tới `containers` — vậy probe áp cho cái nào?
- Hai container trong một Pod cùng khai `containerPort: 8080` thì sao?
- Vì sao `template.metadata` không cho đặt `name`?
