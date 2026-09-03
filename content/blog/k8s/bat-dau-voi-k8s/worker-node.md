---
title: "Worker Node"
description: Ba thành phần trên mỗi máy chạy việc, và vì sao node mất mạng một lúc thì Pod vẫn sống.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, architecture, node]
---

Node là máy thật (hoặc VM) chạy Pod của bạn. Trên mỗi node có đúng **ba** thứ, không
hơn.

```
┌──────────────── Worker Node ─────────────────┐
│                                              │
│  kubelet ──────► CRI ──────► containerd      │
│     │                            │           │
│     │                            ▼           │
│     │                          runc          │
│     │                            │           │
│     │                     namespace + cgroup │
│     │                            │           │
│     │                        ┌───▼───┐       │
│     └── theo dõi ───────────►│  Pod  │       │
│                              └───────┘       │
│  kube-proxy ─► iptables / IPVS               │
└──────────────────────────────────────────────┘
          ▲
          │ watch (node CHỦ ĐỘNG kéo về)
     api-server
```

## kubelet — người duy nhất ra lệnh trên máy này

Nó **không phải container**. Nó là một tiến trình chạy thẳng trên host, do systemd
trông coi — xem [systemd cơ bản](/blog/k8s/nen-tang/linux/systemd-co-ban).

Việc của nó:

1. Theo dõi api-server, nhặt những Pod **được gán tên node mình**
2. Bảo container runtime kéo image và chạy container
3. Chạy **liveness / readiness probe** rồi hành động theo kết quả
4. Báo trạng thái Pod và sức khoẻ node ngược lên api-server

Điểm quan trọng nhất của cả note nằm ở chữ **theo dõi** trong bước 1:

> Không ai đẩy lệnh xuống node. Node **tự kéo** về.

Scheduler không gọi kubelet. Control plane không mở kết nối tới node. kubelet là bên
chủ động mở kết nối ra, và liên tục hỏi api-server *"có gì mang tên tôi không?"*.

Hệ quả rất dễ thấy: **node mất kết nối với control plane thì Pod trên đó vẫn chạy
bình thường.** kubelet không cần ai cho phép để tiếp tục việc đang làm. Nó chỉ mất khả
năng nhận việc mới và báo cáo tình hình.

## Container runtime — chạy thật

kubelet không tự chạy container. Nó nói chuyện qua **CRI** (Container Runtime
Interface), một giao diện chuẩn, để bên dưới thay được: containerd, CRI-O.

Chuỗi đầy đủ, đã dựng ở [containerd, CRI và runc](/blog/k8s/nen-tang/container/containerd-cri-runc):

```
kubelet ─CRI─► containerd ─OCI─► runc ─► clone() + cgroup
```

Docker **không** nằm trong chuỗi này nữa — `dockershim` bị gỡ khỏi kubelet từ v1.24.
Image bạn build bằng Docker vẫn chạy tốt, vì cả hai cùng theo chuẩn OCI. Thứ biến mất
là Docker với tư cách **runtime của node**, không phải Docker với tư cách công cụ build.

## kube-proxy — làm cho Service có thật

Service chỉ là một bản ghi trong etcd. Thứ khiến IP ảo của nó thật sự nhận gói là
kube-proxy, và nó làm bằng cách **viết luật iptables (hoặc IPVS)** trên từng node.

Nên nhớ đúng bản chất: nó là load balancer **tầng 4**, không đọc HTTP, không có khái
niệm request. Gói tới IP ảo thì bị DNAT sang IP một Pod nào đó. Hết.

Đó là lý do Service **không bao giờ** trả về 502 — nó không nói HTTP để mà trả mã. Hết
endpoint thì kết nối bị từ chối ở tầng TCP, im lặng. So sánh với Ingress ở
[reverse proxy](/blog/k8s/nen-tang/mang/reverse-proxy).

## Node "chết" nghĩa là gì

kubelet gửi heartbeat đều đặn (một Lease, mặc định mỗi 10 giây). Khi ngừng:

| Sau khoảng | Chuyện xảy ra |
| --- | --- |
| 40 giây | Node chuyển `NotReady` |
| ~5 phút | Controller đánh dấu để dời Pod đi node khác |

Khoảng trống ở giữa là **cố ý**. Mạng chớp một cái mà dời cả đống Pod thì còn hại hơn.
Và trong suốt 5 phút đó, nếu node thật ra vẫn sống, Pod của nó **vẫn phục vụ bình
thường** — chỉ là control plane không biết.

## Nhìn tận mắt

```bash
kubectl get nodes -o wide
```

Trên chính node đó:

```bash
sudo systemctl status k3s-agent && sudo k3s crictl ps
```

`crictl` nói chuyện thẳng với containerd qua CRI — thấy đúng những gì kubelet thấy,
không qua lớp Kubernetes nào.

## Tự kiểm

- [ ] Kể được ba thành phần trên node và việc của từng cái
- [ ] Giải thích được vì sao node mất mạng mà Pod vẫn chạy
- [ ] Nói được vì sao gỡ dockershim không làm hỏng image build bằng Docker
- [ ] Nói được vì sao Service không trả về mã lỗi HTTP

## Câu hỏi còn mở

- iptables và IPVS khác nhau ra sao khi cluster có vài nghìn Service?
- Pod bị `Evicted` vì node hết đĩa — ai ra quyết định đó, kubelet hay control plane?
