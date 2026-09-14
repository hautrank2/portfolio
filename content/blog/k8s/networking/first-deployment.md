---
title: "7.2 Tạo Deployment đầu tiên"
description: Deploy users-api lên cụm, gọi thử — và nhận về lỗi 500 vì cái tên "auth" không còn nghĩa gì nữa.
status: growing
created: 2026-09-14
updated: 2026-09-14
tags: [k8s, deployment, service, network]
---

> Cần source ở [7.1](/blog/k8s/networking/project-and-goals), và đã `docker compose down`
> để khỏi tranh cổng 8080.

## Đích đến của section

Trước khi gõ lệnh nào, biết mình đang đi đâu:

```
┌─ Cluster ─────────────────────────────────────────────┐
│                                                       │
│   ┌─ Pod ───────────────────────────────────┐         │
│   │                 Pod-internal            │         │
│   │   ┌──────────┐  ◄────────►  ┌────────┐  │◄────┐   │
│   │   │ Auth API │              │ Users  │  │     │   │
│   │   └──────────┘              │  API   │  │     │   │
│   │                             └────────┘  │     │   │
│   └─────────────────────────────────────────┘     │   │
│                                                   ├───┼──► Client
│   ┌─ Pod ───────────────────┐                     │   │    (Postman)
│   │   ┌──────────────────┐  │◄────────────────────┘   │
│   │   │    Tasks API     │  │                         │
│   │   └──────────────────┘  │                         │
│   └─────────────────────────┘                         │
└───────────────────────────────────────────────────────┘
```

Ba điều đọc ra từ hình này:

| | |
| --- | --- |
| **Auth + Users chung một Pod** | Chúng gọi nhau **Pod-internal** — qua `localhost`, không qua mạng cụm |
| **Tasks ở Pod riêng** | Nó cũng cần `auth`, nhưng từ một Pod khác — đó là bài toán khó, để dành cho [7.7](/blog/k8s/networking/pod-to-pod-with-ip-and-env) |
| **Client chỉ chạm Users và Tasks** | `Auth API` **không có mũi tên nào từ ngoài vào** — nó là service nội bộ |

Để ý mũi tên `Pod-internal` nằm gọn **bên trong** khung Pod, còn mũi tên của Client thì
xuyên qua biên Cluster. Hai loại giao tiếp khác nhau, và K8s nối chúng bằng hai cơ chế
khác nhau.

Note này mới dựng **một mảnh** của hình: `users-api`. Và nó sẽ hỏng — đó là chủ ý.

## Bước 1 — Build và đưa image tới cụm

```bash
cd kub-network-01-starting-setup/users-api && docker build -t hautrank2/kub-demo-users:1 .
```

```bash
docker save hautrank2/kub-demo-users:1 | sudo k3s ctr images import -
```

## Bước 2 — Deployment và Service

`users-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: users-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: users
  template:
    metadata:
      labels:
        app: users
    spec:
      containers:
        - name: users
          image: hautrank2/kub-demo-users:1
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8080
```

`users-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: users-service
spec:
  selector:
    app: users
  type: LoadBalancer
  ports:
    - protocol: TCP
      port: 8080
      targetPort: 8080
```

```bash
kubectl apply -f users-deployment.yaml -f users-service.yaml && kubectl rollout status deployment users-deployment --timeout=60s
```

```bash
kubectl get svc users-service
```

Lấy `EXTERNAL-IP` — đây là mũi tên **Client → Users API** trong hình.

## Bài tập — Gọi thử và xem nó gãy

**Đoán trước:** `POST /signup` chạy ngon ở Docker Compose. Trong cụm thì sao? Code không
đổi một chữ.

```bash
curl -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"123"}' http://192.168.103.154:8080/signup
```

**Kết quả:** `{"message":"Creating the user failed - please try again later."}` — lỗi 500.

Xem log để biết vì sao:

```bash
kubectl logs deploy/users-deployment --tail=20 | grep -i "auth\|ENOTFOUND\|EAI" | head -3
```

Sẽ thấy `getaddrinfo ENOTFOUND auth`. Chính là dòng này trong `users-app.js`:

```js
const hashedPW = await axios.get('http://auth/hashed-password/' + password);
```

**Cái tên `auth` không phân giải được.** Ở Docker Compose nó là tên service, Compose tự
tạo bản ghi DNS. Trong cụm K8s **không có gì tên `auth`** — bạn chưa tạo.

## Bài học

`users-api` chạy hoàn hảo. Pod `1/1 Running`, Service có `EXTERNAL-IP`, request tới được
app. Mọi thứ `kubectl` nói đều đúng.

Thứ hỏng nằm ở **một giả định trong code**: rằng cái tên `auth` có nghĩa. Compose cho
không, K8s bắt bạn khai — và đó là toàn bộ phần còn lại của section.

Ba hướng đi từ đây, và bạn sẽ thử cả ba:

| Hướng | Note |
| --- | --- |
| Nhét `auth` vào **cùng Pod** rồi gọi `localhost` | [7.4](/blog/k8s/networking/multiple-containers-in-one-pod), [7.5](/blog/k8s/networking/intra-pod-communication) |
| Cho `auth` một Deployment riêng, gọi bằng IP hoặc biến môi trường | [7.6](/blog/k8s/networking/creating-multiple-deployments), [7.7](/blog/k8s/networking/pod-to-pod-with-ip-and-env) |
| Tạo một **Service tên `auth`** và gọi bằng DNS | [7.8](/blog/k8s/networking/dns-for-pod-to-pod) |

Hướng cuối mới là đáp án, nhưng đi thẳng vào đó thì bạn không hiểu vì sao.

## Đừng dọn

Giữ `users-deployment` và `users-service` — các note sau xây tiếp lên chúng.

## Self-check

- [ ] Vẽ lại được sơ đồ đích, và nói được vì sao Auth không có mũi tên từ ngoài vào
- [ ] Phân biệt được mũi tên `Pod-internal` với mũi tên xuyên biên Cluster
- [ ] Giải thích được vì sao code chạy ở Compose lại 500 ở K8s
- [ ] Tìm được nguyên nhân bằng `kubectl logs`, không phải bằng đoán

## Open questions

- Nếu tạo một Service tên `auth` mà chưa có Pod nào phía sau, lỗi sẽ đổi thành gì?
- `users` gọi `http://auth` không kèm cổng — vậy Service `auth` phải nghe cổng mấy?
