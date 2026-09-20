---
title: "7.10 Thử thách: nối nốt tasks-api — và lời giải"
description: Đề bài ở nửa trên, lời giải ở nửa dưới. Tự làm trước, vì phần giá trị nhất nằm ở lúc bạn tự chọn type cho từng Service.
status: growing
created: 2026-09-20
updated: 2026-09-20
tags: [k8s, deployment, service, dns, challenge]
---

> Tiếp [7.9](/blog/k8s/networking/which-approach-is-best). Trong cụm đang có
> `users-deployment`, `users-service`, `auth-deployment`, `auth-service`.

## Đề bài

Đưa `tasks-api` vào cụm, để chuỗi dưới đây chạy được từ máy bạn:

1. `POST /signup` trên `users` → `201`
2. `POST /login` trên `users` → nhận `token`
3. `POST /tasks` trên `tasks` kèm `Authorization: Bearer <token>` → task được lưu
4. `GET /tasks` trên `tasks` kèm token → đọc lại được task vừa tạo

Phần còn lại của sơ đồ đích ở [7.2](/blog/k8s/networking/first-deployment):

```
┌─ Cluster ───────────────────────────────────────────────┐
│                                                         │
│   Pod users ──┐                                         │
│      ▲        ├──► auth-service ──► Pod auth            │
│      │        │                                         │
│   Pod tasks ──┘                                         │
│      ▲                                                  │
│   tasks-service (LoadBalancer :8000)                    │
└─────────────────────────────────────────────────────────┘
```

Những gì bạn phải tự làm:

| Việc | Gợi ý |
| --- | --- |
| Sửa `tasks-api/tasks-app.js` | Nó vẫn gọi cứng `http://auth/verify-token/...`, giống `users-api` hồi 7.5 |
| Khai biến trong `docker-compose.yaml` | Để bản chạy bằng Compose không gãy |
| Build và đưa image `tasks` tới cụm | Giống cách làm với `users` và `auth` |
| `kubernetes/tasks-deployment.yaml` | Nhớ `TASKS_FOLDER` — thiếu nó app chết **ngay lúc khởi động** |
| `kubernetes/tasks-service.yaml` | `tasks` là mặt tiền, client gọi thẳng. Cổng `8000` |

Ba câu hỏi để tự kiểm tra thiết kế **trước khi** gõ YAML:

- `tasks` và `auth` nên chung Pod hay khác Pod?
- `tasks-service` nên là `ClusterIP` hay `LoadBalancer`? Còn `auth-service` thì sao?
- `tasks` gọi `auth` bằng địa chỉ gì?

## Hai chỗ sẽ làm bạn mất thời gian

**1. Đọc lỗi cho đúng tầng.** Khi `POST /tasks` hỏng, thông báo cho biết nên đi sửa chỗ
nào — đừng đi sửa Service khi lỗi nằm ở đĩa:

| Thông báo | Tầng hỏng |
| --- | --- |
| `Could not verify token.` | **Mạng** — `tasks` chưa gọi được `auth` |
| `Storing the task failed.` | **Đĩa** — thiếu thư mục `/app/tasks` trong image |
| `Loading the tasks failed.` | **Đĩa** — chưa có file `tasks.txt` |

Source khởi điểm đã có sẵn `tasks-api/tasks/tasks.txt`, vì `fs.appendFile` tạo được file
nhưng **không tạo được thư mục cha**. Nếu bạn lỡ xoá, kiểm tra bằng
`kubectl exec deploy/tasks-deployment -- ls -la /app`.

**2. Cổng `8000` phải còn trống trên node.** ServiceLB của k3s giữ cổng này, nên một
`docker compose up` đang chạy hoặc một Service `LoadBalancer` cũ cũng dùng `8000` sẽ làm
Service mới kẹt ở `<pending>`:

```bash
kubectl get svc -A | grep 8000
```

---

## ⛔ Dừng ở đây

Phần dưới là lời giải đầy đủ.

Đọc trước khi tự làm thì bạn mất đúng phần giá trị nhất của cả section: tự quyết định
`type` cho từng Service, tự chọn địa chỉ cho `AUTH_ADDRESS`, và tự thấy cái tên nào phải
khớp với cái tên nào. Ba câu hỏi thiết kế ở trên mới là bài học — YAML chỉ là phần gõ lại.

Làm xong rồi thì xuống để đối chiếu.

---

## Lời giải — ba câu hỏi thiết kế

| Câu hỏi | Trả lời |
| --- | --- |
| `tasks` và `auth` chung Pod hay khác Pod? | **Khác Pod.** `auth` đã có Pod riêng từ 7.6, và `tasks` scale độc lập với nó. Nhét thêm một `auth` vào Pod `tasks` là có hai bản `auth` sống riêng |
| `tasks-service` kiểu gì? | **LoadBalancer** — client gọi thẳng `tasks`. `auth-service` vẫn là **ClusterIP** |
| `tasks` gọi `auth` bằng gì? | **Tên Service** — `auth-service`, qua biến `AUTH_ADDRESS` |

## Bước 1 — Sửa `tasks-api/tasks-app.js`

Dòng cũ gọi cứng cái tên `auth` của Docker Compose:

```js
const response = await axios.get('http://auth/verify-token/' + token);
```

Đưa địa chỉ ra biến môi trường, giống hệt `users-api` hồi
[7.5](/blog/k8s/networking/intra-pod-communication):

```js
const response = await axios.get(`http://${process.env.AUTH_ADDRESS}/verify-token/` + token);
```

Và khai biến cho bản chạy bằng Compose, trong `docker-compose.yaml`:

```yaml
  tasks:
    build: ./tasks-api
    environment:
      TASKS_FOLDER: tasks
      AUTH_ADDRESS: auth
    ports:
      - "8000:8000"
