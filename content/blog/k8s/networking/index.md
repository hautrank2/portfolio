---
title: "Giai đoạn 5 — Networking"
description: Phần khó nhất và phân hoá trình độ nhiều nhất. Không nén được.
order:
  - { slug: mo-hinh-mang-pod, title: "Mô hình mạng Pod — ba yêu cầu bắt buộc" }
  - { slug: service-types, title: "Service: ClusterIP, NodePort, LoadBalancer, ExternalName" }
  - { slug: service-khong-phai-process, title: "Service không phải một process" }
  - { slug: endpointslice, title: "EndpointSlice — nơi bắt đầu mọi việc debug Service" }
  - { slug: cluster-dns, title: "DNS nội bộ và search domain" }
  - ingress
  - { slug: gateway-api, title: "Gateway API — thế hệ sau của Ingress" }
  - { slug: network-policy, title: "NetworkPolicy và cái bẫy CNI không hỗ trợ" }
---

## Học ba yêu cầu này trước mọi thứ khác

Mọi CNI đều buộc phải thoả:

1. Mỗi Pod có **IP riêng**
2. Mọi Pod nói chuyện được với nhau **không qua NAT**
3. Agent trên node chạm được mọi Pod trên node đó

Nắm ba dòng này thì Service về sau rất dễ.

## Điểm thấu hiểu quan trọng nhất

**Service không phải một process.** Không có gì "đứng đó" nhận request. ClusterIP là
một IP ảo, hiện thực bằng luật iptables (hoặc IPVS/nftables) do `kube-proxy` ghi trên
**mọi node**.

```bash
sudo iptables-save | grep KUBE-SVC | head
```

Nhìn thấy luật thật một lần, Service hết trừu tượng.

## Lệnh debug số một

```bash
kubectl get endpointslices -l kubernetes.io/service-name=<svc>
```

Rỗng nghĩa là selector không khớp Pod nào. Service vẫn "tồn tại" bình thường nhưng
không trỏ tới đâu cả — bẫy kinh điển nhất của K8s.
