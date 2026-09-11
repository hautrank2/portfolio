---
title: IP, subnet và CIDR
description: Đọc được 10.42.0.0/16 là đọc được một nửa cấu hình mạng của cluster.
status: seed
created: 2026-08-21
updated: 2026-08-21
tags: [mang, ip, cidr]
---

Mở tài liệu k3s ra là gặp ngay hai dòng kiểu này:

```
--cluster-cidr  10.42.0.0/16    # dải IP cấp cho Pod
--service-cidr  10.43.0.0/16    # dải IP cấp cho Service
```

Không đọc được ký hiệu `/16` thì hai dòng trên là mật mã. Note này để đọc được chúng.

## Lý thuyết vừa đủ

Một địa chỉ IPv4 là **32 bit**, viết thành 4 cụm số. `10.42.7.9` thực chất là:

```
00001010 . 00101010 . 00000111 . 00001001
   10        42          7          9
```

**CIDR** (`/N`) nói: **N bit đầu là phần mạng, phần còn lại là máy**.

| Ký hiệu | Phần mạng cố định | Số địa chỉ | Dải |
| --- | --- | --- | --- |
| `10.42.0.0/16` | `10.42` | 65 536 | `10.42.0.0` → `10.42.255.255` |
| `10.42.7.0/24` | `10.42.7` | 256 | `10.42.7.0` → `10.42.7.255` |
| `10.42.7.9/32` | tất cả | 1 | đúng một máy |

Con số ở cột "Số địa chỉ" đến từ công thức: **2^(32 − N)** — khoá N bit
đầu thì còn `32 − N` bit chạy tự do, mỗi bit nhân đôi số tổ hợp. Với `/24`:
2^(32−24) = 2⁸ = 256 (cụm cuối chạy từ 0 tới 255).

Mẹo nhẩm: mỗi lần `/N` giảm 8 thì dải to gấp 256 lần. `/24` = 1 cụm chạy tự do,
`/16` = 2 cụm, `/8` = 3 cụm.

**Ba dải IP private** — không bao giờ xuất hiện trên Internet công cộng:

```
10.0.0.0/8          (10.x.x.x)
172.16.0.0/12       (172.16.x.x → 172.31.x.x)
192.168.0.0/16      (192.168.x.x)
```

VM của bạn, Pod, Service của k3s — tất cả đều nằm trong các dải này.

> **Chuẩn bị:** chạy trên VM Linux có k3s. Không cần `sudo` trừ khi ghi chú.

## Bài tập 1 — Đọc bản đồ mạng của chính VM

**Đoán trước:** VM của bạn có bao nhiêu interface mang IP? Cái nào là mạng
thật của VirtualBox, cái nào do k3s tự tạo?

```bash
ip -4 addr
#  │  └─ chỉ hiện IPv4 cho đỡ rối
#  └─ công cụ chuẩn thay cho ifconfig cũ
```

Kết quả điển hình trên VM VirtualBox chạy k3s:

```
1: lo        inet 127.0.0.1/8         ← loopback, luôn có
2: enp0s3    inet 10.0.2.15/24        ← NAT của VirtualBox
4: cni0      inet 10.42.0.1/24        ← k3s tạo: gateway của các Pod
```

> Interface thứ hai của bạn có thể mang IP **`192.168.x.x`** thay vì
> `10.0.2.15` — nghĩa là VM đang dùng **Bridged Adapter** (nhận IP thẳng từ
> router nhà) chứ không phải NAT. Không sao cả: đó vẫn là "mạng của node",
> chỉ khác nguồn cấp. Ghi nhớ IP này — bài 2 sẽ gặp lại nó ở một chỗ bất ngờ.

**Đọc từng dòng:** interface thứ hai là mạng VM nhận từ VirtualBox. Còn `cni0` mang `10.42.0.1/24` — đúng dải `--cluster-cidr` ở
đầu bài. Mọi Pod trên node này sẽ nhận IP `10.42.0.x`, và `cni0` là cửa ngõ
của chúng.

**Nối với K8s:** kiểm chứng luôn:

```bash
kubectl get pods -A -o wide | head -5
#                    └─ -o wide: hiện thêm cột IP và NODE
```

Cột `IP` toàn `10.42.0.x` — khớp với `cni0/24` vừa thấy. Bạn vừa tự xác nhận
Pod CIDR bằng mắt thường.

