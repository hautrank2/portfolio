---
title: Mount, bind mount và overlayfs
description: Dựng một image layer bằng tay, rồi hiểu vì sao xoá file không làm image nhỏ đi.
status: seed
created: 2026-08-21
updated: 2026-08-21
tags: [linux, storage, container]
---

Image container **là** overlayfs. Không phải "giống", mà đúng là nó. Làm xong bài tập
1 ở dưới thì phần lớn hành vi khó hiểu của image và volume trở nên hiển nhiên.

## Lý thuyết vừa đủ

Overlayfs xếp chồng nhiều thư mục thành một cây duy nhất:

| Tầng | Vai trò | Trong container |
| --- | --- | --- |
| `lowerdir` | Chỉ đọc, xếp chồng được nhiều tầng | Các layer của image |
| `upperdir` | Ghi được, nhận mọi thay đổi | Lớp ghi của container |
| `workdir` | Vùng nháp của kernel | (không cần quan tâm) |
| `merged` | Cái bạn nhìn thấy | Filesystem bên trong container |

Quy tắc quan trọng nhất: **`lowerdir` không bao giờ bị sửa**. Ghi vào một file thuộc
lower thì kernel **chép nó lên upper trước** rồi mới sửa bản chép — gọi là
*copy-on-write*.

> **Chuẩn bị:** chạy trên VM Linux, cần `sudo`. Thư mục nào cũng được — mọi đường dẫn
> trong bài đều tuyệt đối (`/tmp/ovl`). Bài 3 cần `docker`.

## Bài tập 1 — Dựng một image layer bằng tay

```bash
mkdir -p /tmp/ovl/{lower,upper,work,merged}
echo "giá trị từ image" > /tmp/ovl/lower/app.conf

sudo mount -t overlay overlay \
  -o lowerdir=/tmp/ovl/lower,upperdir=/tmp/ovl/upper,workdir=/tmp/ovl/work \
  /tmp/ovl/merged

cat /tmp/ovl/merged/app.conf
ls /tmp/ovl/upper
```

Lúc này `merged` thấy file, còn `upper` **rỗng**.

**Đoán trước:** sửa file trong `merged` thì file trong `lower` có đổi không? `upper`
sẽ có gì?

```bash
echo "sửa bởi container" >> /tmp/ovl/merged/app.conf

echo "--- lower ---"; cat /tmp/ovl/lower/app.conf
echo "--- upper ---"; ls /tmp/ovl/upper; cat /tmp/ovl/upper/app.conf
```

**Kết quả:** `lower` **nguyên vẹn**. `upper` giờ có một bản `app.conf` đầy đủ, mang nội
dung mới. Copy-on-write vừa xảy ra trước mắt bạn.

**Nối với K8s:** đây là lý do hai Pod chạy cùng một image không đạp lên nhau — chúng
chia sẻ `lowerdir` chỉ đọc, mỗi cái một `upperdir` riêng. Và là lý do sửa file trong
container rồi restart thì mất sạch: `upperdir` bị xoá cùng container.

## Bài tập 2 — Xoá file trong overlayfs

**Đoán trước:** xoá một file chỉ có ở `lower` thì `upper` sẽ chứa gì? Rỗng, hay có
thứ gì đó?

```bash
rm /tmp/ovl/merged/app.conf
ls -l /tmp/ovl/upper/
```

```
c--------- 1 root root 0, 0 ... app.conf
```

**Kết quả:** `upper` có một file kiểu **`c`** (character device) `0, 0`. Đó là
**whiteout** — dấu hiệu nói với kernel *"file này coi như không tồn tại"*. File thật
vẫn nằm nguyên ở `lower`.

**Vì sao quan trọng:** trong Dockerfile, nếu bạn làm

```dockerfile
RUN wget bigfile.tar.gz && tar xf bigfile.tar.gz
RUN rm bigfile.tar.gz
```

thì image **không nhỏ đi chút nào**. Layer thứ hai chỉ thêm một whiteout; file gốc vẫn
nằm trong layer trước và vẫn phải tải về. Muốn nhỏ thật thì tải và xoá **trong cùng
một `RUN`**, hoặc dùng multi-stage build.

Dọn dẹp:

```bash
sudo umount /tmp/ovl/merged && rm -rf /tmp/ovl
```

## Bài tập 3 — Lớp ghi của container biến mất lúc nào

**Đoán trước:** trong ba lần đọc dưới đây, lần nào còn thấy file?

```bash
docker run -d --name w alpine sh -c 'while true; do sleep 1; done'
docker exec w sh -c 'echo hello > /data.txt'

docker exec w cat /data.txt          # (1) cùng container đang chạy
docker restart w && docker exec w cat /data.txt   # (2) sau restart
docker rm -f w && docker run --rm alpine cat /data.txt  # (3) container mới
```

**Kết quả:** `(1)` có · `(2)` **vẫn có** · `(3)` không.

Nhiều người đoán `(2)` mất — đó là chỗ dễ nhầm nhất. **Restart không tạo container
mới**, `upperdir` vẫn nguyên. Chỉ khi container bị **xoá** thì lớp ghi mới mất.

**Nối với K8s:** khác biệt này rất thật. `restartPolicy` làm kubelet **khởi động lại
container cũ** — dữ liệu trong lớp ghi còn. Nhưng Pod bị xoá và tạo lại (rolling
update, đổi node, scale) thì là **container mới**, mất sạch. Đó là lý do `emptyDir`
tồn tại: nó sống theo **Pod**, không theo container.

## Bài tập 4 — Bind mount

```bash
mkdir -p /tmp/src /tmp/dst
echo "gốc" > /tmp/src/f.txt
sudo mount --bind /tmp/src /tmp/dst

stat -c '%i %n' /tmp/src/f.txt /tmp/dst/f.txt
```

Hai đường dẫn, **cùng một inode** — không phải bản sao, là cùng một file nhìn từ hai
chỗ.

```bash
echo "thêm" >> /tmp/dst/f.txt && cat /tmp/src/f.txt
sudo umount /tmp/dst
```

**Nối với K8s:** `hostPath` volume chính là bind mount. Và ConfigMap mount thành file
cũng đi qua cơ chế tương tự — đó là lý do sửa ConfigMap thì file trong container tự
đổi theo (sau một độ trễ), còn nạp qua `env` thì không.

## Tự kiểm

- [ ] Chỉ ra được `lowerdir` / `upperdir` tương ứng với cái gì trong một container
- [ ] Giải thích được vì sao `RUN rm bigfile` không làm image nhỏ đi
- [ ] Nói được lúc nào lớp ghi của container mất, lúc nào không
- [ ] Phân biệt được bind mount và copy

## Câu hỏi còn mở

- containerd dùng snapshotter nào mặc định, và `overlayfs` khác `native` ra sao?
- Vì sao image layer được định danh bằng digest của **nội dung** chứ không phải tên?
- `emptyDir` với `medium: Memory` khác gì bản thường, và có tính vào `limits.memory` không?
