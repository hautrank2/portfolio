---
title: containerd, CRI và runc
description: Chuỗi lệnh từ kubelet xuống kernel. Biết ai đứng đâu là biết hỏng ở đâu.
status: seed
created: 2026-08-21
updated: 2026-08-21
tags: [container, containerd, cri, runc]
---

Ba cái tên hay bị trộn thành một nồi lẩu: Docker, containerd, runc. Note này
xếp chúng đứng đúng hàng — vì khi Pod kẹt `ContainerCreating`, câu hỏi đầu
tiên là **"hỏng ở tầng nào?"**, và không xếp được hàng thì không trả lời được.

## Lý thuyết vừa đủ

```
kubelet
   │  nói chuyện qua CRI (một API gRPC — hợp đồng, không phải phần mềm)
   ▼
containerd            ← quản lý VÒNG ĐỜI: kéo image, quản lý layer,
   │                     tạo/xoá container, giữ trạng thái
   ▼
runc                  ← thợ thi công: đọc config.json, gọi syscall
   │                     tạo namespace + cgroup, exec process... rồi THOÁT
   ▼
kernel Linux          ← nơi mọi thứ thật sự xảy ra
```

Phân vai bằng một câu mỗi anh:

| Ai | Vai | Sống bao lâu |
| --- | --- | --- |
| **CRI** | Hợp đồng giữa kubelet và runtime — chỉ là spec API | — |
| **containerd** | Quản gia: image, layer, vòng đời container | Daemon, chạy mãi |
| **runc** | Thợ: dựng namespace/cgroup rồi biến mất | Vài chục ms mỗi lần |
| **Docker** | Bộ đồ nghề cho NGƯỜI: CLI, build, compose — **bên trong cũng gọi containerd** | Daemon |

Nghĩa là: Docker và K8s là hai khách hàng khác nhau của **cùng một** containerd
+ runc. K8s bỏ "dockershim" năm xưa chỉ là bỏ người phiên dịch, nói thẳng với
quản gia.

> **Chuẩn bị:** chạy trên VM có k3s. Cần `sudo`. k3s nhúng sẵn containerd
> riêng — tách biệt với Docker nếu bạn có cài.

## Bài tập 1 — Bắt quả tang runc "đến rồi đi"

**Đoán trước:** một container `sleep 300` đang chạy — process `runc` có còn
sống cùng nó không?

```bash
docker run -d --name lab alpine:3.20 sleep 300
ps aux | grep -E "runc|containerd-shim" | grep -v grep
#                       └─ shim: người trông hộ sau khi runc rút
```

**Kết quả:** không có `runc` nào — chỉ thấy `containerd-shim-runc-v2`. runc
dựng xong container là **thoát ngay**; shim ở lại cầm stdout/stderr và exit
code hộ. Thiết kế này để restart containerd **không giết container** đang
chạy — thử luôn thì thấy (đừng thử với k3s đang có việc).

Xem cây phả hệ cho rõ:

```bash
ps -o pid,ppid,comm -p $(docker inspect lab --format '{{.State.Pid}}') 
#  │                    └─ PID thật của process trong container
#  └─ in kèm PPID để thấy cha là ai
docker rm -f lab
```

Cha của `sleep` là shim — không phải Docker, không phải runc.

## Bài tập 2 — Nói chuyện thẳng với containerd của k3s bằng crictl

`crictl` là kubectl-của-tầng-runtime: nó gọi thẳng CRI, bỏ qua apiserver.

```bash
sudo crictl ps
#           └─ container mà CONTAINERD CỦA K3S đang chạy
sudo crictl images | head
sudo crictl pods | head
#           └─ CRI có khái niệm "pod sandbox" — kubectl giấu tầng này
```

**Đoán trước:** container bạn chạy bằng `docker run` có xuất hiện trong
`sudo crictl ps` không?

Thử: chạy một container bằng docker, rồi `crictl ps` xem. **Không thấy** —
vì Docker và k3s dùng **hai containerd khác nhau**, hai kho image khác nhau,
hai thế giới song song trên cùng một máy. Đây chính là lý do
`docker build` xong mà k3s báo `ImagePullBackOff`: image nằm ở kho bên kia.

Cách chuyển image từ Docker sang k3s không cần registry:

```bash
docker save nginx:alpine | sudo k3s ctr images import -
#      │                          │                    └─ đọc từ stdin
#      │                          └─ ctr: CLI thô của containerd
#      └─ xuất image ra tar (bài OCI đã mổ định dạng này)
sudo crictl images | grep nginx
```

Giờ k3s thấy image — không hề chạm mạng.

## Bài tập 3 — Nhìn CRI làm việc trong log

Mở hai terminal:

```bash
# terminal 1 — bám log k3s, lọc phần containerd
sudo journalctl -u k3s -f | grep -i --line-buffered "pull\|sandbox"
```

```bash
# terminal 2 — tạo việc cho nó làm
kubectl run holo --image=busybox:1.36 --restart=Never -- sleep 60
kubectl delete pod holo
```

Terminal 1 hiện dấu vết đúng thứ tự lý thuyết: tạo **sandbox** (pause
container giữ namespace) → **pull image** → tạo container. Bạn đang xem CRI
được gọi theo thời gian thực.

## Bảng định vị sự cố — mang theo sang các Section sau

| Triệu chứng | Tầng nghi ngờ | Lệnh soi |
| --- | --- | --- |
| `ImagePullBackOff` | containerd không kéo được image | `sudo crictl images`, `journalctl -u k3s` |
| `ContainerCreating` mãi | sandbox/mount/CNI | `sudo crictl pods`, `crictl inspectp` |
| kubectl chết hẳn nhưng app vẫn chạy | apiserver, KHÔNG phải runtime | `sudo crictl ps` vẫn trả lời |
| Container chết ngay khi start | lệnh trong config sai | `sudo crictl logs <id>` |

## Tự kiểm

- [ ] Vẽ được chuỗi kubelet → CRI → containerd → runc → kernel, nói vai từng tầng
- [ ] Giải thích được vì sao `ps` không thấy runc khi container đang chạy
- [ ] Nói được vì sao image build bằng Docker không tự hiện ra trong k3s, và cách nạp
- [ ] Dùng được `crictl` khi `kubectl` bất lực

## Câu hỏi còn mở

- Shim v2 còn cho phép runtime khác cắm vào (gVisor, Kata) — cắm ở khớp nào?
- `ctr` với `crictl` khác nhau gì, khi nào buộc phải dùng `ctr`?
- k3s cấu hình containerd ở file nào, và thêm registry mirror ra sao?
