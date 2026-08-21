---
title: Mạng
description: IP, DNS, proxy, TLS. Networking của K8s là bốn thứ này ghép lại, không hơn.
order:
  - { slug: ip-subnet-cidr, title: "IP, subnet và CIDR" }
  - { slug: dns-va-resolv-conf, title: "DNS và search domain trong resolv.conf" }
  - { slug: l4-vs-l7, title: "Load balancing tầng 4 và tầng 7" }
  - { slug: reverse-proxy, title: "Reverse proxy hoạt động ra sao" }
  - { slug: tls-sni-chain, title: "TLS handshake, SNI và chain chứng chỉ" }
---

Giai đoạn Networking của K8s là phần khó nhất và phân hoá trình độ nhiều nhất — nhưng
chỉ vì người ta bỏ qua phần này.

Hai thứ trả về nhiều nhất cho công sức bỏ ra:

- **`search domain` trong `/etc/resolv.conf`** — chính là lý do `curl http://api` chạy
  được bên trong cluster mà không cần tên đầy đủ
- **Phân biệt tầng 4 và tầng 7** — chính là toàn bộ khác biệt giữa `Service` và `Ingress`

Nắm hai cái đó trước, phần còn lại đọc lướt cũng được.
