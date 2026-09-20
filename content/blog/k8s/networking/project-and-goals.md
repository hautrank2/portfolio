---
title: "7.1 Dự án khởi điểm & mục tiêu"
description: Ba API gọi nhau bằng tên. Docker Compose làm được trong mười dòng — cả section này là để K8s làm lại điều đó.
status: growing
created: 2026-09-14
updated: 2026-09-14
tags: [k8s, network, docker, microservice]
---

Section trước dùng **một** app. Section này dùng **ba**, và điều thú vị không nằm ở từng
cái mà ở chỗ chúng gọi nhau.

📦 [Tải source về](/code/kub-network-01-starting-setup.zip) — giải nén ra thư mục
`kub-network-01-starting-setup`.

## Ba service

| Service | Cổng | Route | Gọi ai |
| --- | --- | --- | --- |
| **auth-api** | `80` | `/hashed-password/:pw`, `/token/:hashed/:entered`, `/verify-token/:token` | Không gọi ai — nó là đáy |
| **users-api** | `8080` | `POST /signup`, `POST /login` | → auth |
| **tasks-api** | `8000` | `GET /tasks`, `POST /tasks` | → auth |

`auth-api` là service nội bộ thuần tuý: **không ai ngoài cụm được gọi nó**. Hai service
kia là mặt tiền, client gọi thẳng.

Mỗi cái là một app Express bé xíu, xác thực giả vờ — `password + '_hash'` là toàn bộ
thuật toán băm. Chủ ý: không có gì để phân tâm khỏi phần mạng.

## Chúng gọi nhau bằng gì

Mở `users-api/users-app.js`:

```js
const hashedPW = await axios.get('http://auth/hashed-password/' + password);
```

Và `tasks-api/tasks-app.js`:

```js
const response = await axios.get('http://auth/verify-token/' + token);
```

Cả hai gọi `http://auth` — **một cái tên**, không phải IP. Không cổng, nghĩa là cổng 80,
đúng cổng `auth-app.js` đang nghe.

Cái tên đó ở đâu ra? Trong `docker-compose.yaml`:

```yaml
services:
  auth:
    build: ./auth-api
  users:
    build: ./users-api
    ports:
      - "8080:8080"
  tasks:
    build: ./tasks-api
    ports:
      - "8000:8000"
    environment:
      TASKS_FOLDER: tasks
```

Docker Compose tự dựng một mạng và cho mỗi service **một bản ghi DNS theo đúng tên khoá**.
Khoá `auth:` là tên `auth` phân giải được. Mười dòng, không cấu hình gì thêm.

Để ý thêm hai chi tiết sẽ quay lại ám bạn:

- **`auth` không có `ports`** — nó không cần, vì chỉ được gọi từ trong mạng nội bộ
- **`tasks` cần `TASKS_FOLDER`** — `tasks-app.js` ghép `__dirname + process.env.TASKS_FOLDER`,
  đúng kiểu ở [note 6.14](/blog/k8s/data-and-volumes/environment-variables)

## Chạy thử bằng Docker trước

```bash
cd kub-network-01-starting-setup && docker compose up -d --build
```

```bash
curl -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"123"}' http://localhost:8080/signup
```

Ra `{"message":"User created!"}` nghĩa là `users` đã gọi sang `auth` thành công — cái tên
`auth` phân giải được.

Lấy token rồi tạo task:

```bash
TOKEN=$(curl -s -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"123"}' http://localhost:8080/login | sed -E 's/.*"token":"([^"]*)".*/\1/') && echo "token=$TOKEN"
```

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"title":"t1","text":"noi dung"}' http://localhost:8000/tasks
```

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/tasks
```

Ba service, hai lần gọi chéo, không dòng cấu hình mạng nào.

> `POST /tasks` chạy được vì source có sẵn `tasks-api/tasks/tasks.txt`. `tasks-app.js` ghi
> vào `__dirname + TASKS_FOLDER + '/tasks.txt'`, mà `fs.appendFile` tạo được file nhưng
> **không tạo được thư mục cha** — xoá thư mục đó đi là nhận ngay
> `Storing the task failed.`

Dọn trước khi sang K8s, để khỏi tranh cổng:

```bash
docker compose down
```

## Mục tiêu của section

Làm lại đúng những gì Compose vừa làm, nhưng trong cụm — và **mất nhiều hơn mười dòng
rất nhiều**.

| Câu hỏi | Compose | K8s |
| --- | --- | --- |
| `auth` là cái tên gì? | Khoá trong YAML | Phải tạo một **Service** |
| Ai được gọi từ ngoài? | Có `ports` thì có | `type` của Service quyết định |
| Hai service chung một máy? | Luôn luôn | Chung Pod, hay hai Pod — **bạn chọn** |
| Gọi nhau qua đâu | Tên service | `localhost`, biến môi trường, hay DNS |

Dòng cuối là dòng đáng giá nhất: K8s có **ba** cách, và section này đi qua cả ba theo thứ
tự từ tệ tới tốt — [7.7](/blog/k8s/networking/pod-to-pod-with-ip-and-env) và
[7.8](/blog/k8s/networking/dns-for-pod-to-pod).

## Self-check

- [ ] Kể được ba service, cổng và ai gọi ai
- [ ] Chỉ ra được chuỗi `http://auth` trong source và nói cái tên đó từ đâu ra
- [ ] Nói được vì sao `auth` không có `ports` trong compose
- [ ] Nói được bốn thứ Compose làm sẵn mà K8s bắt bạn tự khai

## Open questions

- Nếu `auth` đổi cổng từ 80 sang 3000, phải sửa bao nhiêu chỗ?
- `tasks` ghi vào file — vậy scale nó lên 3 bản thì chuyện gì xảy ra?
