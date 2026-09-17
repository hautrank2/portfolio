---
title: "7.4 Nhiều container trong một Pod"
description: Nhét auth vào chung Pod với users — READY 2/2, auth chạy ngay cạnh, vậy mà signup vẫn 500.
status: growing
created: 2026-09-14
updated: 2026-09-17
tags: [k8s, pod, sidecar, network]
---

> Tiếp [7.3](/blog/k8s/networking/services-revisited). Đang đứng trong thư mục
> `kub-network-01-starting-setup`, `users-deployment` và `users-service` đang chạy.

Tới giờ mọi Pod bạn dựng đều có đúng **một** container, tới mức dễ tưởng Pod và container
là một. Không phải — và note này dùng điều đó để đưa `auth` vào cụm theo đường ngắn nhất.

## Pod chia sẻ gì, không chia sẻ gì

| Chia sẻ | Không chia sẻ |
| --- | --- |
| **Network namespace** — cùng IP, cùng dải cổng, gọi nhau qua `localhost` | **Hệ thống file** — mỗi container một image, một lớp ghi riêng |
| **Volume** đã khai, nếu cùng mount | Tiến trình — mỗi container một PID 1 riêng |
| Vòng đời — sinh cùng, chết cùng, dời node cùng | **Biến môi trường**, `resources` |

Dòng đầu là chủ đề của [note sau](/blog/k8s/networking/intra-pod-communication). Dòng
cuối cột phải cũng sẽ quay lại ở đó.

## Bước 1 — Gom YAML vào một chỗ

Từ note này, mọi manifest nằm trong `kubernetes/`:

```bash
mkdir -p kubernetes && mv users-deployment.yaml users-service.yaml kubernetes/
```

## Bước 2 — Đưa image `auth` tới cụm

Giống hệt cách làm với `users` ở 7.2:

```bash
docker build -t hautrank2/kub-demo-auth:1 auth-api
```

```bash
docker save hautrank2/kub-demo-auth:1 | sudo k3s ctr images import -
```

> Nếu bạn đẩy image lên Docker Hub thay vì import, thay tiền tố `hautrank2` bằng tài khoản
> của mình và đổi `imagePullPolicy` thành `Always`. Lỗi `ImagePullBackOff` kèm
> `pull access denied` gần như luôn có nghĩa là image **chưa thật sự lên Hub** — kiểm tra
> bằng `docker manifest inspect <image>`.

## Bước 3 — Thêm container thứ hai

Sửa `kubernetes/users-deployment.yaml`, thêm một phần tử vào `containers`:

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
        - name: auth
          image: hautrank2/kub-demo-auth:1
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 80
```

`users-service.yaml` **không đổi**: nó vẫn chọn Pod theo nhãn `app: users` và chỉ đẩy
traffic vào cổng `8080`. Không có đường nào từ ngoài vào cổng `80` của `auth` — đúng như
sơ đồ đích.

```bash
kubectl apply -f kubernetes/users-deployment.yaml && kubectl rollout status deployment users-deployment --timeout=60s
```

**Đoán trước:** cột `READY` sẽ là `1/1` hay `2/2`?

```bash
kubectl get pods -l app=users
```

```
NAME                                READY   STATUS    RESTARTS   AGE
users-deployment-7d9c6b8f4-x2kqp    2/2     Running   0          8s
```

Là **`2/2`**. Cột đó đọc là *"số container sẵn sàng / tổng số container"*, không phải số
Pod. Từ giờ nhìn `READY 1/2` là biết ngay: Pod có hai container và một cái đang hỏng.

Một IP duy nhất cho cả hai:

```bash
kubectl get pods -l app=users -o jsonpath='{.items[0].status.podIP}{"\n"}'
```

Muốn thao tác với container nào thì phải chỉ rõ bằng `-c`:

```bash
kubectl logs deploy/users-deployment -c auth --tail=5
```

Bỏ `-c` khi Pod có nhiều container thì `kubectl` chọn cái đầu tiên và **in một cảnh báo**
— dễ bỏ sót, và bạn sẽ ngồi đọc log nhầm container.

## Bài tập — Giờ đã có `auth` rồi, signup chạy chưa?

**Đoán trước:** `auth` đang chạy, nghe cổng 80, nằm **ngay trong Pod** với `users`, và
container còn được đặt tên đúng là `auth`. Gọi lại `signup` thì sao?

```bash
USERS=$(kubectl get svc users-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}') && echo $USERS
```

```bash
curl -i -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"123"}' http://$USERS:8080/signup
```

**Kết quả:** vẫn `500`. Xem log — nhớ `-c users`:

```bash
kubectl logs deploy/users-deployment -c users --tail=30 | grep -m1 -i "ENOTFOUND"
```

Vẫn `getaddrinfo ENOTFOUND auth`.

**`name: auth` của container không phải một cái tên mạng.** Nó chỉ là nhãn để `kubectl`
chỉ đích (`-c auth`). Không có DNS nào tạo ra từ nó. Bên trong Pod, `auth` chạy ở một nơi
duy nhất: `localhost:80`. Nhưng code vẫn đang gõ cứng `http://auth` — sửa chỗ đó là việc
của [7.5](/blog/k8s/networking/intra-pod-communication).

