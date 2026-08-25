---
title: "Object Service"
description: Pod không có địa chỉ đáng tin. Service là cái tên không đổi đứng trước một danh sách luôn đổi.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, service, network]
---

Bạn vừa thấy Pod mọc lại với tên khác và IP khác. Vậy hai app gọi nhau bằng gì? Không
bằng IP — bằng **Service**.

## Service là hai thứ

1. Một **tên DNS + IP ảo** không bao giờ đổi trong suốt đời Service
2. Một **danh sách endpoint** được K8s tự cập nhật mỗi khi Pod sinh hoặc tử

Nó là load balancer **tầng 4**, do kube-proxy hiện thực bằng iptables trên từng node —
xem [Nhìn kỹ vào Worker Node](/blog/k8s/bat-dau-voi-k8s/worker-node). Không đọc HTTP,
không biết path.

## Bốn kiểu

| `type` | Ai gọi được | Dùng khi |
| --- | --- | --- |
| **ClusterIP** (mặc định) | Chỉ trong cluster | Service gọi service — đa số trường hợp |
| **NodePort** | Ngoài, qua `IP-node:30000-32767` | Lab, thử nhanh |
| **LoadBalancer** | Ngoài, qua LB thật | Production trên cloud |
| **ExternalName** | — | Bí danh DNS trỏ ra ngoài cluster |

`NodePort` và `LoadBalancer` **bao gồm** kiểu dưới nó: tạo một LoadBalancer là tự động
có luôn NodePort và ClusterIP.

## Bài tập 1 — Tên DNS bên trong cluster

**Đoán trước:** tạo Service tên `first-app`, rồi từ một Pod khác gõ `nslookup first-app`.
Ra được IP không? Nếu có thì tên đầy đủ trông thế nào?

```bash
kubectl expose deployment first-app --port=80
kubectl get svc first-app
```

```bash
kubectl run soi --rm -it --image=busybox:1.36 --restart=Never -- nslookup first-app
```

**Kết quả:**

```
Name:      first-app.default.svc.cluster.local
Address 1: 10.43.12.87 first-app.default.svc.cluster.local
```

Tên ngắn `first-app` giải được vì mỗi Pod có `/etc/resolv.conf` với `search
default.svc.cluster.local svc.cluster.local ...`. Nếu bạn đã đọc
[DNS và resolv.conf](/blog/k8s/nen-tang/mang/dns-va-resolv-conf) thì đây đúng là cơ chế
`search domain` cũ, không có gì mới.

Quy tắc đặt tên: `<service>.<namespace>.svc.cluster.local`. Gọi khác namespace thì phải
ghi thêm namespace — `first-app.production`.

## Bài tập 2 — IP ảo không thuộc về máy nào

**Đoán trước:** `10.43.12.87` là IP của Pod, của node, hay của cái gì?

```bash
kubectl get svc first-app -o jsonpath='{.spec.clusterIP}{"\n"}'
kubectl get endpointslice -l kubernetes.io/service-name=first-app -o jsonpath='{.items[0].endpoints[*].addresses}{"\n"}'
ip addr | grep 10.43 || echo "khong co interface nao mang IP nay"
```

**Kết quả:** ClusterIP **không nằm trên bất kỳ interface nào**, của node cũng như của
Pod. Nó là một địa chỉ hoàn toàn hư cấu, chỉ tồn tại trong **luật iptables** mà
kube-proxy viết ra. Gói gửi tới nó bị DNAT ngay tại chỗ sang IP một Pod thật.

Đó là lý do `ping 10.43.12.87` thường không ăn thua (không có ai trả lời ICMP) trong khi
`curl` cổng 80 lại chạy ngon — luật chỉ bắt đúng cổng đã khai.

**Vì sao quan trọng:** rất nhiều giờ debug bị đốt vì `ping` một ClusterIP rồi kết luận
"mạng hỏng". Với Service, công cụ đúng là `curl` hoặc `nc`, không phải `ping`.

## Tự kiểm

- [ ] Kể được bốn `type` và cái nào bao cái nào
- [ ] Viết được tên DNS đầy đủ của một Service ở namespace khác
- [ ] Giải thích được vì sao ClusterIP không xuất hiện trong `ip addr`
- [ ] Biết vì sao `ping` ClusterIP không phải phép thử đúng

## Câu hỏi còn mở

- Service `headless` (`clusterIP: None`) trả về gì khi nslookup, và ai cần nó?
- Nhiều Pod trên nhiều node — kube-proxy chọn Pod nào, và có ưu tiên Pod cùng node không?
