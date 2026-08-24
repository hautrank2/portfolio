---
title: TLS handshake, SNI và chain chứng chỉ
description: Đủ để không hoảng khi gặp lỗi x509, và hiểu Ingress cầm chứng chỉ hộ app nghĩa là gì.
status: seed
created: 2026-08-21
updated: 2026-08-21
tags: [mang, tls, https]
---

Sớm muộn bạn cũng gặp một trong hai dòng này:

```
x509: certificate signed by unknown authority
x509: certificate is valid for foo.com, not bar.com
```

Note này để khi gặp thì đọc hiểu được, thay vì copy lỗi lên Google và cầu may.

## Lý thuyết vừa đủ

**TLS handshake**, rút gọn còn bốn nhịp:

```
client:  Hello! Tôi muốn nói chuyện mã hoá. (kèm tên miền muốn gặp ← SNI)
server:  Đây chứng chỉ của tôi — công chứng bởi CA.
client:  Kiểm tra: đúng tên miền? còn hạn? CA có trong danh sách tôi tin?
cả hai:  Ok, thoả thuận khoá phiên. Từ giờ mã hoá hết.
```

**Chain chứng chỉ** — vì sao client tin một server lạ hoắc: chứng chỉ của
server được ký bởi CA trung gian, CA trung gian được ký bởi **root CA** — và
root CA thì **cài sẵn trong máy client** (thư mục `/etc/ssl/certs` trên
Linux). Tin gốc rễ → tin cả chuỗi.

```
server cert ──ký──► intermediate CA ──ký──► root CA
                          (root có sẵn trong máy client)
```

**SNI** (Server Name Indication): client nói tên miền mình muốn **ngay ở gói
Hello đầu tiên, trước khi mã hoá**. Nhờ đó một IP:443 duy nhất phục vụ được
trăm domain — server nhìn SNI để chọn đúng chứng chỉ đưa ra. Không có SNI thì
Ingress không thể tồn tại như ta biết.

> **Chuẩn bị:** chạy trên VM, cần `openssl` (có sẵn trên Ubuntu) và `curl`.
> Bài 3 cần `docker`.

## Bài tập 1 — Xem một handshake thật, chậm lại từng bước

```bash
openssl s_client -connect github.com:443 -servername github.com \
  </dev/null 2>/dev/null | head -30
#       │  └─ SNI trong Hello; </dev/null để tự thoát
#       │         └─ bắt tay tới host:port này
#       └─ client TLS "trong suốt" để soi handshake
```

Đọc output, tìm hai khối:

```
Certificate chain
 0 s:CN=github.com              ← chứng chỉ server, "s" = subject
   i:C=GB, O=Sectigo...         ← "i" = issuer, ai ký cho nó
 1 s:C=GB, O=Sectigo...         ← CA trung gian
   i:C=US, O=USERTRUST...       ← ký bởi root
```

Đúng cái chain trong lý thuyết, bằng dữ liệu thật. Chú ý: **root không được
gửi kèm** — server chỉ gửi tới CA trung gian, root phải có sẵn trong máy bạn.

**Đoán trước:** đổi `-servername` thành `google.com` (nhưng vẫn connect tới
`github.com:443`) — chứng chỉ nhận về là của ai?

Thử đi. Bạn vừa chứng minh server **chọn chứng chỉ theo SNI**, không theo IP.

## Bài tập 2 — Đọc nội dung một chứng chỉ

```bash
echo | openssl s_client -connect github.com:443 2>/dev/null \
  | openssl x509 -noout -dates -subject -ext subjectAltName
#           │     │      │      │        └─ danh sách tên miền hợp lệ (SAN)
#           │     │      │      └─ cấp cho ai
#           │     │      └─ hạn dùng từ ngày nào tới ngày nào
#           │     └─ đừng in cả khối base64
#           └─ bộ đọc chứng chỉ X.509
```

