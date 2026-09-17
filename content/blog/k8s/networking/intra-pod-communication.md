---
title: "7.5 Giao tiếp trong nội bộ Pod"
description: Hai container cùng Pod gọi nhau bằng localhost. Đưa địa chỉ auth ra biến môi trường, và signup lần đầu chạy được trong cụm.
status: growing
created: 2026-09-14
updated: 2026-09-17
tags: [k8s, pod, network, namespace, env]
---

> Tiếp [7.4](/blog/k8s/networking/multiple-containers-in-one-pod). `users-deployment` đang
> có hai container `users` + `auth`, `READY 2/2`, nhưng `signup` vẫn `ENOTFOUND auth`.

Các container trong cùng một Pod **dùng chung một network namespace**. Hệ quả: chúng thấy
nhau ở `localhost`, y như hai tiến trình trên cùng một máy.

## Bài tập 1 — `auth` có thật ở `localhost` không?

**Đoán trước:** từ container `users`, gọi `http://localhost/hashed-password/abc` — có tới
được `auth` không? Hai image khác nhau, hai tiến trình khác nhau.

```bash
kubectl exec deploy/users-deployment -c users -- wget -qO- http://localhost/hashed-password/abc
```

**Kết quả:** `{"hashedPassword":"abc_hash"}` — câu trả lời của `auth-app.js`. Không cổng
nghĩa là cổng 80, đúng cổng `auth` đang nghe. `localhost` của container này **chính là**
`localhost` của container kia.

Xác nhận chúng dùng chung một ngăn mạng:

```bash
kubectl exec deploy/users-deployment -c users -- ip addr | grep -E "^[0-9]+:|inet "
```

```bash
kubectl exec deploy/users-deployment -c auth -- ip addr | grep -E "^[0-9]+:|inet "
```

Hai output **giống hệt nhau** — cùng `lo`, cùng `eth0`, cùng IP. Không phải hai máy nói
chuyện với nhau; là **một ngăn mạng, hai tiến trình**.

## Vì sao lại thế

Đây chính là network namespace ở
[note nền tảng](/blog/k8s/foundations/linux/namespaces-and-cgroups). Khi tạo Pod, runtime
dựng **một** network namespace, rồi cho mọi container trong Pod **gia nhập ngăn đó** thay
vì tạo ngăn riêng.

```
┌─ Pod users-deployment-… — MỘT network namespace ──┐
│   IP 10.42.0.57                                   │
│                                                   │
│   ┌─ users ───────────┐      ┌─ auth ──────────┐  │
│   │ node users-app.js │─────►│ node auth-app.js│  │
│   │ :8080             │ localhost:80           │  │
│   └───────────────────┘      └─────────────────┘  │
│   (hai filesystem riêng, chung mạng)              │
└───────────────────────────────────────────────────┘
          ▲
          │ users-service :8080 → targetPort 8080
```

Ai giữ ngăn mạng đó khi container chính restart? Một container ẩn tên `pause`, sinh ra
cùng Pod và chỉ làm đúng một việc: **tồn tại** để namespace không bị dọn. Xem nó ở tầng
node:

```bash
sudo k3s crictl pods --label app=users
```

## Bài tập 2 — Sửa code: đừng gõ cứng tên

Code đang gọi `http://auth`. Hai lựa chọn:

| Sửa thành | Hậu quả |
| --- | --- |
| `http://localhost` | Chạy trong Pod này. **Gãy ở Docker Compose** — ở đó `auth` là một container khác |
| `http://${process.env.AUTH_ADDRESS}` | Mỗi môi trường tự khai địa chỉ. Code không cần biết mình đang chạy ở đâu |

Chọn cái thứ hai. Mở `users-api/users-app.js`, sửa **cả hai** chỗ gọi `auth`.

Trong route `/signup`:

```js
const hashedPW = await axios.get(`http://${process.env.AUTH_ADDRESS}/hashed-password/` + password);
```

Trong route `/login`:

```js
const response = await axios.get(
  `http://${process.env.AUTH_ADDRESS}/token/` + hashedPassword + '/' + password
);
```

Để nguyên `tasks-api/tasks-app.js` — nó xử lý ở [7.7](/blog/k8s/networking/pod-to-pod-with-ip-and-env).

Compose giờ cũng phải khai biến, không thì chính Compose gãy. Trong `docker-compose.yaml`:

```yaml
  users:
    build: ./users-api
    environment:
      AUTH_ADDRESS: auth
    ports:
      - "8080:8080"
```

> Đừng `docker compose up` lúc này: ServiceLB của k3s đang giữ cổng `8080` trên node.

### Build lại với tag mới

Code đổi thì tag đổi — dùng lại tag `1` với `IfNotPresent` thì node cứ chạy image cũ:

```bash
docker build -t hautrank2/kub-demo-users:2 users-api
```

```bash
docker save hautrank2/kub-demo-users:2 | sudo k3s ctr images import -
```

### Khai biến cho container `users`

Sửa `kubernetes/users-deployment.yaml`:

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
        - name: auth
          image: hautrank2/kub-demo-auth:1
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 80
```

