---
title: "7.6 Tạo nhiều Deployment"
description: Tách auth khỏi Pod của users — hai Deployment, hai Pod, và localhost thôi không còn đúng nữa.
status: growing
created: 2026-09-14
updated: 2026-09-19
tags: [k8s, deployment, service, clusterip, network]
---

> Tiếp [7.5](/blog/k8s/networking/intra-pod-communication). `users-deployment` đang có hai
> container `users` + `auth`, `users` gọi `auth` qua `AUTH_ADDRESS=localhost`, `signup` và
> `login` đã chạy.

Cách ở 7.5 chạy được, nhưng nó **trượt** phép thử ở
[7.4](/blog/k8s/networking/multiple-containers-in-one-pod): `auth` là một API riêng, và
`tasks` **cũng** cần nó. `tasks` nằm ở Pod khác, không dùng chung `localhost` với `users` —
nên với cách gộp, nó không có đường nào tới `auth`.

Note này tách `auth` ra **Pod riêng**, và mới chỉ nối `users` → `auth`. `tasks` để dành cho
thử thách ở [7.9](/blog/k8s/networking/which-approach-is-best).

## Đích đến của note

```
Trước (7.5) — một Pod, hai container:

┌─ Pod users ─────────────────────────┐
│  users :8080 ──localhost:80──► auth │ ◄── users-service (LoadBalancer :8080)
└─────────────────────────────────────┘

Sau (7.6) — hai Pod, hai Deployment:

┌─ Pod users ─┐                          ┌─ Pod auth ─┐
│  users      │ ──► auth-service ───────►│  auth :80  │
└─────────────┘     (ClusterIP :80)      └────────────┘
      ▲
users-service (LoadBalancer :8080)
```

| File | Thay đổi |
| --- | --- |
| `kubernetes/auth-deployment.yaml` | **Mới** — một container `auth` |
| `kubernetes/auth-service.yaml` | **Mới** — `ClusterIP`, cổng 80 |
| `kubernetes/users-deployment.yaml` | **Bỏ** container `auth` |
| `users-api/users-app.js` | **Không đổi dòng nào** |

Dòng cuối là phần thưởng của 7.5: địa chỉ `auth` đã nằm ngoài code, nên đổi kiến trúc chỉ
là đổi YAML.

## Bước 1 — Deployment cho `auth`

Image `hautrank2/kub-demo-auth:1` đã được import ở 7.4, không cần build lại.

`kubernetes/auth-deployment.yaml`:

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

Nhãn là `app: auth`, **khác** `app: users`. Nếu lỡ dán nhãn `app: users` cho Pod `auth`,
`users-service` sẽ chọn luôn Pod `auth` và chia traffic `:8080` sang một Pod không hề
nghe cổng đó — nhãn là thứ duy nhất Service dùng để phân biệt.

## Bước 2 — Service cho `auth`

`kubernetes/auth-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: auth-service
spec:
  selector:
    app: auth
  type: ClusterIP
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
```

| | `users-service` | `auth-service` |
| --- | --- | --- |
| `type` | `LoadBalancer` — client gọi được | **`ClusterIP`** — chỉ gọi được từ trong cụm |
| `selector` | `app: users` | `app: auth` |
| Cổng | 8080 | 80 |

`ClusterIP` là đúng ý sơ đồ ở [7.2](/blog/k8s/networking/first-deployment): `auth` không
có mũi tên nào từ ngoài vào. `port: 80` để `http://<địa chỉ>` không cần ghi cổng — đúng
kiểu `users-app.js` đang gọi.

## Bước 3 — Rút `auth` khỏi Pod `users`

Sửa `kubernetes/users-deployment.yaml`, xoá hẳn phần tử `auth` trong `containers`. **Giữ
nguyên** `AUTH_ADDRESS=localhost` — chưa sửa, để xem nó gãy:

```yaml
    spec:
      containers:
        - name: users
          image: hautrank2/kub-demo-users:2
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8080
          env:
            - name: AUTH_ADDRESS
              value: localhost
```

```bash
kubectl apply -f kubernetes/auth-deployment.yaml -f kubernetes/auth-service.yaml -f kubernetes/users-deployment.yaml && kubectl rollout status deployment users-deployment --timeout=60s && kubectl rollout status deployment auth-deployment --timeout=60s
```

```bash
kubectl get pods -o wide
```

```
NAME                               READY   STATUS    RESTARTS   AGE   IP            NODE
auth-deployment-6b8d7c9f5-p4wzn    1/1     Running   0          12s   10.42.0.171   hautrank2-virtualbox
users-deployment-5f7b9d6c8-9kx2r   1/1     Running   0          10s   10.42.0.172   hautrank2-virtualbox
```

Hai Pod, **hai IP**, mỗi cái `READY 1/1`. Cùng một node vẫn là hai network namespace riêng.

## Bài tập 1 — `localhost` giờ là của ai?

**Đoán trước:** `AUTH_ADDRESS` vẫn là `localhost`, `auth` vẫn chạy ngon ở Pod bên cạnh.
`signup` ra gì?

```bash
USERS=$(kubectl get svc users-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}') && echo $USERS
```

```bash
curl -i -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"123"}' http://$USERS:8080/signup
```

**Kết quả:** lại `500`. Pod `users` giờ chỉ còn một container, nên bỏ được `-c`:

```bash
kubectl logs deploy/users-deployment --tail=40 | grep -m1 ECONNREFUSED
```

`connect ECONNREFUSED 127.0.0.1:80` — **khác** lỗi ở 7.2. Lần này tên `localhost` phân
giải được, nhưng cổng 80 trong ngăn mạng của Pod `users` **không ai nghe**. `auth` đang
nghe cổng 80 trong ngăn mạng **của nó**.

