---
title: "7.8 Dùng DNS cho giao tiếp Pod-to-Pod"
description: Cách thứ ba cho AUTH_ADDRESS — một cái tên, tra cứu lại ở mỗi lần gọi, nên không có gì để mà gãy.
status: growing
created: 2026-09-14
updated: 2026-09-20
tags: [k8s, dns, coredns, service, network]
---

> Tiếp [7.7](/blog/k8s/networking/pod-to-pod-with-ip-and-env), nơi IP Pod và biến tự sinh
> đều gãy, mỗi cái một kiểu.

Cả ba cách đã thử đều **đóng băng một địa chỉ** ở đâu đó. Cách thứ tư bỏ hẳn địa chỉ: bạn
ghi một **cái tên**, và tên được phân giải **tại thời điểm gọi**.

## Bước 1 — Đổi `AUTH_ADDRESS` thành tên Service

Sửa `kubernetes/users-deployment.yaml`:

```yaml
          env:
            - name: AUTH_ADDRESS
              value: "auth-service"
```

```bash
kubectl apply -f kubernetes/users-deployment.yaml && kubectl rollout status deployment users-deployment --timeout=60s
```

```bash
USERS=$(kubectl get svc users-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}') && curl -s -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"123"}' http://$USERS:8080/signup
```

`User created!`. Không IP, không biến tự sinh, không phụ thuộc thứ tự tạo.

Cái tên `auth-service` đến từ `metadata.name` của Service — chính là thứ bạn đặt ở
[7.6](/blog/k8s/networking/creating-multiple-deployments). Đổi tên Service là phải đổi
`AUTH_ADDRESS` theo.

## Tên đầy đủ trông thế nào

```bash
kubectl exec deploy/users-deployment -- nslookup auth-service
```

```
Name:      auth-service.default.svc.cluster.local
Address 1: 10.43.57.210 auth-service.default.svc.cluster.local
```

Quy tắc:

```
<service>.<namespace>.svc.cluster.local
```

| Viết | Khi nào dùng được |
| --- | --- |
| `auth-service` | Cùng namespace |
| `auth-service.default` | Khác namespace |
| `auth-service.default.svc.cluster.local` | Luôn đúng, dùng khi muốn tường minh |

Tên phân giải ra đúng **ClusterIP** của Service, không phải IP Pod. DNS chỉ thay cho bước
"tìm địa chỉ Service"; việc chia traffic xuống Pod vẫn là của Service, như
[7.3](/blog/k8s/networking/services-revisited).

## Vì sao tên ngắn cũng ra

```bash
kubectl exec deploy/users-deployment -- cat /etc/resolv.conf
```

