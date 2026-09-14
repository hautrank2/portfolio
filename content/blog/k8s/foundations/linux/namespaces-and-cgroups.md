---
title: Namespace và cgroup — hai chân của container
description: Một cái giới hạn thấy được gì, một cái giới hạn dùng được bao nhiêu. Chỉ vậy thôi.
status: growing
created: 2026-08-21
updated: 2026-08-21
tags: [linux, container, kernel]
---

Container không phải một "thứ" tồn tại trong kernel. Không có system call nào tên là
`create_container()`. Nó là một **process bình thường** cộng với hai cơ chế giới hạn.

## Học cái này để làm gì

Không ai chạy production bằng `unshare`. Mục đích là để **container thôi là hộp đen** —
sau bài này bạn biết chắc Docker, containerd và K8s không có phép thuật nào, chúng gọi
đúng những syscall bạn sắp gọi bằng tay.

Cụ thể, nó mở khoá ba việc bạn sẽ cần thật:

| Về sau bạn gặp | Nhờ bài này mà làm được |
| --- | --- |
| Pod lỗi mạng, `kubectl exec` không đủ | `nsenter` vào net namespace của nó mà soi — `kubectl debug` chính là làm thế |
| Nghi K8s không áp đúng `limits` | Đọc thẳng `/sys/fs/cgroup/.../memory.max` |
| `kubectl exec` báo `executable file not found` trên image distroless | Hiểu ngay là `mnt` namespace đó không có shell, không phải K8s hỏng |

Và để thấy **Docker thêm gì** so với `unshare` — vì `unshare` chỉ cho bạn phần cách ly:

| | `unshare` | Docker |
| --- | --- | --- |
| Cách ly (namespace, cgroup) | ✅ | ✅ |
| Rootfs riêng từ image | ❌ dùng chung `/` của host | ✅ `pivot_root` + overlayfs |
| Mạng (veth, bridge, IP) | ❌ trống trơn | ✅ |
| Đóng gói, phân phối, vòng đời | ❌ | ✅ |

**Container ≈ namespace + cgroup + rootfs + mạng.** Bài 1 và 3 cho bạn hai món đầu,
Bài 5 cho món rootfs, Bài 2 cho thấy món mạng đang thiếu ra sao. Ghép lại là trọn vẹn
một container.

## Lý thuyết vừa đủ

**Namespace giới hạn *thấy được gì*.** Kernel có 8 loại, mỗi loại cách ly một góc nhìn:

| Namespace | Cách ly cái gì | Pod dùng ra sao |
| --- | --- | --- |
| `pid` | Bảng process | Container cùng Pod **có thể** chia sẻ (`shareProcessNamespace`) |
| `net` | Interface, IP, port, routing | **Chia sẻ trong cùng Pod** — nên nói chuyện qua `localhost` |
| `mnt` | Cây thư mục | Riêng từng container |
| `uts` | Hostname | Chia sẻ trong Pod |
| `ipc` | Shared memory, queue | Chia sẻ trong Pod |
| `user` | Ánh xạ UID/GID | Ít dùng, đang dần phổ biến |
| `cgroup` | Góc nhìn về cây cgroup | Ít khi phải quan tâm |
| `time` | Đồng hồ boot/monotonic | K8s chưa dùng (thêm từ Linux 5.6) |

Dòng `net` là chìa khoá để hiểu Pod.

**Vì sao đúng 8 loại này, mà không có loại nào cho `/home`?** Namespace không sinh ra
theo khái niệm người dùng quan tâm, mà sinh ra cho **mỗi bảng toàn cục do kernel quản
lý**: bảng process, ngăn xếp mạng, bảng mount, hostname, đối tượng IPC, ánh xạ UID,
cây cgroup, đồng hồ.

`/home/ban/code` **không phải một bảng của kernel** — nó chỉ là một đường dẫn trong
filesystem, mà filesystem đã nằm trọn dưới `mnt` rồi. Nói cách khác: **`mnt` chính là
"home namespace"**, chỉ là nó bao rộng hơn nhiều. Bài tập 5 chứng minh điều này.

Điểm dễ nhầm liên quan: **thư mục hiện tại (`pwd`) không hề được namespace hoá.** Nó là
thuộc tính riêng của từng process, giống file descriptor đang mở. Hai process trong
*cùng* một `mnt` namespace vẫn có `pwd` khác nhau bình thường.