Nhìn `subjectAltName`: đây là danh sách tên miền chứng chỉ bảo hộ. Lỗi
`valid for foo.com, not bar.com` nghĩa là **tên bạn gọi không nằm trong danh
sách này** — thường do trỏ nhầm DNS hoặc thiếu domain khi xin chứng chỉ.

## Bài tập 3 — Tự làm CA, tự gây ra lỗi x509, rồi tự sửa

Tự ký một chứng chỉ và dựng HTTPS server:

```bash
mkdir -p /tmp/tls && cd /tmp/tls
openssl req -x509 -newkey rsa:2048 -nodes -days 7 \
  -keyout key.pem -out cert.pem -subj "/CN=lab.local" \
  -addext "subjectAltName=DNS:lab.local"
#  │       └─ khai tên miền hợp lệ — thiếu dòng này curl hiện đại sẽ chê
#  └─ -nodes: khoá không mật khẩu; -x509: tự ký luôn, mình là CA của mình

docker run -d --name tls -p 8443:443 \
  -v /tmp/tls:/certs:ro \
  nginx:alpine sh -c "cat > /etc/nginx/conf.d/tls.conf <<'EOC'
server {
  listen 443 ssl;
  ssl_certificate     /certs/cert.pem;
  ssl_certificate_key /certs/key.pem;
}
EOC
nginx -g 'daemon off;'"
```

**Đoán trước:** `curl https://lab.local:8443` (sau khi trỏ hosts) sẽ báo lỗi
gì? Vì chứng chỉ sai tên, hết hạn, hay vì lý do khác?

```bash
echo "127.0.0.1 lab.local" | sudo tee -a /etc/hosts
curl https://lab.local:8443
```

**Kết quả:** *"self-signed certificate"* — tên đúng, hạn còn, nhưng **không CA
nào trong máy ký cho nó**. Chain đứt ở gốc. Đây chính là `x509: unknown
authority`. Hai cách xử lý, một sai một đúng:

```bash
curl -k https://lab.local:8443
#    └─ SAI (nhưng hay gặp): bỏ qua kiểm tra — mất luôn ý nghĩa của TLS

curl --cacert /tmp/tls/cert.pem https://lab.local:8443
#    └─ ĐÚNG: "hãy tin CA này" — bổ sung gốc chain thay vì vứt cả chain
```

Cách thứ hai chạy ngon lành. **Nối với K8s:** đây đúng là việc bạn làm khi
cluster nội bộ dùng CA riêng — mount CA cert vào Pod, không phải tắt verify.
Và kubeconfig của k3s cũng chứa một `certificate-authority-data` làm y hệt
vậy cho kubectl.

Dọn:

```bash
docker rm -f tls && sudo sed -i '$d' /etc/hosts && rm -rf /tmp/tls
```

## Nối với K8s

**TLS termination tại Ingress**: Ingress giữ chứng chỉ (trong một Secret kiểu
`kubernetes.io/tls`), bắt tay TLS với client, rồi nói chuyện HTTP thường với
Pod phía sau. App của bạn không phải đụng vào chứng chỉ — và cert-manager sau
này chỉ là robot tự xin/gia hạn mấy cái Secret đó.

## Tự kiểm

- [ ] Kể được 4 nhịp của handshake và SNI nằm ở nhịp nào
- [ ] Giải thích được vì sao máy bạn tin github.com dù chưa gặp bao giờ
- [ ] Phân biệt được ba lỗi: sai tên / hết hạn / unknown authority
- [ ] Nói được vì sao `--cacert` đúng còn `-k` là đầu hàng

## Câu hỏi còn mở

- Let's Encrypt xác minh mình sở hữu domain bằng cách nào (HTTP-01, DNS-01)?
- mTLS — server cũng đòi chứng chỉ của client — thêm gì vào handshake?
- Vì sao SNI lộ tên miền dù TLS mã hoá, và ECH định sửa thế nào?
