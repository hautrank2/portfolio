---
title: "7.8 Dùng DNS cho giao tiếp Pod-to-Pod"
description: Cách thứ ba, và là cách duy nhất không gãy — vì nó tra cứu lúc gọi, không phải lúc khởi động.
status: growing
created: 2026-09-14
updated: 2026-09-14
tags: [k8s, dns, coredns, service, network]
---

> Tiếp [note 7.7](/blog/k8s/networking/pod-to-pod-with-ip-and-env), nơi hai cách đầu đều
> gãy.

Cách thứ ba bỏ hẳn việc ghi địa chỉ vào đâu đó. Bạn gọi bằng **tên**, và tên được phân
giải **tại thời điểm gọi**.

```bash
kubectl create deployment backend --image=nginx:1.27-alpine --port=80 && kubectl expose deployment backend --port=80
```

```bash
kubectl run caller --image=busybox:1.36 --restart=Never -- sh -c 'sleep 3600'
```

```bash
kubectl exec caller -- wget -qO- http://backend | head -3
```

Chỉ vậy. Không IP, không biến môi trường, không phụ thuộc thứ tự tạo.

## Tên đầy đủ trông thế nào

```bash
kubectl exec caller -- nslookup backend
```

```
Name:      backend.default.svc.cluster.local
Address 1: 10.43.201.55 backend.default.svc.cluster.local
```

Quy tắc:

```
<service>.<namespace>.svc.cluster.local
```

| Viết | Khi nào dùng được |
| --- | --- |
| `backend` | Cùng namespace |
| `backend.default` | Khác namespace |
| `backend.default.svc.cluster.local` | Luôn đúng, dùng khi muốn tường minh |

## Vì sao tên ngắn cũng ra

```bash
kubectl exec caller -- cat /etc/resolv.conf
```

```
nameserver 10.43.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

Đây đúng là cơ chế `search domain` ở
[note nền tảng về DNS](/blog/k8s/foundations/networking/dns-and-resolv-conf) — không có gì
mới. kubelet ghi file này vào mọi Pod, trỏ `nameserver` về **CoreDNS**, và thêm dải hậu tố
để gõ `backend` là đủ.

CoreDNS chính là một Deployment bình thường trong cụm:

```bash
kubectl get deploy,svc -n kube-system -l k8s-app=kube-dns
```

Nó theo dõi mọi Service qua API server và giữ bản ghi DNS khớp theo.

## Bài tập — Vì sao cách này không gãy

**Đoán trước:** giết Pod backend để đổi IP, và tạo Service **sau khi** `caller` đã chạy —
hai thứ đã làm gãy cách 1 và cách 2. DNS có chịu nổi không?

```bash
kubectl delete pod -l app=backend && sleep 8 && kubectl exec caller -- wget -qO- http://backend | head -3
```

**Vẫn chạy.** Tên trỏ vào ClusterIP, mà ClusterIP không đổi khi Pod sinh lại.

Giờ thử vế thứ hai — Service tạo sau Pod:

```bash
kubectl create deployment later --image=nginx:1.27-alpine --port=80 && kubectl expose deployment later --port=80 && sleep 3 && kubectl exec caller -- wget -qO- http://later | head -3
```

**Cũng chạy**, dù `caller` khởi động từ trước khi `later` tồn tại.

Khác biệt nằm ở **thời điểm tra cứu**:

| Cách | Địa chỉ được quyết định lúc nào |
| --- | --- |
| IP thủ công | Lúc bạn gõ vào file |
| Biến môi trường | Lúc **container khởi động** |
| **DNS** | **Lúc gọi** — mỗi request một lần tra |

Đó là toàn bộ lý do nó không gãy. Hai cách trước đóng băng một giá trị; DNS thì hỏi lại
mỗi lần.

## Ba cách, tổng kết

| | Sống qua Pod đổi IP | Không phụ thuộc thứ tự tạo | Đọc được |
| --- | --- | --- | --- |
| IP thủ công | ❌ | ✅ | ❌ |
| Biến môi trường | ✅ | ❌ | ⚠️ `$BACKEND_SERVICE_HOST` |
| **DNS** | ✅ | ✅ | ✅ `http://backend` |

Trong cụm thật, **gần như 100% giao tiếp nội bộ đi bằng DNS**. Hai cách kia đáng biết để
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

## Dọn

```bash
kubectl delete deployment backend later; kubectl delete svc backend later; kubectl delete pod caller
```

## Self-check

- [ ] Viết được tên DNS đầy đủ của một Service ở namespace khác
- [ ] Giải thích được vì sao gõ tên ngắn cũng ra
- [ ] Nói được DNS tra cứu **lúc gọi**, và vì sao điều đó khiến nó không gãy
- [ ] Biết `ndots:5` gây ra chuyện gì khi gọi dịch vụ ngoài cụm

## Open questions

- CoreDNS chết thì các Pod đang chạy có gọi nhau được nữa không?
- Service `headless` (`clusterIP: None`) thì `nslookup` trả về gì?