**cgroup giới hạn *dùng được bao nhiêu*.** Namespace không chặn tài nguyên — một
process bị cách ly hoàn toàn vẫn có thể ăn hết RAM của máy.

Kiểm tra máy bạn đang dùng cgroup v2 chưa (mọi lệnh dưới đây giả định v2):

```bash
stat -fc %T /sys/fs/cgroup/
#    ││ │
#    ││ └─ %T : in kiểu filesystem dưới dạng chữ
#    │└─── -c : tự chọn định dạng in ra
#    └──── -f : xem FILESYSTEM chứa đường dẫn, không phải file
```

Ra `cgroup2fs` là đúng. Ra `tmpfs` là v1, đường dẫn sẽ khác.

> **Chuẩn bị:** chạy trên VM Linux. Thư mục nào cũng được — bài này thao tác với
> namespace và cgroup, không đụng tới thư mục hiện tại. Cần `sudo`.
> Xem [ghi chú môi trường](/blog/k8s/foundations/linux) nếu chưa dựng lab.

## Bài tập 1 — Tạo "container" không cần Docker

**Đoán trước:** sau lệnh này, `ps -ef` bên trong sẽ liệt kê bao nhiêu process, và
shell của bạn mang PID mấy?

```bash
sudo unshare --pid --fork --mount-proc bash
#    │       │     │      │            └─ chạy trong ns mới
#    │       │     │      └─ mount lại /proc cho `ps` đọc đúng
#    │       │     └─ fork ra process con rồi mới chạy bash
#    │       └─ tạo một PID namespace mới
#    └─ cần quyền root
```

**Vì sao bắt buộc có `--fork`?** Process gọi `unshare` **vẫn ở lại namespace cũ** —
chỉ con của nó mới vào namespace mới. Bỏ `--fork` thì bash chạy ở namespace cũ và bài
tập không có tác dụng gì.

**Vì sao cần `--mount-proc`?** `ps` không tự hỏi kernel, nó đọc thư mục `/proc`. Không
mount lại thì `/proc` vẫn là của host, và `ps` sẽ liệt kê toàn bộ process của máy dù
bạn đã ở trong PID namespace mới.

```bash
ps -ef
#  │
#  └─ -e : mọi process  |  -f : đầy đủ (UID, PPID, lệnh)
```

> **Thoát bằng `exit` hoặc `Ctrl+D`, không phải `Ctrl+C`.** Ctrl+C gửi `SIGINT` tới
> *lệnh đang chạy*, nên ở dấu nhắc trống nó chỉ xoá dòng đang gõ. Đây là hành vi của
> mọi shell, không riêng gì namespace.

**Kết quả:**

```
UID   PID  PPID  CMD
root    1     0  bash
root    9     1  ps -ef
```

Shell của bạn là **PID 1**.

**So với bên ngoài — đếm, đừng nhìn.** Mở terminal thứ hai, **không** chạy `unshare` ở
đó, rồi so hai con số:

```bash
ps -ef | wc -l
#        │
#        └─ word count, -l = chỉ đếm số DÒNG
```

| | Số dòng |
| --- | --- |
| Trong namespace (prompt `root@...#`) | **3** |
| Terminal thường | **150–300** |

Chênh nhau vài trăm lần. Nếu terminal 2 cũng ra 3 thì bạn đã lỡ chạy `unshare` ở đó —
lúc này là **hai namespace riêng biệt**, mỗi cái đều có PID 1 của mình, nên trông giống
nhau là đúng.

Xem thẳng ID namespace cho chắc, chạy ở **cả hai** terminal:

```bash
readlink /proc/self/ns/pid
# │        │         │
# │        │         └─ symlink trỏ tới PID namespace của process đó
# │        └─ thư mục ảo luôn trỏ về chính process đang chạy lệnh này
# └─ in ra ĐÍCH của symlink, thay vì đi theo nó
```

```
pid:[4026531836]     ← terminal thường
pid:[4026532778]     ← trong unshare, số khác hẳn
```

Hai số khác nhau = hai namespace khác nhau. Đây là bằng chứng trực tiếp nhất.