`env` nằm **dưới container `users`**, không phải dưới `spec` của Pod — biến môi trường là
thứ container **không** chia sẻ với nhau (bảng ở 7.4). `auth` không gọi ai nên không cần.

Cùng một biến, hai giá trị:

| Môi trường | `AUTH_ADDRESS` | Vì sao |
| --- | --- | --- |
| Docker Compose | `auth` | Tên service, Compose tạo DNS |
| Pod K8s | `localhost` | Chung network namespace |

```bash
kubectl apply -f kubernetes/users-deployment.yaml && kubectl rollout status deployment users-deployment --timeout=60s
```

Kiểm tra biến đã vào đúng container:

```bash
kubectl exec deploy/users-deployment -c users -- printenv AUTH_ADDRESS
```

## Bài tập 3 — Gọi lại

**Đoán trước:** `signup` giờ ra gì? Còn `login`?

```bash
USERS=$(kubectl get svc users-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}') && echo $USERS
```

```bash
curl -i -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"123"}' http://$USERS:8080/signup
```

**Kết quả:** `201` và `{"message":"User created!"}` — lần đầu tiên `users → auth` chạy
trong cụm.

```bash
curl -s -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"123"}' http://$USERS:8080/login
```

**Kết quả:** `{"token":"abc"}`.

Hai request đi qua hai tầng khác nhau: từ máy bạn vào Pod là **Service**, từ `users` sang
`auth` là **localhost** — không có Service nào dính vào đoạn thứ hai.

## Hệ quả: không ai được trùng cổng

`users` nghe `8080`, `auth` nghe `80` — may mắn không đụng nhau. Nếu `auth-app.js` cũng
`listen(8080)`, `kubectl apply` vẫn **thành công**, nhưng một trong hai sẽ chết với
`address already in use` và Pod rơi vào `CrashLoopBackOff`.

`containerPort` chỉ là ghi chú, K8s **không** kiểm trùng. Trong một Pod, dải cổng là **tài
nguyên dùng chung** — mỗi container một cổng riêng, y như trên một máy vật lý.

## So với Docker Compose

| | Docker Compose | Pod nhiều container |
| --- | --- | --- |
| Gọi nhau bằng | **Tên service** — `http://auth` | **`localhost`** |
| Mỗi thành phần có IP riêng | Có | **Không** — chung một IP |
| Cổng trùng nhau | Được, vì khác namespace | **Không được** |
| `AUTH_ADDRESS` | `auth` | `localhost` |

Đây là chỗ người từ Docker Compose sang hay vấp: bê nguyên `http://auth` vào một Pod hai
container thì không chạy, vì trong Pod không có cái tên nào tên `auth` cả — chỉ có
`localhost`.

## Còn `tasks` thì sao?

`tasks` cũng gọi `auth`, nhưng nó **không thể** gọi `localhost` của Pod `users`. Nhét
thêm một `auth` vào Pod `tasks`? Thành hai bản `auth` sống riêng — đúng loại thiết kế mà
phép thử ở 7.4 đã loại.

Lối ra: cho `auth` một Pod riêng, và hai Pod gọi nhau qua mạng cụm —
[7.6](/blog/k8s/networking/creating-multiple-deployments).

## Đừng dọn

Giữ nguyên `users-deployment` và `users-service`.

## Checkpoint

So với source khởi điểm ở 7.1, tới đây bạn đã đổi đúng bốn chỗ:

| File | Thay đổi |
| --- | --- |
| `users-api/users-app.js` | Hai lời gọi `auth` đọc `process.env.AUTH_ADDRESS` |
| `docker-compose.yaml` | `users` có `AUTH_ADDRESS: auth` |
| `kubernetes/users-deployment.yaml` | Thêm container `auth`; `users` dùng image `:2` và `AUTH_ADDRESS=localhost` |
| `kubernetes/users-service.yaml` | Không đổi, chỉ chuyển thư mục |

## Self-check

- [ ] Giải thích được vì sao `localhost` bắc cầu giữa hai container cùng Pod
- [ ] Nói được container `pause` để làm gì
- [ ] Giải thích được vì sao dùng `AUTH_ADDRESS` thay vì gõ cứng `localhost`
- [ ] Biết `env` phải đặt dưới container nào, và vì sao
- [ ] Biết vì sao hai container trong một Pod không được trùng cổng
- [ ] Giải thích được vì sao `tasks` không dùng được cách này

## Open questions

- Pod dùng chung network namespace — vậy chúng có chung `/etc/hosts` không?
- `hostNetwork: true` thì Pod dùng luôn ngăn mạng của node. Khi nào cần tới?
