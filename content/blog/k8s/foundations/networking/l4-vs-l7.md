---
title: Load balancing tầng 4 và tầng 7
description: Toàn bộ khác biệt giữa Service và Ingress nằm gọn trong một câu hỏi — thiết bị này đọc được gì?
status: seed
created: 2026-08-21
updated: 2026-08-21
tags: [mang, http, load-balancing]
---

Sang Section 4 bạn sẽ gặp hai thứ đều "đưa traffic vào app": **Service** và
**Ingress**. Chúng không thay thế nhau — chúng làm việc ở **hai tầng khác
nhau**, và note này là để phân biệt hai tầng đó trước khi gặp chúng.

## Lý thuyết vừa đủ

Mô hình mạng chia thành tầng. Chỉ cần quan tâm hai:

| Tầng | Đơn vị nhìn thấy | Ví dụ nội dung |
| --- | --- | --- |
| **L4** — transport | IP + port, dòng byte TCP | `10.42.0.7:3000`, không hơn |
| **L7** — application | Nội dung HTTP | method, path, Host header, cookie |

Một load balancer **L4** như người chuyển phát chỉ đọc **địa chỉ trên phong
bì**: chuyển gói tới đúng máy:port, không biết bên trong viết gì. Nhanh, rẻ,
dùng được cho mọi giao thức TCP (HTTP, Postgres, Redis, gRPC...).

Một load balancer **L7** **bóc phong bì ra đọc thư**: thấy `GET /api/users`,
thấy `Host: shop.example.com` — nên định tuyến được theo path, theo domain,
sửa được header, terminate được TLS. Đổi lại: chỉ hiểu HTTP, và tốn công hơn.

**Ánh xạ sang K8s — thuộc lòng bảng này:**

| K8s | Tầng | Vì thế |
| --- | --- | --- |
| Service | **L4** | Chỉ biết IP:port. Không phân biệt được `/api` với `/admin` |
| Ingress | **L7** | Đọc HTTP. Một địa chỉ phục vụ nhiều app theo Host/path |

> **Chuẩn bị:** chạy trên VM, cần `docker` và `curl`. Bài tập dựng hai web
> server rồi tự làm "load balancer" bằng tay ở cả hai tầng.

## Bài tập 1 — Dựng hai backend để có cái mà cân bằng

```bash
docker run -d --name web1 -p 8081:80 nginx:alpine
docker run -d --name web2 -p 8082:80 nginx:alpine
#              │          │
#              │          └─ host:container — cổng 8081/8082 trên VM
#              └─ đặt tên để dọn cho dễ

docker exec web1 \
  sh -c 'echo "TOI LA WEB1" > /usr/share/nginx/html/index.html'
docker exec web2 \
  sh -c 'echo "TOI LA WEB2" > /usr/share/nginx/html/index.html'

curl localhost:8081; curl localhost:8082
```

Hai server, hai câu trả lời khác nhau — giờ mới phân biệt được ai nhận request.

## Bài tập 2 — L4 bằng tay: chuyển tiếp mù chữ

`socat` chuyển tiếp TCP thuần — một L4 "load balancer" một đích, đủ để thấy
bản chất:

```bash
sudo apt install -y socat
socat TCP-LISTEN:9000,fork,reuseaddr TCP:localhost:8081 &
#     │              │                └─ đích: mọi byte đẩy sang đây
#     │              └─ fork: mỗi kết nối một process
#     └─ nghe cổng 9000
```

**Đoán trước:** `curl localhost:9000/does-not-exist` — socat có biết path
`/does-not-exist` không? Ai trả về 404?

```bash
curl -i localhost:9000/does-not-exist | head -3
#    └─ -i : in cả header phản hồi
kill %1
#    └─ tắt job nền số 1 (socat) khi xong
```

**Kết quả:** 404 đến từ **nginx**, không phải socat. socat chỉ bơm byte qua
lại — nó không hề biết đây là HTTP, càng không biết path. Đó là L4: muốn
định tuyến `/api` sang server khác? **Không thể.** Nó không đọc được chữ nào.

**Nối với K8s:** Service làm đúng việc này (bằng iptables thay vì process),
nên một Service chỉ trỏ được vào một nhóm Pod giống hệt nhau — không tách
`/api` và `/web` được.

## Bài tập 3 — L7 bằng tay: nginx đọc thư rồi mới chia

Dựng một nginx thứ ba làm reverse proxy định tuyến **theo path**:

```bash
mkdir -p /tmp/lb && cat > /tmp/lb/default.conf <<'EOF'
server {
  listen 80;
  location /mot/  { proxy_pass http://172.17.0.1:8081/; }
  location /hai/  { proxy_pass http://172.17.0.1:8082/; }
  #        │                   └─ 172.17.0.1: IP của host nhìn từ container
  #        └─ định tuyến DỰA TRÊN PATH — điều L4 không làm nổi
}
EOF

docker run -d --name lb -p 9090:80 \
  -v /tmp/lb/default.conf:/etc/nginx/conf.d/default.conf:ro nginx:alpine
#  └─ mount file cấu hình vừa viết vào chỗ nginx đọc, chỉ-đọc
```

**Đoán trước:** `curl localhost:9090/mot/` và `/hai/` trả về gì?

```bash
curl localhost:9090/mot/
curl localhost:9090/hai/
```

**Kết quả:** `TOI LA WEB1` và `TOI LA WEB2` — **một cổng duy nhất, hai app**,
chia theo path. nginx đã bóc HTTP ra đọc rồi mới quyết định. Đây chính xác là
việc Ingress controller làm trong cluster, và thực tế ingress controller phổ
biến nhất cũng chính là nginx.

Dọn:

```bash
docker rm -f web1 web2 lb && rm -rf /tmp/lb
```

## Self-check

- [ ] Nói được L4 nhìn thấy gì, L7 nhìn thấy gì — bằng ví dụ cụ thể
- [ ] Giải thích được vì sao socat không thể định tuyến theo path
- [ ] Ánh xạ đúng: Service → L4, Ingress → L7
- [ ] Trả lời được: cân bằng tải cho Postgres thì dùng tầng nào? Vì sao?

## Open questions

- gRPC chạy trên HTTP/2 — cân bằng L4 cho gRPC gặp vấn đề gì với kết nối dài?
- TLS passthrough (L4) vs TLS termination (L7) — Ingress chọn cái nào, khi nào?
- kube-proxy chế độ IPVS khác iptables ra sao, vẫn là L4 chứ?