> **Namespace không dính gì tới thư mục.** Nó thuộc về **process** — chỉ `bash` mà
> `unshare` vừa đẻ ra và con cháu của nó mới ở trong. `cd` sang thư mục nào cũng không
> đưa bạn vào; mở terminal mới là một process khác, nằm ngoài, dù `pwd` giống hệt.

### Cùng một process, hai PID cùng lúc

Đây mới là điều bài tập muốn cho thấy, và nó dễ bị bỏ qua. Giữ terminal 1 đang trong
`unshare`, chạy ở terminal 2:

```bash
sudo lsns -t pid
#    │    │
#    │    └─ lọc theo loại ns: pid, net, mnt, uts, ipc, user…
#    └─ "list namespaces": mọi ns đang tồn tại trên máy
```

```
        NS TYPE NPROCS   PID USER   COMMAND
4026531836 pid     247     1 root   /sbin/init
4026532778 pid       1  5678 root   bash     ← shell bạn đang ngồi
```

Cột `PID` ghi **5678** — số thật trên máy. Nhưng bên trong, `echo $$` cho ra **1**.

Một process, hai con số, tuỳ nhìn từ đâu. Đó chính xác là chuyện xảy ra với mọi
container: app tưởng mình là PID 1, host thấy nó là 5678. Và là lý do `kill 1` bên
trong container không đụng được `/sbin/init` của host.

### `bash` không *là* namespace

`bash` là **process**; namespace là **đối tượng của kernel** mà process đó thuộc về.
`unshare` dựng namespace mới rồi fork bash vào đó, con cháu của bash tự thừa hưởng.

Namespace sống chừng nào còn ít nhất một process ở trong. `exit` shell → không còn ai →
kernel xoá luôn. Đó là lý do ở Bài tập 5 bind mount **tự biến mất** mà không cần `umount`.

### Thử một cái trước khi thoát

Vẫn đang ở trong namespace, bắn `SIGTERM` vào chính PID 1:

```bash
kill -TERM 1
#    │     └─ PID đích: 1, tức chính shell bạn đang ngồi
#    └─ loại signal muốn gửi (TERM = SIGTERM = "đề nghị tự tắt")

echo $?
#    └─ mã thoát của lệnh vừa chạy. 0 = thành công
```

Trả về `0` — gửi thành công. **Nhưng shell vẫn sống nhăn.**

Bạn vừa chứng minh điều mà note
[Process, PID 1 và signal](/blog/k8s/foundations/linux/processes-and-signals) sẽ khai thác:
**PID 1 không cài handler thì kernel bỏ qua signal.** Đó là lý do container
`sh -c 'sleep 1000'` mất đúng 10 giây mới chết khi `docker stop`.

`SIGKILL` thì không ai chặn được — nó cũng là cách thoát bài này:

```bash
kill -9 1
#    └─ signal số 9 = SIGKILL. Không process nào chặn hay bắt được
```

Shell chết ngay, bạn văng về terminal thường. Đây chính là cú `SIGKILL` mà K8s gửi sau
khi hết `terminationGracePeriodSeconds`.

**Nối với K8s:** làm bài này một lần thì `shareProcessNamespace` và mọi chuyện về PID 1
ở [note tiếp theo](/blog/k8s/foundations/linux/processes-and-signals) hết trừu tượng.

## Bài tập 2 — Trạng thái của Pod trước khi CNI vào

**Đoán trước:** trong một network namespace mới toanh, `ip addr` cho thấy gì? Có
`eth0` không? `lo` có `UP` không?

```bash
sudo unshare --net bash
#            └─ CHỈ tạo network ns; PID/mount vẫn chung với host

ip addr
# └─ liệt kê mọi network interface và địa chỉ IP của chúng

ping -c1 8.8.8.8
#     │
#     └─ -c1 = gửi đúng 1 gói rồi dừng (không có thì ping mãi)
```

**Kết quả:** chỉ có `lo`, và `lo` đang **DOWN**. Không ping được gì cả.

**Vì sao quan trọng:** đây **chính xác** là trạng thái của một Pod ngay sau khi được
tạo và trước khi CNI plugin vào cấu hình. Mọi thứ CNI làm — cấp IP, dựng veth pair,
thêm route — là để biến trạng thái trống rỗng này thành một Pod nói chuyện được.

