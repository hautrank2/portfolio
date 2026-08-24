---
title: DNS và search domain trong resolv.conf
description: Lý do thật sự khiến `curl http://api` chạy được trong cluster nằm ở một dòng của file này.
status: seed
created: 2026-08-21
updated: 2026-08-21
tags: [mang, dns]
---

Trong cluster, code của bạn sẽ gọi service khác bằng một cái tên cụt lủn:

```js
fetch("http://users-api/login")
```

Không có `.com`, không có IP. Nó chạy được nhờ một cơ chế DNS có từ trước K8s
hàng chục năm: **search domain**. Note này làm chủ cơ chế đó trước, để sang
Section 4 nó không còn là phép màu.

## Lý thuyết vừa đủ

Phân giải tên trên Linux đi qua hai chặng:

```
app hỏi "users-api là ai?"
  → đọc /etc/nsswitch.conf: tra ở đâu trước? (files → dns)
  → /etc/hosts có không? có thì dùng luôn
  → không có → hỏi DNS server ghi trong /etc/resolv.conf
```

`/etc/resolv.conf` chỉ có hai dòng đáng quan tâm:

```
nameserver 127.0.0.53      # hỏi ai
search local.lan           # tên cụt thì tự nối thêm đuôi gì
```

Dòng `search` là nhân vật chính: khi bạn hỏi một tên **không có dấu chấm đủ**,
resolver tự thử `users-api` + từng đuôi trong danh sách search cho tới khi trúng.

> **Chuẩn bị:** chạy trên VM có k3s. Bài 3 cần `kubectl` chạy được bằng user
> thường — xem [ghi chú môi trường](/blog/k8s/nen-tang/linux) nếu chưa.

## Bài tập 1 — Xem hai file điều khiển việc tra tên

```bash
cat /etc/nsswitch.conf | grep hosts
#                        └─ chỉ lấy dòng quy định thứ tự tra tên máy
```

```
hosts: files mdns4_minimal [NOTFOUND=return] dns
#      │                                     └─ cuối cùng mới hỏi DNS
#      └─ "files" = /etc/hosts được ưu tiên trước
```

**Đoán trước:** nếu bạn thêm dòng `1.2.3.4 google.com` vào `/etc/hosts`, thì
`ping google.com` sẽ đi đâu?

```bash
echo "1.2.3.4 google.com" | sudo tee -a /etc/hosts
#                                    └─ -a : nối vào cuối, không ghi đè
ping -c1 google.com
sudo sed -i '$d' /etc/hosts
#         │  └─ '$d' : xoá dòng cuối cùng — dọn ngay kẻo quên
#         └─ -i : sửa thẳng vào file
```

**Kết quả:** ping đi thẳng vào `1.2.3.4` — DNS không hề được hỏi. `files` đứng
trước `dns` nên `/etc/hosts` thắng tuyệt đối. Đây là lý do trò "sửa hosts để
test domain trước khi trỏ DNS" hoạt động.

## Bài tập 2 — Tự tạo search domain và thấy nó nối đuôi

**Đoán trước:** nếu `search` có `example.com`, thì gõ `ping web` resolver sẽ
thử tra những tên nào, theo thứ tự nào?

Dùng `resolvectl` để xem cấu hình DNS thật (Ubuntu dùng systemd-resolved, file
`/etc/resolv.conf` chỉ là stub):

```bash
resolvectl status | head -20
#          └─ DNS theo interface: server + search domain
```

Rồi quan sát hành vi nối đuôi bằng `host` với tuỳ chọn debug:

```bash
host -v web 2>&1 | grep "Trying"
#    │            └─ lọc các dòng cho biết resolver ĐANG THỬ tên nào
#    └─ -v : verbose, in từng bước
```

Bạn sẽ thấy nó thử `web.<search-domain-của-bạn>` trước, rồi mới thử `web` trần.
Số dấu chấm trong tên quyết định thứ tự này (tuỳ chọn `ndots`, mặc định 1):
tên ít chấm → thử search domain trước.

## Bài tập 3 — Nhìn resolv.conf mà K8s phát cho Pod

Đây là bài đáng giá nhất: so sánh resolv.conf **của VM** với resolv.conf
**bên trong một Pod**.

```bash
kubectl run t --rm -it --image=busybox:1.36 -- cat /etc/resolv.conf
#           │  │    │                         └─ lệnh chạy trong Pod
#           │  │    └─ -it : gắn terminal tương tác
#           │  └─ --rm : xoá Pod ngay khi lệnh xong
#           └─ tên Pod tạm
```

```
nameserver 10.43.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

Ba dòng, ba phát hiện:

1. **`nameserver 10.43.0.10`** — không phải DNS của VM! Đây là Service
   `kube-dns` (bạn đã thấy IP này ở [bài CIDR](/blog/k8s/nen-tang/mang/ip-subnet-cidr)).
   K8s **thay hẳn** resolv.conf của Pod.
2. **`search default.svc.cluster.local ...`** — chính là ma thuật: gọi
   `users-api` thì resolver tự thử `users-api.default.svc.cluster.local`,
   và tên đó CoreDNS trả lời được.
3. **`ndots:5`** — tên dưới 5 dấu chấm đều bị thử search domain trước. Nghĩa là
   cả `api.example.com` (2 chấm) cũng bị thử `api.example.com.default.svc...`
   trước khi hỏi ra ngoài — một nguồn chậm trễ có thật trong production.

**Nối với K8s:** tên đầy đủ của mọi Service là
`<service>.<namespace>.svc.cluster.local`. Cùng namespace thì gọi tên cụt,
khác namespace thì `users-api.backend` — search domain lo phần còn lại.

## Tự kiểm

- [ ] Kể được thứ tự tra tên: nsswitch → hosts → resolv.conf → DNS server
- [ ] Giải thích được search domain nối đuôi thế nào, và `ndots` can thiệp ở đâu
- [ ] Đọc được resolv.conf của một Pod và chỉ ra `10.43.0.10` là ai
- [ ] Viết được tên đầy đủ của Service `web` trong namespace `shop`

## Câu hỏi còn mở

- `ndots:5` gây bao nhiêu query thừa khi Pod gọi API bên ngoài? Cách giảm?
- CoreDNS làm gì khi được hỏi một tên không thuộc `cluster.local`?
- Vì sao K8s chọn thay hẳn resolv.conf thay vì thêm vào cấu hình sẵn có?