**Ngoại lệ sẽ gặp:** Pod trạng thái `Completed` (các Job `helm-install-*` của
k3s) hiện IP **`<none>`** — Pod xong việc thì sandbox bị thu hồi và **IP trả
về pool** để cấp cho Pod khác. Hợp lý: mỗi node chỉ có ~253 địa chỉ.

## Bài tập 2 — Hai dải tách bạch: Pod vs Service

**Đoán trước:** IP của Service nằm cùng dải với Pod hay khác dải?

```bash
kubectl get svc -A
```

```
NAMESPACE     NAME             TYPE           CLUSTER-IP
default       kubernetes       ClusterIP      10.43.0.1
kube-system   kube-dns         ClusterIP      10.43.0.10
kube-system   metrics-server   ClusterIP      10.43.215.123
kube-system   traefik          LoadBalancer   10.43.108.224
```

> Đừng kỳ vọng octet thứ ba là `0` — của bạn có thể là `10.43.215.x`,
> `10.43.108.x`, số nào cũng được. Khẳng định là **thuộc dải
> `10.43.0.0/16`**, tức chỉ cần hai cụm đầu là `10.43`. Đây chính là bài
> đọc CIDR ở phần lý thuyết đem ra dùng.

**Kết quả:** cột CLUSTER-IP toàn `10.43.x.x` — dải **khác hẳn** Pod
(`10.42.x.x`).

Nhưng để ý dòng `traefik`: kiểu `LoadBalancer`, và cột **EXTERNAL-IP** mang
một địa chỉ **không thuộc dải nào ở trên** — chính là IP LAN của node bạn
ghi lại ở bài 1. k3s có sẵn ServiceLB: thay vì chờ cloud cấp IP như AWS, nó
**mượn IP của node** làm địa chỉ ngoài. Thử từ máy Windows: mở
`http://<IP-đó>` là gặp Traefik. Bức tranh đầy đủ có **ba dải**:

| Dải | Của ai | Ai với tới được |
| --- | --- | --- |
| `10.42.x` | Pod | trong cluster |
| `10.43.x` | Service — ảo, chỉ là luật iptables | trong cluster |
| IP LAN của node | Node + Service LoadBalancer | cả mạng nhà bạn |

**Vì sao Pod thì `10.42.0.x` gọn gàng mà Service lại rải rác?** Hai dải
cùng `/16` nhưng cấp phát khác nhau: Pod lấy từ **lát `/24` của node**
(một node → mọi Pod chung `10.42.0.x`; thêm node là có `10.42.1.x`), còn
Service do apiserver **bốc ngẫu nhiên trong cả `/16`** — Service không
thuộc node nào nên không có lát cắt.

**Vì sao tách:** IP Pod là thật — có interface, có route. IP Service là **ảo**,
không gắn vào máy nào cả, chỉ tồn tại trong luật iptables. Tách hai dải để nhìn
một địa chỉ là biết ngay nó thuộc loại nào. Từ giờ thấy `10.43.*` trong log là
biết "đây là Service", thấy `10.42.*` là "đây là một Pod cụ thể".

## Bài tập 3 — Vì sao Pod hết IP là chuyện thật

**Đoán trước:** `10.42.0.0/24` (dải của một node) chứa được tối đa bao nhiêu Pod?

Tính: `/24` = 256 địa chỉ, trừ địa chỉ mạng, broadcast và gateway `cni0` — còn
khoảng **253**. Đây chính là lý do các managed cluster có giới hạn *"tối đa N Pod
mỗi node"*: hết dải là scheduler báo Pod `Pending` dù node còn thừa RAM.

Xem k3s cấp dải nào cho node của bạn:

```bash
kubectl get node -o jsonpath='{.items[0].spec.podCIDR}'
#                 └─ móc đúng một field trong object node
```

## Tự kiểm

- [ ] Nhẩm được `/16` và `/24` chứa bao nhiêu địa chỉ, không cần máy tính
- [ ] Chỉ ra được trên VM của mình: IP nào của VirtualBox, IP nào của k3s
- [ ] Nhìn `10.43.0.10` nói ngay được đó là Pod hay Service
- [ ] Giải thích được vì sao node có giới hạn số Pod

## Câu hỏi còn mở

- Vì sao k3s chọn mặc định `10.42`/`10.43` mà không phải `192.168`?
- Khi cluster có nhiều node, ai quyết định node nào nhận dải `/24` nào?
- IPv6 trong K8s (dual-stack) đổi những gì trong bức tranh này?