Nắm chỗ này thì [Section 4 — Networking](/blog/k8s/networking) nhẹ đi rất nhiều.

## Bài tập 3 — Tự tay gây ra OOMKilled

```bash
sudo mkdir -p /sys/fs/cgroup/demo
# Tạo cgroup = tạo THƯ MỤC. Kernel tự sinh file điều khiển.

echo 64M | sudo tee /sys/fs/cgroup/demo/memory.max
#                                       └─ trần RAM của cgroup này

echo $$  | sudo tee /sys/fs/cgroup/demo/cgroup.procs
#    │                                  └─ ghi PID = nhập cgroup
#    └─ $$ là PID của shell hiện tại
```

**Vì sao `| sudo tee` mà không phải `sudo echo 64M > file`?** Vì dấu `>` do **shell**
xử lý, và shell đang chạy bằng user thường — nó mở file *trước khi* `sudo` kịp khởi
động, nên vẫn `permission denied`. Còn `tee` là một **chương trình**, chạy được dưới
`sudo`, và nó nhận nội dung qua ống `|` rồi tự ghi ra file bằng quyền root.

Đây là mẹo bạn sẽ dùng lại rất nhiều lần khi ghi vào file hệ thống.

**Nếu không thấy file `memory.max`:** controller chưa được bật cho cấp con. Chạy
`echo "+memory +cpu" | sudo tee /sys/fs/cgroup/cgroup.subtree_control` rồi tạo lại.

**Đoán trước:** lệnh dưới xin 200MB trong khi trần là 64MB. Nó sẽ báo lỗi
`MemoryError` của Python, hay bị giết?

```bash
python3 -c "x = 'a' * (200 * 1024 * 1024)"
#       │                └─ tạo một chuỗi 200MB trong RAM
#       └─ -c : chạy thẳng đoạn code truyền vào, không cần file .py
```

**Kết quả:** `Killed`. Không phải exception — process bị kernel giết thẳng.

Xem bằng chứng:

```bash
cat /sys/fs/cgroup/demo/memory.events
#                       └─ kernel ghi sự kiện, kể cả số lần OOM
```

```
oom_kill 1
```

**Nối với K8s:** con số này **chính là** `OOMKilled` trong `kubectl describe pod`. K8s
không làm gì thêm — nó đọc lại đúng counter này rồi hiển thị. Và vì OOM killer dùng
`SIGKILL`, exit code sẽ là **137**.

Thoát shell để rời cgroup, rồi dọn:

```bash
sudo rmdir /sys/fs/cgroup/demo
#    └─ `rmdir` chứ không `rm -rf`: thư mục ảo do kernel quản,
#       chỉ xoá được khi cgroup không còn process nào
```

## Bài tập 4 — CPU hết thì chuyện gì xảy ra?

**Đoán trước:** vượt trần **CPU** thì process bị giết như vượt RAM, hay chuyện khác?

```bash
sudo mkdir -p /sys/fs/cgroup/demo2

echo "50000 100000" | sudo tee /sys/fs/cgroup/demo2/cpu.max
#      │      │
#      │      └─ độ dài chu kỳ, micro-giây (100000µs = 0.1s)
#      └─ được dùng bao nhiêu µs trong mỗi chu kỳ đó
#         50000/100000 = 50% của MỘT core

echo $$ | sudo tee /sys/fs/cgroup/demo2/cgroup.procs

timeout 10 sh -c 'while :; do :; done'
#       │            │
#       │            └─ `:` lệnh rỗng -> lặp vô hạn, đốt CPU
#       └─ tự giết lệnh sau 10 giây

cat /sys/fs/cgroup/demo2/cpu.stat
#                        └─ có nr_throttled = số lần bị bóp
```

**Kết quả:** không ai bị giết. `cpu.stat` cho thấy `nr_throttled` và `throttled_usec`
tăng — process chỉ bị **bóp lại**, chạy chậm đi.

**Đây là khác biệt phải thuộc:**

| Vượt giới hạn | Hậu quả | Triệu chứng bạn thấy |
| --- | --- | --- |
| **CPU** | Bị **throttle** | App ì ạch khó hiểu, latency tăng, không có log lỗi |
| **RAM** | Bị **giết** | `OOMKilled`, exit 137, container restart |

