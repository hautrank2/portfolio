---
title: "7.6 Tạo nhiều Deployment"
description: Tách auth và tasks thành Deployment riêng — và nhận ra mỗi cái cần một kiểu Service khác nhau.
status: growing
created: 2026-09-14
updated: 2026-09-14
tags: [k8s, deployment, service, network]
---

> Tiếp [7.2](/blog/k8s/networking/first-deployment). `users-deployment` đang chạy và đang
> lỗi 500 vì không tìm thấy `auth`.

[Note 7.4](/blog/k8s/networking/multiple-containers-in-one-pod) cho phép nhét `auth` vào
cùng Pod với `users`. Nhưng `tasks` **cũng** cần `auth`, mà nó ở Pod khác — nhét vào đâu
bây giờ?

Câu trả lời: không nhét vào đâu cả. `auth` là một service độc lập, nó xứng đáng có
Deployment riêng.

## Build hai image còn lại

```bash
cd kub-network-01-starting-setup/auth-api && docker build -t hautrank2/kub-demo-auth:1 . && docker save hautrank2/kub-demo-auth:1 | sudo k3s ctr images import -
```

```bash
cd ../tasks-api && docker build -t hautrank2/kub-demo-tasks:1 . && docker save hautrank2/kub-demo-tasks:1 | sudo k3s ctr images import -
```

## `auth-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: auth
  template:
    metadata:
      labels:
        app: auth
    spec:
      containers:
        - name: auth
          image: hautrank2/kub-demo-auth:1
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 80
```

## `tasks-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tasks-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tasks
  template:
    metadata:
      labels:
        app: tasks
    spec:
      containers:
        - name: tasks
          image: hautrank2/kub-demo-tasks:1
          imagePullPolicy: IfNotPresent
          env:
            - name: TASKS_FOLDER
              value: tasks
          ports:
            - containerPort: 8000
```

Khối `env` là bắt buộc — `tasks-app.js` ghép `__dirname + process.env.TASKS_FOLDER`, thiếu
nó là `path.join` ném `TypeError` ngay lúc khởi động, đúng như
[note 6.14](/blog/k8s/data-and-volumes/environment-variables).

## Hai kiểu Service, và vì sao khác nhau

Đây mới là phần đáng nghĩ. Nhìn lại sơ đồ ở [7.2](/blog/k8s/networking/first-deployment):
`auth` **không có mũi tên nào từ ngoài vào**, còn `tasks` thì có.

`auth-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: auth
spec:
  selector:
    app: auth
  type: ClusterIP
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
```

`tasks-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: tasks-service
spec:
  selector:
    app: tasks
  type: LoadBalancer
  ports:
    - protocol: TCP
      port: 8000
      targetPort: 8000
```

| | `auth` | `tasks-service` |
| --- | --- | --- |
| `type` | **ClusterIP** — chỉ gọi được từ trong cụm | **LoadBalancer** — client gọi được |
| `metadata.name` | **`auth`**, không phải `auth-service` | `tasks-service` |
| Cổng | 80 | 8000 |

**Cái tên `auth` là bắt buộc.** Code gọi `http://auth/...`, mà tên DNS của một Service
chính là `metadata.name`. Đặt thành `auth-service` là code không tìm thấy — và bạn phải
sửa code, thứ đáng ra không nên đụng tới.

Cổng 80 cũng bắt buộc: `http://auth` không ghi cổng nghĩa là cổng 80.

```bash
kubectl apply -f auth-deployment.yaml -f auth-service.yaml -f tasks-deployment.yaml -f tasks-service.yaml
```

```bash
kubectl get deploy,svc
```

## Bài tập — Thử lại `users`

**Đoán trước:** `users-deployment` vẫn đang chạy nguyên bản, không sửa gì. Giờ đã có
Service tên `auth`. Nó tự hết lỗi, hay phải restart?

```bash
curl -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"123"}' http://192.168.103.154:8080/signup
```

**Kết quả:** `{"message":"User created!"}` — **chạy ngay, không cần restart gì cả**.

Vì `axios` phân giải `auth` **tại thời điểm gọi**, không phải lúc container khởi động. Đó
chính là điều làm DNS khác hẳn biến môi trường, và
[note 7.8](/blog/k8s/networking/dns-for-pod-to-pod) đào kỹ.

Thử nốt `tasks`:

```bash
TOKEN=$(curl -s -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"123"}' http://192.168.103.154:8080/login | sed -E 's/.*"token":"([^"]*)".*/\1/') && curl -H "Authorization: Bearer $TOKEN" http://192.168.103.154:8000/tasks
```

Ra `Loading the tasks failed.` là **đúng ở bước này** — token đã được `auth` xác thực
thành công, chỉ là thư mục `tasks` chưa tồn tại.
[Note 7.10](/blog/k8s/networking/tasks-txt-hint) xử lý.

Ra `Could not verify token.` mới là vấn đề: `tasks` chưa gọi được sang `auth`.

## Bốn object cho ba service

```bash
kubectl get deploy,svc -o wide
```

Ba Deployment, ba Service — nhưng **chỉ hai Service phơi ra ngoài**. `auth` là ClusterIP,
và đó là mặc định đúng: một API nội bộ không nên có `EXTERNAL-IP`.

Đối chiếu với `docker-compose.yaml`: `auth` cũng là service duy nhất **không có `ports`**.
Cùng một quyết định kiến trúc, hai cú pháp.

## Self-check

- [ ] Nói được vì sao `auth` cần Deployment riêng thay vì nhét chung Pod với `users`
- [ ] Giải thích được vì sao `metadata.name` phải đúng là `auth`
- [ ] Nói được vì sao `auth` dùng ClusterIP còn `tasks` dùng LoadBalancer
- [ ] Giải thích được vì sao `users` hết lỗi mà không cần restart

## Open questions

- Nếu đặt Service là `auth-service`, có cách nào không sửa code mà vẫn chạy?
- `tasks` ghi file — scale lên 3 bản thì ba Pod có thấy task của nhau không?
