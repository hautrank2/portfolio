---
title: "7.3 Nhìn lại Service"
description: users-service đang expose app ra ngoài cluster. Nhưng việc chính của Service là nối service với service — và đó là thứ users đang thiếu.
status: growing
created: 2026-09-14
updated: 2026-09-17
tags: [k8s, service, clusterip, network]
---

> Tiếp [7.2](/blog/k8s/networking/first-deployment). `users-deployment` và `users-service`
> đang chạy, `POST /signup` đang trả 500 vì `ENOTFOUND auth`.

[Note 5.8](/blog/k8s/k8s-in-action/service-object) giới thiệu Service, nhưng cả module đó
chỉ dùng nó để **expose app ra ngoài cluster** — `LoadBalancer`, `EXTERNAL-IP`, gọi từ máy mình.

`users-service` ở 7.2 cũng vậy. Đó là công dụng phụ. Việc chính của Service là **cho các
thành phần trong cụm tìm thấy nhau** — đúng thứ `users` đang cần để gọi `auth`.

## Ba con số trong `users-service`

```yaml
spec:
  selector:
    app: users          # tìm Pod mang nhãn này
  type: LoadBalancer
  ports:
    - protocol: TCP
      port: 8080        # cổng Service mở ra
      targetPort: 8080  # cổng trên Pod mà traffic được đẩy tới
```

```
Client ──► EXTERNAL-IP:8080 ──► Pod-IP:8080 ──► users-app.js listen(8080)
           (port)               (targetPort)
```

| Trường | Phải khớp với |
| --- | --- |
| `selector` | **Nhãn của Pod** — `template.metadata.labels` trong Deployment. Không phải tên Deployment |
| `targetPort` | Cổng app **thật sự** `listen` trong code |
| `port` | Không khớp với gì — bạn tự chọn, bên gọi dùng nó |

Còn `containerPort` bên Deployment chỉ là ghi chú: xoá đi app vẫn nhận request.

## Vì sao không gọi thẳng Pod

Lấy IP Pod của `users`:

```bash
kubectl get pods -l app=users -o jsonpath='{.items[0].status.podIP}{"\n"}'
```

Ghi lại. Giờ giết Pod, đợi Deployment đẻ Pod mới:

```bash
kubectl delete pod -l app=users && kubectl rollout status deployment users-deployment --timeout=60s && kubectl get pods -l app=users -o jsonpath='{.items[0].status.podIP}{"\n"}'
```

**IP đã khác.** Và không có gì báo cho bên gọi biết.

| Lý do Pod IP không dùng làm địa chỉ được | |
| --- | --- |
| **Đổi mỗi lần Pod sinh lại** | Crash, rollout, drain node — đều ra IP mới |
| **Nhiều bản thì nhiều IP** | `replicas: 3` là ba địa chỉ, ai chọn giúp bạn? |
| **Không biết trước** | Lúc viết YAML chưa có Pod nào để mà ghi IP |

Nếu `users-app.js` gọi `auth` bằng IP Pod, mỗi lần `auth` restart là `users` gãy.

## Service đứng yên, endpoint thì chạy theo

```bash
kubectl get svc users-service
```

```
NAME            TYPE           CLUSTER-IP     EXTERNAL-IP       PORT(S)          AGE
users-service   LoadBalancer   10.43.88.12    192.168.103.154   8080:31234/TCP   20m
```

Để ý cột `CLUSTER-IP`: Service kiểu `LoadBalancer` **cũng có ClusterIP**. Mỗi kiểu xây
chồng lên kiểu trước — `LoadBalancer` ⊃ `NodePort` ⊃ `ClusterIP`.

Giết Pod lần nữa, rồi so:

```bash
kubectl delete pod -l app=users && kubectl rollout status deployment users-deployment --timeout=60s && kubectl get svc users-service -o jsonpath='{.spec.clusterIP}{"\n"}' && kubectl get endpointslices -l kubernetes.io/service-name=users-service
```

ClusterIP **không đổi**, còn cột `ENDPOINTS` đã tự chuyển sang IP Pod mới. Đó là toàn bộ
công việc của Service: *giữ một địa chỉ đứng yên trước một danh sách Pod luôn động*.

## Bài tập — Gọi `users` từ trong cụm

**Đoán trước:** một Pod khác trong cụm gọi `http://users-service:8080/signup` — có tới
được `users` không? Nếu tới, nó trả gì?

```bash
kubectl run probe --rm -i --image=busybox:1.36 --restart=Never -- wget -qO- --header 'Content-Type: application/json' --post-data '{"email":"a@b.c","password":"123"}' http://users-service:8080/signup
```

**Kết quả:** `wget: server returned error: HTTP/1.1 500 Internal Server Error`.

Lỗi 500 là **tin tốt**: request đã đi qua Service tới tận app, và app trả đúng cái lỗi
`ENOTFOUND auth` như ở 7.2. Bạn gõ `users-service` — **tên Service**, không phải IP. Cái
tên đó phân giải được vì cụm tạo sẵn bản ghi DNS cho mọi Service; đào ở
[note 7.8](/blog/k8s/networking/dns-for-pod-to-pod).

Đọc ngược lại: `users` gọi `http://auth` mà gãy, vì **chưa có Service nào tên `auth`**.

## Bốn kiểu, và kiểu nào cho việc gì

| `type` | Dùng cho |
| --- | --- |
| **ClusterIP** | **Service gọi service** — mặc định, và là phần lớn Service trong một cụm thật |
| `NodePort` | Lab, demo nhanh |
| `LoadBalancer` | Thứ cần expose ra ngoài cluster — trong dự án này là `users` và `tasks` |
| `ExternalName` | Bí danh DNS trỏ ra dịch vụ ngoài cụm |

Nhìn lại sơ đồ đích ở 7.2: `auth` **không có mũi tên từ ngoài vào**. Nếu `auth` có
Service riêng thì nó phải là `ClusterIP`, không bao giờ là `LoadBalancer`.

## Hai con đường cho `auth`

| Con đường | `users` gọi `auth` bằng | Note |
| --- | --- | --- |
| Nhét `auth` vào **cùng Pod** với `users` | `localhost` — không cần Service | [7.4](/blog/k8s/networking/multiple-containers-in-one-pod), [7.5](/blog/k8s/networking/intra-pod-communication) |
| Cho `auth` **Pod riêng** + một Service `ClusterIP` | IP, biến môi trường, rồi DNS | [7.6](/blog/k8s/networking/creating-multiple-deployments) → [7.8](/blog/k8s/networking/dns-for-pod-to-pod) |

Section đi đường thứ nhất trước — ngắn hơn, và cho thấy Pod thật ra là gì.

## Đừng dọn

Giữ `users-deployment` và `users-service` — 7.4 sửa tiếp chúng.

## Self-check

- [ ] Nói được `selector`, `port`, `targetPort` của `users-service` mỗi cái khớp với gì
- [ ] Kể ba lý do không dùng Pod IP làm địa chỉ
- [ ] Giải thích được ClusterIP đứng yên trong khi endpoint thì đổi
- [ ] Giải thích được vì sao lỗi 500 từ Pod `probe` là dấu hiệu Service đã chạy đúng
- [ ] Nói được vì sao `auth` không bao giờ nên là `LoadBalancer`

## Open questions

- Service không có Pod nào khớp `selector` thì gọi vào sẽ ra lỗi gì?
- Hai Service cùng trỏ vào một tập Pod — có được không, và để làm gì?
