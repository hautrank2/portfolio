---
title: "OCI: image spec và runtime spec"
description: Hai bản hợp đồng khiến image build một lần chạy được mọi nơi — kể cả nơi không có Docker.
status: seed
created: 2026-08-21
updated: 2026-08-21
tags: [container, oci, standard]
---

Câu hỏi tưởng ngớ ngẩn mà đáng giá: **vì sao image build bằng Docker trên máy
bạn lại chạy được trên k3s — nơi không cài Docker?**

Trả lời một chữ: **OCI**. Không phải phần mềm — là **bộ chuẩn**, như USB-C của
thế giới container.

## Lý thuyết vừa đủ

Ngày xưa image Docker chỉ chạy được bằng Docker. Khi container thành hạ tầng
chung, các bên (Docker, Google, CoreOS...) lập **Open Container Initiative**
và tách bản chất container thành các bản hợp đồng:

| Spec | Quy định | Trả lời câu |
| --- | --- | --- |
| **image-spec** | Định dạng đóng gói: manifest, config, layer là tar+gzip, định danh bằng digest | *"Image trông như thế nào?"* |
| **runtime-spec** | Cho một rootfs + file `config.json`, runtime phải dựng namespace/cgroup ra sao | *"Chạy nó nghĩa là làm gì?"* |
| **distribution-spec** | API đẩy/kéo với registry | *"Trao đổi image kiểu gì?"* |

Hệ quả: **build bằng gì cũng được, chạy bằng gì cũng được**, miễn hai đầu nói
OCI. Docker build → containerd chạy. Podman build → Docker chạy. Buildah
build → CRI-O chạy. Vì thế "Docker image" giờ là cách gọi theo thói quen —
tên đúng là **OCI image**.

Và đây là lý do dòng tin *"Kubernetes bỏ Docker"* năm nào không hề đáng sợ:
K8s bỏ **Docker Engine làm runtime**, image OCI của bạn không cần đổi một
byte.

> **Chuẩn bị:** chạy trên VM, cần `docker` và `python3`. Toàn bài chỉ mổ xẻ
> file — không chạy gì nguy hiểm.

## Bài tập 1 — Mổ một image ra xem đúng như spec tả không

`docker save` xuất image ra đúng định dạng lưu trữ:

```bash
mkdir -p /tmp/oci && cd /tmp/oci
docker pull alpine:3.20
docker save alpine:3.20 -o alpine.tar
#           │            └─ ghi ra file thay vì stdout
#           └─ xuất image thành tarball
tar -xf alpine.tar && ls -R | head -20
```

**Đoán trước:** bên trong có gì — một file nhị phân bí ẩn, hay toàn JSON và
tar lồng nhau?

```bash
python3 -m json.tool index.json
#       └─ điểm vào theo OCI layout: trỏ tới manifest
```

Lần theo con trỏ: `index.json` → manifest trong `blobs/sha256/` → manifest
liệt kê config + layers. Mở thử một layer:

```bash
tar -tf blobs/sha256/$(python3 -c "
import json
m=json.load(open('index.json'))['manifests'][0]['digest'].split(':')[1]
mf=json.load(open(f'blobs/sha256/{m}'))
print(mf['layers'][0]['digest'].split(':')[1])") | head
#   └─ -t : chỉ liệt kê nội dung tar, không giải nén
```

**Kết quả:** `bin/`, `etc/`, `usr/`... — **layer chỉ là một tarball của
filesystem**, hết bí ẩn. Toàn bộ image = vài JSON trỏ nhau + mấy cục tar,
tất cả đặt tên theo hash. Đúng từng chữ của image-spec.

## Bài tập 2 — Xem bản hợp đồng runtime: config.json

runtime-spec nói: runtime nhận một bundle gồm `rootfs/` + `config.json`.
File config đó chính là **bản dịch của mọi thứ bạn học ở Section 0** sang
JSON. Xem một cái thật từ container đang chạy:

```bash
docker run -d --name lab alpine:3.20 sleep 300
sudo ls /run/containerd/io.containerd.runtime.v2.task/moby/ \
  2>/dev/null || sudo ls /run/docker/runtime-runc/moby/
#     └─ đường dẫn khác nhau tuỳ bản Docker — tìm thư mục chứa bundle
```

Không cần mò đúng đường dẫn — tạo một config chuẩn để đọc còn dễ hơn:

```bash
docker run --rm alpine:3.20 \
  sh -c 'apk add -q runc && runc spec && cat config.json' \
  | python3 -m json.tool | head -60
#   │  runc spec: sinh config.json MẪU theo runtime-spec
#   └─ mượn container tạm để có runc sạch
```

**Đọc và đối chiếu** — bạn sẽ gặp toàn người quen:

```json
"linux": {
  "namespaces": [ {"type":"pid"}, {"type":"network"}, ... ],
  "resources": { ... }        ← cgroup limits
},
"process": { "args": ["sh"], "env": [...] },
"root":    { "path": "rootfs" }
```

`namespaces` — bài [unshare](/blog/k8s/foundations/linux/namespaces-and-cgroups).
`resources` — bài cgroup. `root.path` — bài overlayfs. **Runtime-spec chỉ là
tờ giấy ghi lại những việc bạn đã làm bằng tay**, để mọi runtime làm giống
nhau.

```bash
docker rm -f lab && cd ~ && rm -rf /tmp/oci
```

## Nối với K8s

Trong Pod spec bạn sẽ viết `resources.limits`, `securityContext.runAsUser`...
— tất cả cuối cùng được dịch xuống thành các trường trong `config.json` này
rồi đưa cho runc. K8s là người soạn hợp đồng; OCI runtime là người thi hành.
Chuỗi đầy đủ nằm ở [bài containerd–CRI–runc](/blog/k8s/foundations/container/containerd-cri-runc).

## Tự kiểm

- [ ] Kể được ba spec của OCI và mỗi cái trả lời câu hỏi gì
- [ ] Giải thích được vì sao image Docker chạy trên k3s không cần Docker
- [ ] Mô tả được image sau khi `docker save`: gồm những file gì
- [ ] Chỉ ra được 3 trường trong config.json ứng với 3 bài đã học ở Section 0

## Câu hỏi còn mở

- Podman "daemonless" khác kiến trúc Docker chỗ nào, ưu ở đâu?
- gVisor và Kata tuân runtime-spec nhưng không dùng namespace thuần — thế nào?
- OCI artifact (Helm chart, WASM đẩy lên registry) là mở rộng của spec nào?
