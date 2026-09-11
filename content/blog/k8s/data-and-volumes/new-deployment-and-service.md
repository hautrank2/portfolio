---
title: "6.4 Tạo Deployment & Service mới"
description: Đưa app stories vào cluster bằng YAML, rồi xoá một Pod để thấy điều Docker không bao giờ làm với bạn.
status: growing
created: 2026-09-11
updated: 2026-09-11
tags: [k8s, deployment, service, volume, yaml]
---

> **Cần làm xong [6.1](/blog/k8s/data-and-volumes/starting-project) trước**, và nhớ tắt
> compose bằng `docker compose down -v` để khỏi tranh cổng 3000 với cluster.

App `stories` rời Docker, vào cluster. Lần này viết thẳng YAML — module trước đã đi hết
đường từ lệnh sang file, không quay lại nữa.

Và đây cũng là chỗ **bảng giấy ở [note 6.3](/blog/k8s/data-and-volumes/volume-theory)
được chấm điểm**.

## Bước 1 — Đưa image tới cluster

```bash
cd kub-data-01-starting-setup && docker build -t hautrank2/kub-data-app:1 .
```

```bash
docker save hautrank2/kub-data-app:1 | sudo k3s ctr images import -
```

Bước giữa vẫn bắt buộc: Docker và containerd là hai kho khác nhau.

## Bước 2 — Hai file YAML

`deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: story-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: story
  template:
    metadata:
      labels:
        app: story
    spec:
      containers:
        - name: story
          image: hautrank2/kub-data-app:1
          ports:
            - containerPort: 3000
```

`service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: story-service
spec:
  selector:
    app: story
  type: LoadBalancer
  ports:
    - protocol: TCP
      port: 3000
      targetPort: 3000
```

Ba con số `3000` ở ba chỗ khác nhau, và chúng độc lập: `containerPort` là ghi chú, `port`
là cổng trên Service, `targetPort` là cổng thật trong container — cái duy nhất **bắt
buộc** phải là 3000 vì `app.listen(3000)`.

`name: story` trong containers là tên **bạn tự đặt** — khác với `kubectl create
deployment` vốn tự suy ra từ tên image.

## Bước 3 — Apply và thử

```bash
kubectl apply -f deployment.yaml -f service.yaml
```

```bash
kubectl rollout status deployment story-deployment && kubectl get svc story-service
```

Lấy `EXTERNAL-IP` rồi ghi một dòng:

```bash
curl -X POST -H 'Content-Type: application/json' -d '{"text":"trong cluster"}' http://192.168.103.154:3000/story
```

```bash
curl http://192.168.103.154:3000/story
```

**Kết quả:** `{"story":"trong cluster\n"}`. App chạy trong cluster, dữ liệu nằm đó. Nhìn
từ bên ngoài thì không khác gì bản Docker ở note 6.1.

Ghi thêm vài dòng nữa — lát nữa mất sẽ thấm hơn.

## Bài tập — Chấm điểm bảng giấy ở note 6.3

**Đoán trước:** ở note 6.1, `docker compose down` xoá sạch container mà dữ liệu vẫn còn.
Giờ làm điều tương đương trong cluster — xoá Pod. Deployment sẽ dựng Pod mới ngay. Dữ
liệu còn hay mất?

```bash
kubectl delete pod -l app=story
```

```bash
kubectl get pods -l app=story
```

Pod mới `1/1 Running`, Service giữ nguyên `EXTERNAL-IP`, không một event lỗi nào.

```bash
curl http://192.168.103.154:3000/story
```

**Kết quả:** `{"story":""}`. **Mất sạch.**

Đây chính là dòng thứ ba trong bảng giấy, và nó **ngược hoàn toàn** với Docker:

| Chuyện gì xảy ra | Docker volume | Ở đây (chưa có volume) |
| --- | --- | --- |
| Container bị xoá, dựng lại từ image | Còn | — |
| Pod bị xoá, Deployment tạo Pod mới | — | **Mất** |

Lý do thì bạn đã biết từ note 6.1: container mới dựng từ image, mà image chứa
`text.txt` rỗng. Điểm mới nằm ở chỗ **ai ra lệnh xoá**. Ở Docker bạn phải tự gõ. Ở đây
Deployment xoá Pod và tạo Pod mới như một việc thường ngày — rollout, scale, drain node
đều làm đúng chuyện đó, và không cái nào trông giống "xoá dữ liệu".

## Vì sao `replicas: 1`

Thử `replicas: 3` bây giờ là hỏng theo một kiểu khó chịu hơn: ba Pod, **ba file
`text.txt` riêng biệt**, mỗi Pod một bản. Service chia tải ngẫu nhiên nên POST rơi vào
Pod A, GET rơi vào Pod B là không thấy gì — mà chẳng có lỗi nào báo.

Giữ `replicas: 1` cho tới khi có chỗ chứa dùng chung. Đó là chuyện của
[PersistentVolume](/blog/k8s/data-and-volumes), không phải của note này.

## Đừng dọn

Giữ nguyên `story-deployment` và `story-service` — hai note sau gắn volume thẳng vào
đúng file `deployment.yaml` này.

## Tự kiểm

- [ ] Viết được cả hai file từ đầu, không copy
- [ ] Chỉ ra ba chỗ ghi số `3000` và nói con nào bắt buộc phải đúng
- [ ] Giải thích được vì sao xoá Pod lại mất dữ liệu còn `docker compose down` thì không
- [ ] Nói được vì sao `replicas: 3` làm hỏng app này theo cách không báo lỗi

## Câu hỏi còn mở

- Rollout đổi image cũng thay Pod — vậy mỗi lần deploy bản mới là mất sạch dữ liệu?
- Nếu chỉ container bên trong crash mà Pod vẫn sống, dữ liệu có mất không?