| Lỗi | Ý nghĩa |
| --- | --- |
| `ENOTFOUND auth` (7.2, 7.4) | Cái **tên** không tồn tại |
| `ECONNREFUSED 127.0.0.1:80` (7.6) | Tên có, **địa chỉ** có, nhưng không ai nghe ở đó |

> Đừng thử `login` lúc này: route `/login` trong `users-app.js` không có `try/catch`, lỗi
> `axios` thành unhandled rejection và `curl` sẽ treo mãi.

## Bước 4 — Trỏ `AUTH_ADDRESS` vào Service

`auth-service` có một ClusterIP đứng yên. Lấy nó ra:

```bash
kubectl get svc auth-service -o jsonpath='{.spec.clusterIP}{"\n"}'
```

Thử gọi từ **trong** Pod `users` trước khi sửa YAML:

```bash
kubectl exec deploy/users-deployment -- wget -qO- http://$(kubectl get svc auth-service -o jsonpath='{.spec.clusterIP}')/hashed-password/abc
```

Ra `{"hashedPassword":"abc_hash"}` — đường `users` → `auth-service` → Pod `auth` đã thông.

Dán ClusterIP đó vào `kubernetes/users-deployment.yaml` (IP của bạn sẽ khác):

```yaml
          env:
            - name: AUTH_ADDRESS
              value: "10.43.57.210"
```

```bash
kubectl apply -f kubernetes/users-deployment.yaml && kubectl rollout status deployment users-deployment --timeout=60s
```

Đổi `env` là đổi Pod template, nên Deployment rollout một Pod mới — biến môi trường chỉ
được nạp lúc container khởi động.

```bash
curl -i -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"123"}' http://$USERS:8080/signup
```

```bash
curl -s -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"123"}' http://$USERS:8080/login
```

**Kết quả:** `201 User created!` và `{"token":"abc"}`. Cùng kết quả như 7.5, nhưng giờ
request đi qua **hai Pod**.

## Bài tập 2 — Giết `auth`, `users` có biết không?

**Đoán trước:** xoá Pod `auth`. Deployment sẽ đẻ Pod mới với IP mới. `users` đang giữ một
địa chỉ cố định trong biến môi trường — nó có gãy không?

```bash
kubectl delete pod -l app=auth && kubectl rollout status deployment auth-deployment --timeout=60s && kubectl get pods -l app=auth -o wide
```

```bash
curl -s -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"123"}' http://$USERS:8080/signup
```

**Kết quả:** vẫn `User created!`. IP Pod `auth` đã đổi, nhưng `AUTH_ADDRESS` trỏ vào
**ClusterIP của Service**, không phải IP Pod — đúng bài học ở
[7.3](/blog/k8s/networking/services-revisited). Nếu bạn dán IP Pod thay vì ClusterIP,
lệnh vừa rồi đã ra `500`.

Và `users` **không bị kéo theo**: Pod `users` không restart lần nào, trong khi ở 7.5 một
lần `auth` chết là cả Pod chết theo.

```bash
kubectl get pods -l app=users
```

Cột `RESTARTS` vẫn là `0`.

## Gộp chung khác tách riêng ở đâu

| | Gộp chung một Pod (7.5) | Tách riêng (7.6) |
| --- | --- | --- |
| `users` gọi `auth` bằng | `localhost` | Địa chỉ của `auth-service` |
| Pod khác (`tasks`) gọi `auth` được không | **Không** | **Được** — cùng Service đó |
| Scale | `replicas: 3` là 3 `users` + 3 `auth` | Mỗi bên tự chọn |
| `auth` crash | Cả Pod `users` vào `CrashLoopBackOff` | Chỉ Pod `auth` chết |
| Deploy, rollback | Sửa `auth` là rollout cả `users` | Rollout riêng |
| Cần Service cho `auth` | Không | **Có** — `ClusterIP` |
| Cái giá | Không có chặng mạng | Thêm một chặng mạng, và câu hỏi *"`auth` ở địa chỉ nào?"* |

## Chỗ vẫn còn khó chịu

`AUTH_ADDRESS: "10.43.57.210"` chạy được, nhưng là một con số **copy tay**:

- Xoá rồi tạo lại `auth-service` → ClusterIP mới, `users` gãy
- Sang cụm khác, namespace khác → IP khác, phải sửa YAML
- Nhìn YAML không ai biết `10.43.57.210` là cái gì

K8s biết ClusterIP của mọi Service. Có cách nào để nó **tự đưa** địa chỉ đó cho `users`
không? Đó là [7.7](/blog/k8s/networking/pod-to-pod-with-ip-and-env), rồi cách thật sự
dùng — gọi bằng tên — ở [7.8](/blog/k8s/networking/dns-for-pod-to-pod).

## Đừng dọn

Giữ `users-deployment`, `users-service`, `auth-deployment`, `auth-service`.

## Self-check

- [ ] Nói được vì sao `auth` cần Deployment riêng thay vì nhét chung Pod với `users`
- [ ] Giải thích được vì sao `auth-service` là `ClusterIP` còn `users-service` là `LoadBalancer`
- [ ] Phân biệt được `ENOTFOUND` với `ECONNREFUSED`, và mỗi cái nói lên điều gì
- [ ] Giải thích được vì sao `localhost` không còn trỏ tới `auth` sau khi tách
- [ ] Giải thích được vì sao `users` vẫn chạy sau khi Pod `auth` bị xoá
- [ ] Kể được ba lý do ClusterIP copy tay vẫn chưa ổn

## Open questions

- Nếu `auth-service` có `port: 3000, targetPort: 80`, `AUTH_ADDRESS` phải sửa thành gì?
- Scale `auth-deployment` lên 3 bản — `users` có phải đổi gì không?
