---
title: "8.3 Chuẩn bị dự án"
description: Dự án mới, hai API và một database thật — đổi ba giá trị, build hai image, và xong phần chuẩn bị.
status: growing
created: 2026-09-25
updated: 2026-09-25
tags: [k8s, deploy, docker, mongodb, env]
---

Section này dùng một dự án **khác** với section 7 — nhỏ hơn về số service, nhưng lần đầu
có một **database thật** nằm ngoài cụm.

📦 [Tải source về](/code/kub-deploy.zip) — giải nén ra thư mục `kub-deploy`.

## Hai service

| Service | Cổng | Biến môi trường cần | Gọi ai |
| --- | --- | --- | --- |
| **auth-api** | `3000` | `TOKEN_KEY` | Không ai — nó ký và kiểm JWT |
| **users-api** | `3000` | `MONGODB_CONNECTION_URI`, `AUTH_API_ADDRESS` | → auth, → MongoDB Atlas |

Cả hai đều nghe **3000** — khác section trước, nơi mỗi service một cổng. Việc phân biệt
chúng từ ngoài là do Service của K8s làm, không phải do cổng app.

## Bản đồ cổng

Section này dùng block **8200–8201**, chọn để không đụng bất cứ thứ gì các section trước
đã chiếm:

| Cổng trên node | Ai giữ |
| --- | --- |
| 80, 443 | Traefik của k3s |
| 3000 | `story-service` — [section 6](/blog/k8s/data-and-volumes) |
| 8000, 8080, 8081, 8090 | `tasks`, `users`, `frontend` — [section 7](/blog/k8s/networking) |
| **8200** | **`auth` của section này** (chỉ khi chạy bằng Docker) |
| **8201** | **`users` của section này** |

Bản gốc của khoá dùng `8000` và `8080`, tôi đã đổi trong cả `docker-compose.yaml` lẫn
`kubernetes/users.yaml`.

> `auth-service` giữ nguyên `port: 3000` và **không** cần đổi, dù `story-service` cũng
> dùng 3000. Nó là `ClusterIP` — cổng nằm trên IP ảo trong cụm, không bind lên node. Chỉ
> `LoadBalancer` mới tranh cổng node, đúng như bạn đã gặp ở section 7.

Khác biệt lớn nhất so với `tasks-api` ở section 7: `users-api` **không ghi file**. Nó ghi
vào MongoDB Atlas — một database chạy ngoài cụm, ngoài cả AWS. Nên toàn bộ bài toán volume
của [section 6](/blog/k8s/data-and-volumes) biến mất, và thay vào đó là bài toán *"làm sao
đưa một chuỗi bí mật vào container"*.

## Ba giá trị bạn phải tự điền

Source ship kèm giá trị mẫu. **Cả ba đều phải đổi** trước khi chạy.

### 1. `MONGODB_CONNECTION_URI`

```yaml
MONGODB_CONNECTION_URI: 'mongodb+srv://<user>:<password>@<cluster>.mongodb.net/users?retryWrites=true&w=majority'
```

