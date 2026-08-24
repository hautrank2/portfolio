---
title: Image, layer và overlayfs
description: Image không phải một file — nó là chồng layer chỉ-đọc, và bạn đã tự dựng một layer rồi.
status: seed
created: 2026-08-21
updated: 2026-08-21
tags: [container, image, docker]
---

Ở [bài overlayfs](/blog/k8s/nen-tang/linux/mount-va-overlayfs) bạn đã tự tay
mount `lowerdir` + `upperdir` thành một cây. Note này chỉ ra: **image container
chính là đống `lowerdir` đó**, được đóng gói và đặt tên. Không có khái niệm mới
— chỉ có nhãn mới dán lên thứ đã biết.

## Lý thuyết vừa đủ

Một image gồm:

```
manifest ──► config (env, cmd, user...)
        └──► layer 1  (tar của filesystem)
        └──► layer 2  (tar của NHỮNG GÌ THAY ĐỔI so với layer 1)
        └──► layer 3  (...)
```

Ba quy tắc chi phối mọi hành vi:

1. **Mỗi layer là một tarball bất biến**, định danh bằng hash nội dung.
2. **Mỗi chỉ thị tạo-filesystem trong Dockerfile sinh một layer** (`RUN`,
   `COPY`, `ADD`). Còn `ENV`, `CMD`, `EXPOSE` chỉ sửa config — không có layer.
3. **Layer được chia sẻ**: hai image cùng gốc `FROM node:20` dùng chung các
   layer của node:20 trên đĩa — chỉ lưu một lần, chỉ tải một lần.

Khi chạy container, runtime xếp các layer làm `lowerdir`, thêm một `upperdir`
ghi được — đúng bài tập bạn đã làm.

> **Chuẩn bị:** chạy trên VM, cần `docker`. Thư mục nào cũng được, trừ bài 2
> cần một thư mục trống để build.

## Bài tập 1 — Mổ một image ra đếm layer

**Đoán trước:** `nginx:alpine` có bao nhiêu layer? 1? 5? 20?

```bash
docker pull nginx:alpine
docker image inspect nginx:alpine --format '{{json .RootFS.Layers}}' \
  | python3 -m json.tool
#           └─ format JSON cho dễ đếm
```

Rồi xem lịch sử — layer nào sinh từ lệnh nào, nặng bao nhiêu:

```bash
docker history nginx:alpine
#      └─ liệt kê từng chỉ thị Dockerfile đã tạo ra image này
```

**Đọc kết quả:** để ý cột SIZE — nhiều dòng **0B**. Đó là các chỉ thị chỉ sửa
config (`ENV`, `CMD`, `EXPOSE`), khớp quy tắc 2. Layer nặng nhất là `FROM
alpine` và các `RUN` cài gói.

## Bài tập 2 — Tự tạo layer và xem cache hoạt động

```bash
mkdir -p /tmp/img && cd /tmp/img
cat > Dockerfile <<'EOF'
FROM alpine:3.20
RUN echo "layer A" > /a.txt
RUN echo "layer B" > /b.txt
EOF
docker build -t lab:1 .
#            │       └─ build context: thư mục hiện tại
#            └─ đặt tên:tag cho image
```

**Đoán trước:** sửa **dòng RUN thứ hai** rồi build lại — dòng thứ nhất có chạy
lại không?

```bash
sed -i 's/layer B/layer B v2/' Dockerfile
docker build -t lab:2 .
```

**Kết quả:** dòng đầu hiện `CACHED` — không chạy lại. Docker so từng chỉ thị:
chưa đổi thì lấy layer cũ, **từ chỗ đổi trở đi mới build lại hết**. Hệ quả
thực dụng: thứ hay đổi (code) đặt **cuối** Dockerfile, thứ ít đổi
(`npm install`) đặt **đầu** — sẽ đào sâu ở
[bài multi-stage](/blog/k8s/nen-tang/container/dockerfile-multistage).

Kiểm chứng chia sẻ layer giữa hai image:

```bash
docker image inspect lab:1 lab:2 --format '{{.RootFS.Layers}}' 
```

Layer đầu **trùng hash** ở cả hai — trên đĩa chỉ có một bản.

## Bài tập 3 — Layer là bất biến, kể cả khi bạn "xoá"

Bạn đã thấy whiteout ở bài overlayfs. Giờ xem nó trong image thật:

```bash
cat > Dockerfile <<'EOF'
FROM alpine:3.20
RUN dd if=/dev/zero of=/big.bin bs=1M count=50
RUN rm /big.bin
EOF
#   │  └─ layer 2: "xoá" file
#   └─ layer 1: tạo file 50MB

docker build -t lab:fat .
docker image ls lab:fat alpine:3.20 --format '{{.Repository}} {{.Size}}'
```

**Đoán trước** (trước khi chạy dòng cuối): `lab:fat` nặng cỡ alpine, hay cỡ
alpine + 50MB?

**Kết quả:** vẫn **~58MB** — file "đã xoá" nằm nguyên trong layer 1, layer 2
chỉ chứa một whiteout đè lên. Layer bất biến nghĩa là **không có cách nào làm
image nhỏ đi bằng một chỉ thị về sau**. Đây là cùng một sự thật bạn thấy ở bài
overlayfs, giờ hiện nguyên hình trong `docker image ls`.

Dọn:

```bash
cd ~ && docker rmi lab:1 lab:2 lab:fat && rm -rf /tmp/img
```

## Nối với K8s

Kubelet kéo image cũng theo từng layer — layer đã có trên node thì bỏ qua. Vì
thế Pod thứ hai cùng image trên cùng node khởi động gần như tức thì, và vì thế
image gọn từng layer quan trọng thật sự khi cluster scale: 50 node × 500MB
thừa = 25GB băng thông mỗi lần rollout.

## Tự kiểm

- [ ] Kể được chỉ thị nào sinh layer, chỉ thị nào chỉ sửa config
- [ ] Giải thích được cache build hoạt động thế nào và vỡ ở đâu
- [ ] Chứng minh được (bằng lệnh) hai image chia sẻ layer chung
- [ ] Nói được vì sao `RUN rm` không làm image nhỏ đi — bằng từ "whiteout"

## Câu hỏi còn mở

- `docker build --squash` và multi-stage khác nhau chỗ nào khi cần image gọn?
- Giới hạn số layer của một image là bao nhiêu, có còn quan trọng không?
- Zstd layer compression đổi gì trong chuyện kéo image?
