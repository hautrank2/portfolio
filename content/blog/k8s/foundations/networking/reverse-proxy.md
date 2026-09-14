---
title: Reverse proxy hoạt động ra sao
description: Người đứng giữa nhận request hộ backend. Section 4 của khoá dựng đúng một cái như vậy.
status: seed
created: 2026-08-21
updated: 2026-08-21
tags: [mang, nginx, proxy]
---

Bài 240 của khoá sẽ dựng một **reverse proxy** cho frontend. Nếu chưa từng cấu
hình cái nào thì bài đó thành gõ theo. Note này dựng trước một cái từ số 0,
để tới lúc đó bạn nhận ra chứ không học mới.

## Lý thuyết vừa đủ

**Forward proxy** đứng về phía *client*: che giấu người gọi (VPN, proxy công
ty). **Reverse proxy** đứng về phía *server*: che giấu backend — client chỉ
biết proxy, không biết phía sau có gì.

```
client ──► reverse proxy ──► backend A
                        └──► backend B
```

Vì mọi request đều chảy qua nó, reverse proxy là chỗ đặt những việc dùng
chung, khỏi lặp lại trong từng app:

| Việc | Nghĩa là |
| --- | --- |
| Định tuyến | `/api` → backend A, `/` → backend B |
| TLS termination | Proxy giữ chứng chỉ, backend nói HTTP thường |
| Che nguồn gốc | Client không bao giờ thấy IP backend |
| Thêm header | `X-Forwarded-For` để backend biết IP thật của client |

Trong K8s: **Ingress controller là một reverse proxy** được cấu hình tự động
từ các object Ingress. Sidecar của service mesh cũng là reverse proxy. Hiểu
một cái là hiểu cả họ.

> **Chuẩn bị:** chạy trên VM, cần `docker`. Bài này nối tiếp cấu hình từ
> [bài L4 vs L7](/blog/k8s/foundations/networking/l4-vs-l7) nhưng tự đứng được một mình.

## Bài tập 1 — Backend "gương": nó thấy gì thì nói nấy

Dùng image echo để backend in ra chính request nó nhận — công cụ soi hoàn hảo:

```bash
docker run -d --name echo -p 8080:80 ealen/echo-server
#                              └─ trả về JSON mô tả request nhận được
curl -s localhost:8080/xin-chao | head -c 300
```

Đọc JSON: backend thấy path `/xin-chao`, thấy header của curl. Ghi nhớ hình
dạng này để lát so sánh.

## Bài tập 2 — Chen proxy vào giữa

```bash
mkdir -p /tmp/rp && cat > /tmp/rp/default.conf <<'EOF'
server {
  listen 80;
  location / {
    proxy_pass http://172.17.0.1:8080;
    #          └─ đẩy mọi request sang backend echo
    proxy_set_header X-Forwarded-For $remote_addr;
    #                │               └─ IP thật của client
    #                └─ header quy ước để backend biết ai gọi thật
    proxy_set_header Host $host;
    #                └─ giữ nguyên Host client yêu cầu
  }
}
EOF

docker run -d --name rp -p 9091:80 \
  -v /tmp/rp/default.conf:/etc/nginx/conf.d/default.conf:ro nginx:alpine
```

**Đoán trước:** gọi qua proxy, backend sẽ thấy request đến từ IP nào — IP máy
bạn, hay IP của container nginx?

```bash
curl -s localhost:9091/qua-proxy | python3 -m json.tool \
  | grep -iA2 forwarded
#                                  └─ format JSON cho dễ đọc
```

**Kết quả:** trường `host` trong kết nối là **IP của container nginx** —
backend không hề thấy client thật. Nhưng nhờ dòng `proxy_set_header`, IP thật
được đính vào header `X-Forwarded-For`.

**Vì sao quan trọng:** đây là nguồn của một lỗi kinh điển — app sau proxy ghi
log toàn IP của proxy, rate-limit thì chặn nhầm... chính proxy. Mọi app đứng
sau Ingress đều phải đọc `X-Forwarded-For` nếu cần IP thật. Express còn có
hẳn cấu hình `app.set('trust proxy', true)` cho việc này.

## Bài tập 3 — Proxy chết khác gì backend chết

**Đoán trước:** tắt backend đi rồi gọi qua proxy — nhận được lỗi gì, mã mấy,
do ai trả?

```bash
docker stop echo
curl -i localhost:9091/ | head -3
docker start echo
```

**Kết quả:** `502 Bad Gateway` — và người trả lời là **nginx**, không phải
backend (backend chết rồi còn đâu). Từ giờ gặp 502 ở bất kỳ đâu, bạn dịch
được ngay: *"proxy còn sống, nhưng nó không với tới backend"*. Trong K8s đó
thường nghĩa là Pod chết hoặc Service không có endpoint.

Phân biệt luôn với hàng xóm hay bị lẫn:

| Mã | Ai nói | Nghĩa |
| --- | --- | --- |
| **502** | proxy | Gọi được backend nhưng backend chết/trả rác |
| **503** | proxy | Không có backend nào để gọi |
| **504** | proxy | Backend sống nhưng trả lời quá chậm |

Dọn:

```bash
docker rm -f echo rp && rm -rf /tmp/rp
```

## Self-check

- [ ] Vẽ được sơ đồ forward proxy vs reverse proxy, chỉ ra ai bị "che"
- [ ] Giải thích được vì sao backend sau proxy không thấy IP thật, và cách lấy lại
- [ ] Gặp 502 nói được ngay ai trả mã đó và nghĩa là gì
- [ ] Nói được Ingress controller là gì trong một câu dùng từ "reverse proxy"

## Open questions

- `X-Forwarded-For` giả mạo được — chuỗi tin cậy nhiều tầng proxy xử lý sao?
- Ingress-nginx sinh file cấu hình nginx thật ở đâu, xem được không?
- Khi nào cần reverse proxy TRONG Pod (sidecar) thay vì ngoài rìa cluster?