Tạo một cluster miễn phí ở [MongoDB Atlas](https://www.mongodb.com/atlas), lấy chuỗi
kết nối, rồi thay vào **hai chỗ**:

| File | Dùng khi |
| --- | --- |
| `docker-compose.yaml` | Chạy thử bằng Docker |
| `kubernetes/users.yaml` | Chạy trong cụm |

> Bản gốc của khoá nhúng sẵn một chuỗi kết nối **thật** kèm mật khẩu của tác giả. Tôi đã
> thay bằng placeholder — đừng đi tìm lại chuỗi đó ở đâu khác để dùng.

Nhớ vào **Network Access** của Atlas mở IP. Trong lab thì `0.0.0.0/0` cho nhanh, nhưng
biết rõ là bạn đang mở database ra cả internet.

### 2. `TOKEN_KEY`

```yaml
TOKEN_KEY: 'shouldbeverysecure'
```

Chuỗi này ký JWT. Tên nó đã nói rồi — đổi đi. Cũng ở hai chỗ: `docker-compose.yaml` và
`kubernetes/auth.yaml`.

### 3. Tên image

Trong `kubernetes/auth.yaml` và `kubernetes/users.yaml`:

```yaml
        - name: auth-api
          image: <your-docker-user>/kub-dep-auth:1
          imagePullPolicy: IfNotPresent
```

Thay `<your-docker-user>` bằng tài khoản Docker Hub của bạn. Bản gốc của khoá ghi
`academind/kub-dep-auth:latest` — tài khoản của tác giả, bạn không push lên đó được.

Hai chi tiết tôi đã sửa sẵn so với bản gốc:

| | Vì sao |
| --- | --- |
| `:latest` → `:1` | Tag di động khiến K8s không thấy gì để rollout khi bạn build lại — [note 5.12](/blog/k8s/k8s-in-action/updating-deployments) |
| Thêm `imagePullPolicy: IfNotPresent` | Để lab k3s dùng được image đã `ctr images import`, khỏi đi hỏi Docker Hub |

Dùng cụm thật (EKS) thì đổi `imagePullPolicy` thành `Always` và nhớ `docker push` — node
trên EKS không có kho local của bạn.

## Build hai image

```bash
cd kub-deploy && docker build -t <your-docker-user>/kub-dep-auth:1 ./auth-api && docker build -t <your-docker-user>/kub-dep-users:1 ./users-api
```

Đưa tới cụm — chọn **một** trong hai đường:

```bash
docker push <your-docker-user>/kub-dep-auth:1 && docker push <your-docker-user>/kub-dep-users:1
```

```bash
docker save <your-docker-user>/kub-dep-auth:1 | sudo k3s ctr images import - && docker save <your-docker-user>/kub-dep-users:1 | sudo k3s ctr images import -
```

Đường trên cho cụm thật (EKS bắt buộc phải qua registry). Đường dưới cho lab k3s — nhớ
đặt `imagePullPolicy: IfNotPresent` trong manifest, nếu không kubelet vẫn đi hỏi Docker Hub.

Kiểm cả hai image đã có:

```bash
docker images | grep kub-dep
```

## Chạy thử bằng Docker trước

```bash
docker compose up -d --build
```

```bash
curl -i -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"1234567"}' http://localhost:8201/signup
```

```bash
curl -s -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"1234567"}' http://localhost:8201/login
```

`signup` ra `201` nghĩa là **cả ba mắt xích đã thông**: `users` gọi được `auth`, và
`users` ghi được vào Atlas. `login` trả về một JWT.

> Nhận `422 {"message":"Invalid email or password."}` thì **chưa phải lỗi hạ tầng**.
> `validateCredentials` trong `users-api/controllers/user-actions.js` đòi password **≥ 7
> ký tự** và email phải có `@`. Nó chặn trước khi gọi `auth` hay Mongo, nên một `422` ở đây
> không nói được gì về việc hai service đã nối được nhau chưa.

Phân biệt được hai loại lỗi này là kỹ năng đáng giữ: `422` là app tự từ chối, còn `500`
mới là dấu hiệu một mắt xích phía sau đứt.

Vào Atlas xem collection `users` — bản ghi vừa tạo nằm ở đó, **ngoài cụm**, nên nó sống
sót qua mọi thứ bạn sắp làm với Kubernetes.

```bash
docker compose down
```

## Một chỗ khác với bản gốc của khoá

Source gốc gõ nhầm tên biến thành `AUTH_API_ADDRESSS` — **ba chữ `S`**. Tôi đã sửa thành
`AUTH_API_ADDRESS` ở cả bốn chỗ nó xuất hiện:

| File | Vai trò |
| --- | --- |
| `users-api/controllers/user-actions.js` | Hai lần `process.env.…` |
| `docker-compose.yaml` | Khai biến khi chạy bằng Docker |
| `kubernetes/users.yaml` | Khai biến khi chạy trong cụm |

Nếu bạn đối chiếu với video của khoá và thấy ba chữ `S`, đó là lý do.

**Vì sao chi tiết này đáng nhớ:** tên biến môi trường phải khớp **từng ký tự** giữa nơi
khai và nơi đọc, mà không có gì kiểm giúp bạn. Sửa một chỗ quên chỗ kia thì `process.env`
trả `undefined`, URL thành `http://undefined/hashed-pw/…`, và bạn nhận lỗi 500 không hé lộ
gì về nguyên nhân.

Cùng họ với `targetPort` sai số và `selector` lệch nhãn: **K8s không kiểm được thứ nằm
bên trong container.**

```bash
kubectl exec deploy/users-deployment -- printenv | grep AUTH
```

Lệnh này là cách duy nhất chắc chắn — nó đọc từ chính tiến trình, không phải từ file YAML.

## Self-check

- [ ] Kể hai service, cổng và biến môi trường từng cái cần
- [ ] Đổi được ba giá trị ở đúng mọi chỗ chúng xuất hiện
- [ ] Build và đưa được hai image tới nơi cụm lấy được
- [ ] `signup` ra `201` khi chạy bằng Docker
- [ ] Nói được vì sao section này không còn bài toán volume

## Open questions

- Chuỗi kết nối MongoDB nằm thẳng trong YAML — ai đọc `kubectl describe pod` sẽ thấy gì?
- Database ở ngoài cụm thì `kubectl delete namespace` có xoá dữ liệu không?