## Khi nào nên, khi nào không

Câu hỏi không phải *"làm được không"* mà *"hai thứ này có thật sự là một đơn vị không"*.

**Nên chung một Pod:**

| Mẫu | Ví dụ |
| --- | --- |
| **Sidecar** | Agent gom log đọc chung volume với app |
| **Ambassador** | Proxy đứng trước, app chỉ gọi `localhost` |
| **Adapter** | Container chuyển định dạng metric cho hệ giám sát |
| **Init** | Chạy xong rồi tắt, chuẩn bị dữ liệu cho container chính |

Điểm chung: cái phụ **không có ý nghĩa gì nếu đứng một mình**, và luôn cần scale y hệt
cái chính.

**Không nên chung một Pod:**

- Hai API riêng biệt — chúng cần scale độc lập
- Frontend và backend — số lượng và nhịp deploy khác nhau
- App và database — database gần như không bao giờ nên nằm trong Pod của app

Phép thử gọn: **"tôi có muốn scale hai thứ này với số lượng khác nhau không?"** Có → hai
Deployment. Không → cân nhắc chung Pod.

Áp vào dự án: `users` + `auth` **trượt** phép thử. `auth` là một API riêng, và `tasks`
cũng cần nó — `tasks` không thể "chui" vào Pod này để gọi `localhost`. Gộp ở đây là để
học Pod, không phải thiết kế đúng; [7.6](/blog/k8s/networking/creating-multiple-deployments)
sẽ tách `auth` ra.

## Cái giá phải trả

| | |
| --- | --- |
| Scale chung | `replicas: 3` là ba bản `auth`, dù `auth` rảnh |
| Chết chung | `auth` crash liên tục kéo cả Pod vào `CrashLoopBackOff`, `users` cũng mất |
| Cổng phải khác nhau | Cùng network namespace nên không ai được trùng cổng |
| Deploy chung | Sửa `auth` là rollout cả `users` |

Vì vậy mặc định vẫn nên là **một container một Pod**. Nhiều container là ngoại lệ có lý
do, không phải cách làm thông thường.

## Đừng dọn

Pod hai container này là điểm xuất phát của 7.5.

## Self-check

- [ ] Kể được cái gì chia sẻ và cái gì không giữa các container trong một Pod
- [ ] Đọc đúng cột `READY 2/2`
- [ ] Nhớ dùng `-c` với `logs` và `exec`
- [ ] Giải thích được vì sao container tên `auth` không làm `http://auth` phân giải được
- [ ] Dùng phép thử "có muốn scale khác nhau không" để nói vì sao `users` + `auth` chung Pod là thiết kế tạm

## Open questions

- `initContainers` khác container thường ở chỗ nào, và chạy lúc nào?
- Một container trong Pod chết hẳn — Pod có bị coi là chết không?