Đặt `limits.cpu` quá thấp và đặt `limits.memory` quá thấp cho ra hai triệu chứng
**hoàn toàn khác nhau**. Nhầm hai cái này là đi sai hướng debug hàng giờ.

Dọn: thoát shell rồi `sudo rmdir /sys/fs/cgroup/demo2` (xem ghi chú `rmdir` ở bài 3).

## Bài tập 5 — Thay hẳn thư mục home, bên ngoài không hay biết

Bài này trả lời câu hỏi *"sao không có namespace cho home?"* bằng cách **tự tay tạo ra
một cái**, chỉ dùng `mnt`.

Mở **hai terminal** cùng lúc.

```bash
# Terminal 1 — bên trong namespace mới
sudo unshare --mount bash
#            └─ chỉ tạo MOUNT ns; bảng mount riêng cho shell này

mkdir -p /tmp/home-gia

mount --bind /tmp/home-gia /root
#     │      │             └─ điểm gắn: đường dẫn sẽ bị "che" đi
#     │      └─ nguồn: thư mục thật muốn hiện ra ở đó
#     └─ --bind : gắn thư mục ĐANG CÓ vào chỗ khác

ls -a /root
#  └─ -a : hiện cả file ẩn (tên bắt đầu bằng dấu chấm)

touch /root/chi-co-o-day.txt
# └─ tạo file rỗng (hoặc cập nhật thời gian nếu file đã có)

ls -a /root
```

**Đoán trước:** terminal 2 — vẫn là cùng một máy, cùng một kernel — sẽ thấy gì ở `/root`?

```bash
# Terminal 2 — bên ngoài, KHÔNG chạy unshare
sudo ls -a /root
#    └─ cần sudo vì /root là home của root, user thường không đọc được
```

**Kết quả:** terminal 1 thấy `/root` **rỗng** rồi có `chi-co-o-day.txt`. Terminal 2 thấy
`/root` **nguyên như cũ**, không hề có file đó.

Bạn vừa tạo ra đúng thứ mình hỏi: một "home namespace". Không cần cơ chế mới nào —
`mnt` đã đủ, vì cách ly *bảng mount* thì cách ly luôn mọi đường dẫn dựng trên đó.

Gõ `exit` ở terminal 1. Bind mount **tự biến mất** cùng namespace, không phải `umount`.

> `unshare --mount` mặc định đặt propagation là `private`, nên bind mount bên trong
> không lan ngược ra host. Thiếu điều đó thì bài tập này sẽ sửa `/root` thật.

**Nối với K8s:** đây chính là cách container có một `/` hoàn toàn khác host. Kubelet →
runc dựng `mnt` namespace rồi `pivot_root` sang rootfs của image. `WORKDIR` trong
Dockerfile chỉ là đặt `pwd` mặc định **bên trong** cây thư mục đó — nó là thuộc tính
process, không phải namespace.

## Nối lại với K8s

Khi bạn viết:

```yaml
resources:
  limits:
    memory: "128Mi"
    cpu: "500m"
securityContext:
  runAsUser: 1000
```

Chuỗi thật sự xảy ra là: kubelet → CRI → containerd → runc → **tạo namespace + ghi file
cgroup** đúng như bạn vừa làm bằng tay. Toàn bộ K8s nằm ở tầng điều phối; việc thực thi
vẫn là kernel Linux.

## Self-check

- [ ] Kể được namespace nào **chia sẻ** trong một Pod và vì sao điều đó tạo ra `localhost`
- [ ] Giải thích được vì sao Pod mới tạo chưa có mạng cho tới khi CNI vào
- [ ] Chỉ ra được file cgroup mà K8s đọc để báo `OOMKilled`
- [ ] Phân biệt được triệu chứng của thiếu CPU và thiếu RAM
- [ ] Trả lời được vì sao không có namespace riêng cho `/home`, và cái gì thay thế nó

## Open questions

- `shareProcessNamespace: true` có tác dụng phụ gì về bảo mật?
- User namespace trong K8s hiện dùng được tới đâu, giải quyết rủi ro nào?
- Vì sao cgroup v1 và v2 khác nhau đủ nhiều để K8s phải xử lý riêng từng loại?