```

## Bước 2 — Build và đưa image tới cụm

```bash
docker build -t hautrank2/kub-demo-tasks:1 tasks-api && docker save hautrank2/kub-demo-tasks:1 | sudo k3s ctr images import -
```

## Bước 3 — `kubernetes/tasks-deployment.yaml`

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
          ports:
            - containerPort: 8000
          env:
            - name: TASKS_FOLDER
              value: tasks
            - name: AUTH_ADDRESS
              value: "auth-service"
```

Hai biến, hai kiểu hỏng khác nhau:

| Biến | Thiếu nó thì sao |
| --- | --- |
| `TASKS_FOLDER` | `path.join` nhận `undefined` và ném `TypeError` **ngay lúc khởi động** — Pod vào `CrashLoopBackOff` |
| `AUTH_ADDRESS` | App vẫn chạy, chỉ hỏng lúc gọi `auth`: `Could not verify token.` |

> Viết `auth-service.default` cũng đúng, và tường minh hơn — nó nói rõ Service nằm ở
> namespace `default`. Bắt buộc phải viết dạng này khi `tasks` và `auth` khác namespace.

## Bước 4 — `kubernetes/tasks-service.yaml`

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

```bash
kubectl apply -f kubernetes/tasks-deployment.yaml -f kubernetes/tasks-service.yaml && kubectl rollout status deployment tasks-deployment --timeout=60s
```

## Bước 5 — Chạy hết chuỗi

```bash
USERS=$(kubectl get svc users-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}') && TASKS=$(kubectl get svc tasks-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}') && echo "users=$USERS tasks=$TASKS"
```

```bash
curl -s -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"123"}' http://$USERS:8080/signup
```

```bash
TOKEN=$(curl -s -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"123"}' http://$USERS:8080/login | sed -E 's/.*"token":"([^"]*)".*/\1/') && echo "token=$TOKEN"
```

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"title":"t1","text":"noi dung"}' http://$TASKS:8000/tasks
```

```bash
curl -s -H "Authorization: Bearer $TOKEN" http://$TASKS:8000/tasks
```

Kết quả lần lượt: `User created!`, một token, `Task stored.`, rồi danh sách task.

## Toàn cảnh

```bash
kubectl get deploy,svc -o wide
```

```
Client ──► users-service  (LoadBalancer :8080) ──► Pod users ──┐
                                                               ├──► auth-service (ClusterIP :80) ──► Pod auth
Client ──► tasks-service  (LoadBalancer :8000) ──► Pod tasks ──┘
```

Ba Deployment, ba Service, nhưng **chỉ hai Service ra tới ngoài**. `auth-service` là
ClusterIP — một API nội bộ không nên có `EXTERNAL-IP`.

Đối chiếu với `docker-compose.yaml`: `auth` cũng là service duy nhất **không có `ports`**.
Cùng một quyết định kiến trúc, hai cú pháp:

| Compose | K8s |
| --- | --- |
| Khoá `auth:` trong `services` | `Service` tên `auth-service` |
| Không có `ports` | `type: ClusterIP` |
| `ports: "8000:8000"` | `type: LoadBalancer`, `port: 8000` |
| `environment: AUTH_ADDRESS` | `env` trong Pod template |
| Mạng do Compose tự dựng | CNI + CoreDNS, có sẵn |

## Hai chặng mà client không thấy

`POST /tasks` đi qua hai chặng nội bộ:

```
curl ──► tasks-service ──► Pod tasks ──► auth-service ──► Pod auth
                                  ▲ verify-token         (trả uid)
```

Thử chặn đường đó để thấy nó có thật — scale `auth` về 0 rồi gọi lại:

```bash
kubectl scale deployment auth-deployment --replicas=0 && sleep 3 && curl -s -H "Authorization: Bearer $TOKEN" http://$TASKS:8000/tasks
```

Ra `Could not verify token.` — token vẫn đúng, chỉ là không còn ai xác thực. Bật lại:

```bash
kubectl scale deployment auth-deployment --replicas=1 && kubectl rollout status deployment auth-deployment --timeout=60s
```

`tasks` **không cần restart** sau khi `auth` sống lại: nó tra tên `auth-service` ở mỗi
request, đúng bài học [7.8](/blog/k8s/networking/dns-for-pod-to-pod).

## Những chỗ dễ sai

| Triệu chứng | Nguyên nhân |
| --- | --- |
| Pod `tasks` `CrashLoopBackOff` ngay từ đầu | Thiếu `TASKS_FOLDER` |
| `Could not verify token.` | `AUTH_ADDRESS` sai tên, hoặc trỏ vào `auth-deployment` thay vì `auth-service` |
| `Storing the task failed.` | Thiếu thư mục `/app/tasks` trong image |
| `tasks-service` mãi `<pending>` | Cổng 8000 đã bị Service khác hoặc `docker compose` giữ |
| Sửa code xong vẫn lỗi như cũ | Quên tăng tag image, Pod vẫn chạy bản cũ |

## Đừng dọn

Ba service này là nền cho phần frontend ở
[7.11](/blog/k8s/networking/adding-a-frontend).

## Self-check

- [ ] Giải thích được vì sao `tasks-service` là LoadBalancer còn `auth-service` là ClusterIP
- [ ] Nói được hai biến môi trường của `tasks` hỏng theo hai kiểu khác nhau thế nào
- [ ] Vẽ lại đường đi của `POST /tasks` qua hai Service
- [ ] Nói được vì sao `tasks` không phải restart sau khi `auth` sống lại

## Open questions

- `tasks` ghi vào file trong container — scale lên 3 bản thì ba Pod có thấy task của nhau không?
- Client đang phải nhớ hai địa chỉ khác nhau cho `users` và `tasks`. Gộp về một cửa được không?