```
nameserver 10.43.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

Đây đúng là cơ chế `search domain` ở
[note nền tảng về DNS](/blog/k8s/foundations/networking/dns-and-resolv-conf) — không có gì
mới. kubelet ghi file này vào mọi Pod, trỏ `nameserver` về **CoreDNS**, và thêm dải hậu tố
để gõ `auth-service` là đủ.

CoreDNS chính là một Deployment bình thường trong cụm:

```bash
kubectl get deploy,svc -n kube-system -l k8s-app=kube-dns
```

Nó theo dõi mọi Service qua API server và giữ bản ghi DNS khớp theo.

## Bài tập — Vì sao cách này không gãy

**Đoán trước:** hai phép thử đã giết cách 1 và cách 2 ở 7.7. Lần này `users` **không hề
restart**. DNS chịu được không?

Phép thử 1 — Pod `auth` đổi IP:

```bash
kubectl delete pod -l app=auth && kubectl rollout status deployment auth-deployment --timeout=60s && curl -s -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"123"}' http://$USERS:8080/signup
```

**Vẫn `User created!`.** Tên trỏ vào ClusterIP, mà ClusterIP không đổi khi Pod sinh lại.

Phép thử 2 — xoá rồi tạo lại `auth-service`, tức là **ClusterIP đổi hẳn**:

```bash
kubectl delete svc auth-service && kubectl apply -f kubernetes/auth-service.yaml && kubectl get svc auth-service -o jsonpath='{.spec.clusterIP}{"\n"}'
```

```bash
curl -s -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"123"}' http://$USERS:8080/signup
```

**Cũng vẫn chạy** — dù ClusterIP vừa in ra đã là một con số khác, và Pod `users` thì không
restart lần nào. Ở 7.6 và 7.7, đúng phép thử này làm `users` chết.

```bash
kubectl get pods -l app=users
```

Cột `RESTARTS` vẫn `0`, `AGE` vẫn là Pod cũ.

Khác biệt nằm ở **thời điểm tra cứu**:

| Cách | Địa chỉ được quyết định lúc nào |
| --- | --- |
| IP Pod thủ công | Lúc bạn gõ vào file |
| ClusterIP copy tay | Lúc bạn gõ vào file |
| Biến tự sinh | Lúc **container khởi động** |
| **DNS** | **Lúc gọi** — mỗi request một lần tra |

Đó là toàn bộ lý do nó không gãy. Ba cách trước đóng băng một giá trị; DNS thì hỏi lại mỗi
lần.

## Bốn cách, tổng kết

| | Sống qua Pod đổi IP | Sống qua Service tạo lại | Không phụ thuộc thứ tự tạo | Đọc được |
| --- | --- | --- | --- | --- |
| IP Pod | ❌ | — | ✅ | ❌ |
| ClusterIP copy tay | ✅ | ❌ | ✅ | ❌ `10.43.57.210` |
| Biến tự sinh | ✅ | ❌ | ❌ | ⚠️ `$AUTH_SERVICE_SERVICE_HOST` |
| **DNS** | ✅ | ✅ | ✅ | ✅ `auth-service` |

Trong cụm thật, **gần như 100% giao tiếp nội bộ đi bằng DNS**. Ba cách kia đáng biết để
hiểu vì sao, và để đọc được code cũ của người khác.

## Một cạm bẫy: `ndots:5`

Dòng `options ndots:5` trong `resolv.conf` nghĩa là: tên có **ít hơn 5 dấu chấm** sẽ được
thử ghép với từng `search` domain **trước**, rồi mới hỏi thẳng.

Nên gọi `api.github.com` (2 dấu chấm) từ trong Pod sẽ lần lượt thử
`api.github.com.default.svc.cluster.local`, `api.github.com.svc.cluster.local`, … rồi mới
tới tên thật. Bốn lần tra hỏng trước mỗi lần gọi ra ngoài.

Cách chữa khi gọi dịch vụ bên ngoài nhiều: thêm dấu chấm cuối để báo "đây là tên tuyệt
đối, đừng ghép gì nữa":

```
https://api.github.com.
```

## Nhìn lại `docker-compose.yaml`

```yaml
  users:
    build: ./users-api
    environment:
      AUTH_ADDRESS: auth
```

Compose cũng nối bằng **tên**, và tên đó cũng là khoá service trong file. K8s không làm
gì lạ hơn — nó chỉ bắt bạn khai cái tên đó ra thành một object `Service`, và đổi lại cho
bạn quyền chọn `type`, `port`, `selector`.

Từ đây trở đi, mọi giao tiếp nội bộ trong dự án đều dùng tên Service.

## Đừng dọn

Giữ nguyên bốn object đang chạy — [7.9](/blog/k8s/networking/which-approach-is-best) sẽ
bắt bạn tự nối nốt `tasks`.

## Self-check

- [ ] Viết được tên DNS đầy đủ của một Service ở namespace khác
- [ ] Giải thích được vì sao gõ tên ngắn cũng ra
- [ ] Nói được DNS tra cứu **lúc gọi**, và vì sao điều đó khiến nó không gãy
- [ ] Giải thích được vì sao `users` sống sót khi `auth-service` bị tạo lại
- [ ] Biết `ndots:5` gây ra chuyện gì khi gọi dịch vụ ngoài cụm

## Open questions

- CoreDNS chết thì các Pod đang chạy có gọi nhau được nữa không?
- Service `headless` (`clusterIP: None`) thì `nslookup` trả về gì?
